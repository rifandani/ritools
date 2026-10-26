/* eslint-disable eslint/no-bitwise, eslint/no-shadow, eslint/no-await-in-loop, eslint/prefer-destructuring, unicorn/no-new-array, unicorn/prefer-spread, unicorn/relative-url-style, unicorn/no-array-sort, unicorn/prefer-code-point, unicorn/no-useless-undefined, promise/no-promise-in-callback -- tests build binary fixtures and catch thrown values */
/* oxlint-disable anti-slop/require-safety-comment-for-type-assertion, anti-slop/no-unknown-parameters, anti-slop/no-shape-in-symbol-names -- tests narrow data they built or caught */
import { describe, expect, it } from "vitest";

import type { MetadataField } from "@/features/expose/expose";
import {
  clampGps,
  cleanedNameOf,
  countsOf,
  ExposeError,
  fieldIdOf,
  FORMAT_LABEL,
  groupsForPreset,
  isMemoryFailure,
  mimeOf,
  sniffFormat,
  textOf,
} from "@/features/expose/expose";

const bytesOf = (...values: number[]): Uint8Array => new Uint8Array(values);

const ascii = (value: string): number[] =>
  [...value].map((char) => char.charCodeAt(0));

const fieldOf = (overrides: Partial<MetadataField>): MetadataField => ({
  container: "exif",
  group: "camera-settings",
  id: "exif:field:0",
  label: "Field",
  value: "Value",
  ...overrides,
});

describe("format sniffing", () => {
  it("sniffs every supported container from its magic bytes", () => {
    expect(sniffFormat(bytesOf(0xff, 0xd8, 0xff, 0xe0))).toBe("jpeg");
    expect(
      sniffFormat(bytesOf(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a))
    ).toBe("png");
    expect(sniffFormat(bytesOf(...ascii("GIF89a"), 0, 0, 0, 0, 0, 0, 0))).toBe(
      "gif"
    );
    expect(sniffFormat(bytesOf(0x49, 0x49, 0x2a, 0x00, 8, 0, 0, 0))).toBe(
      "tiff"
    );
    expect(sniffFormat(bytesOf(0x4d, 0x4d, 0x00, 0x2a, 0, 0, 0, 8))).toBe(
      "tiff"
    );
    expect(sniffFormat(bytesOf(0x49, 0x49, 0x2b, 0x00, 8, 0, 0, 0))).toBe(
      "tiff"
    );
    expect(sniffFormat(bytesOf(0x4d, 0x4d, 0x00, 0x2b, 0, 0, 0, 8))).toBe(
      "tiff"
    );
    expect(
      sniffFormat(bytesOf(0xff, 0x0a, 0x00, 0, 0, 0, 0, 0, 0, 0, 0, 0))
    ).toBe("jxl");
    expect(
      sniffFormat(
        new Uint8Array([...ascii("RIFF"), 0, 0, 0, 0, ...ascii("WEBPVP8 ")])
      )
    ).toBe("webp");
    expect(
      sniffFormat(
        new Uint8Array([0, 0, 0, 0x0c, ...ascii("JXL "), 13, 10, 135, 10])
      )
    ).toBe("jxl");
    expect(
      sniffFormat(
        new Uint8Array([0, 0, 0, 16, ...ascii("ftypavif"), 0, 0, 0, 0])
      )
    ).toBe("avif");
    expect(
      sniffFormat(
        new Uint8Array([0, 0, 0, 16, ...ascii("ftypavis"), 0, 0, 0, 0])
      )
    ).toBe("avif");
    expect(
      sniffFormat(
        new Uint8Array([0, 0, 0, 16, ...ascii("ftypheic"), 0, 0, 0, 0])
      )
    ).toBe("heic");
    expect(
      sniffFormat(
        new Uint8Array([0, 0, 0, 16, ...ascii("ftypmif1"), 0, 0, 0, 0])
      )
    ).toBe("heic");
  });

  it("does not grant identity from an extension", () => {
    expect(sniffFormat(bytesOf(0, 0, 0), "photo.heif")).toBeNull();
    expect(sniffFormat(bytesOf(0, 0, 0), "photo.jpe")).toBeNull();
    expect(sniffFormat(bytesOf(0, 0, 0), "photo.tif")).toBeNull();
    expect(sniffFormat(bytesOf(0, 0, 0), "photo.unknown")).toBeNull();
    expect(sniffFormat(bytesOf(0, 0, 0), "no-extension")).toBeNull();
  });
});

