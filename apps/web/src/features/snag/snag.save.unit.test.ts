/* eslint-disable max-classes-per-file, eslint/class-methods-use-this, eslint/require-await, eslint/no-useless-constructor, typescript/no-extraneous-class -- The Mediabunny doubles are classes, because Snag uses instanceof on them. Each one mirrors a class the library exports. */
/* oxlint-disable anti-slop/require-safety-comment-for-type-assertion, anti-slop/no-known-value-widening, anti-slop/no-unsafe-dictionary-type, anti-slop/no-unknown-parameters, anti-slop/no-unknown-returns, anti-slop/no-chained-type-assertions -- The fakes take the library's loose option bags and cast the test state to the browser and library types. A test double cannot type those exactly. */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { download } from "@/core/libs/files";
import { saveOptionsOf, VideoId } from "@/features/snag/snag";
import type { SaveOption, SnagStream, SnagVideo } from "@/features/snag/snag";
import {
  canSaveToDisk,
  openSink,
  saveOption,
  SaveError,
} from "@/features/snag/snag.save";
import type { SaveSink } from "@/features/snag/snag.save";

/* -------------------------------------------------------------------------- */
/* Fakes                                                                       */
/* -------------------------------------------------------------------------- */

vi.mock("@/core/libs/files", () => ({ download: vi.fn() }));
vi.mock("@mediabunny/mp3-encoder", () => ({ registerMp3Encoder: vi.fn() }));

interface FakeTrack {
  readonly kind: "audio" | "video";
  readonly codec: string | null;
  getDecoderConfig: () => Promise<unknown>;
}

interface FakePacket {
  readonly timestamp: number;
}

const h = vi.hoisted(() => ({
  audio: null as null | {
    kind: "audio" | "video";
    codec: string | null;
    getDecoderConfig: () => Promise<unknown>;
  },
  video: null as null | {
    kind: "audio" | "video";
    codec: string | null;
    getDecoderConfig: () => Promise<unknown>;
  },
  audioPackets: [] as { timestamp: number }[],
  videoPackets: [] as { timestamp: number }[],
  added: [] as { kind: string; timestamp: number; first: boolean }[],
  canEncodeMp3: true,
  conversionValid: true,
  conversionError: null as unknown,
  conversionBuffer: new ArrayBuffer(8) as ArrayBuffer | null,
  conversionProgress: [] as number[],
  startError: null as unknown,
  finalizeError: null as unknown,
  onFinalize: null as null | (() => void),
  onAdd: null as null | (() => void),
  onConvert: null as null | (() => void),
  canEncodeError: null as unknown,
  outputCancels: 0,
  lastOutput: null as null | { state: string },
}));

