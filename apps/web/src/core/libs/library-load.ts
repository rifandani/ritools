/* oxlint-disable unicorn/require-post-message-target-origin -- Dedicated Worker messages have no target origin. */
import { Schema } from "effect";

export class LibraryLoadError extends Schema.TaggedError<LibraryLoadError>()(
  "LibraryLoadError",
  { library: Schema.String, cause: Schema.Unknown }
) {
  // fallow-ignore-next-line unused-class-member -- Error.message is read by logs and isLibraryAssetFailure.
  override get message() {
    return `${this.library} library failed to load — check network or ad-blocker`;
  }
}

const Failure = Schema.Struct({
  type: Schema.Literal("ritools:library-load-error"),
  library: Schema.String,
  id: Schema.String,
});
const Ready = Schema.Struct({ type: Schema.Literal("ritools:library-ready") });
type Failure = typeof Failure.Type;
const listeners = new Set<(failure: Failure) => void>();
const pending: Failure[] = [];

const publish = (failure: Failure): void => {
  if (typeof window !== "undefined") {
    if (listeners.size === 0) {
      pending.push(failure);
    }
    for (const listener of listeners) {
      listener(failure);
    }
  } else if (typeof self !== "undefined" && "postMessage" in self) {
    self.postMessage(failure);
  }
};

/** Subscribe once in the shared toaster, including failures before it mounts. */
export const subscribeLibraryFailures = (
  listener: (failure: Failure) => void
) => {
  listeners.add(listener);
  for (const failure of pending.splice(0)) {
    listener(failure);
  }
  return () => {
    listeners.delete(listener);
  };
};

const reported = new WeakMap<object, LibraryLoadError>();

/** Report known load failures once, even when nested boundaries catch them. */
// oxlint-disable-next-line anti-slop/no-unknown-parameters -- Thrown library values are unknown at this adapter boundary.
export const reportLibraryLoadFailure = (
  library: string,
  cause: unknown
): LibraryLoadError => {
  if (cause instanceof LibraryLoadError) {
    return cause;
  }
  if (cause instanceof Object) {
    const existing = reported.get(cause);
    if (existing) {
      return existing;
    }
  }
  const failure = new LibraryLoadError({ library, cause });
  if (cause instanceof Object) {
    reported.set(cause, failure);
  }
  publish({
    type: "ritools:library-load-error",
    library,
    id: crypto.randomUUID(),
  });
  return failure;
};

/** Browser module and WASM load failures, excluding processing RuntimeErrors. */
// oxlint-disable-next-line anti-slop/no-unknown-parameters -- Browser import and Worker errors arrive untyped.
export const isLibraryAssetFailure = (error: unknown): boolean =>
  error instanceof LibraryLoadError ||
  (error instanceof Error &&
    /library failed to load|failed to fetch|fetch failed|networkerror|network error|importing a module|dynamically imported module|loading.*module|unable to preload|wasm.*(?:fetch|compile|instantiate)|WebAssembly\.(?:compile|instantiate)/iu.test(
      error.message
    )) ||
  (typeof WebAssembly !== "undefined" &&
    (error instanceof WebAssembly.CompileError ||
      error instanceof WebAssembly.LinkError));

/** Only load/initialization belongs here. File processing keeps its own errors. */
export const loadLibrary = async <A>(
  library: string,
  load: () => Promise<A>,
  signal?: AbortSignal
): Promise<A> => {
  try {
    return await load();
  } catch (error) {
    if (
      signal?.aborted ||
      (error instanceof DOMException && error.name === "AbortError")
    ) {
      throw error;
    }
    throw reportLibraryLoadFailure(library, error);
  }
};

/** Static Worker imports have completed when this handshake arrives. */
export const libraryWorkerReady = () => {
  self.postMessage({ type: "ritools:library-ready" });
};

const workerLoadErrors = new WeakMap<Worker, LibraryLoadError>();

/** Startup errors remain identifiable by clients that limit crash restarts. */
export const libraryWorkerLoadError = (worker: Worker) =>
  workerLoadErrors.get(worker);

/** Forward nested Worker load failures without exposing them as job replies. */
export const startLibraryWorker = (library: string, start: () => Worker) => {
  let worker: Worker;
  try {
    worker = start();
  } catch (error) {
    publish({
      type: "ritools:library-load-error",
      library,
      id: crypto.randomUUID(),
    });
    throw new LibraryLoadError({ library, cause: error });
  }
  let ready = false;
  worker.addEventListener("message", (event: MessageEvent<unknown>) => {
    if (Schema.is(Ready)(event.data)) {
      ready = true;
      event.stopImmediatePropagation();
    } else if (Schema.is(Failure)(event.data)) {
      publish(event.data);
      event.stopImmediatePropagation();
    }
  });
  worker.addEventListener("error", (event) => {
    if (!ready) {
      ready = true;
      workerLoadErrors.set(
        worker,
        reportLibraryLoadFailure(library, event.error)
      );
    }
  });
  return worker;
};
