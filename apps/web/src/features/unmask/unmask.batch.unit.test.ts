/* oxlint-disable anti-slop/require-safety-comment-for-type-assertion, anti-slop/no-shape-in-symbol-names, eslint/no-await-in-loop, eslint/no-unused-vars, typescript/array-type, typescript/no-non-null-assertion, unicorn/consistent-function-scoping, unicorn/no-useless-undefined -- tests build typed fixtures and replay steps in order. */
import { Effect, Fiber } from "effect";
import { describe, expect, it } from "vitest";

import type { BatchRow, BatchSettings } from "@/features/unmask/unmask.batch";
import {
  batchBytesOf,
  DEFAULT_BATCH_SETTINGS,
  forgetMatte,
  markStale,
  overBatchWarning,
  planBatch,
  runBatch,
  settingsKeyOf,
} from "@/features/unmask/unmask.batch";
import type {
  EncodedFile,
  Matte,
  MatteId,
  UnmaskError,
} from "@/features/unmask/unmask.engine";

const matteId = (value: string): MatteId => value as MatteId;

const matteOf = (): Matte => ({
  alpha: Uint8Array.from([255]),
  height: 1,
  matteId: matteId("m"),
  width: 1,
});

const fileOf = (name: string): EncodedFile => ({
  bytes: Uint8Array.from([1, 2, 3]),
  bytesLength: 3,
  format: "webp",
  hasAlpha: true,
  height: 1,
  mime: "image/webp",
  name,
  quality: 85,
  width: 1,
});

const rowOf = (id: string, options: Partial<BatchRow> = {}): BatchRow => ({
  bytes: 100,
  error: null,
  id,
  matte: null,
  name: `${id}.jpg`,
  result: null,
  state: "queued",
  ...options,
});

const settings: BatchSettings = DEFAULT_BATCH_SETTINGS;

describe("the Batch plan", () => {
  it("marks finished Cutouts stale on a settings change", () => {
    const rows = [
      rowOf("ready", { state: "ready" }),
      rowOf("edited", { state: "edited" }),
      rowOf("downloaded", { state: "downloaded" }),
      rowOf("failed", { state: "failed" }),
      rowOf("queued"),
      rowOf("stale", { state: "stale" }),
    ];
    const stale = markStale(rows);
    expect(stale.map((row) => row.state)).toEqual([
      "stale",
      "stale",
      "stale",
      "failed",
      "queued",
      "stale",
    ]);
  });

  it("runs queued and stale rows and reuses a kept Matte", () => {
    const rows = [
      rowOf("ready", { state: "ready" }),
      rowOf("stale", { matte: matteOf(), state: "stale" }),
      rowOf("queued"),
      rowOf("failed", { state: "failed" }),
    ];
    expect(
      planBatch(rows).map((step) => [step.row.id, step.reuseMatte])
    ).toEqual([
      ["stale", true],
      ["queued", false],
    ]);
  });

  it("keeps a stable settings key across Backdrops", () => {
    const first = settingsKeyOf(settings);
    const second = settingsKeyOf({
      ...settings,
      backdrop: { _tag: "Solid", color: { a: 255, b: 0, g: 0, r: 255 } },
    });
    const third = settingsKeyOf({
      ...settings,
      backdrop: { _tag: "Blur", radius: 20 },
    });
    expect(new Set([first, second, third]).size).toBe(3);
    expect(settingsKeyOf(settings)).toBe(first);
    expect(settings).toBe(DEFAULT_BATCH_SETTINGS);
  });

  it("adds the input size and warns above the named limit", () => {
    const rows = [rowOf("a"), rowOf("b")];
    expect(batchBytesOf(rows)).toBe(200);
    expect(overBatchWarning(rows)).toBe(false);
    expect(batchBytesOf([{ ...rows[0]!, bytes: 600 * 1024 * 1024 }])).toBe(
      600 * 1024 * 1024
    );
    expect(overBatchWarning([{ ...rows[0]!, bytes: 600 * 1024 * 1024 }])).toBe(
      true
    );
  });

  it("forgets a result and its Matte", () => {
    const row = rowOf("a", {
      matte: matteOf(),
      result: {
        blob: new Blob([Uint8Array.from([1])]),
        file: fileOf("a.webp"),
      },
      state: "ready",
    });
    expect(forgetMatte(row)).toMatchObject({ matte: null, result: null });
  });
});

