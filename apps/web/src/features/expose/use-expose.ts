/* oxlint-disable anti-slop/no-object-parameters, anti-slop/no-reflect-get, anti-slop/no-runtime-typeof, anti-slop/no-unknown-parameters, anti-slop/no-unknown-returns, anti-slop/require-safety-comment-for-type-assertion -- this hook is the boundary that turns an untrusted rejection into a named failure and a selected key into a Clean Preset */
"use client";

import { useAtomSet } from "@effect/atom-react";
import { Atom } from "effect/reactivity";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type {
  CleanPreset,
  CleanProgress,
  CleanResult,
  ExposeErrorCode,
  ExposeSource,
  ImageFormat,
  MetadataGroup,
  ReadReport,
} from "@/features/expose/expose";
import { groupsForPreset } from "@/features/expose/expose";
import {
  cleanExposeAtom,
  readExposeAtom,
} from "@/features/expose/expose.atoms";
import {
  canClean,
  defaultPresetOf,
  PRESET_ORDER,
  presetReasonOf,
  summaryOf,
} from "@/features/expose/expose.view";
import type {
  PresetReason,
  SelectionSummary,
} from "@/features/expose/expose.view";

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

const IMAGE_FORMATS: ReadonlySet<string> = new Set<ImageFormat>([
  "jpeg",
  "jxl",
  "tiff",
  "png",
  "heic",
  "avif",
  "webp",
  "gif",
]);

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

export interface ExposeFailure {
  readonly code: ExposeErrorCode;
  readonly detail: string;
  readonly format: ImageFormat | null;
  readonly group: MetadataGroup | null;
}

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
      typeof format === "string" && IMAGE_FORMATS.has(format)
        ? (format as ImageFormat)
        : null,
    group:
      typeof group === "string" && METADATA_GROUPS.has(group)
        ? (group as MetadataGroup)
        : null,
  };
};

/** The source shape the engine takes, made from a local file. */
const sourceOfFile = (file: File, name = file.name): ExposeSource => ({
  bytes: file,
  lastModified: file.lastModified,
  name,
  type: file.type,
});

interface ExposeState {
  readonly cancelled: boolean;
  readonly cleanError: ExposeFailure | null;
  readonly cleanProgress: CleanProgress | null;
  readonly cleaning: boolean;
  readonly custom: readonly MetadataGroup[];
  readonly pendingLarge: ExposeSource | null;
  readonly preset: CleanPreset;
  readonly readError: ExposeFailure | null;
  readonly reading: boolean;
  readonly report: ReadReport | null;
  readonly result: CleanResult | null;
  readonly sample: SampleName | null;
  readonly source: ExposeSource | null;
}

const EMPTY_STATE: ExposeState = {
  cancelled: false,
  cleanError: null,
  cleanProgress: null,
  cleaning: false,
  custom: [],
  pendingLarge: null,
  preset: "ai-only",
  readError: null,
  reading: false,
  report: null,
  result: null,
  sample: null,
  source: null,
};