describe("preset resolution", () => {
  it("resolves every presets to the documented groups", () => {
    expect(groupsForPreset("ai-only")).toEqual(["ai-provenance"]);
    expect(groupsForPreset("personal")).toEqual([
      "location",
      "time",
      "device-identity",
      "authorship",
      "thumbnails",
    ]);
    expect(groupsForPreset("everything")).toHaveLength(9);
    expect(groupsForPreset("everything")).not.toContain("display");
    expect(groupsForPreset("custom", ["location", "display"])).toEqual([
      "location",
    ]);
  });

  it("keeps the four preset labels stable", () => {
    expect(FORMAT_LABEL.jpeg).toBe("JPEG");
    expect(FORMAT_LABEL.jxl).toBe("JPEG XL");
    expect(FORMAT_LABEL.heic).toBe("HEIC/HEIF");
    expect(mimeOf("jpeg")).toBe("image/jpeg");
    expect(mimeOf("heic")).toBe("image/heic");
  });
});

describe("memory failure detection", () => {
  it("recognises the messages a device returns when allocation fails", () => {
    expect(
      isMemoryFailure(new RangeError("Array buffer allocation failed"))
    ).toBe(true);
    expect(isMemoryFailure("out of memory")).toBe(true);
    expect(isMemoryFailure(new Error("not enough allocation"))).toBe(true);
    expect(isMemoryFailure(null)).toBe(false);
    expect(isMemoryFailure(new Error("bad container"))).toBe(false);
  });
});

describe("clean names", () => {
  it("writes a new stem and the format extension", () => {
    expect(cleanedNameOf("photo.jpg", "jpeg")).toBe("photo-clean.jpg");
    expect(cleanedNameOf("archive.photo.png", "png")).toBe(
      "archive.photo-clean.png"
    );
    expect(cleanedNameOf("no-extension", "webp")).toBe(
      "no-extension-clean.webp"
    );
  });

  it("strips path separators, control characters, and empty stems", () => {
    expect(cleanedNameOf("a/b\\c:d.jpg", "jpeg")).toBe("a-b-c-d-clean.jpg");
    expect(cleanedNameOf("\u0000\u001F.jpg", "jpeg")).toBe("image-clean.jpg");
    expect(cleanedNameOf(".jpg", "jpeg")).toBe("image-clean.jpg");
  });
});

describe("GPS clamping", () => {
  it("clamps latitude and longitude and keeps a finite altitude", () => {
    expect(clampGps(95, 200, 12)).toEqual({
      altitudeMeters: 12,
      latitude: 90,
      longitude: 180,
    });
    expect(clampGps(-95, -200, Number.NaN)).toEqual({
      altitudeMeters: null,
      latitude: -90,
      longitude: -180,
    });
  });

  it("returns null when either coordinate is absent or not finite", () => {
    expect(clampGps(null, 10, 2)).toBeNull();
    expect(clampGps(10, null, 2)).toBeNull();
    expect(clampGps(Number.NaN, 10, 2)).toBeNull();
    expect(clampGps(10, Number.POSITIVE_INFINITY, 2)).toBeNull();
  });
});

describe("counts and field identity", () => {
  it("counts removable, kept, groups, and total fields", () => {
    const fields = [
      fieldOf({ group: "location" }),
      fieldOf({ group: "display" }),
      fieldOf({ group: "ai-provenance" }),
    ];
    const counts = countsOf(fields, [
      {
        containers: ["exif"],
        count: 1,
        group: "location",
        removability: "removable",
      },
      {
        containers: ["icc"],
        count: 1,
        group: "display",
        removability: "display",
      },
      {
        containers: ["c2pa"],
        count: 1,
        group: "ai-provenance",
        removability: "format",
      },
    ]);
    expect(counts).toEqual({ fields: 3, groups: 3, kept: 2, removable: 1 });
  });

  it("builds a stable engine-owned field id", () => {
    expect(fieldIdOf("exif", "Date/Time Original", 0)).toBe(
      "exif:date-time-original:0"
    );
    expect(fieldIdOf("xmp", "!!!", 2)).toBe("xmp:field:2");
  });
});

describe("untrusted text", () => {
  it("turns every supported value shape into text", () => {
    expect(textOf("value")).toBe("value");
    expect(textOf(4)).toBe("4");
    expect(textOf(true)).toBe("true");
    expect(textOf(null)).toBe("");
    expect(textOf(undefined)).toBe("");
    expect(textOf(new Date("2020-01-02T03:04:05.000Z"))).toBe(
      "2020-01-02T03:04:05.000Z"
    );
    expect(textOf({ description: "described" })).toBe("described");
    expect(textOf({ value: "valued" })).toBe("valued");
    expect(textOf([{ value: "a" }, "b", 3])).toBe("a, b, 3");
    expect(textOf(new ArrayBuffer(12))).toBe("12 bytes");
    expect(textOf({ unknown: true })).toBe("");
  });
});

describe("named errors", () => {
  it("carries a code, detail, and optional format and group", () => {
    const error = new ExposeError({
      code: "clean-not-supported",
      detail: "no",
      format: "jxl",
      group: "ai-provenance",
    });
    expect(error.code).toBe("clean-not-supported");
    expect(error.detail).toBe("no");
    expect(error.format).toBe("jxl");
    expect(error.group).toBe("ai-provenance");
    expect(error._tag).toBe("ExposeError");
  });
});
