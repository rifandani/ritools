import { describe, expect, it } from "vitest";

import type {
  MetadataGroup,
  MetadataGroupReport,
  ReadReport,
  Verification,
} from "@/features/expose/expose";
import { METADATA_GROUPS } from "@/features/expose/expose";
import {
  canPreview,
  canClean,
  containerBadgesOf,
  coordinateLine,
  defaultPresetOf,
  formatBytes,
  formatCoordinate,
  groupReportOf,
  keptGroupNames,
  presetReasonOf,
  summaryOf,
  verificationPassed,
  viewerFor,
} from "@/features/expose/expose.view";

/** One report with the counts a test needs, in glossary order. */
const reportWith = (
  counts: Partial<Record<MetadataGroup, number>>,
  removable: Partial<Record<MetadataGroup, "format" | "removable">> = {}
): ReadReport => ({
  ai: {
    c2pa: null,
    digitalSourceTypes: [],
    generationParameters: [],
    signals: [],
  },
  counts: {
    fields: Object.values(counts).reduce(
      (total, count) => total + (count ?? 0),
      0
    ),
    groups: 0,
    kept: 0,
    removable: 0,
  },
  facts: {
    family: "image",
    durationSeconds: null,
    pageCount: null,
    sampleRate: null,
    channels: null,
    parts: null,
    bytes: 1_530_098,
    format: "jpeg",
    frames: null,
    height: 2752,
    mime: "image/jpeg",
    name: "photo.jpg",
    orientation: 1,
    width: 4128,
  },
  fields: [],
  gps: null,
  groups: METADATA_GROUPS.map((group): MetadataGroupReport => ({
    containers: [],
    count: counts[group] ?? 0,
    group,
    removability:
      group === "display" ? "display" : (removable[group] ?? "removable"),
  })),
  notes: [],
  thumbnail: null,
});

const verification = (overrides: Partial<Verification> = {}): Verification => ({
  c2pa: { afterBytes: 0, beforeBytes: 1024 },
  display: { after: 3, before: 3, group: "display" },
  kept: [{ after: 2, before: 2, group: "location" }],
  content: {
    kind: "image-payload",
    parts: null,
    afterHash: "a",
    beforeHash: "a",
    unchanged: true,
  },
  read: reportWith({}),
  selected: [{ after: 0, before: 12, group: "ai-provenance" }],
  ...overrides,
});

describe("formatBytes", () => {
  it("prints decimal units with one place under ten", () => {
    expect(formatBytes(1_530_098, "en-US")).toBe("1.5 MB");
    expect(formatBytes(2580, "en-US")).toBe("2.6 KB");
    expect(formatBytes(900, "en-US")).toBe("900 B");
  });

  it("refuses a negative or non-finite count", () => {
    expect(formatBytes(-1, "en-US")).toBe("0 B");
    expect(formatBytes(Number.NaN, "en-US")).toBe("0 B");
  });
});

describe("coordinates", () => {
  it("prints six decimals and keeps the sign", () => {
    expect(formatCoordinate(-73.99316)).toBe("-73.993160");
    expect(coordinateLine(40.736435, -73.99316)).toBe("40.736435, -73.993160");
  });

  it("never prints a non-finite coordinate", () => {
    expect(formatCoordinate(Number.POSITIVE_INFINITY)).toBe("0.000000");
  });
});

describe("summaryOf", () => {
  const report = reportWith({
    "ai-provenance": 12,
    display: 3,
    location: 6,
    time: 4,
  });

  it("counts the selected groups and what stays", () => {
    expect(summaryOf(report, ["ai-provenance"])).toEqual({
      displayFields: 3,
      fields: 12,
      groups: 1,
      keptFields: 10,
      keptGroups: 2,
    });
  });

  it("never selects Display", () => {
    expect(summaryOf(report, ["display"]).fields).toBe(0);
    expect(summaryOf(report, ["display"]).displayFields).toBe(3);
  });
});

