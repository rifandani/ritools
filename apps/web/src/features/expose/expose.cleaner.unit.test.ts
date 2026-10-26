/* eslint-disable eslint/no-bitwise, eslint/no-shadow, eslint/no-await-in-loop, eslint/prefer-destructuring, unicorn/no-new-array, unicorn/prefer-spread, unicorn/relative-url-style, unicorn/no-array-sort, unicorn/prefer-code-point, unicorn/no-useless-undefined, promise/no-promise-in-callback -- tests build binary fixtures and catch thrown values */
/* oxlint-disable anti-slop/require-safety-comment-for-type-assertion, anti-slop/no-unknown-parameters, anti-slop/no-shape-in-symbol-names -- tests narrow data they built or caught */
import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import type { ExposeSource, MetadataGroup } from "@/features/expose/expose";
import { ExposeError } from "@/features/expose/expose";
import { cleanFile } from "@/features/expose/expose.cleaner";
import type { ExifToolWriter } from "@/features/expose/expose.cleaner";
import { TAG_MAP } from "@/features/expose/expose.groups";
import { nodeExifToolWriter } from "@/features/expose/expose.writer.node";

const fixture = (name: string): Uint8Array =>
  new Uint8Array(readFileSync(new URL(`./fixtures/${name}`, import.meta.url)));

const sample = (name: string): Uint8Array =>
  new Uint8Array(
    readFileSync(
      new URL(`../../../public/samples/expose/${name}`, import.meta.url)
    )
  );

const sourceOf = (bytes: Uint8Array, name: string): ExposeSource => ({
  bytes: new Blob([bytes.slice().buffer as ArrayBuffer]),
  lastModified: 0,
  name,
  type: "",
});

const asText = (bytes: Uint8Array): string =>
  Buffer.from(bytes).toString("latin1");

const writerThatFails = (error: ExposeError): ExifToolWriter => ({
  name: "ExifTool",
  version: "13.59",
  write: () => Promise.reject(error),
});

const writerThatKeeps = (): ExifToolWriter & { readonly tags: string[] } => {
  const tags: string[] = [];
  return {
    name: "ExifTool",
    tags,
    version: "13.59",
    write: (input, requested) => {
      tags.push(...requested);
      return nodeExifToolWriter.write(input, requested, () => {});
    },
  };
};

describe("clean: presets on the camera sample", () => {
  // Real WASM writes of the large camera sample exceed 5 seconds on CI.
  it("AI only removes the manifest and keeps camera, GPS, and copyright", async () => {
    const input = sample("camera-nikon-z9-c2pa.jpg");
    const result = await cleanFile(
      sourceOf(input, "camera-nikon-z9-c2pa.jpg"),
      { groups: [], preset: "ai-only" },
      nodeExifToolWriter
    );
    expect(result.verification.selected).toEqual([
      { after: 0, before: expect.any(Number), group: "ai-provenance" },
    ]);
    expect(result.verification.c2pa.afterBytes).toBe(0);
    expect(result.verification.c2pa.beforeBytes).toBeGreaterThan(100_000);
    expect(result.verification.content.unchanged).toBe(true);
    expect(result.verification.display.after).toBe(
      result.verification.display.before
    );
    expect(asText(result.file.bytes)).not.toContain(
      "Nikon_Z_9_Sample_for_Adobe_MAX_2022"
    );
    const kept = new Map(result.kept.map((group) => [group.group, group]));
    expect(kept.get("location")?.after).toBe(kept.get("location")?.before);
    expect(kept.get("time")?.after).toBe(kept.get("time")?.before);
    expect(kept.get("authorship")?.after).toBe(kept.get("authorship")?.before);
    expect(
      result.verification.read.fields.some(
        (field) => field.group === "ai-provenance"
      )
    ).toBe(false);
    expect(result.warnings.map((warning) => warning.code)).toEqual([]);
  }, 30_000);

  it("Personal removes the personal groups and keeps camera settings", async () => {
    const result = await cleanFile(
      sourceOf(sample("camera-nikon-z9-c2pa.jpg"), "camera-nikon-z9-c2pa.jpg"),
      { groups: [], preset: "personal" },
      nodeExifToolWriter
    );
    expect(result.verification.selected.map((group) => group.after)).toEqual([
      0, 0, 0, 0, 0,
    ]);
    expect(result.verification.c2pa.afterBytes).toBe(
      result.verification.c2pa.beforeBytes
    );
    const camera = result.verification.read.groups.find(
      (group) => group.group === "camera-settings"
    );
    expect(camera?.count).toBeGreaterThan(0);
    expect(result.verification.content.unchanged).toBe(true);
  }, 30_000);

  it("Everything removes every removable field and keeps Display Metadata", async () => {
    const result = await cleanFile(
      sourceOf(sample("camera-nikon-z9-c2pa.jpg"), "camera-nikon-z9-c2pa.jpg"),
      { groups: [], preset: "everything" },
      nodeExifToolWriter
    );
    expect(
      result.verification.selected.every((group) => group.after === 0)
    ).toBe(true);
    expect(result.verification.read.counts.removable).toBe(0);
    expect(result.verification.display.after).toBe(
      result.verification.display.before
    );
    expect(result.verification.display.after).toBeGreaterThan(0);
    expect(result.verification.read.facts.orientation).toBe(1);
    expect(result.verification.content.unchanged).toBe(true);
    expect(result.file.name).toBe("camera-nikon-z9-c2pa-clean.jpg");
    expect(result.file.type).toBe("image/jpeg");
  }, 30_000);

  it("removes every group from a JPEG on its own", async () => {
    const groups: readonly MetadataGroup[] = [
      "ai-provenance",
      "location",
      "time",
      "device-identity",
      "camera-settings",
      "authorship",
      "software-history",
      "thumbnails",
      "other-text",
    ];
    for (const group of groups) {
      const result = await cleanFile(
        sourceOf(fixture("metadata.jpg"), "metadata.jpg"),
        { groups: [group], preset: "custom" },
        nodeExifToolWriter
      );
      expect(result.verification.selected, group).toEqual([
        { after: 0, before: expect.any(Number), group },
      ]);
      expect(result.verification.content.unchanged, group).toBe(true);
    }
  }, 30_000);
});

