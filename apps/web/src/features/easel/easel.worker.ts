/* oxlint-disable anti-slop/no-unknown-parameters, promise/prefer-await-to-then, unicorn/require-post-message-target-origin -- Dedicated Worker messages and thrown codec values use their own APIs. */
/// <reference lib="webworker" />
import {
  isLibraryAssetFailure,
  libraryWorkerReady,
  loadLibrary,
  reportLibraryLoadFailure,
} from "@/core/libs/library-load";
import { isEncodeRequest } from "@/features/easel/easel.protocol";
import type {
  EncodeReply,
  EncodeRequest,
} from "@/features/easel/easel.protocol";

libraryWorkerReady();

declare const self: DedicatedWorkerGlobalScope;

/**
 * The Easel Worker: it encodes one export with the `@jsquash` codecs
 * (ADR-0010), away from the main thread. The pixels come from a canvas, so
 * the file holds no metadata.
 *
 * A DedicatedWorker receives messages only from its creator, so there is no
 * origin check: `event.origin` is empty here. A message that is not an encode
 * request is ignored.
 */

type Encode = (
  data: ImageData,
  options?: { readonly quality?: number }
) => Promise<ArrayBuffer>;

const encode = async (request: EncodeRequest): Promise<ArrayBuffer> => {
  const data = new ImageData(
    new Uint8ClampedArray(request.rgba),
    request.width,
    request.height
  );
  const library = `jSquash ${request.format.toUpperCase()}`;
  try {
    if (request.format === "png") {
      const module = await loadLibrary(
        library,
        () => import("@jsquash/png/encode")
      );
      // SAFETY: the package's declared default export is the encoder.
      return await (module.default as Encode)(data);
    }
    const module =
      request.format === "webp"
        ? await loadLibrary(library, () => import("@jsquash/webp/encode"))
        : request.format === "avif"
          ? await loadLibrary(library, () => import("@jsquash/avif/encode"))
          : await loadLibrary(library, () => import("@jsquash/jpeg/encode"));
    // SAFETY: the package's declared default export is the encoder.
    return await (module.default as Encode)(data, { quality: request.quality });
  } catch (error) {
    if (isLibraryAssetFailure(error)) {
      reportLibraryLoadFailure(library, error);
    }
    throw error;
  }
};

const reply = (message: EncodeReply, transfer: Transferable[] = []): void => {
  self.postMessage(message, { transfer });
};

self.addEventListener("message", (event: MessageEvent<unknown>) => {
  const request = event.data;
  if (!isEncodeRequest(request)) {
    return;
  }
  void (async () => {
    try {
      const buffer = await encode(request);
      if (buffer.byteLength === 0) {
        throw new Error("the codec returned no bytes");
      }
      reply({ bytes: buffer, id: request.id, ok: true }, [buffer]);
    } catch (error) {
      reply({
        id: request.id,
        message: error instanceof Error ? error.message : String(error),
        ok: false,
      });
    }
  })();
});