/** The browser's connection flag, read after hydration and on every change. */
const useOnline = (): boolean => {
  const [online, setOnline] = useState(true);
  useEffect(() => {
    const update = () => {
      setOnline(navigator.onLine);
    };
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);
  return online;
};

/** Focus a mark once React has printed the state that holds it. */
const focusById = (id: string): void => {
  requestAnimationFrame(() => {
    document.querySelector<HTMLElement>(`#${id}`)?.focus();
  });
};

export interface ExposeController {
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
  readonly report: ReadReport | null;
  readonly result: CleanResult | null;
  readonly sample: SampleName | null;
  readonly source: ExposeSource | null;
  readonly summary: SelectionSummary;
  readonly actions: {
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

/**
 * One Expose session: one file, its report, and at most one Clean.
 *
 * Nothing starts on a drop, a preset change, or a group change. The Clean mark
 * is the only thing that reads the file again, and a cancelled Clean returns
 * the order with the report untouched.
 */
export const useExpose = (): ExposeController => {
  const [state, setState] = useState<ExposeState>(EMPTY_STATE);
  const read = useAtomSet(readExposeAtom, { mode: "promise" });
  const cleanFile = useAtomSet(cleanExposeAtom, { mode: "promise" });
  const interrupt = useAtomSet(cleanExposeAtom);
  const cancelRequested = useRef(false);
  const online = useOnline();

  const patch = useCallback((next: Partial<ExposeState>) => {
    setState((current) => ({ ...current, ...next }));
  }, []);

  const readSource = useCallback(
    async (source: ExposeSource, sample: SampleName | null) => {
      setState((current) => ({
        ...EMPTY_STATE,
        custom: current.custom,
        reading: true,
        sample,
        source,
      }));
      try {
        const report = await read(source);
        setState((current) => ({
          ...current,
          reading: false,
          report,
          preset: defaultPresetOf(report),
        }));
      } catch (error) {
        setState((current) => ({
          ...current,
          readError: failureOf(error),
          reading: false,
        }));
      }
    },
    [read]
  );

  const openFile = useCallback(
    (file: File) => {
      const source = sourceOfFile(file);
      if (file.size > LARGE_FILE_BYTES) {
        patch({ pendingLarge: source });
        return;
      }
      void readSource(source, null);
    },
    [patch, readSource]
  );

  const openSample = useCallback(
    (sample: SampleName) => {
      const entry = SAMPLE_IMAGES[sample];
      void (async () => {
        setState((current) => ({
          ...current,
          pendingLarge: null,
          reading: true,
          readError: null,
          sample,
        }));
        try {
          const response = await fetch(entry.path);
          if (!response.ok) {
            setState((current) => ({
              ...current,
              readError: {
                code: "unreadable-file",
                detail: "the Sample Image could not be read",
                format: null,
                group: null,
              },
              reading: false,
            }));
            return;
          }
          const blob = await response.blob();
          await readSource(
            {
              bytes: blob,
              lastModified: 0,
              name: entry.name,
              type: blob.type || "image/jpeg",
            },
            sample
          );
        } catch (error) {
          setState((current) => ({
            ...current,
            readError: failureOf(error),
            reading: false,
          }));
        }
      })();
    },
    [readSource]
  );

  const confirmLarge = useCallback(() => {
    const source = state.pendingLarge;
    if (source !== null) {
      void readSource(source, state.sample);
    }
  }, [readSource, state.pendingLarge, state.sample]);

  const dismissLarge = useCallback(() => {
    patch({ pendingLarge: null });
  }, [patch]);

  const groups = useMemo(
    () =>
      state.preset === "custom"
        ? groupsForPreset("custom", state.custom)
        : groupsForPreset(state.preset),
    [state.custom, state.preset]
  );

  const summary = useMemo(
    () =>
      state.report === null
        ? {
            displayFields: 0,
            fields: 0,
            groups: 0,
            keptFields: 0,
            keptGroups: 0,
          }
        : summaryOf(state.report, groups),
    [groups, state.report]
  );

  const presetReasons = useMemo(() => {
    // SAFETY: the loop fills every Clean Preset before the object is returned.
    const reasons = {} as Record<CleanPreset, PresetReason>;
    for (const preset of PRESET_ORDER) {
      reasons[preset] =
        state.report === null
          ? "empty"
          : presetReasonOf(state.report, preset, state.custom);
    }
    return reasons;
  }, [state.custom, state.report]);

  const startClean = useCallback(async () => {
    const { report, source, preset, custom } = state;
    if (report === null || source === null || state.cleaning) {
      return;
    }
    const selected = groupsForPreset(preset, custom);
    if (!canClean(report, selected)) {
      return;
    }
    cancelRequested.current = false;
    setState((current) => ({
      ...current,
      cancelled: false,
      cleanError: null,
      cleanProgress: {
        loadedBytes: null,
        percent: null,
        phase: "loading-engine",
        totalBytes: null,
      },
      cleaning: true,
    }));
    try {
      const result = await cleanFile({
        request: {
          groups: selected,
          preset,
          report: (progress: CleanProgress) => {
            setState((current) =>
              current.cleaning
                ? { ...current, cleanProgress: progress }
                : current
            );
          },
        },
        source,
      });
      setState((current) => ({
        ...current,
        cleanProgress: null,
        cleaning: false,
        result,
      }));
    } catch (error) {
      const failure = failureOf(error);
      if (cancelRequested.current || failure.code === "cancelled") {
        cancelRequested.current = false;
        setState((current) => ({
          ...current,
          cancelled: true,
          cleanProgress: null,
          cleaning: false,
        }));
        return;
      }
      setState((current) => ({
        ...current,
        cleanError: failure,
        cleanProgress: null,
        cleaning: false,
      }));
    }
  }, [cleanFile, state]);

  const clean = useCallback(() => {
    void startClean();
  }, [startClean]);

  const cancelClean = useCallback(() => {
    cancelRequested.current = true;
    interrupt(Atom.Interrupt);
  }, [interrupt]);

  const cleanAgain = useCallback(() => {
    patch({ cancelled: false, cleanError: null, result: null });
  }, [patch]);

  const cleanAnother = useCallback(() => {
    setState(EMPTY_STATE);
  }, []);

  const setPreset = useCallback(
    (preset: CleanPreset) => {
      patch({ cancelled: false, cleanError: null, preset });
    },
    [patch]
  );

  const setCustom = useCallback(
    (nextGroups: readonly MetadataGroup[]) => {
      patch({ cancelled: false, cleanError: null, custom: nextGroups });
    },
    [patch]
  );

  const downloadOriginal = useCallback(() => {
    const { source } = state;
    if (source === null) {
      return;
    }
    const url = URL.createObjectURL(source.bytes);
    const link = document.createElement("a");
    link.download = source.name;
    link.href = url;
    link.style.display = "none";
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => {
      URL.revokeObjectURL(url);
    }, 0);
  }, [state]);

  // Focus follows the state: the report after a read, the receipt after a
  // Clean, the Clean mark after a cancel. Reduced motion does not matter: the
  // element is in the document before it takes focus.
  useEffect(() => {
    if (state.report !== null && !state.reading) {
      focusById("expose-report-title");
    }
  }, [state.reading, state.report]);

  useEffect(() => {
    if (state.result !== null) {
      focusById("expose-verification-title");
    }
  }, [state.result]);

  useEffect(() => {
    if (state.cancelled) {
      focusById("expose-clean");
    }
  }, [state.cancelled]);

  return {
    actions: {
      cancelClean,
      clean,
      cleanAgain,
      cleanAnother,
      confirmLarge,
      dismissLarge,
      downloadOriginal,
      openFile,
      openSample,
      setCustom,
      setPreset,
    },
    canStart:
      state.report !== null &&
      !state.cleaning &&
      state.result === null &&
      canClean(state.report, groups),
    cancelled: state.cancelled,
    cleanError: state.cleanError,
    cleanProgress: state.cleanProgress,
    cleaning: state.cleaning,
    custom: state.custom,
    groups,
    online,
    pendingLarge: state.pendingLarge,
    preset: state.preset,
    presetReasons,
    readError: state.readError,
    reading: state.reading,
    report: state.report,
    result: state.result,
    sample: state.sample,
    source: state.source,
    summary,
  };
};
