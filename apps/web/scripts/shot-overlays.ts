/* oxlint-disable unicorn/consistent-function-scoping -- Playwright serializes this function into the browser, so its helpers cannot move to module scope. */
// fallow-ignore-file unused-export -- imported only by the shot scripts, which fallow does not analyze.
import type { Browser, Page } from "@playwright/test";

/**
 * Opens the Master Design page for one viewport and colour scheme.
 *
 * The devtools launcher mounts after the app paints, so the caller hides it
 * again before the capture.
 */
export const openMasterDesignPage = async (
  browser: Browser,
  options: {
    readonly colorScheme: "light" | "dark";
    readonly height: number;
    readonly url: string;
    readonly width: number;
  }
): Promise<Page> => {
  const context = await browser.newContext({
    colorScheme: options.colorScheme,
    reducedMotion: "reduce",
    viewport: { height: options.height, width: options.width },
  });
  const page = await context.newPage();
  await page.goto(`${options.url}/master-design`, { waitUntil: "networkidle" });
  await page.evaluate(() => document.fonts.ready);
  return page;
};

/**
 * Hides the fixed overlays a screenshot must not capture: the TanStack
 * devtools launcher, and the sticky filter bar that would cover the clip.
 *
 * It runs inside `page.evaluate`, so Playwright serializes this function into
 * the browser. Keep it self-contained: no module imports, no outer variables.
 */
export const hideFixedOverlays = (options: {
  readonly bottom: number;
  readonly left: number;
  readonly maxSize: number;
  readonly minSize: number;
}): void => {
  const isFixed = (el: Element) => getComputedStyle(el).position === "fixed";
  const isDevtools = (el: Element) => el.id.startsWith("tanstack_devtools");
  const inSquare = (box: DOMRect, min: number, max: number) =>
    box.width >= min &&
    box.width <= max &&
    box.height >= min &&
    box.height <= max;
  const inCorner = (box: DOMRect, left: number, bottom: number) =>
    box.left < left && box.bottom > innerHeight - bottom;
  const isLauncher = (el: Element): boolean => {
    if (!isFixed(el)) {
      return false;
    }
    if (isDevtools(el)) {
      return true;
    }
    const box = el.getBoundingClientRect();
    return (
      inSquare(box, options.minSize, options.maxSize) &&
      inCorner(box, options.left, options.bottom)
    );
  };
  for (const el of document.querySelectorAll("*")) {
    if (isLauncher(el)) {
      // SAFETY: a fixed overlay is removed from the capture, not restyled.
      (el as HTMLElement).style.display = "none";
    }
  }
  // SAFETY: the filter bar is the only element with this class stack.
  const bar = document.querySelector(
    ".sticky.top-0.z-20"
  ) as HTMLElement | null;
  if (bar) {
    bar.style.position = "static";
  }
};
