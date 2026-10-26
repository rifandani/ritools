/* eslint-disable eslint/no-bitwise, eslint/no-shadow, eslint/no-await-in-loop, eslint/prefer-destructuring, unicorn/no-new-array, unicorn/prefer-spread, unicorn/relative-url-style, unicorn/no-array-sort, unicorn/prefer-code-point, unicorn/no-useless-undefined, promise/no-promise-in-callback -- tests build binary fixtures and catch thrown values */
/* oxlint-disable anti-slop/require-safety-comment-for-type-assertion, anti-slop/no-unknown-parameters, anti-slop/no-shape-in-symbol-names -- tests narrow data they built or caught */
import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import type {
  CleanRequest,
  CleanResult,
  ExposeEngineShape,
  ExposeSource,
  ReadReport,
} from "@/features/expose/expose";
import { ExposeEngine } from "@/features/expose/expose";

const seamSource = readFileSync(new URL("expose.ts", import.meta.url), "utf-8");
const serviceSource = readFileSync(
  new URL("expose.service.ts", import.meta.url),
  "utf-8"
);
const workerSource = readFileSync(
  new URL("expose.worker.ts", import.meta.url),
  "utf-8"
);

describe("the engine seam", () => {
  it("does not import either engine library", () => {
    expect(seamSource).not.toMatch(/from ["']@colorhythm\/exiftool-wasm["']/u);
  });

  it("keeps the cleaner out of the seam and the service", () => {
    expect(seamSource).not.toMatch(/exiftool-wasm|expose\.writer/u);
    expect(serviceSource).not.toMatch(/exiftool-wasm|expose\.writer/u);
    expect(workerSource).toMatch(
      /await import\(\s*"@\/features\/expose\/expose\.engine\.browser"/u
    );
  });

  it("exposes read, clean, and a clean run on the service shape", () => {
    const shape: ExposeEngineShape = {
      cleanBatch: () => {
        throw new Error("fake");
      },
      clean: () => {
        throw new Error("fake");
      },
      read: () => {
        throw new Error("fake");
      },
    };
    expect(Object.keys(shape).sort()).toEqual(["clean", "cleanBatch", "read"]);
    expect(ExposeEngine.key).toBe("@ritools/web/ExposeEngine");
  });

  it("keeps the request and report free of library shapes", () => {
    const source: ExposeSource = {
      bytes: new Blob(),
      lastModified: 0,
      name: "image.jpg",
      type: "image/jpeg",
    };
    const request: CleanRequest = { groups: ["authorship"], preset: "custom" };
    expect(Object.keys(source).sort()).toEqual([
      "bytes",
      "lastModified",
      "name",
      "type",
    ]);
    expect(Object.keys(request).sort()).toEqual(["groups", "preset"]);
    const typeChecks: [ReadReport?, CleanResult?] = [];
    expect(typeChecks).toEqual([]);
  });
});
