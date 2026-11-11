/* oxlint-disable eslint/no-await-in-loop, react-doctor/async-await-in-loop -- Ranges and packets are written in order, and each one waits for backpressure. */
import { download } from "@/core/libs/files";
import { loadLibrary } from "@/core/libs/library-load";
import { mimeOf, rangesOf, relayUrlOf } from "@/features/snag/snag";
import type { SaveOption, SnagStream } from "@/features/snag/snag";

/**
 * The browser half of Snag: fetch the streams of one Save Option through the
 * Video Relay, then write the file on this device.
 *
 * Video and audio are copied into one MP4 without re-encoding. Only MP3 is
 * re-encoded. Mediabunny and the MP3 encoder load on first use (ADR-0036).
 */

/** The steps one save goes through. Bytes count both streams together. */
export type SaveProgress =
  | {
      readonly phase: "fetching";
      readonly received: number;
      readonly total: number;
    }
  | { readonly phase: "muxing" }
  | { readonly phase: "encoding"; readonly fraction: number };

/** Why a save stopped. Each one has its own message. */
export type SaveFailure =
  | "cancelled"
  | "expired"
  | "host-refused"
  | "network"
  | "unreadable"
  | "write-failed";

export class SaveError extends Error {
  readonly reason: SaveFailure;
  constructor(reason: SaveFailure, options?: { readonly cause?: Error }) {
    super(`Snag save failed: ${reason}`, options);
    this.name = "SaveError";
    this.reason = reason;
  }
}

/** Where the file goes: a file the user picked, or memory and a download. */
export type SaveSink =
  | {
      readonly kind: "file";
      readonly handle: FileSystemFileHandle;
      readonly writable: FileSystemWritableFileStream;
    }
  | { readonly kind: "memory" };

/** Ranges fetched at the same time for one stream. */
const PARALLEL_RANGES = 4;

// oxlint-disable-next-line anti-slop/no-unknown-parameters -- A caught value is untyped; this only names the abort shape.
const isAbort = (error: unknown): boolean =>
  error instanceof DOMException && error.name === "AbortError";

// oxlint-disable-next-line anti-slop/no-unknown-parameters -- A caught value is untyped; this keeps it as a cause only when it is an Error.
const causeOf = (error: unknown) =>
  error instanceof Error ? { cause: error } : undefined;

/** A best-effort clean-up step. The save has already failed or stopped. */
const settle = async (task: Promise<void> | undefined): Promise<void> => {
  try {
    await task;
  } catch {
    // Nothing more to clean: the file or the output is already gone.
  }
};

type SavePicker = (options: {
  readonly suggestedName: string;
  readonly types?: readonly {
    readonly accept: Readonly<Record<string, readonly string[]>>;
  }[];
}) => Promise<FileSystemFileHandle>;

/** The Chromium save dialog, which the DOM lib does not declare. */
interface SavePickerEnv {
  readonly showSaveFilePicker?: SavePicker;
}

const pickerOf = (): SavePicker | null => {
  // SAFETY: `showSaveFilePicker` is Chromium-only and absent elsewhere; the
  // field is optional, so reading it is all this code assumes.
  const browser = globalThis as SavePickerEnv;
  return browser.showSaveFilePicker ?? null;
};

/** Whether this browser can stream a save straight to a file on disk. */
export const canSaveToDisk = (): boolean => pickerOf() !== null;

/**
 * Asks where to save, while the click still counts as a user action. Browsers
 * without a save dialog, and a dialog that fails, use memory. `null` means the
 * user closed the dialog.
 */
export const openSink = async (
  option: SaveOption,
  name: string
): Promise<SaveSink | null> => {
  const picker = pickerOf();
  if (option.kind === "thumbnail" || picker === null) {
    return { kind: "memory" };
  }
  const extension = name.slice(name.lastIndexOf("."));
  try {
    const handle = await picker.call(globalThis, {
      suggestedName: name,
      types: [{ accept: { [mimeOf(option)]: [extension] } }],
    });
    return { handle, kind: "file", writable: await handle.createWritable() };
  } catch (error) {
    return isAbort(error) ? null : { kind: "memory" };
  }
};

/** Fetches a fresh address for a stream whose address expired. */
export type Refresh = (stream: SnagStream) => Promise<SnagStream>;

interface FetchOptions {
  readonly signal: AbortSignal;
  readonly onBytes: (bytes: number) => void;
  readonly refresh: Refresh;
}

