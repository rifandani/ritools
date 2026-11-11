import { Schema } from "effect";

import { clampFileName } from "@/core/libs/files";

/**
 * Snag: the domain of saving one public video, or its audio, from a Video
 * Link (ADR-0039).
 *
 * This module is pure. It parses a Video Link, turns the streams the server
 * found into Save Options, names the saved file, and checks the addresses the
 * Video Relay may fetch. The server half is `snag.inspect.server.ts` and
 * `snag.relay.server.ts`; the browser half is `snag.save.ts`.
 */

/* -------------------------------------------------------------------------- */
/* Video Link                                                                  */
/* -------------------------------------------------------------------------- */

/** The 11-character id the video site gives each video. */
export const VideoId = Schema.String.check(
  Schema.isPattern(/^[\w-]{11}$/u)
).pipe(Schema.brand("SnagVideoId"));
export type VideoId = typeof VideoId.Type;

const isVideoId = Schema.is(VideoId);

/** Why Snag does not accept a text as a Video Link before it asks the server. */
export type LinkProblem = "not-a-link" | "playlist";

export type ParsedLink =
  | { readonly ok: true; readonly id: VideoId }
  | { readonly ok: false; readonly problem: LinkProblem };

const VIDEO_HOSTS = new Set([
  "youtube.com",
  "www.youtube.com",
  "m.youtube.com",
  "music.youtube.com",
  "youtube-nocookie.com",
  "www.youtube-nocookie.com",
]);
const SHORT_HOSTS = new Set(["youtu.be", "www.youtu.be"]);
/** Path prefixes whose next segment is the video id. */
const ID_PATHS = new Set(["shorts", "embed", "live", "v"]);

const accept = (candidate: string | undefined): ParsedLink =>
  candidate !== undefined && isVideoId(candidate)
    ? { id: candidate, ok: true }
    : { ok: false, problem: "not-a-link" };

const urlOf = (text: string): URL | null => {
  const trimmed = text.trim();
  const withScheme = /^[a-z][a-z\d+.-]*:\/\//iu.test(trimmed)
    ? trimmed
    : `https://${trimmed}`;
  try {
    const url = new URL(withScheme);
    return url.protocol === "https:" || url.protocol === "http:" ? url : null;
  } catch {
    return null;
  }
};

/**
 * Reads one Video Link. A link that names a video and a playlist gives the
 * video: Snag takes one video per submit. A link to a playlist alone is a
 * Refused Link before any request.
 */
export const parseVideoLink = (text: string): ParsedLink => {
  const url = urlOf(text);
  if (url === null) {
    return { ok: false, problem: "not-a-link" };
  }
  const host = url.hostname.toLowerCase();
  const [first, second] = url.pathname.split("/").filter(Boolean);
  if (SHORT_HOSTS.has(host)) {
    return accept(first);
  }
  if (!VIDEO_HOSTS.has(host)) {
    return { ok: false, problem: "not-a-link" };
  }
  if (first === "watch") {
    const id = url.searchParams.get("v");
    if (id === null && url.searchParams.has("list")) {
      return { ok: false, problem: "playlist" };
    }
    return accept(id ?? undefined);
  }
  if (first === "playlist") {
    return { ok: false, problem: "playlist" };
  }
  if (first !== undefined && ID_PATHS.has(first)) {
    return accept(second);
  }
  return { ok: false, problem: "not-a-link" };
};

/* -------------------------------------------------------------------------- */
/* What the server finds                                                       */
/* -------------------------------------------------------------------------- */

const Count = Schema.Number.check(
  Schema.isInt(),
  Schema.isGreaterThanOrEqualTo(0),
  Schema.isLessThanOrEqualTo(Number.MAX_SAFE_INTEGER)
);

/** One stream the video site offers: video only, or audio only. */
const SnagStream = Schema.Struct({
  itag: Count,
  kind: Schema.Literals(["video", "audio"]),
  /** The codec family: `avc`, `av1`, `vp9`, or `aac`. Others never reach the browser. */
  codec: Schema.Literals(["avc", "av1", "vp9", "aac"]),
  url: Schema.String,
  bytes: Count,
  bitrate: Count,
  height: Count,
  fps: Count,
  /** The label the video site prints, for example `1080p60`. Empty for audio. */
  label: Schema.String,
});
export type SnagStream = typeof SnagStream.Type;

/** One video that the server read from a Video Link. */
export const SnagVideo = Schema.Struct({
  id: VideoId,
  title: Schema.String,
  channel: Schema.String,
  seconds: Count,
  /** The largest thumbnail, or `null` when the site gives none. */
  thumbnail: Schema.NullOr(Schema.String),
  streams: Schema.Array(SnagStream),
});
export type SnagVideo = typeof SnagVideo.Type;

