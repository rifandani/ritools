/* oxlint-disable anti-slop/no-object-parameters, anti-slop/no-reflect-get, anti-slop/no-runtime-typeof, anti-slop/no-unknown-parameters, anti-slop/no-unknown-returns, anti-slop/require-safety-comment-for-type-assertion -- this hook is the boundary that turns an untrusted rejection into a named failure and a selected key into a Clean Preset */
"use client";

import { useAtomSet } from "@effect/atom-react";
import { makeZip } from "client-zip";
import { Atom } from "effect/reactivity";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { useWatchFolder } from "@/core/hooks/use-watch-folder";
import { download, fingerprintOf } from "@/core/libs/files";
import type { DroppedFile } from "@/core/libs/files";
import type {
  CleanPreset,
  CleanProgress,
  ExposeCleanEvent,
  ExposeErrorCode,
  ExposeSource,
  MetadataGroup,
  ReadReport,
} from "@/features/expose/expose";
import {
  groupsForPreset,
  isReadOnly,
  FileFormat,
} from "@/features/expose/expose";
import {
  cleanExposeBatchAtom,
  readExposeAtom,
} from "@/features/expose/expose.atoms";
import {
  batchSummaryOf,
  cleanableItem,
  activeItemOf,
  activeViewOf,
  canStartItem,
  presetReasonsFor,
  exposeZipPlan,
  failureStateOf,
  incomingExposeItems,
  resultStateOf,
  selectionKeyOf,
  staleItem,
  storeCleanResult,
} from "@/features/expose/expose.batch";
import type {
  ExposeFailure,
  ExposeItem,
  StoredCleanResult,
} from "@/features/expose/expose.batch";
import { defaultPresetOf } from "@/features/expose/expose.view";
import type {
  PresetReason,
  SelectionSummary,
} from "@/features/expose/expose.view";

export type { ExposeFailure } from "@/features/expose/expose.batch";

/** A file over this size asks before it is read. */
const LARGE_FILE_BYTES = 200 * 1024 * 1024;

/** The two Sample Images Expose ships with. */
const SAMPLE_IMAGES = {
  ai: {
    name: "ai-firefly-c2pa.jpg",
    path: "/samples/expose/ai-firefly-c2pa.jpg",
  },
  camera: {
    name: "camera-nikon-z9-c2pa.jpg",
    path: "/samples/expose/camera-nikon-z9-c2pa.jpg",
  },
} as const;

export type SampleName = keyof typeof SAMPLE_IMAGES;

/** Every named failure, so an untyped rejection still lands in a known state. */
const ERROR_CODES: ReadonlySet<string> = new Set<ExposeErrorCode>([
  "unsupported-format",
  "unreadable-file",
  "clean-not-supported",
  "engine-unavailable",
  "engine-failed",
  "too-large",
  "cancelled",
]);

const FILE_FORMATS: ReadonlySet<string> = new Set(FileFormat.literals);

const METADATA_GROUPS: ReadonlySet<string> = new Set<MetadataGroup>([
  "ai-provenance",
  "location",
  "time",
  "device-identity",
  "camera-settings",
  "authorship",
  "software-history",
  "thumbnails",
  "other-text",
  "display",
]);

const fieldOf = (value: object, key: string): unknown =>
  key in value ? Reflect.get(value, key) : undefined;

/** Turn any rejection into the named failure the page prints. */
const failureOf = (error: unknown): ExposeFailure => {
  const record =
    typeof error === "object" && error !== null ? error : Object.create(null);
  const code = fieldOf(record, "code");
  const detail = fieldOf(record, "detail");
  const format = fieldOf(record, "format");
  const group = fieldOf(record, "group");
  return {
    code:
      typeof code === "string" && ERROR_CODES.has(code)
        ? (code as ExposeErrorCode)
        : "unreadable-file",
    detail: typeof detail === "string" ? detail : "",
    format:
      typeof format === "string" && FILE_FORMATS.has(format)
        ? (format as FileFormat)
        : null,
    group:
      typeof group === "string" && METADATA_GROUPS.has(group)
        ? (group as MetadataGroup)
        : null,
  };
};

