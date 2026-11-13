/* oxlint-disable unicorn/no-await-expression-member -- the specs read one export at a time. */
import { expect, test } from "./_base";
import type { Page } from "./_base";
import {
  BLUE,
  dragOnImage,
  exportAndRead,
  GREEN,
  imageBox,
  near,
  openExport,
  openPanel,
  openQuad,
  pressSlider,
  QUAD,
  quadImage,
  RED,
  savedTabCount,
  waitForDraw,
  WHITE,
} from "./_easel";

test.beforeEach(async ({ page }) => {
  await page.goto("/easel");
  await page.waitForLoadState("networkidle");
});

const tabs = (page: Page) => page.getByRole("tab");

/** A switch input sits under its label, so the keyboard toggles it. */
const toggle = async (
  page: Page,
  options: { readonly exact?: boolean; readonly name: string }
) => {
  const control = page.getByRole("switch", options);
  await control.focus();
  await control.press("Space");
};

test.describe("open and File Tabs", () => {
  test("explains the Tool in the empty state", async ({ page }) => {
    await expect(page.getByText("Drop an image here")).toBeVisible();
    await expect(
      page.getByText(/Nothing leaves this device/u).first()
    ).toBeVisible();
    await expect(
      page.getByText(/A GIF opens as its first frame/u)
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "What Easel cannot do" })
    ).toBeVisible();
  });

  test("opens the Sample Image in a File Tab", async ({ page }) => {
    await page.locator("#easel-sample").click();
    await expect(tabs(page)).toHaveCount(1);
    await expect(tabs(page).first()).toHaveAccessibleName("easel-sample.png");
    await expect(page.locator("#easel-facts")).toContainText("1200 × 900");
  });

  test("shows Rejected for a file it cannot read", async ({ page }) => {
    await page.setInputFiles("#easel-files", {
      buffer: Buffer.from("this is not an image"),
      mimeType: "image/png",
      name: "broken.png",
    });
    await expect(page.locator('[data-easel-note="rejected"]')).toContainText(
      "broken.png"
    );
    await expect(tabs(page)).toHaveCount(0);
  });

  test("keeps the edits of each File Tab apart, and warns before a close", async ({
    page,
  }) => {
    await openQuad(page, "first.png");
    await page.setInputFiles(
      "#easel-files",
      await quadImage(page, "second.png")
    );
    await expect(tabs(page)).toHaveCount(2);
    await expect(tabs(page).nth(1)).toHaveAttribute("aria-selected", "true");

    await page.locator('[data-easel-action="rotate-right"]').click();
    await expect(page.locator("[data-tab-id][data-dirty]")).toHaveCount(1);
    await expect(page.locator("#easel-undo")).toBeEnabled();

    // The first File Tab has its own Edit Stack with no change.
    await tabs(page).first().click();
    await expect(page.locator("#easel-undo")).toBeDisabled();
    const first = await exportAndRead(page);
    expect([first.width, first.height]).toEqual([QUAD.width, QUAD.height]);

    // A File Tab with no unexported edit closes at once.
    await page.getByRole("button", { name: "Close first.png" }).click();
    await expect(tabs(page)).toHaveCount(1);

    await page.getByRole("button", { name: "Close second.png" }).click();
    const dialog = page.getByRole("alertdialog");
    await expect(dialog).toContainText("edits that you did not export");
    await dialog.getByRole("button", { name: "Cancel" }).click();
    await expect(tabs(page)).toHaveCount(1);

    await page.getByRole("button", { name: "Close second.png" }).click();
    await page.locator("#easel-close-confirm").click();
    await expect(tabs(page)).toHaveCount(0);
    await expect(page.getByText("Drop an image here")).toBeVisible();
  });

  test("keeps File Tabs, edits, and undo steps after a reload", async ({
    page,
  }) => {
    await openQuad(page, "first.png");
    await page.setInputFiles(
      "#easel-files",
      await quadImage(page, "second.png")
    );
    await expect(tabs(page)).toHaveCount(2);
    await page.locator('[data-easel-action="rotate-right"]').click();
    await expect(page.locator("[data-tab-id][data-dirty]")).toHaveCount(1);

    // The write comes after a short pause.
    await expect.poll(() => savedTabCount(page)).toBe(2);
    await page.reload();
    await page.waitForLoadState("networkidle");

    await expect(tabs(page)).toHaveCount(2);
    await expect(tabs(page).nth(1)).toHaveAttribute("aria-selected", "true");
    await expect(tabs(page).first()).toHaveAccessibleName("first.png");
    await waitForDraw(page);
    await expect(page.locator("[data-tab-id][data-dirty]")).toHaveCount(1);
    await expect(page.locator("#easel-undo")).toBeEnabled();
    const second = await exportAndRead(page);
    expect([second.width, second.height]).toEqual([QUAD.height, QUAD.width]);

    // The export menu stays open after a download. Close it for the toolbar.
    await page.keyboard.press("Escape");
    await expect(page.locator("#easel-export")).toBeHidden();
    await page.locator("#easel-undo").click();
    const undone = await exportAndRead(page);
    expect([undone.width, undone.height]).toEqual([QUAD.width, QUAD.height]);
  });

  test("deletes the saved File Tab when it closes", async ({ page }) => {
    await openQuad(page);
    await expect(tabs(page)).toHaveCount(1);
    await page.getByRole("button", { name: "Close quad.png" }).click();
    await expect(tabs(page)).toHaveCount(0);
    await expect.poll(() => savedTabCount(page)).toBe(0);
    await page.reload();
    await page.waitForLoadState("networkidle");
    await expect(page.getByText("Drop an image here")).toBeVisible();
    await expect(tabs(page)).toHaveCount(0);
  });

  test("leaves a link inside the app with no question while it saves", async ({
    page,
  }) => {
    await openQuad(page);
    await page.locator('[data-easel-action="rotate-right"]').click();
    await page.getByRole("link", { name: "Home", exact: true }).click();
    await expect(page).toHaveURL(/\/$/u);
    await expect(page.getByRole("alertdialog")).toHaveCount(0);
  });

  test("stops at 10 File Tabs with a Note", async ({ page }) => {
    test.setTimeout(45_000);
    const files = [];
    for (let index = 0; index < 11; index += 1) {
      // oxlint-disable-next-line eslint/no-await-in-loop -- the files are made in order.
      files.push(await quadImage(page, `image-${index}.png`));
    }
    await page.setInputFiles("#easel-files", files);
    await expect(tabs(page)).toHaveCount(10, { timeout: 20_000 });
    await expect(page.locator('[data-easel-note="tab-limit"]')).toContainText(
      "10 File Tabs are open"
    );
  });
});

