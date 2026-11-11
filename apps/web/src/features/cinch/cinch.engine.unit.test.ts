/* eslint-disable max-classes-per-file, eslint/class-methods-use-this, eslint/require-await, eslint/no-useless-constructor, typescript/no-extraneous-class, unicorn/custom-error-definition -- The Mediabunny doubles are classes, because the engine uses instanceof on them. Each one mirrors a class the library exports. */
/* oxlint-disable anti-slop/require-safety-comment-for-type-assertion, anti-slop/no-known-value-widening, anti-slop/no-unsafe-dictionary-type, anti-slop/no-unknown-parameters -- The fakes take the library's loose option bags and cast the test state to the library's types. A test double cannot type those exactly. */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { DEFAULT_SETTINGS } from "@/features/cinch/cinch";
import type { CinchSettings } from "@/features/cinch/cinch";
import {
  canWrite,
  CinchError,
  compressVideo,
  hasWebCodecs,
} from "@/features/cinch/cinch.engine";

/* -------------------------------------------------------------------------- */
/* Fake Mediabunny: each test sets what the container and the encoder report.  */
/* -------------------------------------------------------------------------- */

const fake = vi.hoisted(() => ({
  audio: null as { canDecode: () => Promise<boolean> } | null,
  buffer: new ArrayBuffer(100) as ArrayBuffer | null,
  canRead: true,
  container: "mp4" as "mp4" | "webm" | "other",
  conversionValid: true,
  discarded: [] as { reason: string }[],
  duration: 10,
  executeError: null as unknown,
  lastOptions: null as null | Record<string, unknown>,
  onExecute: null as null | (() => void),
  progressSteps: [] as number[],
  video: null as null | {
    canDecode: () => Promise<boolean>;
    computePacketStats: () => Promise<{ averagePacketRate: number }>;
    displayHeight: number;
    displayWidth: number;
  },
}));

vi.mock("mediabunny", () => {
  class Quality {
    readonly options: unknown;
    constructor(options: unknown) {
      this.options = options;
    }
  }
  class BufferTarget {
    buffer: ArrayBuffer | null = null;
  }
  class Mp4OutputFormat {}
  class WebMOutputFormat {}
  class IsobmffInputFormat {}
  class MatroskaInputFormat {}
  class ConversionCanceledError extends Error {}
  class UnsupportedInputFormatError extends Error {}
  class BlobSource {
    readonly blob: Blob;
    constructor(blob: Blob) {
      this.blob = blob;
    }
  }
  class Input {
    constructor(_options: unknown) {}
    canRead() {
      return Promise.resolve(fake.canRead);
    }
    getFormat() {
      if (fake.container === "mp4") {
        return Promise.resolve(new IsobmffInputFormat());
      }
      if (fake.container === "webm") {
        return Promise.resolve(new MatroskaInputFormat());
      }
      return Promise.resolve({});
    }
    getPrimaryVideoTrack() {
      return Promise.resolve(fake.video);
    }
    getPrimaryAudioTrack() {
      return Promise.resolve(fake.audio);
    }
    computeDuration() {
      return Promise.resolve(fake.duration);
    }
    dispose() {}
  }
  class Output {
    readonly format: unknown;
    readonly target: BufferTarget;
    constructor(options: { format: unknown; target: BufferTarget }) {
      this.format = options.format;
      this.target = options.target;
    }
  }
  class Conversion {
    onProgress: ((progress: number) => void) | undefined;
    readonly isValid = fake.conversionValid;
    readonly discardedTracks = fake.discarded;
    readonly output: Output;
    constructor(output: Output) {
      this.output = output;
    }
    static init(options: Record<string, unknown>) {
      fake.lastOptions = options;
      return Promise.resolve(new Conversion(options.output as Output));
    }
    cancel() {
      return Promise.resolve();
    }
    async execute() {
      for (const step of fake.progressSteps) {
        this.onProgress?.(step);
      }
      fake.onExecute?.();
      if (fake.executeError !== null) {
        throw fake.executeError;
      }
      this.output.target.buffer = fake.buffer;
    }
  }
  return {
    ALL_FORMATS: [],
    BlobSource,
    BufferTarget,
    ConversionCanceledError,
    Conversion,
    Input,
    IsobmffInputFormat,
    MatroskaInputFormat,
    Mp4OutputFormat,
    Output,
    Quality,
    UnsupportedInputFormatError,
    WebMOutputFormat,
  };
});

/* -------------------------------------------------------------------------- */
/* Helpers                                                                     */
/* -------------------------------------------------------------------------- */

type VideoTrack = NonNullable<typeof fake.video>;

const videoTrack = (overrides: Partial<VideoTrack> = {}): VideoTrack => ({
  canDecode: () => Promise.resolve(true),
  computePacketStats: () => Promise.resolve({ averagePacketRate: 30 }),
  displayHeight: 720,
  displayWidth: 1280,
  ...overrides,
});

