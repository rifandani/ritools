/* oxlint-disable eslint/no-await-in-loop -- screenshots share one page, so each viewport must finish before the next */
import path from "node:path";

import { expect, test } from "./_base";

const fixture = path.resolve("src/features/expose/fixtures/metadata.jpg");

test("watches nested images once, keeps cleaning manual, and stops new arrivals", async ({
  page,
}, testInfo) => {
  test.setTimeout(60_000);
  await page.addInitScript(() => {
    const files: File[] = [];
    const controls = {
      files,
      revoked: false,
    };
    Object.assign(window, { watchTest: controls });
    Object.defineProperty(window, "showDirectoryPicker", {
      configurable: true,
      value: () =>
        Promise.resolve({
          name: "photos",
          async *entries() {
            if (controls.revoked) {
              throw new DOMException("Access stopped", "NotAllowedError");
            }
            yield [
              "trip",
              {
                name: "trip",
                kind: "directory",
                async *entries() {
                  for (const file of files) {
                    yield [
                      file.name,
                      { kind: "file", name: file.name, getFile: () => file },
                    ];
                  }
                },
              },
            ];
          },
        }),
    });
  });
  await page.goto("/expose");
  await page.waitForFunction(() => {
    const input = document.querySelector("#expose-file");
    return (
      input !== null &&
      Object.getOwnPropertyNames(input).some((key) =>
        key.startsWith("__reactEvents$")
      )
    );
  });
  await expect(
    page.getByRole("button", { name: "Watch folder", exact: true })
  ).toBeEnabled();
  await page.locator("#expose-file").setInputFiles(fixture);
  await expect(
    page.getByRole("heading", { name: "Metadata Report", exact: true })
  ).toBeVisible();
  // Use the real image bytes for files delivered by the browser folder handle.
  await page.evaluate(async () => {
    const response = await fetch("/samples/expose/camera-nikon-z9-c2pa.jpg");
    const bytes = await response.blob();
    Object.assign(window, { watchBytes: bytes });
    // SAFETY: the init script owns this browser test control.
    const controls = window as typeof window & { watchTest: { files: File[] } };
    controls.watchTest.files.push(
      new File([bytes], "first.jpg", { type: "image/jpeg", lastModified: 1 })
    );
  });
  await page.getByRole("button", { name: "Watch folder", exact: true }).click();
  const list = page.getByRole("list", { name: "Files in the Batch" });
  await expect(
    list.getByRole("button", { name: "first.jpg", exact: true })
  ).toBeVisible();
  await expect(list.getByText("photos/trip", { exact: true })).toBeVisible();
  await expect(
    page.getByText("Watching for new files. Use Clean when you are ready.", {
      exact: true,
    })
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Clean all", exact: true })
  ).toBeEnabled();
  await page.evaluate(() => {
    // SAFETY: the init script owns these browser test controls.
    const controls = window as typeof window & {
      watchTest: { files: File[] };
      watchBytes: Blob;
    };
    controls.watchTest.files.push(
      new File([controls.watchBytes], "second.jpg", {
        type: "image/jpeg",
        lastModified: 2,
      })
    );
  });
  await expect(
    list.getByRole("button", { name: "second.jpg", exact: true })
  ).toBeVisible({ timeout: 15_000 });
  await expect(list.getByRole("listitem")).toHaveCount(3);
  await expect(page.getByText(/duplicate files skipped/u)).toHaveCount(0);
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 1000 });
    await page.waitForFunction(
      () => document.documentElement.scrollWidth <= innerWidth
    );
    await page.screenshot({
      path: testInfo.outputPath(`watch-${width}.png`),
      fullPage: false,
    });
    const overflow = await page.evaluate(() => ({
      width: innerWidth,
      scroll: document.documentElement.scrollWidth,
      elements: [...document.querySelectorAll("main *")]
        .filter((el) => el.getBoundingClientRect().right > innerWidth)
        .slice(0, 12)
        .map((el) => ({
          tag: el.tagName,
          cls: el.className,
          text: el.textContent?.slice(0, 100),
          right: el.getBoundingClientRect().right,
        })),
    }));
    expect(overflow.scroll, JSON.stringify(overflow)).toBeLessThanOrEqual(
      overflow.width
    );
  }
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page
    .getByRole("button", { name: "Stop watching", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Watch folder", exact: true })
  ).toBeEnabled();
  await page.evaluate(() => {
    // SAFETY: the init script owns these browser test controls.
    const controls = window as typeof window & {
      watchTest: { files: File[] };
      watchBytes: Blob;
    };
    controls.watchTest.files.push(
      new File([controls.watchBytes], "stopped.jpg", {
        type: "image/jpeg",
        lastModified: 3,
      })
    );
  });
  await page.waitForTimeout(2500);
  await expect(list.getByRole("listitem")).toHaveCount(3);
  await page.getByRole("button", { name: "Watch folder", exact: true }).click();
  await expect(
    list.getByRole("button", { name: "stopped.jpg", exact: true })
  ).toBeVisible();
  await page.evaluate(() => {
    // SAFETY: the init script owns this browser test control.
    const controls = window as typeof window & {
      watchTest: { revoked: boolean };
    };
    controls.watchTest.revoked = true;
  });
  await expect(
    page.getByText("Watch folder access stopped. Drop files instead.", {
      exact: true,
    })
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Watch folder", exact: true })
  ).toBeEnabled();
  await expect(list.getByRole("listitem")).toHaveCount(4);
});

