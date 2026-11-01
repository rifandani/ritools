import { Effect } from "effect";

import { appRuntime } from "@/core/runtime/client";
import { UnmaskEngine } from "@/features/unmask/unmask.engine";
import type {
  Backdrop,
  Matte,
  OutputFormat,
  RasterImage,
  RemoveOptions,
  SourceFile,
} from "@/features/unmask/unmask.engine";

/**
 * The Unmask engine calls, as Effect atoms.
 *
 * The page never imports a Worker or a model. The runtime owns the Worker
 * lifecycle, so a cancelled request stops the Worker and the next call starts
 * from a clean state. The payloads carry domain values only.
 */

interface RemoveCall {
  readonly file: SourceFile;
  readonly options: RemoveOptions;
}

export const removeUnmaskAtom = appRuntime.fn(
  Effect.fn("Unmask.remove")(function* (call: RemoveCall) {
    return yield* UnmaskEngine.use((engine) =>
      engine.remove(call.file, call.options)
    );
  })
);

interface CutoutCall {
  readonly backdrop: Backdrop;
  readonly feather: number;
  readonly format: OutputFormat;
  readonly imageToken: string;
  readonly matte: Matte;
  readonly nameStem: string;
  readonly quality: number;
  readonly signal?: AbortSignal;
  readonly source: RasterImage;
}

/** One composite and one encode. The result is the encoded Cutout. */
export const cutoutUnmaskAtom = appRuntime.fn(
  Effect.fn("Unmask.cutout")(function* (call: CutoutCall) {
    return yield* UnmaskEngine.use((engine) =>
      engine
        .composite({
          backdrop: call.backdrop,
          feather: call.feather,
          imageToken: call.imageToken,
          matte: call.matte,
          signal: call.signal,
          source: call.source,
        })
        .pipe(
          Effect.flatMap((image) =>
            engine.encode({
              backdrop: call.backdrop,
              format: call.format,
              image,
              imageToken: call.imageToken,
              nameStem: call.nameStem,
              quality: call.quality,
              signal: call.signal,
            })
          )
        )
    );
  })
);
