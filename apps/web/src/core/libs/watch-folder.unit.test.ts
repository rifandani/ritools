import { describe, expect, it } from "vitest";

import {
  classifyWatchFailure,
  collectWatched,
  isWatchPermissionError,
} from "@/core/libs/watch-folder";

interface FixtureFile {
  readonly kind: "file";
  readonly name: string;
  readonly getFile?: () => Promise<File>;
}
interface FixtureDirectory {
  readonly kind: "directory";
  readonly name: string;
  readonly entries: () => AsyncIterableIterator<[string, FixtureHandle]>;
}
type FixtureHandle = FixtureFile | FixtureDirectory;
type FixtureEntry = [string, FixtureHandle];

const handle = (name: string, file: File): FixtureFile => ({
  kind: "file" as const,
  name,
  getFile: () => Promise.resolve(file),
});

const directory = (
  name: string,
  entries: readonly FixtureEntry[]
): FixtureDirectory => ({
  kind: "directory" as const,
  name,
  async *entries() {
    await Promise.resolve();
    for (const entry of entries) {
      yield entry;
    }
  },
});

describe("watch folder helpers", () => {
  it("classifies cancel and permission failures", () => {
    expect(classifyWatchFailure(new DOMException("cancel", "AbortError"))).toBe(
      "cancelled"
    );
    expect(classifyWatchFailure({ name: "NotAllowedError" })).toBe("denied");
    expect(isWatchPermissionError({ name: "SecurityError" })).toBe(true);
    expect(isWatchPermissionError({ name: "NotFoundError" })).toBe(false);
    expect(isWatchPermissionError(null)).toBe(false);
  });

  it("collects nested files with the root folder path", async () => {
    const image = new File(["x"], "a.jpg");
    const nested = directory("nested", [["a.jpg", handle("a.jpg", image)]]);
    const root = directory("root", [
      ["nested", nested],
      ["ignored", { kind: "file", name: "broken" }],
    ]);
    await expect(collectWatched(root)).resolves.toEqual([
      { file: image, folderPath: "root/nested" },
    ]);
  });

  it("ignores removed files and keeps walking after ordinary entry failures", async () => {
    const root = directory("root", [
      [
        "missing",
        {
          kind: "file",
          name: "missing",
          getFile: () =>
            Promise.resolve().then(() => {
              throw new Error("gone");
            }),
        },
      ],
      [
        "empty",
        {
          kind: "directory",
          name: "empty",
          async *entries() {
            await Promise.resolve();
            yield ["unreachable", { kind: "file", name: "x" }];
            throw new Error("gone");
          },
        },
      ],
    ]);
    await expect(collectWatched(root)).resolves.toEqual([]);
  });

  it("stops when directory permission is revoked", async () => {
    const root = directory("root", [
      [
        "private",
        {
          kind: "file",
          name: "private",
          getFile: () =>
            Promise.resolve().then(() => {
              throw new DOMException("denied", "NotAllowedError");
            }),
        },
      ],
    ]);
    await expect(collectWatched(root)).rejects.toMatchObject({
      name: "NotAllowedError",
    });
  });
});