interface ExposeState {
  readonly items: readonly ExposeItem[];
  readonly activeId: string | null;
  readonly preset: CleanPreset;
  readonly custom: readonly MetadataGroup[];
  readonly cleaning: boolean;
  readonly cancelled: boolean;
  readonly cleanProgress: CleanProgress | null;
  readonly readProgress: CleanProgress | null;
  readonly pending: readonly ExposeItem[];
  readonly pendingTotal: boolean;
  readonly skipped: number;
  readonly duplicates: number;
  readonly completed: number;
  readonly runTotal: number;
  readonly zipStatus: "idle" | "building" | "done" | "failed";
  readonly zipLeftOut: number;
}

const EMPTY_STATE: ExposeState = {
  items: [],
  activeId: null,
  preset: "ai-only",
  custom: [],
  cleaning: false,
  cancelled: false,
  cleanProgress: null,
  readProgress: null,
  pending: [],
  pendingTotal: false,
  skipped: 0,
  duplicates: 0,
  completed: 0,
  runTotal: 0,
  zipStatus: "idle",
  zipLeftOut: 0,
};

const focusById = (id: string): void => {
  requestAnimationFrame(() => {
    const target = document.querySelector<HTMLElement>(`#${id}`);
    if (target !== null && target.getClientRects().length > 0) {
      target.focus();
      return;
    }
    const visible = [
      ...document.querySelectorAll<HTMLElement>("[data-focus-id]"),
    ].find(
      (element) =>
        element.dataset.focusId === id && element.getClientRects().length > 0
    );
    visible?.focus();
  });
};

const reportCleanEvent = (
  event: ExposeCleanEvent,
  epoch: number,
  key: string,
  runGeneration: { readonly current: number },
  mounted: { readonly current: boolean },
  current: { readonly current: ExposeState },
  patchItem: (id: string, next: Partial<ExposeItem>) => void,
  patch: (next: Partial<ExposeState>) => void,
  update: (change: (value: ExposeState) => ExposeState) => void
): void => {
  if (epoch !== runGeneration.current || !mounted.current) {
    return;
  }
  if (event.kind === "started") {
    patchItem(event.id, { state: "cleaning", error: null });
    return;
  }
  if (event.kind === "progress") {
    patch({ cleanProgress: event.progress });
    return;
  }
  if (event.kind === "failed") {
    patchItem(event.id, {
      state: failureStateOf(event.error.code),
      error: failureOf(event.error),
      result: null,
      resultKey: null,
    });
  } else {
    try {
      const result = storeCleanResult(event.result);
      const nextKey = selectionKeyOf(
        current.current.preset,
        current.current.custom
      );
      patchItem(event.id, {
        result,
        resultKey: key,
        state: key === nextKey ? resultStateOf(result) : "stale",
        error: null,
      });
    } catch (error) {
      patchItem(event.id, {
        state: "too-large",
        error: {
          code: "too-large",
          detail: String(error),
          format: null,
          group: null,
        },
        result: null,
        resultKey: null,
      });
    }
  }
  update((previous) => ({
    ...previous,
    completed: previous.completed + 1,
    cleanProgress: null,
  }));
};

export interface ExposeController {
  readonly watch: ReturnType<typeof useWatchFolder>;
  readonly items: readonly ExposeItem[];
  readonly activeId: string | null;
  readonly batch: boolean;
  readonly canCleanAll: boolean;
  readonly completed: number;
  readonly runTotal: number;
  readonly skipped: number;
  readonly duplicates: number;
  readonly zipStatus: ExposeState["zipStatus"];
  readonly zipLeftOut: number;
  readonly pendingTotal: boolean;
  readonly pendingBytes: number;
  readonly pendingNames: readonly string[];
  readonly canStart: boolean;
  readonly cancelled: boolean;
  readonly cleanError: ExposeFailure | null;
  readonly cleanProgress: CleanProgress | null;

