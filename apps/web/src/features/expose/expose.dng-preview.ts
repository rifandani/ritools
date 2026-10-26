/* eslint-disable eslint/complexity, eslint/no-bitwise -- JPEG marker lengths and PNG checksums use byte-level rules */
import { zlibSync } from "fflate";
/** Bound both the copied bytes and the browser's decoded pixel allocation. */
export const MAX_DNG_PREVIEW_BYTES = 16 * 1024 * 1024;
const MAX_PIXELS = 24_000_000;
const MAX_MARKERS = 4096;

/** Accept complete 8-bit baseline/progressive JPEG streams. No RAW JPEG decode. */
export const dngJpegSize = (
  bytes: Uint8Array
): { width: number; height: number } | null => {
  if (
    bytes.length < 4 ||
    bytes.length > MAX_DNG_PREVIEW_BYTES ||
    bytes[0] !== 0xff ||
    bytes[1] !== 0xd8
  ) {
    return null;
  }
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let offset = 2;
  let size: { width: number; height: number } | null = null;
  let scanning = false;
  let sawScan = false;
  let markers = 0;
  while (offset < bytes.length && markers < MAX_MARKERS) {
    if (scanning && bytes[offset] !== 0xff) {
      offset += 1;
      continue;
    }
    if (bytes[offset] !== 0xff) {
      return null;
    }
    while (bytes[offset] === 0xff) {
      offset += 1;
    }
    const marker = bytes[offset];
    offset += 1;
    if (
      scanning &&
      (marker === 0 ||
        (marker !== undefined && marker >= 0xd0 && marker <= 0xd7))
    ) {
      continue;
    }
    markers += 1;
    scanning = false;
    if (marker === 0xd9) {
      return sawScan && offset === bytes.length ? size : null;
    }
    if (marker === undefined || offset + 2 > bytes.length) {
      return null;
    }
    // Only Huffman tables, quantization tables, restart intervals, comments,
    // application data, and the supported frame/scan markers are accepted.
    if (
      ![0xc0, 0xc2, 0xc4, 0xdb, 0xdd, 0xda, 0xfe].includes(marker) &&
      !(marker >= 0xe0 && marker <= 0xef)
    ) {
      return null;
    }
    const length = view.getUint16(offset);
    if (length < 2 || offset > bytes.length - length) {
      return null;
    }
    if (marker === 0xc0 || marker === 0xc2) {
      if (size !== null || length < 8 || bytes[offset + 2] !== 8) {
        return null;
      }
      const height = view.getUint16(offset + 3);
      const width = view.getUint16(offset + 5);
      const components = bytes[offset + 7] ?? 0;
      if (
        ![1, 3].includes(components) ||
        length !== 8 + components * 3 ||
        width === 0 ||
        height === 0 ||
        width > 16_384 ||
        height > 16_384 ||
        width * height > MAX_PIXELS
      ) {
        return null;
      }
      size = { width, height };
    }
    if (marker === 0xda) {
      const components = bytes[offset + 2] ?? 0;
      if (
        size === null ||
        components < 1 ||
        components > 3 ||
        length !== 6 + components * 2
      ) {
        return null;
      }
      scanning = true;
      sawScan = true;
    }
    offset += length;
  }
  return null;
};

const CRC_TABLE = Array.from({ length: 256 }, (_, index) => {
  let value = index;
  for (let bit = 0; bit < 8; bit += 1) {
    value = (value & 1) === 1 ? 0xed_b8_83_20 ^ (value >>> 1) : value >>> 1;
  }
  return value >>> 0;
});

const pngChunk = (type: string, data: Uint8Array): Uint8Array => {
  const chunk = new Uint8Array(data.length + 12);
  const view = new DataView(chunk.buffer);
  view.setUint32(0, data.length);
  chunk.set(new TextEncoder().encode(type), 4);
  chunk.set(data, 8);
  let crc = 0xff_ff_ff_ff;
  for (const byte of chunk.subarray(4, -4)) {
    crc = (CRC_TABLE[(crc ^ byte) & 0xff] ?? 0) ^ (crc >>> 8);
  }
  view.setUint32(chunk.length - 4, (crc ^ 0xff_ff_ff_ff) >>> 0);
  return chunk;
};

/** Convert only an already-rendered 8-bit RGB preview. Never interpret RAW samples. */
export const rgbDngPreview = (
  rgb: Uint8Array,
  width: number,
  height: number,
  orientation: number
): Uint8Array | null => {
  if (
    width < 1 ||
    height < 1 ||
    width > 16_384 ||
    height > 16_384 ||
    width * height > MAX_PIXELS ||
    rgb.length !== width * height * 3 ||
    rgb.length > MAX_DNG_PREVIEW_BYTES ||
    orientation < 1 ||
    orientation > 8
  ) {
    return null;
  }
  const swapped = orientation >= 5;
  const outputWidth = swapped ? height : width;
  const outputHeight = swapped ? width : height;
  const mirrorX = [2, 3, 6, 7].includes(orientation);
  const mirrorY = [3, 4, 7, 8].includes(orientation);
  const stride = outputWidth * 3 + 1;
  // Each PNG row starts with filter 0. Orientation is applied once to the RGB pixels.
  const rows = new Uint8Array(stride * outputHeight);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const targetX = mirrorX
        ? outputWidth - 1 - (swapped ? y : x)
        : swapped
          ? y
          : x;
      const targetY = mirrorY
        ? outputHeight - 1 - (swapped ? x : y)
        : swapped
          ? x
          : y;
      const source = (y * width + x) * 3;
      const target = targetY * stride + 1 + targetX * 3;
      rows[target] = rgb[source] ?? 0;
      rows[target + 1] = rgb[source + 1] ?? 0;
      rows[target + 2] = rgb[source + 2] ?? 0;
    }
  }
  const header = new Uint8Array(13);
  const view = new DataView(header.buffer);
  view.setUint32(0, outputWidth);
  view.setUint32(4, outputHeight);
  header.set([8, 2], 8);
  const parts = [
    new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]),
    pngChunk("IHDR", header),
    pngChunk("IDAT", zlibSync(rows, { level: 1 })),
    pngChunk("IEND", new Uint8Array(0)),
  ];
  const size = parts.reduce((total, part) => total + part.length, 0);
  if (size > MAX_DNG_PREVIEW_BYTES) {
    return null;
  }
  const png = new Uint8Array(size);
  let offset = 0;
  for (const part of parts) {
    png.set(part, offset);
    offset += part.length;
  }
  return png;
};