/** Why the server refused a Video Link. Each one has its own message. */
const RefusalReason = Schema.Literals([
  "not-found",
  "private",
  "age-restricted",
  "members-only",
  "live",
  "unplayable",
  "host-refused",
  "unreachable",
]);
export type RefusalReason = typeof RefusalReason.Type;

export class SnagRefusal extends Schema.TaggedError<SnagRefusal>()(
  "SnagRefusal",
  { reason: RefusalReason }
) {}

/* -------------------------------------------------------------------------- */
/* Save Options                                                                */
/* -------------------------------------------------------------------------- */

const MP3_BITRATES = [128, 192, 320] as const;
export type Mp3Bitrate = (typeof MP3_BITRATES)[number];

/** One format and quality that Snag offers for a Video Link. */
export type SaveOption =
  | {
      readonly id: string;
      readonly kind: "video";
      readonly label: string;
      readonly height: number;
      readonly video: SnagStream;
      readonly audio: SnagStream;
      /** The sum of both streams. The muxed file is within a few kilobytes. */
      readonly bytes: number;
    }
  | {
      readonly id: "m4a";
      readonly kind: "m4a";
      readonly audio: SnagStream;
      readonly bytes: number;
    }
  | {
      readonly id: `mp3-${Mp3Bitrate}`;
      readonly kind: "mp3";
      readonly kbps: Mp3Bitrate;
      readonly audio: SnagStream;
      /** An estimate: the bitrate times the duration. */
      readonly bytes: number;
    }
  | {
      readonly id: "thumbnail";
      readonly kind: "thumbnail";
      readonly url: string;
    };

/** H.264 plays on every device, so it wins a tie at one quality label. */
const CODEC_RANK: Readonly<Record<SnagStream["codec"], number>> = {
  aac: 0,
  av1: 1,
  avc: 0,
  vp9: 2,
};

const betterVideo = (a: SnagStream, b: SnagStream): SnagStream => {
  const rank = CODEC_RANK[a.codec] - CODEC_RANK[b.codec];
  if (rank === 0) {
    return a.bitrate >= b.bitrate ? a : b;
  }
  return rank < 0 ? a : b;
};

/** The audio stream with the highest bitrate, or `null`. */
const bestAudioOf = (streams: readonly SnagStream[]): SnagStream | null =>
  streams
    .filter((stream) => stream.kind === "audio" && stream.codec === "aac")
    .reduce<SnagStream | null>(
      (best, stream) =>
        best === null || stream.bitrate > best.bitrate ? stream : best,
      null
    );

/**
 * The Save Options of one video, in the order the table shows them: one MP4
 * per quality label, highest first, then M4A, the MP3 bitrates, and the
 * thumbnail. A video with no audio stream offers only the thumbnail.
 */
export const saveOptionsOf = (video: SnagVideo): readonly SaveOption[] => {
  const audio = bestAudioOf(video.streams);
  const thumbnail: SaveOption[] =
    video.thumbnail === null
      ? []
      : [{ id: "thumbnail", kind: "thumbnail", url: video.thumbnail }];
  if (audio === null) {
    return thumbnail;
  }
  const byLabel = new Map<string, SnagStream>();
  for (const stream of video.streams) {
    if (stream.kind !== "video" || stream.label === "") {
      continue;
    }
    const held = byLabel.get(stream.label);
    byLabel.set(
      stream.label,
      held === undefined ? stream : betterVideo(held, stream)
    );
  }
  const videos = [...byLabel.values()]
    .toSorted((a, b) => b.height - a.height || b.fps - a.fps)
    .map((stream): SaveOption => ({
      audio,
      bytes: stream.bytes + audio.bytes,
      height: stream.height,
      id: `mp4-${stream.label}`,
      kind: "video",
      label: stream.label,
      video: stream,
    }));
  const mp3s = MP3_BITRATES.map((kbps): SaveOption => ({
    audio,
    bytes: Math.round((video.seconds * kbps * 1000) / 8),
    id: `mp3-${kbps}` as const,
    kbps,
    kind: "mp3",
  }));
  return [
    ...videos,
    { audio, bytes: audio.bytes, id: "m4a", kind: "m4a" },
    ...mp3s,
    ...thumbnail,
  ];
};

const EXTENSION: Readonly<Record<SaveOption["kind"], string>> = {
  m4a: "m4a",
  mp3: "mp3",
  thumbnail: "jpg",
  video: "mp4",
};

const MIME: Readonly<Record<SaveOption["kind"], string>> = {
  m4a: "audio/mp4",
  mp3: "audio/mpeg",
  thumbnail: "image/jpeg",
  video: "video/mp4",
};

/** The extension of the file a Save Option writes. */
export const extensionOf = (option: SaveOption): string =>
  EXTENSION[option.kind];

/** The MIME type of the file a Save Option writes. */
export const mimeOf = (option: SaveOption): string => MIME[option.kind];

