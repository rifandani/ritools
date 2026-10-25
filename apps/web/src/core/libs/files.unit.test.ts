/* oxlint-disable anti-slop/require-safety-comment-for-type-assertion -- fixtures implement the browser entry API */
import { describe, expect, it, vi } from "vitest";

import {
  clampFileName,
  download,
  filesOf,
  fingerprintOf,
  folderOfFile,
  safeZipSegments,
  uniqueZipPath,
} from "@/core/libs/files";

const browserFixture = <Value, Input = unknown>(value: Input): Value => {
  const untyped: unknown = value;
  // SAFETY: Fixtures provide the browser properties read at the tested API boundary.
  // oxlint-disable-next-line anti-slop/no-widen-then-assert -- test API stubs provide only the browser properties this code reads
  return untyped as Value;
};

const itemOf = <Entry>(entry: Entry | null): DataTransferItem =>
  browserFixture<DataTransferItem>({ webkitGetAsEntry: () => entry });

const transferOf = <Items extends readonly object[]>(
  items: Items,
  files: readonly File[]
) => browserFixture<DataTransfer>({ items, files });

describe("file helpers", () => {
  it("builds a stable file fingerprint and finds a relative folder", () => {
    expect(fingerprintOf({ name: "a.jpg", size: 4, lastModified: 2 })).toBe(
      "a.jpg:4:2"
    );
    expect(folderOfFile({ webkitRelativePath: "photos/a.jpg" } as File)).toBe(
      "photos"
    );
    expect(folderOfFile({ webkitRelativePath: "a.jpg" } as File)).toBeNull();
  });

  it("cleans ZIP paths and clamps names while keeping extensions", () => {
    expect(safeZipSegments("../trip\\day\u0000/./photo.jpg")).toEqual([
      "trip",
      "day",
      "photo.jpg",
    ]);
    expect(clampFileName("photo.jpg", 5)).toBe("p.jpg");
    expect(clampFileName("longfilename.jpg", 10)).toBe("longfi.jpg");
    expect(clampFileName("longfilename", 4)).toBe("long");
  });

  it("claims case-insensitive ZIP names with collision suffixes", () => {
    const taken = new Set<string>();
    expect(uniqueZipPath(["trip"], "photo", ".jpg", taken)).toBe(
      "trip/photo.jpg"
    );
    expect(uniqueZipPath(["trip"], "PHOTO", ".JPG", taken)).toBe(
      "trip/PHOTO-2.JPG"
    );
  });

  it("uses DataTransfer.files when entries are unavailable", async () => {
    const file = new File(["x"], "a.jpg");
    await expect(filesOf(transferOf([itemOf(null)], [file]))).resolves.toEqual([
      { file, folderPath: null },
    ]);
  });

  it("walks folder entries in multiple batches and falls back when they are empty", async () => {
    const first = new File(["x"], "a.jpg");
    const batches = [
      [
        {
          isFile: true,
          isDirectory: false,
          fullPath: "/photos/a.jpg",
          file: (success: (file: File) => void) => success(first),
        },
      ],
      [],
    ];
    const directory = {
      isFile: false,
      isDirectory: true,
      createReader: () => ({
        readEntries: (success: (value: unknown[]) => void) =>
          success(batches.shift() ?? []),
      }),
    };
    await expect(filesOf(transferOf([itemOf(directory)], []))).resolves.toEqual(
      [{ file: first, folderPath: "photos" }]
    );

    const fallback = new File(["y"], "fallback.jpg");
    const emptyDirectory = {
      isFile: false,
      isDirectory: true,
      createReader: () => ({
        readEntries: (success: (value: unknown[]) => void) => success([]),
      }),
    };
    await expect(
      filesOf(transferOf([itemOf(emptyDirectory)], [fallback]))
    ).resolves.toEqual([{ file: fallback, folderPath: null }]);
  });

  it("reads a file entry when a transfer has a mix of entry support", async () => {
    const file = new File(["x"], "root.jpg");
    const entry = {
      isFile: true,
      isDirectory: false,
      fullPath: "/root.jpg",
      file: (success: (value: File) => void) => success(file),
    };
    await expect(
      filesOf(transferOf([itemOf(entry), itemOf(null)], []))
    ).resolves.toEqual([{ file, folderPath: null }]);
    await expect(
      filesOf(
        transferOf(
          [
            itemOf({
              ...entry,
              file: (_success: (value: File) => void, failure: () => void) =>
                failure(),
            }),
          ],
          []
        )
      )
    ).rejects.toBeUndefined();
  });

  it("ignores unknown entries and treats reader errors as an empty folder", async () => {
    const unknown = { isFile: false, isDirectory: false };
    const broken = {
      isFile: false,
      isDirectory: true,
      createReader: () => ({
        readEntries: (
          _success: (value: unknown[]) => void,
          failure: () => void
        ) => failure(),
      }),
    };
    await expect(
      filesOf(transferOf([itemOf(unknown), itemOf(broken)], []))
    ).resolves.toEqual([]);
  });

  it("removes a download link and revokes its URL after the click", () => {
    const link = {
      click: vi.fn(),
      remove: vi.fn(),
      style: {} as CSSStyleDeclaration,
    };
    const append = vi.fn();
    const createObjectURL = vi.fn(() => "blob:test");
    const revokeObjectURL = vi.fn();
    vi.stubGlobal("document", {
      body: { append },
      createElement: () => link,
    });
    vi.stubGlobal("URL", { createObjectURL, revokeObjectURL });
    // oxlint-disable-next-line promise/prefer-await-to-callbacks -- the fake timer calls the browser callback by contract
    vi.stubGlobal("setTimeout", (callback: () => void) => {
      // oxlint-disable-next-line promise/prefer-await-to-callbacks -- this is a synchronous fake timer
      callback();
      return 0;
    });

    download(new Blob(["x"]), "photo.jpg");

    expect(createObjectURL).toHaveBeenCalledOnce();
    expect(append).toHaveBeenCalledWith(link);
    expect(link.click).toHaveBeenCalledOnce();
    expect(link.remove).toHaveBeenCalledOnce();
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:test");
    vi.unstubAllGlobals();
  });
});
