/* oxlint-disable react/todo -- Operation locks and browser resources must release in finally. */
/* oxlint-disable react/set-state-in-effect -- The route starts one local-file open after mount, never during SSR. */
/* oxlint-disable promise/prefer-await-to-then -- Unmount cannot await close; the scoped engine finalizer also terminates the Worker. */
/* oxlint-disable anti-slop/no-unknown-parameters -- The UI boundary narrows atom promise rejections to the public FolioFailure. */
"use client";

import {
  RegistryContext,
  useAtom,
  useAtomMount,
  useAtomSet,
  useAtomValue,
} from "@effect/atom-react";
import { useBlocker } from "@tanstack/react-router";
import { Layer } from "effect";
import { Atom, AtomRegistry } from "effect/reactivity";
import {
  useCallback,
  useContext,
  useEffect,
  useEffectEvent,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import type * as F from "./folio";
import { makeFolioAtoms } from "./folio.atoms";
import { createDownload, focusElement, readFile } from "./folio.browser";
import { FolioEngine } from "./folio.service";
import { runLocal, uiFailure } from "./folio.ui";
import type { Reply } from "./folio.ui";
import { folioWorkerFactoryLayer } from "./folio.worker-client";

export type FolioController = ReturnType<typeof useFolio>;

export const useFolio = (file: File) => {
  "use no memo";
  const atoms = useMemo(
    () => ({
      ...makeFolioAtoms(
        Layer.fresh(
          FolioEngine.layer.pipe(Layer.provide(folioWorkerFactoryLayer))
        )
      ),
      openedEpoch: Atom.make(0),
      renderEpoch: Atom.make(0),
      selected: Atom.make<readonly F.PageId[]>([]),
      currentPage: Atom.make<F.PageId | null>(null),
      forms: Atom.make<readonly F.FormField[]>([]),
      outline: Atom.make<Reply<"OutlineRead">["items"]>([]),
      annotations: Atom.make<readonly F.Annotation[]>([]),
      receipt: Atom.make<{
        revision: F.Revision;
        scope: F.ExportScope;
        filename: string;
        url: string;
      } | null>(null),
    }),
    []
  );
  useAtomMount(atoms.runtime);
  const snapshot = useAtomValue(atoms.snapshot);
  const [openedEpoch, setOpenedEpoch] = useAtom(atoms.openedEpoch);
  const [renderEpoch, setRenderEpoch] = useAtom(atoms.renderEpoch);
  const progress = useAtomValue(atoms.progress);
  const plan = useAtomValue(atoms.plan);
  const setSnapshot = useAtomSet(atoms.snapshot);
  const setPlan = useAtomSet(atoms.plan);
  const [selected, setSelected] = useAtom(atoms.selected);
  const [currentPage, setCurrentPage] = useAtom(atoms.currentPage);
  const [forms, setForms] = useAtom(atoms.forms);
  const [outline, setOutline] = useAtom(atoms.outline);
  const [annotations, setAnnotations] = useAtom(atoms.annotations);
  const [receipt, setReceipt] = useAtom(atoms.receipt);
  const open = useAtomSet(atoms.open, { mode: "promise" });
  const registry = useContext(RegistryContext);
  const read = useCallback(
    (input: {
      readonly tag:
        | "ReadText"
        | "ReadOutline"
        | "ReadForms"
        | "ReadAnnotations";
      readonly page: F.PageId | null;
    }) => {
      const atom = atoms.readRequest();
      registry.set(atom, input);
      return runLocal(
        AtomRegistry.getResult(registry, atom, { suspendOnWaiting: true })
      );
    },
    [registry, atoms]
  );
  const render = useCallback(
    (viewport: F.Viewport, signal?: AbortSignal) => {
      const atom = atoms.renderPage();
      registry.set(atom, viewport);
      return runLocal(
        AtomRegistry.getResult(registry, atom, { suspendOnWaiting: true }),
        signal
      );
    },
    [registry, atoms]
  );
  const thumbnail = useCallback(
    (input: { readonly page: F.PageId; readonly maxWidth: number }) => {
      const atom = atoms.thumbnailRequest();
      registry.set(atom, input);
      return runLocal(
        AtomRegistry.getResult(registry, atom, { suspendOnWaiting: true })
      );
    },
    [registry, atoms]
  );
  const search = useAtomSet(atoms.search, { mode: "promise" });
  const inspectSource = useAtomSet(atoms.inspectSource, { mode: "promise" });
  const releaseSource = useAtomSet(atoms.releaseSource, { mode: "promise" });
  const commit = useAtomSet(atoms.commit, { mode: "promise" });
  const history = useAtomSet(atoms.history, { mode: "promise" });
  const planExport = useAtomSet(atoms.planExport, { mode: "promise" });
  const write = useAtomSet(atoms.write, { mode: "promise" });
  const acknowledge = useAtomSet(atoms.acknowledgeDownload, {
    mode: "promise",
  });
  const close = useAtomSet(atoms.close, { mode: "promise" });
  const cancelRequest = useAtomSet(atoms.cancel, { mode: "promise" });
  const activeRequest = useAtomValue(atoms.activeRequest);
  const track = useAtomSet(atoms.trackProgress);
  const [busy, setBusy] = useState(false);
  const [phase, setPhase] = useState<
    | "folioOpening"
    | "folioApplying"
    | "folioSearching"
    | "folioWriting"
    | "folioPlanning"
    | "folioChecking"
  >("folioOpening");
  const [failure, setFailure] = useState<F.FolioFailure | null>(null);
  const [passwordRequired, setPasswordRequired] = useState(false);
  const [notice, setNotice] = useState<
    | ""
    | "folioReady"
    | "folioCancelled"
    | "folioApplied"
    | "folioUndone"
    | "folioRedone"
    | "folioDownloadStarted"
    | "folioExtracted"
    | "folioDiscardDraft"
    | "folioHighlightHelp"
  >("");
  const [drafting, setDrafting] = useState(false);
  const [pending, setPending] = useState<(() => void) | null>(null);
  const [searchResult, setSearchResult] = useState<Reply<"SearchRead"> | null>(
    null
  );
  const alive = useRef(true);
  const lock = useRef(false);
  const selectionByCursor = useRef(new Map<number, readonly F.PageId[]>());
  const latest = useRef(snapshot);
  useLayoutEffect(() => {
    latest.current = snapshot;
  }, [snapshot]);
  const receiptUrl = useRef<string | null>(null);
  const downloadTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dirty = Boolean(
    snapshot &&
    snapshot.revision > 0 &&
    snapshot.downloadedRevision !== snapshot.revision
  );
  const blocker = useBlocker({
    shouldBlockFn: () =>
      drafting ||
      Boolean(
        latest.current &&
        latest.current.revision > 0 &&
        latest.current.downloadedRevision !== latest.current.revision
      ),
    enableBeforeUnload: dirty || drafting,
    withResolver: true,
  });
  const reportFailure = useCallback(
    (error: unknown) => {
      const next = uiFailure(error);
      if (next.code === "stale-revision" || next.code === "cancelled") {
        return;
      }
      setFailure(next);
      if (!next.sessionAlive && next.code !== "offline-asset-missing") {
        setSnapshot(null);
        setSelected([]);
        setPlan(null);
        setForms([]);
        setAnnotations([]);
      }
      focusElement("folio-error");
    },
    [setSnapshot, setSelected, setPlan, setForms, setAnnotations]
  );
  const run = async <A>(
    label: typeof phase,
    operation: () => Promise<A>
  ): Promise<A | undefined> => {
    if (lock.current) {
      return;
    }
    lock.current = true;
    setBusy(true);
    setPhase(label);
    setFailure(null);
    setNotice("");
    try {
      return await operation();
    } catch (error) {
      const next = uiFailure(error);
      if (next.code === "password-required" || next.code === "wrong-password") {
        setPasswordRequired(true);
        setFailure(next);
        focusElement("folio-password");
      } else if (next.code === "stale-revision") {
        setFailure(next);
        focusElement("folio-error");
      } else if (next.code === "cancelled") {
        setNotice("folioCancelled");
        focusElement("folio-document");
      } else {
        reportFailure(error);
      }
    } finally {
      lock.current = false;
      if (alive.current) {
        setBusy(false);
      }
    }
  };
  const openFile = (password?: string) =>
    run("folioOpening", async () => {
      const result = await open({
        bytes: await runLocal(readFile(file)),
        name: file.name,
        password,
      });
      if (!alive.current) {
        return;
      }
      setOpenedEpoch((epoch) => epoch + 1);
      setPasswordRequired(false);
      setCurrentPage(result.snapshot.pages[0]?.id ?? null);
      setSelected([]);
      setReceipt(null);
      setNotice("folioReady");
      focusElement("folio-document");
    });
  const openInitial = useEffectEvent(() => openFile());
  useEffect(() => {
    alive.current = true;
    void openInitial();
    return () => {
      alive.current = false;
      if (receiptUrl.current) {
        URL.revokeObjectURL(receiptUrl.current);
      }
      if (downloadTimer.current) {
        clearTimeout(downloadTimer.current);
      }
      void close().catch(() => {
        /* The runtime finalizer also terminates the Worker. */
      });
    };
  }, [close]);
  useEffect(() => {
    if (activeRequest && busy) {
      track(activeRequest);
    }
  }, [activeRequest, busy, track]);
  const session = snapshot?.session;
  const revision = snapshot?.revision;
  useEffect(() => {
    if (!session || revision === undefined) {
      return;
    }
    let disposed = false;
    const load = async () => {
      try {
        const [fields, tree] = await Promise.all([
          read({ tag: "ReadForms", page: null }),
          read({ tag: "ReadOutline", page: null }),
        ]);
        if (
          disposed ||
          latest.current?.session !== session ||
          latest.current.revision !== revision
        ) {
          return;
        }
        if (fields._tag === "FormsRead") {
          setForms(fields.fields);
        }
        if (tree._tag === "OutlineRead") {
          setOutline(tree.items);
        }
      } catch (error) {
        if (!disposed) {
          reportFailure(error);
        }
      }
    };
    void load();
    return () => {
      disposed = true;
    };
  }, [session, revision, read, setForms, setOutline, reportFailure]);
  useEffect(() => {
    if (!session || revision === undefined || !currentPage) {
      return;
    }
    let disposed = false;
    const load = async () => {
      try {
        const result = await read({
          tag: "ReadAnnotations",
          page: currentPage,
        });
        if (
          !disposed &&
          latest.current?.revision === revision &&
          result._tag === "AnnotationsRead"
        ) {
          setAnnotations(result.annotations);
        }
      } catch (error) {
        if (!disposed) {
          reportFailure(error);
        }
      }
    };
    void load();
    return () => {
      disposed = true;
    };
  }, [session, revision, currentPage, read, setAnnotations, reportFailure]);
  const guardDraft = () => {
    if (drafting) {
      setNotice("folioDiscardDraft");
      return false;
    }
    return true;
  };
  const apply = (command: F.Command) => {
    if (!guardDraft()) {
      return;
    }
    return run("folioApplying", async () => {
      const before = latest.current;
      if (before) {
        selectionByCursor.current.set(before.history.cursor, selected);
      }
      const result = await commit(command);
      const { pages } = result.snapshot;
      const surviving = new Set(pages.map((p) => p.id));
      setSelected(selected.filter((id) => surviving.has(id)));
      if (command._tag === "ImportPages") {
        const old = new Set(before?.pages.map((p) => p.id));
        const imported = pages.filter((p) => !old.has(p.id));
        setSelected(imported.map((p) => p.id));
        setCurrentPage(imported[0]?.id ?? pages[0]?.id ?? null);
      } else if (currentPage && !surviving.has(currentPage)) {
        const previous =
          before?.pages.findIndex((p) => p.id === currentPage) ?? 0;
        setCurrentPage(pages[Math.min(previous, pages.length - 1)]?.id ?? null);
      }
      selectionByCursor.current.set(
        result.snapshot.history.cursor,
        command._tag === "ImportPages"
          ? pages.flatMap((p) =>
              before?.pages.some((old) => old.id === p.id) ? [] : [p.id]
            )
          : selected.filter((id) => surviving.has(id))
      );
      setSearchResult(null);
      setNotice("folioApplied");
      return result;
    });
  };
  // Draft owners call this once after validation, then clear their draft only
  // when the engine accepts the transaction.
  const applyDraft = (command: F.Command) =>
    run("folioApplying", async () => {
      const result = await commit(command);
      setSearchResult(null);
      setNotice("folioApplied");
      return result;
    });
  const undoRedo = (direction: "undo" | "redo") => {
    if (!guardDraft()) {
      return;
    }
    return run("folioApplying", async () => {
      const result = await history(direction);
      const surviving = new Set(result.snapshot.pages.map((p) => p.id));
      setSelected(
        (
          selectionByCursor.current.get(result.snapshot.history.cursor) ??
          selected
        ).filter((id) => surviving.has(id))
      );
      const affected = result.invalidatedPages.find((id) => surviving.has(id));
      if (affected) {
        setCurrentPage(affected);
      } else if (currentPage && !surviving.has(currentPage)) {
        setCurrentPage(result.snapshot.pages[0]?.id ?? null);
      }
      setSearchResult(null);
      setNotice(direction === "undo" ? "folioUndone" : "folioRedone");
      focusElement(affected ? `folio-page-${affected}` : `folio-${direction}`);
      return result;
    });
  };
  const selectPages = (ids: readonly F.PageId[]) => {
    setSelected(ids);
    if (plan?.scope._tag === "Selected") {
      setPlan(null);
    }
  };
  const find = (query: string, direction: "next" | "previous") =>
    run("folioSearching", async () => {
      if (!query) {
        setSearchResult(null);
        return;
      }
      const result = await search({
        query,
        direction,
        maxMatches: 10_000,
        cursor:
          searchResult?.query === query && searchResult.current
            ? {
                page: searchResult.current.page,
                offset: searchResult.current.start,
              }
            : null,
      });
      if (
        result.session !== latest.current?.session ||
        result.revision !== latest.current.revision
      ) {
        return;
      }
      setSearchResult(result);
      if (result.current) {
        setCurrentPage(result.current.page);
      }
    });
  const reviewExport = (scope: F.ExportScope) => {
    if (!guardDraft()) {
      return;
    }
    return run("folioPlanning", async () => {
      const result = await planExport(scope);
      return result.plan;
    });
  };
  const download = (filename: string) =>
    run("folioWriting", async () => {
      const { current } = latest;
      if (!plan || !current || plan.revision !== current.revision) {
        return;
      }
      const output = await write(plan.id);
      if (
        !alive.current ||
        output.session !== latest.current?.session ||
        output.revision !== latest.current.revision
      ) {
        return;
      }
      if (receiptUrl.current) {
        URL.revokeObjectURL(receiptUrl.current);
      }
      const name = `${filename
        .trim()
        .replaceAll(/[\\/]/gu, "-")
        .replace(/\.pdf$/iu, "")}.pdf`;
      const url = await runLocal(createDownload(output.bytes, name));
      receiptUrl.current = url;
      setReceipt({
        revision: output.revision,
        scope: plan.scope,
        filename: name,
        url,
      });
      if (plan.scope._tag === "Full") {
        await acknowledge(plan.id);
      }
      setNotice(
        plan.scope._tag === "Full" ? "folioDownloadStarted" : "folioExtracted"
      );
      if (downloadTimer.current) {
        clearTimeout(downloadTimer.current);
      }
      downloadTimer.current = setTimeout(() => {
        URL.revokeObjectURL(url);
        if (receiptUrl.current === url) {
          receiptUrl.current = null;
        }
        setReceipt((previous) =>
          previous && previous.url === url ? { ...previous, url: "" } : previous
        );
      }, 60_000);
    });
  const cancel = async () => {
    if (!activeRequest) {
      return;
    }
    try {
      await cancelRequest(activeRequest);
    } catch (error) {
      reportFailure(error);
    }
  };
  const requestReplace = (action: () => void) => {
    if (lock.current || dirty || drafting) {
      setPending(() => action);
    } else {
      action();
    }
  };
  const discard = () => {
    setPending(null);
    if (blocker.status === "blocked") {
      blocker.proceed();
    } else {
      pending?.();
    }
  };
  const keepEditing = () => {
    setPending(null);
    if (blocker.status === "blocked") {
      blocker.reset();
    }
  };
  const writable = Boolean(
    snapshot && snapshot.facts.readOnlyReasons.length === 0
  );
  const permissions = {
    copy: snapshot?.facts.permissions.copy ?? false,
    annotate: writable && Boolean(snapshot?.facts.permissions.annotate),
    fillForms: writable && Boolean(snapshot?.facts.permissions.fillForms),
    changePages: writable && Boolean(snapshot?.facts.permissions.changePages),
    extract: writable && Boolean(snapshot?.facts.permissions.extract),
    download: writable && Boolean(snapshot?.facts.permissions.download),
  };
  return {
    permissions,
    openedEpoch,
    renderEpoch,
    retryReading: () => {
      setFailure(null);
      setRenderEpoch((epoch) => epoch + 1);
    },
    snapshot,
    progress,
    plan,
    selected,
    currentPage,
    forms,
    outline,
    annotations,
    receipt,
    busy,
    phase,
    failure,
    passwordRequired,
    notice,
    drafting,
    dirty,
    pending: Boolean(pending) || blocker.status === "blocked",
    searchResult,
    setCurrentPage,
    setSelected: selectPages,
    setDrafting,
    setNotice,
    setPlan,
    reportFailure,
    run,
    render,
    thumbnail,
    read,
    apply,
    applyDraft,
    undoRedo,
    findText: find,
    reviewExport,
    download,
    cancel,
    inspectSource,
    releaseSource,
    requestReplace,
    discard,
    keepEditing,
    retry: (password?: string) => openFile(password),
    clearFailure: () => setFailure(null),
  };
};
