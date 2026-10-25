/* eslint-disable eslint/complexity -- the bounded TIFF graph walk checks each directory, image range, and required descriptor */
import {
  dngJpegSize,
  rgbDngPreview,
  MAX_DNG_PREVIEW_BYTES,
} from "@/features/expose/expose.dng-preview";

/** Bounded TIFF directory checks for the read-only DNG subset. No RAW decode. */
const TYPE_BYTES = new Map([
  [1, 1],
  [2, 1],
  [3, 2],
  [4, 4],
  [5, 8],
  [6, 1],
  [7, 1],
  [8, 2],
  [9, 4],
  [10, 8],
  [11, 4],
  [12, 8],
  [13, 4],
]);
const POINTERS = new Set([330, 34_665, 34_853, 40_965]);
const MAX_DIRECTORIES = 128;
const MAX_ENTRIES = 16_384;
const MAX_VALUES = 65_536;
// These ranges are checked when their image is used, not as metadata payloads.
const IMAGE_RANGES = new Set([273, 279, 324, 325, 513, 514]);

const tiffView = (bytes: Uint8Array) =>
  new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);

/** Identity comes from IFD0's DNGVersion tag, never from the file name. */
export const hasDngVersion = (bytes: Uint8Array): boolean => {
  if (bytes.length < 8) {
    return false;
  }
  const little = bytes[0] === 0x49 && bytes[1] === 0x49;
  if (!little && !(bytes[0] === 0x4d && bytes[1] === 0x4d)) {
    return false;
  }
  const view = tiffView(bytes);
  const magic = view.getUint16(2, little);
  const big = magic === 43;
  if ((magic !== 42 && !big) || (big && bytes.length < 16)) {
    return false;
  }
  const offset = big
    ? Number(view.getBigUint64(8, little))
    : view.getUint32(4, little);
  const countBytes = big ? 8 : 2;
  const entryBytes = big ? 20 : 12;
  if (offset < (big ? 16 : 8) || offset > bytes.length - countBytes) {
    return false;
  }
  const count = big
    ? Number(view.getBigUint64(offset, little))
    : view.getUint16(offset, little);
  const available = Math.floor(
    (bytes.length - offset - countBytes) / entryBytes
  );
  // A partial table can still identify a damaged DNG. Validation rejects it.
  for (
    let index = 0;
    index < Math.min(count, available, MAX_ENTRIES);
    index += 1
  ) {
    if (
      view.getUint16(offset + countBytes + index * entryBytes, little) ===
      50_706
    ) {
      return true;
    }
  }
  return false;
};

interface Entry {
  readonly type: number;
  readonly count: number;
  readonly offset: number;
}
interface DngFacts {
  readonly width: number;
  readonly height: number;
  readonly orientation: number;
  readonly preview: Uint8Array | null;
  readonly properties: readonly {
    readonly label: string;
    readonly value: string;
  }[];
}
type DngRead =
  | { readonly kind: "read"; readonly facts: DngFacts }
  | {
      readonly kind: "unreadable-file" | "unsupported-format";
      readonly detail: string;
    };

class DngLayoutError extends Error {
  readonly code: "unreadable-file" | "unsupported-format";
  constructor(
    message: string,
    code: "unreadable-file" | "unsupported-format" = "unreadable-file"
  ) {
    super(message);
    this.name = "DngLayoutError";
    this.code = code;
  }
}

