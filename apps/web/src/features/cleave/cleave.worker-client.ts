/* oxlint-disable unicorn/require-post-message-target-origin -- Dedicated Worker messages have no target origin. */
import type { FileDiffMetadata } from "@pierre/diffs";
import { Effect } from "effect";

import { startLibraryWorker } from "@/core/libs/library-load";

import { CleaveError } from "./cleave";
import type { Texts } from "./cleave";

/** Interruption terminates the compare instead of waiting for a blocked event loop. */
export const compare = (texts: Texts) =>
  Effect.callback<FileDiffMetadata, CleaveError>((resume) => {
    const worker = startLibraryWorker(
      "Cleave",
      () =>
        new Worker(new URL("cleave.worker.ts", import.meta.url), {
          type: "module",
        })
    );
    worker.addEventListener(
      "message",
      (event: MessageEvent<{ type: string; diff?: FileDiffMetadata }>) => {
        if (event.data.type === "result" && event.data.diff) {
          resume(Effect.succeed(event.data.diff));
        } else if (event.data.type === "error") {
          resume(Effect.fail(new CleaveError({ reason: "compare" })));
        }
      }
    );
    worker.addEventListener("error", () =>
      resume(Effect.fail(new CleaveError({ reason: "compare" })))
    );
    worker.postMessage({ type: "compare", ...texts });
    return Effect.sync(() => worker.terminate());
  });