const failureOf = (response: Response): SaveFailure => {
  const upstream = response.headers.get("x-snag-upstream");
  if (upstream === "403" || upstream === "410") {
    return "expired";
  }
  return response.status === 403 || upstream === "429"
    ? "host-refused"
    : "network";
};

const relayFetch = async (
  url: string,
  signal: AbortSignal
): Promise<Response> => {
  try {
    return await fetch(url, { signal });
  } catch (error) {
    throw isAbort(error) || signal.aborted
      ? new SaveError("cancelled")
      : new SaveError("network", causeOf(error));
  }
};

const bodyOf = async (
  response: Response,
  signal: AbortSignal
): Promise<Blob> => {
  try {
    return await response.blob();
  } catch (error) {
    throw signal.aborted
      ? new SaveError("cancelled")
      : new SaveError("network", causeOf(error));
  }
};

/**
 * Fetches one whole stream in ranges, a few at a time. An expired address is
 * refreshed once for the whole stream, then the failed ranges retry.
 */
export const fetchStream = async (
  stream: SnagStream,
  { onBytes, refresh, signal }: FetchOptions
): Promise<Blob> => {
  const ranges = rangesOf(stream.bytes);
  const parts: Blob[] = Array.from({ length: ranges.length });
  let current = stream;
  let refreshing: Promise<void> | null = null;
  let next = 0;

  const renew = async () => {
    current = await refresh(current);
  };

  const fetchRange = async (index: number, retried: boolean) => {
    const range = ranges[index];
    /* v8 ignore next 3 -- @preserve The workers take only indexes inside the list. */
    if (range === undefined) {
      return;
    }
    const response = await relayFetch(relayUrlOf(current.url, range), signal);
    if (!response.ok) {
      const failure = failureOf(response);
      if (failure !== "expired" || retried) {
        throw new SaveError(failure);
      }
      refreshing ??= renew();
      try {
        await refreshing;
      } catch (error) {
        throw new SaveError("expired", causeOf(error));
      }
      await fetchRange(index, true);
      return;
    }
    const part = await bodyOf(response, signal);
    if (part.size !== range.end - range.start + 1) {
      throw new SaveError("network");
    }
    parts[index] = part;
    onBytes(part.size);
  };

  const worker = async () => {
    while (next < ranges.length) {
      if (signal.aborted) {
        throw new SaveError("cancelled");
      }
      const index = next;
      next += 1;
      await fetchRange(index, false);
    }
  };

  await Promise.all(
    Array.from({ length: Math.min(PARALLEL_RANGES, ranges.length) }, worker)
  );
  return new Blob(parts);
};

const loadMediabunny = (signal: AbortSignal) =>
  loadLibrary("Mediabunny", () => import("mediabunny"), signal);

type Mediabunny = Awaited<ReturnType<typeof loadMediabunny>>;
type Target =
  | InstanceType<Mediabunny["StreamTarget"]>
  | InstanceType<Mediabunny["BufferTarget"]>;
type AudioTrack = InstanceType<Mediabunny["InputAudioTrack"]>;
type VideoTrack = InstanceType<Mediabunny["InputVideoTrack"]>;

const targetOf = (mediabunny: Mediabunny, sink: SaveSink): Target =>
  sink.kind === "file"
    ? new mediabunny.StreamTarget(sink.writable, { chunked: true })
    : new mediabunny.BufferTarget();

const bufferOf = (mediabunny: Mediabunny, target: Target) =>
  target instanceof mediabunny.BufferTarget ? target.buffer : null;

const inputOf = (mediabunny: Mediabunny, blob: Blob) =>
  new mediabunny.Input({
    formats: mediabunny.ALL_FORMATS,
    source: new mediabunny.BlobSource(blob),
  });

interface Tracks {
  readonly audio: AudioTrack;
  readonly video: VideoTrack | null;
}

/** The tracks to copy. A stream without its track is unreadable. */
const tracksOf = async (
  mediabunny: Mediabunny,
  inputs: { readonly video?: Blob; readonly audio: Blob }
): Promise<Tracks> => {
  const audio = await inputOf(mediabunny, inputs.audio).getPrimaryAudioTrack();
  const video =
    inputs.video === undefined
      ? null
      : await inputOf(mediabunny, inputs.video).getPrimaryVideoTrack();
  if (
    audio === null ||
    audio.codec === null ||
    (inputs.video !== undefined && (video === null || video.codec === null))
  ) {
    throw new SaveError("unreadable");
  }
  return { audio, video };
};

