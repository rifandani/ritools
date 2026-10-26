import { readFileSync } from "node:fs";

import { describe, expect, it, vi } from "vitest";

import {
  cleanedNameOf,
  groupsForPreset,
  mimeOf,
  sniffFormat,
} from "@/features/expose/expose";
import {
  cleanableItem,
  incomingExposeItems,
  staleItem,
} from "@/features/expose/expose.batch";
import type { ExposeItem } from "@/features/expose/expose.batch";
import { cleanFile } from "@/features/expose/expose.cleaner";
import { readFile } from "@/features/expose/expose.reader";
import {
  canClean,
  canPreview,
  PRESET_ORDER,
  presetReasonOf,
} from "@/features/expose/expose.view";

const fixture = (order = "le") =>
  new Uint8Array(
    readFileSync(new URL(`fixtures/linear-raw-${order}.dng`, import.meta.url))
  );
const read = (bytes: Uint8Array = fixture(), name = "photo.dng") =>
  readFile({ bytes, name, type: "image/tiff" });

/** Return the position of a field in the fixture's little-endian IFD. */
const fieldAt = (bytes: Uint8Array, offset: number, tag: number): number => {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const count = view.getUint16(offset, true);
  for (let index = 0; index < count; index += 1) {
    const at = offset + 2 + index * 12;
    if (view.getUint16(at, true) === tag) {
      return at;
    }
  }
  throw new Error("fixture field is missing");
};
const changed = (change: (bytes: Uint8Array, view: DataView) => void) => {
  const bytes = fixture();
  change(bytes, new DataView(bytes.buffer));
  return bytes;
};
const codeOf = async (bytes: Uint8Array, name = "photo.dng") => {
  try {
    await read(bytes, name);
  } catch (error) {
    return error;
  }
  throw new Error("damaged DNG produced a report");
};