describe("clean: formats", () => {
  const cases = ["jpg", "png", "tiff", "webp", "heic", "avif", "jxl"] as const;
  for (const extension of cases) {
    it(`cleans authorship from ${extension}`, async () => {
      const result = await cleanFile(
        sourceOf(fixture(`metadata.${extension}`), `metadata.${extension}`),
        { groups: ["authorship"], preset: "custom" },
        nodeExifToolWriter
      );
      expect(result.verification.selected[0]?.after).toBe(0);
      expect(result.verification.content.unchanged).toBe(true);
      expect(result.verification.display.after).toBe(
        result.verification.display.before
      );
    });
  }

  it("removes GIF XMP and preserves the image blocks", async () => {
    const input = fixture("metadata.gif");
    const result = await cleanFile(
      sourceOf(input, "metadata.gif"),
      { groups: ["ai-provenance"], preset: "custom" },
      nodeExifToolWriter
    );
    expect(result.verification.selected[0]?.after).toBe(0);
    expect(result.file.bytes.length).toBeLessThan(input.length);
    expect(result.verification.content.unchanged).toBe(true);
  });
});

describe("clean: format limits", () => {
  it("refuses to remove a JPEG XL C2PA manifest", async () => {
    const error = await cleanFile(
      sourceOf(fixture("metadata.jxl"), "metadata.jxl"),
      { groups: ["ai-provenance"], preset: "custom" },
      nodeExifToolWriter
    ).catch((error: unknown) => error);
    expect(error).toBeInstanceOf(ExposeError);
    expect((error as ExposeError).code).toBe("clean-not-supported");
    expect((error as ExposeError).format).toBe("jxl");
    expect((error as ExposeError).group).toBe("ai-provenance");
  });

  it("rejects a request that contains Display", async () => {
    const error = await cleanFile(
      sourceOf(fixture("metadata.jpg"), "metadata.jpg"),
      { groups: ["display"], preset: "custom" },
      nodeExifToolWriter
    ).catch((error: unknown) => error);
    expect(error).toBeInstanceOf(ExposeError);
    expect((error as ExposeError).code).toBe("clean-not-supported");
  });
});

