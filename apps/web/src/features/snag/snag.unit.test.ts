import { Schema } from "effect";
import { describe, expect, it } from "vitest";

import {
  CHUNK_BYTES,
  extensionOf,
  fileNameOf,
  formatDuration,
  isRelayHost,
  mimeOf,
  parseVideoLink,
  rangesOf,
  readRelayRequest,
  relayUrlOf,
  saveOptionsOf,
  VideoId,
} from "@/features/snag/snag";
import type { SnagStream, SnagVideo } from "@/features/snag/snag";

const ID = Schema.decodeUnknownSync(VideoId)("dQw4w9WgXcQ");

const stream = (overrides: Partial<SnagStream>): SnagStream => ({
  bitrate: 1_000_000,
  bytes: 1000,
  codec: "avc",
  fps: 30,
  height: 1080,
  itag: 137,
  kind: "video",
  label: "1080p",
  url: "https://rr1---sn-abc.googlevideo.com/videoplayback?id=1",
  ...overrides,
});

const AUDIO = stream({
  bitrate: 128_000,
  bytes: 3_000_000,
  codec: "aac",
  fps: 0,
  height: 0,
  itag: 140,
  kind: "audio",
  label: "",
});

const video = (overrides: Partial<SnagVideo> = {}): SnagVideo => ({
  channel: "Rick Astley",
  id: ID,
  seconds: 213,
  streams: [AUDIO, stream({})],
  thumbnail: "https://i.ytimg.com/vi/dQw4w9WgXcQ/hq720.jpg",
  title: "Never Gonna Give You Up",
  ...overrides,
});

describe("parseVideoLink", () => {
  it.each([
    "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    "www.youtube.com/watch?v=dQw4w9WgXcQ&t=42s",
    "https://m.youtube.com/watch?v=dQw4w9WgXcQ",
    "https://music.youtube.com/watch?v=dQw4w9WgXcQ&si=x",
    "https://youtu.be/dQw4w9WgXcQ?si=abc",
    "https://www.youtube.com/shorts/dQw4w9WgXcQ",
    "https://www.youtube.com/embed/dQw4w9WgXcQ",
    "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ",
    "https://www.youtube.com/live/dQw4w9WgXcQ",
    "  https://www.youtube.com/watch?v=dQw4w9WgXcQ  ",
  ])("reads the video id from %s", (link) => {
    expect(parseVideoLink(link)).toEqual({ id: ID, ok: true });
  });

  it("takes the video when a link names a video and a playlist", () => {
    expect(
      parseVideoLink(
        "https://www.youtube.com/watch?v=dQw4w9WgXcQ&list=PL1234567890"
      )
    ).toEqual({ id: ID, ok: true });
  });

  it.each([
    "https://www.youtube.com/playlist?list=PL1234567890",
    "https://www.youtube.com/watch?list=PL1234567890",
  ])("refuses a playlist link: %s", (link) => {
    expect(parseVideoLink(link)).toEqual({ ok: false, problem: "playlist" });
  });

  it.each([
    "",
    "not a link",
    "https://vimeo.com/123456",
    "https://www.youtube.com/watch?v=short",
    "https://www.youtube.com/@channel",
    "https://youtu.be/",
    "ftp://youtu.be/dQw4w9WgXcQ",
    "https://evil.example/watch?v=dQw4w9WgXcQ",
  ])("refuses %j as not a link", (link) => {
    expect(parseVideoLink(link)).toEqual({ ok: false, problem: "not-a-link" });
  });
});

describe("saveOptionsOf", () => {
  it("lists one MP4 per label, M4A, three MP3s, and the thumbnail", () => {
    const options = saveOptionsOf(
      video({
        streams: [
          AUDIO,
          stream({ height: 720, itag: 136, label: "720p" }),
          stream({ itag: 137 }),
          stream({ codec: "vp9", fps: 60, itag: 303, label: "1080p60" }),
        ],
      })
    );
    expect(options.map((option) => option.id)).toEqual([
      "mp4-1080p60",
      "mp4-1080p",
      "mp4-720p",
      "m4a",
      "mp3-128",
      "mp3-192",
      "mp3-320",
      "thumbnail",
    ]);
  });

  it("prefers H.264, then AV1, then VP9 at one label", () => {
    const options = saveOptionsOf(
      video({
        streams: [
          AUDIO,
          stream({ bitrate: 9, codec: "vp9", itag: 248 }),
          stream({ bitrate: 5, codec: "av1", itag: 399 }),
          stream({ bitrate: 1, codec: "avc", itag: 137 }),
        ],
      })
    );
    const [first] = options;
    expect(first?.kind === "video" ? first.video.itag : null).toBe(137);
  });

  it("prefers the higher bitrate between two streams of one codec", () => {
    const options = saveOptionsOf(
      video({
        streams: [
          AUDIO,
          stream({ bitrate: 1, itag: 1 }),
          stream({ bitrate: 2, itag: 2 }),
        ],
      })
    );
    const [first] = options;
    expect(first?.kind === "video" ? first.video.itag : null).toBe(2);
  });

  it("uses the best AAC stream and adds its size to each video", () => {
    const low = stream({ ...AUDIO, bitrate: 48_000, bytes: 10, itag: 139 });
    const [first, ...rest] = saveOptionsOf(
      video({ streams: [low, AUDIO, stream({ bytes: 500 })] })
    );
    expect(first?.kind === "video" ? first.audio.itag : null).toBe(140);
    expect(first?.kind === "video" ? first.bytes : null).toBe(3_000_500);
    expect(rest.find((option) => option.id === "mp3-192")).toMatchObject({
      bytes: Math.round((213 * 192 * 1000) / 8),
    });
  });

  it("offers only the thumbnail when no audio stream exists", () => {
    expect(
      saveOptionsOf(video({ streams: [stream({})] })).map((option) => option.id)
    ).toEqual(["thumbnail"]);
    expect(saveOptionsOf(video({ streams: [], thumbnail: null }))).toEqual([]);
  });

  it("skips video streams without a label", () => {
    const options = saveOptionsOf(
      video({ streams: [AUDIO, stream({ label: "" })], thumbnail: null })
    );
    expect(options.map((option) => option.kind)).toEqual([
      "m4a",
      "mp3",
      "mp3",
      "mp3",
    ]);
  });
});