/** A File whose size is `bytes`. Its bytes are never read. */
const fileOf = (bytes: number) =>
  new File([new Uint8Array(bytes)], "clip.mp4", { type: "video/mp4" });

/**
 * Settings that always need an encode: a 480 cap on a 720 input. The output
 * is then judged against the input, not against a Target.
 */
const CHANGE: CinchSettings = {
  ...DEFAULT_SETTINGS,
  maxResolution: "480",
  preset: "strong",
  sizeMode: "preset",
};

const request = (
  file: File,
  settings: CinchSettings = CHANGE,
  signal = new AbortController().signal,
  onProgress = vi.fn()
) => ({ file, id: "a", onProgress, settings, signal });

beforeEach(() => {
  fake.audio = null;
  fake.buffer = new ArrayBuffer(100);
  fake.canRead = true;
  fake.container = "mp4";
  fake.conversionValid = true;
  fake.discarded = [];
  fake.duration = 10;
  fake.executeError = null;
  fake.lastOptions = null;
  fake.onExecute = null;
  fake.progressSteps = [];
  fake.video = videoTrack();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

/* -------------------------------------------------------------------------- */
/* Encoder support                                                             */
/* -------------------------------------------------------------------------- */

const stubEncoders = (supported: { audio: boolean; video: boolean }) => {
  vi.stubGlobal("VideoEncoder", {
    isConfigSupported: () => Promise.resolve({ supported: supported.video }),
  });
  vi.stubGlobal("AudioEncoder", {
    isConfigSupported: () => Promise.resolve({ supported: supported.audio }),
  });
};

describe("hasWebCodecs", () => {
  it("is false when the browser has no encoders", () => {
    expect(hasWebCodecs()).toBe(false);
  });

  it("is true when both encoders exist", () => {
    stubEncoders({ audio: true, video: true });
    expect(hasWebCodecs()).toBe(true);
  });
});

describe("canWrite", () => {
  it("is false without WebCodecs", async () => {
    expect(await canWrite("mp4")).toBe(false);
  });

  it("is true when the browser encodes both tracks", async () => {
    stubEncoders({ audio: true, video: true });
    expect(await canWrite("webm")).toBe(true);
  });

  it("is false when only the audio encoder is missing", async () => {
    stubEncoders({ audio: false, video: true });
    expect(await canWrite("mp4")).toBe(false);
  });

  it("is false when a support check throws", async () => {
    vi.stubGlobal("VideoEncoder", {
      isConfigSupported: () => Promise.reject(new Error("no")),
    });
    vi.stubGlobal("AudioEncoder", {
      isConfigSupported: () => Promise.resolve({ supported: true }),
    });
    expect(await canWrite("mp4")).toBe(false);
  });
});

/* -------------------------------------------------------------------------- */
/* Probe and refusals                                                          */
/* -------------------------------------------------------------------------- */

describe("compressVideo refusals", () => {
  it("rejects a file the container reader cannot read", async () => {
    fake.canRead = false;
    const result = await compressVideo(request(fileOf(5_000_000)));
    expect(result.outcome).toEqual({ kind: "rejected", problem: "container" });
  });

  it("rejects a readable file that is not an MP4 or Matroska container", async () => {
    fake.container = "other";
    const result = await compressVideo(request(fileOf(5_000_000)));
    expect(result.outcome).toEqual({ kind: "rejected", problem: "container" });
  });

  it("rejects an input with no video track", async () => {
    fake.video = null;
    const result = await compressVideo(request(fileOf(5_000_000)));
    expect(result.outcome).toEqual({ kind: "rejected", problem: "no-video" });
  });

  it("rejects a video track this browser cannot decode", async () => {
    fake.video = videoTrack({ canDecode: () => Promise.resolve(false) });
    const result = await compressVideo(request(fileOf(5_000_000)));
    expect(result.outcome).toEqual({
      kind: "rejected",
      problem: "undecodable",
    });
  });

  it("keeps no probe on a container refusal", async () => {
    fake.canRead = false;
    const result = await compressVideo(request(fileOf(5_000_000)));
    expect(result.info).toBeNull();
  });

  it("keeps the probe on a refusal after the probe", async () => {
    fake.executeError = new Error("boom");
    const result = await compressVideo(request(fileOf(5_000_000)));
    expect(result.info).not.toBeNull();
  });
});

/* -------------------------------------------------------------------------- */
/* Encode paths                                                                */
/* -------------------------------------------------------------------------- */

describe("compressVideo results", () => {
  it("returns already-fits when the input is already under the Target", async () => {
    const result = await compressVideo(request(fileOf(1000), DEFAULT_SETTINGS));
    expect(result.outcome).toEqual({ kind: "already-fits" });
    expect(fake.lastOptions).toBeNull();
  });

  it("encodes a file that must change and reports the output as done", async () => {
    const onProgress = vi.fn();
    fake.buffer = new ArrayBuffer(1000);
    const result = await compressVideo(
      request(fileOf(5_000_000), CHANGE, undefined, onProgress)
    );
    expect(result.outcome).toMatchObject({
      file: { bytes: 1000, format: "mp4", retried: false },
      kind: "done",
    });
    expect(onProgress).toHaveBeenLastCalledWith(1);
  });

  it("encodes a second time when the first output misses the Target", async () => {
    fake.buffer = new ArrayBuffer(4000);
    const result = await compressVideo({
      ...request(fileOf(5_000_000)),
      settings: { ...DEFAULT_SETTINGS, targetBytes: 2000 },
    });
    expect(result.outcome).toMatchObject({
      file: { retried: true },
      kind: "miss",
    });
  });

  it("names the output as bigger when it grows past the input", async () => {
    fake.buffer = new ArrayBuffer(9000);
    const result = await compressVideo(request(fileOf(5000), CHANGE));
    expect(result.outcome).toMatchObject({ kind: "bigger" });
  });

  it("uses the WebM codecs and keeps the audio for a WebM output", async () => {
    fake.buffer = new ArrayBuffer(1000);
    fake.audio = { canDecode: () => Promise.resolve(true) };
    const result = await compressVideo(
      request(fileOf(5_000_000), { ...CHANGE, outputFormat: "webm" })
    );
    expect(result.outcome).toMatchObject({
      file: { format: "webm" },
      kind: "done",
    });
    expect(fake.lastOptions).toMatchObject({
      audio: { codec: "opus" },
      video: { codec: "vp9" },
    });
  });

  it("discards audio when the user removes it", async () => {
    fake.buffer = new ArrayBuffer(1000);
    fake.audio = { canDecode: () => Promise.resolve(true) };
    await compressVideo(
      request(fileOf(5_000_000), { ...CHANGE, removeAudio: true })
    );
    expect(fake.lastOptions).toMatchObject({ audio: { discard: true } });
  });

  it("reports unencodable when the conversion is not valid", async () => {
    fake.conversionValid = false;
    const result = await compressVideo(request(fileOf(5_000_000)));
    expect(result.outcome).toEqual({
      kind: "rejected",
      problem: "unencodable",
    });
  });

  it("reports unencodable when a track the user wanted is discarded", async () => {
    fake.discarded = [{ reason: "unsupported_codec" }];
    const result = await compressVideo(request(fileOf(5_000_000)));
    expect(result.outcome).toEqual({
      kind: "rejected",
      problem: "unencodable",
    });
  });

  it("reports failed when the encoder writes no buffer", async () => {
    fake.buffer = null;
    const result = await compressVideo(request(fileOf(5_000_000)));
    expect(result.outcome).toEqual({ kind: "rejected", problem: "failed" });
  });

  it("reports failed when the encoder throws after the probe", async () => {
    fake.executeError = new Error("boom");
    const result = await compressVideo(request(fileOf(5_000_000)));
    expect(result.outcome).toEqual({ kind: "rejected", problem: "failed" });
  });

  it("clamps reported progress between 0 and 1", async () => {
    fake.progressSteps = [-0.5, 0.25, 2];
    const onProgress = vi.fn();
    await compressVideo(
      request(fileOf(5_000_000), CHANGE, undefined, onProgress)
    );
    const values = onProgress.mock.calls.map(([value]) => value);
    expect(Math.min(...values)).toBe(0);
    expect(Math.max(...values)).toBe(1);
  });

  it("maps an unsupported container error from the library to container", async () => {
    const { UnsupportedInputFormatError } = await import("mediabunny");
    fake.executeError = new UnsupportedInputFormatError("nope");
    const result = await compressVideo(request(fileOf(5_000_000)));
    expect(result.outcome).toEqual({ kind: "rejected", problem: "container" });
  });
});

/* -------------------------------------------------------------------------- */
/* Cancel                                                                      */
/* -------------------------------------------------------------------------- */

describe("compressVideo cancel", () => {
  it("throws cancelled when the run stops before the encode", async () => {
    const stopped = new AbortController();
    stopped.abort();
    await expect(
      compressVideo(request(fileOf(5_000_000), CHANGE, stopped.signal))
    ).rejects.toBeInstanceOf(CinchError);
  });

  it("throws cancelled when the run stops during the encode", async () => {
    const stopped = new AbortController();
    fake.onExecute = () => {
      stopped.abort();
    };
    fake.executeError = new Error("stopped");
    await expect(
      compressVideo(request(fileOf(5_000_000), CHANGE, stopped.signal))
    ).rejects.toMatchObject({ reason: "cancelled" });
  });
});
