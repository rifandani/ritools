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

type Query = Pick<T.ViewRequest, "search" | "sort">;
type ViewFocus = NonNullable<T.FocusTarget> & { readonly firstRow?: boolean };
const emptyQuery: Query = { search: "", sort: null };
const origin: GridPosition = { row: 0, column: 0 };
const quietKindOf = (
  operation: T.Edit | "undo" | "redo",
  query: Query
): "cell" | "header" | null => {
  if (operation === "undo" || operation === "redo") {
    return null;
  }
  if (operation._tag === "RenameHeader") {
    return "header";
  }
  return (operation._tag === "SetCell" || operation._tag === "RevertCell") &&
    !query.search &&
    !query.sort
    ? "cell"
    : null;
};
export type TabularController = ReturnType<typeof useTabular>;

/** The route owns the runtime. Data and history have no storage or SSR serialization. */
export const useTabular = () => {
  "use no memo";
  const atoms = useMemo(() => makeTabularAtoms(), []);
  useAtomMount(atoms.runtime);
  const [columnWidths, setColumnWidths] = useState<ColumnWidths>(new Map());
  const session = useAtomValue(atoms.session);
  const sheetId = useAtomValue(atoms.activeSheet);
  const view = useAtomValue(atoms.view);
  const viewport = useAtomValue(atoms.viewport);
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
  const planExport = useAtomSet(atoms.planExport, { mode: "promise" });
  const exportBytes = useAtomSet(atoms.exportBytes, { mode: "promise" });
  const splitBytes = useAtomSet(atoms.splitBytes, { mode: "promise" });
  const mergeSourceAtom = useAtomSet(atoms.mergeSource, { mode: "promise" });
  const planMergeAtom = useAtomSet(atoms.planMerge, { mode: "promise" });
  const mergeBytesAtom = useAtomSet(atoms.mergeBytes, { mode: "promise" });
  const closeMergeAtom = useAtomSet(atoms.closeMerge, { mode: "promise" });
  const diffSourceAtom = useAtomSet(atoms.diffSource, { mode: "promise" });
  const planDiffAtom = useAtomSet(atoms.planDiff, { mode: "promise" });
  const diffPageAtom = useAtomSet(atoms.diffPage, { mode: "promise" });
  const diffBytesAtom = useAtomSet(atoms.diffBytes, { mode: "promise" });
  const closeDiffAtom = useAtomSet(atoms.closeDiff, { mode: "promise" });
  const close = useAtomSet(atoms.close, { mode: "promise" });
  const loadSessionAtom = useAtomSet(atoms.loadSession, { mode: "promise" });
  const inspectSessionAtom = useAtomSet(atoms.inspectSession, {
    mode: "promise",
  });
  const cancelJob = useAtomSet(atoms.cancel, { mode: "promise" });
  const track = useAtomSet(atoms.trackProgress);
  const readWarnings = useAtomSet(atoms.warnings, { mode: "promise" });
  const previewDedupeAtom = useAtomSet(atoms.previewDedupe, {
    mode: "promise",
  });
  const [busy, setBusy] = useState(false);
  const [slowBusy, setSlowBusy] = useState(false);
  const slowTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (slowTimer.current) {
        clearTimeout(slowTimer.current);
      }
    },
    []
  );
  const lock = useRef(false);
  const activeJob = useRef<T.RequestId | null>(null);
  const [failure, setFailure] = useState<T.EngineError | null>(null);
  const [notice, setNotice] = useState<
    | "tabularCommitDone"
    | "tabularCancelled"
    | "tabularRowNoMatch"
    | "tabularSelectionReady"
    | "tabularDownloadReady"
    | "tabularPdfDownloadReady"
    | null
  >(null);
  const [historyNotice, setHistoryNotice] = useState<{
    direction: "undo" | "redo";
    kind: T.EditKind;
    sheet: string;
  } | null>(null);
  const [query, setQuery] = useState<Query>(emptyQuery);
  const queries = useRef(new Map<T.SheetId, Query>());
  const sheetsBySession = useRef(new Map<T.SessionId, T.SheetId>());
  const detections = useRef(new Map<T.SessionId, T.Candidate>());
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
  const quietEdit = useRef<"cell" | "header" | null>(null);
  const [receipt, setReceipt] = useState<T.ExportBytes | null>(null);
  const [options, setOptions] = useState<T.ParseOptions>(T.defaultParseOptions);
  const [source, setSource] = useState<T.Source | null>(null);
  const [detection, setDetection] = useState<T.Candidate | null>(null);
  const [tabs, setTabs] = useState<
    readonly { readonly id: T.SessionId; readonly name: string }[]
  >([]);
  const [dirtyTabs, setDirtyTabs] = useState<ReadonlySet<T.SessionId>>(
    () => new Set()
  );
  const dirtyRef = useRef<ReadonlySet<T.SessionId>>(new Set());
  const [histories, setHistories] = useState<
    ReadonlyMap<T.SessionId, T.Session["history"]>
  >(() => new Map());
  const [pendingClose, setPendingClose] = useState<{
    readonly id: T.SessionId;
    readonly session: T.Session;
  } | null>(null);
  const latest = useRef({ session, sheetId, view });
  useLayoutEffect(() => {
    latest.current = { session, sheetId, view };
  }, [session, sheetId, view]);
  const blocker = useBlocker({
    shouldBlockFn: () => dirtyRef.current.size > 0,
    enableBeforeUnload: dirtyTabs.size > 0,
    withResolver: true,
  });
  const sheet =
    session?.sheets.find((item) => item.sheetId === sheetId) ?? null;
  const viewStale = Boolean(
    view && session && view.revision !== session.revision
  );
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
    // A cell commit finishes in a few milliseconds. Waiting keeps the grid
    // still instead of flashing a progress note on every Edit.
    slowTimer.current = setTimeout(() => setSlowBusy(true), 400);
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
    if (slowTimer.current) {
      clearTimeout(slowTimer.current);
      slowTimer.current = null;
    }
    setSlowBusy(false);
    setBusy(false);
    return result;
  };
  const markDirty = (next: T.Session) => {
    setHistories((previous) => {
      const updated = new Map(previous);
      updated.set(next.sessionId, next.history);
      return updated;
    });
    const nextDirty = new Set(dirtyRef.current);
    if (next.history.dirty) {
      nextDirty.add(next.sessionId);
    } else {
      nextDirty.delete(next.sessionId);
    }
    dirtyRef.current = nextDirty;
    setDirtyTabs(nextDirty);
  };
  const addTab = (next: T.Session) => {
    const entry = { id: next.sessionId, name: next.sourceName };
    setTabs((previous) =>
      previous.some((tab) => tab.id === next.sessionId)
        ? previous.map((tab) => (tab.id === next.sessionId ? entry : tab))
        : [...previous, entry]
    );
  };
  const forgetTab = (id: T.SessionId) => {
    setTabs((previous) => previous.filter((tab) => tab.id !== id));
    sheetsBySession.current.delete(id);
    detections.current.delete(id);
    setHistories((previous) => {
      const updated = new Map(previous);
      updated.delete(id);
      return updated;
    });
    const nextDirty = new Set(dirtyRef.current);
    nextDirty.delete(id);
    dirtyRef.current = nextDirty;
    setDirtyTabs(nextDirty);
  };
  const resetView = (next: T.Session, active?: T.SheetId | null) => {
    const first =
      (active && next.sheets.some((item) => item.sheetId === active)
        ? active
        : next.sheets[0]?.sheetId) ?? T.SheetId.make("empty");
    setQuery(queries.current.get(first) ?? emptyQuery);
    setColumns([]);
    setReceipt(null);
    setDetection(detections.current.get(next.sessionId) ?? null);
    setSource(null);
    setRange({ anchor: origin, extent: origin });
    pendingFocus.current = {
      sheetId: first,
      rowId: null,
      columnId: null,
      reason: "changed",
    };
  };
  // The detected settings are accepted immediately. The Candidate never
  // becomes a screen: the first visible state after a file is the editor.
  const open = async (
    id: T.RequestId,
    input: T.Source,
    parseOptions = T.defaultParseOptions
  ) => {
    track(id);
    activeJob.current = id;
    setSource(input);
    setOptions(parseOptions);
    const prepared = await prepare({
      source: input,
      options: parseOptions,
      job: { requestId: id },
    });
    const next = await accept({
      candidateId: prepared.candidateId,
      requestId: id,
      acknowledgeValuesOnly: true,
      replace: null,
    });
    addTab(next);
    markDirty(next);
    detections.current.set(next.sessionId, prepared);
    setDetection(prepared);
    setSource(null);
    setQuery(emptyQuery);
    setColumns([]);
    setReceipt(null);
    setRange({ anchor: origin, extent: origin });
    pendingFocus.current = {
      sheetId: next.sheets[0]?.sheetId ?? T.SheetId.make("empty"),
      rowId: null,
      columnId: null,
      reason: "inserted",
    };
    return next;
  };
  const openInBackground = (
    input: T.Source,
    parseOptions = T.defaultParseOptions
  ) => {
    void run((id) => open(id, input, parseOptions));
  };
  const openFiles = (incoming: readonly File[]) => {
    if (!incoming.length) {
      return;
    }
    void run(async () => {
      for (const file of incoming) {
        // oxlint-disable-next-line no-await-in-loop -- Files open in the order the user chose them.
        const input = await Effect.runPromise(readLocalFile(file));
        // oxlint-disable-next-line no-await-in-loop -- Each file becomes its own tab.
        await open(requestId(), input);
      }
    });
  };
  const openFile = (file: File) => openFiles([file]);
  const openSample = () => openInBackground(stockSample());
  const retryOpen = () => {
    if (source) {
      openInBackground(source, options);
    }
  };
  const switchFile = (id: T.SessionId) => {
    if (id === latest.current.session?.sessionId || lock.current) {
      return;
    }
    if (latest.current.sheetId) {
      queries.current.set(latest.current.sheetId, query);
      if (latest.current.session) {
        sheetsBySession.current.set(
          latest.current.session.sessionId,
          latest.current.sheetId
        );
      }
    }
    void run(async (job) => {
      const targetSheet = sheetsBySession.current.get(id) ?? null;
      const next = await loadSessionAtom({
        sessionId: id,
        requestId: job,
        sheetId: targetSheet,
      });
      markDirty(next);
      resetView(next, targetSheet);
    });
  };
  const closeTab = async (target: T.SessionId, job: T.RequestId) => {
    const current = latest.current.session;
    const remaining = tabs.filter((tab) => tab.id !== target);
    const index = tabs.findIndex((tab) => tab.id === target);
    const neighbor =
      remaining[Math.min(Math.max(index, 0), remaining.length - 1)] ?? null;
    if (current?.sessionId === target && neighbor) {
      const targetSheet = sheetsBySession.current.get(neighbor.id) ?? null;
      const next = await loadSessionAtom({
        sessionId: neighbor.id,
        requestId: job,
        sheetId: targetSheet,
      });
      markDirty(next);
      resetView(next, targetSheet);
    }
    await close(target);
    forgetTab(target);
    if (current?.sessionId === target && !neighbor) {
      setColumns([]);
      setReceipt(null);
      setDetection(null);
      setSource(null);
      setQuery(emptyQuery);
    }
  };
  const closeFile = (id?: T.SessionId) => {
    const target = id ?? latest.current.session?.sessionId;
    if (!target || lock.current) {
      return;
    }
    const current = latest.current.session;
    if (current?.sessionId === target) {
      if (current.history.dirty) {
        setPendingClose({ id: target, session: current });
        return;
      }
      void run((job) => closeTab(target, job));
      return;
    }
    void run(async (job) => {
      const inspected = await inspectSessionAtom({
        sessionId: target,
        requestId: job,
      });
      markDirty(inspected);
      if (inspected.history.dirty) {
        setPendingClose({ id: target, session: inspected });
        return;
      }
      await closeTab(target, job);
    });
  };
  const confirmClose = () => {
    const target = pendingClose;
    if (!target || lock.current) {
      return;
    }
    setPendingClose(null);
    void run((job) => closeTab(target.id, job));
  };
  const cancelClose = () => setPendingClose(null);
  const discardTotals = useMemo(() => {
    let files = 0;
    let cells = 0;
    let headers = 0;
    let structure = 0;
    for (const id of dirtyTabs) {
      const history = histories.get(id);
      if (history) {
        files += 1;
        cells += history.changedCellCount;
        headers += history.changedHeaderCount;
        structure += history.structuralEditCount;
      }
    }
    return { files, cells, headers, structure };
  }, [dirtyTabs, histories]);

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
            const quiet = quietEdit.current;
            quietEdit.current = null;
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
            // A committed cell or header keeps its place. Only the View token
            // and the header metadata change, so the grid stays mounted and
            // focus does not jump back to the edited address.
            const preserve =
              quiet === "header" ||
              (quiet === "cell" && !next.search && !next.sort);
            if (!preserve) {
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
            }
            if (quiet === "cell") {
              return;
            }
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
    // Keep the window full at the sheet edges. A window that starts at the
    // last row or column returns only a few cells, and the visible cells
    // above or before them never get data, so they keep their skeletons.
    const rowCount = Math.min(48, view.matchingRows);
    const columnCount = Math.min(48, view.columnCount);
    void read({
      sessionId: view.sessionId,
      expectedRevision: view.revision,
      requestId: requestId(),
      viewId: view.viewId,
      rowStart: Math.max(
        0,
        Math.min(windowStart.row, view.matchingRows - rowCount)
      ),
      rowCount,
      columnStart: Math.max(
        0,
        Math.min(windowStart.column, view.columnCount - columnCount)
      ),
      columnCount,
    }).catch(reportFailure);
  }, [view, windowStart, read, reportFailure]);

  const switchSheet = (id: T.SheetId) => {
    if (sheetId) {
      queries.current.set(sheetId, query);
    }
    setQuery(queries.current.get(id) ?? emptyQuery);
    setSheetId(id);
    if (session) {
      sheetsBySession.current.set(session.sessionId, id);
    }
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
    const quietKind = quietKindOf(operation, query);
    if (quietKind) {
      quietEdit.current = quietKind;
    }
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
    if (!result) {
      quietEdit.current = null;
      return result;
    }
    markDirty(result.session);
    pendingFocus.current = quietKind ? null : result.focus;
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
              result.session.sheets.find((item) => item.sheetId === id)?.name ??
              ""
          )
          .join(", "),
      });
    } else {
      setNotice("tabularCommitDone");
    }
    return result;
  };
  /** Read the Dedupe counts without locking the page for an Edit. */
  const previewDedupe = async (dedupeOptions: T.DedupeOptions) => {
    try {
      return await previewDedupeAtom({
        ...guard(),
        requestId: requestId(),
        options: dedupeOptions,
      });
    } catch (error) {
      reportFailure(error);
    }
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

  const insertRows = async (
    position: "end" | "before" | "after",
    rowId?: T.RowId
  ) => {
    const { current } = latest;
    if (!current.session || !current.sheetId) {
      return;
    }
    const selectedSheet = current.sheetId;
    const target =
      rowId && columns[0]
        ? {
            sheetId: selectedSheet,
            rowId,
            columnId: columns[0].columnId,
          }
        : address;
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
      markDirty(result.session);
      pendingFocus.current = result.focus;
      setQuery(emptyQuery);
      setReceipt(null);
      setNotice("tabularCommitDone");
      return result;
    });
  };

  /**
   * Read the rows a Chart View needs. The caller sends contiguous runs, so a
   * whole scope costs bounded messages and a sample costs one per kept row.
   * Nothing here enters Edit History, dirty state, or the Cell Selection.
   */
  const readChartRows = async (
    target: Pick<T.View, "sessionId" | "revision" | "viewId">,
    runs: readonly {
      readonly rowStart: number;
      readonly rowCount: number;
    }[],
    columnStart: number,
    columnCount: number
  ) => {
    const pages: T.Viewport[] = [];
    for (const span of runs) {
      for (
        let column = columnStart;
        column < columnStart + columnCount;
        column += 128
      ) {
        // oxlint-disable-next-line no-await-in-loop -- The chart reads in bounded Worker messages so no snapshot leaves the engine.
        const page = await inspect({
          sessionId: target.sessionId,
          expectedRevision: target.revision,
          requestId: requestId(),
          viewId: target.viewId,
          rowStart: span.rowStart,
          rowCount: span.rowCount,
          columnStart: column,
          columnCount: Math.min(128, columnStart + columnCount - column),
        });
        pages.push(page);
      }
    }
    return pages;
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
  const paste = async (text: string) => {
    if (!view || !sheetId) {
      return;
    }
    return await run(async (id) => {
      const values = await Effect.runPromise(parsePaste(text));
      const box = boundsOf(range);
      const height = box.rowEnd - box.rowStart + 1;
      const width = box.columnEnd - box.columnStart + 1;
      if (
        (height > 1 || width > 1) &&
        (values.length !== height || values[0]?.length !== width)
      ) {
        throw new T.InvalidPaste({
          requestId: id,
          operation: "paste",
          sessionId: view.sessionId,
          reason: "ragged",
        });
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
      markDirty(result.session);
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
      setNotice(
        plan.options.format === "pdf"
          ? "tabularPdfDownloadReady"
          : "tabularDownloadReady"
      );
      return result;
    });
  };
  const createSplit = (
    splitOptions: T.SplitOptions,
    acknowledgeValuesOnly: boolean
  ) =>
    run((id) =>
      splitBytes({
        ...guard(),
        requestId: id,
        options: splitOptions,
        acknowledgeValuesOnly,
      })
    );
  const addMergeFile = (mergeFile: T.Source) =>
    run((id) =>
      mergeSourceAtom({
        source: { _tag: "File", source: mergeFile },
        requestId: id,
      })
    );
  const addMergeSession = () => {
    const current = session;
    const active = sheetId;
    if (!current || !active) {
      return Promise.resolve();
    }
    return run((id) =>
      mergeSourceAtom({
        source: {
          _tag: "Session",
          sessionId: current.sessionId,
          sheetId: active,
        },
        requestId: id,
      })
    );
  };
  const makeMergePlan = (
    sourceIds: readonly T.MergeSourceId[],
    mergeOptions: T.MergeOptions
  ) =>
    run((id) =>
      planMergeAtom({
        sourceIds,
        options: mergeOptions,
        requestId: id,
      })
    );
  const createMerge = (planId: T.MergePlanId) =>
    run((id) => mergeBytesAtom({ planId, requestId: id }));
  const discardMerge = () => {
    void closeMergeAtom({ requestId: requestId() }).catch(reportFailure);
  };
  const addDiffFile = (diffFile: T.Source) =>
    run((id) => diffSourceAtom({ source: diffFile, requestId: id }));
  // oxlint-disable-next-line anti-slop/no-unknown-parameters -- Atom promise rejections are decoded at this UI boundary.
  const reportDiffFailure = (error: unknown) => {
    const named = engineFailure(error);
    if (
      named?._tag !== "StaleSession" &&
      named?._tag !== "RevisionConflict" &&
      named?._tag !== "InvalidRequest"
    ) {
      reportFailure(error);
    }
  };
  /** Count a Diff without locking the page for an Edit. */
  const makeDiffPlan = async (
    diffOptions: T.DiffOptions
  ): Promise<T.DiffPlan | undefined> => {
    setFailure(null);
    try {
      return await planDiffAtom({
        ...guard(),
        requestId: requestId(),
        options: diffOptions,
      });
    } catch (error) {
      reportDiffFailure(error);
    }
  };
  const readDiffPage = async (
    page: Omit<T.DiffPageRequest, "requestId">
  ): Promise<T.DiffPage | undefined> => {
    try {
      return await diffPageAtom({ ...page, requestId: requestId() });
    } catch (error) {
      reportDiffFailure(error);
    }
  };
  const createDiff = (planId: T.DiffPlanId) =>
    run((id) => diffBytesAtom({ planId, requestId: id }));
  const discardDiff = () => {
    void closeDiffAtom({ requestId: requestId() }).catch(reportFailure);
  };
  const cancel = () => {
    const id = activeJob.current;
    if (id) {
      setNotice("tabularCancelled");
      void cancelJob({ requestId: id }).catch(reportFailure);
    }
  };
  const keepWorking = () => {
    blocker.reset?.();
  };
  const discard = () => {
    if (blocker.status === "blocked") {
      blocker.proceed();
    }
  };
  return {
    columnWidths,
    setColumnWidths,
    session,
    sheet,
    sheetId,
    view,
    viewport,
    viewStale,
    columns,
    progress,
    plan,
    busy,
    slowBusy,
    failure,
    notice,
    historyNotice,
    query,
    range,
    focus,
    receipt,
    source,
    detection,
    address,
    activeCell,
    tabs,
    dirtyTabs,
    pendingClose,
    discardTotals,
    pending: blocker.status === "blocked",
    openFile,
    openFiles,
    openSample,
    retryOpen,
    switchFile,
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
    readChartRows,
    nextUnresolved,
    previewDedupe,
    makePlan,
    createOutput,
    createSplit,
    addMergeFile,
    addMergeSession,
    makeMergePlan,
    createMerge,
    discardMerge,
    addDiffFile,
    makeDiffPlan,
    readDiffPage,
    createDiff,
    discardDiff,
    closeFile,
    confirmClose,
    cancelClose,
    cancel,
    keepWorking,
    discard,
    reportFailure,
    setFailure,
  };
};