test.describe("view", () => {
  test("zooms, fits, compares, and has a Keys list", async ({ page }) => {
    await openQuad(page);
    const zoom = page.getByRole("textbox", { name: "Zoom level" });
    await expect(zoom).toHaveValue("100");
    await page.locator("#easel-zoom-in").click();
    await expect(zoom).toHaveValue("125");
    await page.getByRole("button", { name: "Zoom", exact: true }).click();
    await page.getByRole("menuitem", { name: "Fit", exact: true }).click();
    await expect(zoom).toHaveValue("100");

    const compare = page.locator("#easel-compare");
    const box = await compare.boundingBox();
    await page.mouse.move((box?.x ?? 0) + 8, (box?.y ?? 0) + 8);
    await page.mouse.down();
    await expect(page.locator("[data-easel-compare]")).toBeVisible();
    await page.mouse.up();
    await expect(page.locator("[data-easel-compare]")).toHaveCount(0);

    await page.locator("#easel-keys").click();
    await expect(page.getByText("Hold to see the original")).toBeVisible();
  });

  test("opens full-screen mode and leaves it", async ({ page }) => {
    await openQuad(page);
    await page
      .getByRole("button", { name: "Full screen", exact: true })
      .click();
    await expect
      .poll(() => page.evaluate(() => document.fullscreenElement?.id))
      .toBe("easel-frame");
    await page
      .getByRole("button", { name: "Exit full screen", exact: true })
      .click();
    await expect
      .poll(() => page.evaluate(() => document.fullscreenElement))
      .toBeNull();
  });

  test("has no horizontal overflow at 390 px", async ({ page }) => {
    await page.setViewportSize({ height: 844, width: 390 });
    await openQuad(page);
    const overflow = await page.evaluate(
      () =>
        document.documentElement.scrollWidth -
        document.documentElement.clientWidth
    );
    expect(overflow).toBeLessThanOrEqual(0);
    // The plate stays in view above the tool panel sheet.
    await expect(page.locator("[data-easel-stage]")).toBeInViewport();
  });
});

