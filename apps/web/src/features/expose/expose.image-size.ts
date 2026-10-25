/* eslint-disable eslint/no-bitwise, eslint/complexity, eslint/no-unmodified-loop-condition, eslint/require-unicode-regexp, unicorn/prefer-code-point, unicorn/prefer-number-coercion, unicorn/consistent-function-scoping, import/no-named-as-default-member -- the reader parses byte-exact image headers and container values */
/* oxlint-disable anti-slop/no-unknown-parameters, anti-slop/no-runtime-typeof, anti-slop/require-safety-comment-for-type-assertion, anti-slop/no-unsafe-dictionary-type, anti-slop/no-known-value-widening, anti-slop/no-chained-type-assertions, react-doctor/js-combine-iterations -- the reader is the boundary that turns the metadata engine objects into the seam report */

const sizeFromJpeg = (
  bytes: Uint8Array
): { height: number; width: number } | null => {
  let offset = 2;
  while (offset + 9 < bytes.length) {
    if (bytes[offset] !== 0xff) {
      offset += 1;
      continue;
    }
    const marker = bytes[offset + 1] ?? 0;
    if (
      marker === 0xd8 ||
      marker === 0xd9 ||
      (marker >= 0xd0 && marker <= 0xd7)
    ) {
      offset += 2;
      continue;
    }
    if (marker === 0xda || marker === 0x01) {
      return null;
    }
    const length = ((bytes[offset + 2] ?? 0) << 8) | (bytes[offset + 3] ?? 0);
    const isSof =
      marker >= 0xc0 &&
      marker <= 0xcf &&
      marker !== 0xc4 &&
      marker !== 0xc8 &&
      marker !== 0xcc;
    if (isSof) {
      return {
        height: ((bytes[offset + 5] ?? 0) << 8) | (bytes[offset + 6] ?? 0),
        width: ((bytes[offset + 7] ?? 0) << 8) | (bytes[offset + 8] ?? 0),
      };
    }
    if (length < 2) {
      return null;
    }
    offset += 2 + length;
  }
  return null;
};

const sizeFromGif = (
  bytes: Uint8Array
): { height: number; width: number } | null => {
  if (bytes.length < 10) {
    return null;
  }
  return {
    height: (bytes[8] ?? 0) | ((bytes[9] ?? 0) << 8),
    width: (bytes[6] ?? 0) | ((bytes[7] ?? 0) << 8),
  };
};

const sizeFromWebp = (
  bytes: Uint8Array
): { height: number; width: number } | null => {
  const type = String.fromCharCode(...bytes.subarray(12, 16));
  if (type === "VP8X" && bytes.length >= 30) {
    // The canvas size is three little-endian bytes, stored minus one.
    const width =
      (bytes[24] ?? 0) +
      ((bytes[25] ?? 0) << 8) +
      (bytes[26] ?? 0) * 0x1_00_00 +
      1;
    const height =
      (bytes[27] ?? 0) +
      ((bytes[28] ?? 0) << 8) +
      (bytes[29] ?? 0) * 0x1_00_00 +
      1;
    return { height, width };
  }
  if (type === "VP8L" && bytes.length >= 25) {
    const bits =
      (bytes[21] ?? 0) +
      ((bytes[22] ?? 0) << 8) +
      ((bytes[23] ?? 0) << 16) +
      (bytes[24] ?? 0) * 0x1_00_00_00;
    return {
      height: ((bits >> 14) & 0x3f_ff) + 1,
      width: (bits & 0x3f_ff) + 1,
    };
  }
  if (type === "VP8 " && bytes.length >= 30) {
    // The frame header sits after the three-byte frame tag.
    if (bytes[23] !== 0x9d || bytes[24] !== 0x01 || bytes[25] !== 0x2a) {
      return null;
    }
    return {
      height: ((bytes[28] ?? 0) | ((bytes[29] ?? 0) << 8)) & 0x3f_ff,
      width: ((bytes[26] ?? 0) | ((bytes[27] ?? 0) << 8)) & 0x3f_ff,
    };
  }
  return null;
};

const sizeFromBmff = (
  bytes: Uint8Array
): { height: number; width: number } | null => {
  const walk = (
    start: number,
    end: number,
    depth: number
  ): { height: number; width: number } | null => {
    let offset = start;
    while (offset + 8 <= end && depth < 4) {
      let size =
        ((bytes[offset] ?? 0) * 0x1_00_00_00 +
          ((bytes[offset + 1] ?? 0) << 16) +
          ((bytes[offset + 2] ?? 0) << 8) +
          (bytes[offset + 3] ?? 0)) >>>
        0;
      const type = String.fromCharCode(
        ...bytes.subarray(offset + 4, offset + 8)
      );
      let header = 8;
      if (size === 1) {
        size = 0;
        header = 16;
      } else if (size === 0) {
        size = end - offset;
      }
      if (size < header || offset + size > end) {
        return null;
      }
      if (type === "ispe" && size >= 20) {
        return {
          height:
            ((bytes[offset + 16] ?? 0) * 0x1_00_00_00 +
              ((bytes[offset + 17] ?? 0) << 16) +
              ((bytes[offset + 18] ?? 0) << 8) +
              (bytes[offset + 19] ?? 0)) >>>
            0,
          width:
            ((bytes[offset + 12] ?? 0) * 0x1_00_00_00 +
              ((bytes[offset + 13] ?? 0) << 16) +
              ((bytes[offset + 14] ?? 0) << 8) +
              (bytes[offset + 15] ?? 0)) >>>
            0,
        };
      }
      if (
        type === "meta" ||
        type === "moov" ||
        type === "trak" ||
        type === "mdia" ||
        type === "iprp" ||
        type === "ipco"
      ) {
        const found = walk(
          type === "meta" ? offset + header + 4 : offset + header,
          offset + size,
          depth + 1
        );
        if (found !== null) {
          return found;
        }
      }
      offset += size;
    }
    return null;
  };
  return walk(0, bytes.length, 0);
};

export const imageSizeOf = (
  bytes: Uint8Array
): { height: number; width: number } | null => {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8) {
    return sizeFromJpeg(bytes);
  }
  if (bytes.length >= 24 && bytes[0] === 0x89 && bytes[1] === 0x50) {
    return {
      height:
        ((bytes[20] ?? 0) * 0x1_00_00_00 +
          ((bytes[21] ?? 0) << 16) +
          ((bytes[22] ?? 0) << 8) +
          (bytes[23] ?? 0)) >>>
        0,
      width:
        ((bytes[16] ?? 0) * 0x1_00_00_00 +
          ((bytes[17] ?? 0) << 16) +
          ((bytes[18] ?? 0) << 8) +
          (bytes[19] ?? 0)) >>>
        0,
    };
  }
  if (
    bytes.length >= 10 &&
    String.fromCharCode(...bytes.subarray(0, 3)) === "GIF"
  ) {
    return sizeFromGif(bytes);
  }
  if (
    bytes.length >= 30 &&
    String.fromCharCode(...bytes.subarray(0, 4)) === "RIFF" &&
    String.fromCharCode(...bytes.subarray(8, 12)) === "WEBP"
  ) {
    return sizeFromWebp(bytes);
  }
  if (
    bytes.length >= 12 &&
    String.fromCharCode(...bytes.subarray(4, 8)) === "ftyp"
  ) {
    return sizeFromBmff(bytes);
  }
  return null;
};
