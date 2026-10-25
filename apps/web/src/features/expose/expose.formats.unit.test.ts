/* eslint-disable eslint/no-await-in-loop -- ExifTool shares one Perl interpreter, so calls must be sequential */
/* oxlint-disable react-doctor/async-await-in-loop -- the real engine cannot run concurrent calls */
import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import { sniffFormat, isReadOnly } from "@/features/expose/expose";
import { cleanFile } from "@/features/expose/expose.cleaner";
import { nodeMetadataEngine } from "@/features/expose/expose.engine";
import { readFile } from "@/features/expose/expose.reader";

const formats = [
  "pdf",
  "mp4",
  "mov",
  "m4v",
  "webm",
  "mkv",
  "avi",
  "m4a",
  "mp3",
  "wav",
  "flac",
  "ogg",
  "docx",
  "xlsx",
  "pptx",
] as const;
const fixture = (ext: string) =>
  new Uint8Array(
    readFileSync(new URL(`fixtures/metadata.${ext}`, import.meta.url))
  );
describe("the file families with the real engine", () => {
  for (const format of formats) {
    it(`reads ${format} from bytes with a false name`, async () => {
      const bytes = fixture(format);
      expect(sniffFormat(bytes, "false.jpg")).toBe(format);
      const report = await readFile({
        bytes,
        name: "false.jpg",
        type: "image/jpeg",
      });
      expect(report.facts.format).toBe(format);
      expect(report.groups).toHaveLength(10);
      expect({
        facts: report.facts,
        groups: report.groups,
        notes: report.notes,
      }).toMatchSnapshot();
      expect(
        report.fields.some((field) => field.value.includes("Fixture"))
      ).toBe(true);
      if (isReadOnly(format)) {
        expect(
          report.notes.some((note) =>
            ["read-only-format", "pdf-clean-unavailable"].includes(note.code)
          )
        ).toBe(true);
      }
    });
    it(`handles a clean request for ${format}`, async () => {
      const bytes = fixture(format);
      const task = cleanFile(
        {
          bytes: new Blob([bytes]),
          name: `metadata.${format}`,
          type: "",
          lastModified: 0,
        },
        { preset: "custom", groups: ["authorship"] },
        nodeMetadataEngine
      );
      if (isReadOnly(format)) {
        await expect(task).rejects.toMatchObject({
          code: "clean-not-supported",
          format,
        });
      } else {
        const result = await task;
        expect(result.verification.content.unchanged).toBe(true);
        expect(result.verification.selected[0]?.after).toBeLessThan(
          result.verification.selected[0]?.before ?? 0
        );
      }
    });
  }
});

for (const format of [
  "mp4",
  "mov",
  "m4v",
  "m4a",
  "docx",
  "xlsx",
  "pptx",
] as const) {
  it(`cleans each present writable group in ${format} and keeps the others`, async () => {
    const bytes = fixture(format);
    const before = await readFile({
      bytes,
      name: `metadata.${format}`,
      type: "",
    });
    for (const group of before.groups.filter(
      (entry) => entry.count > 0 && entry.removability === "removable"
    )) {
      const result = await cleanFile(
        {
          bytes: new Blob([bytes]),
          name: `metadata.${format}`,
          type: "",
          lastModified: 0,
        },
        { preset: "custom", groups: [group.group] },
        nodeMetadataEngine
      );
      expect(result.verification.content.unchanged, group.group).toBe(true);
      expect(result.verification.selected[0]?.after, group.group).toBeLessThan(
        group.count
      );
      expect(
        result.kept.every((entry) => entry.after === entry.before),
        group.group
      ).toBe(true);
    }
  }, 30_000);
}

for (const format of [
  "mp4",
  "mov",
  "m4v",
  "m4a",
  "docx",
  "xlsx",
  "pptx",
] as const) {
  it(`Everything produces a downloadable verified ${format}`, async () => {
    const bytes = fixture(format);
    const result = await cleanFile(
      {
        bytes: new Blob([bytes]),
        name: `metadata.${format}`,
        type: "",
        lastModified: 0,
      },
      { preset: "everything", groups: [] },
      nodeMetadataEngine
    );
    expect(
      result.verification.read.fields.filter((field) =>
        result.removed.some((change) => change.group === field.group)
      )
    ).toEqual([]);
  });
}

for (const extension of [
  "jpg",
  "png",
  "tiff",
  "webp",
  "heic",
  "avif",
  "jxl",
  "gif",
]) {
  it(`cleans every present writable group in image ${extension}`, async () => {
    const bytes = fixture(extension);
    const before = await readFile({
      bytes,
      name: `metadata.${extension}`,
      type: "",
    });
    for (const group of before.groups.filter(
      (entry) => entry.count > 0 && entry.removability === "removable"
    )) {
      const result = await cleanFile(
        {
          bytes: new Blob([bytes]),
          name: `metadata.${extension}`,
          type: "",
          lastModified: 0,
        },
        { preset: "custom", groups: [group.group] },
        nodeMetadataEngine
      );
      expect(result.verification.selected[0]?.after, group.group).toBe(0);
      expect(result.verification.content.unchanged).toBe(true);
    }
  }, 30_000);
}

it.each(["m4a", "mp3"])("extracts byte-exact %s cover art", async (format) => {
  const report = await readFile({
    bytes: fixture(format),
    name: `metadata.${format}`,
    type: "",
  });
  const cover = new Uint8Array(
    readFileSync(new URL("fixtures/cover.jpg", import.meta.url))
  );
  expect(report.thumbnail).not.toBeNull();
  expect(
    new Uint8Array(
      await (report.thumbnail?.data.arrayBuffer() ??
        Promise.resolve(new ArrayBuffer(0)))
    )
  ).toEqual(cover);
});
