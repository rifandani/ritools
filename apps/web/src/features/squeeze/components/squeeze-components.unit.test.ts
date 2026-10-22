import { Option } from "effect";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/features/i18n/use-translation", () => ({
  useTranslation: () => ({
    locale: "en-US",
    t: (key: string) => key,
  }),
}));

const noop = (): void => {
  // The test prints the markup; it does not press the marks.
};

/** The row's result before a run lands. */
const NO_RESULT: Parameters<typeof SqueezeItemRow>[0]["result"] = undefined;

const pageState = {
  add: noop,
  batch: new Map(),
  canRun: false,
  clear: noop,
  downloadAll: () => Promise.resolve({ failed: false, leftOut: 0 }),
  downloadOne: noop,
  downloadPart: noop,
  issues: [],
  online: true,
  pending: [],
  recompress: noop,
  remove: noop,
  results: new Map(),
  run: noop,
  running: false,
  setSettings: noop,
  settings: {
    batchTotalBytes: 1_000_000,
    maxHeight: null,
    maxWidth: null,
    outputFormat: "keep",
    preserveExif: false,
    preserveFolders: false,
    quality: 80,
    sizeMode: "per-image",
    targetBytes: 100_000,
  } as const,
  staleIds: new Set(),
  startWatch: null,
  status: {
    duplicates: 0,
    skipped: 0,
    watchDenied: false,
    watchRevoked: false,
    watchUnsupported: false,
    watched: 0,
  },
  stop: noop,
  stopWatching: noop,
  summary: {
    alreadyFits: 0,
    bigger: 0,
    done: 0,
    inputBytes: 0,
    misses: 0,
    outputBytes: 0,
    rejected: 0,
    total: 0,
    underTarget: 0,
  },
  watching: false,
  working: new Set(),
};

vi.mock("@/features/squeeze/use-squeeze", () => ({
  useSqueeze: () => pageState,
}));

const { SqueezePage } =
  await import("@/features/squeeze/components/squeeze-page");
const { SqueezeItemRow } =
  await import("@/features/squeeze/components/squeeze-item-row");
const { SqueezeSettingsBar } =
  await import("@/features/squeeze/components/squeeze-settings-bar");
const { SqueezeDropZone } =
  await import("@/features/squeeze/components/squeeze-drop-zone");

const item = {
  folderPath: null,
  format: Option.some("png" as const),
  id: "row-1",
  lastModified: 1,
  name: "photo.png",
  size: 2048,
  source: new Blob(["x"], { type: "image/png" }),
  targetBytes: null,
};

const view = {
  files: [
    {
      bytes: new ArrayBuffer(1024),
      format: "webp" as const,
      height: 600,
      levels: null,
      quality: 80,
      size: 1024,
      width: 800,
    },
  ],
  inputBytes: 2048,
  notes: [],
  outputBytes: 1024,
  parts: [],
  problem: null,
  raisedTargetBytes: null,
  saved: 50,
  smallestStep: null,
  state: "done" as const,
  stale: false,
  underTargetCount: 1,
  writtenCount: 1,
};

const rowOf = (overrides: Partial<Parameters<typeof SqueezeItemRow>[0]> = {}) =>
  createElement(SqueezeItemRow, {
    id: item.id,
    item,
    locale: "en-US",
    result: NO_RESULT,
    onDownload: noop,
    onDownloadPart: noop,
    onRaiseTarget: noop,
    onRecompress: noop,
    onRemove: noop,
    onResize: noop,
    onTryFormat: noop,
    online: true,
    problemFormat: "WEBP",
    running: false,
    stale: false,
    view,
    working: false,
    ...overrides,
  });

describe("SqueezePage", () => {
  it("renders the empty state", () => {
    const html = renderToStaticMarkup(createElement(SqueezePage));
    expect(html).toContain("squeezeChooseFiles");
  });
});

describe("SqueezeItemRow", () => {
  it("renders a done row with its output", () => {
    const html = renderToStaticMarkup(rowOf({}));
    expect(html).toContain("photo.png");
    expect(html).toContain("squeezeStateDone");
  });

  it("renders a rejected row with its recovery", () => {
    const html = renderToStaticMarkup(
      rowOf({
        view: {
          ...view,
          files: [],
          outputBytes: null,
          problem: "too-large",
          saved: 0,
          state: "rejected",
          writtenCount: 0,
        },
      })
    );
    expect(html).toContain("squeezeActionResize");
  });
});

describe("SqueezeSettingsBar", () => {
  it("renders the settings groups", () => {
    const html = renderToStaticMarkup(
      createElement(SqueezeSettingsBar, {
        items: [],
        issues: [],
        onChange: noop,
        settings: pageState.settings,
      })
    );
    expect(html).toContain("squeezeOutput");
  });
});

describe("SqueezeDropZone", () => {
  it("renders the drop prompt", () => {
    const html = renderToStaticMarkup(
      createElement(SqueezeDropZone, {
        onFiles: noop,
        onWatchToggle: noop,
        showWatchReason: false,
        watchSupported: false,
        watching: false,
      })
    );
    expect(html).toContain("squeezeChooseFiles");
  });
});
