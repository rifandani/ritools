/* eslint-disable eslint/no-bitwise, eslint/no-shadow, eslint/no-await-in-loop, eslint/prefer-destructuring, unicorn/no-new-array, unicorn/prefer-spread, unicorn/relative-url-style, unicorn/no-array-sort, unicorn/prefer-code-point, unicorn/no-useless-undefined, promise/no-promise-in-callback -- tests build binary fixtures and catch thrown values */
/* oxlint-disable anti-slop/require-safety-comment-for-type-assertion, anti-slop/no-unknown-parameters, anti-slop/no-shape-in-symbol-names -- tests narrow data they built or caught */
import { readFileSync } from "node:fs";

import ExifReader from "exifreader";
import { describe, expect, it, vi } from "vitest";

import type { ImageFormat } from "@/features/expose/expose";
import { ExposeError } from "@/features/expose/expose";
import { imageSizeOf, readImage } from "@/features/expose/expose.reader";

const fixture = (name: string): Uint8Array =>
  new Uint8Array(readFileSync(new URL(`./fixtures/${name}`, import.meta.url)));

const sample = (name: string): Uint8Array =>
  new Uint8Array(
    readFileSync(
      new URL(`../../../public/samples/expose/${name}`, import.meta.url)
    )
  );

const readOf = (name: string, bytes: Uint8Array) =>
  readImage({ bytes, name, type: "" });

describe("read: the eight formats", () => {
  const cases: readonly [string, ImageFormat][] = [
    ["metadata.jpg", "jpeg"],
    ["metadata.png", "png"],
    ["metadata.tiff", "tiff"],
    ["metadata.webp", "webp"],
    ["metadata.heic", "heic"],
    ["metadata.avif", "avif"],
    ["metadata.jxl", "jxl"],
    ["metadata.gif", "gif"],
  ];

  for (const [name, format] of cases) {
    it(`reads ${format}`, () => {
      const report = readOf(name, fixture(name));
      expect(report.facts.format).toBe(format);
      expect(report.facts.name).toBe(name);
      expect(report.facts.mime).toBe(
        format === "jpeg"
          ? "image/jpeg"
          : format === "jxl"
            ? "image/jxl"
            : `image/${format}`
      );
      expect(report.groups).toHaveLength(10);
      expect(report.groups.map((group) => group.group)).toEqual([
        "ai-provenance",
        "location",
        "time",
        "device-identity",
        "camera-settings",
        "authorship",
        "software-history",
        "thumbnails",
        "other-text",
        "display",
      ]);
      expect(report.counts.fields).toBe(report.fields.length);
      expect(report.counts.groups).toBe(
        report.groups.filter((group) => group.count > 0).length
      );
    });
  }

  it("keeps every field to the five seam keys", () => {
    for (const [name] of cases) {
      const report = readOf(name, fixture(name));
      for (const field of report.fields) {
        expect(Object.keys(field).sort()).toEqual([
          "container",
          "group",
          "id",
          "label",
          "value",
        ]);
        expect(field.value).not.toContain("<script");
      }
    }
  });

  it("reads GIF as image details only", () => {
    const report = readOf("metadata.gif", fixture("metadata.gif"));
    expect(report.notes.map((note) => note.code)).toContain("gif-details-only");
    expect(report.notes.map((note) => note.code)).toContain("icc-not-read");
    expect(report.fields.every((field) => field.group === "display")).toBe(
      true
    );
  });

  it("names the TIFF and JPEG XL limits", () => {
    expect(
      readOf("metadata.tiff", fixture("metadata.tiff")).notes.map(
        (note) => note.code
      )
    ).toContain("tiff-no-file-details");
    expect(
      readOf("metadata.jxl", fixture("metadata.jxl")).notes.map(
        (note) => note.code
      )
    ).toContain("jxl-brotli");
  });
});

