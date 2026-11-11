import { Schema } from "effect";
import { describe, expect, it } from "vitest";

import { VideoId } from "@/features/snag/snag";
import {
  refusalOfThrown,
  streamOf,
  videoOf,
} from "@/features/snag/snag.inspect";
import type { RawFormat, RawVideo } from "@/features/snag/snag.inspect";

const ID = Schema.decodeUnknownSync(VideoId)("dQw4w9WgXcQ");
const MEDIA = "https://rr1---sn-abc.googlevideo.com/videoplayback?id=1";

const format = (overrides: Partial<RawFormat>): RawFormat => ({
  bitrate: 4_000_000,
  content_length: 26_000_000,
  fps: 30,
  has_audio: false,
  has_video: true,
  height: 1080,
  itag: 137,
  mime_type: 'video/mp4; codecs="avc1.640028"',
  quality_label: "1080p",
  url: MEDIA,
  ...overrides,
});

const AAC = format({
  bitrate: 130_000,
  content_length: 3_400_000,
  has_audio: true,
  has_video: false,
  height: undefined,
  itag: 140,
  mime_type: 'audio/mp4; codecs="mp4a.40.2"',
  quality_label: undefined,
});

const raw = (overrides: Partial<RawVideo> = {}): RawVideo => ({
  basic_info: {
    author: "Rick Astley",
    duration: 213,
    thumbnail: [
      { url: "https://i.ytimg.com/vi/x/hqdefault.jpg", width: 480 },
      { url: "https://i.ytimg.com/vi/x/hq720.jpg", width: 1280 },
      { url: "https://evil.example/big.jpg", width: 4000 },
    ],
    title: "Never Gonna Give You Up",
  },
  playability_status: { status: "OK" },
  streaming_data: { adaptive_formats: [AAC, format({})] },
  ...overrides,
});

describe("streamOf", () => {
  it("reads a video stream and an audio stream", () => {
    expect(streamOf(format({}))).toEqual({
      bitrate: 4_000_000,
      bytes: 26_000_000,
      codec: "avc",
      fps: 30,
      height: 1080,
      itag: 137,
      kind: "video",
      label: "1080p",
      url: MEDIA,
    });
    expect(streamOf(AAC)).toMatchObject({
      codec: "aac",
      height: 0,
      kind: "audio",
      label: "",
    });
  });

  it.each([
    ['video/mp4; codecs="av01.0.08M.08"', "av1"],
    ['video/webm; codecs="vp9"', "vp9"],
    ['video/mp4; codecs="vp09.00.40.08"', "vp9"],
  ])("reads the codec of %s", (mime, codec) => {
    expect(streamOf(format({ mime_type: mime }))?.codec).toBe(codec);
  });

  it.each([
    ["a muxed stream", { has_audio: true }],
    ["a stream without an address", { url: undefined }],
    ["an address on another host", { url: "https://evil.example/x" }],
    ["an address that does not parse", { url: "not a url" }],
    ["an unknown size", { content_length: undefined }],
    ["an Opus stream", { mime_type: 'audio/webm; codecs="opus"' }],
    ["a mime type without codecs", { mime_type: "video/mp4" }],
    [
      "audio with a video codec",
      {
        has_audio: true,
        has_video: false,
        mime_type: 'video/mp4; codecs="avc1"',
      },
    ],
  ])("skips %s", (_name, overrides) => {
    expect(streamOf(format(overrides))).toBeNull();
  });
});

describe("videoOf", () => {
  it("keeps the streams, the channel, and the largest site thumbnail", () => {
    const result = videoOf(ID, raw());
    expect(result).toMatchObject({
      ok: true,
      video: {
        channel: "Rick Astley",
        id: ID,
        seconds: 213,
        thumbnail: "https://i.ytimg.com/vi/x/hq720.jpg",
        title: "Never Gonna Give You Up",
      },
    });
    expect(result.ok && result.video.streams).toHaveLength(2);
  });

  it("fills missing text with empty values", () => {
    const result = videoOf(ID, raw({ basic_info: {} }));
    expect(result).toMatchObject({
      ok: true,
      video: { channel: "", seconds: 0, thumbnail: null, title: "" },
    });
  });

  it.each([
    ["LOGIN_REQUIRED", "Sign in to confirm you're not a bot", "host-refused"],
    ["LOGIN_REQUIRED", "Sign in to confirm your age", "age-restricted"],
    ["LOGIN_REQUIRED", "This video may be inappropriate", "age-restricted"],
    [
      "UNPLAYABLE",
      "Join this channel to get access to members-only content",
      "members-only",
    ],
    ["LOGIN_REQUIRED", "This video is private", "private"],
    ["LOGIN_REQUIRED", "", "private"],
    ["UNPLAYABLE", "This live stream recording is not available.", "live"],
    ["LIVE_STREAM_OFFLINE", "", "live"],
    ["ERROR", "This video is unavailable", "not-found"],
    ["UNPLAYABLE", "Video unavailable", "unplayable"],
  ])("refuses status %s with %j as %s", (status, reason, refusal) => {
    expect(
      videoOf(ID, raw({ playability_status: { reason, status } }))
    ).toEqual({ ok: false, reason: refusal });
  });

  it("refuses a live stream and a premiere", () => {
    for (const flag of ["is_live", "is_upcoming"] as const) {
      expect(videoOf(ID, raw({ basic_info: { [flag]: true } }))).toEqual({
        ok: false,
        reason: "live",
      });
    }
  });

  it("refuses a video without an audio stream it can save", () => {
    expect(
      videoOf(ID, raw({ streaming_data: { adaptive_formats: [format({})] } }))
    ).toEqual({ ok: false, reason: "unplayable" });
    expect(videoOf(ID, raw({ streaming_data: undefined }))).toEqual({
      ok: false,
      reason: "unplayable",
    });
  });

  it("reads a thrown error as a refusal", () => {
    expect(refusalOfThrown("This video is unavailable")).toBe("not-found");
    expect(refusalOfThrown("This video is private")).toBe("private");
  });
});
