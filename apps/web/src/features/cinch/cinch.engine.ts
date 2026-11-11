import type * as MediabunnyModule from "mediabunny";

import { LibraryLoadError, loadLibrary } from "@/core/libs/library-load";
import {
  alreadyFitsInput,
  asksForChange,
  classifyOutput,
  MIME_TYPE,
  planEncode,
  retryBitrate,
  settingsKeyOf,
} from "@/features/cinch/cinch";
import type {
  CinchSettings,
  EncodePlan,
  ItemResult,
  OutputFile,
  OutputFormat,
  RejectProblem,
  VideoInfo,
} from "@/features/cinch/cinch";

/**
 * The browser half of Cinch (ADR-0040). Mediabunny reads and writes the
 * container; the browser's WebCodecs decode and encode, on the hardware
 * encoder when the device has one. Mediabunny loads on first use (ADR-0036).
 */

type Mediabunny = typeof MediabunnyModule;

const loadMediabunny = (): Promise<Mediabunny> =>
  loadLibrary("Mediabunny", () => import("mediabunny"));

/* -------------------------------------------------------------------------- */
/* Encoder support                                                             */
/* -------------------------------------------------------------------------- */

/** The WebCodecs strings each Output Format needs. */
const ENCODER_CONFIG = {
  mp4: { audio: "mp4a.40.2", video: "avc1.42001f" },
  webm: { audio: "opus", video: "vp09.00.10.08" },
} as const satisfies Record<
  OutputFormat,
  { readonly audio: string; readonly video: string }
>;

/** Whether this browser has WebCodecs encoders at all. */
export const hasWebCodecs = (): boolean =>
  typeof VideoEncoder !== "undefined" && typeof AudioEncoder !== "undefined";

const supports = async (check: () => Promise<{ supported?: boolean }>) => {
  try {
    const answer = await check();
    return answer.supported === true;
  } catch {
    return false;
  }
};

/**
 * Whether this browser can write an Output Format. It asks WebCodecs directly,
 * so the check does not load Mediabunny before first use.
 */
export const canWrite = async (format: OutputFormat): Promise<boolean> => {
  if (!hasWebCodecs()) {
    return false;
  }
  const config = ENCODER_CONFIG[format];
  const [video, audio] = await Promise.all([
    supports(() =>
      VideoEncoder.isConfigSupported({
        bitrate: 2_000_000,
        codec: config.video,
        framerate: 30,
        height: 720,
        width: 1280,
      })
    ),
    supports(() =>
      AudioEncoder.isConfigSupported({
        bitrate: 128_000,
        codec: config.audio,
        numberOfChannels: 2,
        sampleRate: 48_000,
      })
    ),
  ]);
  return video && audio;
};

/* -------------------------------------------------------------------------- */
/* Errors                                                                      */
/* -------------------------------------------------------------------------- */

/**
 * Why one video did not compress: a Reject Problem, which the row names, or
 * `cancelled` when the user stopped the run and the row stays queued.
 */
export class CinchError extends Error {
  readonly reason: RejectProblem | "cancelled";
  constructor(reason: RejectProblem | "cancelled") {
    super(`Cinch stopped: ${reason}`);
    this.name = "CinchError";
    this.reason = reason;
  }
}

/* -------------------------------------------------------------------------- */
/* Probe                                                                       */
/* -------------------------------------------------------------------------- */

type Input = InstanceType<Mediabunny["Input"]>;

const openInput = (mb: Mediabunny, file: File): Input =>
  new mb.Input({ formats: mb.ALL_FORMATS, source: new mb.BlobSource(file) });

const containerOf = async (
  mb: Mediabunny,
  input: Input
): Promise<OutputFormat> => {
  const format = await input.getFormat();
  return format instanceof mb.MatroskaInputFormat ? "webm" : "mp4";
};

