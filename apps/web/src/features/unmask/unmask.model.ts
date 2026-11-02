/* oxlint-disable promise/prefer-await-to-then -- ONNX Runtime is promise-based. */
/* oxlint-disable anti-slop/no-unknown-parameters, anti-slop/require-safety-comment-for-type-assertion, eslint/prefer-destructuring, eslint/require-await, promise/prefer-await-to-callbacks, unicorn/no-useless-undefined -- ONNX Runtime values are opaque here and are classified at this boundary. */
import { Effect } from "effect";
import type * as ort from "onnxruntime-web";

import {
  loadModelBytes,
  modelInfoOf,
} from "@/features/unmask/unmask.model-cache";
import type { Inference, ModelPort } from "@/features/unmask/unmask.remove";
import { modelInputOf } from "@/features/unmask/unmask.remove";
import type {
  ModelInfo,
  RemoveNote,
  RemoveProgress,
  RasterImage,
  UnmaskError,
} from "@/features/unmask/unmask.schema";
import {
  Cancelled,
  ModelFailed,
  ModelUnavailable,
} from "@/features/unmask/unmask.schema";

/**
 * The ONNX Runtime session.
 *
 * One session per Worker. WebGPU is tried first; a missing adapter or a failed
 * session creation falls back to WASM without a page reload. The model is
 * loaded once and kept for the whole editor or Batch session. No ORT value
 * leaves this module.
 */

interface SessionRuntime {
  readonly backend: ModelInfo["backend"];
  readonly bytes: Uint8Array;
  readonly fallbackReason: string | null;
  readonly session: ort.InferenceSession;
}

interface LoadedRuntime {
  notes: RemoveNote[];
  readonly runtime: SessionRuntime;
}

/**
 * Loads ONNX Runtime on the first inference only. An input that already has a
 * Matte never loads it, so the sample and a transparent PNG stay fast and
 * need no model request.
 */
const loadOrt = async () => {
  const [module, mjs, wasm] = await Promise.all([
    import("onnxruntime-web"),
    import("onnxruntime-web/ort-wasm-simd-threaded.jsep.mjs?url"),
    // oxlint-disable-next-line import/no-unresolved -- Vite resolves the package export to a URL.
    import("onnxruntime-web/ort-wasm-simd-threaded.jsep.wasm?url"),
  ]);
  module.env.wasm.wasmPaths = { mjs: mjs.default, wasm: wasm.default };
  // The app does not set cross-origin isolation, so the WASM runtime is on
  // one thread. A later COOP/COEP change must measure the threaded path first.
  module.env.wasm.numThreads = 1;
  module.env.logLevel = "error";
  return module;
};

type OrtModule = Awaited<ReturnType<typeof loadOrt>>;

let ortPromise: Promise<OrtModule> | null = null;

const ortOf = (): Promise<OrtModule> => {
  ortPromise ??= loadOrt();
  return ortPromise;
};

const memoryFailure = /alloc|out of memory|out of bounds|bad_alloc|memory/iu;
const deviceFailure = /device (?:lost|removed)|GPUDevice|webgpu|adapter/iu;

const asReason = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

const hasWebGpu = (): boolean =>
  typeof navigator !== "undefined" && "gpu" in navigator;

const createSession = async (
  bytes: Uint8Array,
  providers: readonly ("webgpu" | "wasm")[]
): Promise<ort.InferenceSession> => {
  const ortModule = await ortOf();
  return ortModule.InferenceSession.create(bytes, {
    executionProviders: [...providers],
    graphOptimizationLevel: "all",
  });
};

const wasmRuntimeOf = async (
  bytes: Uint8Array,
  fallbackReason: string
): Promise<SessionRuntime> => ({
  backend: "wasm",
  bytes,
  fallbackReason,
  session: await createSession(bytes, ["wasm"]),
});

const initRuntime = async (bytes: Uint8Array): Promise<SessionRuntime> => {
  if (!hasWebGpu()) {
    return wasmRuntimeOf(bytes, "WebGPU is not available");
  }
  try {
    const session = await createSession(bytes, ["webgpu", "wasm"]);
    return { backend: "webgpu", bytes, fallbackReason: null, session };
  } catch (error) {
    return wasmRuntimeOf(bytes, asReason(error));
  }
};

const inferenceFailure = (error: unknown): UnmaskError => {
  if (error instanceof Cancelled || error instanceof ModelFailed) {
    return error;
  }
  const detail = asReason(error);
  return new ModelFailed({
    detail,
    reason: memoryFailure.test(detail)
      ? "memory"
      : deviceFailure.test(detail)
        ? "device-lost"
        : "inference",
  });
};

