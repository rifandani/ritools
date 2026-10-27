/* oxlint-disable promise/prefer-await-to-then -- Atom viewport and cancellation promises route failures to the shared typed UI boundary. */
/* oxlint-disable react-doctor/async-await-in-loop -- Bounded Worker pages share one request atom and must run in order. */
/* oxlint-disable anti-slop/no-runtime-typeof -- The internal command union uses two trusted string commands and schema-validated Edit records. */
"use client";

import { useAtomMount, useAtomSet, useAtomValue } from "@effect/atom-react";
import { useBlocker } from "@tanstack/react-router";
import { Effect } from "effect";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import type { ColumnWidths } from "react-data-grid";

import * as T from "./tabular";
import { makeTabularAtoms } from "./tabular.atoms";
import {
  boundsOf,
  engineFailure,
  parsePaste,
  quotedTsv,
  readLocalFile,
  requestId,
  stockSample,
} from "./tabular.ui";
import type { GridPosition, GridRange } from "./tabular.ui";

const subscribeReady = () => () => {
  /* Hydration readiness has no external updates. */
};
const readReady = () => true;
const readServerReady = () => false;
type Query = Pick<T.ViewRequest, "search" | "sort">;
type ViewFocus = NonNullable<T.FocusTarget> & { readonly firstRow?: boolean };
const emptyQuery: Query = { search: "", sort: null };
const origin: GridPosition = { row: 0, column: 0 };
export type TabularController = ReturnType<typeof useTabular>;