  readonly cleaning: boolean;
  readonly custom: readonly MetadataGroup[];
  readonly groups: readonly MetadataGroup[];
  readonly online: boolean;
  readonly pendingLarge: ExposeSource | null;
  readonly preset: CleanPreset;
  readonly presetReasons: Readonly<Record<CleanPreset, PresetReason>>;
  readonly readError: ExposeFailure | null;
  readonly reading: boolean;
  readonly readProgress: CleanProgress | null;
  readonly report: ReadReport | null;
  readonly result: StoredCleanResult | null;
  readonly sample: SampleName | null;
  readonly source: ExposeSource | null;
  readonly summary: SelectionSummary;
  readonly actions: {
    readonly openFiles: (files: readonly DroppedFile[]) => void;
    readonly openItem: (id: string) => void;
    readonly backToBatch: () => void;
    readonly remove: (id: string) => void;
    readonly clear: () => void;
    readonly cleanAll: () => void;
    readonly downloadOne: (id: string) => void;
    readonly downloadAll: () => void;
    readonly cancelClean: () => void;
    readonly clean: () => void;
    readonly cleanAgain: () => void;
    readonly cleanAnother: () => void;
    readonly confirmLarge: () => void;
    readonly dismissLarge: () => void;
    readonly downloadOriginal: () => void;
    readonly openFile: (file: File) => void;
    readonly openSample: (sample: SampleName) => void;
    readonly setCustom: (groups: readonly MetadataGroup[]) => void;
    readonly setPreset: (preset: CleanPreset) => void;
  };
}

