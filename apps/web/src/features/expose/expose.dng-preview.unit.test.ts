import { readFileSync } from "node:fs";
import { inflateSync } from "node:zlib";

import { describe, expect, it, vi } from "vitest";

import type { MetadataEngine } from "@/features/expose/expose.engine";
import { readFile } from "@/features/expose/expose.reader";
import {
  canClean,
  presetReasonOf,
  PRESET_ORDER,
} from "@/features/expose/expose.view";

const fixture = (preview = true, little = true) =>
  new Uint8Array(
    readFileSync(
      new URL(
        `fixtures/linear-raw-${preview ? "preview-" : ""}${little ? "le" : "be"}.dng`,
        import.meta.url
      )
    )
  );
const viewOf = (bytes: Uint8Array) =>
  new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
const fieldAt = (bytes: Uint8Array, tag: number, directory = 8): number => {
  const view = viewOf(bytes);
  const little = bytes[0] === 0x49;
  const count = view.getUint16(directory, little);
  for (let index = 0; index < count; index += 1) {
    const at = directory + 2 + index * 12;
    if (view.getUint16(at, little) === tag) {
      return at;
    }
  }
  throw new Error(`Missing test tag ${tag}`);
};
const setValue = (
  bytes: Uint8Array,
  tag: number,
  value: number,
  directory = 8
) => {
  const view = viewOf(bytes);
  const at = fieldAt(bytes, tag, directory);
  const little = bytes[0] === 0x49;
  if (view.getUint16(at + 2, little) === 3) {
    view.setUint16(at + 8, value, little);
  } else {
    view.setUint32(at + 8, value, little);
  }
};
const jpegOf = (bytes: Uint8Array) =>
  bytes.subarray(
    viewOf(bytes).getUint32(fieldAt(bytes, 273) + 8, bytes[0] === 0x49)
  );
const change = (edit: (bytes: Uint8Array) => void) => {
  const bytes = fixture();
  edit(bytes);
  return bytes;
};
const read = (bytes: Uint8Array, engine?: MetadataEngine) =>
  readFile({ bytes, name: "photo.dng", type: "image/dng" }, engine);

/** Add a reduced JPEG IFD through a next-IFD or an array of SubIFDs. */
const linkedPreview = (subIfd: boolean) => {
  const source = fixture();
  const jpeg = jpegOf(source);
  const directory = source.length;
  const tags = [
    [254, 1],
    [256, 24],
    [257, 16],
    [259, 7],
    [262, 2],
    [273, directory + 128],
    [279, jpeg.length],
  ];
  const bytes = new Uint8Array(directory + 128 + jpeg.length);
  bytes.set(source);
  bytes.set(jpeg, directory + 128);
  const view = viewOf(bytes);
  // Disable the root preview so only the linked directory can supply it.
  setValue(bytes, 259, 1);
  view.setUint16(directory, tags.length, true);
  for (const [index, [tag = 0, value = 0]] of tags.entries()) {
    const at = directory + 2 + index * 12;
    view.setUint16(at, tag, true);
    view.setUint16(at + 2, 4, true);
    view.setUint32(at + 4, 1, true);
    view.setUint32(at + 8, value, true);
  }
  if (subIfd) {
    const at = fieldAt(bytes, 330);
    view.setUint16(at + 2, 13, true);
    view.setUint32(at + 4, 2, true);
    view.setUint32(at + 8, directory + 100, true);
    view.setUint32(directory + 100, 300, true);
    view.setUint32(directory + 104, directory, true);
  } else {
    view.setUint32(10 + view.getUint16(8, true) * 12, directory, true);
  }
  return { bytes, directory };
};

