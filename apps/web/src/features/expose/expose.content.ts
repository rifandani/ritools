/* oxlint-disable react-doctor/js-combine-iterations -- the bounded movie hierarchy has four distinct levels; each pass names one container level */
import type { ContentCheck, FileFormat } from "@/features/expose/expose";
import { ExposeError, familyOf } from "@/features/expose/expose";
import { OFFICE_PARTS, officeEntries } from "@/features/expose/expose.office";
import { payloadOf } from "@/features/expose/expose.payload";

const bad = (detail: string): never => {
  throw new ExposeError({ code: "engine-failed", detail });
};
interface Box {
  readonly type: string;
  readonly start: number;
  readonly end: number;
  readonly body: number;
}
export const mediaBoxes = (
  bytes: Uint8Array,
  start = 0,
  end = bytes.length
): readonly Box[] => {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const boxes: Box[] = [];
  let at = start;
  while (at < end) {
    if (at + 8 > end) {
      return bad("media-samples: truncated box header");
    }
    const size32 = view.getUint32(at);
    const header = size32 === 1 ? 16 : 8;
    if (at + header > end) {
      return bad("media-samples: truncated extended box header");
    }
    const size =
      size32 === 0
        ? end - at
        : size32 === 1
          ? view.getUint32(at + 8) * 2 ** 32 + view.getUint32(at + 12)
          : size32;
    if (!Number.isSafeInteger(size) || size < header || at + size > end) {
      return bad("media-samples: invalid box range");
    }
    boxes.push({
      type: String.fromCodePoint(...bytes.subarray(at + 4, at + 8)),
      start: at,
      body: at + header,
      end: at + size,
    });
    at += size;
  }
  return boxes;
};

const childrenOf = (
  bytes: Uint8Array,
  box: Box,
  type: string
): readonly Box[] =>
  mediaBoxes(bytes, box.body, box.end).filter((child) => child.type === type);
const mediaContent = (bytes: Uint8Array): readonly Uint8Array[] => {
  const boxes = mediaBoxes(bytes);
  const parts = boxes
    .filter((box) => box.type === "mdat")
    .map((box) => bytes.subarray(box.body, box.end));
  if (parts.every((part) => part.length === 0)) {
    return bad("media-samples: no sample payload");
  }
  const movies = boxes.filter((box) => box.type === "moov");
  if (movies.length !== 1) {
    return bad("media-samples: one movie box is required");
  }
  const tracks = movies.flatMap((movie) => childrenOf(bytes, movie, "trak"));
  const counts = tracks.map((track) => {
    const sizes = childrenOf(bytes, track, "mdia")
      .flatMap((mdia) => childrenOf(bytes, mdia, "minf"))
      .flatMap((minf) => childrenOf(bytes, minf, "stbl"))
      .flatMap((stbl) =>
        mediaBoxes(bytes, stbl.body, stbl.end).filter((box) =>
          ["stsz", "stz2"].includes(box.type)
        )
      );
    const [size] = sizes;
    if (sizes.length !== 1 || size === undefined || size.end - size.body < 12) {
      return bad(
        "media-samples: invalid or missing sample count; fragmented media is read only"
      );
    }
    return bytes.subarray(size.body + 8, size.body + 12);
  });
  if (counts.length === 0) {
    return bad("media-samples: no tracks");
  }
  return [...parts, ...counts];
};

/** Frame every part with its length so concatenation cannot hide a boundary change. */
const hashParts = async (parts: readonly Uint8Array[]): Promise<string> => {
  const length = parts.reduce((sum, part) => sum + 8 + part.length, 0);
  const data = new Uint8Array(length);
  const view = new DataView(data.buffer);
  let offset = 0;
  for (const part of parts) {
    view.setBigUint64(offset, BigInt(part.length));
    data.set(part, offset + 8);
    offset += 8 + part.length;
  }
  const hash = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(hash)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
};
interface ContentParts {
  readonly kind: ContentCheck["kind"];
  readonly parts: readonly Uint8Array[];
  readonly count: number | null;
}
const contentOf = (bytes: Uint8Array, format: FileFormat): ContentParts => {
  const family = familyOf(format);
  if (family === "office") {
    const entries = officeEntries(bytes).filter(
      (entry) => !OFFICE_PARTS.has(entry.name)
    );
    const encoder = new TextEncoder();
    return {
      kind: "office-parts",
      count: entries.length,
      parts: entries.flatMap((entry) => [
        encoder.encode(entry.name),
        encoder.encode(`${entry.method}:${entry.size}:${entry.crc}`),
        entry.data,
      ]),
    };
  }
  if (family === "video" || family === "audio") {
    const parts = mediaContent(bytes);
    return { kind: "media-samples", parts, count: parts.length };
  }
  const payload = payloadOf(bytes, format);
  if (payload === null) {
    return bad("image-payload: this layout cannot be verified");
  }
  return { kind: "image-payload", parts: [payload], count: null };
};
export const checkContent = async (
  before: Uint8Array,
  after: Uint8Array,
  format: FileFormat
): Promise<ContentCheck> => {
  const left = contentOf(before, format);
  const right = contentOf(after, format);
  const [beforeHash, afterHash] = await Promise.all([
    hashParts(left.parts),
    hashParts(right.parts),
  ]);
  return {
    kind: left.kind,
    parts: left.count,
    beforeHash,
    afterHash,
    unchanged: beforeHash === afterHash && left.count === right.count,
  };
};
