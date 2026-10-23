import { Effect } from "effect";

import { appRuntime } from "@/core/runtime/client";
import type { CleanRequest, ExposeSource } from "@/features/expose/expose";
import { ExposeEngine } from "@/features/expose/expose";

/**
 * The two Expose calls, as Effect atoms.
 *
 * The page never imports a reader or a cleaner: it asks the engine for a
 * report or a Cleaned File. The runtime owns the Worker, so a cancelled Clean
 * terminates the Worker instead of leaving it answering a later request.
 */
export const readExposeAtom = appRuntime.fn(
  Effect.fn("Expose.read")(function* (source: ExposeSource) {
    return yield* ExposeEngine.use((engine) => engine.read(source));
  })
);

export interface CleanCall {
  readonly request: CleanRequest;
  readonly source: ExposeSource;
}

export const cleanExposeAtom = appRuntime.fn(
  Effect.fn("Expose.clean")(function* (call: CleanCall) {
    return yield* ExposeEngine.use((engine) =>
      engine.clean(call.source, call.request)
    );
  })
);

export type { CleanResult, ReadReport } from "@/features/expose/expose";