vi.mock("mediabunny", () => {
  class BufferTarget {
    buffer: ArrayBuffer | null = null;
  }
  class StreamTarget {
    readonly writable: unknown;
    constructor(writable: unknown, _options: unknown) {
      this.writable = writable;
    }
  }
  class BlobSource {
    readonly blob: Blob;
    constructor(blob: Blob) {
      this.blob = blob;
    }
  }
  class Input {
    constructor(_options: unknown) {}
    getPrimaryAudioTrack() {
      return Promise.resolve(h.audio);
    }
    getPrimaryVideoTrack() {
      return Promise.resolve(h.video);
    }
  }
  class EncodedPacketSink {
    readonly track: { kind: string };
    constructor(track: { kind: string }) {
      this.track = track;
    }
    packets() {
      const list =
        this.track.kind === "audio" ? h.audioPackets : h.videoPackets;
      return (async function* () {
        for (const packet of list) {
          yield packet;
        }
      })();
    }
  }
  class EncodedAudioPacketSource {
    readonly codec: string;
    constructor(codec: string) {
      this.codec = codec;
    }
    add(packet: FakePacket, options: { decoderConfig?: unknown }) {
      h.onAdd?.();
      h.added.push({
        first: options.decoderConfig !== undefined,
        kind: "audio",
        timestamp: packet.timestamp,
      });
      return Promise.resolve();
    }
  }
  class EncodedVideoPacketSource {
    readonly codec: string;
    constructor(codec: string) {
      this.codec = codec;
    }
    add(packet: FakePacket, options: { decoderConfig?: unknown }) {
      h.onAdd?.();
      h.added.push({
        first: options.decoderConfig !== undefined,
        kind: "video",
        timestamp: packet.timestamp,
      });
      return Promise.resolve();
    }
  }
  class Output {
    readonly format: unknown;
    readonly target: BufferTarget | StreamTarget;
    state = "pending";
    constructor(options: {
      format: unknown;
      target: BufferTarget | StreamTarget;
    }) {
      this.format = options.format;
      this.target = options.target;
      h.lastOutput = this;
    }
    addAudioTrack(_source: unknown) {}
    addVideoTrack(_source: unknown) {}
    start() {
      return h.startError === null
        ? Promise.resolve()
        : Promise.reject(h.startError);
    }
    finalize() {
      h.onFinalize?.();
      if (h.finalizeError !== null) {
        return Promise.reject(h.finalizeError);
      }
      if (this.target instanceof BufferTarget) {
        this.target.buffer = new ArrayBuffer(4);
      }
      return Promise.resolve();
    }
    cancel() {
      h.outputCancels += 1;
      this.state = "canceled";
      return Promise.resolve();
    }
  }
  class Conversion {
    onProgress: ((fraction: number) => void) | undefined;
    readonly isValid = h.conversionValid;
    readonly output: Output;
    constructor(output: Output) {
      this.output = output;
    }
    static init(options: { output: Output }) {
      return Promise.resolve(new Conversion(options.output));
    }
    cancel() {
      return Promise.resolve();
    }
    async execute() {
      for (const fraction of h.conversionProgress) {
        this.onProgress?.(fraction);
      }
      h.onConvert?.();
      if (h.conversionError !== null) {
        throw h.conversionError;
      }
      if (this.output.target instanceof BufferTarget) {
        this.output.target.buffer = h.conversionBuffer;
      }
    }
  }
  return {
    ALL_FORMATS: [],
    BlobSource,
    BufferTarget,
    Conversion,
    EncodedAudioPacketSource,
    EncodedPacketSink,
    EncodedVideoPacketSource,
    Input,
    Mp3OutputFormat: class {},
    Mp4OutputFormat: class {},
    Output,
    StreamTarget,
    canEncodeAudio: () =>
      h.canEncodeError === null
        ? Promise.resolve(h.canEncodeMp3)
        : Promise.reject(h.canEncodeError),
  };
});

/* -------------------------------------------------------------------------- */
/* Fixtures                                                                    */
/* -------------------------------------------------------------------------- */

const VIDEO: SnagVideo = {
  channel: "Rick Astley",
  id: VideoId.make("dQw4w9WgXcQ"),
  seconds: 213,
  streams: [
    {
      bitrate: 128_000,
      bytes: 10,
      codec: "aac",
      fps: 0,
      height: 0,
      itag: 140,
      kind: "audio",
      label: "",
      url: "https://rr1.googlevideo.com/a",
    },
    {
      bitrate: 4_000_000,
      bytes: 20,
      codec: "avc",
      fps: 30,
      height: 720,
      itag: 136,
      kind: "video",
      label: "720p",
      url: "https://rr1.googlevideo.com/v",
    },
  ],
  thumbnail: "https://i.ytimg.com/vi/x/hq720.jpg",
  title: "Never Gonna Give You Up",
};

const OPTIONS = saveOptionsOf(VIDEO);

const optionOf = <K extends SaveOption["kind"]>(kind: K) => {
  const found = OPTIONS.find(
    (option): option is Extract<SaveOption, { kind: K }> => option.kind === kind
  );
  if (found === undefined) {
    throw new Error(`no ${kind} option`);
  }
  return found;
};

const NAME = "Never Gonna Give You Up.mp4";

/** A relay that returns each requested range at its real length. */
const relayOk = () =>
  vi.fn(async (input: string | URL) => {
    const url = new URL(String(input), "https://ritools.test");
    const start = Number(url.searchParams.get("start") ?? 0);
    const end = url.searchParams.has("end")
      ? Number(url.searchParams.get("end"))
      : 4;
    return new Response(new Uint8Array(end - start + 1), { status: 200 });
  });

const expiredResponse = () =>
  new Response("", {
    headers: { "x-snag-upstream": "403" },
    status: 403,
  });

const relayFailing = (status: number, upstream?: string) =>
  vi.fn(
    async () =>
      new Response("", {
        headers: upstream === undefined ? {} : { "x-snag-upstream": upstream },
        status,
      })
  );

const track = (kind: "audio" | "video", codec: string | null): FakeTrack => ({
  codec,
  getDecoderConfig: () => Promise.resolve({ codec: "config" }),
  kind,
});

const memory: SaveSink = { kind: "memory" };