/** A route owns the Batch. No source or result is persisted. */
export const useExpose = (): ExposeController => {
  const [state, setState] = useState<ExposeState>(EMPTY_STATE);
  const [focusRequest, setFocusRequest] = useState<{
    readonly id: string;
  } | null>(null);
  const requestFocus = (id: string) => setFocusRequest({ id });
  useEffect(() => {
    if (focusRequest !== null) {
      focusById(focusRequest.id);
    }
  }, [focusRequest]);
  const current = useRef(state);
  const mounted = useRef(true);
  const generation = useRef(0);
  const runGeneration = useRef(0);
  const totalWarned = useRef(false);
  const selectionTouched = useRef(false);
  const queue = useRef<ExposeItem[]>([]);
  const pumping = useRef(false);
  const [online, setOnline] = useState(true);
  const read = useAtomSet(readExposeAtom, { mode: "promise" });
  const interruptRead = useAtomSet(readExposeAtom);
  const cleanFile = useAtomSet(cleanExposeBatchAtom, { mode: "promise" });
  const interrupt = useAtomSet(cleanExposeBatchAtom);

  const { update, patch, patchItem } = useMemo(() => {
    const applyUpdate = (change: (value: ExposeState) => ExposeState) => {
      if (!mounted.current) {
        return;
      }
      const next = change(current.current);
      current.current = next;
      setState(next);
    };
    const applyPatch = (next: Partial<ExposeState>) =>
      applyUpdate((value) => ({ ...value, ...next }));
    const applyItemPatch = (id: string, next: Partial<ExposeItem>) =>
      applyUpdate((value) => ({
        ...value,
        items: value.items.map((item) =>
          item.id === id ? { ...item, ...next } : item
        ),
      }));
    return {
      update: applyUpdate,
      patch: applyPatch,
      patchItem: applyItemPatch,
    };
  }, []);

  useEffect(() => {
    mounted.current = true;
    const connection = () => setOnline(navigator.onLine);
    connection();
    window.addEventListener("online", connection);
    window.addEventListener("offline", connection);
    return () => {
      mounted.current = false;
      generation.current += 1;
      runGeneration.current += 1;
      queue.current = [];
      interrupt(Atom.Interrupt);
      interruptRead(Atom.Interrupt);
      window.removeEventListener("online", connection);
      window.removeEventListener("offline", connection);
    };
  }, [interrupt, interruptRead]);

  const pumpReads = useCallback(async () => {
    if (pumping.current) {
      return;
    }
    pumping.current = true;
    while (queue.current.length > 0 && mounted.current) {
      const item = queue.current.shift();
      if (
        item === undefined ||
        !current.current.items.some((row) => row.id === item.id)
      ) {
        continue;
      }
      const epoch = generation.current;
      try {
        // oxlint-disable-next-line no-await-in-loop -- read one file at a time to bound memory and keep the read atom's request independent
        const report = await read({
          ...item.source,
          report: (readProgress) => {
            if (epoch === generation.current) {
              patch({ readProgress });
            }
          },
        });
        patch({ readProgress: null });
        if (epoch !== generation.current) {
          continue;
        }
        patchItem(item.id, {
          report,
          reading: false,
          state: isReadOnly(report.facts.format) ? "not-supported" : "ready",
        });
        if (!selectionTouched.current && !isReadOnly(report.facts.format)) {
          selectionTouched.current = true;
          patch({ preset: defaultPresetOf(report) });
        }
        if (
          current.current.items.length === 1 ||
          current.current.activeId === item.id
        ) {
          setFocusRequest({ id: "expose-report-title" });
        }
      } catch (error) {
        if (epoch !== generation.current) {
          continue;
        }
        const failure = failureOf(error);
        patchItem(item.id, {
          error: failure,
          reading: false,
          state: failureStateOf(failure.code, true),
        });
      }
    }
    pumping.current = false;
  }, [patch, patchItem, read]);

  const accept = useCallback(
    (items: readonly ExposeItem[]) => {
      update((value) => ({
        ...value,
        items: [...value.items, ...items],
        activeId: null,
        pending: [],
        pendingTotal: false,
      }));
      queue.current.push(...items.filter((item) => item.reading));
      void pumpReads();
    },
    [pumpReads, update]
  );

  const openFiles = useCallback(
    (files: readonly DroppedFile[]) => {
      const value = current.current;
      const incoming = incomingExposeItems(
        [...value.items, ...value.pending],
        files,
        () => crypto.randomUUID()
      );
      const pending = [...value.pending, ...incoming.accepted];
      const total = [...value.items, ...pending].reduce(
        (sum, item) => sum + item.source.bytes.size,
        0
      );
      const warnTotal = !totalWarned.current && total > 1024 ** 3;
      update((previous) => ({
        ...previous,
        duplicates: previous.duplicates + incoming.duplicates,
        skipped: previous.skipped + incoming.skipped,
      }));
      if (pending.length === 0) {
        return;
      }
      if (
        warnTotal ||
        pending.some((item) => item.source.bytes.size > LARGE_FILE_BYTES)
      ) {
        patch({ pending, pendingTotal: warnTotal });
        return;
      }
      accept(pending);
    },
    [accept, patch, update]
  );
  const openFile = (file: File) => openFiles([{ file, folderPath: null }]);

  const existingFiles = useCallback(
    () =>
      [...current.current.items, ...current.current.pending].map(({ source }) =>
        fingerprintOf({
          name: source.name,
          size: source.bytes.size,
          lastModified: source.lastModified,
        })
      ),
    []
  );
  const watch = useWatchFolder(openFiles, existingFiles);
  const { stop: stopWatching } = watch;

  const confirmLarge = () => {
    if (current.current.pendingTotal) {
      totalWarned.current = true;
    }
    accept(current.current.pending);
  };
  const dismissLarge = () => patch({ pending: [], pendingTotal: false });
  const openSample = (sample: SampleName) => {
    const epoch = generation.current;
    void (async () => {
      const entry = SAMPLE_IMAGES[sample];
      try {
        const response = await fetch(entry.path);
        const bytes = await (response.ok
          ? response.blob()
          : Promise.reject(new Error("the Sample Image could not be read")));
        if (epoch === generation.current && mounted.current) {
          openFiles([
            {
              file: new File([bytes], entry.name, {
                type: bytes.type || "image/jpeg",
                lastModified: 0,
              }),
              folderPath: null,
            },
          ]);
        }
      } catch (error) {
        if (epoch !== generation.current) {
          return;
        }
        const failure = failureOf(error);
        accept([
          {
            id: crypto.randomUUID(),
            folderPath: null,
            source: {
              bytes: new Blob(),
              name: entry.name,
              type: "image/jpeg",
              lastModified: 0,
            },
            report: null,
            reading: false,
            error: failure,
            result: null,
            resultKey: null,
            state: "rejected",
          },
        ]);
      }
    })();
  };

  const changeSelection = (
    preset: CleanPreset,
    custom: readonly MetadataGroup[]
  ) => {
    selectionTouched.current = true;
    const key = selectionKeyOf(preset, custom);
    update((value) => ({
      ...value,
      preset,
      custom,
      cancelled: false,
      items: value.items.map((item) =>
        item.state === "cleaning" ? item : staleItem(item, key)
      ),
    }));
  };
  const setPreset = (preset: CleanPreset) =>
    changeSelection(preset, current.current.custom);
  const setCustom = (custom: readonly MetadataGroup[]) =>
    changeSelection(current.current.preset, custom);

  const startRun = useCallback(
    async (onlyId?: string) => {
      const value = current.current;
      if (value.cleaning) {
        return;
      }
      const tasks = value.items.filter((item) =>
        onlyId === undefined
          ? cleanableItem(item)
          : item.id === onlyId && item.report !== null && !item.reading
      );
      if (tasks.length === 0) {
        return;
      }
      runGeneration.current += 1;
      const epoch = runGeneration.current;
      const key = selectionKeyOf(value.preset, value.custom);
      patch({
        cleaning: true,
        cancelled: false,
        completed: 0,
        runTotal: tasks.length,
        cleanProgress: null,
      });
      try {
        await cleanFile({
          tasks: tasks.map(({ id, source }) => ({ id, source })),
          request: {
            preset: value.preset,
            groups: groupsForPreset(value.preset, value.custom),
          },
          report: (event) =>
            reportCleanEvent(
              event,
              epoch,
              key,
              runGeneration,
              mounted,
              current,
              patchItem,
              patch,
              update
            ),
        });
      } catch {
        // Worker failures are row events; an interrupted atom rejects its promise.
      }
      if (epoch === runGeneration.current && mounted.current) {
        update((previous) => ({
          ...previous,
          cleaning: false,
          cleanProgress: null,
          items: previous.items.map((item) =>
            item.state === "cleaning" ? { ...item, state: "ready" } : item
          ),
        }));
        setFocusRequest({
          id:
            onlyId === undefined
              ? "expose-batch-summary"
              : "expose-verification-title",
        });
      }
    },
    [cleanFile, patch, patchItem, update]
  );
  const cleanAll = () => {
    void startRun();
  };
  const active = activeItemOf(state.items, state.activeId);
  const clean = () => {
    if (active !== undefined) {
      void startRun(active.id);
    }
  };
  const cancelClean = () => {
    runGeneration.current += 1;
    interrupt(Atom.Interrupt);
    update((value) => ({
      ...value,
      cleaning: false,
      cancelled: true,
      cleanProgress: null,
      items: value.items.map((item) =>
        item.state === "cleaning"
          ? { ...item, state: "ready", result: null, resultKey: null }
          : item
      ),
    }));
    requestFocus(
      current.current.items.length > 1 && current.current.activeId === null
        ? "expose-clean-all"
        : "expose-clean"
    );
  };
  const clear = () => {
    stopWatching();
    generation.current += 1;
    runGeneration.current += 1;
    queue.current = [];
    interrupt(Atom.Interrupt);
    interruptRead(Atom.Interrupt);
    totalWarned.current = false;
    selectionTouched.current = false;
    update(() => EMPTY_STATE);
    requestFocus("expose-choose-files");
  };
  const remove = (id: string) => {
    const index = current.current.items.findIndex((item) => item.id === id);
    update((value) => ({
      ...value,
      items: value.items.filter((item) => item.id !== id),
      activeId: value.activeId === id ? null : value.activeId,
    }));
    const next =
      current.current.items[Math.min(index, current.current.items.length - 1)];
    requestFocus(
      current.current.items.length > 1 && next !== undefined
        ? `expose-open-${next.id}`
        : current.current.items.length === 1
          ? "expose-report-title"
          : "expose-choose-files"
    );
  };
  const openItem = (id: string) => {
    patch({ activeId: id });
    requestFocus("expose-report-title");
  };
  const backToBatch = () => {
    const id = current.current.activeId;
    patch({ activeId: null });
    if (id !== null) {
      requestFocus(`expose-open-${id}`);
    }
  };
  const cleanAgain = () => {
    if (active !== undefined) {
      patchItem(active.id, {
        result: null,
        resultKey: null,
        state: "ready",
        error: null,
      });
    }
    requestFocus("expose-clean");
  };
  const downloadOriginal = () => {
    if (active !== undefined) {
      download(active.source.bytes, active.source.name);
    }
  };
  const downloadOne = (id: string) => {
    const item = current.current.items.find((row) => row.id === id);
    if (item?.state === "cleaned" && item.result !== null) {
      download(item.result.file.bytes, item.result.file.name);
    }
  };
  const downloadAll = () => {
    const { entries, leftOut } = exposeZipPlan(current.current.items);
    if (entries.length === 0 || current.current.zipStatus === "building") {
      return;
    }
    const epoch = generation.current;
    patch({ zipStatus: "building", zipLeftOut: leftOut });
    void (async () => {
      try {
        const blob = await new Response(makeZip(entries)).blob();
        if (epoch !== generation.current || !mounted.current) {
          return;
        }
        download(blob, "expose-clean.zip");
        patch({ zipStatus: "done" });
      } catch {
        if (epoch === generation.current) {
          patch({ zipStatus: "failed" });
        }
      }
    })();
  };

  const groups = useMemo(
    () => groupsForPreset(state.preset, state.custom),
    [state.preset, state.custom]
  );
  const batch = state.items.length > 1 && state.activeId === null;
  const summary = useMemo(
    () =>
      batch
        ? batchSummaryOf(state.items, groups)
        : batchSummaryOf(active === undefined ? [] : [active], groups),
    [active, batch, groups, state.items]
  );
  const presetReasons = useMemo(
    () => presetReasonsFor(active, state.custom),
    [active, state.custom]
  );
  return {
    ...state,
    watch,
    ...activeViewOf(active),
    batch,
    actions: {
      openFiles,
      openFile,
      openSample,
      confirmLarge,
      dismissLarge,
      setPreset,
      setCustom,
      cleanAll,
      clean,
      cancelClean,
      cleanAgain,
      cleanAnother: clear,
      clear,
      remove,
      openItem,
      backToBatch,
      downloadOriginal,
      downloadOne,
      downloadAll,
    },
    canCleanAll: !state.cleaning && state.items.some(cleanableItem),
    canStart: canStartItem(active, groups, state.cleaning),
    online,
    groups,
    summary,
    presetReasons,
    pendingNames: state.pending.reduce<string[]>((names, item) => {
      if (item.source.bytes.size > LARGE_FILE_BYTES) {
        names.push(item.source.name);
      }
      return names;
    }, []),
    pendingLarge: state.pending[0]?.source ?? null,
    pendingBytes:
      state.pending.reduce((sum, item) => sum + item.source.bytes.size, 0) +
      state.items.reduce((sum, item) => sum + item.source.bytes.size, 0),
    sample: null,
  };
};