type Packets = AsyncGenerator<
  InstanceType<Mediabunny["EncodedPacket"]>,
  void,
  unknown
>;

/** One track's packets, its source on the output, and its decoder config. */
interface Lane {
  readonly packets: Packets;
  readonly add: (
    packet: InstanceType<Mediabunny["EncodedPacket"]>,
    first: boolean
  ) => Promise<void>;
}

const audioLane = (
  mediabunny: Mediabunny,
  output: InstanceType<Mediabunny["Output"]>,
  track: AudioTrack
): (() => Promise<Lane>) => {
  /* v8 ignore next -- @preserve `tracksOf` checked the codec. */
  const source = new mediabunny.EncodedAudioPacketSource(track.codec ?? "aac");
  output.addAudioTrack(source);
  return async () => {
    const config = await track.getDecoderConfig();
    return {
      add: (packet, first) =>
        source.add(
          packet,
          first && config !== null ? { decoderConfig: config } : {}
        ),
      packets: new mediabunny.EncodedPacketSink(track).packets(),
    };
  };
};

const videoLane = (
  mediabunny: Mediabunny,
  output: InstanceType<Mediabunny["Output"]>,
  track: VideoTrack
): (() => Promise<Lane>) => {
  /* v8 ignore next -- @preserve `tracksOf` checked the codec. */
  const source = new mediabunny.EncodedVideoPacketSource(track.codec ?? "avc");
  output.addVideoTrack(source);
  return async () => {
    const config = await track.getDecoderConfig();
    return {
      add: (packet, first) =>
        source.add(
          packet,
          first && config !== null ? { decoderConfig: config } : {}
        ),
      packets: new mediabunny.EncodedPacketSink(track).packets(),
    };
  };
};

/** Copies the packets of the lanes into the output, in timestamp order. */
const interleave = async (
  lanes: readonly Lane[],
  signal: AbortSignal
): Promise<void> => {
  const heads = await Promise.all(lanes.map((lane) => lane.packets.next()));
  const started = lanes.map(() => false);
  for (;;) {
    if (signal.aborted) {
      throw new SaveError("cancelled");
    }
    let pick = -1;
    for (const [index, head] of heads.entries()) {
      const best = heads[pick];
      if (
        !head.done &&
        (best === undefined ||
          best.done === true ||
          head.value.timestamp < best.value.timestamp)
      ) {
        pick = index;
      }
    }
    const lane = lanes[pick];
    const head = heads[pick];
    if (lane === undefined || head === undefined || head.done === true) {
      return;
    }
    await lane.add(head.value, !started[pick]);
    started[pick] = true;
    heads[pick] = await lane.packets.next();
  }
};

/** Copies one or two streams into one MP4 without decoding them. */
const mux = async (
  mediabunny: Mediabunny,
  inputs: { readonly video?: Blob; readonly audio: Blob },
  sink: SaveSink,
  signal: AbortSignal
): Promise<ArrayBuffer | null> => {
  const tracks = await tracksOf(mediabunny, inputs);
  const target = targetOf(mediabunny, sink);
  const output = new mediabunny.Output({
    format: new mediabunny.Mp4OutputFormat({
      fastStart: sink.kind === "file" ? false : "in-memory",
    }),
    target,
  });
  const openers = [
    ...(tracks.video === null
      ? []
      : [videoLane(mediabunny, output, tracks.video)]),
    audioLane(mediabunny, output, tracks.audio),
  ];
  const abort = () => {
    void settle(output.cancel());
  };
  signal.addEventListener("abort", abort, { once: true });
  try {
    await output.start();
    const lanes = await Promise.all(openers.map((open) => open()));
    await interleave(lanes, signal);
    await output.finalize();
  } catch (error) {
    if (output.state !== "canceled") {
      await settle(output.cancel());
    }
    throw error instanceof SaveError
      ? error
      : new SaveError(
          signal.aborted ? "cancelled" : "write-failed",
          causeOf(error)
        );
  } finally {
    signal.removeEventListener("abort", abort);
  }
  return bufferOf(mediabunny, target);
};