/** The route owns the runtime. Data and history have no storage or SSR serialization. */
export const useTabular = () => {
  "use no memo";
  const atoms = useMemo(() => makeTabularAtoms(), []);
  useAtomMount(atoms.runtime);
  const ready = useSyncExternalStore(
    subscribeReady,
    readReady,
    readServerReady
  );
  const [columnWidths, setColumnWidths] = useState<ColumnWidths>(new Map());
  const session = useAtomValue(atoms.session);
  const sheetId = useAtomValue(atoms.activeSheet);
  const view = useAtomValue(atoms.view);
  const viewport = useAtomValue(atoms.viewport);
  const candidate = useAtomValue(atoms.candidate);
  const progress = useAtomValue(atoms.progress);
  const plan = useAtomValue(atoms.plan);
  const setSheetId = useAtomSet(atoms.activeSheet);
  const prepare = useAtomSet(atoms.prepare, { mode: "promise" });
  const accept = useAtomSet(atoms.accept, { mode: "promise" });
  const updateView = useAtomSet(atoms.updateView, { mode: "promise" });
  const read = useAtomSet(atoms.read, { mode: "promise" });
  const inspect = useAtomSet(atoms.inspect, { mode: "promise" });
  const inspectView = useAtomSet(atoms.inspectView, { mode: "promise" });
  const locate = useAtomSet(atoms.locate, { mode: "promise" });
  const change = useAtomSet(atoms.change, { mode: "promise" });
  const reparse = useAtomSet(atoms.reparse, { mode: "promise" });
  const discardCandidate = useAtomSet(atoms.discardCandidate, {
    mode: "promise",
  });
  const planExport = useAtomSet(atoms.planExport, { mode: "promise" });
  const exportBytes = useAtomSet(atoms.exportBytes, { mode: "promise" });
  const close = useAtomSet(atoms.close, { mode: "promise" });
  const cancelJob = useAtomSet(atoms.cancel, { mode: "promise" });
  const track = useAtomSet(atoms.trackProgress);
  const readWarnings = useAtomSet(atoms.warnings, { mode: "promise" });
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  const activeJob = useRef<T.RequestId | null>(null);
  const [failure, setFailure] = useState<T.EngineError | null>(null);
  const [notice, setNotice] = useState<
    | "tabularCommitDone"
    | "tabularCancelled"
    | "tabularRowNoMatch"
    | "tabularSelectionReady"
    | "tabularDownloadReady"
    | null
  >(null);
  const [historyNotice, setHistoryNotice] = useState<{
    direction: "undo" | "redo";
    kind: T.EditKind;
    sheet: string;
  } | null>(null);
  const [query, setQuery] = useState<Query>(emptyQuery);
  const queries = useRef(new Map<T.SheetId, Query>());
  const [range, setRange] = useState<GridRange>({
    anchor: origin,
    extent: origin,
  });
  const [windowStart, setWindowStart] = useState({ row: 0, column: 0 });
  const [columns, setColumns] = useState<T.Viewport["columns"]>([]);
  const [focus, setFocus] = useState<{
    position: GridPosition;
    serial: number;
    shouldFocus?: boolean;
  } | null>(null);
  const pendingFocus = useRef<ViewFocus | null>(null);
  const selected = useRef<{
    address: T.Address;
    position: GridPosition;
  } | null>(null);
  const focusSerial = useRef(0);
  const [receipt, setReceipt] = useState<T.ExportBytes | null>(null);
  const [options, setOptions] = useState<T.ParseOptions>(T.defaultParseOptions);
  const [source, setSource] = useState<T.Source | null>(null);
  const [detection, setDetection] = useState<T.Candidate | null>(null);
  const [pending, setPending] = useState<(() => void) | null>(null);
  const [pendingRevision, setPendingRevision] = useState<number | null>(null);
  const latest = useRef({ session, sheetId, view });
  useLayoutEffect(() => {
    latest.current = { session, sheetId, view };
  }, [session, sheetId, view]);
  const blocker = useBlocker({
    shouldBlockFn: () => Boolean(latest.current.session?.history.dirty),
    enableBeforeUnload: Boolean(session?.history.dirty),
    withResolver: true,
  });
  const sheet =
    session?.sheets.find((item) => item.sheetId === sheetId) ?? null;
  const guard = (): T.Guard => {
    const current = latest.current.session;
    if (!current) {
      throw new Error("No active session");
    }
    return { sessionId: current.sessionId, expectedRevision: current.revision };
  };
  // oxlint-disable-next-line anti-slop/no-unknown-parameters -- Atom promise rejections are decoded at this UI boundary.
  const reportFailure = useCallback((error: unknown) => {
    const named = engineFailure(error);
    setFailure(
      named ??
        new T.EngineFailed({
          requestId: requestId(),
          operation: "ui",
          sessionId: latest.current.session?.sessionId ?? null,
          phase: "reading",
        })
    );
    if (named?._tag === "Cancelled") {
      setNotice("tabularCancelled");
    }
  }, []);
  const run = async <A>(
    operation: (id: T.RequestId) => Promise<A>
  ): Promise<A | undefined> => {
    if (lock.current) {
      return;
    }
    lock.current = true;
    setBusy(true);
    setFailure(null);
    setNotice(null);
    setHistoryNotice(null);
    const id = requestId();
    activeJob.current = id;
    track(id);
    let result: A | undefined;
    try {
      result = await operation(id);
    } catch (error) {
      reportFailure(error);
    }
    activeJob.current = null;
    lock.current = false;
    setBusy(false);
    return result;
  };
  const replacementGrant = useRef<number | null>(null);
  const pendingKind = useRef<"replace" | "accept" | "close">("replace");
  const confirmDiscard = (
    action: () => void,
    kind: "replace" | "accept" | "close" = "replace"
  ) => {
    if (
      kind === "accept" &&
      replacementGrant.current === latest.current.session?.revision
    ) {
      replacementGrant.current = null;
      action();
      return;
    }
    pendingKind.current = kind;
    if (latest.current.session?.history.dirty) {
      setPending(() => action);
      setPendingRevision(latest.current.session.revision);
    } else {
      action();
    }
  };
  const prepareSource = (
    input: T.Source,
    parseOptions = T.defaultParseOptions
  ) => {
    setSource(input);
    setOptions(parseOptions);
    void run((id) =>
      prepare({ source: input, options: parseOptions, job: { requestId: id } })
    );
  };
  const openFile = (file: File) =>
    confirmDiscard(() => {
      void run(async (id) => {
        const input = await Effect.runPromise(readLocalFile(file));
        setSource(input);
        setOptions(T.defaultParseOptions);
        return await prepare({
          source: input,
          options: T.defaultParseOptions,
          job: { requestId: id },
        });
      });
    });
  const openSample = () => confirmDiscard(() => prepareSource(stockSample()));
  const applyParse = (parseOptions: T.ParseOptions) => {
    setOptions(parseOptions);
    if (source && candidate) {
      prepareSource(source, parseOptions);
    } else if (session) {
      confirmDiscard(() => {
        void run((id) =>
          reparse({
            guard: guard(),
            options: parseOptions,
            job: { requestId: id },
          })
        );
      });
    } else if (source) {
      prepareSource(source, parseOptions);
    }
  };
  const acceptCandidate = () => {
    if (!candidate) {
      return;
    }
    const chosen = candidate;
    confirmDiscard(() => {
      void run(async (id) => {
        const current = latest.current.session;
        const next = await accept({
          candidateId: chosen.candidateId,
          requestId: id,
          acknowledgeValuesOnly: true,
          replace: current
            ? {
                sessionId: current.sessionId,
                expectedRevision: current.revision,
                discardEdits: true,
              }
            : null,
        });
        setDetection(chosen);
        setSource(null);
        setQuery(emptyQuery);
        queries.current.clear();
        setReceipt(null);
        setRange({ anchor: origin, extent: origin });
        pendingFocus.current = {
          sheetId: next.sheets[0]?.sheetId ?? T.SheetId.make("empty"),
          rowId: null,
          columnId: null,
          reason: "inserted",
        };
        return next;
      });
    }, "accept");
  };
  const discardPreview = () => {
    if (candidate) {
      void run((id) =>
        discardCandidate({ candidateId: candidate.candidateId, requestId: id })
      );
    }
    setSource(null);
  };

  // Views are owned by the Worker. Only the last query result may become current.
  useEffect(() => {
    if (!session || !sheetId) {
      return;
    }
    let live = true;
    const timer = setTimeout(
      () => {
        // oxlint-disable-next-line unicorn/consistent-function-scoping, eslint/complexity -- The task resolves stable focus and bounded metadata within this effect lifetime.
        const refresh = async () => {
          try {
            const next = await updateView({
              sessionId: session.sessionId,
              expectedRevision: session.revision,
              sheetId,
              requestId: requestId(),
              ...query,
            });
            if (!live) {
              return;
            }
            const requested = pendingFocus.current;
            const previous = selected.current;
            const target =
              requested ??
              (previous
                ? {
                    ...previous.address,
                    reason: "changed" as const,
                  }
                : null);
            let position = {
              row:
                requested && !requested.firstRow
                  ? Math.min(
                      previous?.position.row ?? 0,
                      Math.max(0, next.matchingRows - 1)
                    )
                  : 0,
              column: Math.min(
                previous?.position.column ?? 0,
                Math.max(0, next.columnCount - 1)
              ),
            };
            if (
              target?.rowId &&
              target.columnId &&
              target.sheetId === next.sheetId
            ) {
              const found = await locate({
                sessionId: next.sessionId,
                expectedRevision: next.revision,
                requestId: requestId(),
                viewId: next.viewId,
                address: {
                  sheetId: target.sheetId,
                  rowId: target.rowId,
                  columnId: target.columnId,
                },
              });
              if (!live) {
                return;
              }
              if (found) {
                position = { row: found.rowIndex, column: found.columnIndex };
              } else if (requested && next.search) {
                setNotice("tabularRowNoMatch");
              }
            }
            setRange({ anchor: position, extent: position });
            setWindowStart({
              row: Math.max(0, position.row - 4),
              column: Math.max(0, position.column - 2),
            });
            setFocus({
              position,
              serial: (focusSerial.current += 1),
              shouldFocus:
                Boolean(requested) &&
                document.activeElement?.id !== "tabular-search",
            });
            pendingFocus.current = null;
            const metadata: T.Viewport["columns"][number][] = [];
            for (let start = 0; start < next.columnCount; start += 128) {
              // oxlint-disable-next-line no-await-in-loop -- Header metadata is read in bounded pages; no cell data is copied.
              const page = await inspect({
                sessionId: next.sessionId,
                expectedRevision: next.revision,
                requestId: requestId(),
                viewId: next.viewId,
                rowStart: 0,
                rowCount: 0,
                columnStart: start,
                columnCount: Math.min(128, next.columnCount - start),
              });
              if (!live) {
                return;
              }
              metadata.push(...page.columns);
            }
            setColumns(metadata);
          } catch (error) {
            if (live) {
              reportFailure(error);
            }
          }
        };
        void refresh();
      },
      query.search ? 150 : 0
    );
    return () => {
      live = false;
      clearTimeout(timer);
    };
  }, [session, sheetId, query, updateView, inspect, locate, reportFailure]);

  useEffect(() => {
    if (!view) {
      return;
    }
    void read({
      sessionId: view.sessionId,
      expectedRevision: view.revision,
      requestId: requestId(),
      viewId: view.viewId,
      rowStart: Math.min(windowStart.row, Math.max(0, view.matchingRows - 1)),
      rowCount: Math.min(48, view.matchingRows),
      columnStart: Math.min(
        windowStart.column,
        Math.max(0, view.columnCount - 1)
      ),
      columnCount: Math.min(48, view.columnCount),
    }).catch(reportFailure);
  }, [view, windowStart, read, reportFailure]);

  const switchSheet = (id: T.SheetId) => {
    if (sheetId) {
      queries.current.set(sheetId, query);
    }
    setQuery(queries.current.get(id) ?? emptyQuery);
    setSheetId(id);
    setColumns([]);
    pendingFocus.current = {
      sheetId: id,
      rowId: null,
      columnId: null,
      reason: "changed",
    };
  };
  const deletionFocus = async (
    operation: T.Edit
  ): Promise<T.FocusTarget | undefined> => {
    const { current } = selected;
    if (
      !current ||
      (operation._tag !== "DeleteRows" && operation._tag !== "DeleteColumns")
    ) {
      return undefined;
    }
    if (operation._tag === "DeleteColumns") {
      const removed = new Set(operation.columnIds);
      const index = columns.findIndex(
        (column) => column.columnId === current.address.columnId
      );
      const neighbor =
        columns
          .slice(index + 1)
          .find((column) => !removed.has(column.columnId)) ??
        columns
          .slice(0, index)
          .findLast((column) => !removed.has(column.columnId));
      return {
        sheetId: operation.sheetId,
        rowId: neighbor ? current.address.rowId : null,
        columnId: neighbor?.columnId ?? null,
        reason: "deleted",
      };
    }
    const removed = new Set(operation.rowIds);
    const underlying = await inspectView({
      ...guard(),
      requestId: requestId(),
      sheetId: operation.sheetId,
      search: "",
      sort: null,
    });
    const found = await locate({
      ...guard(),
      requestId: requestId(),
      viewId: underlying.viewId,
      address: current.address,
    });
    const target = {
      sheetId: operation.sheetId,
      rowId: null,
      columnId: current.address.columnId,
      reason: "deleted",
    } satisfies T.FocusTarget;
    if (!found || removed.size === underlying.matchingRows) {
      return target;
    }
    for (
      let start = found.rowIndex + 1;
      start < underlying.matchingRows;
      start += 128
    ) {
      // oxlint-disable-next-line no-await-in-loop -- Read underlying neighbors in bounded pages without copying a Sheet.
      const page = await inspect({
        ...guard(),
        requestId: requestId(),
        viewId: underlying.viewId,
        rowStart: start,
        rowCount: Math.min(128, underlying.matchingRows - start),
        columnStart: 0,
        columnCount: 1,
      });
      const neighbor = page.rows.find((row) => !removed.has(row.rowId));
      if (neighbor) {
        return { ...target, rowId: neighbor.rowId };
      }
    }
    for (let end = found.rowIndex; end > 0; end -= 128) {
      const start = Math.max(0, end - 128);
      // oxlint-disable-next-line no-await-in-loop -- Fall back to the previous underlying neighbor in bounded pages.
      const page = await inspect({
        ...guard(),
        requestId: requestId(),
        viewId: underlying.viewId,
        rowStart: start,
        rowCount: end - start,
        columnStart: 0,
        columnCount: 1,
      });
      const neighbor = page.rows.findLast((row) => !removed.has(row.rowId));
      if (neighbor) {
        return { ...target, rowId: neighbor.rowId };
      }
    }
    return target;
  };
  const applyChange = async (operation: T.Edit | "undo" | "redo") => {
    const entry =
      operation === "undo"
        ? session?.history.nextUndo
        : operation === "redo"
          ? session?.history.nextRedo
          : null;
    const result = await run(async (id) => {
      const target =
        typeof operation === "string"
          ? undefined
          : await deletionFocus(operation);
      const next = await change(
        typeof operation === "string"
          ? { ...guard(), requestId: id, direction: operation }
          : { ...guard(), requestId: id, edit: operation }
      );
      return target === undefined ? next : { ...next, focus: target };
    });
    if (result) {
      pendingFocus.current = result.focus;
      if (
        typeof operation === "string" ||
        operation._tag === "InsertRows" ||
        operation._tag === "RevertAll"
      ) {
        setQuery(emptyQuery);
        if (result.focus) {
          queries.current.set(result.focus.sheetId, emptyQuery);
        }
      }
      if (
        typeof operation !== "string" &&
        operation._tag === "DeleteColumns" &&
        query.sort &&
        operation.columnIds.includes(query.sort.columnId)
      ) {
        const next = { ...query, sort: null };
        setQuery(next);
        queries.current.set(operation.sheetId, next);
      }
      setReceipt(null);
      if (typeof operation === "string" && entry) {
        setHistoryNotice({
          direction: operation,
          kind: entry.kind,
          sheet: entry.sheetIds
            .map(
              (id) =>
                result.session.sheets.find((item) => item.sheetId === id)
                  ?.name ?? ""
            )
            .join(", "),
        });
      } else {
        setNotice("tabularCommitDone");
      }
    }
    return result;
  };
  const select = (position: GridPosition, extend = false) => {
    setRange((previous) => ({
      anchor: extend ? previous.anchor : position,
      extent: position,
    }));
    setWindowStart((previous) =>
      position.row < previous.row ||
      position.row >= previous.row + 36 ||
      position.column < previous.column ||
      position.column >= previous.column + 32
        ? {
            row: Math.max(0, position.row - 4),
            column: Math.max(0, position.column - 2),
          }
        : previous
    );
  };
  const activeRow = viewport?.rows.find(
    (row) => row.viewIndex === range.extent.row
  );
  const activeColumn = columns[range.extent.column];
  const activeCell =
    activeRow?.cells.find((cell) => cell.columnId === activeColumn?.columnId) ??
    null;
  const address = useMemo(
    () =>
      activeCell && sheetId
        ? { sheetId, rowId: activeCell.rowId, columnId: activeCell.columnId }
        : null,
    [activeCell, sheetId]
  );

  useLayoutEffect(() => {
    if (address && viewport?.viewId === view?.viewId) {
      selected.current = { address, position: range.extent };
    }
  }, [address, viewport?.viewId, view?.viewId, range.extent]);

  const insertRows = async (position: "end" | "before" | "after") => {
    const { current } = latest;
    if (!current.session || !current.sheetId) {
      return;
    }
    const selectedSheet = current.sheetId;
    const target = address;
    return await run(async (id) => {
      let before: T.RowId | null =
        position === "before" ? (target?.rowId ?? null) : null;
      if (position === "after" && target) {
        const underlying = await inspectView({
          ...guard(),
          requestId: requestId(),
          sheetId: selectedSheet,
          search: "",
          sort: null,
        });
        const found = await locate({
          ...guard(),
          requestId: requestId(),
          viewId: underlying.viewId,
          address: target,
        });
        if (found && found.rowIndex + 1 < underlying.matchingRows) {
          const next = await inspect({
            ...guard(),
            requestId: requestId(),
            viewId: underlying.viewId,
            rowStart: found.rowIndex + 1,
            rowCount: 1,
            columnStart: 0,
            columnCount: 1,
          });
          before = next.rows[0]?.rowId ?? null;
        }
      }
      const result = await change({
        ...guard(),
        requestId: id,
        edit: { _tag: "InsertRows", sheetId: selectedSheet, before, count: 1 },
      });
      pendingFocus.current = result.focus;
      setQuery(emptyQuery);
      setReceipt(null);
      setNotice("tabularCommitDone");
      return result;
    });
  };

  const readRectangle = async (
    rectangle: ReturnType<typeof boundsOf>,
    allowUnresolved = false
  ) => {
    const current = latest.current.view;
    if (!current) {
      throw new Error("No View");
    }
    const rowIds: T.RowId[] = [];
    const columnIds: T.ColumnId[] = [];
    const values: string[][] = [];
    for (let row = rectangle.rowStart; row <= rectangle.rowEnd; row += 32) {
      const lines: string[][] = [];
      for (
        let col = rectangle.columnStart;
        col <= rectangle.columnEnd;
        col += 128
      ) {
        // oxlint-disable-next-line no-await-in-loop -- Read a deliberate selection in bounded Worker messages, never a full workbook snapshot.
        const page = await inspect({
          ...guard(),
          requestId: requestId(),
          viewId: current.viewId,
          rowStart: row,
          rowCount: Math.min(32, rectangle.rowEnd - row + 1),
          columnStart: col,
          columnCount: Math.min(128, rectangle.columnEnd - col + 1),
        });
        if (row === rectangle.rowStart) {
          columnIds.push(...page.columns.map((column) => column.columnId));
        }
        for (const [index, line] of page.rows.entries()) {
          if (col === rectangle.columnStart) {
            rowIds.push(line.rowId);
          }
          const texts = line.cells.map((cell) => {
            if (cell.value._tag === "Unresolved" && !allowUnresolved) {
              throw new T.UnresolvedValues({
                requestId: requestId(),
                operation: "copy",
                sessionId: current.sessionId,
                count: 1,
                first: {
                  sheetId: current.sheetId,
                  rowId: cell.rowId,
                  columnId: cell.columnId,
                },
              });
            }
            return cell.display;
          });
          lines[index] = [...(lines[index] ?? []), ...texts];
        }
      }
      values.push(...lines);
    }
    return { rowIds, columnIds, values };
  };
  const copyRange = async () => {
    const selection = await run(() => readRectangle(boundsOf(range)));
    return selection ? quotedTsv(selection.values) : null;
  };
  const selectionIds = () => run(() => readRectangle(boundsOf(range), true));
  const unresolvedOffset = useRef(0);
  const nextUnresolved = () => {
    if (!sheetId) {
      return;
    }
    void run(async (id) => {
      let page = await readWarnings({
        ...guard(),
        requestId: id,
        code: "unresolved-value",
        sheetId,
        offset: unresolvedOffset.current,
        limit: 1,
      });
      if (!page.items.length) {
        unresolvedOffset.current = 0;
        page = await readWarnings({
          ...guard(),
          requestId: requestId(),
          code: "unresolved-value",
          sheetId,
          offset: 0,
          limit: 1,
        });
      }
      unresolvedOffset.current = page.nextOffset ?? 0;
      const target = page.items[0]?.address;
      if (target) {
        pendingFocus.current = { ...target, reason: "changed" };
        setQuery({ ...emptyQuery });
      }
    });
  };
  const paste = async (text: string, fill = false) => {
    if (!view || !sheetId) {
      return;
    }
    return await run(async (id) => {
      let values = await Effect.runPromise(parsePaste(text));
      const box = boundsOf(range);
      const height = box.rowEnd - box.rowStart + 1;
      const width = box.columnEnd - box.columnStart + 1;
      if (height > 1 || width > 1) {
        if (fill && values.length === 1 && values[0]?.length === 1) {
          values = Array.from({ length: height }, () =>
            Array.from({ length: width }, () => values[0]?.[0] ?? "")
          );
        } else if (values.length !== height || values[0]?.length !== width) {
          throw new T.InvalidPaste({
            requestId: id,
            operation: "paste",
            sessionId: view.sessionId,
            reason: "ragged",
          });
        }
      }
      const rowEnd = box.rowStart + values.length - 1;
      const columnEnd = box.columnStart + (values[0]?.length ?? 0) - 1;
      if (rowEnd >= view.matchingRows || columnEnd >= view.columnCount) {
        throw new T.InvalidPaste({
          requestId: id,
          operation: "paste",
          sessionId: view.sessionId,
          reason: "bounds",
        });
      }
      // Read identities without rejecting unresolved values: a paste can resolve them.
      const ids: T.RowId[] = [];
      const cols: T.ColumnId[] = [];
      for (let row = box.rowStart; row <= rowEnd; row += 16) {
        for (let col = box.columnStart; col <= columnEnd; col += 128) {
          // oxlint-disable-next-line no-await-in-loop -- Chunked identity reads keep every message within the engine limit.
          const page = await inspect({
            ...guard(),
            requestId: requestId(),
            viewId: view.viewId,
            rowStart: row,
            rowCount: Math.min(16, rowEnd - row + 1),
            columnStart: col,
            columnCount: Math.min(128, columnEnd - col + 1),
          });
          if (col === box.columnStart) {
            ids.push(...page.rows.map((line) => line.rowId));
          }
          if (row === box.rowStart) {
            cols.push(...page.columns.map((column) => column.columnId));
          }
        }
      }
      const result = await change({
        ...guard(),
        requestId: id,
        edit: {
          _tag: "Paste",
          sheetId,
          viewId: view.viewId,
          rowIds: ids,
          columnIds: cols,
          values,
        },
      });
      pendingFocus.current = result.focus;
      setReceipt(null);
      setNotice("tabularCommitDone");
      return result;
    });
  };
  const makePlan = (exportOptions: T.ExportOptions) =>
    run((id) =>
      planExport({ ...guard(), requestId: id, options: exportOptions })
    );
  const createOutput = (acknowledgeValuesOnly: boolean) => {
    if (!plan) {
      return Promise.resolve();
    }
    return run(async (id) => {
      const result = await exportBytes({
        ...guard(),
        requestId: id,
        planId: plan.planId,
        acknowledgeValuesOnly,
      });
      setReceipt(result);
      setNotice("tabularDownloadReady");
      return result;
    });
  };
  const closeFile = () =>
    confirmDiscard(() => {
      if (session) {
        void run(async () => {
          await close(session.sessionId);
          setColumns([]);
          setReceipt(null);
          setDetection(null);
          setSource(null);
        });
      }
    }, "close");
  const cancel = () => {
    const id = activeJob.current;
    if (id) {
      setNotice("tabularCancelled");
      void cancelJob({ requestId: id }).catch(reportFailure);
    }
  };
  const keepWorking = () => {
    setPending(null);
    blocker.reset?.();
  };
  const discard = () => {
    if (pending && session?.revision === pendingRevision) {
      const action = pending;
      if (pendingKind.current === "replace") {
        replacementGrant.current = session.revision;
      }
      setPending(null);
      action();
    } else if (blocker.status === "blocked") {
      blocker.proceed();
    } else {
      setPending(null);
    }
  };
  const focusSelection = () =>
    setFocus({ position: range.extent, serial: (focusSerial.current += 1) });
  return {
    ready,
    focusSelection,
    columnWidths,
    setColumnWidths,
    session,
    sheet,
    sheetId,
    view,
    viewport,
    columns,
    candidate,
    progress,
    plan,
    busy,
    failure,
    notice,
    historyNotice,
    query,
    range,
    focus,
    receipt,
    options,
    source,
    detection,
    address,
    activeCell,
    pending: pending !== null || blocker.status === "blocked",
    openFile,
    openSample,
    applyParse,
    acceptCandidate,
    discardPreview,
    switchSheet,
    setQuery: (next: Query) => {
      setNotice(null);
      setHistoryNotice(null);
      if (query.search && !next.search && sheetId) {
        pendingFocus.current = {
          firstRow: true,
          sheetId,
          rowId: null,
          columnId: null,
          reason: "changed",
        };
      }
      setQuery(next);
    },
    select,
    setRange,
    setWindowStart,
    applyChange,
    insertRows,
    paste,
    copyRange,
    selectionIds,
    nextUnresolved,
    makePlan,
    createOutput,
    closeFile,
    cancel,
    keepWorking,
    discard,
    reportFailure,
    setFailure,
  };
};
