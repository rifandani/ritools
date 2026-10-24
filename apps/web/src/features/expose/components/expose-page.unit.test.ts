import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import type {
  CleanResult,
  ExposeSource,
  MetadataGroup,
  MetadataGroupReport,
  ReadReport,
} from "@/features/expose/expose";
import { METADATA_GROUPS } from "@/features/expose/expose";
import { storeCleanResult } from "@/features/expose/expose.batch";
import type { ExposeController } from "@/features/expose/use-expose";

vi.mock("@/features/i18n/use-translation", () => ({
  useTranslation: () => ({
    locale: "en-US",
    t: (key: string) => key,
  }),
}));

const noop = (): void => {
  // The markup is printed; the marks are not pressed.
};

const reportWith = (
  counts: Partial<Record<MetadataGroup, number>>,
  overrides: Partial<ReadReport> = {}
): ReadReport => {
  const groups: MetadataGroupReport[] = METADATA_GROUPS.map((group) => ({
    containers: counts[group] === undefined ? [] : ["exif", "gps"],
    count: counts[group] ?? 0,
    group,
    removability: group === "display" ? "display" : "removable",
  }));
  const fields: ReadReport["fields"] = [
    {
      container: "exif",
      group: "authorship",
      id: "exif:artist:0",
      label: "Artist",
      value: "Andy Parsons",
    },
    {
      container: "xmp",
      group: "other-text",
      id: "xmp:comment:1",
      label: "Comment",
      value: "<img src=x onerror=alert(1)>",
    },
  ];
  return {
    ai: {
      c2pa: {
        bytes: 1_200_000,
        claimGenerator: "Nikon_Z_9_Sample_for_Adobe_MAX_2022",
        hasThumbnail: true,
        manifests: 1,
        claimedSigner: "Adobe Inc.",
      },
      digitalSourceTypes: [],
      generationParameters: [],
      signals: [],
    },
    counts: {
      fields: Object.values(counts).reduce(
        (total, count) => total + (count ?? 0),
        0
      ),
      groups: 4,
      kept: 4,
      removable: 3,
    },
    facts: {
      bytes: 1_530_098,
      format: "jpeg",
      frames: null,
      height: 2752,
      mime: "image/jpeg",
      name: "camera-nikon-z9-c2pa.jpg",
      orientation: 1,
      width: 4128,
    },
    fields: counts["other-text"] === undefined ? fields.slice(0, 1) : fields,
    gps: {
      altitudeMeters: 174,
      latitude: 40.736435,
      longitude: -73.99316,
    },
    groups,
    notes: [{ code: "maker-note", detail: null }],
    thumbnail: null,
    ...overrides,
  };
};

const source: ExposeSource = {
  bytes: new Blob([new Uint8Array([1, 2, 3])]),
  lastModified: 0,
  name: "camera-nikon-z9-c2pa.jpg",
  type: "image/jpeg",
};

const result: CleanResult = {
  engine: { name: "ExifTool", version: "13.59" },
  file: {
    bytes: new Uint8Array([1, 2, 3]),
    name: "camera-nikon-z9-c2pa-clean.jpg",
    type: "image/jpeg",
  },
  kept: [{ after: 2, before: 2, group: "location" }],
  removed: [{ after: 0, before: 12, group: "ai-provenance" }],
  verification: {
    c2pa: { afterBytes: 0, beforeBytes: 1_200_000 },
    display: { after: 3, before: 3, group: "display" },
    kept: [{ after: 2, before: 2, group: "location" }],
    payload: { afterHash: "a", beforeHash: "a", unchanged: true },
    read: reportWith({ location: 2, display: 3 }),
    selected: [{ after: 0, before: 12, group: "ai-provenance" }],
  },
  warnings: [{ code: "maker-note-removed", detail: null, group: null }],
};

const controllerWith = (
  overrides: Partial<ExposeController> = {}
): ExposeController => ({
  watch: {
    start: async () => {},
    stop: noop,
    supported: false,
    status: "idle",
  },
  items: [],
  activeId: null,
  batch: false,
  canCleanAll: false,
  completed: 0,
  runTotal: 0,
  skipped: 0,
  duplicates: 0,
  zipStatus: "idle",
  zipLeftOut: 0,
  pendingTotal: false,
  pendingBytes: 0,
  pendingNames: [],
  actions: {
    openFiles: noop,
    openItem: noop,
    backToBatch: noop,
    remove: noop,
    clear: noop,
    cleanAll: noop,
    downloadOne: noop,
    downloadAll: noop,
    cancelClean: noop,
    clean: noop,
    cleanAgain: noop,
    cleanAnother: noop,
    confirmLarge: noop,
    dismissLarge: noop,
    downloadOriginal: noop,
    openFile: noop,
    openSample: noop,
    setCustom: noop,
    setPreset: noop,
  },
  canStart: false,
  cancelled: false,
  cleanError: null,
  cleanProgress: null,
  cleaning: false,
  custom: [],
  groups: [],
  online: true,
  pendingLarge: null,
  preset: "ai-only",
  presetReasons: {
    "ai-only": null,
    everything: null,
    personal: null,
    custom: null,
  },
  readError: null,
  reading: false,
  report: null,
  result: null,
  sample: null,
  source: null,
  summary: {
    displayFields: 3,
    fields: 0,
    groups: 0,
    keptFields: 0,
    keptGroups: 0,
  },
  ...overrides,
});