describe("read: facts", () => {
  it("reads the camera sample's facts, GPS, thumbnail, and C2PA evidence", () => {
    const report = readOf(
      "camera-nikon-z9-c2pa.jpg",
      sample("camera-nikon-z9-c2pa.jpg")
    );
    expect(report.facts.width).toBe(4128);
    expect(report.facts.height).toBe(2752);
    expect(report.facts.orientation).toBe(1);
    expect(report.gps).toEqual({
      altitudeMeters: 174,
      latitude: 40.736435,
      longitude: -73.99316,
    });
    expect(report.thumbnail).not.toBeNull();
    expect(report.thumbnail?.width).toBe(160);
    expect(report.thumbnail?.height).toBe(120);
    expect(report.thumbnail?.bytes).toBeGreaterThan(9000);
    expect(report.thumbnail?.mime).toBe("image/jpeg");
    expect(report.ai.c2pa?.manifests).toBe(1);
    expect(report.ai.c2pa?.bytes).toBeGreaterThan(200_000);
    expect(report.ai.c2pa?.claimGenerator).toContain("Nikon_Z_9_Sample");
    expect(report.ai.c2pa?.hasThumbnail).toBe(true);
  });

  it("reads AI provenance from a real manifest", () => {
    const report = readOf("ai-firefly-c2pa.jpg", sample("ai-firefly-c2pa.jpg"));
    expect(report.facts.width).toBe(2304);
    expect(report.facts.height).toBe(1792);
    expect(report.gps).toBeNull();
    expect(report.thumbnail).toBeNull();
    expect(report.ai.c2pa?.claimGenerator).toBe("Adobe_Firefly");
    expect(report.ai.c2pa?.claimedSigner).toBe("Adobe Firefly C2PA");
    expect(report.ai.digitalSourceTypes).toContain(
      "http://cv.iptc.org/newscodes/digitalsourcetype/trainedAlgorithmicMedia"
    );
    expect(report.ai.generationParameters).toEqual(
      expect.arrayContaining([
        { label: "com.adobe.firefly.operation", value: "text_to_image" },
      ])
    );
    expect(
      report.groups.find((group) => group.group === "ai-provenance")?.count
    ).toBeGreaterThan(0);
  });

  it("reads the GPS point from the separate GPS container", () => {
    const report = readOf(
      "camera-nikon-z9-c2pa.jpg",
      sample("camera-nikon-z9-c2pa.jpg")
    );
    expect(
      report.groups.find((group) => group.group === "location")?.count
    ).toBeGreaterThan(0);
  });

  it("reads dimensions for every container", () => {
    expect(imageSizeOf(fixture("metadata.jpg"))).not.toBeNull();
    expect(imageSizeOf(fixture("metadata.png"))).not.toBeNull();
    expect(imageSizeOf(fixture("metadata.gif"))).not.toBeNull();
    expect(imageSizeOf(fixture("metadata.webp"))).not.toBeNull();
    expect(imageSizeOf(fixture("metadata.avif"))).not.toBeNull();
    expect(imageSizeOf(new Uint8Array([1, 2, 3]))).toBeNull();
  });
});

describe("read: failures", () => {
  it("rejects an unsupported format", () => {
    const error = (() => {
      try {
        readOf("note.txt", new Uint8Array([1, 2, 3]));
        return null;
      } catch (error) {
        return error;
      }
    })();
    expect(error).toBeInstanceOf(ExposeError);
    expect((error as ExposeError).code).toBe("unsupported-format");
  });

  it("maps an ExifReader throw to unreadable-file", () => {
    const spy = vi.spyOn(ExifReader, "load").mockImplementation(() => {
      throw new Error("bad container");
    });
    const error = (() => {
      try {
        readOf("broken.jpg", new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 0]));
        return null;
      } catch (error) {
        return error;
      }
    })();
    spy.mockRestore();
    expect(error).toBeInstanceOf(ExposeError);
    expect((error as ExposeError).code).toBe("unreadable-file");
  });

  it("maps an allocation failure to too-large", () => {
    const spy = vi.spyOn(ExifReader, "load").mockImplementation(() => {
      throw new RangeError("Array buffer allocation failed");
    });
    const error = (() => {
      try {
        readOf("large.jpg", new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 0]));
        return null;
      } catch (error) {
        return error;
      }
    })();
    spy.mockRestore();
    expect(error).toBeInstanceOf(ExposeError);
    expect((error as ExposeError).code).toBe("too-large");
  });

  it("rejects a supported format whose container is empty", () => {
    const spy = vi
      .spyOn(ExifReader, "load")
      .mockImplementation((() => ({})) as never);
    const error = (() => {
      try {
        readOf("empty.jpg", new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 0]));
        return null;
      } catch (error) {
        return error;
      }
    })();
    spy.mockRestore();
    expect(error).toBeInstanceOf(ExposeError);
    expect((error as ExposeError).code).toBe("unreadable-file");
  });
});
