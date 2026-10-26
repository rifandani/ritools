/* eslint-disable eslint/no-bitwise, eslint/complexity, eslint/no-unmodified-loop-condition, unicorn/prefer-code-point -- the payload digest walks byte-exact image containers */
/* oxlint-disable anti-slop/no-unknown-parameters, anti-slop/require-safety-comment-for-type-assertion -- the digest is the boundary that extracts image bytes from untrusted containers */
import type { FileFormat } from "@/features/expose/expose";

/**
 * The image payload digest.
 *
 * A clean must not re-encode the image. Comparing a digest of only the image
 * data proves that: metadata containers may move, but the pixels do not.
 */

const readU32 = (bytes: Uint8Array, offset: number): number =>
  ((bytes[offset] ?? 0) * 0x1_00_00_00 +
    ((bytes[offset + 1] ?? 0) << 16) +
    ((bytes[offset + 2] ?? 0) << 8) +
    (bytes[offset + 3] ?? 0)) >>>
  0;

const readU16 = (bytes: Uint8Array, offset: number): number =>
  ((bytes[offset] ?? 0) << 8) | (bytes[offset + 1] ?? 0);

const concat = (parts: readonly Uint8Array[]): Uint8Array => {
  const total = parts.reduce((sum, part) => sum + part.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const part of parts) {
    out.set(part, offset);
    offset += part.length;
  }
  return out;
};

const jpegPayload = (bytes: Uint8Array): Uint8Array | null => {
  let offset = 2;
  while (offset + 4 <= bytes.length) {
    if (bytes[offset] !== 0xff) {
      break;
    }
    const marker = bytes[offset + 1] ?? 0;
    if (marker === 0xda) {
      return bytes.subarray(offset);
    }
    if (
      marker === 0xd8 ||
      marker === 0xd9 ||
      (marker >= 0xd0 && marker <= 0xd7)
    ) {
      offset += 2;
      continue;
    }
    const length = readU16(bytes, offset + 2);
    if (length < 2) {
      break;
    }
    offset += 2 + length;
  }
  return null;
};

const pngPayload = (bytes: Uint8Array): Uint8Array | null => {
  const parts: Uint8Array[] = [];
  let offset = 8;
  while (offset + 8 <= bytes.length) {
    const length = readU32(bytes, offset);
    const type = String.fromCharCode(...bytes.subarray(offset + 4, offset + 8));
    const start = offset + 8;
    const end = start + length;
    if (end + 4 > bytes.length) {
      break;
    }
    if (type === "IDAT") {
      parts.push(bytes.subarray(start, end));
    }
    offset = end + 4;
  }
  return parts.length > 0 ? concat(parts) : null;
};

const webpPayload = (bytes: Uint8Array): Uint8Array | null => {
  const parts: Uint8Array[] = [];
  let offset = 12;
  while (offset + 8 <= bytes.length) {
    const type = String.fromCharCode(...bytes.subarray(offset, offset + 4));
    const length =
      (bytes[offset + 4] ?? 0) +
      ((bytes[offset + 5] ?? 0) << 8) +
      ((bytes[offset + 6] ?? 0) << 16) +
      (bytes[offset + 7] ?? 0) * 0x1_00_00_00;
    const start = offset + 8;
    const end = start + length;
    if (end > bytes.length) {
      break;
    }
    if (type === "VP8 " || type === "VP8L" || type === "ANMF") {
      parts.push(bytes.subarray(start, end));
    }
    offset = end + (length % 2);
  }
  return parts.length > 0 ? concat(parts) : null;
};

const readN = (bytes: Uint8Array, offset: number, size: number): number => {
  let value = 0;
  for (let index = 0; index < size; index += 1) {
    value = value * 256 + (bytes[offset + index] ?? 0);
  }
  return value;
};

/**
 * The primary image item of a HEIC or AVIF file, from `pitm` and `iloc`.
 * Metadata also lives in `mdat`, so hashing the whole box would report a
 * changed payload after a clean that only removed an item.
 */