test.describe("crop and geometry", () => {
  test("crops with a social Crop Preset and sets the export size", async ({
    page,
  }) => {
    await openQuad(page);
    await page.locator('[data-easel-preset="instagram-square"]').click();
    await openExport(page);
    await expect(page.locator("#easel-export-size")).toContainText(
      "1080 × 1080"
    );
    const file = await exportAndRead(page, {
      points: [
        [0.25, 0.25],
        [0.75, 0.75],
      ],
    });
    expect([file.width, file.height]).toEqual([1080, 1080]);
    expect(near(file.pixels[0], RED)).toBe(true);
    expect(near(file.pixels[1], WHITE)).toBe(true);
    await openPanel(page, "resize");
    await expect(page.locator('[data-easel-note="upscale"]')).toBeVisible();
  });

  test("moves the crop box with a drag, as one undo step", async ({ page }) => {
    await openQuad(page);
    await page.locator('[data-easel-preset="classic"]').click();
    // 4:3 on a 4:3 image is the whole image. A handle drag makes it smaller.
    const handle = page.locator('[data-easel-crop-handle="nw"]');
    const box = await handle.boundingBox();
    const image = await imageBox(page);
    await page.mouse.move((box?.x ?? 0) + 8, (box?.y ?? 0) + 8);
    await page.mouse.down();
    await page.mouse.move(
      image.x + image.width * 0.25,
      image.y + image.height * 0.25,
      { steps: 6 }
    );
    await page.mouse.move(
      image.x + image.width * 0.5,
      image.y + image.height * 0.5,
      { steps: 6 }
    );
    await page.mouse.up();
    await openExport(page);
    await expect(page.locator("#easel-export-size")).toContainText("200 × 150");
    const file = await exportAndRead(page, { points: [[0.5, 0.5]] });
    expect([file.width, file.height]).toEqual([200, 150]);
    // The top left handle moved to the middle: the white quadrant stays.
    expect(near(file.pixels[0], WHITE)).toBe(true);

    // One undo removes the whole drag. A second undo removes the preset.
    await page.locator("#easel-undo").click();
    await openExport(page);
    await expect(page.locator("#easel-export-size")).toContainText("400 × 300");
    await page.locator("#easel-undo").click();
    await expect(page.locator("#easel-undo")).toBeDisabled();
  });

  test("rotates and flips with no pixel loss", async ({ page }) => {
    await openQuad(page);
    await page.locator('[data-easel-action="rotate-right"]').click();
    const corners = [
      [0.25, 0.25],
      [0.75, 0.25],
    ] as const;
    const turned = await exportAndRead(page, { points: corners });
    expect([turned.width, turned.height]).toEqual([QUAD.height, QUAD.width]);
    expect(near(turned.pixels[0], BLUE)).toBe(true);
    expect(near(turned.pixels[1], RED)).toBe(true);

    await page.locator('[data-easel-action="flip-horizontal"]').click();
    const mirrored = await exportAndRead(page, { points: corners });
    expect(near(mirrored.pixels[0], RED)).toBe(true);
    expect(near(mirrored.pixels[1], BLUE)).toBe(true);
  });

  test("straightens to the largest inner rectangle, or keeps the whole image", async ({
    page,
  }) => {
    await openQuad(page);
    await pressSlider(page, "straighten", ["End"]);
    const cropped = await exportAndRead(page, { points: [[0.01, 0.01]] });
    expect([cropped.width, cropped.height]).toEqual([212, 212]);
    expect(cropped.pixels[0]?.[3]).toBe(255);

    await toggle(page, { name: "Keep whole image" });
    const whole = await exportAndRead(page, { points: [[0.01, 0.01]] });
    expect([whole.width, whole.height]).toEqual([495, 495]);
    // The corner is empty, and the Backdrop is Transparent.
    expect(whole.pixels[0]?.[3]).toBe(0);
  });

  test("exports an Ellipse Crop as JPEG with white corners", async ({
    page,
  }) => {
    await openQuad(page);
    await page.locator('[data-easel-preset="ellipse"]').click();
    await page.locator('[data-easel-format="jpeg"]').click();
    await expect(
      page.locator('[data-easel-note="jpeg-backdrop"]')
    ).toBeVisible();
    const file = await exportAndRead(page, {
      format: "jpeg",
      points: [
        [0.01, 0.01],
        [0.99, 0.01],
        [0.3, 0.35],
      ],
    });
    expect(file.name).toBe("quad-easel.jpg");
    expect(near(file.pixels[0], WHITE, 8)).toBe(true);
    expect(near(file.pixels[1], WHITE, 8)).toBe(true);
    expect(near(file.pixels[2], RED, 40)).toBe(true);
    // The file comes from pixels only: it holds no EXIF block.
    expect(file.bytes.includes("Exif")).toBe(false);
  });
});