for (const name of ["AbortError", "NotAllowedError"]) {
  test(`handles ${name} from the folder picker`, async ({ page }) => {
    await page.addInitScript((errorName) => {
      Object.defineProperty(window, "showDirectoryPicker", {
        configurable: true,
        value: () =>
          Promise.reject(new DOMException("Picker closed", errorName)),
      });
    }, name);
    await page.goto("/expose");
    await page.waitForFunction(() => {
      const input = document.querySelector("#expose-file");
      return (
        input !== null &&
        Object.getOwnPropertyNames(input).some((key) =>
          key.startsWith("__reactEvents$")
        )
      );
    });
    await page
      .getByRole("button", { name: "Watch folder", exact: true })
      .click();
    await expect(
      page.getByRole("button", { name: "Watch folder", exact: true })
    ).toBeEnabled();
    await expect(
      page.getByText("Watch folder permission denied. Drop files instead.", {
        exact: true,
      })
    ).toHaveCount(name === "AbortError" ? 0 : 1);
  });
}

test("explains browser support when the folder picker is absent", async ({
  page,
}) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, "showDirectoryPicker", { value: undefined });
  });
  await page.goto("/expose");
  await page.waitForFunction(() => {
    const input = document.querySelector("#expose-file");
    return (
      input !== null &&
      Object.getOwnPropertyNames(input).some((key) =>
        key.startsWith("__reactEvents$")
      )
    );
  });
  await expect(
    page.getByRole("button", { name: "Watch folder", exact: true })
  ).toBeDisabled();
  await expect(
    page.getByText(
      "Watch folder works in Chrome and Edge. Drop files instead.",
      { exact: true }
    )
  ).toBeVisible();
});

test("a stopped scan cannot add files after it finishes", async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, "showDirectoryPicker", {
      value: () =>
        Promise.resolve({
          name: "slow-folder",
          async *entries() {
            // oxlint-disable-next-line promise/avoid-new -- the test controls when this browser scan finishes
            await new Promise<void>((resolve) => {
              Object.assign(window, { finishWatchScan: resolve });
            });
            yield [
              "late.jpg",
              {
                name: "late.jpg",
                kind: "file",
                getFile: () =>
                  Promise.resolve(
                    new File(["late"], "late.jpg", { type: "image/jpeg" })
                  ),
              },
            ];
          },
        }),
    });
  });
  await page.goto("/expose");
  await page.waitForFunction(() => {
    const input = document.querySelector("#expose-file");
    return (
      input !== null &&
      Object.getOwnPropertyNames(input).some((key) =>
        key.startsWith("__reactEvents$")
      )
    );
  });
  await page.getByRole("button", { name: "Watch folder", exact: true }).click();
  await page.waitForFunction(() => "finishWatchScan" in window);
  await page
    .getByRole("button", { name: "Stop watching", exact: true })
    .click();
  await page.evaluate(() => {
    // SAFETY: the init script installs this resolver before the wait finishes.
    const controls = window as typeof window & { finishWatchScan: () => void };
    controls.finishWatchScan();
  });
  // Allow the finished scan to reach its callback and the next poll time.
  await page.waitForTimeout(2200);
  await expect(
    page.getByRole("button", { name: "Watch folder", exact: true })
  ).toBeEnabled();
  await expect(
    page.getByRole("button", { name: "Open the camera sample", exact: true })
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Could not read this file", exact: true })
  ).toHaveCount(0);
});