const bmffItemPayload = (bytes: Uint8Array): Uint8Array | null => {
  let primaryId: number | null = null;
  let location: { length: number; offset: number } | null = null;
  const walk = (start: number, end: number, depth: number): void => {
    let offset = start;
    while (offset + 8 <= end && depth < 5) {
      let size = readU32(bytes, offset);
      const type = String.fromCharCode(
        ...bytes.subarray(offset + 4, offset + 8)
      );
      let header = 8;
      if (size === 1 && offset + 16 <= end) {
        size =
          readU32(bytes, offset + 8) * 2 ** 32 + readU32(bytes, offset + 12);
        header = 16;
      } else if (size === 0) {
        size = end - offset;
      }
      if (size < header || offset + size > end) {
        return;
      }
      const body = offset + header;
      if (type === "meta") {
        walk(body + 4, offset + size, depth + 1);
      } else if (type === "pitm") {
        const version = bytes[body] ?? 0;
        primaryId =
          version === 0 ? readU16(bytes, body + 4) : readU32(bytes, body + 4);
      } else if (type === "iloc") {
        const version = bytes[body] ?? 0;
        const sizes = bytes[body + 4] ?? 0;
        const offsetSize = sizes >> 4;
        const lengthSize = sizes & 0x0f;
        const baseSizes = bytes[body + 5] ?? 0;
        const baseSize = baseSizes >> 4;
        const indexSize = version === 1 || version === 2 ? baseSizes & 0x0f : 0;
        let cursor = body + 6;
        const itemCount = readU16(bytes, cursor);
        cursor += 2;
        for (let item = 0; item < itemCount; item += 1) {
          const idSize = version === 2 ? 4 : 2;
          const id = readN(bytes, cursor, idSize);
          cursor += idSize;
          let constructionMethod = 0;
          if (version === 1 || version === 2) {
            constructionMethod = readU16(bytes, cursor) & 0x0f;
            cursor += 2;
          }
          const dataReferenceIndex = readU16(bytes, cursor);
          cursor += 2;
          const base = readN(bytes, cursor, baseSize);
          cursor += baseSize;
          const extentCount = readU16(bytes, cursor);
          cursor += 2;
          if (
            primaryId !== null &&
            id === primaryId &&
            dataReferenceIndex === 0
          ) {
            for (let extent = 0; extent < extentCount; extent += 1) {
              if (indexSize > 0 && (version === 1 || version === 2)) {
                cursor += indexSize;
              }
              const extentOffset = readN(bytes, cursor, offsetSize);
              cursor += offsetSize;
              const extentLength = readN(bytes, cursor, lengthSize);
              cursor += lengthSize;
              if (constructionMethod === 0 && location === null) {
                location = {
                  length: extentLength,
                  offset: base + extentOffset,
                };
              }
            }
          } else {
            for (let extent = 0; extent < extentCount; extent += 1) {
              if (indexSize > 0 && (version === 1 || version === 2)) {
                cursor += indexSize;
              }
              cursor += offsetSize + lengthSize;
            }
          }
        }
      } else if (type === "moov" || type === "trak" || type === "mdia") {
        walk(body, offset + size, depth + 1);
      }
      offset += size;
    }
  };
  walk(0, bytes.length, 0);
  const found = location as { length: number; offset: number } | null;
  if (
    found === null ||
    found.length === 0 ||
    found.offset + found.length > bytes.length
  ) {
    return null;
  }
  return bytes.subarray(found.offset, found.offset + found.length);
};

const bmffPayload = (
  bytes: Uint8Array,
  format: FileFormat
): Uint8Array | null => {
  const parts: Uint8Array[] = [];
  const walk = (start: number, end: number, depth: number): void => {
    let offset = start;
    while (offset + 8 <= end && depth < 4) {
      let size = readU32(bytes, offset);
      const type = String.fromCharCode(
        ...bytes.subarray(offset + 4, offset + 8)
      );
      let header = 8;
      if (size === 1 && offset + 16 <= end) {
        const high = readU32(bytes, offset + 8);
        const low = readU32(bytes, offset + 12);
        size = high * 2 ** 32 + low;
        header = 16;
      } else if (size === 0) {
        size = end - offset;
      }
      if (size < header || offset + size > end) {
        return;
      }
      const body = offset + header;
      if (
        type === "mdat" ||
        (format === "jxl" && (type === "jxlc" || type === "jxlp"))
      ) {
        parts.push(bytes.subarray(body, offset + size));
      } else if (
        type === "meta" ||
        type === "moov" ||
        type === "trak" ||
        type === "mdia" ||
        type === "minf" ||
        type === "stbl"
      ) {
        walk(type === "meta" ? body + 4 : body, offset + size, depth + 1);
      }
      offset += size;
    }
  };
  walk(0, bytes.length, 0);
  if (parts.length > 0) {
    return concat(parts);
  }
  if (format === "jxl") {
    const start =
      String.fromCharCode(...bytes.subarray(0, 4)) ===
      "\u0000\u0000\u0000\u000C";
    return start ? null : bytes;
  }
  return null;
};

