/* eslint-disable eslint/no-bitwise -- The PNG checksum is a bitwise sum. */

/**
 * The provenance that rides inside every shipped raster.
 *
 * A PNG carries a `tEXt` chunk with the keyword the design tooling reads, so
 * the file says what it is without a sidecar. The build script stamps the
 * brand vectors; the Open Graph card stamps the poster it draws on request.
 *
 * The chunk code works on bytes only: no `Buffer`, no filesystem. The card may
 * run in a Worker, and the build script and the card must write the same chunk.
 */

/** The keyword the provenance is written under. */
export const PROVENANCE_KEY = "impeccable:prompt";

const CRC_TABLE = Array.from({ length: 256 }, (_, index) => {
  let value = index;
  for (let bit = 0; bit < 8; bit += 1) {
    value = value & 1 ? 0xed_b8_83_20 ^ (value >>> 1) : value >>> 1;
  }
  return value >>> 0;
});

const crc32 = (bytes: Uint8Array) => {
  let crc = 0xff_ff_ff_ff;
  for (const byte of bytes) {
    // SAFETY: The table holds 256 entries, so the index is in range.
    const table = CRC_TABLE[(crc ^ byte) & 0xff] as number;
    crc = table ^ (crc >>> 8);
  }
  return (crc ^ 0xff_ff_ff_ff) >>> 0;
};

/** A `tEXt` chunk is Latin-1. Every origin line this app writes is ASCII. */
const latin1 = (value: string) =>
  Uint8Array.from([...value].map((char) => (char.codePointAt(0) ?? 0) & 0xff));

/** The same, read back: a chunk data run as text. */
const textOf = (bytes: Uint8Array) => {
  let text = "";
  for (const byte of bytes) {
    text += String.fromCodePoint(byte);
  }
  return text;
};

/** A PNG stores its lengths big-endian. */
const readUint32 = (bytes: Uint8Array, at: number) =>
  new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength).getUint32(at);

const uint32Bytes = (value: number) => {
  const bytes = new Uint8Array(4);
  new DataView(bytes.buffer).setUint32(0, value >>> 0);
  return bytes;
};

const concat = (parts: readonly Uint8Array[]): Uint8Array<ArrayBuffer> => {
  const out = new Uint8Array(
    parts.reduce((total, part) => total + part.length, 0)
  );
  let at = 0;
  for (const part of parts) {
    out.set(part, at);
    at += part.length;
  }
  return out;
};

/** One chunk of a PNG: its type, its data, and where it starts. */
interface Chunk {
  at: number;
  data: Uint8Array;
  length: number;
  type: string;
}

/** Every chunk of one image, and where its end chunk starts. */
const scan = (png: Uint8Array) => {
  const chunks: Chunk[] = [];
  let at = 8;
  while (at < png.length) {
    const length = readUint32(png, at);
    const type = textOf(png.subarray(at + 4, at + 8));
    chunks.push({
      at,
      data: png.subarray(at + 8, at + 8 + length),
      length,
      type,
    });
    if (type === "IEND") {
      return { chunks, iendAt: at };
    }
    at += 12 + length;
  }
  throw new Error("The PNG holds no IEND chunk.");
};

/** The keyword of a `tEXt` chunk, or `null` for any other chunk. */
const keywordOf = (chunk: Chunk) => {
  if (chunk.type !== "tEXt") {
    return null;
  }
  // A tEXt chunk always separates its keyword with a null; a malformed one
  // reads as an empty keyword and is then simply not ours.
  const end = Math.max(0, chunk.data.indexOf(0));
  return textOf(chunk.data.subarray(0, end));
};

const isProvenance = (chunk: Chunk) => keywordOf(chunk) === PROVENANCE_KEY;

const sizeOf = (chunk: Chunk) => 12 + chunk.length;

/** The PNG without a provenance chunk, so the origin is written once. */
const withoutProvenance = (png: Uint8Array) => {
  const { chunks, iendAt } = scan(png);
  const kept: Uint8Array[] = [png.subarray(0, 8)];
  let removed = 0;
  for (const chunk of chunks) {
    if (isProvenance(chunk)) {
      removed += sizeOf(chunk);
    } else {
      kept.push(png.subarray(chunk.at, chunk.at + sizeOf(chunk)));
    }
  }
  return { iendAt: iendAt - removed, png: concat(kept) };
};

/** Writes the origin of a raster into the file, before `IEND`. */
export const embedProvenance = (
  png: Uint8Array,
  origin: string
): Uint8Array<ArrayBuffer> => {
  const clean = withoutProvenance(png);
  const data = new Uint8Array([
    ...latin1(PROVENANCE_KEY),
    0,
    ...latin1(origin),
  ]);
  const body = new Uint8Array([...latin1("tEXt"), ...data]);
  const chunk = concat([
    uint32Bytes(data.length),
    body,
    uint32Bytes(crc32(body)),
  ]);
  return concat([
    clean.png.subarray(0, clean.iendAt),
    chunk,
    clean.png.subarray(clean.iendAt),
  ]);
};

/** Reads the origin of a raster, for the tests and the design tooling. */
export const readProvenance = (png: Uint8Array) => {
  for (const chunk of scan(png).chunks) {
    if (isProvenance(chunk)) {
      return textOf(chunk.data.subarray(PROVENANCE_KEY.length + 1));
    }
  }
  return null;
};