const inspect = (bytes: Uint8Array): DngFacts => {
  const view = tiffView(bytes);
  const little = bytes[0] === 0x49;
  if (view.getUint16(2, little) !== 42) {
    throw new DngLayoutError(
      "BigTIFF DNG is not supported",
      "unsupported-format"
    );
  }
  const range = (offset: number, size: number): void => {
    if (offset < 8 || size < 1 || offset > bytes.length - size) {
      throw new DngLayoutError("DNG data is missing or outside the file");
    }
  };
  const values = (entry: Entry | undefined): readonly number[] => {
    if (entry === undefined) {
      return [];
    }
    if (entry.count > MAX_VALUES) {
      throw new DngLayoutError(
        "DNG value count exceeds the reader limit",
        "unsupported-format"
      );
    }
    if (![1, 3, 4, 13].includes(entry.type)) {
      throw new DngLayoutError("DNG structural field has an invalid type");
    }
    if (entry.count > 0) {
      range(entry.offset, entry.count * (TYPE_BYTES.get(entry.type) ?? 0));
    }
    return Array.from({ length: entry.count }, (_, index) => {
      if (entry.type === 1) {
        return view.getUint8(entry.offset + index);
      }
      return entry.type === 3
        ? view.getUint16(entry.offset + index * 2, little)
        : view.getUint32(entry.offset + index * 4, little);
    });
  };
  const one = (
    entries: ReadonlyMap<number, Entry>,
    tag: number,
    fallback = 0
  ): number => {
    const found = values(entries.get(tag));
    if (found.length > 1) {
      throw new DngLayoutError("DNG scalar field has multiple values");
    }
    return found[0] ?? fallback;
  };
  const segments = (
    entries: ReadonlyMap<number, Entry>,
    offsetsTag: number,
    countsTag: number
  ): number => {
    const offsets = values(entries.get(offsetsTag));
    const counts = values(entries.get(countsTag));
    if (offsets.length !== counts.length) {
      throw new DngLayoutError(
        "DNG image offsets and byte counts do not match"
      );
    }
    for (const [index, offset] of offsets.entries()) {
      range(offset, counts[index] ?? 0);
    }
    return offsets.length;
  };

  const previewFrom = (
    entries: ReadonlyMap<number, Entry>,
    defaultOrientation: number,
    allowRgb: boolean
  ): Uint8Array | null => {
    try {
      if (
        one(entries, 254) !== 1 ||
        ![2, 6].includes(one(entries, 262)) ||
        one(entries, 284, 1) !== 1 ||
        entries.has(324) ||
        entries.has(325)
      ) {
        return null;
      }
      const interchange = entries.has(513) || entries.has(514);
      const compression = one(entries, 259);
      if (!(interchange ? [6, 7] : [1, 7]).includes(compression)) {
        return null;
      }
      const offsets = values(entries.get(interchange ? 513 : 273));
      const counts = values(entries.get(interchange ? 514 : 279));
      const offset = offsets[0] ?? 0;
      const size = counts[0] ?? 0;
      if (
        offsets.length !== 1 ||
        counts.length !== 1 ||
        size > MAX_DNG_PREVIEW_BYTES
      ) {
        return null;
      }
      range(offset, size);
      const image = bytes.subarray(offset, offset + size);
      if (compression === 1) {
        if (!allowRgb) {
          return null;
        }
        const width = one(entries, 256);
        const height = one(entries, 257);
        const bits = values(entries.get(258));
        if (
          one(entries, 262) !== 2 ||
          one(entries, 277) !== 3 ||
          bits.length !== 3 ||
          bits.some((bit) => bit !== 8) ||
          one(entries, 278) < height ||
          one(entries, 266, 1) !== 1 ||
          one(entries, 317, 1) !== 1 ||
          values(entries.get(339)).some((sample) => sample !== 1)
        ) {
          return null;
        }
        return rgbDngPreview(
          image,
          width,
          height,
          one(entries, 274, defaultOrientation)
        );
      }
      return dngJpegSize(image) === null ? null : image;
    } catch (error) {
      if (!(error instanceof DngLayoutError)) {
        throw error;
      }
      return null;
    }
  };

  const pending = [view.getUint32(4, little)];
  const visited = new Set<number>();
  let totalEntries = 0;
  let primary: DngFacts | null = null;
  const properties: { label: string; value: string }[] = [];
  let rootOrientation = 1;
  let preview: Uint8Array | null = null;
  let unsafeLinks = false;
  while (pending.length > 0) {
    const offset = pending.pop() ?? 0;
    if (visited.has(offset)) {
      unsafeLinks = true;
      continue;
    }
    if (visited.size >= MAX_DIRECTORIES) {
      unsafeLinks = true;
      break;
    }
    let required = visited.size === 0;
    visited.add(offset);
    try {
      range(offset, 2);
      const count = view.getUint16(offset, little);
      if (count > MAX_ENTRIES - totalEntries) {
        throw new DngLayoutError(
          "DNG entry count exceeds the reader limit",
          "unsupported-format"
        );
      }
      range(offset, 2 + count * 12 + 4);
      totalEntries += count;
      const entries = new Map<number, Entry>();
      for (let index = 0; index < count; index += 1) {
        const at = offset + 2 + index * 12;
        const tag = view.getUint16(at, little);
        const type = view.getUint16(at + 2, little);
        const length = view.getUint32(at + 4, little);
        const size = TYPE_BYTES.get(type);
        if (size === undefined && IMAGE_RANGES.has(tag)) {
          // An unsupported optional image range is never dereferenced.
          entries.set(tag, { type, count: length, offset: at + 8 });
          continue;
        }
        if (size === undefined) {
          throw new DngLayoutError(
            "DNG field type is not supported",
            "unsupported-format"
          );
        }
        if (entries.has(tag)) {
          throw new DngLayoutError("DNG directory contains a duplicate field");
        }
        const dataOffset =
          length * size <= 4 ? at + 8 : view.getUint32(at + 8, little);
        // TIFF can contain empty optional fields. Their offsets are not dereferenced.
        if (length > 0 && !IMAGE_RANGES.has(tag)) {
          range(dataOffset, length * size);
        }
        entries.set(tag, { type, count: length, offset: dataOffset });
      }
      const isPrimary = entries.has(256) && one(entries, 254) === 0;
      required ||= isPrimary;
      const textTags = new Map([
        [270, "ImageDescription"],
        [271, "Make"],
        [272, "Model"],
        [305, "Software"],
        [306, "ModifyDate"],
        [315, "Artist"],
        [33_432, "Copyright"],
        [36_867, "DateTimeOriginal"],
        [42_036, "LensModel"],
      ]);
      for (const [tag, label] of textTags) {
        const entry = entries.get(tag);
        if (entry?.type === 2 && entry.count > 0 && entry.count <= MAX_VALUES) {
          properties.push({
            label,
            value: new TextDecoder()
              .decode(bytes.subarray(entry.offset, entry.offset + entry.count))
              .replaceAll("\u0000", ""),
          });
        }
      }
      if (visited.size === 1) {
        const version = entries.get(50_706);
        const numbers = values(version);
        if (version?.type !== 1 || numbers.length !== 4 || numbers[0] !== 1) {
          throw new DngLayoutError(
            "DNGVersion must be four bytes with major version 1"
          );
        }
        if ((numbers[1] ?? 0) > 7) {
          throw new DngLayoutError(
            "This DNG version is not supported",
            "unsupported-format"
          );
        }
        rootOrientation = one(entries, 274, 1);
        if (rootOrientation < 1 || rootOrientation > 8) {
          throw new DngLayoutError("DNG orientation is invalid");
        }
      }
      if (entries.has(50_933)) {
        throw new DngLayoutError(
          "DNG extra camera profiles are not supported",
          "unsupported-format"
        );
      }
      for (const tag of POINTERS) {
        for (const pointer of values(entries.get(tag))) {
          if (
            pointer === 0 ||
            pending.length + visited.size >= MAX_DIRECTORIES
          ) {
            unsafeLinks = true;
            continue;
          }
          pending.push(pointer);
        }
      }
      const next = view.getUint32(offset + 2 + count * 12, little);
      if (next !== 0) {
        pending.push(next);
      }
      if (!isPrimary) {
        // Keep a camera JPEG when both JPEG and uncompressed previews exist.
        if (preview === null || preview[0] === 0x89) {
          const candidate = previewFrom(
            entries,
            rootOrientation,
            preview === null
          );
          if (candidate !== null) {
            preview = candidate;
          }
        }
        continue;
      }
      const strips = segments(entries, 273, 279);
      const tiles = segments(entries, 324, 325);
      if (
        primary !== null ||
        one(entries, 262) !== 34_892 ||
        values(entries.get(339)).some((sample) => sample !== 1)
      ) {
        throw new DngLayoutError(
          "Only one unsigned integer LinearRaw primary image is supported",
          "unsupported-format"
        );
      }
      if (![1, 7].includes(one(entries, 259))) {
        throw new DngLayoutError(
          "Only uncompressed or JPEG-compressed DNG is supported",
          "unsupported-format"
        );
      }
      const width = one(entries, 256);
      const height = one(entries, 257);
      const bits = values(entries.get(258));
      const samples = one(entries, 277);
      if (
        width < 1 ||
        height < 1 ||
        samples < 1 ||
        bits.length !== samples ||
        bits.some((bit) => bit < 1)
      ) {
        throw new DngLayoutError(
          "DNG primary image descriptors are missing or invalid"
        );
      }
      if (
        samples !== 3 ||
        bits.some((bit) => bit < 8 || bit > 16) ||
        one(entries, 284, 1) !== 1
      ) {
        throw new DngLayoutError(
          "Only chunky three-sample LinearRaw with 8–16 bits per sample is supported",
          "unsupported-format"
        );
      }
      if ((strips === 0) === (tiles === 0)) {
        throw new DngLayoutError("DNG needs one primary strip or tile layout");
      }
      const expected =
        tiles > 0
          ? Math.ceil(width / one(entries, 322)) *
            Math.ceil(height / one(entries, 323))
          : Math.ceil(height / one(entries, 278));
      if (!Number.isFinite(expected) || expected !== strips + tiles) {
        throw new DngLayoutError("DNG primary segment layout is invalid");
      }
      if (one(entries, 259) === 1) {
        const rowWidth = tiles > 0 ? one(entries, 322) : width;
        const rows = tiles > 0 ? one(entries, 323) : one(entries, 278);
        const rowBytes = Math.ceil(
          (rowWidth * bits.reduce((sum, bit) => sum + bit, 0)) / 8
        );
        const counts = values(entries.get(tiles > 0 ? 325 : 279));
        for (const [index, segmentBytes] of counts.entries()) {
          const segmentRows =
            tiles > 0 ? rows : Math.min(rows, height - index * rows);
          if (segmentBytes < rowBytes * segmentRows) {
            throw new DngLayoutError("DNG uncompressed samples are incomplete");
          }
        }
      }
      primary = {
        width,
        height,
        orientation: rootOrientation,
        properties,
        preview: null,
      };
    } catch (error) {
      if (!(error instanceof DngLayoutError) || required) {
        throw error;
      }
      // Optional directories cannot invalidate a separately validated RAW image.
      unsafeLinks = true;
    }
  }
  if (primary === null) {
    throw new DngLayoutError("DNG primary image is missing");
  }
  return { ...primary, preview: unsafeLinks ? null : preview };
};

/** Validate the primary image and collect an optional bounded embedded preview. */
export const inspectDng = (bytes: Uint8Array): DngRead => {
  try {
    return { kind: "read", facts: inspect(bytes) };
  } catch (error) {
    if (!(error instanceof DngLayoutError)) {
      throw error;
    }
    return { kind: error.code, detail: error.message };
  }
};