describe("the Batch runner", () => {
  it("runs one image at a time in plan order", async () => {
    const order: string[] = [];
    const changes: string[] = [];
    await Effect.runPromise(
      runBatch([rowOf("a"), rowOf("b"), rowOf("c")], settings, {
        cut: (row) =>
          Effect.sync(() => {
            order.push(row.id);
            return { file: fileOf(`${row.id}.webp`), matte: matteOf() };
          }),
        onChange: (row) => {
          changes.push(`${row.id}:${row.state}`);
        },
      })
    );
    expect(order).toEqual(["a", "b", "c"]);
    expect(changes).toEqual([
      "a:running",
      "a:ready",
      "b:running",
      "b:ready",
      "c:running",
      "c:ready",
    ]);
  });

  it("isolates a failed image and continues", async () => {
    const seen: string[] = [];
    const failed: string[] = [];
    const failure: UnmaskError = { _tag: "UnreadableFile", reason: "decode" };
    await Effect.runPromise(
      runBatch([rowOf("a"), rowOf("b"), rowOf("c")], settings, {
        cut: (row) =>
          row.id === "b"
            ? Effect.fail(failure)
            : Effect.sync(() => {
                seen.push(row.id);
                return { file: fileOf(`${row.id}.webp`), matte: matteOf() };
              }),
        onChange: (row) => {
          if (row.state === "failed") {
            failed.push(row.id);
          }
        },
      })
    );
    expect(seen).toEqual(["a", "c"]);
    expect(failed).toEqual(["b"]);
  });

  it("stops on an AbortSignal and restores the current row", async () => {
    const controller = new AbortController();
    const changes: Array<{ readonly id: string; readonly state: string }> = [];
    const started: string[] = [];
    await Effect.runPromise(
      runBatch(
        [rowOf("a"), rowOf("b"), rowOf("c")],
        settings,
        {
          cut: (row) =>
            Effect.sync(() => {
              started.push(row.id);
              if (row.id === "b") {
                controller.abort();
              }
              return { file: fileOf(`${row.id}.webp`), matte: matteOf() };
            }),
          onChange: (row) => {
            changes.push({ id: row.id, state: row.state });
          },
        },
        controller.signal
      )
    );
    expect(started).toEqual(["a", "b"]);
    expect(changes).toContainEqual({ id: "a", state: "ready" });
    expect(changes).toContainEqual({ id: "b", state: "queued" });
    expect(changes.some((entry) => entry.id === "c")).toBe(false);
  });

  it("returns the current row to its previous state on interruption", async () => {
    const changes: Array<{ readonly id: string; readonly state: string }> = [];
    let started = 0;
    const fiber = Effect.runFork(
      runBatch([rowOf("a"), rowOf("b"), rowOf("c")], settings, {
        cut: (row) =>
          Effect.gen(function* () {
            started += 1;
            if (row.id === "b") {
              yield* Effect.sleep("5 seconds");
            }
            return { file: fileOf(`${row.id}.webp`), matte: matteOf() };
          }),
        onChange: (row) => {
          changes.push({ id: row.id, state: row.state });
        },
      })
    );
    await Effect.runPromise(Effect.sleep("10 millis"));
    await Effect.runPromise(Fiber.interrupt(fiber));
    expect(started).toBe(2);
    expect(changes).toContainEqual({ id: "a", state: "ready" });
    expect(changes).toContainEqual({ id: "b", state: "queued" });
    expect(changes.at(-1)).toEqual({ id: "b", state: "queued" });
  });
});
