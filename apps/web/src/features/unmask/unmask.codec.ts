/* oxlint-disable anti-slop/no-unknown-parameters -- a thrown codec value is classified here for the seam. */
import {
  isLibraryAssetFailure,
  reportLibraryLoadFailure,
  loadLibrary,
} from "@/core/libs/library-load";
import {
  encodedFileOf,
  hasAnyAlpha,
  qualityFor,
  tooLargeToEncode,
} from "@/features/unmask/unmask.encode";
/* oxlint-disable promise/prefer-await-to-then -- the codec modules are promise-based. */
import type {
  EncodeRequest,
  EncodedFile,
  UnmaskError,
} from "@/features/unmask/unmask.schema";
import {
  Cancelled,
  EncodeFailed,
  TooLarge,
} from "@/features/unmask/unmask.schema";

/**
 * The codecs. They run inside the Worker, load on first use, and write the
 * bytes the seam returns. PNG is lossless; WebP, AVIF, and JPEG take the
 * quality. JPEG never flattens a transparent Cutout.
 */

type JpegEncode = (
  data: ImageData,
  options?: { readonly quality?: number }
) => Promise<ArrayBuffer>;
type PngEncode = (data: ImageData) => Promise<ArrayBuffer>;
type OptimisePng = (
  data: ArrayBuffer | ImageData,
  options?: { readonly level?: number }
) => Promise<ArrayBuffer>;

/** oxipng effort, 0-6. A fixed modest level keeps the encode predictable. */
const OXIPNG_LEVEL = 3;

const memoryFailure = /alloc|out of memory|too (?:large|big)|memory/iu;

const codecFailure = (error: unknown): UnmaskError => {
  if (error instanceof Cancelled) {
    return error;
  }
  const detail = error instanceof Error ? error.message : String(error);
  return new EncodeFailed({
    detail,
    reason: memoryFailure.test(detail) ? "memory" : "codec",
  });
};

const stopped = (signal?: AbortSignal): boolean => signal?.aborted === true;

const aborted = (): Cancelled =>
  new Cancelled({ detail: "the encode was cancelled" });

/** Encodes one composited raster. It never writes the input file. */
export const encodeImage = async (
  request: EncodeRequest,
  signal?: AbortSignal
): Promise<EncodedFile> => {
  if (stopped(signal)) {
    throw aborted();
  }
  if (tooLargeToEncode(request.image)) {
    throw new TooLarge({
      detail: "the output is over the encode limit",
      height: request.image.height,
      neededBytes: request.image.width * request.image.height * 4,
      pixels: request.image.width * request.image.height,
      width: request.image.width,
    });
  }
  if (
    request.format === "jpeg" &&
    (request.backdrop?._tag === "Transparent" || hasAnyAlpha(request.image))
  ) {
    throw new EncodeFailed({
      detail: "JPEG cannot hold the Transparent Backdrop",
      reason: "jpeg-needs-backdrop",
    });
  }
  const quality = qualityFor(request.format, request.quality);
  const data = new ImageData(
    new Uint8ClampedArray(request.image.rgba),
    request.image.width,
    request.image.height
  );
  try {
    let buffer: ArrayBuffer;
    if (request.format === "png") {
      const module = await loadLibrary(
        "jSquash PNG",
        () => import("@jsquash/png/encode")
      );
      // SAFETY: the package's declared default export is the encoder.
      const encode = module.default as PngEncode;
      const encoded = await encode(data);
      try {
        const oxipng = await loadLibrary(
          "jSquash OXIPNG",
          () => import("@jsquash/oxipng")
        );
        // SAFETY: `optimise` is the package's exported entry point.
        const optimise = oxipng.optimise as OptimisePng;
        buffer = await optimise(encoded, { level: OXIPNG_LEVEL });
      } catch (error) {
        if (isLibraryAssetFailure(error)) {
          reportLibraryLoadFailure("jSquash OXIPNG", error);
        }
        // The PNG is already valid. A failed optimiser must not lose it.
        buffer = encoded;
      }
    } else if (request.format === "webp") {
      const module = await loadLibrary(
        "jSquash WEBP",
        () => import("@jsquash/webp/encode")
      );
      // SAFETY: the package's declared default export is the encoder.
      const encode = module.default as JpegEncode;
      buffer = await encode(data, { quality: quality ?? undefined });
    } else if (request.format === "avif") {
      const module = await loadLibrary(
        "jSquash AVIF",
        () => import("@jsquash/avif/encode")
      );
      // SAFETY: the package's declared default export is the encoder.
      const encode = module.default as JpegEncode;
      buffer = await encode(data, { quality: quality ?? undefined });
    } else {
      const module = await loadLibrary(
        "jSquash JPEG",
        () => import("@jsquash/jpeg/encode")
      );
      // SAFETY: the package's declared default export is the encoder.
      const encode = module.default as JpegEncode;
      buffer = await encode(data, { quality: quality ?? undefined });
    }
    if (stopped(signal)) {
      throw aborted();
    }
    return encodedFileOf({
      bytes: new Uint8Array(buffer),
      format: request.format,
      image: request.image,
      nameStem: request.nameStem,
      quality,
    });
  } catch (error) {
    if (isLibraryAssetFailure(error)) {
      reportLibraryLoadFailure(
        `jSquash ${request.format.toUpperCase()}`,
        error
      );
    }
    throw codecFailure(error);
  }
};
