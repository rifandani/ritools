import { fingerprintOf } from "@/core/libs/files";
import type { DroppedFile } from "@/core/libs/files";

/**
 * Cinch: compress videos to a Target file size or a Video Preset, on the
 * device (ADR-0040). This module is the pure half: settings, the encode plan,
 * the result words, the Batch summary, and how many videos encode at once.
 * The browser half, which reads and writes video with Mediabunny and
 * WebCodecs, is `cinch.engine.ts`.
 */

/* -------------------------------------------------------------------------- */
/* Settings                                                                    */
/* -------------------------------------------------------------------------- */

/** The Output Format Cinch writes: MP4 (H.264 + AAC) or WebM (VP9 + Opus). */
export type OutputFormat = "mp4" | "webm";

/** How Cinch chooses output size. */
export type SizeMode = "target" | "preset";

/** One named quality level of the Video Preset Size Mode. */
export type VideoPreset = "light" | "balanced" | "strong";

/** The tallest frame Cinch writes, on the short side of the frame. */
export type MaxResolution = "original" | "1080" | "720" | "480";

/** The highest frame rate Cinch writes. */
export type FrameRateCap = "original" | "30" | "24";

export interface CinchSettings {
  readonly frameRateCap: FrameRateCap;
  readonly maxResolution: MaxResolution;
  readonly outputFormat: OutputFormat;
  readonly preset: VideoPreset;
  readonly removeAudio: boolean;
  readonly sizeMode: SizeMode;
  readonly targetBytes: number;
}

export const BYTES_PER_MB = 1_000_000;

export const OUTPUT_FORMATS: readonly OutputFormat[] = ["mp4", "webm"];
export const SIZE_MODES: readonly SizeMode[] = ["target", "preset"];
export const VIDEO_PRESETS: readonly VideoPreset[] = [
  "light",
  "balanced",
  "strong",
];
export const MAX_RESOLUTIONS: readonly MaxResolution[] = [
  "original",
  "1080",
  "720",
  "480",
];
export const FRAME_RATE_CAPS: readonly FrameRateCap[] = [
  "original",
  "30",
  "24",
];

export const DEFAULT_SETTINGS: CinchSettings = {
  frameRateCap: "original",
  maxResolution: "original",
  outputFormat: "mp4",
  preset: "balanced",
  removeAudio: false,
  sizeMode: "target",
  targetBytes: 25 * BYTES_PER_MB,
};

/** One wrong setting that blocks a run. */
export interface SettingsIssue {
  readonly kind: "target-range";
}

export const settingsIssues = (
  settings: CinchSettings
): readonly SettingsIssue[] =>
  settings.sizeMode === "target" &&
  (!Number.isFinite(settings.targetBytes) || settings.targetBytes <= 0)
    ? [{ kind: "target-range" }]
    : [];

/** The settings that change an output. A result made under another key is Stale. */
export const settingsKeyOf = (settings: CinchSettings): string =>
  [
    settings.outputFormat,
    settings.sizeMode,
    settings.sizeMode === "target" ? settings.targetBytes : settings.preset,
    settings.maxResolution,
    settings.removeAudio ? "mute" : "audio",
    settings.frameRateCap,
  ].join("|");

/* -------------------------------------------------------------------------- */
/* Batch                                                                       */
/* -------------------------------------------------------------------------- */

/** One video of the Batch. */
export interface BatchItem {
  readonly folderPath: string | null;
  readonly id: string;
  readonly lastModified: number;
  readonly name: string;
  readonly size: number;
  readonly source: File;
}

/** The extensions the picker offers. Other files still enter and are Rejected by name. */
const VIDEO_EXTENSIONS = ["mp4", "m4v", "mov", "webm", "mkv"] as const;

export const ACCEPT = [
  "video/mp4",
  "video/quicktime",
  "video/webm",
  "video/x-matroska",
  ...VIDEO_EXTENSIONS.map((extension) => `.${extension}`),
].join(",");

export const extensionOf = (name: string): string => {
  const dot = name.lastIndexOf(".");
  return dot <= 0 ? "" : name.slice(dot + 1).toLowerCase();
};