/** Characters that Windows, macOS, or Linux refuse in a file name. */
// oxlint-disable-next-line no-control-regex -- Control characters are what this pattern removes.
const UNSAFE_NAME = /[\u0000-\u001F\u007F<>:"/\\|?*]+/gu;
const TITLE_LENGTH = 120;

/**
 * The name of the saved file: `<title> (1080p60).mp4` for video and
 * `<title>.<ext>` for audio and the thumbnail. An empty title becomes the
 * video id.
 */
export const fileNameOf = (video: SnagVideo, option: SaveOption): string => {
  const cleaned = video.title
    .replaceAll(UNSAFE_NAME, " ")
    .replaceAll(/\s+/gu, " ")
    .trim()
    .replace(/[. ]+$/u, "")
    .slice(0, TITLE_LENGTH)
    .trim();
  const stem = cleaned === "" ? video.id : cleaned;
  const quality = option.kind === "video" ? ` (${option.label})` : "";
  return clampFileName(
    `${stem}${quality}.${extensionOf(option)}`,
    TITLE_LENGTH + 24
  );
};

/** `m:ss` or `h:mm:ss`. */
export const formatDuration = (seconds: number): string => {
  const whole = Math.max(0, Math.floor(seconds));
  const h = Math.floor(whole / 3600);
  const m = Math.floor((whole % 3600) / 60);
  const s = String(whole % 60).padStart(2, "0");
  return h > 0 ? `${h}:${String(m).padStart(2, "0")}:${s}` : `${m}:${s}`;
};

/* -------------------------------------------------------------------------- */
/* Video Relay                                                                 */
/* -------------------------------------------------------------------------- */

/** The route of the Video Relay. */
const RELAY_PATH = "/api/snag/media";

/**
 * The size of one relayed range. Each relay call stays far below a function's
 * time limit, and Cancel stops within one range.
 */
export const CHUNK_BYTES = 4 * 1024 * 1024;

/**
 * Above this size, a browser that builds the file in memory can run out of
 * memory. The device is the limit, so Snag warns and does not refuse.
 */
export const MEMORY_WARN_BYTES = 2_000_000_000;

/** The hosts the Video Relay may fetch. Every other host is refused. */
export const isRelayHost = (host: string): boolean =>
  host === "i.ytimg.com" ||
  (host.endsWith(".googlevideo.com") && host !== ".googlevideo.com");

/** The relay address for one range of a stream, or for a whole thumbnail. */
export const relayUrlOf = (
  upstream: string,
  range?: { readonly start: number; readonly end: number }
): string => {
  const query = new URLSearchParams({ u: upstream });
  if (range !== undefined) {
    query.set("start", String(range.start));
    query.set("end", String(range.end));
  }
  return `${RELAY_PATH}?${query.toString()}`;
};

/** The inclusive byte ranges that cover a stream, in order. */
export const rangesOf = (
  bytes: number,
  size = CHUNK_BYTES
): readonly { readonly start: number; readonly end: number }[] =>
  Array.from({ length: Math.ceil(bytes / size) }, (_, index) => ({
    end: Math.min(bytes, (index + 1) * size) - 1,
    start: index * size,
  }));

export type RelayRequest =
  | { readonly ok: true; readonly upstream: URL }
  | { readonly ok: false; readonly status: 400 | 403 };

const RANGE_NUMBER = /^\d{1,15}$/u;

/**
 * Checks one relay request and gives the upstream address to fetch. Only an
 * HTTPS address on an allowed host passes. A media range is at most
 * `CHUNK_BYTES` long and is written into the address the way the media host
 * reads it.
 */
export const readRelayRequest = (params: URLSearchParams): RelayRequest => {
  const raw = params.get("u");
  if (raw === null) {
    return { ok: false, status: 400 };
  }
  let upstream: URL;
  try {
    upstream = new URL(raw);
  } catch {
    return { ok: false, status: 400 };
  }
  if (
    upstream.protocol !== "https:" ||
    upstream.username !== "" ||
    upstream.password !== "" ||
    upstream.port !== "" ||
    !isRelayHost(upstream.hostname)
  ) {
    return { ok: false, status: 403 };
  }
  if (upstream.hostname === "i.ytimg.com") {
    return { ok: true, upstream };
  }
  const start = params.get("start") ?? "";
  const end = params.get("end") ?? "";
  if (!RANGE_NUMBER.test(start) || !RANGE_NUMBER.test(end)) {
    return { ok: false, status: 400 };
  }
  const from = Number(start);
  const to = Number(end);
  if (to < from || to - from + 1 > CHUNK_BYTES) {
    return { ok: false, status: 400 };
  }
  upstream.searchParams.set("range", `${from}-${to}`);
  return { ok: true, upstream };
};