test.describe("Finetune, Filter, and Fill", () => {
  test("changes the photo with a Finetune slider, and undoes it", async ({
    page,
  }) => {
    await openQuad(page);
    await openPanel(page, "finetune");
    await pressSlider(page, "brightness", ["End"]);
    const bright = await exportAndRead(page, { points: [[0.25, 0.25]] });
    expect(near(bright.pixels[0], [255, 128, 128, 255])).toBe(true);

    await page.locator("#easel-undo").click();
    await expect(page.locator("#easel-undo")).toBeDisabled();
    const back = await exportAndRead(page, { points: [[0.25, 0.25]] });
    expect(near(back.pixels[0], RED)).toBe(true);

    await page.locator("#easel-redo").click();
    await page.locator('[data-easel-reset="finetune"]').click();
    const reset = await exportAndRead(page, { points: [[0.25, 0.25]] });
    expect(near(reset.pixels[0], RED)).toBe(true);
    // The Reset can be undone.
    await page.locator("#easel-undo").click();
    const again = await exportAndRead(page, { points: [[0.25, 0.25]] });
    expect(near(again.pixels[0], [255, 128, 128, 255])).toBe(true);
  });

  test("applies a Filter from a card and removes it with Revert to original", async ({
    page,
  }) => {
    await openQuad(page);
    await openPanel(page, "filter");
    await page.locator('[data-easel-filter="mono"]').click();
    const mono = await exportAndRead(page, { points: [[0.75, 0.25]] });
    const [red, green, blue] = mono.pixels[0] ?? [];
    expect(red).toBe(green);
    expect(green).toBe(blue);
    expect(near(mono.pixels[0], GREEN)).toBe(false);

    await page.locator("#easel-revert").click();
    const original = await exportAndRead(page, { points: [[0.75, 0.25]] });
    expect(near(original.pixels[0], GREEN)).toBe(true);
    // Revert to original can be undone.
    await page.locator("#easel-undo").click();
    await expect(page.locator('[data-easel-filter="mono"]')).toHaveAttribute(
      "aria-pressed",
      "true"
    );
  });

  test("keeps a Bucket Fill area and its exact color under Finetune and Filter", async ({
    page,
  }) => {
    await openQuad(page);
    await openPanel(page, "fill");
    const box = await imageBox(page);
    await page.mouse.click(box.x + box.width * 0.25, box.y + box.height * 0.25);
    await expect(page.locator("[data-easel-fill]")).toHaveCount(1);

    await openPanel(page, "finetune");
    await pressSlider(page, "brightness", ["Home"]);
    await openPanel(page, "filter");
    await page.locator('[data-easel-filter="noir"]').click();
    const file = await exportAndRead(page, {
      points: [
        [0.25, 0.25],
        [0.45, 0.45],
        [0.75, 0.25],
      ],
    });
    // The whole red quadrant has the fill color, and no other pixel has it.
    expect(near(file.pixels[0], [230, 51, 34, 255], 2)).toBe(true);
    expect(near(file.pixels[1], [230, 51, 34, 255], 2)).toBe(true);
    expect(near(file.pixels[2], [230, 51, 34, 255], 40)).toBe(false);

    await openPanel(page, "fill");
    await page.getByRole("button", { name: "Remove fill 1" }).click();
    await expect(page.locator("[data-easel-fill]")).toHaveCount(0);
  });
});

