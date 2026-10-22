import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/features/i18n/use-translation", () => ({
  useTranslation: () => ({
    locale: "en-US",
    t: (key: string) => key,
  }),
}));

const { SqueezeRunBar } =
  await import("@/features/squeeze/components/squeeze-run-bar");

const settings = {
  batchTotalBytes: 1_000_000,
  maxHeight: null,
  maxWidth: null,
  outputFormat: "keep",
  preserveExif: false,
  preserveFolders: false,
  quality: 80,
  sizeMode: "per-image",
  targetBytes: 100_000,
} as const;

const summary = {
  alreadyFits: 0,
  bigger: 0,
  done: 1,
  inputBytes: 500_000,
  misses: 0,
  outputBytes: 400_000,
  rejected: 0,
  total: 1,
  underTarget: 1,
} as const;

type BarProps = Parameters<typeof SqueezeRunBar>[0];

const noop = (): void => {
  // The bar calls its handlers; the test only prints the markup.
};

const barOf = (overrides: Partial<BarProps> = {}) =>
  createElement(SqueezeRunBar, {
    batchTotalBytes: 1_000_000,
    canClear: false,
    canDownload: false,
    canRun: false,
    onClear: noop,
    onDownloadAll: noop,
    onRun: noop,
    onStop: noop,
    onStopBeforeClear: noop,
    pendingCount: 0,
    running: false,
    settings,
    staleCount: 0,
    summary,
    total: 1,
    ...overrides,
  });

describe("SqueezeRunBar", () => {
  it("prints the idle run marks", () => {
    const html = renderToStaticMarkup(barOf({}));
    expect(html).toContain("squeezeActions");
  });

  it("prints the running progress and the stale hint", () => {
    const html = renderToStaticMarkup(
      barOf({
        canClear: true,
        canDownload: true,
        canRun: true,
        pendingCount: 1,
        running: true,
        staleCount: 2,
        total: 2,
      })
    );
    expect(html).toContain("squeezeCompressing");
    expect(html).toContain("squeezeStaleHint");
  });
});