/** Whether a file looks like a video, by its type or its extension. */
export const looksLikeVideo = (file: {
  readonly name: string;
  readonly type: string;
}): boolean =>
  file.type.startsWith("video/") ||
  VIDEO_EXTENSIONS.some((extension) => extension === extensionOf(file.name));

const batchItemOf = (entry: DroppedFile, id: string): BatchItem => ({
  folderPath: entry.folderPath,
  id,
  lastModified: entry.file.lastModified,
  name: entry.file.name,
  size: entry.file.size,
  source: entry.file,
});

/**
 * The Batch Items a drop adds. Inside a folder, a file that is not a video is
 * skipped. A loose file always enters, so a wrong file gets a named reason.
 * A file already in the Batch is a duplicate.
 */
export const incomingOf = (
  current: ReadonlyMap<string, BatchItem>,
  dropped: readonly DroppedFile[],
  makeId: () => string
) => {
  const known = new Set([...current.values()].map(fingerprintOf));
  const accepted: BatchItem[] = [];
  let duplicates = 0;
  let skipped = 0;
  for (const entry of dropped) {
    if (entry.folderPath !== null && !looksLikeVideo(entry.file)) {
      skipped += 1;
      continue;
    }
    const fingerprint = fingerprintOf(entry.file);
    if (known.has(fingerprint)) {
      duplicates += 1;
      continue;
    }
    known.add(fingerprint);
    accepted.push(batchItemOf(entry, makeId()));
  }
  return { accepted, duplicates, skipped };
};

/* -------------------------------------------------------------------------- */
/* Encode plan                                                                 */
/* -------------------------------------------------------------------------- */

/** What Cinch reads from an input before it encodes. */
export interface VideoInfo {
  /** The container's extension family: mp4 (MP4, MOV, M4V) or webm (WebM, MKV). */
  readonly container: OutputFormat;
  readonly durationSeconds: number;
  /** Frames per second, or `null` when the input does not say. */
  readonly frameRate: number | null;
  readonly hasAudio: boolean;
  readonly height: number;
  readonly width: number;
}

/** The encode settings for one input. */
export interface EncodePlan {
  /** Audio bits per second, or `null` to write no audio. */
  readonly audioBitrate: number | null;
  /** The lower resolution Cinch picked itself to fit the Target, or `null`. */
  readonly fitScale: number | null;
  readonly frameRate: number | null;
  readonly height: number;
  /** A Mediabunny quality level, in Video Preset mode. */
  readonly qualityLevel: "high" | "low" | "medium" | null;
  /** Video bits per second, in Target mode. */
  readonly videoBitrate: number | null;
  readonly width: number;
}

/** The share of the Target the plan spends: the rest covers the container. */
const TARGET_MARGIN = 0.95;

/** Below this many video bits per pixel per frame, a frame turns to blocks. */
const MIN_BITS_PER_PIXEL: Readonly<Record<OutputFormat, number>> = {
  mp4: 0.04,
  webm: 0.028,
};

/** The lowest video bitrate an encoder takes. */
export const MIN_VIDEO_BITRATE = 50_000;

const AUDIO_BITRATE = 128_000;
const LOW_AUDIO_BITRATE = 64_000;
const STRONG_AUDIO_BITRATE = 96_000;

/** The Fit Scale steps, tallest first. */
const FIT_STEPS = [1080, 720, 480] as const;

const PRESET_QUALITY = {
  balanced: "medium",
  light: "high",
  strong: "low",
} as const satisfies Record<VideoPreset, EncodePlan["qualityLevel"]>;

/** The widest or tallest frame that Cinch writes. */
const MAX_SIDE = 16_384;

/** An even number, as video encoders ask for. Between 2 and MAX_SIDE. */
const even = (value: number): number => {
  const bounded = Math.min(Math.max(value, 2), MAX_SIDE);
  return 2 * Math.round(bounded / 2);
};

/** The frame scaled so its short side is `shortSide`. It never scales up. */
export const scaledFrame = (
  width: number,
  height: number,
  shortSide: number
) => {
  const short = Math.max(1, Math.min(width, height));
  const target = Math.max(1, shortSide);
  if (short <= target) {
    return { height: even(height), width: even(width) };
  }
  const factor = Math.min(1, target / short);
  return { height: even(height * factor), width: even(width * factor) };
};

