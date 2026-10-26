/* eslint-disable eslint/complexity, eslint/no-bitwise -- the signature table and bounded EBML reader operate on untrusted container bytes */
import type { FileFormat } from "@/features/expose/expose";
import { hasDngVersion } from "@/features/expose/expose.dng";
import { officeFormatOf } from "@/features/expose/expose.office";

const ascii = (bytes: Uint8Array, start: number, end: number): string =>
  String.fromCodePoint(...bytes.subarray(start, end));

/** Identity comes from bytes. A name cannot grant a writable format. */
export const sniffFormat = (
  bytes: Uint8Array,
  _name = ""
): FileFormat | null => {
  if (hasDngVersion(bytes)) {
    return "dng";
  }
  if (
    bytes.length >= 3 &&
    bytes[0] === 0xff &&
    bytes[1] === 0xd8 &&
    bytes[2] === 0xff
  ) {
    return "jpeg";
  }
  if (bytes.length >= 8 && ascii(bytes, 0, 8) === "\u0089PNG\r\n\u001A\n") {
    return "png";
  }
  if (bytes.length >= 13 && ["GIF87a", "GIF89a"].includes(ascii(bytes, 0, 6))) {
    return "gif";
  }
  if (
    bytes.length >= 8 &&
    ["II*\u0000", "MM\u0000*", "II+\u0000", "MM\u0000+"].includes(
      ascii(bytes, 0, 4)
    )
  ) {
    return "tiff";
  }
  if (bytes.length >= 2 && bytes[0] === 0xff && bytes[1] === 0x0a) {
    return "jxl";
  }
  if (bytes.length >= 12 && ascii(bytes, 0, 4) === "RIFF") {
    const kind = ascii(bytes, 8, 12);
    if (kind === "WEBP") {
      return "webp";
    }
    if (kind === "WAVE") {
      return "wav";
    }
    if (kind === "AVI ") {
      return "avi";
    }
  }
  if (
    bytes.length >= 12 &&
    ascii(bytes, 0, 12) === "\u0000\u0000\u0000\u000CJXL \r\n\u0087\n"
  ) {
    return "jxl";
  }
  if (bytes.length >= 16 && ascii(bytes, 4, 8) === "ftyp") {
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    const size = view.getUint32(0);
    if (size < 16 || size > bytes.length || size > 4096) {
      return null;
    }
    const brands = [ascii(bytes, 8, 12)];
    for (let at = 16; at + 4 <= size; at += 4) {
      brands.push(ascii(bytes, at, at + 4));
    }
    if (brands.some((brand) => ["avif", "avis"].includes(brand))) {
      return "avif";
    }
    if (
      brands.some((brand) =>
        ["heic", "heix", "hevc", "hevx", "mif1", "msf1"].includes(brand)
      )
    ) {
      return "heic";
    }
    if (brands.includes("qt  ")) {
      return "mov";
    }
    if (brands.some((brand) => ["M4A ", "M4B ", "M4P "].includes(brand))) {
      return "m4a";
    }
    if (brands.includes("M4V ")) {
      return "m4v";
    }
    if (
      brands.some((brand) =>
        ["isom", "iso2", "mp41", "mp42", "avc1"].includes(brand)
      )
    ) {
      return "mp4";
    }
  }
  if (bytes.length >= 8 && ascii(bytes, 0, 5) === "%PDF-") {
    return "pdf";
  }
  if (bytes.length >= 10 && ascii(bytes, 0, 3) === "ID3") {
    return "mp3";
  }
  if (
    bytes.length >= 4 &&
    bytes[0] === 0xff &&
    ((bytes[1] ?? 0) & 0xe0) === 0xe0 &&
    ((bytes[1] ?? 0) & 6) !== 0 &&
    ((bytes[2] ?? 0) & 0xf0) !== 0xf0 &&
    ((bytes[2] ?? 0) & 0xf0) !== 0
  ) {
    return "mp3";
  }
  if (bytes.length >= 8 && ascii(bytes, 0, 4) === "fLaC") {
    return "flac";
  }
  if (bytes.length >= 27 && ascii(bytes, 0, 4) === "OggS") {
    return "ogg";
  }
  if (
    bytes.length >= 8 &&
    bytes[0] === 0x1a &&
    bytes[1] === 0x45 &&
    bytes[2] === 0xdf &&
    bytes[3] === 0xa3
  ) {
    // EBML header is bounded. Read DocType (0x4282), not a string in media data.
    const vint = (offset: number): { size: number; value: number } | null => {
      const first = bytes[offset] ?? 0;
      let size = 1;
      while (size <= 8 && (first & (0x80 >> (size - 1))) === 0) {
        size += 1;
      }
      if (size > 8 || offset + size > bytes.length) {
        return null;
      }
      let value = first & ((0x80 >> (size - 1)) - 1);
      for (let i = 1; i < size; i += 1) {
        value = value * 256 + (bytes[offset + i] ?? 0);
      }
      return Number.isSafeInteger(value) ? { size, value } : null;
    };
    const header = vint(4);
    if (header === null || header.value > 4096) {
      return null;
    }
    const end = 4 + header.size + header.value;
    if (end > bytes.length) {
      return null;
    }
    let at = 4 + header.size;
    while (at < end) {
      const id = vint(at);
      if (id === null) {
        return null;
      }
      const docType = bytes[at] === 0x42 && bytes[at + 1] === 0x82;
      at += id.size;
      const size = vint(at);
      if (size === null) {
        return null;
      }
      at += size.size;
      if (at + size.value > end) {
        return null;
      }
      if (docType) {
        const type = ascii(bytes, at, at + size.value);
        return type === "webm" ? "webm" : type === "matroska" ? "mkv" : null;
      }
      at += size.value;
    }
    return null;
  }
  if (bytes.length >= 4 && ascii(bytes, 0, 4) === "PK\u0003\u0004") {
    return officeFormatOf(bytes);
  }
  return null;
};