/** What Cinch reads from an input before it encodes. */
const probe = async (mb: Mediabunny, input: Input): Promise<VideoInfo> => {
  if (!(await input.canRead())) {
    throw new CinchError("container");
  }
  const isVideoContainer =
    (await input.getFormat()) instanceof mb.IsobmffInputFormat ||
    (await input.getFormat()) instanceof mb.MatroskaInputFormat;
  if (!isVideoContainer) {
    throw new CinchError("container");
  }
  const video = await input.getPrimaryVideoTrack();
  if (video === null) {
    throw new CinchError("no-video");
  }
  if (!(await video.canDecode())) {
    throw new CinchError("undecodable");
  }
  const audio = await input.getPrimaryAudioTrack();
  const hasAudio = audio !== null && (await audio.canDecode());
  const [durationSeconds, stats] = await Promise.all([
    input.computeDuration(),
    video.computePacketStats(100),
  ]);
  return {
    container: await containerOf(mb, input),
    durationSeconds,
    frameRate:
      Number.isFinite(stats.averagePacketRate) && stats.averagePacketRate > 0
        ? stats.averagePacketRate
        : null,
    hasAudio,
    height: video.displayHeight,
    width: video.displayWidth,
  };
};

/* -------------------------------------------------------------------------- */
/* Encode                                                                      */
/* -------------------------------------------------------------------------- */

const CODECS = {
  mp4: { audio: "aac", video: "avc" },
  webm: { audio: "opus", video: "vp9" },
} as const satisfies Record<
  OutputFormat,
  { readonly audio: string; readonly video: string }
>;

interface EncodeRequest {
  readonly file: File;
  readonly format: OutputFormat;
  readonly onProgress: (fraction: number) => void;
  readonly plan: EncodePlan;
  readonly signal: AbortSignal;
}

const videoQualityOf = (mb: Mediabunny, plan: EncodePlan) =>
  plan.qualityLevel === null
    ? new mb.Quality({
        bitrate: plan.videoBitrate ?? undefined,
        bitrateMode: "constant",
      })
    : new mb.Quality(plan.qualityLevel);

/** One encode of one input under one plan. */
const encodeOnce = async (
  mb: Mediabunny,
  request: EncodeRequest
): Promise<Blob> => {
  const { file, format, onProgress, plan, signal } = request;
  const input = openInput(mb, file);
  const output = new mb.Output({
    format:
      format === "mp4"
        ? new mb.Mp4OutputFormat({ fastStart: "in-memory" })
        : new mb.WebMOutputFormat(),
    target: new mb.BufferTarget(),
  });
  try {
    const conversion = await mb.Conversion.init({
      audio:
        plan.audioBitrate === null
          ? { discard: true }
          : {
              codec: CODECS[format].audio,
              forceTranscode: true,
              quality: new mb.Quality({ bitrate: plan.audioBitrate }),
            },
      input,
      output,
      showWarnings: false,
      video: {
        codec: CODECS[format].video,
        fit: "contain",
        forceTranscode: true,
        frameRate: plan.frameRate ?? undefined,
        height: plan.height,
        quality: videoQualityOf(mb, plan),
        width: plan.width,
      },
    });
    // A discarded video track, or an audio track the user wanted, means the
    // output would not be the video the user gave.
    const lost = conversion.discardedTracks.some(
      (track) => track.reason !== "discarded_by_user"
    );
    if (!conversion.isValid || lost) {
      throw new CinchError("unencodable");
    }
    conversion.onProgress = (progress) => {
      onProgress(Math.min(1, Math.max(0, progress)));
    };
    if (signal.aborted) {
      throw new CinchError("cancelled");
    }
    const cancel = () => {
      void conversion.cancel();
    };
    signal.addEventListener("abort", cancel, { once: true });
    try {
      await conversion.execute();
    } catch (error) {
      if (signal.aborted || error instanceof mb.ConversionCanceledError) {
        throw new CinchError("cancelled");
      }
      throw error;
    } finally {
      signal.removeEventListener("abort", cancel);
    }
    const { buffer } = output.target;
    if (buffer === null) {
      throw new CinchError("failed");
    }
    return new Blob([buffer], { type: MIME_TYPE[format] });
  } finally {
    input.dispose();
  }
};