const capOf = (maxResolution: MaxResolution): number =>
  maxResolution === "original"
    ? Number.POSITIVE_INFINITY
    : Number(maxResolution);

const frameRateOf = (info: VideoInfo, cap: FrameRateCap): number | null => {
  if (cap === "original" || info.frameRate === null) {
    return null;
  }
  return info.frameRate > Number(cap) ? Number(cap) : null;
};

/** The audio bitrate of a Target plan: smaller when the budget is tight. */
const targetAudioBitrate = (totalBitrate: number): number =>
  totalBitrate < 600_000 ? LOW_AUDIO_BITRATE : AUDIO_BITRATE;

/**
 * The plan for one input. In Target mode the bitrate comes from the Target
 * and the duration. When that bitrate is too low for the frame size, the plan
 * steps down to a Fit Scale: 1080, then 720, then 480.
 */
export const planEncode = (
  info: VideoInfo,
  settings: CinchSettings
): EncodePlan => {
  const withAudio = info.hasAudio && !settings.removeAudio;
  const frameRate = frameRateOf(info, settings.frameRateCap);
  const capped = scaledFrame(
    info.width,
    info.height,
    capOf(settings.maxResolution)
  );

  if (settings.sizeMode === "preset") {
    return {
      audioBitrate: withAudio
        ? settings.preset === "strong"
          ? STRONG_AUDIO_BITRATE
          : AUDIO_BITRATE
        : null,
      fitScale: null,
      frameRate,
      height: capped.height,
      qualityLevel: PRESET_QUALITY[settings.preset],
      videoBitrate: null,
      width: capped.width,
    };
  }

  const seconds = Math.max(0.1, info.durationSeconds);
  const totalBitrate = (settings.targetBytes * 8 * TARGET_MARGIN) / seconds;
  const audioBitrate = withAudio ? targetAudioBitrate(totalBitrate) : null;
  const videoBitrate = Math.max(
    MIN_VIDEO_BITRATE,
    Math.floor(totalBitrate - (audioBitrate ?? 0))
  );
  const fps = frameRate ?? info.frameRate ?? 30;
  const floor = MIN_BITS_PER_PIXEL[settings.outputFormat];
  const fits = (frame: { readonly height: number; readonly width: number }) =>
    videoBitrate / (frame.width * frame.height * fps) >= floor;

  let frame = capped;
  let fitScale: number | null = null;
  for (const step of FIT_STEPS) {
    if (fits(frame)) {
      break;
    }
    if (Math.min(frame.width, frame.height) <= step) {
      continue;
    }
    frame = scaledFrame(info.width, info.height, step);
    fitScale = step;
  }

  return {
    audioBitrate,
    fitScale,
    frameRate,
    height: frame.height,
    qualityLevel: null,
    videoBitrate,
    width: frame.width,
  };
};

/**
 * The video bitrate of the one retry after a first output over the Target. It
 * scales the first bitrate by how far over the output landed, less 10%.
 */
export const retryBitrate = (
  plan: EncodePlan,
  outputBytes: number,
  targetBytes: number
): number => {
  const first = plan.videoBitrate ?? MIN_VIDEO_BITRATE;
  const ratio = targetBytes / Math.max(1, outputBytes);
  return Math.max(MIN_VIDEO_BITRATE, Math.floor(first * ratio * 0.9));
};

/**
 * Whether an input can be used as it is: it already meets the Target, it is in
 * the Output Format, and no setting asks for a change to its frames or audio.
 */
export const alreadyFitsInput = (
  info: VideoInfo,
  inputBytes: number,
  settings: CinchSettings
): boolean => {
  if (settings.sizeMode !== "target" || inputBytes > settings.targetBytes) {
    return false;
  }
  // The input already meets the Target, so no Fit Scale applies: only a
  // change the user asked for makes Cinch encode.
  return (
    info.container === settings.outputFormat &&
    !(settings.removeAudio && info.hasAudio) &&
    frameRateOf(info, settings.frameRateCap) === null &&
    Math.min(info.width, info.height) <= capOf(settings.maxResolution)
  );
};

