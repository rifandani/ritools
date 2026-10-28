/* oxlint-disable anti-slop/no-unknown-parameters -- The test stubs the fetch input and returns a minimal response. */
import { readFileSync } from "node:fs";
import path from "node:path";

import { expect, it } from "@effect/vitest";
import { Effect } from "effect";
import { afterEach, vi } from "vitest";

import * as T from "./tabular";
import type { FailureContext } from "./tabular.format";
import { loadPdfAssets, loadPdfMetrics } from "./tabular.pdf.assets";

const dir = path.join(import.meta.dirname, "../../../public/fonts/pdf");
const body = new Uint8Array(
  readFileSync(path.join(dir, "archivo-latin-400-normal.ttf"))
);
const title = new Uint8Array(
  readFileSync(path.join(dir, "archivo-latin-wdth125-wght900.ttf"))
);
const ctx = (): FailureContext => ({
  requestId: T.RequestId.make("pdf-assets"),
  operation: "test",
  sessionId: null,
});
const idle = new AbortController().signal;
// SAFETY: The stub carries the only Response fields that loadPdfMetrics reads.
const respond = (bytes: Uint8Array) =>
  ({
    ok: true,
    arrayBuffer: () => Promise.resolve(bytes.buffer),
  }) as Response;
const attempt = <A>(run: () => Promise<A>) =>
  Effect.result(
    Effect.tryPromise({
      try: run,
      // SAFETY: loadPdfMetrics and loadPdfAssets throw only EngineError values.
      catch: (error) => error as T.EngineError,
    })
  );

afterEach(() => {
  vi.unstubAllGlobals();
});

it.effect("reports a cancelled read when the signal aborts", () =>
  Effect.gen(function* () {
    const controller = new AbortController();
    vi.stubGlobal(
      "fetch",
      vi.fn((url: string) => {
        expect(url).toBe("/fonts/pdf/archivo-latin-400-normal.ttf");
        controller.abort();
        return Promise.reject(new Error("aborted"));
      })
    );
    const result = yield* attempt(() =>
      loadPdfMetrics(ctx(), controller.signal)
    );
    expect(result._tag).toBe("Failure");
    if (result._tag === "Failure") {
      expect(result.failure).toBeInstanceOf(T.Cancelled);
      if (result.failure instanceof T.Cancelled) {
        expect(result.failure.phase).toBe("planning-export");
      }
    }
  })
);

it.effect("reports an unavailable font asset without hiding the name", () =>
  Effect.gen(function* () {
    vi.stubGlobal(
      "fetch",
      // SAFETY: The failed response carries the only field that the loader reads.
      vi.fn(() => Promise.resolve({ ok: false } as Response))
    );
    const result = yield* attempt(() => loadPdfMetrics(ctx(), idle));
    expect(result._tag).toBe("Failure");
    if (result._tag === "Failure") {
      expect(result.failure).toBeInstanceOf(T.EngineOffline);
      if (result.failure instanceof T.EngineOffline) {
        expect(result.failure.asset).toBe(
          "pdf-font-archivo-latin-400-normal.ttf"
        );
      }
    }
  })
);

it.effect("loads and caches the body font metrics", () =>
  Effect.gen(function* () {
    const fetch = vi.fn(() => Promise.resolve(respond(body)));
    vi.stubGlobal("fetch", fetch);
    const metrics = yield* attempt(() =>
      loadPdfMetrics(ctx(), idle, "reading")
    );
    if (metrics._tag === "Failure") {
      throw metrics.failure;
    }
    expect(metrics.success.unitsPerEm).toBeGreaterThan(0);
    expect(metrics.success.glyphs.has(0x41)).toBe(true);
    const again = yield* attempt(() => loadPdfMetrics(ctx(), idle));
    expect(again).toEqual(metrics);
    expect(fetch).toHaveBeenCalledTimes(1);
  })
);

it.effect("loads the body and title fonts for the writer", () =>
  Effect.gen(function* () {
    const fetch = vi.fn((url: string) =>
      Promise.resolve(respond(url.includes("wght900") ? title : body))
    );
    vi.stubGlobal("fetch", fetch);
    const assets = yield* attempt(() => loadPdfAssets(ctx(), idle));
    if (assets._tag === "Failure") {
      throw assets.failure;
    }
    expect(assets.success.body).toEqual(body);
    expect(assets.success.title).toEqual(title);
    expect(fetch).toHaveBeenCalledTimes(1);
  })
);
