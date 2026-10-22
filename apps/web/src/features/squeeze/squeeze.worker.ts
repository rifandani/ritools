/// <reference lib="webworker" />
import type {
  CodecReply,
  CodecRequest,
  EncodeStep,
  ImageFormat,
  InputFormat,
  OpenRequest,
  RgbaImage,
  SqueezeProblem,
} from "@/features/squeeze/squeeze";
import {
  classifyCodecFailure,
  classifyReadFailure,
  decodeLimitPixels,
  exceedsDecodeBudget,
  exifSegmentOf,
  flattenOnWhite,
  imageSizeOf,
  insertExifSegment,
  quantizeLevels,
  scaleToFitBox,
} from "@/features/squeeze/squeeze";

declare let self: DedicatedWorkerGlobalScope;

/**
 * oxipng effort, 0-6. Higher is smaller and slower, and the search multiplies
 * every encode, so the effort stays fixed and modest.
 */
const OXIPNG_LEVEL = 3;

/** The MIME type each input format decodes from. */
const INPUT_MIME: Record<InputFormat, string> = {
  avif: "image/avif",
  bmp: "image/bmp",
  gif: "image/gif",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
};

/* -------------------------------------------------------------------------- */
/* Codecs, loaded on first use                                                 */
/* -------------------------------------------------------------------------- */

/*
 * Every codec is a dynamic import. That is what makes "each codec loads on
 * first use" true of the network too: the chunk and its WASM are fetched when
 * a row first needs that format, never at page load and never in the precache
 * (ADR-0010). The module promise is kept, so the second image of the same
 * format costs nothing.
 */

type JpegEncode = (
  data: ImageData,
  options?: { readonly quality?: number }
) => Promise<ArrayBuffer>;
type WebpEncode = JpegEncode;
type AvifEncode = (
  data: ImageData,
  options?: { readonly quality?: number }
) => Promise<ArrayBuffer>;
type PngEncode = (data: ImageData) => Promise<ArrayBuffer>;
type OptimisePng = (
  data: ArrayBuffer | ImageData,
  options?: { readonly level?: number }
) => Promise<ArrayBuffer>;

let jpegModule: JpegEncode | null = null;
let webpModule: WebpEncode | null = null;
let avifModule: AvifEncode | null = null;
let pngModule: PngEncode | null = null;
let oxipngModule: OptimisePng | null = null;

const jpeg = async (): Promise<JpegEncode> => {
  if (jpegModule === null) {
    const module = await import("@jsquash/jpeg/encode");
    // SAFETY: the package's declared default export is the encoder.
    jpegModule = module.default as JpegEncode;
  }
  return jpegModule;
};

const webp = async (): Promise<WebpEncode> => {
  if (webpModule === null) {
    const module = await import("@jsquash/webp/encode");
    // SAFETY: the package's declared default export is the encoder.
    webpModule = module.default as WebpEncode;
  }
  return webpModule;
};

const avif = async (): Promise<AvifEncode> => {
  if (avifModule === null) {
    const module = await import("@jsquash/avif/encode");
    // SAFETY: the package's declared default export is the encoder.
    avifModule = module.default as AvifEncode;
  }
  return avifModule;
};

const png = async (): Promise<PngEncode> => {
  if (pngModule === null) {
    const module = await import("@jsquash/png/encode");
    // SAFETY: the package's declared default export is the encoder.
    pngModule = module.default as PngEncode;
  }
  return pngModule;
};

const oxipng = async (): Promise<OptimisePng> => {
  if (oxipngModule === null) {
    const module = await import("@jsquash/oxipng");
    // SAFETY: `optimise` is the package's exported entry point.
    oxipngModule = module.optimise as OptimisePng;
  }
  return oxipngModule;
};

/* -------------------------------------------------------------------------- */
/* The open image                                                              */
/* -------------------------------------------------------------------------- */

/**
 * The image the last `open` read. Kept here so each rung of the ladder costs an
 * encode and not a decode. `sourceBytes` is the file as it arrived, which is
 * what a lossless PNG rung optimises and what EXIF is copied from.
 */
interface Opened {
  readonly hasAlpha: boolean;
  readonly image: ImageData;
  readonly preserveExif: boolean;
  readonly resized: boolean;
  readonly sourceBytes: ArrayBuffer;
  readonly sourceFormat: InputFormat;
  readonly sourceHeight: number;
  readonly sourceWidth: number;
}

let opened: Opened | null = null;
/** One flatten per open, however many JPEG rungs the search measures. */
let flattened: ImageData | null = null;

const post = (
  message: CodecReply,
  transfer: readonly Transferable[] = []
): void => {
  self.postMessage(message, { transfer: [...transfer] });
};

/** Reports a failure. `detail` is text a person can read; the pool logs it. */
const fail = (problem: SqueezeProblem, detail: string): void => {
  post({ detail, kind: "failed", problem });
};

/** The pixels of a bitmap, drawn at `width` by `height`. */
const pixelsOf = (
  source: CanvasImageSource,
  width: number,
  height: number
): ImageData => {
  const canvas = new OffscreenCanvas(width, height);
  const context = canvas.getContext("2d");
  if (context === null) {
    throw new Error("Squeeze needs a 2D canvas context");
  }
  context.drawImage(source, 0, 0, width, height);
  return context.getImageData(0, 0, width, height);
};

