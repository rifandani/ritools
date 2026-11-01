/* oxlint-disable anti-slop/require-safety-comment-for-type-assertion -- the fake engine is typed at the seam, not from input */
import { describe, expect, it } from "@effect/vitest";
import { Effect } from "effect";
import { AtomRegistry } from "effect/reactivity";
import { vi } from "vitest";

import type {
  EncodedFile,
  Matte,
  MatteId,
  RasterImage,
  RemoveResult,
  SourceId,
} from "@/features/unmask/unmask.engine";

const engine = vi.hoisted(() => ({
  composite: vi.fn(),
  encode: vi.fn(),
  refine: vi.fn(),
  remove: vi.fn(),
}));

// The atoms only need the runtime's engine seam. Replacing the module keeps
// the Worker factory and the model out of a Node unit test.
vi.mock("@/core/runtime/client", async () => {
  const { Layer } = await import("effect");
  const { Atom } = await import("effect/reactivity");
  const { UnmaskEngine } = await import("@/features/unmask/unmask.engine");
  return {
    appRuntime: Atom.runtime(Layer.succeed(UnmaskEngine, engine)),
  };
});

const { cutoutUnmaskAtom, removeUnmaskAtom } =
  await import("@/features/unmask/unmask.atoms");

const matteId = (value: string): MatteId => value as MatteId;
const sourceId = (value: string): SourceId => value as SourceId;

const matte: Matte = {
  alpha: Uint8Array.from([255]),
  height: 1,
  matteId: matteId("matte-1"),
  width: 1,
};

const raster: RasterImage = {
  height: 1,
  rgba: Uint8Array.from([1, 2, 3, 255]),
  width: 1,
};

const removed: RemoveResult = {
  matte,
  model: null,
  notes: [],
  preview: matte,
  source: {
    bytes: 3,
    format: "png",
    frameCount: 1,
    hasAlpha: false,
    height: 1,
    name: "a.png",
    sourceId: sourceId("image-1"),
    width: 1,
  },
};

const file: EncodedFile = {
  bytes: Uint8Array.from([1, 2]),
  bytesLength: 2,
  format: "webp",
  hasAlpha: true,
  height: 1,
  mime: "image/webp",
  name: "a-cutout.webp",
  quality: 85,
  width: 1,
};

describe("Unmask atoms", () => {
  it.live("asks the engine to remove the file", () =>
    Effect.gen(function* () {
      engine.remove.mockReturnValue(Effect.succeed(removed));
      const registry = AtomRegistry.make();
      const source = {
        bytes: Uint8Array.from([1, 2, 3]),
        mime: "image/png",
        name: "a.png",
      };

      registry.set(removeUnmaskAtom, { file: source, options: {} });
      const value = yield* AtomRegistry.getResult(registry, removeUnmaskAtom);

      expect(value).toBe(removed);
      expect(engine.remove).toHaveBeenCalledWith(source, {});
    })
  );

  it.live("composites and encodes one Cutout", () =>
    Effect.gen(function* () {
      engine.composite.mockReturnValue(Effect.succeed(raster));
      engine.encode.mockReturnValue(Effect.succeed(file));
      const registry = AtomRegistry.make();
      const call = {
        backdrop: { _tag: "Transparent" } as const,
        feather: 0,
        format: "webp" as const,
        imageToken: "image-1",
        matte,
        nameStem: "a",
        quality: 85,
        source: raster,
      };

      registry.set(cutoutUnmaskAtom, call);
      const value = yield* AtomRegistry.getResult(registry, cutoutUnmaskAtom);

      expect(value).toBe(file);
      expect(engine.composite).toHaveBeenCalledWith({
        backdrop: call.backdrop,
        feather: 0,
        imageToken: "image-1",
        matte,
        signal: undefined,
        source: raster,
      });
      expect(engine.encode).toHaveBeenCalledWith({
        backdrop: call.backdrop,
        format: "webp",
        image: raster,
        imageToken: "image-1",
        nameStem: "a",
        quality: 85,
        signal: undefined,
      });
    })
  );
});