describe("clean: warnings and writer contract", () => {
  it("removes a whole Maker Note and warns", async () => {
    const writer = writerThatKeeps();
    const result = await cleanFile(
      sourceOf(sample("camera-nikon-z9-c2pa.jpg"), "camera-nikon-z9-c2pa.jpg"),
      { groups: ["camera-settings"], preset: "custom" },
      writer
    );
    expect(writer.tags).toContain("MakerNotes:all");
    expect(result.warnings.map((warning) => warning.code)).toContain(
      "maker-note-removed"
    );
    expect(result.warnings.map((warning) => warning.code)).toContain(
      "c2pa-not-validated"
    );
    expect(result.verification.content.unchanged).toBe(true);
  });

  it("reports the engine facts and a new file name", async () => {
    const writer = writerThatKeeps();
    const result = await cleanFile(
      sourceOf(fixture("metadata.jpg"), "input.jpg"),
      { groups: ["authorship"], preset: "custom" },
      writer
    );
    expect(result.engine).toEqual({ name: "ExifTool", version: "13.59" });
    expect(result.file.name).toBe("input-clean.jpg");
    expect(result.file.type).toBe("image/jpeg");
  });

  it("maps an unavailable engine", async () => {
    const error = await cleanFile(
      sourceOf(fixture("metadata.jpg"), "metadata.jpg"),
      { groups: ["authorship"], preset: "custom" },
      writerThatFails(
        new ExposeError({ code: "engine-unavailable", detail: "offline" })
      )
    ).catch((error: unknown) => error);
    expect((error as ExposeError).code).toBe("engine-unavailable");
  });

  it("maps an engine failure", async () => {
    const error = await cleanFile(
      sourceOf(fixture("metadata.jpg"), "metadata.jpg"),
      { groups: ["authorship"], preset: "custom" },
      writerThatFails(
        new ExposeError({ code: "engine-failed", detail: "boom" })
      )
    ).catch((error: unknown) => error);
    expect((error as ExposeError).code).toBe("engine-failed");
  });

  it("maps a device that cannot allocate the clean", async () => {
    const error = await cleanFile(
      sourceOf(fixture("metadata.jpg"), "metadata.jpg"),
      { groups: ["authorship"], preset: "custom" },
      writerThatFails(
        new ExposeError({ code: "too-large", detail: "out of memory" })
      )
    ).catch((error: unknown) => error);
    expect((error as ExposeError).code).toBe("too-large");
  });

  it("reports an unreadable source", async () => {
    const source = new Blob([new ArrayBuffer(4)]);
    Object.defineProperty(source, "arrayBuffer", {
      value: () => Promise.reject(new Error("gone")),
    });
    const error = await cleanFile(
      { bytes: source, lastModified: 0, name: "bad.jpg", type: "" },
      { groups: ["authorship"], preset: "custom" },
      nodeExifToolWriter
    ).catch((error: unknown) => error);
    expect((error as ExposeError).code).toBe("unreadable-file");
  });
});

describe("the curated tag table", () => {
  it("never removes Display Metadata", () => {
    expect(TAG_MAP.image.display).toEqual([]);
    for (const tags of Object.values(TAG_MAP.image)) {
      expect(tags).not.toContain("Orientation");
      expect(tags).not.toContain("ImageWidth");
      expect(tags).not.toContain("ImageHeight");
      expect(tags.join(",")).not.toMatch(/ICC/u);
    }
  });

  it("uses JUMBF for AI Provenance", () => {
    expect(TAG_MAP.image["ai-provenance"]).toContain("JUMBF:all");
  });
});

it("rejects empty selections and byte-identical output", async () => {
  const source = sourceOf(fixture("metadata.jpg"), "photo.jpg");
  await expect(
    cleanFile(source, { preset: "custom", groups: [] }, nodeExifToolWriter)
  ).rejects.toMatchObject({ code: "clean-not-supported" });
  await expect(
    cleanFile(
      source,
      { preset: "custom", groups: ["authorship"] },
      { ...nodeExifToolWriter, write: (input) => Promise.resolve(input.bytes) }
    )
  ).rejects.toMatchObject({ code: "clean-not-supported" });
});
it("rejects a selected group that does not shrink", async () => {
  const source = sourceOf(fixture("metadata.jpg"), "photo.jpg");
  await expect(
    cleanFile(
      source,
      { preset: "custom", groups: ["authorship"] },
      {
        ...nodeExifToolWriter,
        write: (input) =>
          nodeExifToolWriter.write(input, ["EXIF:Software"], () => {}),
      }
    )
  ).rejects.toMatchObject({ code: "clean-not-supported", group: "authorship" });
});
it("rejects changed content even after removing the selected metadata", async () => {
  const source = sourceOf(fixture("metadata.jpg"), "photo.jpg");
  await expect(
    cleanFile(
      source,
      { preset: "custom", groups: ["authorship"] },
      {
        ...nodeExifToolWriter,
        write: async (input, tags) => {
          const output = await nodeExifToolWriter.write(input, tags, () => {});
          const at = output.length - 3;
          output[at] = (output[at] ?? 0) ^ 1;
          return output;
        },
      }
    )
  ).rejects.toMatchObject({
    code: "engine-failed",
    detail: "image-payload: content changed",
  });
});
