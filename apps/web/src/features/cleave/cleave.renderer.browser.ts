import { Effect, Ref } from "effect";

import { LANGUAGE_CATALOG } from "./cleave.languages";
import type * as LibraryModule from "./cleave.library.browser";
import type * as SessionModule from "./cleave.session";
import type * as ResultModule from "./components/cleave-result";

const retryResult = import.meta.glob<typeof ResultModule>(
  "./components/cleave-result.tsx",
  { query: "cleave-retry" }
);
const retrySession = import.meta.glob<typeof SessionModule>(
  "./cleave.session.ts",
  { query: "cleave-retry" }
);
const retryLibrary = import.meta.glob<typeof LibraryModule>(
  "./cleave.library.browser.ts",
  { query: "cleave-retry" }
);
// Public asset state only. User text never enters this module.
const attempts = Effect.runSync(Ref.make(0));
const loadModule = <A>(load: (() => Promise<A>) | undefined) =>
  load
    ? Effect.tryPromise(load)
    : Effect.fail(new Error("Cleave module is unavailable"));

/** Finish every optional load before exposing the result. */
export const loadRuntime = Effect.fn("Cleave.loadRuntime")(
  function* () {
    const retry = (yield* Ref.get(attempts)) > 0;
    const [renderer, session, library] = yield* Effect.all(
      [
        loadModule(
          retry
            ? retryResult["./components/cleave-result.tsx"]
            : () => import("./components/cleave-result")
        ),
        loadModule(
          retry
            ? retrySession["./cleave.session.ts"]
            : () => import("./cleave.session")
        ),
        loadModule(
          retry
            ? retryLibrary["./cleave.library.browser.ts"]
            : () => import("./cleave.library.browser")
        ),
      ],
      { concurrency: "unbounded" }
    );
    const [, detectLanguage] = yield* Effect.tryPromise(() =>
      Promise.all([
        library.preloadHighlighter({
          themes: Object.values(library.DEFAULT_THEMES),
          langs: ["text"],
          preferredHighlighter: library.preferredHighlighter,
        }),
        library.loadLanguageDetector(),
      ])
    );
    return {
      Result: renderer.CleaveResult,
      Session: session.CleaveSession,
      detectLanguage,
      languages: LANGUAGE_CATALOG.filter(
        (item) => library.preferredHighlighter === "highlights" || item.shiki
      ),
    };
  },
  Effect.tapError(() => Ref.update(attempts, (count) => count + 1))
);