const tiffPayload = (bytes: Uint8Array): Uint8Array | null => {
  if (bytes.length < 8) {
    return null;
  }
  const little = bytes[0] === 0x49;
  const u16 = (offset: number): number =>
    little
      ? (bytes[offset] ?? 0) | ((bytes[offset + 1] ?? 0) << 8)
      : readU16(bytes, offset);
  const u32 = (offset: number): number => {
    if (little) {
      return (
        (bytes[offset] ?? 0) +
        ((bytes[offset + 1] ?? 0) << 8) +
        ((bytes[offset + 2] ?? 0) << 16) +
        (bytes[offset + 3] ?? 0) * 0x1_00_00_00
      );
    }
    return readU32(bytes, offset);
  };
  const ifd = u32(4);
  if (ifd < 8 || ifd + 2 > bytes.length) {
    return null;
  }
  const count = u16(ifd);
  const offsets: number[] = [];
  const counts: number[] = [];
  for (let index = 0; index < count; index += 1) {
    const entry = ifd + 2 + index * 12;
    if (entry + 12 > bytes.length) {
      break;
    }
    const tag = u16(entry);
    const type = u16(entry + 2);
    const length = u32(entry + 4);
    const size =
      type === 3 ? length * 2 : type === 4 || type === 9 ? length * 4 : length;
    const valueOffset = size <= 4 ? entry + 8 : u32(entry + 8);
    if (tag === 273 || tag === 324) {
      for (let item = 0; item < length; item += 1) {
        offsets.push(u32(valueOffset + item * 4));
      }
    } else if (tag === 279 || tag === 325) {
      for (let item = 0; item < length; item += 1) {
        counts.push(u32(valueOffset + item * 4));
      }
    }
  }
  if (offsets.length === 0 || offsets.length !== counts.length) {
    return null;
  }
  const parts: Uint8Array[] = [];
  for (let index = 0; index < offsets.length; index += 1) {
    const start = offsets[index] ?? 0;
    const length = counts[index] ?? 0;
    if (start + length <= bytes.length) {
      parts.push(bytes.subarray(start, start + length));
    }
  }
  return parts.length > 0 ? concat(parts) : null;
};

const gifPayload = (bytes: Uint8Array): Uint8Array | null => {
  const parts: Uint8Array[] = [];
  let offset = 13;
  if (bytes.length >= 13 && ((bytes[10] ?? 0) & 0x80) !== 0) {
    offset += 3 * 2 ** (((bytes[10] ?? 0) & 0x07) + 1);
  }
  while (offset < bytes.length) {
    const block = bytes[offset] ?? 0;
    if (block === 0x3b) {
      break;
    }
    if (block === 0x21) {
      offset += 2;
      while (offset < bytes.length) {
        const size = bytes[offset] ?? 0;
        offset += 1;
        if (size === 0) {
          break;
        }
        offset += size;
      }
      continue;
    }
    if (block === 0x2c) {
      const start = offset;
      offset += 10;
      if (((bytes[start + 9] ?? 0) & 0x80) !== 0) {
        offset += 3 * 2 ** (((bytes[start + 9] ?? 0) & 0x07) + 1);
      }
      offset += 1;
      while (offset < bytes.length) {
        const size = bytes[offset] ?? 0;
        offset += 1;
        if (size === 0) {
          break;
        }
        offset += size;
      }
      parts.push(bytes.subarray(start, offset));
      continue;
    }
    offset += 1;
  }
  return parts.length > 0 ? concat(parts) : null;
};

/** The bytes that carry the image itself, or `null` when the format is opaque. */
export const payloadOf = (
  bytes: Uint8Array,
  format: FileFormat
): Uint8Array | null => {
  if (format === "jpeg") {
    return jpegPayload(bytes);
  }
  if (format === "png") {
    return pngPayload(bytes);
  }
  if (format === "webp") {
    return webpPayload(bytes);
  }
  if (format === "gif") {
    return gifPayload(bytes);
  }
  if (format === "tiff") {
    return tiffPayload(bytes);
  }
  if (format === "heic" || format === "avif") {
    return bmffItemPayload(bytes) ?? bmffPayload(bytes, format);
  }
  if (format === "jxl") {
    return bmffPayload(bytes, format);
  }
  return null;
};

const toHex = (buffer: ArrayBuffer): string =>
  [...new Uint8Array(buffer)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");

/** A SHA-256 of the image payload. */
export const payloadHash = async (
  bytes: Uint8Array,
  format: FileFormat
): Promise<string> => {
  const payload = payloadOf(bytes, format) ?? bytes;
  const copy = new Uint8Array(payload);
  const digest = await crypto.subtle.digest("SHA-256", copy);
  return toHex(digest);
};