test.describe("annotate and watermark", () => {
  test("adds shapes and text, and orders the Annotation Layers", async ({
    page,
  }) => {
    await openQuad(page);
    await openPanel(page, "annotate");
    await page.locator('[data-easel-tool="rect"]').click();
    await toggle(page, { name: "Fill", exact: true });
    await dragOnImage(page, [0.1, 0.1], [0.4, 0.4]);
    await expect(page.locator("[data-easel-layer]")).toHaveCount(1);

    await page.locator('[data-easel-tool="text"]').click();
    const box = await imageBox(page);
    await page.mouse.click(box.x + box.width * 0.6, box.y + box.height * 0.7);
    await expect(page.locator("[data-easel-layer]")).toHaveCount(2);
    // The new text is in edit mode on the image.
    await page.waitForTimeout(300);
    await page.keyboard.type("Hi");
    await page.keyboard.press("Escape");
    await expect(page.locator("[data-easel-layer]").first()).toContainText(
      "Hi"
    );

    // The rectangle moves to the front.
    await page.locator("[data-easel-layer]").nth(1).getByRole("button").click();
    await page.locator('[data-easel-layer-action="top"]').click();
    await expect(page.locator("[data-easel-layer]").first()).toContainText(
      "Rectangle"
    );
    await page.locator('[data-easel-layer-action="duplicate"]').click();
    await expect(page.locator("[data-easel-layer]")).toHaveCount(3);
    await page.locator('[data-easel-layer-action="delete"]').click();
    await expect(page.locator("[data-easel-layer]")).toHaveCount(2);

    const file = await exportAndRead(page, {
      points: [
        [0.25, 0.25],
        [0.45, 0.25],
      ],
    });
    // The filled rectangle is in the export, over the red quadrant.
    expect(near(file.pixels[0], WHITE)).toBe(true);
    expect(near(file.pixels[1], RED)).toBe(true);
  });

  test("does not change an Annotation Layer with a Filter", async ({
    page,
  }) => {
    await openQuad(page);
    await openPanel(page, "annotate");
    await page.locator('[data-easel-tool="ellipse"]').click();
    await toggle(page, { name: "Fill", exact: true });
    await toggle(page, { name: "Stroke", exact: true });
    await page.getByRole("textbox", { name: "Fill color" }).fill("#00ff00");
    await dragOnImage(page, [0.1, 0.1], [0.4, 0.4]);
    await openPanel(page, "filter");
    await page.locator('[data-easel-filter="mono"]').click();
    const file = await exportAndRead(page, {
      points: [
        [0.25, 0.25],
        [0.75, 0.25],
      ],
    });
    // The layer keeps its exact color, and the photo is Mono.
    expect(near(file.pixels[0], GREEN, 2)).toBe(true);
    expect(near(file.pixels[1], GREEN, 30)).toBe(false);
  });

  test("draws a tiled Watermark Layer on top of a Cover", async ({ page }) => {
    await openQuad(page);
    await openPanel(page, "redact");
    await dragOnImage(page, [0.02, 0.02], [0.98, 0.98]);
    await expect(page.locator("[data-easel-redaction]")).toHaveCount(1);
    await openPanel(page, "watermark");
    await toggle(page, { name: "Watermark" });
    await toggle(page, { name: "Tile across the image" });
    await pressSlider(page, "watermark-opacity", ["End"]);
    const points: [number, number][] = [];
    for (let x = 0.1; x < 0.9; x += 0.02) {
      for (let y = 0.1; y < 0.9; y += 0.04) {
        points.push([x, y]);
      }
    }
    const file = await exportAndRead(page, { points });
    // The Cover is black. The white mark is over it.
    const marked = file.pixels.filter((pixel) => (pixel[0] ?? 0) > 200);
    expect(marked.length).toBeGreaterThan(3);
    expect(file.pixels.some((pixel) => near(pixel, [0, 0, 0, 255]))).toBe(true);
  });
});