const hasAlpha = (image: ImageData): boolean => {
  const { data } = image;
  for (let index = 3; index < data.length; index += 4) {
    if ((data[index] ?? 255) < 255) {
      return true;
    }
  }
  return false;
};

const read = async (request: OpenRequest): Promise<Opened> => {
  const declared = imageSizeOf(request.bytes, request.format);
  // SAFETY: a Worker has a `navigator`; `deviceMemory` is Chromium's optional
  // memory hint and is absent elsewhere, which the budget treats as 4 GiB.
  const memory = (navigator as Navigator & { readonly deviceMemory?: number })
    .deviceMemory;
  if (
    declared !== null &&
    exceedsDecodeBudget(declared, decodeLimitPixels(memory))
  ) {
    throw new RangeError(
      `image is ${declared.width}x${declared.height}, over the device budget`
    );
  }
  const bitmap = await createImageBitmap(
    new Blob([request.bytes], { type: INPUT_MIME[request.format] }),
    // Preserving EXIF means the orientation tag travels, so the pixels must
    // stay unrotated and the viewer applies the tag once. Without EXIF the
    // rotation is baked into the pixels and the output carries no tag.
    { imageOrientation: request.preserveExif ? "none" : "from-image" }
  );
  const sourceWidth = bitmap.width;
  const sourceHeight = bitmap.height;
  const size = scaleToFitBox(
    { height: sourceHeight, width: sourceWidth },
    request.maxWidth,
    request.maxHeight
  );
  const image = pixelsOf(bitmap, size.width, size.height);
  bitmap.close();
  const resized = size.width !== sourceWidth || size.height !== sourceHeight;
  return {
    hasAlpha: hasAlpha(image),
    image,
    preserveExif: request.preserveExif,
    resized,
    sourceBytes: request.bytes,
    sourceFormat: request.format,
    sourceHeight,
    sourceWidth,
  };
};

const current = (): Opened => {
  if (opened === null) {
    throw new Error("Squeeze encoded before it opened an image");
  }
  return opened;
};

const asImageData = (image: RgbaImage): ImageData =>
  new ImageData(new Uint8ClampedArray(image.data), image.width, image.height);

/** The opened pixels, flattened on white once, for a JPEG output. */
const jpegPixels = (state: Opened): ImageData => {
  if (!state.hasAlpha) {
    return state.image;
  }
  if (flattened === null) {
    flattened = asImageData(
      flattenOnWhite({
        data: state.image.data,
        height: state.image.height,
        width: state.image.width,
      })
    );
  }
  return flattened;
};

/** One PNG rung: exact when it can be, quantised when the Target needs it. */
const encodePng = async (
  state: Opened,
  step: EncodeStep
): Promise<ArrayBuffer> => {
  const optimise = await oxipng();
  if (step.levels === null) {
    // A PNG that was not resized is already exact, so the lossless rung only
    // recompresses its deflate stream. Anything else re-encodes the pixels.
    return optimise(
      state.resized || state.sourceFormat !== "png"
        ? await (
            await png()
          )(state.image)
        : state.sourceBytes,
      { level: OXIPNG_LEVEL }
    );
  }
  const quantised = quantizeLevels(
    {
      data: state.image.data,
      height: state.image.height,
      width: state.image.width,
    },
    step.levels
  );
  const encoded = await (await png())(asImageData(quantised));
  return optimise(encoded, { level: OXIPNG_LEVEL });
};

const encode = async (
  format: ImageFormat,
  step: EncodeStep
): Promise<ArrayBuffer> => {
  const state = current();
  if (format === "jpeg") {
    const bytes = await (
      await jpeg()
    )(jpegPixels(state), {
      quality: step.quality,
    });
    if (!state.preserveExif || state.sourceFormat !== "jpeg") {
      return bytes;
    }
    const segment = exifSegmentOf(state.sourceBytes);
    return segment === null ? bytes : insertExifSegment(bytes, segment);
  }
  if (format === "webp") {
    return (await webp())(state.image, { quality: step.quality });
  }
  if (format === "avif") {
    return (await avif())(state.image, { quality: step.quality });
  }
  return encodePng(state, step);
};

const handle = async (request: CodecRequest): Promise<void> => {
  if (request.kind === "release") {
    opened = null;
    flattened = null;
    return;
  }
  if (request.kind === "open") {
    try {
      opened = await read(request);
      flattened = null;
      post({
        image: {
          animated: request.format === "gif",
          hasAlpha: opened.hasAlpha,
          height: opened.image.height,
          sourceHeight: opened.sourceHeight,
          sourceWidth: opened.sourceWidth,
          width: opened.image.width,
        },
        kind: "opened",
      });
    } catch (error) {
      fail(
        classifyReadFailure(error),
        error instanceof Error ? error.message : "the image could not be read"
      );
    }
    return;
  }
  try {
    const bytes = await encode(request.format, request.step);
    post({ bytes, kind: "encoded" }, [bytes]);
  } catch (error) {
    // A dynamic import that cannot reach the network while offline is a
    // missing codec, not a broken one.
    fail(
      classifyCodecFailure(!navigator.onLine),
      error instanceof Error ? error.message : "the codec failed"
    );
  }
};

self.addEventListener("message", (event: MessageEvent<CodecRequest>) => {
  const trustedOrigin = self.location.origin;
  if (event.origin !== trustedOrigin) {
    return;
  }
  void handle(event.data);
});
