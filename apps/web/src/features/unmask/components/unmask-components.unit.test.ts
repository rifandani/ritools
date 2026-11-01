import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { UnmaskBatchList } from "@/features/unmask/components/unmask-batch-list";
import { UnmaskCanvas } from "@/features/unmask/components/unmask-canvas";
import { UnmaskDropZone } from "@/features/unmask/components/unmask-drop-zone";
import { UnmaskEditor } from "@/features/unmask/components/unmask-editor";
import { UnmaskMagicBrush } from "@/features/unmask/components/unmask-magic-brush";
import { UnmaskResult } from "@/features/unmask/components/unmask-result";
import { UnmaskSettingsBar } from "@/features/unmask/components/unmask-settings-bar";
import { UnmaskStateGallery } from "@/features/unmask/components/unmask-state-gallery";
import { DEFAULT_SETTINGS } from "@/features/unmask/unmask";
import type {
  Matte,
  OperationId,
  SourceId,
} from "@/features/unmask/unmask.engine";
import type {
  UnmaskController,
  UnmaskItem,
} from "@/features/unmask/use-unmask";

vi.mock("@/features/i18n/use-translation", () => ({
  useTranslation: () => ({
    locale: "en-US",
    setLocale: () => {
      // The test prints markup; it does not change the Locale.
    },
    t: (key: string) => key,
  }),
}));

const noop = () => {
  // The test prints markup; it does not press the marks.
};

// SAFETY: The fixture id is opaque test data; no file text is part of it.
const MATTE_ID = "matte-test" as Matte["matteId"];

const matte = (width = 4, height = 3): Matte => ({
  alpha: new Uint8Array(width * height).fill(255),
  height,
  matteId: MATTE_ID,
  width,
});

const item = (over: Partial<UnmaskItem> = {}): UnmaskItem => ({
  byteSize: 388_410,
  claimedFormat: "jpeg",
  edited: false,
  error: null,
  facts: {
    bytes: 388_410,
    format: "jpeg",
    frameCount: 1,
    hasAlpha: false,
    height: 1521,
    name: "portrait-hair.jpg",
    // SAFETY: The fixture id is opaque test data; no file text is part of it.
    sourceId: "source-test" as SourceId,
    width: 2400,
  },
  file: new File([], "portrait-hair.jpg", { type: "image/jpeg" }),
  folderPath: null,
  full: matte(),
  id: "item-1",
  model: {
    backend: "wasm",
    bytes: 44_229_662,
    id: "isnet-int8",
    licence: "MIT",
    licenceUrl: "https://example.test",
    name: "ISNet int8",
    sha256: "test",
    version: "test",
  },
  name: "portrait-hair.jpg",
  notes: [],
  operations: [],
  preview: matte(),
  previewBase: matte(),
  progress: null,
  redo: [],
  result: {
    bytes: new Uint8Array(4),
    bytesLength: 284_000,
    format: "webp",
    height: 1521,
    mime: "image/webp",
    name: "portrait-hair-cutout.webp",
    width: 2400,
  },
  settingsKey: "webp|85|0|Transparent|",
  source: null,
  state: "ready",
  ...over,
});

const controller = (over: Partial<UnmaskController> = {}): UnmaskController =>
  // SAFETY: The stub supplies every field the editor reads; the test never
  // presses a mark that reaches a browser API.
  ({
    addFiles: () => [],
    announcement: null,
    applyOperation: noop,
    batch: [],
    canRun: true,
    cancel: noop,
    changeSettings: noop,
    clear: noop,
    counts: { failed: 0, queued: 1, ready: 0, stale: 0 },
    current: null,
    downloadAll: () => Promise.resolve({ failed: false, leftOut: 0 }),
    downloadOne: noop,
    downloadable: 0,
    folderPath: null,
    loadSample: noop,
    open: noop,
    openId: null,
    redo: noop,
    remove: noop,
    removeAll: noop,
    resetMatte: noop,
    retry: noop,
    run: noop,
    running: false,
    sampleFailed: false,
    settings: DEFAULT_SETTINGS,
    skipped: 0,
    t: (key: string) => key,
    undo: noop,
    ...over,
    // SAFETY: The stub supplies every field the editor reads; the test never
    // presses a mark that reaches a browser API.
  }) as UnmaskController;

