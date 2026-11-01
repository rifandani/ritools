/* oxlint-disable eslint/no-await-in-loop -- the download stream is read one chunk at a time. */
import type {
  ModelInfo,
  RemoveProgress,
} from "@/features/unmask/unmask.schema";
import { Cancelled, ModelUnavailable } from "@/features/unmask/unmask.schema";

/**
 * The model asset.
 *
 * It is served from the app origin, never a third-party CDN. It is not
 * precached: the first run downloads it with progress and stores it in the
 * Cache API under a key that names the model and its SHA-256. Later runs read
 * the cache and work offline while it is present. No user data enters this
 * cache.
 */

const ISNET_MODEL = {
  id: "isnet-int8",
  name: "ISNet int8",
  version: "71eff2372ec9c8edbc6ca637ded591423d23b65a",
  licence: "MIT",
  licenceUrl: "https://huggingface.co/xrds/isnet-general-onnx-int8",
  bytes: 44_229_662,
  sha256: "3b21a6706dc8d6e4ba9f5b31ebc6940f6c785b58862e27bb25daa9dd4424b87f",
  url: "/unmask/models/isnet-int8.onnx",
} as const;

/** The Cache Storage bucket. It holds model bytes and nothing else. */
const MODEL_CACHE_NAME = "unmask-models-v1";

/** The cache key. It contains the model id and the SHA-256, never user data. */
const modelCacheKeyOf = (origin: string): string =>
  new URL(
    `/unmask/model-cache/${ISNET_MODEL.id}-${ISNET_MODEL.sha256}.onnx`,
    origin
  ).href;

/** The model info the seam reports. */
export const modelInfoOf = (backend: ModelInfo["backend"]): ModelInfo => ({
  backend,
  bytes: ISNET_MODEL.bytes,
  id: ISNET_MODEL.id,
  licence: ISNET_MODEL.licence,
  licenceUrl: ISNET_MODEL.licenceUrl,
  name: ISNET_MODEL.name,
  sha256: ISNET_MODEL.sha256,
  version: ISNET_MODEL.version,
});

/** The lowercase hex SHA-256 of a byte buffer. */
const sha256Hex = async (bytes: Uint8Array): Promise<string> => {
  const copy = new Uint8Array(bytes.length);
  copy.set(bytes);
  const digest = await crypto.subtle.digest("SHA-256", copy.buffer);
  let hex = "";
  for (const value of new Uint8Array(digest)) {
    hex += value.toString(16).padStart(2, "0");
  }
  return hex;
};

export interface ModelBytes {
  readonly bytes: Uint8Array;
  readonly cached: boolean;
}

export interface ModelLoadOptions {
  readonly report?: (event: RemoveProgress) => void;
  readonly signal?: AbortSignal;
}

const offline = (): boolean =>
  typeof navigator !== "undefined" && navigator.onLine === false;

const cancelled = (): Cancelled =>
  new Cancelled({ detail: "the model download was cancelled" });

const checkStop = (signal?: AbortSignal): void => {
  if (signal?.aborted === true) {
    throw cancelled();
  }
};

/** Checks a byte buffer against the recorded size and SHA-256. */
const modelBytesMatch = async (bytes: Uint8Array): Promise<boolean> => {
  if (bytes.byteLength !== ISNET_MODEL.bytes) {
    return false;
  }
  return (await sha256Hex(bytes)) === ISNET_MODEL.sha256;
};

const readResponse = async (
  response: Response,
  report: (event: RemoveProgress) => void,
  signal?: AbortSignal
): Promise<Uint8Array> => {
  const header = response.headers.get("content-length");
  const total =
    header === null || !/^\d+$/u.test(header) ? null : Number(header);
  report({ _tag: "ModelDownload", loaded: 0, total });
  if (response.body === null) {
    const bytes = new Uint8Array(await response.arrayBuffer());
    report({ _tag: "ModelDownload", loaded: bytes.byteLength, total });
    return bytes;
  }
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let loaded = 0;
  for (;;) {
    checkStop(signal);
    const chunk = await reader.read();
    if (chunk.done) {
      break;
    }
    if (chunk.value !== undefined) {
      chunks.push(chunk.value);
      loaded += chunk.value.byteLength;
      report({ _tag: "ModelDownload", loaded, total });
    }
  }
  const bytes = new Uint8Array(loaded);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return bytes;
};

/**
 * Loads the model bytes from the runtime cache or from the app origin.
 *
 * A cache entry that fails the size or hash check is deleted and refetched. A
 * cache miss while offline is `ModelUnavailable` with reason `offline`.
 */
export const loadModelBytes = async (
  options: ModelLoadOptions = {}
): Promise<ModelBytes> => {
  // oxlint-disable-next-line eslint/no-empty-function -- a missing reporter is a no-op.
  const report = options.report ?? (() => {});
  const { signal } = options;
  checkStop(signal);
  const cache =
    typeof caches === "undefined" ? null : await caches.open(MODEL_CACHE_NAME);
  const key = modelCacheKeyOf(self.location.origin);
  if (cache !== null) {
    try {
      const hit = await cache.match(key);
      if (hit) {
        const bytes = new Uint8Array(await hit.arrayBuffer());
        if (await modelBytesMatch(bytes)) {
          return { bytes, cached: true };
        }
        await cache.delete(key);
      }
    } catch {
      // A cache read failure is not fatal: the fetch path still works.
    }
  }
  if (offline()) {
    throw new ModelUnavailable({
      detail: "the model is not cached and the device is offline",
      reason: "offline",
    });
  }
  checkStop(signal);
  let response: Response;
  try {
    response = await fetch(ISNET_MODEL.url, {
      cache: "no-store",
      credentials: "omit",
      signal,
    });
  } catch (error) {
    if (signal?.aborted === true) {
      throw cancelled();
    }
    throw new ModelUnavailable({
      detail: error instanceof Error ? error.message : String(error),
      reason: "fetch",
    });
  }
  if (!response.ok) {
    throw new ModelUnavailable({
      detail: `the model request answered ${response.status}`,
      reason: "fetch",
    });
  }
  const bytes = await readResponse(response, report, signal);
  if (!(await modelBytesMatch(bytes))) {
    throw new ModelUnavailable({
      detail: "the model bytes do not match the recorded SHA-256",
      reason: "fetch",
    });
  }
  if (cache !== null) {
    try {
      await cache.put(
        key,
        new Response(new Uint8Array(bytes), {
          headers: { "content-type": "application/octet-stream" },
        })
      );
    } catch {
      // Quota or a private-mode cache failure keeps the download usable.
    }
  }
  return { bytes, cached: false };
};