/** A point on the row y = 75 of the test image, as parts of its size. */
const inBlock = (x: number): [number, number] => [
  (x + 0.5) / QUAD.width,
  75.5 / QUAD.height,
];

test.describe("redact", () => {
  test("bakes a Cover as one solid color", async ({ page }) => {
    await openQuad(page);
    await openPanel(page, "redact");
    await expect(page.getByText(/Use a Cover for text/u).first()).toBeVisible();
    await dragOnImage(page, [0.1, 0.1], [0.4, 0.4]);
    await expect(page.locator("[data-easel-redaction]")).toHaveCount(1);
    const file = await exportAndRead(page, {
      points: [
        [0.15, 0.15],
        [0.25, 0.25],
        [0.35, 0.35],
        [0.45, 0.25],
      ],
    });
    for (const pixel of file.pixels.slice(0, 3)) {
      expect(pixel).toEqual([0, 0, 0, 255]);
    }
    expect(near(file.pixels[3], RED)).toBe(true);
    expect(file.bytes.includes("eXIf")).toBe(false);
  });

  test("bakes a Mosaic as blocks of averaged color", async ({ page }) => {
    await openQuad(page);
    await openPanel(page, "redact");
    await page.locator('[data-easel-redact="mosaic"]').click();
    await dragOnImage(page, [0.3, 0.1], [0.7, 0.4]);
    // A 12 px block from x = 192 holds 8 red and 4 green pixels.
    const file = await exportAndRead(page, {
      points: [
        inBlock(193),
        inBlock(198),
        inBlock(203),
        inBlock(150),
        inBlock(60),
      ],
    });
    const [left, middle, right, pureRed, outside] = file.pixels;
    expect(near(left, [170, 85, 0, 255], 3)).toBe(true);
    // Each pixel of one block has the same color.
    expect(middle).toEqual(left);
    expect(right).toEqual(left);
    expect(near(pureRed, RED)).toBe(true);
    expect(near(outside, RED)).toBe(true);
  });

  test("draws a brush Cover and removes it from the list", async ({ page }) => {
    await openQuad(page);
    await openPanel(page, "redact");
    await page.locator('[data-easel-tool="brush"]').click();
    await dragOnImage(page, [0.6, 0.2], [0.9, 0.2]);
    await expect(page.locator("[data-easel-redaction]")).toContainText("Brush");
    const file = await exportAndRead(page, {
      points: [
        [0.75, 0.2],
        [0.75, 0.45],
      ],
    });
    expect(file.pixels[0]).toEqual([0, 0, 0, 255]);
    expect(near(file.pixels[1], GREEN)).toBe(true);
    await page.getByRole("button", { name: "Remove Redaction 1" }).click();
    await expect(page.locator("[data-easel-redaction]")).toHaveCount(0);
  });
});

test.describe("resize and export", () => {
  test("resizes with the aspect ratio locked", async ({ page }) => {
    await openQuad(page);
    await openPanel(page, "resize");
    const width = page.getByRole("textbox", { name: "Width" });
    await width.fill("200");
    await width.blur();
    await expect(page.getByRole("textbox", { name: "Height" })).toHaveValue(
      "150"
    );
    const file = await exportAndRead(page, { points: [[0.75, 0.75]] });
    expect([file.width, file.height]).toEqual([200, 150]);
    expect(near(file.pixels[0], WHITE)).toBe(true);
  });

  test("shows the export size before the download, in each format", async ({
    page,
  }) => {
    test.setTimeout(60_000);
    await openQuad(page);
    for (const format of ["webp", "avif"] as const) {
      // oxlint-disable-next-line eslint/no-await-in-loop -- one export at a time.
      const file = await exportAndRead(page, {
        format,
        points: [[0.25, 0.25]],
      });
      expect(file.name).toBe(`quad-easel.${format}`);
      expect([file.width, file.height]).toEqual([QUAD.width, QUAD.height]);
      expect(near(file.pixels[0], RED, 24)).toBe(true);
      // oxlint-disable-next-line eslint/no-await-in-loop -- read after each export.
      await expect(page.locator("#easel-result-facts")).toContainText(
        "400 × 300"
      );
    }
  });
});