/** Re-encodes the audio to MP3 at the chosen bitrate. */
const encodeMp3 = async (
  mediabunny: Mediabunny,
  request: {
    readonly audio: Blob;
    readonly kbps: number;
    readonly sink: SaveSink;
    readonly signal: AbortSignal;
    readonly onProgress: (progress: SaveProgress) => void;
  }
): Promise<ArrayBuffer | null> => {
  const { audio, kbps, onProgress, signal, sink } = request;
  if (!(await mediabunny.canEncodeAudio("mp3"))) {
    const { registerMp3Encoder } = await loadLibrary(
      "MP3 encoder",
      () => import("@mediabunny/mp3-encoder"),
      signal
    );
    registerMp3Encoder();
  }
  const target = targetOf(mediabunny, sink);
  const conversion = await mediabunny.Conversion.init({
    audio: { bitrate: kbps * 1000, codec: "mp3" },
    input: inputOf(mediabunny, audio),
    output: new mediabunny.Output({
      format: new mediabunny.Mp3OutputFormat(),
      target,
    }),
    video: { discard: true },
  });
  if (!conversion.isValid) {
    throw new SaveError("unreadable");
  }
  conversion.onProgress = (fraction) => {
    onProgress({ fraction, phase: "encoding" });
  };
  const abort = () => {
    void settle(conversion.cancel());
  };
  signal.addEventListener("abort", abort, { once: true });
  try {
    await conversion.execute();
  } catch (error) {
    throw new SaveError(
      signal.aborted ? "cancelled" : "write-failed",
      causeOf(error)
    );
  } finally {
    signal.removeEventListener("abort", abort);
  }
  return bufferOf(mediabunny, target);
};

export interface SaveRequest {
  readonly option: SaveOption;
  readonly name: string;
  readonly sink: SaveSink;
  readonly signal: AbortSignal;
  readonly refresh: Refresh;
  readonly onProgress: (progress: SaveProgress) => void;
}

const fetchThumbnail = async (
  url: string,
  signal: AbortSignal
): Promise<Blob> => {
  const response = await relayFetch(relayUrlOf(url), signal);
  if (!response.ok) {
    throw new SaveError(failureOf(response));
  }
  return bodyOf(response, signal);
};

/** Removes the partial file a failed or cancelled save left behind. */
const discard = async (sink: SaveSink): Promise<void> => {
  if (sink.kind !== "file") {
    return;
  }
  await settle(sink.writable.abort());
  // SAFETY: `remove` is a Chromium extension of FileSystemHandle. The optional
  // call skips it where it does not exist.
  const handle = sink.handle as FileSystemFileHandle & {
    readonly remove?: () => Promise<void>;
  };
  await settle(handle.remove?.());
};

/** Fetches the streams of one audio or video Save Option, then writes it. */
const saveMedia = async (
  option: Exclude<SaveOption, { kind: "thumbnail" }>,
  { onProgress, signal, refresh, sink }: SaveRequest
): Promise<ArrayBuffer | null> => {
  const total =
    option.kind === "video"
      ? option.video.bytes + option.audio.bytes
      : option.audio.bytes;
  let received = 0;
  const onBytes = (bytes: number) => {
    received += bytes;
    onProgress({ phase: "fetching", received, total });
  };
  onProgress({ phase: "fetching", received, total });
  const [mediabunny, audio, video] = await Promise.all([
    loadMediabunny(signal),
    fetchStream(option.audio, { onBytes, refresh, signal }),
    option.kind === "video"
      ? fetchStream(option.video, { onBytes, refresh, signal })
      : Promise.resolve(null),
  ]);
  if (option.kind === "mp3") {
    return encodeMp3(mediabunny, {
      audio,
      kbps: option.kbps,
      onProgress,
      signal,
      sink,
    });
  }
  onProgress({ phase: "muxing" });
  return mux(
    mediabunny,
    video === null ? { audio } : { audio, video },
    sink,
    signal
  );
};

/** Saves one Save Option. Resolves when the file is written. */
export const saveOption = async (request: SaveRequest): Promise<void> => {
  const { name, option, signal, sink } = request;
  try {
    if (option.kind === "thumbnail") {
      download(await fetchThumbnail(option.url, signal), name);
      return;
    }
    const buffer = await saveMedia(option, request);
    if (buffer !== null) {
      download(new Blob([buffer], { type: mimeOf(option) }), name);
    }
  } catch (error) {
    await discard(sink);
    if (error instanceof SaveError) {
      throw error;
    }
    if (signal.aborted || isAbort(error)) {
      throw new SaveError("cancelled", causeOf(error));
    }
    throw error;
  }
};