/* -------------------------------------------------------------------------- */
/* Results                                                                     */
/* -------------------------------------------------------------------------- */

/** Why Cinch did not compress an input. Each one has its own message. */
export type RejectProblem =
  | "container"
  | "no-video"
  | "undecodable"
  | "unencodable"
  | "failed";

/** An encoded output. */
export interface OutputFile {
  readonly blob: Blob;
  readonly bytes: number;
  readonly fitScale: number | null;
  readonly format: OutputFormat;
  readonly height: number;
  /** Whether Cinch encoded twice to come under the Target. */
  readonly retried: boolean;
  readonly width: number;
}

export type Outcome =
  | { readonly kind: "done"; readonly file: OutputFile }
  | { readonly kind: "miss"; readonly file: OutputFile }
  | { readonly kind: "bigger"; readonly file: OutputFile }
  | { readonly kind: "already-fits" }
  | { readonly kind: "rejected"; readonly problem: RejectProblem };

export interface ItemResult {
  readonly id: string;
  readonly info: VideoInfo | null;
  readonly outcome: Outcome;
  readonly settingsKey: string;
}

export type ResultKind = Outcome["kind"];

/**
 * The result word for an output. In Target mode an output at or under the
 * Target is Compressed and one over it is a Miss. In Video Preset mode a
 * smaller output is Compressed; a larger one is Bigger when the user asked for
 * a change, and Already fits when not.
 */
export const classifyOutput = (options: {
  readonly changed: boolean;
  readonly inputBytes: number;
  readonly outputBytes: number;
  readonly settings: CinchSettings;
}): "already-fits" | "bigger" | "done" | "miss" => {
  const { changed, inputBytes, outputBytes, settings } = options;
  if (settings.sizeMode === "target") {
    return outputBytes <= settings.targetBytes ? "done" : "miss";
  }
  if (outputBytes < inputBytes) {
    return "done";
  }
  return changed ? "bigger" : "already-fits";
};

/** Whether the user asked for a change other than size. */
export const asksForChange = (
  info: VideoInfo,
  settings: CinchSettings
): boolean =>
  info.container !== settings.outputFormat ||
  (settings.removeAudio && info.hasAudio) ||
  settings.maxResolution !== "original" ||
  settings.frameRateCap !== "original";

export const isStale = (result: ItemResult, settings: CinchSettings): boolean =>
  result.settingsKey !== settingsKeyOf(settings);

/** The bytes a result hands over: the output, or the input itself. */
export const outputBytesOf = (
  item: BatchItem,
  result: ItemResult
): number | null => {
  const { outcome } = result;
  if (outcome.kind === "rejected") {
    return null;
  }
  return outcome.kind === "already-fits" ? item.size : outcome.file.bytes;
};

/** The saving of a result, in percent of the input. Negative is growth. */
export const savedPercentOf = (inputBytes: number, outputBytes: number) =>
  inputBytes <= 0
    ? 0
    : Math.round(((inputBytes - outputBytes) / inputBytes) * 100);

export interface BatchSummary {
  readonly alreadyFits: number;
  readonly bigger: number;
  readonly done: number;
  readonly inputBytes: number;
  readonly misses: number;
  readonly outputBytes: number;
  readonly rejected: number;
  readonly total: number;
}

export const summarize = (
  batch: ReadonlyMap<string, BatchItem>,
  results: ReadonlyMap<string, ItemResult>
): BatchSummary => {
  const counts = {
    "already-fits": 0,
    bigger: 0,
    done: 0,
    miss: 0,
    rejected: 0,
  } satisfies Record<ResultKind, number>;
  let inputBytes = 0;
  let outputBytes = 0;
  for (const [id, item] of batch) {
    const result = results.get(id);
    if (result === undefined) {
      continue;
    }
    counts[result.outcome.kind] += 1;
    const bytes = outputBytesOf(item, result);
    if (bytes !== null) {
      inputBytes += item.size;
      outputBytes += bytes;
    }
  }
  return {
    alreadyFits: counts["already-fits"],
    bigger: counts.bigger,
    done: counts.done,
    inputBytes,
    misses: counts.miss,
    outputBytes,
    rejected: counts.rejected,
    total: batch.size,
  };
};

