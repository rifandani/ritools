import { isRelayHost } from "@/features/snag/snag";
import type {
  RefusalReason,
  SnagStream,
  SnagVideo,
  VideoId,
} from "@/features/snag/snag";

/**
 * The pure half of inspecting a Video Link. `snag.inspect.server.ts` asks the
 * video site and hands the answer here, so the mapping is tested without the
 * network or the client library.
 *
 * The shapes below are the fields Snag reads, not the client library's types.
 */

export interface RawFormat {
  readonly itag: number;
  readonly mime_type: string;
  readonly bitrate?: number;
  readonly content_length?: number;
  readonly height?: number;
  readonly fps?: number;
  readonly quality_label?: string;
  readonly has_video: boolean;
  readonly has_audio: boolean;
  readonly url?: string;
}

export interface RawVideo {
  readonly playability_status?: {
    readonly status?: string;
    readonly reason?: string;
  };
  readonly basic_info: {
    readonly title?: string;
    readonly author?: string;
    readonly duration?: number;
    readonly is_live?: boolean;
    readonly is_upcoming?: boolean;
    readonly thumbnail?: readonly {
      readonly url: string;
      readonly width: number;
    }[];
  };
  readonly streaming_data?: {
    readonly adaptive_formats?: readonly RawFormat[];
  };
}

const codecOf = (mime: string): SnagStream["codec"] | null => {
  const codecs =
    /codecs="(?<codecs>[^"]+)"/u.exec(mime)?.groups?.codecs?.toLowerCase() ??
    "";
  if (codecs.startsWith("avc1")) {
    return "avc";
  }
  if (codecs.startsWith("av01")) {
    return "av1";
  }
  if (codecs.startsWith("vp9") || codecs.startsWith("vp09")) {
    return "vp9";
  }
  if (codecs.startsWith("mp4a")) {
    return "aac";
  }
  return null;
};

const hostOf = (url: string): string | null => {
  try {
    return new URL(url).hostname;
  } catch {
    return null;
  }
};

const whole = (value: number | undefined): number =>
  value !== undefined && Number.isFinite(value) && value > 0
    ? Math.round(value)
    : 0;

/**
 * One stream Snag can save, or `null`. A stream must be video only or audio
 * only, carry a direct address on a relay host, state its size, and use a
 * codec that an MP4 file can hold.
 */
export const streamOf = (format: RawFormat): SnagStream | null => {
  if (format.has_video === format.has_audio || format.url === undefined) {
    return null;
  }
  const host = hostOf(format.url);
  const codec = codecOf(format.mime_type);
  const bytes = whole(format.content_length);
  if (host === null || !isRelayHost(host) || codec === null || bytes === 0) {
    return null;
  }
  const kind = format.has_video ? "video" : "audio";
  if ((kind === "audio") !== (codec === "aac")) {
    return null;
  }
  return {
    bitrate: whole(format.bitrate),
    bytes,
    codec,
    fps: whole(format.fps),
    height: whole(format.height),
    itag: format.itag,
    kind,
    label: kind === "video" ? (format.quality_label ?? "") : "",
    url: format.url,
  };
};

/** Reads the refusal words of the video site. The site writes them in English. */
const reasonOf = (status: string, reason: string): RefusalReason => {
  const text = reason.toLowerCase();
  if (/\bbot\b/u.test(text)) {
    return "host-refused";
  }
  if (text.includes("age") || text.includes("inappropriate")) {
    return "age-restricted";
  }
  if (text.includes("member")) {
    return "members-only";
  }
  if (text.includes("private")) {
    return "private";
  }
  if (text.includes("live")) {
    return "live";
  }
  if (status === "ERROR") {
    return "not-found";
  }
  if (status === "LIVE_STREAM_OFFLINE") {
    return "live";
  }
  return status === "LOGIN_REQUIRED" ? "private" : "unplayable";
};

/** The refusal for an error the client library throws instead of a status. */
export const refusalOfThrown = (message: string): RefusalReason =>
  reasonOf("ERROR", message);

export type InspectResult =
  | { readonly ok: true; readonly video: SnagVideo }
  | { readonly ok: false; readonly reason: RefusalReason };

/** Turns the video site's answer into one SnagVideo, or a refusal. */
export const videoOf = (id: VideoId, raw: RawVideo): InspectResult => {
  const status = raw.playability_status?.status ?? "OK";
  if (status !== "OK") {
    return {
      ok: false,
      reason: reasonOf(status, raw.playability_status?.reason ?? ""),
    };
  }
  if (raw.basic_info.is_live === true || raw.basic_info.is_upcoming === true) {
    return { ok: false, reason: "live" };
  }
  const streams = (raw.streaming_data?.adaptive_formats ?? [])
    .map(streamOf)
    .filter((stream) => stream !== null);
  if (!streams.some((stream) => stream.kind === "audio")) {
    return { ok: false, reason: "unplayable" };
  }
  const thumbnail =
    (raw.basic_info.thumbnail ?? [])
      .filter((image) => hostOf(image.url) === "i.ytimg.com")
      .toSorted((a, b) => b.width - a.width)[0]?.url ?? null;
  return {
    ok: true,
    video: {
      channel: raw.basic_info.author ?? "",
      id,
      seconds: whole(raw.basic_info.duration),
      streams,
      thumbnail,
      title: raw.basic_info.title ?? "",
    },
  };
};