describe("the empty state", () => {
  it("names the six formats, the folder, the sample, and a named file input", () => {
    const html = renderToStaticMarkup(
      createElement(UnmaskDropZone, {
        onFiles: noop,
        onSample: noop,
        sampleFailed: false,
      })
    );
    expect(html).toContain("unmaskDrop");
    expect(html).toContain("unmaskChoose");
    expect(html).toContain("unmaskChooseFolder");
    expect(html).toContain("unmaskSample");
    expect(html).toContain("image/avif");
    expect(html).toContain('aria-label="unmaskChoose"');
    expect(html).toContain('id="unmask-files"');
  });
});

describe("the Batch list", () => {
  it("is a table with column heads and a row per image", () => {
    const html = renderToStaticMarkup(
      createElement(UnmaskBatchList, {
        batch: [
          item({ id: "ready", name: "ready.jpg" }),
          item({
            edited: true,
            id: "edited",
            name: "edited.jpg",
            operations: [
              {
                _tag: "Brush",
                mode: "restore",
                // SAFETY: The fixture id is opaque test data; no file text is
                // part of it.
                operationId: "op-1" as OperationId,
                points: [{ x: 1, y: 1 }],
                size: 4,
              },
            ],
            state: "edited",
          }),
          item({ id: "stale", name: "stale.jpg", state: "stale" }),
          item({
            error: { _tag: "UnsupportedFormat", format: "application/pdf" },
            id: "failed",
            name: "failed.pdf",
            state: "failed",
          }),
        ],
        folderPath: "holiday",
        onDownload: noop,
        onOpen: noop,
        onRemove: noop,
        onRetry: noop,
        skipped: 2,
      })
    );
    expect(html.match(/scope="col"/gu)).toHaveLength(5);
    expect(html).toContain("unmaskBatchFileColumn");
    expect(html).toContain("unmaskBatchStateColumn");
    expect(html).toContain("unmaskBatchFolder");
    expect(html).toContain("unmaskBatchSkipped");
    expect(html).toContain("unmaskBatchEdited");
    expect(html).toContain("unmaskResultStale");
    expect(html).toContain("unmaskUnsupportedTitle");
  });
});

describe("the settings bar", () => {
  it("prints the three Backdrops, the four formats, and the JPEG reason", () => {
    const html = renderToStaticMarkup(
      createElement(UnmaskSettingsBar, {
        onChange: noop,
        settings: DEFAULT_SETTINGS,
      })
    );
    expect(html).toContain("unmaskBackdropTransparent");
    expect(html).toContain("unmaskBackdropSolid");
    expect(html).toContain("unmaskBackdropBlur");
    expect(html).toContain("unmaskFormatPng");
    expect(html).toContain("unmaskFormatWebp");
    expect(html).toContain("unmaskFormatAvif");
    expect(html).toContain("unmaskFormatJpeg");
    expect(html).toContain("unmaskFormatJpegBlocked");
    expect(html).toContain("unmaskFeather");
    expect(html).toContain("unmaskQuality");
  });

  it("opens the Solid colour and hides the JPEG reason with a Solid Backdrop", () => {
    const html = renderToStaticMarkup(
      createElement(UnmaskSettingsBar, {
        onChange: noop,
        settings: {
          ...DEFAULT_SETTINGS,
          backdrop: {
            _tag: "Solid",
            color: { a: 255, b: 255, g: 255, r: 255 },
          },
        },
      })
    );
    expect(html).toContain("unmaskColor");
    expect(html).not.toContain("unmaskFormatJpegBlocked");
  });
});

