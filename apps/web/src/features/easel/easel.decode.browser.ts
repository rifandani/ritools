import { loadLibrary } from "@/core/libs/library-load";
import type { Raster } from "@/features/easel/easel.pixels";
import type { Size } from "@/features/easel/easel.presets";

/**
 * The browser decoder. `createImageBitmap` reads JPEG, PNG, WebP, GIF (first
 * frame), BMP, and, where the browser can, AVIF and HEIC. It applies the EXIF
 * orientation. An AVIF that the browser cannot read goes through
 * `@jsquash/avif`.
 */

const isAvif = async (file: Blob): Promise<boolean> => {
  const head = new Uint8Array(await file.slice(0, 32).arrayBuffer());
  const brand = String.fromCodePoint(...head.subarray(4, 12));
  return brand === "ftypavif" || brand === "ftypavis";
};

const decodeAvif = async (file: Blob): Promise<ImageBitmap> => {
  const module = await loadLibrary(
    "jSquash AVIF",
    () => import("@jsquash/avif/decode")
  );
  // SAFETY: the package's declared default export is the decoder.
  const decode = module.default as (
    input: ArrayBuffer
  ) => Promise<ImageData | null>;
  const image = await decode(await file.arrayBuffer());
  if (image === null) {
    throw new Error("the AVIF decoder returned no image");
  }
  return createImageBitmap(image);
};

/** Decodes one image file at its own size. It throws for an unreadable file. */
export const decodeImageFile = async (file: Blob): Promise<ImageBitmap> => {
  try {
    return await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch (error) {
    if (await isAvif(file)) {
      return decodeAvif(file);
    }
    throw error;
  }
};

/** The size a too-large image gets when the user accepts the downscale. */
export const fittedSizeOf = (size: Size, maxSide: number): Size => {
  const scale = Math.min(1, maxSide / Math.max(size.width, size.height));
  return {
    height: Math.max(1, Math.floor(size.height * scale)),
    width: Math.max(1, Math.floor(size.width * scale)),
  };
};

/** A smaller copy whose longest side is `maxSide`. The input is closed. */
export const downscaleBitmap = async (
  bitmap: ImageBitmap,
  maxSide: number
): Promise<ImageBitmap> => {
  const size = fittedSizeOf(bitmap, maxSide);
  try {
    return await createImageBitmap(bitmap, {
      resizeHeight: size.height,
      resizeQuality: "high",
      resizeWidth: size.width,
    });
  } finally {
    bitmap.close();
  }
};

/** The original pixels of a source, with straight alpha. */
export const pixelsOfBitmap = (bitmap: ImageBitmap): Raster => {
  const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (context === null) {
    throw new Error("the browser has no 2D canvas");
  }
  context.drawImage(bitmap, 0, 0);
  const data = context.getImageData(0, 0, bitmap.width, bitmap.height);
  return { height: data.height, rgba: data.data, width: data.width };
};