/**
 * A file sink whose handle and writable are fakes. Each fake has only the
 * methods Snag calls, so the two casts are the price of a browser type.
 */
const fileSinkOf = (
  abort: () => Promise<void>,
  remove: () => Promise<void>
) => {
  const abortFn = vi.fn(abort);
  const removeFn = vi.fn(remove);
  const writable = { abort: abortFn };
  const handle = {
    createWritable: () => Promise.resolve(writable),
    remove: removeFn,
  };
  const sink: SaveSink = {
    handle: handle as unknown as FileSystemFileHandle,
    kind: "file",
    writable: writable as unknown as FileSystemWritableFileStream,
  };
  return { abort: abortFn, remove: removeFn, sink };
};

const requestOf = (
  option: SaveOption,
  overrides: Partial<Parameters<typeof saveOption>[0]> = {}
) => ({
  name: NAME,
  onProgress: vi.fn(),
  option,
  refresh: vi.fn((stream: SnagStream) => Promise.resolve(stream)),
  signal: new AbortController().signal,
  sink: memory,
  ...overrides,
});

beforeEach(() => {
  h.audio = track("audio", "aac");
  h.video = track("video", "avc");
  h.audioPackets = [{ timestamp: 0 }, { timestamp: 2 }];
  h.videoPackets = [{ timestamp: 1 }];
  h.added = [];
  h.canEncodeMp3 = true;
  h.conversionValid = true;
  h.conversionError = null;
  h.conversionBuffer = new ArrayBuffer(8);
  h.conversionProgress = [];
  h.startError = null;
  h.finalizeError = null;
  h.onFinalize = null;
  h.onAdd = null;
  h.onConvert = null;
  h.canEncodeError = null;
  h.outputCancels = 0;
  h.lastOutput = null;
  vi.stubGlobal("fetch", relayOk());
  vi.mocked(download).mockClear();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

/* -------------------------------------------------------------------------- */
/* Sinks                                                                       */
/* -------------------------------------------------------------------------- */

describe("save sinks", () => {
  it("reports no disk save without the Chromium picker", () => {
    expect(canSaveToDisk()).toBe(false);
  });

  it("reports a disk save when the picker exists", () => {
    vi.stubGlobal("showSaveFilePicker", vi.fn());
    expect(canSaveToDisk()).toBe(true);
  });

  it("uses memory for a thumbnail even with a picker", async () => {
    const picker = vi.fn();
    vi.stubGlobal("showSaveFilePicker", picker);
    expect(await openSink(optionOf("thumbnail"), "a.jpg")).toEqual({
      kind: "memory",
    });
    expect(picker).not.toHaveBeenCalled();
  });

  it("uses memory when no picker exists", async () => {
    expect(await openSink(optionOf("video"), NAME)).toEqual({ kind: "memory" });
  });

  it("opens a file sink with the name the picker returns", async () => {
    const writable = { abort: vi.fn(() => Promise.resolve()) };
    const handle = {
      createWritable: () => Promise.resolve(writable),
      remove: vi.fn(() => Promise.resolve()),
    };
    const picker = vi.fn(() => Promise.resolve(handle));
    vi.stubGlobal("showSaveFilePicker", picker);
    const sink = await openSink(optionOf("video"), NAME);
    expect(picker).toHaveBeenCalledWith(
      expect.objectContaining({
        suggestedName: NAME,
        types: [{ accept: { "video/mp4": [".mp4"] } }],
      })
    );
    expect(sink).toEqual({ handle, kind: "file", writable });
  });

  it("returns null when the user closes the picker", async () => {
    vi.stubGlobal(
      "showSaveFilePicker",
      vi.fn(() => Promise.reject(new DOMException("closed", "AbortError")))
    );
    expect(await openSink(optionOf("video"), NAME)).toBeNull();
  });

  it("falls back to memory when the picker fails", async () => {
    vi.stubGlobal(
      "showSaveFilePicker",
      vi.fn(() => Promise.reject(new Error("blocked")))
    );
    expect(await openSink(optionOf("video"), NAME)).toEqual({
      kind: "memory",
    });
  });
});

/* -------------------------------------------------------------------------- */
/* Thumbnail                                                                   */
/* -------------------------------------------------------------------------- */

describe("saveOption thumbnail", () => {
  it("downloads the relayed image under its name", async () => {
    await saveOption(
      requestOf(optionOf("thumbnail"), { name: "Never Gonna Give You Up.jpg" })
    );
    expect(download).toHaveBeenCalledWith(
      expect.any(Blob),
      "Never Gonna Give You Up.jpg"
    );
  });

  it.each([
    [403, undefined, "host-refused"],
    [429, "429", "host-refused"],
    [403, "403", "expired"],
    [410, "410", "expired"],
    [500, undefined, "network"],
  ] as const)(
    "maps a %i relay answer (upstream %s) to %s",
    async (status, upstream, reason) => {
      vi.stubGlobal("fetch", relayFailing(status, upstream));
      await expect(
        saveOption(requestOf(optionOf("thumbnail")))
      ).rejects.toMatchObject({
        reason,
      });
      expect(download).not.toHaveBeenCalled();
    }
  );

  it("reports a network error when the request fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() => Promise.reject(new TypeError("offline")))
    );
    await expect(
      saveOption(requestOf(optionOf("thumbnail")))
    ).rejects.toMatchObject({ reason: "network" });
  });

  it("reports cancelled when the request fails after the user stopped", async () => {
    const controller = new AbortController();
    vi.stubGlobal(
      "fetch",
      vi.fn(() => {
        controller.abort();
        return Promise.reject(new TypeError("aborted"));
      })
    );
    await expect(
      saveOption(
        requestOf(optionOf("thumbnail"), { signal: controller.signal })
      )
    ).rejects.toMatchObject({ reason: "cancelled" });
  });

  it("reports cancelled when the request was already stopped", async () => {
    const controller = new AbortController();
    controller.abort();
    vi.stubGlobal(
      "fetch",
      vi.fn(() => Promise.reject(new DOMException("stop", "AbortError")))
    );
    await expect(
      saveOption(
        requestOf(optionOf("thumbnail"), { signal: controller.signal })
      )
    ).rejects.toMatchObject({ reason: "cancelled" });
  });

  it("reports a network error when the body cannot be read", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        blob: () => Promise.reject(new Error("truncated")),
        headers: new Headers(),
        ok: true,
        status: 200,
      }))
    );
    await expect(
      saveOption(requestOf(optionOf("thumbnail")))
    ).rejects.toMatchObject({ reason: "network" });
  });

  it("reports cancelled when the body fails after the user stopped", async () => {
    const controller = new AbortController();
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        blob: () => {
          controller.abort();
          return Promise.reject(new Error("truncated"));
        },
        headers: new Headers(),
        ok: true,
        status: 200,
      }))
    );
    await expect(
      saveOption(
        requestOf(optionOf("thumbnail"), { signal: controller.signal })
      )
    ).rejects.toMatchObject({ reason: "cancelled" });
  });
});

