/* oxlint-disable react/rules-of-hooks */
import { test as base, expect } from "@playwright/test";

interface NetworkError {
  url: string;
  method: string;
  status: number;
}
export const test = base.extend<{
  /** Responses expected to fail, e.g. the document of a 404 page. */
  expectedHttpErrors: RegExp[];
}>({
  expectedHttpErrors: [[], { option: true }],
  page: async ({ page, expectedHttpErrors }, use, testInfo) => {
    const errors: Error[] = [];
    const networkErrors: NetworkError[] = [];
    // listen to exceptions during the test sessions
    page.on("pageerror", (error) => {
      errors.push(error);
    });
    page.on("response", (response) => {
      const isExpected = expectedHttpErrors.some((pattern) =>
        pattern.test(response.url())
      );
      if (response.status() >= 400 && !isExpected) {
        networkErrors.push({
          method: response.request().method(),
          status: response.status(),
          url: response.url(),
        });
      }
    });
    await use(page);
    expect(errors).toHaveLength(0);
    if (networkErrors.length > 0) {
      await testInfo.attach("network-errors.json", {
        body: JSON.stringify(networkErrors, null, 2),
        contentType: "application/json",
      });
      throw new Error(
        `Network errors detected: ${networkErrors.length} requests failed. Check the attached network-errors.json`
      );
    }
  },
});
export { expect } from "@playwright/test";
export type { Page } from "@playwright/test";