const runSession = async (
  runtime: SessionRuntime,
  input: Float32Array
): Promise<{
  readonly alpha: Float32Array;
  readonly height: number;
  readonly width: number;
}> => {
  const ortModule = await ortOf();
  const tensor = new ortModule.Tensor("float32", input, [1, 3, 1024, 1024]);
  const inputName = runtime.session.inputNames[0] ?? "input";
  const outputName = runtime.session.outputNames[0] ?? "output";
  const feeds = Object.fromEntries([[inputName, tensor]]);
  const result = await runtime.session.run(feeds, [outputName]);
  const output = result[outputName] ?? Object.values(result)[0];
  if (output === undefined) {
    throw new ModelFailed({
      detail: "the model returned no output",
      reason: "inference",
    });
  }
  const dims = output.dims;
  return {
    alpha: output.data as Float32Array,
    height: dims[2] ?? 1024,
    width: dims[3] ?? 1024,
  };
};

/** The notes that mean "the model came from the runtime cache". */
const loadNotesOf = (cached: boolean): RemoveNote[] =>
  cached ? [{ _tag: "ModelCached" }] : [{ _tag: "ModelDownloaded" }];

/** Creates the model port for one Worker. */
export const createModelPort = (): ModelPort => {
  let runtimeValue: SessionRuntime | null = null;
  let pending: Promise<LoadedRuntime> | null = null;
  let unclaimedNotes: RemoveNote[] = [];

  const ensure = async (options: {
    readonly signal?: AbortSignal;
    readonly report?: (event: RemoveProgress) => void;
  }): Promise<SessionRuntime> => {
    if (runtimeValue !== null) {
      return runtimeValue;
    }
    if (pending === null) {
      pending = (async () => {
        const loaded = await loadModelBytes({
          report: options.report,
          signal: options.signal,
        });
        options.report?.({ _tag: "ModelInit" });
        const runtime = await initRuntime(loaded.bytes);
        const notes = loadNotesOf(loaded.cached);
        if (runtime.fallbackReason !== null) {
          notes.push({
            _tag: "WebGpuFallback",
            reason: runtime.fallbackReason,
          });
        }
        return { notes, runtime };
      })().catch((error: unknown) => {
        pending = null;
        if (error instanceof Cancelled || error instanceof ModelUnavailable) {
          throw error;
        }
        throw new ModelUnavailable({
          detail: asReason(error),
          reason: "init",
        });
      });
    }
    const ready = await pending;
    runtimeValue = ready.runtime;
    unclaimedNotes = ready.notes;
    return ready.runtime;
  };

  return {
    infer: (raster: RasterImage, options) =>
      Effect.tryPromise({
        catch: inferenceFailure,
        try: async () => {
          const runtime = await ensure(options);
          const notes = unclaimedNotes;
          unclaimedNotes = [];
          options.report?.({ _tag: "Infer" });
          if (options.signal?.aborted) {
            throw new Cancelled({ detail: "the inference was cancelled" });
          }
          const input = modelInputOf(raster);
          let backend = runtime.backend;
          let output: Awaited<ReturnType<typeof runSession>>;
          try {
            output = await runSession(runtime, input);
          } catch (error) {
            if (runtime.backend !== "webgpu") {
              throw error;
            }
            // A failed WebGPU run falls back to WASM once, without a reload.
            // The fallback must not try WebGPU again: a WebGPU kernel that
            // throws can leave the WebGPU backend unusable for this Worker,
            // and every later WebGPU run then fails. The ISNet MaxPool uses
            // ceil_mode, which the ORT WebGPU kernel does not run, so this
            // path is the normal path on a WebGPU device.
            await runtime.session.release().catch(() => undefined);
            const fallback = await wasmRuntimeOf(
              runtime.bytes,
              asReason(error)
            );
            runtimeValue = fallback;
            backend = fallback.backend;
            notes.push({
              _tag: "WebGpuFallback",
              reason: asReason(error),
            });
            output = await runSession(fallback, input);
          }
          if (options.signal?.aborted) {
            throw new Cancelled({ detail: "the inference was cancelled" });
          }
          return {
            alpha: output.alpha,
            height: output.height,
            model: modelInfoOf(backend),
            notes,
            width: output.width,
          } satisfies Inference;
        },
      }),
  };
};