/* -------------------------------------------------------------------------- */
/* MP3                                                                         */
/* -------------------------------------------------------------------------- */

describe("saveOption mp3", () => {
  it("re-encodes the audio and downloads the MP3", async () => {
    const requested = requestOf(optionOf("mp3"));
    await saveOption(requested);
    expect(download).toHaveBeenCalledWith(expect.any(Blob), NAME);
    expect(requested.onProgress).toHaveBeenCalledWith({
      phase: "fetching",
      received: 0,
      total: 10,
    });
  });

  it("reports encoding progress to the caller", async () => {
    h.conversionProgress = [0.25, 1];
    const requested = requestOf(optionOf("mp3"));
    await saveOption(requested);
    expect(requested.onProgress).toHaveBeenCalledWith({
      fraction: 0.25,
      phase: "encoding",
    });
  });

  it("registers the MP3 encoder when the browser cannot encode MP3", async () => {
    h.canEncodeMp3 = false;
    const { registerMp3Encoder } = await import("@mediabunny/mp3-encoder");
    await saveOption(requestOf(optionOf("mp3")));
    expect(registerMp3Encoder).toHaveBeenCalled();
    expect(download).toHaveBeenCalled();
  });

  it("reports unreadable when the audio cannot be converted", async () => {
    h.conversionValid = false;
    await expect(saveOption(requestOf(optionOf("mp3")))).rejects.toMatchObject({
      reason: "unreadable",
    });
  });

  it("reports write-failed when the encoder fails", async () => {
    h.conversionError = new Error("encoder");
    await expect(saveOption(requestOf(optionOf("mp3")))).rejects.toMatchObject({
      reason: "write-failed",
    });
  });

  it("reports cancelled when the encoder fails after the user stopped", async () => {
    const controller = new AbortController();
    h.conversionError = new Error("stopped");
    controller.abort();
    await expect(
      saveOption(requestOf(optionOf("mp3"), { signal: controller.signal }))
    ).rejects.toMatchObject({ reason: "cancelled" });
  });
});

