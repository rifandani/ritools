/* eslint-disable promise/no-promise-in-callback -- the mock stands in for the reader */
import { describe, expect, it, vi } from "vitest";

import type { ReadReport } from "@/features/expose/expose";

const { readFileMock } = vi.hoisted(() => ({
  readFileMock: vi.fn(),
}));

vi.mock("@/features/expose/expose.reader", () => ({
  readFile: readFileMock,
}));

const { cleanFile } = await import("@/features/expose/expose.cleaner");

const report = {
  ai: {
    c2pa: null,
    digitalSourceTypes: [],
    generationParameters: [],
    signals: [],
  },
  counts: { fields: 1, groups: 1, kept: 0, removable: 1 },
  facts: {
    family: "image",
    durationSeconds: null,
    pageCount: null,
    sampleRate: null,
    channels: null,
    parts: null,
    bytes: 300_000_000,
    format: "jpeg",
    frames: null,
    height: 1,
    mime: "image/jpeg",
    name: "large.jpg",
    orientation: 1,
    width: 1,
  },
  fields: [
    {
      container: "exif",
      group: "authorship",
      id: "exif:artist:0",
      label: "Artist",
      value: "A",
    },
  ],
  gps: null,
  groups: [
    {
      containers: ["exif"],
      count: 1,
      group: "authorship",
      removability: "removable",
    },
  ],
  notes: [],
  thumbnail: null,
} satisfies ReadReport;

describe("a file over 200 MB", () => {
  it("reports the size before the clean and rejects an unchanged output", async () => {
    readFileMock.mockReturnValue(report);
    const progress: string[] = [];
    const task = cleanFile(
      {
        bytes: new Blob([new Uint8Array([1, 2, 3])]),
        lastModified: 0,
        name: "large.jpg",
        type: "image/jpeg",
      },
      {
        groups: ["authorship"],
        preset: "custom",
        report: (entry) => progress.push(entry.phase),
      },
      {
        name: "ExifTool",
        version: "13.59",
        write: (input) => Promise.resolve(input.bytes),
      }
    );
    await expect(task).rejects.toMatchObject({ code: "clean-not-supported" });
    expect(progress).toContain("cleaning");
  });
});