describe("DNG read-only input", () => {
  it.each(["le", "be"])(
    "reads %s byte order and uses the primary SubIFD dimensions",
    async (order) => {
      const bytes = fixture(order);
      const report = await read(bytes, "renamed.tiff");
      expect(sniffFormat(bytes, "renamed.tiff")).toBe("dng");
      expect(report.facts).toMatchObject({
        format: "dng",
        mime: "image/dng",
        width: 32,
        height: 24,
        orientation: 6,
      });
      expect(report.fields).toContainEqual(
        expect.objectContaining({ label: "Artist", value: "Ritools test" })
      );
      expect(report.notes).toContainEqual({
        code: "dng-read-only",
        detail: null,
      });
      expect(
        report.groups.every(
          (group) =>
            group.removability ===
            (group.group === "display" ? "display" : "format")
        )
      ).toBe(true);
      expect(report.counts.removable).toBe(0);
      expect(canPreview("dng")).toBe(false);
      expect(canClean(report, ["authorship"])).toBe(false);
      for (const preset of PRESET_ORDER) {
        expect(presetReasonOf(report, preset)).toBe("format-limit");
      }
    }
  );

  it("does not grant DNG identity from a file name", async () => {
    const tiff = new Uint8Array(
      readFileSync(new URL("fixtures/metadata.tiff", import.meta.url))
    );
    expect(sniffFormat(tiff, "renamed.dng")).toBe("tiff");
    expect(sniffFormat(new Uint8Array([1, 2, 3]), "photo.dng")).toBeNull();
    expect(await codeOf(tiff)).toMatchObject({ code: "unreadable-file" });
    expect(cleanedNameOf("photo.tiff", "dng")).toBe("photo-clean.dng");
    expect(mimeOf("dng")).toBe("image/dng");
  });

  it.each([
    ["header only", () => fixture().slice(0, 8)],
    ["truncated RAW samples", () => fixture().slice(0, -1)],
    [
      "incomplete uncompressed samples",
      () =>
        changed((bytes, view) =>
          view.setUint32(fieldAt(bytes, 300, 279) + 8, 1, true)
        ),
    ],
    [
      "invalid first directory",
      () => changed((_, view) => view.setUint32(4, 0xff_ff_ff_f0, true)),
    ],
    [
      "directory cycle",
      () =>
        changed((bytes, view) =>
          view.setUint32(fieldAt(bytes, 8, 330) + 8, 8, true)
        ),
    ],
    [
      "invalid RAW offset",
      () =>
        changed((bytes, view) =>
          view.setUint32(fieldAt(bytes, 300, 273) + 8, bytes.length, true)
        ),
    ],
    [
      "missing primary",
      () =>
        changed((bytes, view) =>
          view.setUint32(fieldAt(bytes, 300, 254) + 8, 1, true)
        ),
    ],
    [
      "invalid version",
      () =>
        changed((bytes, view) =>
          view.setUint8(fieldAt(bytes, 8, 50_706) + 8, 0)
        ),
    ],
    [
      "invalid tile/strip count",
      () =>
        changed((bytes, view) =>
          view.setUint32(fieldAt(bytes, 300, 278) + 8, 1, true)
        ),
    ],
    [
      "invalid auxiliary value",
      () =>
        changed((bytes, view) =>
          view.setUint32(fieldAt(bytes, 8, 50_708) + 8, bytes.length, true)
        ),
    ],
  ] as const)("rejects %s", async (_, makeBytes) => {
    expect(await codeOf(makeBytes())).toMatchObject({
      code: "unreadable-file",
      format: "dng",
    });
  });

  it("rejects a renamed DNG with damaged primary data", async () => {
    expect(await codeOf(fixture().slice(0, -1), "photo.tiff")).toMatchObject({
      code: "unreadable-file",
      format: "dng",
    });
  });

  it("names an unsupported CFA layout", async () => {
    const bytes = changed((data, view) =>
      view.setUint16(fieldAt(data, 300, 262) + 8, 32_803, true)
    );
    expect(await codeOf(bytes)).toMatchObject({
      code: "unsupported-format",
      format: "dng",
    });
  });

  it("names unsupported planar storage", async () => {
    const bytes = changed((data, view) =>
      view.setUint16(fieldAt(data, 300, 284) + 8, 2, true)
    );
    expect(await codeOf(bytes)).toMatchObject({
      code: "unsupported-format",
      format: "dng",
    });
  });

  it("names unsupported floating-point samples", async () => {
    const bytes = changed((data, view) => {
      const at = fieldAt(data, 300, 50_717);
      view.setUint16(at, 339, true);
      view.setUint16(at + 2, 3, true);
      view.setUint32(at + 8, 3, true);
    });
    expect(await codeOf(bytes)).toMatchObject({
      code: "unsupported-format",
      format: "dng",
    });
  });

  it("names BigTIFF DNG without sending it through the TIFF path", async () => {
    const bytes = new Uint8Array(52);
    const view = new DataView(bytes.buffer);
    bytes.set([0x49, 0x49, 43, 0, 8, 0, 0, 0]);
    view.setBigUint64(8, 16n, true);
    view.setBigUint64(16, 1n, true);
    view.setUint16(24, 50_706, true);
    expect(sniffFormat(bytes, "renamed.tiff")).toBe("dng");
    expect(await codeOf(bytes)).toMatchObject({
      code: "unsupported-format",
      format: "dng",
    });
  });

  it.each(PRESET_ORDER)(
    "blocks %s even with no selected fields, before any writer call",
    async (preset) => {
      const bytes = fixture();
      const before = new Uint8Array(bytes);
      const write = vi.fn();
      const report = vi.fn();
      await expect(
        cleanFile(
          {
            bytes: new Blob([bytes]),
            name: "renamed.tiff",
            type: "image/tiff",
            lastModified: 0,
          },
          { preset, groups: groupsForPreset(preset), report },
          { name: "unused", version: "unused", write }
        )
      ).rejects.toMatchObject({ code: "clean-not-supported", format: "dng" });
      expect(write).not.toHaveBeenCalled();
      expect(report).not.toHaveBeenCalled();
      expect(bytes).toEqual(before);
    }
  );

  it("accepts DNG in folders and keeps it blocked when the batch preset changes", async () => {
    const file = new File([fixture()], "camera.DNG", {
      type: "application/octet-stream",
    });
    const { accepted, skipped } = incomingExposeItems(
      [],
      [{ file, folderPath: "photos" }],
      () => "dng"
    );
    expect(skipped).toBe(0);
    const [incoming] = accepted;
    if (incoming === undefined) {
      throw new Error("DNG was not accepted");
    }
    const item: ExposeItem = {
      ...incoming,
      reading: false,
      report: await read(),
      state: "not-supported",
    };
    expect(cleanableItem(item)).toBe(false);
    expect(staleItem(item, "location")).toBe(item);
  });
});