/* -------------------------------------------------------------------------- */
/* Video and audio mux                                                         */
/* -------------------------------------------------------------------------- */

describe("saveOption video", () => {
  it("copies both streams into one MP4 in timestamp order", async () => {
    const requested = requestOf(optionOf("video"));
    await saveOption(requested);
    expect(h.added.map((packet) => packet.timestamp)).toEqual([0, 1, 2]);
    expect(h.added[0]?.first).toBe(true);
    expect(download).toHaveBeenCalledWith(expect.any(Blob), NAME);
    expect(requested.onProgress).toHaveBeenCalledWith({ phase: "muxing" });
  });

  it("reports unreadable when the video input has no track", async () => {
    h.video = null;
    await expect(
      saveOption(requestOf(optionOf("video")))
    ).rejects.toMatchObject({
      reason: "unreadable",
    });
  });

  it("copies an m4a with its audio alone", async () => {
    await saveOption(requestOf(optionOf("m4a"), { name: "a.m4a" }));
    expect(h.added.every((packet) => packet.kind === "audio")).toBe(true);
    expect(download).toHaveBeenCalledWith(expect.any(Blob), "a.m4a");
  });

  it("reports unreadable when the audio track has no codec", async () => {
    h.audio = track("audio", null);
    await expect(saveOption(requestOf(optionOf("m4a")))).rejects.toMatchObject({
      reason: "unreadable",
    });
  });

  it("reports unreadable when the video track has no codec", async () => {
    h.video = track("video", null);
    await expect(
      saveOption(requestOf(optionOf("video")))
    ).rejects.toMatchObject({
      reason: "unreadable",
    });
  });

  it("reports unreadable when the audio input has no track", async () => {
    h.audio = null;
    await expect(saveOption(requestOf(optionOf("m4a")))).rejects.toMatchObject({
      reason: "unreadable",
    });
  });

  it("reports write-failed when the output cannot start", async () => {
    h.startError = new Error("no output");
    await expect(
      saveOption(requestOf(optionOf("video")))
    ).rejects.toMatchObject({
      reason: "write-failed",
    });
    expect(h.outputCancels).toBe(1);
  });

  it("reports write-failed when the output cannot finish", async () => {
    h.finalizeError = new Error("disk full");
    await expect(
      saveOption(requestOf(optionOf("video")))
    ).rejects.toMatchObject({
      reason: "write-failed",
    });
  });

  it("reports cancelled when the user stops during the mux", async () => {
    const controller = new AbortController();
    h.finalizeError = new Error("stopped");
    controller.abort();
    await expect(
      saveOption(requestOf(optionOf("video"), { signal: controller.signal }))
    ).rejects.toMatchObject({ reason: "cancelled" });
  });

  it("does not cancel an output that the stop already cancelled", async () => {
    const controller = new AbortController();
    h.onFinalize = () => {
      controller.abort();
    };
    h.finalizeError = new Error("stopped");
    await expect(
      saveOption(requestOf(optionOf("video"), { signal: controller.signal }))
    ).rejects.toBeInstanceOf(SaveError);
    expect(h.lastOutput?.state).toBe("canceled");
    expect(h.outputCancels).toBe(1);
  });

  it("does not download a file that was written to disk", async () => {
    const file = fileSinkOf(
      () => Promise.resolve(),
      () => Promise.resolve()
    );
    await saveOption(requestOf(optionOf("video"), { sink: file.sink }));
    expect(download).not.toHaveBeenCalled();
  });

  it("discards the partial file when the save fails", async () => {
    const file = fileSinkOf(
      () => Promise.reject(new Error("gone")),
      () => Promise.reject(new Error("gone"))
    );
    h.finalizeError = new Error("disk full");
    await expect(
      saveOption(requestOf(optionOf("video"), { sink: file.sink }))
    ).rejects.toMatchObject({ reason: "write-failed" });
    expect(file.abort).toHaveBeenCalled();
    expect(file.remove).toHaveBeenCalled();
  });
});

/* -------------------------------------------------------------------------- */
/* Fetch errors on a stream                                                    */
/* -------------------------------------------------------------------------- */

