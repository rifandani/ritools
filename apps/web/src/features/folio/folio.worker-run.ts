/** The one Worker member a run uses. */
export interface FolioWorkerPort<Request> {
  readonly postMessage: (message: Request, transfer: Transferable[]) => void;
}

/** The state one active run keeps while its Worker works. */
export interface FolioRunState<Result, Progress> {
  readonly id: string;
  readonly progress: (progress: Progress) => void;
  readonly reject: (error: Error) => void;
  readonly resolve: (result: Result) => void;
}

export interface FolioRunStart<Result, Progress> {
  readonly promise: Promise<Result>;
  readonly run: FolioRunState<Result, Progress>;
}

/**
 * Copy the caller's bytes into a buffer the Worker can own, then post one
 * request. The caller keeps the run state, so one client still allows one run.
 */
export const startFolioRun = <Result, Progress, Request>(options: {
  readonly bytes: Uint8Array;
  readonly onProgress?: (progress: Progress) => void;
  readonly request: (id: string, source: ArrayBuffer) => Request;
  readonly worker: FolioWorkerPort<Request>;
}): FolioRunStart<Result, Progress> => {
  const id = crypto.randomUUID();
  const source = new ArrayBuffer(options.bytes.byteLength);
  new Uint8Array(source).set(options.bytes);
  const deferred = Promise.withResolvers<Result>();
  options.worker.postMessage(options.request(id, source), [source]);
  return {
    promise: deferred.promise,
    run: {
      id,
      progress: options.onProgress ?? (() => null),
      reject: deferred.reject,
      resolve: deferred.resolve,
    },
  };
};
