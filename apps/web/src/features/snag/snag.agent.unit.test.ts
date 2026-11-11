import { Schema } from "effect";
import { describe, expect, it, vi } from "vitest";

import { saveOptionsOf, VideoId } from "@/features/snag/snag";
import type { SnagVideo } from "@/features/snag/snag";
import { qualityOf, SNAG_AGENT_ACTIONS } from "@/features/snag/snag.agent";
import type { SnagAgentController } from "@/features/snag/snag.agent";
import type { SnagCard } from "@/features/snag/use-snag";

const ID = Schema.decodeUnknownSync(VideoId)("dQw4w9WgXcQ");
const [inspectAction, saveAction] = SNAG_AGENT_ACTIONS;

const VIDEO: SnagVideo = {
  channel: "Rick Astley",
  id: ID,
  seconds: 213,
  streams: [
    {
      bitrate: 128_000,
      bytes: 3_000_000,
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
      bytes: 26_000_000,
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

const READY: SnagCard = {
  id: ID,
  key: "card-1",
  saves: new Map(),
  state: { options: saveOptionsOf(VIDEO), status: "ready", video: VIDEO },
};

const contextOf = (controller: Partial<SnagAgentController>) => ({
  controller: () => ({
    cards: [],
    save: vi.fn(),
    submit: vi.fn(),
    ...controller,
  }),
  settled: () => Promise.resolve(),
});

const { signal } = new AbortController();

describe("snag_inspect_video_link", () => {
  it("reads a link and lists the Save Options", async () => {
    const submit = vi.fn(() =>
      Promise.resolve({ card: READY, ok: true as const })
    );
    const result = await inspectAction?.execute(
      contextOf({ submit }),
      { link: "https://youtu.be/dQw4w9WgXcQ" },
      signal
    );
    expect(submit).toHaveBeenCalledWith("https://youtu.be/dQw4w9WgXcQ");
    expect(result).toEqual({
      cardId: "card-1",
      channel: "Rick Astley",
      ok: true,
      options: [
        { bytes: 29_000_000, id: "mp4-720p", kind: "video", quality: "720p" },
        { bytes: 3_000_000, id: "m4a", kind: "m4a", quality: "128 kbps" },
        { bytes: 3_408_000, id: "mp3-128", kind: "mp3", quality: "128 kbps" },
        { bytes: 5_112_000, id: "mp3-192", kind: "mp3", quality: "192 kbps" },
        { bytes: 8_520_000, id: "mp3-320", kind: "mp3", quality: "320 kbps" },
        { bytes: null, id: "thumbnail", kind: "thumbnail", quality: "JPEG" },
      ],
      seconds: 213,
      title: "Never Gonna Give You Up",
    });
  });

  it.each(["playlist", "not-a-link", "host-refused", "private"] as const)(
    "returns the %s problem as a failure",
    async (problem) => {
      const result = await inspectAction?.execute(
        contextOf({
          submit: () => Promise.resolve({ card: null, ok: false, problem }),
        }),
        { link: "x" },
        signal
      );
      expect(result).toMatchObject({ code: problem, ok: false });
    }
  );

  it("refuses arguments that do not match the schema", async () => {
    const result = await inspectAction?.execute(contextOf({}), {}, signal);
    expect(result).toMatchObject({ code: "invalid-input", ok: false });
  });
});

describe("snag_save_option", () => {
  it("saves through memory and returns the file name", async () => {
    const save = vi.fn(() =>
      Promise.resolve({
        name: "Never Gonna Give You Up (720p).mp4",
        ok: true as const,
      })
    );
    const result = await saveAction?.execute(
      contextOf({ cards: [READY], save }),
      { cardId: "card-1", optionId: "mp4-720p" },
      signal
    );
    expect(save).toHaveBeenCalledWith("card-1", "mp4-720p", {
      fromAgent: true,
    });
    expect(result).toEqual({
      fileName: "Never Gonna Give You Up (720p).mp4",
      ok: true,
    });
  });

  it.each([
    ["unknown", "unknown-id"],
    ["busy", "busy"],
    ["network", "network"],
    ["library", "library"],
  ] as const)("returns %s as the %s code", async (reason, code) => {
    const result = await saveAction?.execute(
      contextOf({ save: () => Promise.resolve({ ok: false, reason }) }),
      { cardId: "card-1", optionId: "m4a" },
      signal
    );
    expect(result).toMatchObject({ code, ok: false });
  });

  it("names a save that the call cancelled", async () => {
    const controller = new AbortController();
    const result = await saveAction?.execute(
      contextOf({
        save: () => {
          controller.abort();
          return Promise.resolve({ ok: false, reason: "cancelled" });
        },
      }),
      { cardId: "card-1", optionId: "m4a" },
      controller.signal
    );
    expect(result).toMatchObject({ code: "cancelled", ok: false });
  });
});

describe("qualityOf", () => {
  it("prints each kind of Save Option", () => {
    expect(saveOptionsOf(VIDEO).map(qualityOf)).toEqual([
      "720p",
      "128 kbps",
      "128 kbps",
      "192 kbps",
      "320 kbps",
      "JPEG",
    ]);
  });
});
