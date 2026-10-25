/* eslint-disable eslint/no-bitwise, eslint/no-shadow, eslint/no-await-in-loop, eslint/prefer-destructuring, unicorn/no-new-array, unicorn/prefer-spread, unicorn/relative-url-style, unicorn/no-array-sort, unicorn/prefer-code-point, unicorn/no-useless-undefined, promise/no-promise-in-callback -- tests build binary fixtures and catch thrown values */
/* oxlint-disable anti-slop/require-safety-comment-for-type-assertion, anti-slop/no-unknown-parameters, anti-slop/no-shape-in-symbol-names -- tests narrow data they built or caught */
import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import type { FileFormat } from "@/features/expose/expose";
import { imageSizeOf, readFile } from "@/features/expose/expose.reader";

const fixture = (name: string): Uint8Array =>
  new Uint8Array(readFileSync(new URL(`./fixtures/${name}`, import.meta.url)));

const sample = (name: string): Uint8Array =>
  new Uint8Array(
    readFileSync(
      new URL(`../../../public/samples/expose/${name}`, import.meta.url)
    )
  );

const readOf = (name: string, bytes: Uint8Array) =>
  readFile({ bytes, name, type: "" });

/** A RIFF/WEBP container with one chunk and a body starting at offset 20. */
const webpOf = (chunk: string, body: readonly number[]): Uint8Array =>
  new Uint8Array([
    ..."RIFF".split("").map((char) => char.codePointAt(0) ?? 0),
    0,
    0,
    0,
    0,
    ..."WEBP".split("").map((char) => char.codePointAt(0) ?? 0),
    ...chunk.split("").map((char) => char.codePointAt(0) ?? 0),
    0,
    0,
    0,
    0,
    ...body,
  ]);

describe("read: the eight formats", () => {
  const cases: readonly [string, FileFormat][] = [
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
    it(`reads ${format}`, async () => {
      const report = await readOf(name, fixture(name));
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

  it("keeps every field to the five seam keys", async () => {
    for (const [name] of cases) {
      const report = await readOf(name, fixture(name));
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

  it("reads GIF XMP with the shared engine", async () => {
    const report = await readOf("metadata.gif", fixture("metadata.gif"));
    expect(
      report.groups.find((group) => group.group === "ai-provenance")?.count
    ).toBeGreaterThan(0);
  });

  it("reads TIFF dimensions and names the JPEG XL limit", async () => {
    const tiff = await readOf("metadata.tiff", fixture("metadata.tiff"));
    const jxl = await readOf("metadata.jxl", fixture("metadata.jxl"));
    expect(tiff.facts.width).toBeGreaterThan(0);
    expect(jxl.notes.map((note) => note.code)).toContain("jxl-brotli");
  });
});

describe("read: facts", () => {
  it("reads the camera sample's facts, GPS, thumbnail, and C2PA evidence", async () => {
    const report = await readOf(
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

  it("reads AI provenance from a real manifest", async () => {
    const report = await readOf(
      "ai-firefly-c2pa.jpg",
      sample("ai-firefly-c2pa.jpg")
    );
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

  it("reads the GPS point from the separate GPS container", async () => {
    const report = await readOf(
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
    expect(imageSizeOf(fixture("metadata.webp"))).toEqual({
      height: 368,
      width: 550,
    });
    expect(imageSizeOf(fixture("metadata.avif"))).not.toBeNull();
    expect(imageSizeOf(new Uint8Array([1, 2, 3]))).toBeNull();
  });

  it("reads WebP dimensions from the chunk header", () => {
    // 1536 × 1024, the size that a byte-reversed read turns into millions.
    expect(
      imageSizeOf(
        webpOf(
          "VP8X",
          [0, 0, 0, 0, 0xff, 0x05, 0x00, 0xff, 0x03, 0x00, 0, 0, 0, 0]
        )
      )
    ).toEqual({ height: 1024, width: 1536 });

    // 800 × 600, stored as two 14-bit fields in one little-endian word.
    expect(
      imageSizeOf(webpOf("VP8L", [0x2f, 0x1f, 0xc3, 0x95, 0x00, 0, 0, 0, 0, 0]))
    ).toEqual({ height: 600, width: 800 });

    // 800 × 600, stored after the three-byte frame tag.
    expect(
      imageSizeOf(
        webpOf(
          "VP8 ",
          [0, 0, 0, 0x9d, 0x01, 0x2a, 0x20, 0x03, 0x58, 0x02, 0, 0, 0, 0]
        )
      )
    ).toEqual({ height: 600, width: 800 });
  });
});

describe("read: failures", () => {
  it("rejects an unsupported format even with an image name", async () => {
    await expect(
      readOf("false.jpg", new Uint8Array([1, 2, 3]))
    ).rejects.toMatchObject({ code: "unsupported-format" });
  });
  it("rejects a damaged image", async () => {
    await expect(
      readOf("broken.jpg", new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 0]))
    ).rejects.toMatchObject({ code: "unreadable-file" });
  });
});
