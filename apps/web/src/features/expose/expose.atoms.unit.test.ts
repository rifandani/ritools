/* oxlint-disable anti-slop/require-safety-comment-for-type-assertion -- the fake engine and the stub report are typed at the seam, not from input */
import { describe, expect, it } from "@effect/vitest";
import { Effect } from "effect";
import { AtomRegistry } from "effect/reactivity";
import { vi } from "vitest";

import type {
  CleanResult,
  ExposeSource,
  ReadReport,
} from "@/features/expose/expose";

const engine = vi.hoisted(() => ({
  clean: vi.fn(),
  cleanBatch: vi.fn(),
  read: vi.fn(),
}));

// The atoms only need the runtime's engine seam. Replacing the module keeps the
// Worker factory and the ExifTool loader out of a Node unit test.
vi.mock("@/core/runtime/client", async () => {
  const { Layer } = await import("effect");
  const { Atom } = await import("effect/reactivity");
  const { ExposeEngine } = await import("@/features/expose/expose");
  return {
    appRuntime: Atom.runtime(
      Layer.succeed(ExposeEngine, {
        clean: engine.clean,
        cleanBatch: engine.cleanBatch,
        read: engine.read,
      })
    ),
  };
});

const { cleanExposeAtom, cleanExposeBatchAtom, readExposeAtom } =
  await import("@/features/expose/expose.atoms");

const source: ExposeSource = {
  bytes: new Blob([new Uint8Array([1, 2, 3])]),
  lastModified: 0,
  name: "image.jpg",
  type: "image/jpeg",
};

const report: ReadReport = {
  ai: {
    c2pa: null,
    digitalSourceTypes: [],
    generationParameters: [],
    signals: [],
  },
  counts: { fields: 0, groups: 0, kept: 0, removable: 0 },
  facts: {
    family: "image",
    durationSeconds: null,
    pageCount: null,
    sampleRate: null,
    channels: null,
    parts: null,
    bytes: 3,
    format: "jpeg",
    frames: null,
    height: 1,
    mime: "image/jpeg",
    name: "image.jpg",
    orientation: 1,
    width: 1,
  },
  fields: [],
  gps: null,
  groups: [],
  notes: [],
  thumbnail: null,
};

const result = {
  engine: { name: "ExifTool", version: "13.59" },
  file: {
    bytes: new Uint8Array([1, 2, 3]),
    name: "image-clean.jpg",
    type: "image/jpeg",
  },
  kept: [],
  removed: [],
  verification: {
    c2pa: { afterBytes: 0, beforeBytes: 0 },
    display: { after: 0, before: 0, group: "display" },
    kept: [],
    content: {
      kind: "image-payload",
      parts: null,
      afterHash: "a",
      beforeHash: "a",
      unchanged: true,
    },
    read: report,
    selected: [],
  },
  warnings: [],
} satisfies CleanResult;

describe("Expose atoms", () => {
  it.live("asks the engine to read the source", () =>
    Effect.gen(function* () {
      engine.read.mockReturnValue(Effect.succeed(report));
      const registry = AtomRegistry.make();

      registry.set(readExposeAtom, source);
      const value = yield* AtomRegistry.getResult(registry, readExposeAtom);

      expect(value).toBe(report);
      expect(engine.read).toHaveBeenCalledWith(source, undefined);
    })
  );

  it.live("asks the engine to clean the source with the request", () =>
    Effect.gen(function* () {
      engine.clean.mockReturnValue(Effect.succeed(result));
      const registry = AtomRegistry.make();
      const request = { groups: ["authorship"], preset: "custom" } as const;

      registry.set(cleanExposeAtom, { request, source });
      const value = yield* AtomRegistry.getResult(registry, cleanExposeAtom);

      expect(value).toBe(result);
      expect(engine.clean).toHaveBeenCalledWith(source, request);
    })
  );

  it.live("sends the batch and event reporter to the engine", () =>
    Effect.gen(function* () {
      const tasks = [{ id: "one", source }];
      const request = { groups: ["authorship"], preset: "custom" } as const;
      const reportEvent = vi.fn();
      engine.cleanBatch.mockReturnValue(Effect.void);
      const registry = AtomRegistry.make();

      registry.set(cleanExposeBatchAtom, {
        tasks,
        request,
        report: reportEvent,
      });
      yield* AtomRegistry.getResult(registry, cleanExposeBatchAtom);

      expect(engine.cleanBatch).toHaveBeenCalledWith(
        tasks,
        request,
        reportEvent
      );
    })
  );
});