// The mocked hook reads this at call time; the page module is imported after
// the first assignment, so the mock factory never sees an empty binding.
let pageMock: ExposeController = controllerWith();

vi.mock("@/features/expose/use-expose", () => ({
  useExpose: () => pageMock,
}));

const { ExposePage } = await import("@/features/expose/components/expose-page");

const render = (controller: ExposeController): string => {
  pageMock = controller;
  return renderToStaticMarkup(createElement(ExposePage));
};

describe("ExposePage markup", () => {
  it("prints the drop zone, both samples, the explainer, and the FAQ", () => {
    const markup = render(controllerWith());
    expect(markup).toContain("exposeDrop");
    expect(markup).toContain("exposeChooseFile");
    expect(markup).toContain("exposeSampleCamera");
    expect(markup).toContain("exposeSampleAi");
    expect(markup).toContain("exposeExplainerTitle");
    expect(markup).toContain("exposeExplainerLede");
    expect(markup).toContain("exposeCompareHeading");
    expect(markup).toContain("exposeColJimpl");
    expect(markup).toContain("exposeColMetadata2go");
    expect(markup).toContain("exposeColImageScrubber");
    expect(markup).toContain("exposeFaqHeading");
    expect(markup).toContain("exposeFaqExifQ");
    expect(markup).toContain("exposeDisclaimerHeading");
    // The sample actions are buttons, so the keyboard reaches them.
    expect(markup).toContain("<button");
  });

  it("prints the full desk from a report", () => {
    const report = reportWith({
      "ai-provenance": 12,
      authorship: 1,
      display: 3,
      location: 6,
      "other-text": 1,
      thumbnails: 1,
    });
    const markup = render(
      controllerWith({
        canStart: true,
        groups: ["ai-provenance"],
        report,
        sample: "camera",
        source,
        summary: {
          displayFields: 3,
          fields: 12,
          groups: 1,
          keptFields: 12,
          keptGroups: 5,
        },
      })
    );
    expect(markup).toContain("exposeReportTitle");
    expect(markup).toContain("exposeCleanTitle");
    expect(markup).toContain("exposeGpsTitle");
    expect(markup).toContain("40.736435");
    expect(markup).toContain("exposeAiTitle");
    expect(markup).toContain("exposeGroupLocation");
    // The one red action mark is in the order.
    expect(markup).toContain('id="expose-clean"');
  });

  it("renders every metadata value as text, never as HTML", () => {
    const report = reportWith({ "ai-provenance": 12, "other-text": 1 });
    const markup = render(
      controllerWith({
        canStart: true,
        groups: ["ai-provenance"],
        report,
        source,
      })
    );
    expect(markup).toContain("&lt;img src=x onerror=alert(1)&gt;");
    expect(markup).not.toContain("<img src=x onerror");
  });

  it("prints the receipt with a named download after a Clean", () => {
    const report = reportWith({ "ai-provenance": 12, location: 2, display: 3 });
    const markup = render(
      controllerWith({
        groups: ["ai-provenance"],
        report,
        result: storeCleanResult(result),
        source,
      })
    );
    expect(markup).toContain("exposeVerificationTitle");
    expect(markup).toContain('aria-label="exposeVerificationMarksLabel"');
    expect(markup).toContain("exposeVerificationSelectedZero");
    expect(markup).toContain("exposeVerificationPayloadSame");
    expect(markup).toContain("exposeVerificationC2paGone");
    expect(markup).toContain('download="camera-nikon-z9-c2pa-clean.jpg"');
    expect(markup).toContain("exposeDownload");
    // The receipt names the size before and after, with the difference.
    expect(markup).toContain("exposeVerificationSize");
    // The shared preset stays visible beside the receipt.
    expect(markup).toContain('id="expose-clean"');
  });

  it("prints the unsupported format state with the format list", () => {
    const markup = render(
      controllerWith({
        readError: {
          code: "unsupported-format",
          detail: "",
          format: null,
          group: null,
        },
        source: null,
      })
    );
    expect(markup).toContain("exposeUnsupportedTitle");
    expect(markup).toContain("exposeTryAnother");
    expect(markup).toContain('role="alert"');
  });

  it("names the reason the Clean mark is disabled", () => {
    const report = reportWith({ display: 3 });
    const markup = render(
      controllerWith({
        preset: "custom",
        report,
        source,
        summary: {
          displayFields: 3,
          fields: 0,
          groups: 0,
          keptFields: 0,
          keptGroups: 0,
        },
      })
    );
    expect(markup).toContain("exposeCleanNoFields");
    expect(markup).toContain('aria-describedby="expose-clean-why"');
  });
});