describe("saveOption refresh and ranges", () => {
  it("refreshes an expired address once and retries the range", async () => {
    let expired = true;
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: string | URL) => {
        if (expired) {
          return expiredResponse();
        }
        return relayOk()(input);
      })
    );
    const refresh = vi.fn(async (stream: SnagStream) => {
      expired = false;
      return stream;
    });
    await saveOption(requestOf(optionOf("m4a"), { name: "a.m4a", refresh }));
    expect(refresh).toHaveBeenCalledTimes(1);
    expect(download).toHaveBeenCalledWith(expect.any(Blob), "a.m4a");
  });

  it("reports expired when the refresh itself fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => expiredResponse())
    );
    const refresh = vi.fn(() => Promise.reject(new Error("gone")));
    await expect(
      saveOption(requestOf(optionOf("m4a"), { refresh }))
    ).rejects.toMatchObject({ reason: "expired" });
  });

  it("reports expired when the address is still expired after a refresh", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => expiredResponse())
    );
    const refresh = vi.fn(async (stream: SnagStream) => stream);
    await expect(
      saveOption(requestOf(optionOf("m4a"), { refresh }))
    ).rejects.toMatchObject({ reason: "expired" });
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it("reports network when a range returns fewer bytes than it should", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(new Uint8Array(3), { status: 200 }))
    );
    await expect(saveOption(requestOf(optionOf("m4a")))).rejects.toMatchObject({
      reason: "network",
    });
  });

  it("maps a stream request that rejects with a non-Error to network", async () => {
    vi.stubGlobal(
      "fetch",
      // A browser can reject a fetch with a plain string. That is the case under test.
      // eslint-disable-next-line eslint/prefer-promise-reject-errors -- A non-Error rejection is the input this test checks.
      vi.fn(() => Promise.reject("nope"))
    );
    await expect(saveOption(requestOf(optionOf("m4a")))).rejects.toMatchObject({
      reason: "network",
    });
  });

  it("copies packets that have no decoder config", async () => {
    h.audio = {
      ...track("audio", "aac"),
      getDecoderConfig: () => Promise.resolve(null),
    };
    await saveOption(requestOf(optionOf("m4a"), { name: "a.m4a" }));
    expect(h.added.every((packet) => packet.first === false)).toBe(true);
    expect(download).toHaveBeenCalled();
  });

  it("cancels the mux when the user stops between packets", async () => {
    const controller = new AbortController();
    h.onAdd = () => {
      controller.abort();
    };
    await expect(
      saveOption(requestOf(optionOf("video"), { signal: controller.signal }))
    ).rejects.toMatchObject({ reason: "cancelled" });
    expect(download).not.toHaveBeenCalled();
  });

  it("cancels an MP3 encode when the user stops during it", async () => {
    const controller = new AbortController();
    h.onConvert = () => {
      controller.abort();
    };
    h.conversionError = new Error("stopped");
    await expect(
      saveOption(requestOf(optionOf("mp3"), { signal: controller.signal }))
    ).rejects.toMatchObject({ reason: "cancelled" });
  });

  it("rethrows an unexpected error from the MP3 setup", async () => {
    h.canEncodeError = new Error("probe");
    await expect(saveOption(requestOf(optionOf("mp3")))).rejects.toThrow(
      "probe"
    );
  });

  it("reports cancelled when an abort error comes from the MP3 setup", async () => {
    h.canEncodeError = new DOMException("stop", "AbortError");
    await expect(saveOption(requestOf(optionOf("mp3")))).rejects.toMatchObject({
      reason: "cancelled",
    });
  });

  it("reports cancelled when the MP3 setup fails after the user stopped", async () => {
    const controller = new AbortController();
    h.canEncodeError = new Error("probe");
    controller.abort();
    await expect(
      saveOption(requestOf(optionOf("mp3"), { signal: controller.signal }))
    ).rejects.toMatchObject({ reason: "cancelled" });
  });
});

describe("saveOption stream fetch", () => {
  it("reports a stream that the relay refuses", async () => {
    vi.stubGlobal("fetch", relayFailing(403));
    await expect(
      saveOption(requestOf(optionOf("video")))
    ).rejects.toMatchObject({
      reason: "host-refused",
    });
    expect(download).not.toHaveBeenCalled();
  });

  it("reports cancelled when the user stops before the streams arrive", async () => {
    const controller = new AbortController();
    controller.abort();
    await expect(
      saveOption(requestOf(optionOf("video"), { signal: controller.signal }))
    ).rejects.toMatchObject({ reason: "cancelled" });
  });

  it("maps a rejected stream request to network", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() => Promise.reject(new Error("offline")))
    );
    await expect(
      saveOption(requestOf(optionOf("video")))
    ).rejects.toMatchObject({
      reason: "network",
    });
  });
});