describe("the Magic Brush toolbar", () => {
  it("prints the tools, the modes, the Ghost, and the disabled reason", () => {
    const html = renderToStaticMarkup(
      createElement(UnmaskMagicBrush, {
        brushSize: 40,
        connectivity: 8,
        disabledReason: "unmaskCompareActive",
        ghost: true,
        mode: "restore",
        onBrushSize: noop,
        onConnectivity: noop,
        onGhost: noop,
        onMode: noop,
        onRedo: noop,
        onReset: noop,
        onTool: noop,
        onTolerance: noop,
        onUndo: noop,
        operationCount: 2,
        redoCount: 1,
        tolerance: 20,
        tool: "wand",
      })
    );
    expect(html).toContain("unmaskWand");
    expect(html).toContain("unmaskBrush");
    expect(html).toContain("unmaskRestore");
    expect(html).toContain("unmaskErase");
    expect(html).toContain("unmaskGhost");
    expect(html).toContain("unmaskCompareActive");
    expect(html).toContain("unmaskUndo");
    expect(html).toContain("unmaskRedo");
    expect(html).toContain("unmaskKeys");
  });
});

describe("the canvas", () => {
  it("prints a keyboard-operable comparison slider and a text summary", () => {
    const html = renderToStaticMarkup(
      createElement(UnmaskCanvas, {
        brushSize: 40,
        compare: true,
        compareAt: 50,
        disabledReason: null,
        ghost: true,
        item: item({ source: null }),
        mode: "restore",
        onBrush: noop,
        onCompare: noop,
        onCompareAt: noop,
        onStrokePreview: noop,
        onWand: noop,
        settings: DEFAULT_SETTINGS,
        strokePreview: null,
        tool: "brush",
      })
    );
    expect(html).toContain('type="range"');
    expect(html).toContain("unmaskCompare");
    expect(html).toContain("unmaskCompareValue");
    expect(html).toContain("unmaskCanvasSummary");
    expect(html).toContain("unmaskOriginal");
    expect(html).toContain("unmaskCutout");
  });
});

describe("the editor", () => {
  it("prints the plate, the desk, the Cut out mark, and the result", () => {
    const html = renderToStaticMarkup(
      createElement(UnmaskEditor, {
        controller: controller({ batch: [item()], canRun: true }),
        item: item({ preview: null, previewBase: null }),
      })
    );
    expect(html).toContain("unmaskCanvasEmpty");
    expect(html).toContain("unmaskCutOut");
    expect(html).toContain("unmaskMagicBrush");
    expect(html).toContain("unmaskBackdrop");
    expect(html).toContain("unmaskDownload");
  });
});

describe("the result", () => {
  it.each([
    ["ready", null],
    ["edited", null],
    ["stale", null],
    ["downloaded", null],
    ["failed", { _tag: "EncodeFailed" as const, reason: "codec" as const }],
    ["cancelled", { _tag: "Cancelled" as const }],
  ])("prints the %s state", (state, error) => {
    const html = renderToStaticMarkup(
      createElement(UnmaskResult, {
        item: item({
          error,
          // SAFETY: The table above lists only RowState values.
          state: state as UnmaskItem["state"],
        }),
        onBackToBatch: null,
        onCutAnother: noop,
        onDownload: noop,
        onRetry: noop,
        running: false,
      })
    );
    expect(html).toContain("unmaskInputUnchanged");
    expect(html).toContain("unmaskInputUnchanged");
  });
});

describe("the state gallery", () => {
  it("reaches every named state", () => {
    const html = renderToStaticMarkup(createElement(UnmaskStateGallery));
    for (const key of [
      "Reading",
      "Removing",
      "Ready",
      "Edited",
      "Stale",
      "Queued",
      "Cancelled",
      "Unsupported format",
      "Unreadable file",
      "Too large",
      "Model unavailable",
      "Model failed",
      "Encode failed",
      "Downloaded",
    ]) {
      expect(html).toContain(key);
    }
  });
});
