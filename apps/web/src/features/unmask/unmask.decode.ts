import {
  isLibraryAssetFailure,
  reportLibraryLoadFailure,
  loadLibrary,
} from "@/core/libs/library-load";
import { INPUT_MIME } from "@/features/unmask/unmask.image";
import type { DecodedImage } from "@/features/unmask/unmask.remove";
import { decodeFailure } from "@/features/unmask/unmask.remove";
/* oxlint-disable promise/prefer-await-to-then -- the browser decoders are promise-based. */
import type {
  ImageFormat,
  RasterImage,
  SourceFile,
} from "@/features/unmask/unmask.schema";
import { Cancelled, UnreadableFile } from "@/features/unmask/unmask.schema";

/**
 * The browser decoder. GIF and BMP contribute their first frame; animated WebP
 * and AVIF sequences use whatever frame the decoder returns. AVIF goes through
 * the existing `@jsquash/avif/decode` path. The others use `createImageBitmap`,
 * which applies the EXIF orientation when it is present.
 */

interface FrameTrack {
  readonly frameCount?: number;
}
interface FrameDecoder {
  readonly tracks: {
    readonly ready: Promise<void>;
    readonly selectedTrack: FrameTrack | null;
  };
  close: () => void;
}
type FrameDecoderConstructor = new (init: {
  readonly data: ArrayBuffer;
  readonly type: string;
}) => FrameDecoder;

const frameCountOf = async (
  bytes: Uint8Array,
  format: ImageFormat
): Promise<number> => {
  // SAFETY: the property has the standard ImageDecoder constructor shape when present.
  const Constructor = (globalThis as { ImageDecoder?: FrameDecoderConstructor })
    .ImageDecoder;
  if (Constructor === undefined) {
    return 1;
  }
  const copy = new Uint8Array(bytes.length);
  copy.set(bytes);
  try {
    const decoder = new Constructor({
      data: copy.buffer,
      type: INPUT_MIME[format],
    });
    await decoder.tracks.ready;
    const count = decoder.tracks.selectedTrack?.frameCount ?? 1;
    decoder.close();
    return Number.isSafeInteger(count) && count > 0 ? count : 1;
  } catch {
    return 1;
  }
};

const pixelsOf = (
  source: CanvasImageSource,
  width: number,
  height: number
): RasterImage => {
  const canvas = new OffscreenCanvas(width, height);
  const context = canvas.getContext("2d");
  if (context === null) {
    throw new UnreadableFile({
      detail: "the Worker has no 2D canvas",
      reason: "decode",
    });
  }
  context.drawImage(source, 0, 0, width, height);
  const data = context.getImageData(0, 0, width, height);
  return {
    height,
    rgba: new Uint8Array(
      data.data.buffer,
      data.data.byteOffset,
      data.data.byteLength
    ),
    width,
  };
};

const decodeAvif = async (bytes: Uint8Array): Promise<RasterImage> => {
  const module = await loadLibrary(
    "jSquash AVIF",
    () => import("@jsquash/avif/decode")
  );
  // SAFETY: the package's declared default export is the decoder.
  const decode = module.default as (
    input: ArrayBuffer,
    options?: { readonly bitDepth?: number }
  ) => Promise<ImageData>;
  const copy = new Uint8Array(bytes.length);
  copy.set(bytes);
  const image = await decode(copy.buffer);
  return {
    height: image.height,
    rgba: new Uint8Array(
      image.data.buffer,
      image.data.byteOffset,
      image.data.byteLength
    ),
    width: image.width,
  };
};

const stopped = (signal?: AbortSignal): boolean => signal?.aborted === true;

/** Decodes one source file at its source size. */
export const decodeImage = async (
  file: SourceFile,
  format: ImageFormat,
  signal?: AbortSignal
): Promise<DecodedImage> => {
  if (stopped(signal)) {
    throw new Cancelled({ detail: "the decode was cancelled" });
  }
  try {
    const [raster, frameCount] = await Promise.all([
      format === "avif"
        ? decodeAvif(file.bytes)
        : (async () => {
            const copy = new Uint8Array(file.bytes.length);
            copy.set(file.bytes);
            const bitmap = await createImageBitmap(
              new Blob([copy.buffer], { type: INPUT_MIME[format] }),
              { imageOrientation: "from-image" }
            );
            const pixels = pixelsOf(bitmap, bitmap.width, bitmap.height);
            bitmap.close();
            return pixels;
          })(),
      frameCountOf(file.bytes, format),
    ]);
    if (stopped(signal)) {
      throw new Cancelled({ detail: "the decode was cancelled" });
    }
    return { frameCount, raster };
  } catch (error) {
    if (error instanceof Cancelled || error instanceof UnreadableFile) {
      throw error;
    }
    if (isLibraryAssetFailure(error)) {
      reportLibraryLoadFailure("jSquash AVIF", error);
    }
    throw decodeFailure(error);
  }
};
