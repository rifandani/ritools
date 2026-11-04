import { Effect, Ref } from "effect";

import type * as ResultModule from "./components/redline-result";
import type * as LibraryModule from "./redline.library.browser";
import type * as SessionModule from "./redline.session";

const retryResult = import.meta.glob<typeof ResultModule>(
  "./components/redline-result.tsx",
  { query: "redline-retry" }
);
const retrySession = import.meta.glob<typeof SessionModule>(
  "./redline.session.ts",
  { query: "redline-retry" }
);
const retryLibrary = import.meta.glob<typeof LibraryModule>(
  "./redline.library.browser.ts",
  { query: "redline-retry" }
);
// Public asset state only. User text never enters this module.
const attempts = Effect.runSync(Ref.make(0));
const loadModule = <A>(load: (() => Promise<A>) | undefined) =>
  load
    ? Effect.tryPromise(load)
    : Effect.fail(new Error("Redline module is unavailable"));

/** Finish every optional load before exposing the result. */
export const loadRuntime = Effect.fn("Redline.loadRuntime")(
  function* () {
    const retry = (yield* Ref.get(attempts)) > 0;
    const [renderer, session, library] = yield* Effect.all(
      [
        loadModule(
          retry
            ? retryResult["./components/redline-result.tsx"]
            : () => import("./components/redline-result")
        ),
        loadModule(
          retry
            ? retrySession["./redline.session.ts"]
            : () => import("./redline.session")
        ),
        loadModule(
          retry
            ? retryLibrary["./redline.library.browser.ts"]
            : () => import("./redline.library.browser")
        ),
      ],
      { concurrency: "unbounded" }
    );
    yield* Effect.tryPromise(() =>
      library.preloadHighlighter({
        themes: Object.values(library.DEFAULT_THEMES),
        langs: ["text"],
        preferredHighlighter: "shiki-js",
      })
    );
    return { Result: renderer.RedlineResult, Session: session.RedlineSession };
  },
  Effect.tapError(() => Ref.update(attempts, (count) => count + 1))
);
