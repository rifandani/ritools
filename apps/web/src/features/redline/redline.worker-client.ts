/* oxlint-disable unicorn/require-post-message-target-origin -- Dedicated Worker messages have no target origin. */
import type { FileDiffMetadata } from "@pierre/diffs";
import { Effect } from "effect";

import { startLibraryWorker } from "@/core/libs/library-load";

import { RedlineError } from "./redline";
import type { Texts } from "./redline";

/** Interruption terminates the compare instead of waiting for a blocked event loop. */
export const compare = (texts: Texts) =>
  Effect.callback<FileDiffMetadata, RedlineError>((resume) => {
    const worker = startLibraryWorker(
      "Redline",
      () =>
        new Worker(new URL("redline.worker.ts", import.meta.url), {
          type: "module",
        })
    );
    worker.addEventListener(
      "message",
      (event: MessageEvent<{ type: string; diff?: FileDiffMetadata }>) => {
        if (event.data.type === "result" && event.data.diff) {
          resume(Effect.succeed(event.data.diff));
        } else if (event.data.type === "error") {
          resume(Effect.fail(new RedlineError({ reason: "compare" })));
        }
      }
    );
    worker.addEventListener("error", () =>
      resume(Effect.fail(new RedlineError({ reason: "compare" })))
    );
    worker.postMessage({ type: "compare", ...texts });
    return Effect.sync(() => worker.terminate());
  });