describe("preset availability", () => {
  it("offers AI only when a manifest is present", () => {
    const report = reportWith({ "ai-provenance": 12 });
    expect(presetReasonOf(report, "ai-only")).toBeNull();
    expect(defaultPresetOf(report)).toBe("ai-only");
  });

  it("blocks AI only and Everything when the format cannot remove AI Provenance", () => {
    const report = reportWith(
      { "ai-provenance": 12, location: 6 },
      { "ai-provenance": "format" }
    );
    expect(presetReasonOf(report, "ai-only")).toBe("format-limit");
    expect(presetReasonOf(report, "everything")).toBe("format-limit");
    expect(presetReasonOf(report, "personal")).toBeNull();
  });

  it("falls back to Custom when no preset has a field", () => {
    const report = reportWith({ display: 3 });
    expect(presetReasonOf(report, "personal")).toBe("empty");
    expect(defaultPresetOf(report)).toBe("custom");
  });

  it("lets Personal ignore a format-limited AI group", () => {
    const report = reportWith(
      { "ai-provenance": 12, location: 6 },
      { "ai-provenance": "format" }
    );
    expect(presetReasonOf(report, "personal")).toBeNull();
  });
});

describe("canClean", () => {
  it("refuses a selection with no fields", () => {
    expect(canClean(reportWith({ display: 3 }), ["location"])).toBe(false);
  });

  it("accepts a selection with fields and no format limit", () => {
    expect(canClean(reportWith({ location: 6 }), ["location"])).toBe(true);
  });
});

describe("verificationPassed", () => {
  it("accepts a receipt with nothing left and the same payload", () => {
    expect(verificationPassed(verification())).toBe(true);
  });

  it("refuses a selected group with fields left", () => {
    expect(
      verificationPassed(
        verification({
          selected: [{ after: 1, before: 12, group: "ai-provenance" }],
        })
      )
    ).toBe(false);
  });

  it("refuses a changed payload, even when every group is empty", () => {
    expect(
      verificationPassed(
        verification({
          content: {
            kind: "image-payload",
            parts: null,
            afterHash: "b",
            beforeHash: "a",
            unchanged: false,
          },
        })
      )
    ).toBe(false);
  });
});

describe("report helpers", () => {
  it("fills a missing group with a zero row", () => {
    const report = { ...reportWith({}), groups: [] };
    expect(groupReportOf(report, "location").count).toBe(0);
    expect(groupReportOf(report, "display").removability).toBe("display");
  });

  it("keeps at most three container badges and counts the rest", () => {
    const badges = containerBadgesOf({
      containers: ["exif", "gps", "xmp", "iptc", "icc"],
      count: 3,
      group: "location",
      removability: "removable",
    });
    expect(badges.shown).toEqual(["EXIF", "GPS", "XMP"]);
    expect(badges.more).toBe(2);
  });

  it("names the kept groups in glossary order", () => {
    const report = reportWith({ location: 2, time: 3, display: 1 });
    expect(keptGroupNames(report, ["time"], (group) => group)).toEqual([
      "location",
    ]);
  });

  it("plates the formats the browser cannot draw", () => {
    expect(canPreview("jpeg")).toBe(true);
    expect(canPreview("heic")).toBe(false);
    expect(canPreview("jxl")).toBe(false);
    expect(canPreview("tiff")).toBe(false);
  });

  it("gives Office files no viewer", () => {
    for (const format of ["docx", "xlsx", "pptx"] as const) {
      expect(viewerFor(format)).toBe("plate");
    }
  });
});

it("does not let empty unsupported groups block a supported family preset", () => {
  const report = reportWith(
    { authorship: 2 },
    { "ai-provenance": "format", "camera-settings": "format" }
  );
  expect(
    canClean(report, ["authorship", "ai-provenance", "camera-settings"])
  ).toBe(true);
});