const outputFileOf = (
  blob: Blob,
  plan: EncodePlan,
  format: OutputFormat,
  retried: boolean
): OutputFile => ({
  blob,
  bytes: blob.size,
  fitScale: plan.fitScale,
  format,
  height: plan.height,
  retried,
  width: plan.width,
});

interface CompressRequest {
  readonly file: File;
  readonly id: string;
  readonly onProgress: (fraction: number) => void;
  readonly settings: CinchSettings;
  readonly signal: AbortSignal;
}

const rejectedResult = (
  request: CompressRequest,
  problem: RejectProblem,
  info: VideoInfo | null
): ItemResult => ({
  id: request.id,
  info,
  outcome: { kind: "rejected", problem },
  settingsKey: settingsKeyOf(request.settings),
});

/** Reads, plans, encodes, and when a Target is missed, encodes once more. */
const compressWith = async (
  mb: Mediabunny,
  request: CompressRequest,
  info: VideoInfo
): Promise<ItemResult> => {
  const { file, id, onProgress, settings, signal } = request;
  const settingsKey = settingsKeyOf(settings);
  if (alreadyFitsInput(info, file.size, settings)) {
    return { id, info, outcome: { kind: "already-fits" }, settingsKey };
  }
  const plan = planEncode(info, settings);
  const format = settings.outputFormat;
  const retries = settings.sizeMode === "target";
  // With a retry ahead, the first pass fills the first half of the bar.
  const share = (from: number, span: number) => (fraction: number) => {
    onProgress(from + fraction * span);
  };
  let blob = await encodeOnce(mb, {
    file,
    format,
    onProgress: share(0, retries ? 0.5 : 1),
    plan,
    signal,
  });
  let used = plan;
  let retried = false;
  if (retries && blob.size > settings.targetBytes) {
    used = {
      ...plan,
      videoBitrate: retryBitrate(plan, blob.size, settings.targetBytes),
    };
    blob = await encodeOnce(mb, {
      file,
      format,
      onProgress: share(0.5, 0.5),
      plan: used,
      signal,
    });
    retried = true;
  }
  onProgress(1);
  const kind = classifyOutput({
    changed: asksForChange(info, settings),
    inputBytes: file.size,
    outputBytes: blob.size,
    settings,
  });
  if (kind === "already-fits") {
    return { id, info, outcome: { kind }, settingsKey };
  }
  return {
    id,
    info,
    outcome: { file: outputFileOf(blob, used, format, retried), kind },
    settingsKey,
  };
};

/**
 * Compresses one video. A refused input becomes a Rejected result with its
 * reason. A stopped run throws a `cancelled` CinchError, and a library that does not
 * load throws `LibraryLoadError`, so the run can stop without a row result.
 */
export const compressVideo = async (
  request: CompressRequest
): Promise<ItemResult> => {
  const mb = await loadMediabunny();
  let info: VideoInfo | null = null;
  try {
    const input = openInput(mb, request.file);
    try {
      info = await probe(mb, input);
    } finally {
      input.dispose();
    }
    return await compressWith(mb, request, info);
  } catch (error) {
    if (
      error instanceof LibraryLoadError ||
      (error instanceof CinchError && error.reason === "cancelled")
    ) {
      throw error;
    }
    if (error instanceof CinchError && error.reason !== "cancelled") {
      return rejectedResult(request, error.reason, info);
    }
    if (error instanceof mb.UnsupportedInputFormatError) {
      return rejectedResult(request, "container", info);
    }
    return rejectedResult(
      request,
      info === null ? "container" : "failed",
      info
    );
  }
};