/* -------------------------------------------------------------------------- */
/* Files                                                                       */
/* -------------------------------------------------------------------------- */

export const MIME_TYPE = {
  mp4: "video/mp4",
  webm: "video/webm",
} as const satisfies Record<OutputFormat, string>;

/** Above this size, the row warns that the tab can run out of memory. */
export const LARGE_INPUT_BYTES = 2_000_000_000;

const stemOf = (name: string): string => {
  const dot = name.lastIndexOf(".");
  return dot <= 0 ? name : name.slice(0, dot);
};

/** The name an output downloads under: the input's stem and the format. */
export const outputNameOf = (item: BatchItem, format: OutputFormat): string =>
  `${stemOf(item.name).slice(0, 90) || "video"}.${format}`;

/* -------------------------------------------------------------------------- */
/* Run                                                                         */
/* -------------------------------------------------------------------------- */

/**
 * How many videos encode at once: half the cores, kept between 2 and 4.
 *
 * The bound keeps a large Batch alive. Encoding every video at once can
 * exhaust the device. Two is the floor, so Compress all never leaves a
 * queued video waiting while only one encodes.
 */
export const encodeSlots = (hardwareConcurrency = 4): number =>
  Math.min(4, Math.max(2, Math.floor(hardwareConcurrency / 2)));

/** Stops `child` when `parent` aborts. The return removes the listener. */
const followAbort = (
  parent: AbortSignal,
  child: AbortController
): (() => void) => {
  const stop = () => {
    child.abort();
  };
  if (parent.aborted) {
    stop();
  } else {
    parent.addEventListener("abort", stop, { once: true });
  }
  return () => {
    parent.removeEventListener("abort", stop);
  };
};

/**
 * Runs `work` for each id, `limit` at a time.
 *
 * Each id gets its own signal. That signal aborts when `signal` aborts, and
 * when the caller uses the stop function from `onStart`. A row that returns
 * `false` does not stop the others. A throw starts no further row and rejects
 * after the rows already in flight finish.
 */
export const runSlots = async (
  ids: readonly string[],
  work: (id: string, signal: AbortSignal) => Promise<boolean>,
  options: {
    readonly limit: number;
    readonly onFinish?: (id: string) => void;
    readonly onStart?: (id: string, stop: () => void) => void;
    readonly signal: AbortSignal;
  }
): Promise<number> => {
  if (ids.length === 0 || options.limit < 1 || options.signal.aborted) {
    return 0;
  }
  const width = Math.min(options.limit, ids.length);
  let cursor = 0;
  let ran = 0;
  let failure: Error | null = null;

  const take = (): string | undefined => {
    if (options.signal.aborted || failure !== null || cursor >= ids.length) {
      return undefined;
    }
    const id = ids[cursor];
    cursor += 1;
    return id;
  };

  const worker = async (): Promise<void> => {
    for (;;) {
      const id = take();
      if (id === undefined) {
        return;
      }
      const child = new AbortController();
      const unlink = followAbort(options.signal, child);
      options.onStart?.(id, () => {
        child.abort();
      });
      try {
        // The slot stays taken until this video ends, then the worker pulls the next one.
        // oxlint-disable-next-line eslint/no-await-in-loop, react-doctor/async-await-in-loop
        if (await work(id, child.signal)) {
          ran += 1;
        }
      } catch (error) {
        failure ??=
          error instanceof Error
            ? error
            : new Error("Cinch run failed", { cause: error });
      } finally {
        unlink();
        options.onFinish?.(id);
      }
    }
  };

  await Promise.all(Array.from({ length: width }, () => worker()));
  if (failure !== null) {
    throw failure;
  }
  return ran;
};

/** The duration a person reads: `m:ss`, or `h:mm:ss` from one hour. */
export const formatDuration = (seconds: number): string => {
  const whole = Math.max(0, Math.round(seconds));
  const hours = Math.floor(whole / 3600);
  const minutes = Math.floor((whole % 3600) / 60);
  const rest = String(whole % 60).padStart(2, "0");
  return hours > 0
    ? `${hours}:${String(minutes).padStart(2, "0")}:${rest}`
    : `${minutes}:${rest}`;
};