describe("file names", () => {
  const options = saveOptionsOf(
    video({ streams: [AUDIO, stream({ label: "1080p60" })] })
  );
  const [mp4, m4a, mp3] = options;
  const { 5: thumbnail } = options;

  it("names video with its quality and audio without", () => {
    expect(mp4 && fileNameOf(video(), mp4)).toBe(
      "Never Gonna Give You Up (1080p60).mp4"
    );
    expect(m4a && fileNameOf(video(), m4a)).toBe("Never Gonna Give You Up.m4a");
    expect(mp3 && fileNameOf(video(), mp3)).toBe("Never Gonna Give You Up.mp3");
    expect(thumbnail && fileNameOf(video(), thumbnail)).toBe(
      "Never Gonna Give You Up.jpg"
    );
  });

  it("removes characters that file systems refuse", () => {
    expect(
      m4a && fileNameOf(video({ title: 'A/B: "C" <D>|E?*\u0007. ' }), m4a)
    ).toBe("A B C D E.m4a");
  });

  it("uses the video id for an empty title and cuts a long one", () => {
    expect(m4a && fileNameOf(video({ title: " ... " }), m4a)).toBe(
      "dQw4w9WgXcQ.m4a"
    );
    const long = m4a && fileNameOf(video({ title: "x".repeat(300) }), m4a);
    expect(long).toBe(`${"x".repeat(120)}.m4a`);
  });

  it("gives each kind its extension and MIME type", () => {
    expect(
      [mp4, m4a, mp3, thumbnail].map(
        (option) => option && [extensionOf(option), mimeOf(option)]
      )
    ).toEqual([
      ["mp4", "video/mp4"],
      ["m4a", "audio/mp4"],
      ["mp3", "audio/mpeg"],
      ["jpg", "image/jpeg"],
    ]);
  });
});

describe("formatDuration", () => {
  it.each([
    [0, "0:00"],
    [9.7, "0:09"],
    [213, "3:33"],
    [3600, "1:00:00"],
    [3725, "1:02:05"],
    [-5, "0:00"],
  ])("prints %d seconds as %s", (seconds, text) => {
    expect(formatDuration(seconds)).toBe(text);
  });
});

describe("Video Relay requests", () => {
  const upstream = "https://rr1---sn-abc.googlevideo.com/videoplayback?id=1";

  it("allows only the media hosts and the thumbnail host", () => {
    expect(isRelayHost("rr1---sn-abc.googlevideo.com")).toBe(true);
    expect(isRelayHost("i.ytimg.com")).toBe(true);
    expect(isRelayHost("googlevideo.com")).toBe(false);
    expect(isRelayHost(".googlevideo.com")).toBe(false);
    expect(isRelayHost("googlevideo.com.evil.example")).toBe(false);
    expect(isRelayHost("www.youtube.com")).toBe(false);
  });

  it("covers a stream with inclusive ranges of one chunk", () => {
    expect(rangesOf(10, 4)).toEqual([
      { end: 3, start: 0 },
      { end: 7, start: 4 },
      { end: 9, start: 8 },
    ]);
    expect(rangesOf(0)).toEqual([]);
  });

  it("writes the range into the media address", () => {
    const url = new URL(
      relayUrlOf(upstream, { end: 99, start: 0 }),
      "https://ritools.test"
    );
    const read = readRelayRequest(url.searchParams);
    expect(read.ok && read.upstream.searchParams.get("range")).toBe("0-99");
    expect(read.ok && read.upstream.hostname).toBe(
      "rr1---sn-abc.googlevideo.com"
    );
  });

  it("passes a thumbnail without a range", () => {
    const url = new URL(
      relayUrlOf("https://i.ytimg.com/vi/x/hq720.jpg"),
      "https://ritools.test"
    );
    const read = readRelayRequest(url.searchParams);
    expect(read.ok && read.upstream.href).toBe(
      "https://i.ytimg.com/vi/x/hq720.jpg"
    );
  });

  it.each([
    [{}, 400],
    [{ u: "not a url" }, 400],
    [{ u: "http://rr1.googlevideo.com/x", start: "0", end: "1" }, 403],
    [{ u: "https://a:b@rr1.googlevideo.com/x", start: "0", end: "1" }, 403],
    [{ u: "https://rr1.googlevideo.com:8443/x", start: "0", end: "1" }, 403],
    [{ u: "https://169.254.169.254/latest", start: "0", end: "1" }, 403],
    [{ u: "https://www.youtube.com/x", start: "0", end: "1" }, 403],
    [{ u: upstream }, 400],
    [{ u: upstream, start: "-1", end: "5" }, 400],
    [{ u: upstream, start: "5", end: "1" }, 400],
    [{ u: upstream, start: "0", end: String(CHUNK_BYTES) }, 400],
  ])("refuses %j with %d", (params, status) => {
    expect(readRelayRequest(new URLSearchParams(params))).toEqual({
      ok: false,
      status,
    });
  });

  it("accepts a range of exactly one chunk", () => {
    const read = readRelayRequest(
      new URLSearchParams({
        end: String(CHUNK_BYTES - 1),
        start: "0",
        u: upstream,
      })
    );
    expect(read.ok).toBe(true);
  });
});