describe("DNG preview through the read report", () => {
  it.each(["le", "be"])(
    "shows an uncompressed RGB preview in %s byte order",
    async (order) => {
      const bytes = new Uint8Array(
        readFileSync(
          new URL(`fixtures/linear-raw-rgb-${order}.dng`, import.meta.url)
        )
      );
      const before = new Uint8Array(bytes);
      const report = await read(bytes);
      expect(report.thumbnail).toMatchObject({
        source: "dng-preview",
        mime: "image/png",
        width: 3,
        height: 2,
      });
      expect(bytes).toEqual(before);
      expect(report.facts).toMatchObject({ width: 32, height: 24 });
      expect(canClean(report, ["thumbnails"])).toBe(false);
    }
  );

  it.each([
    [1, 2, 3, [0, 1, 2, 3, 4, 5]],
    [2, 2, 3, [1, 0, 3, 2, 5, 4]],
    [3, 2, 3, [5, 4, 3, 2, 1, 0]],
    [4, 2, 3, [4, 5, 2, 3, 0, 1]],
    [5, 3, 2, [0, 2, 4, 1, 3, 5]],
    [6, 3, 2, [4, 2, 0, 5, 3, 1]],
    [7, 3, 2, [5, 3, 1, 4, 2, 0]],
    [8, 3, 2, [1, 3, 5, 0, 2, 4]],
  ] as const)(
    "applies RGB preview orientation %s once",
    async (orientation, width, height, pixels) => {
      const bytes = new Uint8Array(
        readFileSync(new URL("fixtures/linear-raw-rgb-le.dng", import.meta.url))
      );
      setValue(bytes, 274, orientation);
      const report = await read(bytes);
      expect(report.thumbnail).toMatchObject({
        width,
        height,
        mime: "image/png",
      });
      const png = new Uint8Array(
        (await report.thumbnail?.data.arrayBuffer()) ?? new ArrayBuffer(0)
      );
      const view = viewOf(png);
      // Read the generated PNG through its chunk lengths and zlib stream.
      const idat: Uint8Array[] = [];
      for (let at = 8; at < png.length;) {
        const size = view.getUint32(at);
        if (new TextDecoder().decode(png.subarray(at + 4, at + 8)) === "IDAT") {
          idat.push(png.subarray(at + 8, at + 8 + size));
        }
        at += size + 12;
      }
      const rows = inflateSync(Buffer.concat(idat));
      const colors = [
        [255, 0, 0],
        [0, 255, 0],
        [0, 0, 255],
        [255, 255, 0],
        [255, 0, 255],
        [0, 255, 255],
      ];
      const actual = Array.from({ length: height }, (_, y) => {
        const at = y * (width * 3 + 1);
        expect(rows[at]).toBe(0);
        return [...rows.subarray(at + 1, at + 1 + width * 3)];
      }).flat();
      expect(actual).toEqual(pixels.flatMap((pixel) => colors[pixel] ?? []));
    }
  );

  it.each([
    ["planar", (b: Uint8Array) => setValue(b, 284, 2)],
    ["incomplete samples", (b: Uint8Array) => setValue(b, 279, 17)],
    ["invalid dimensions", (b: Uint8Array) => setValue(b, 256, 0)],
    ["oversized dimensions", (b: Uint8Array) => setValue(b, 256, 20_000)],
    ["incomplete strip layout", (b: Uint8Array) => setValue(b, 278, 1)],
  ] as const)("ignores an RGB preview with %s", async (_, edit) => {
    const bytes = new Uint8Array(
      readFileSync(new URL("fixtures/linear-raw-rgb-le.dng", import.meta.url))
    );
    edit(bytes);
    const report = await read(bytes);
    expect(report.thumbnail).toBeNull();
    expect(report.facts).toMatchObject({ width: 32, height: 24 });
  });

  it.each([true, false])(
    "reads a complete JPEG with byte order little=%s",
    async (little) => {
      const bytes = fixture(true, little);
      const before = new Uint8Array(bytes);
      const forbidden = vi.fn(() => {
        throw new Error("DNG must not load the metadata engine");
      });
      const engine: MetadataEngine = {
        name: "unused",
        version: "0",
        read: forbidden,
        extract: forbidden,
        write: forbidden,
      };
      const report = await read(bytes, engine);
      expect(report.thumbnail).toMatchObject({
        source: "dng-preview",
        mime: "image/jpeg",
        width: 24,
        height: 16,
        bytes: jpegOf(bytes).length,
      });
      expect(report.thumbnail?.data.type).toBe("image/jpeg");
      const previewBytes = await report.thumbnail?.data.arrayBuffer();
      expect(previewBytes).toBeDefined();
      expect(new Uint8Array(previewBytes ?? new ArrayBuffer(0))).toEqual(
        jpegOf(bytes)
      );
      expect(report.facts).toMatchObject({
        format: "dng",
        width: 32,
        height: 24,
        orientation: 6,
      });
      expect(report.notes).toContainEqual({
        code: "dng-read-only",
        detail: null,
      });
      expect(canClean(report, ["thumbnails"])).toBe(false);
      expect(report.counts.removable).toBe(0);
      for (const preset of PRESET_ORDER) {
        expect(presetReasonOf(report, preset)).toBe("format-limit");
      }
      expect(forbidden).not.toHaveBeenCalled();
      expect(bytes).toEqual(before);
    }
  );

  it("keeps the JPEG preview when a reduced RGB preview also exists", async () => {
    const { bytes: linked } = linkedPreview(false);
    const bytes = new Uint8Array(linked.length + 3);
    bytes.set(linked);
    bytes.set([255, 0, 0], linked.length);
    setValue(bytes, 256, 1);
    setValue(bytes, 257, 1);
    setValue(bytes, 262, 2);
    setValue(bytes, 278, 1);
    setValue(bytes, 273, linked.length);
    setValue(bytes, 279, 3);
    const report = await read(bytes);
    expect(report.thumbnail).toMatchObject({
      mime: "image/jpeg",
      width: 24,
      height: 16,
    });
  });

  it.each([false, true])(
    "follows validated directory links (SubIFD=%s)",
    async (subIfd) => {
      const report = await read(linkedPreview(subIfd).bytes);
      expect(report.thumbnail).toMatchObject({
        source: "dng-preview",
        width: 24,
        height: 16,
      });
    }
  );

  it("follows a relocated IFD0 instead of fixed fixture offsets", async () => {
    const source = fixture();
    const bytes = new Uint8Array(source.length + 300);
    bytes.set(source);
    bytes.set(source.subarray(8, 300), source.length);
    viewOf(bytes).setUint32(4, source.length, true);
    const report = await read(bytes);
    expect(report.thumbnail).toMatchObject({ width: 24, height: 16 });
  });

  it("supports JPEGInterchangeFormat and its byte count", async () => {
    const bytes = fixture();
    const view = viewOf(bytes);
    view.setUint16(fieldAt(bytes, 273), 513, true);
    view.setUint16(fieldAt(bytes, 279), 514, true);
    setValue(bytes, 259, 6);
    const report = await read(bytes);
    expect(report.thumbnail).toMatchObject({
      mime: "image/jpeg",
      width: 24,
      height: 16,
    });
  });

  it("keeps a report with no embedded JPEG", async () => {
    const report = await read(fixture(false));
    expect(report.thumbnail).toBeNull();
  });

  it.each([
    ["offset outside file", (b: Uint8Array) => setValue(b, 273, b.length + 1)],
    ["zero offset", (b: Uint8Array) => setValue(b, 273, 0)],
    ["range past file end", (b: Uint8Array) => setValue(b, 279, b.length)],
    ["empty preview", (b: Uint8Array) => setValue(b, 279, 0)],
    [
      "truncated JPEG",
      (b: Uint8Array) => setValue(b, 279, jpegOf(b).length - 2),
    ],
    [
      "over byte limit",
      (b: Uint8Array) => setValue(b, 279, 16 * 1024 * 1024 + 1),
    ],
    [
      "non-JPEG data",
      (b: Uint8Array) => {
        jpegOf(b)[0] = 0;
      },
    ],
    ["uncompressed preview", (b: Uint8Array) => setValue(b, 259, 1)],
    [
      "unsupported photometric layout",
      (b: Uint8Array) => setValue(b, 262, 34_892),
    ],
    ["planar preview", (b: Uint8Array) => setValue(b, 284, 2)],
    [
      "tiled preview",
      (b: Uint8Array) => {
        viewOf(b).setUint16(fieldAt(b, 273), 324, true);
      },
    ],
    [
      "unsupported preview offset type",
      (b: Uint8Array) => {
        viewOf(b).setUint16(fieldAt(b, 273) + 2, 16, true);
      },
    ],
    [
      "multiple strips with invalid array",
      (b: Uint8Array) => {
        viewOf(b).setUint32(fieldAt(b, 273) + 4, 2, true);
      },
    ],
    [
      "malformed marker length",
      (b: Uint8Array) => {
        const jpeg = jpegOf(b);
        jpeg[4] = 255;
        jpeg[5] = 255;
      },
    ],
    [
      "missing scan",
      (b: Uint8Array) => {
        const jpeg = jpegOf(b);
        const at = jpeg.findIndex((v, i) => v === 255 && jpeg[i + 1] === 218);
        jpeg[at + 1] = 217;
      },
    ],
    [
      "over pixel limit",
      (b: Uint8Array) => {
        const jpeg = jpegOf(b);
        const at = jpeg.findIndex((v, i) => v === 255 && jpeg[i + 1] === 192);
        viewOf(jpeg).setUint16(at + 5, 16_000);
        viewOf(jpeg).setUint16(at + 7, 16_000);
      },
    ],
    [
      "lossless RAW JPEG",
      (b: Uint8Array) => {
        const jpeg = jpegOf(b);
        const at = jpeg.findIndex((v, i) => v === 255 && jpeg[i + 1] === 192);
        jpeg[at + 1] = 195;
      },
    ],
  ] as const)("ignores %s without losing the report", async (_, edit) => {
    const bytes = change(edit);
    const before = new Uint8Array(bytes);
    const report = await read(bytes);
    expect(report.thumbnail).toBeNull();
    expect(report.facts).toMatchObject({
      format: "dng",
      width: 32,
      height: 24,
    });
    expect(bytes).toEqual(before);
  });

  it.each(["cycle", "out of range", "truncated table", "over entry limit"])(
    "ignores an optional directory with %s",
    async (damage) => {
      const { bytes, directory } = linkedPreview(false);
      const view = viewOf(bytes);
      if (damage === "cycle") {
        view.setUint32(
          directory + 2 + view.getUint16(directory, true) * 12,
          directory,
          true
        );
      } else if (damage === "out of range") {
        view.setUint32(
          10 + view.getUint16(8, true) * 12,
          bytes.length + 1,
          true
        );
      } else {
        view.setUint16(directory, 16_000, true);
      }
      const report = await read(bytes);
      expect(report.thumbnail).toBeNull();
      expect(report.facts.format).toBe("dng");
    }
  );
});