it.each([
  [
    "unknown field type",
    (bytes: Uint8Array, view: DataView) =>
      view.setUint16(fieldAt(bytes, 8, 315) + 2, 65_535, true),
    "unsupported-format",
  ],
  [
    "duplicate field",
    (bytes: Uint8Array, view: DataView) =>
      view.setUint16(fieldAt(bytes, 8, 315), 274, true),
    "unreadable-file",
  ],
  [
    "invalid scalar type",
    (bytes: Uint8Array, view: DataView) =>
      view.setUint16(fieldAt(bytes, 300, 256) + 2, 2, true),
    "unreadable-file",
  ],
  [
    "multiple scalar values",
    (bytes: Uint8Array, view: DataView) => {
      const at = fieldAt(bytes, 300, 256);
      view.setUint16(at + 2, 3, true);
      view.setUint32(at + 4, 2, true);
    },
    "unreadable-file",
  ],
  [
    "mismatched segment lists",
    (bytes: Uint8Array, view: DataView) =>
      view.setUint32(fieldAt(bytes, 300, 279) + 4, 0, true),
    "unreadable-file",
  ],
  [
    "future DNG version",
    (bytes: Uint8Array, view: DataView) =>
      view.setUint8(fieldAt(bytes, 8, 50_706) + 9, 8),
    "unsupported-format",
  ],
  [
    "invalid orientation",
    (bytes: Uint8Array, view: DataView) =>
      view.setUint16(fieldAt(bytes, 8, 274) + 8, 9, true),
    "unreadable-file",
  ],
  [
    "extra camera profiles",
    (bytes: Uint8Array, view: DataView) =>
      view.setUint16(fieldAt(bytes, 8, 315), 50_933, true),
    "unsupported-format",
  ],
  [
    "empty directory link",
    (bytes: Uint8Array, view: DataView) =>
      view.setUint32(fieldAt(bytes, 8, 330) + 8, 0, true),
    "unreadable-file",
  ],
  [
    "unsupported compression",
    (bytes: Uint8Array, view: DataView) =>
      view.setUint16(fieldAt(bytes, 300, 259) + 8, 5, true),
    "unsupported-format",
  ],
  [
    "missing width",
    (bytes: Uint8Array, view: DataView) =>
      view.setUint32(fieldAt(bytes, 300, 256) + 8, 0, true),
    "unreadable-file",
  ],
  [
    "missing primary segments",
    (bytes: Uint8Array, view: DataView) => {
      view.setUint16(fieldAt(bytes, 300, 273), 65_001, true);
      view.setUint16(fieldAt(bytes, 300, 279), 65_002, true);
    },
    "unreadable-file",
  ],
] as const)("names an invalid DNG: %s", async (_, change, code) => {
  expect(await codeOf(changed(change))).toMatchObject({ code });
});
it("bounds the structural value count before parsing values", async () => {
  const original = fixture();
  const bytes = new Uint8Array(original.length + 140_000);
  bytes.set(original);
  const view = new DataView(bytes.buffer);
  const at = fieldAt(bytes, 300, 258);
  view.setUint32(at + 4, 65_537, true);
  view.setUint32(at + 8, original.length, true);
  expect(await codeOf(bytes)).toMatchObject({ code: "unsupported-format" });
});
it("follows a bounded next-directory link and tolerates an empty optional property", async () => {
  const bytes = fixture();
  const view = new DataView(bytes.buffer);
  const rootCount = view.getUint16(8, true);
  const pointer = fieldAt(bytes, 8, 330);
  view.setUint16(pointer, 65_000, true);
  view.setUint32(8 + 2 + rootCount * 12, 300, true);
  view.setUint32(fieldAt(bytes, 8, 315) + 4, 0, true);
  const report = await read(bytes);
  expect(report.facts.width).toBe(32);
  expect(report.fields.some((field) => field.label === "Artist")).toBe(false);
});
