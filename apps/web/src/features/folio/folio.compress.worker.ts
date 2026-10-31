/* oxlint-disable eslint/no-await-in-loop, max-classes-per-file, react-doctor/async-await-in-loop -- Images are encoded one at a time so memory stays bounded and progress stays exact; the Worker names four failure kinds. */
/// <reference lib="webworker" />
import { createPdfRuntime, NULL_PTR } from "@embedpdf/engine-runtime";
import type { Callback, PdfRuntimeModule, Ptr } from "@embedpdf/engine-runtime";
import wasmUrl from "@embedpdf/engine-runtime-wasm32/wasm-url";

import {
  FOLIO_COMPRESS_PRESETS,
  planForImage,
} from "@/features/folio/folio.compress";
import type {
  FolioCompressPreset,
  FolioImageFacts,
} from "@/features/folio/folio.compress";
import type {
  FolioCompressFailure,
  FolioCompressReply,
  FolioCompressRequest,
  FolioCompressSkipReason,
  FolioCompressStats,
} from "@/features/folio/folio.compress.types";
import { isFolioCompressRequest } from "@/features/folio/folio.compress.types";

declare let self: DedicatedWorkerGlobalScope;

/** The PDF save flag that rewrites the file instead of appending to it. */
const PDF_NO_INCREMENTAL = 2;

/** PDFium's error code for a document that needs a password. */
const PDF_PASSWORD_ERROR = 4;

/** PDFium's page-object type for an image. */
const FPDF_PAGEOBJ_IMAGE = 3;

/** The one bitmap format `GetRenderedBitmap` returns. */
const FPDF_BITMAP_BGRA = 4;

/** The filter a JPEG image carries. Other images stay as they are. */
const JPEG_FILTER = "DCTDecode";

let runtime: PdfRuntimeModule | null = null;
let loading: Promise<PdfRuntimeModule> | null = null;

const loadRuntime = async (): Promise<PdfRuntimeModule> => {
  if (runtime) {
    return runtime;
  }
  loading ??= (async () => {
    const module = await createPdfRuntime({ prefer: "wasm", wasmUrl });
    // PDFium requires exactly one library init before any other call.
    module.fn.FPDF_InitLibrary();
    return module;
  })();
  try {
    runtime = await loading;
    return runtime;
  } catch (error) {
    loading = null;
    throw error;
  }
};

const post = (
  message: FolioCompressReply,
  transfer: readonly Transferable[] = []
): void => {
  self.postMessage(message, { transfer: [...transfer] });
};

/** A finish that writes no copy, with the reason the UI names. */
class SkipError extends Error {
  readonly reason: FolioCompressSkipReason;

  constructor(reason: FolioCompressSkipReason) {
    super(reason);
    this.name = "SkipError";
    this.reason = reason;
  }
}

/** A failure that leaves the document in an unknown state, so the run stops. */
class FatalError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "FatalError";
  }
}

/** The saved copy could not be verified. */
class VerifyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "VerifyError";
  }
}

/** The saved copy could not be written. */
class WriteError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "WriteError";
  }
}

// oxlint-disable-next-line anti-slop/no-unknown-parameters -- A thrown value is untrusted until this boundary names it.
const failureOf = (error: unknown): FolioCompressFailure => {
  if (error instanceof VerifyError) {
    return "verify";
  }
  if (error instanceof WriteError) {
    return "write";
  }
  return "engine";
};

interface OpenedDocument {
  readonly data: Ptr;
  readonly document: Ptr;
  readonly pageCount: number;
}

const openDocument = (
  module: PdfRuntimeModule,
  bytes: Uint8Array
): OpenedDocument => {
  const { fn, mem } = module;
  const data = mem.alloc(bytes.byteLength);
  mem.writeBytes(data, bytes);
  const document = fn.FPDF_LoadMemDocument64(data, bytes.byteLength, "");
  if (!document) {
    const code = fn.FPDF_GetLastError();
    mem.free(data);
    if (code === PDF_PASSWORD_ERROR) {
      throw new SkipError("encrypted");
    }
    throw new Error(`the PDF could not be opened (${code})`);
  }
  return { data, document, pageCount: fn.FPDF_GetPageCount(document) };
};

const closeDocument = (module: PdfRuntimeModule, opened: OpenedDocument) => {
  module.fn.FPDF_CloseDocument(opened.document);
  module.mem.free(opened.data);
};

/* oxlint-disable anti-slop/no-runtime-typeof, anti-slop/no-unknown-parameters, anti-slop/require-safety-comment-for-type-assertion -- PDFium delivers callback arguments as untyped numbers or bigints; this is the boundary that brands an address. */
/** Read a callback address as a runtime pointer. */
const asPtr = (value: unknown): Ptr => {
  if (typeof value === "number" || typeof value === "bigint") {
    return BigInt(value) as Ptr;
  }
  throw new Error("the PDF callback did not receive an address");
};
/* oxlint-enable anti-slop/no-runtime-typeof, anti-slop/no-unknown-parameters, anti-slop/require-safety-comment-for-type-assertion */

const saveDocument = (module: PdfRuntimeModule, document: Ptr): Uint8Array => {
  const { cb, fn, mem } = module;
  const chunks: Uint8Array[] = [];
  const struct = mem.alloc(8);
  let callback: Callback | null = null;
  try {
    callback = cb.register("iiii", (_self, data, size) => {
      chunks.push(mem.readBytes(asPtr(data), Number(size)));
      return 1;
    });
    mem.poke(struct, "i32", 1, 0);
    mem.poke(struct, "i32", Number(callback), 4);
    if (!fn.FPDF_SaveAsCopy(document, struct, PDF_NO_INCREMENTAL)) {
      throw new WriteError("the PDF could not be written");
    }
  } finally {
    if (callback) {
      cb.dispose(callback);
    }
    mem.free(struct);
  }

  const total = chunks.reduce((sum, chunk) => sum + chunk.byteLength, 0);
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return bytes;
};

/** The image facts PDFium reports for the object on this page. */
const metadataOf = (
  module: PdfRuntimeModule,
  object: Ptr,
  page: Ptr
): FolioImageFacts | null => {
  const { fn, mem } = module;
  const buffer = mem.alloc(28);
  try {
    mem.writeBytes(buffer, new Uint8Array(28));
    if (!fn.FPDFImageObj_GetImageMetadata(object, page, buffer)) {
      return null;
    }
    return {
      bitsPerPixel: Number(mem.peek(buffer, "i32", 16)),
      colorspace: Number(mem.peek(buffer, "i32", 20)),
      height: Number(mem.peek(buffer, "i32", 4)),
      horizontalDpi: Number(mem.peek(buffer, "f32", 8)),
      verticalDpi: Number(mem.peek(buffer, "f32", 12)),
      width: Number(mem.peek(buffer, "i32", 0)),
    };
  } finally {
    mem.free(buffer);
  }
};

/** The last filter of an image stream, which names the encoded form. */
const lastFilterOf = (module: PdfRuntimeModule, object: Ptr): string => {
  const { fn, mem } = module;
  const count = fn.FPDFImageObj_GetImageFilterCount(object);
  if (count < 1) {
    return "";
  }
  const index = count - 1;
  const length = fn.FPDFImageObj_GetImageFilter(object, index, NULL_PTR, 0);
  if (length <= 0) {
    return "";
  }
  const buffer = mem.alloc(length);
  try {
    if (fn.FPDFImageObj_GetImageFilter(object, index, buffer, length) <= 0) {
      return "";
    }
    const bytes = mem.readBytes(buffer, length);
    const end = bytes.indexOf(0);
    return new TextDecoder().decode(
      bytes.subarray(0, end === -1 ? bytes.length : end)
    );
  } finally {
    mem.free(buffer);
  }
};

/** The compressed size of the image stream as it arrived. */
const rawSizeOf = (module: PdfRuntimeModule, object: Ptr): number =>
  module.fn.FPDFImageObj_GetImageDataRaw(object, NULL_PTR, 0);

/** One image object and the size it is re-encoded at. */
interface FoundImage {
  readonly height: number;
  readonly objectIndex: number;
  readonly pageIndex: number;
  readonly rawSize: number;
  readonly width: number;
}

/**
 * Every JPEG image in the document, in page order. Each placement gets its
 * own target, so a scan with one image per page is never skipped because two
 * pages happen to hold the same image size.
 */
const findImages = (
  module: PdfRuntimeModule,
  document: Ptr,
  preset: FolioCompressPreset
): readonly FoundImage[] => {
  const { fn } = module;
  const found: FoundImage[] = [];
  const pageCount = fn.FPDF_GetPageCount(document);
  for (let pageIndex = 0; pageIndex < pageCount; pageIndex += 1) {
    const page = fn.FPDF_LoadPage(document, pageIndex);
    if (!page) {
      continue;
    }
    try {
      const count = fn.FPDFPage_CountObjects(page);
      for (let objectIndex = 0; objectIndex < count; objectIndex += 1) {
        const object = fn.FPDFPage_GetObject(page, objectIndex);
        if (!object || fn.FPDFPageObj_GetType(object) !== FPDF_PAGEOBJ_IMAGE) {
          continue;
        }
        if (lastFilterOf(module, object) !== JPEG_FILTER) {
          continue;
        }
        const facts = metadataOf(module, object, page);
        if (!facts) {
          continue;
        }
        const rawSize = rawSizeOf(module, object);
        const plan = planForImage(facts, preset);
        if (rawSize <= 0 || !plan) {
          continue;
        }
        found.push({
          height: plan.height,
          objectIndex,
          pageIndex,
          rawSize,
          width: plan.width,
        });
      }
    } finally {
      fn.FPDF_ClosePage(page);
    }
  }
  return found;
};

interface RgbaPixels {
  readonly data: Uint8ClampedArray<ArrayBuffer>;
  readonly height: number;
  readonly width: number;
}

/** The rendered pixels, or null when any pixel is transparent. */
const pixelsOf = (module: PdfRuntimeModule, bitmap: Ptr): RgbaPixels | null => {
  const { fn, mem } = module;
  if (fn.FPDFBitmap_GetFormat(bitmap) !== FPDF_BITMAP_BGRA) {
    return null;
  }
  const width = fn.FPDFBitmap_GetWidth(bitmap);
  const height = fn.FPDFBitmap_GetHeight(bitmap);
  const stride = fn.FPDFBitmap_GetStride(bitmap);
  const buffer = fn.FPDFBitmap_GetBuffer(bitmap);
  if (width <= 0 || height <= 0 || stride < width * 4 || !buffer) {
    return null;
  }
  const source = mem.readBytes(buffer, stride * height);
  for (let y = 0; y < height; y += 1) {
    const row = y * stride;
    for (let x = 0; x < width; x += 1) {
      if ((source[row + x * 4 + 3] ?? 255) !== 255) {
        return null;
      }
    }
  }
  const data = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y += 1) {
    const row = y * stride;
    for (let x = 0; x < width; x += 1) {
      const at = row + x * 4;
      const target = (y * width + x) * 4;
      data[target] = source[at + 2] ?? 0;
      data[target + 1] = source[at + 1] ?? 0;
      data[target + 2] = source[at] ?? 0;
      data[target + 3] = 255;
    }
  }
  return { data, height, width };
};

/**
 * The image at the target size. The object is drawn with a temporary matrix
 * so PDFium resamples it to the target and applies any image mask. The real
 * matrix goes back before the function returns, so the page keeps its layout.
 */
const renderPixels = (
  module: PdfRuntimeModule,
  document: Ptr,
  page: Ptr,
  object: Ptr,
  width: number,
  height: number
): RgbaPixels | null => {
  const { fn, mem } = module;
  const matrix = mem.alloc(24);
  try {
    if (!fn.FPDFPageObj_GetMatrix(object, matrix)) {
      return null;
    }
    const at = (offset: number) => Number(mem.peek(matrix, "f32", offset));
    const original = [at(0), at(4), at(8), at(12), at(16), at(20)] as const;
    if (!fn.FPDFImageObj_SetMatrix(object, width, 0, 0, height, 0, 0)) {
      return null;
    }
    let bitmap = NULL_PTR;
    let failure: Error | null = null;
    let restoreFailed = false;
    try {
      bitmap = fn.FPDFImageObj_GetRenderedBitmap(document, page, object);
    } catch (error) {
      failure =
        error instanceof Error ? error : new Error("the image did not render");
    } finally {
      restoreFailed = !fn.FPDFImageObj_SetMatrix(
        object,
        original[0],
        original[1],
        original[2],
        original[3],
        original[4],
        original[5]
      );
      if (restoreFailed && bitmap) {
        fn.FPDFBitmap_Destroy(bitmap);
        bitmap = NULL_PTR;
      }
    }
    if (restoreFailed) {
      throw new FatalError("the image matrix was not restored");
    }
    if (failure) {
      throw failure;
    }
    if (!bitmap) {
      return null;
    }
    try {
      return pixelsOf(module, bitmap);
    } finally {
      fn.FPDFBitmap_Destroy(bitmap);
    }
  } finally {
    mem.free(matrix);
  }
};

type JpegEncoder = (
  data: ImageData,
  options?: { readonly quality?: number }
) => Promise<ArrayBuffer>;

let jpeg: JpegEncoder | null = null;

const encodeJpeg = async (
  pixels: RgbaPixels,
  quality: number
): Promise<ArrayBuffer> => {
  try {
    if (jpeg === null) {
      const module = await import("@jsquash/jpeg/encode");
      // SAFETY: the package's declared default export is the encoder.
      jpeg = module.default as JpegEncoder;
    }
    return await jpeg(new ImageData(pixels.data, pixels.width, pixels.height), {
      quality,
    });
  } catch (error) {
    throw new FatalError(
      error instanceof Error ? error.message : "the JPEG codec could not load"
    );
  }
};

/** Replace the image stream with the smaller JPEG. PDFium copies the bytes. */
const setJpeg = (
  module: PdfRuntimeModule,
  object: Ptr,
  bytes: ArrayBuffer
): boolean => {
  const { fn, mem } = module;
  const data = new Uint8Array(bytes);
  const pointer = mem.alloc(data.byteLength);
  try {
    mem.writeBytes(pointer, data);
    return fn.EPDFImageObj_SetJpeg(
      NULL_PTR,
      0,
      object,
      pointer,
      data.byteLength
    );
  } finally {
    mem.free(pointer);
  }
};

/** Re-encode one image on an open page, and keep it when that is not smaller. */
const compressImage = async (
  module: PdfRuntimeModule,
  document: Ptr,
  page: Ptr,
  found: FoundImage,
  quality: number
): Promise<boolean> => {
  const { fn } = module;
  const object = fn.FPDFPage_GetObject(page, found.objectIndex);
  if (!object || fn.FPDFPageObj_GetType(object) !== FPDF_PAGEOBJ_IMAGE) {
    return false;
  }
  const pixels = renderPixels(
    module,
    document,
    page,
    object,
    found.width,
    found.height
  );
  if (!pixels) {
    return false;
  }
  const encoded = await encodeJpeg(pixels, quality);
  if (encoded.byteLength >= found.rawSize) {
    return false;
  }
  return setJpeg(module, object, encoded);
};

/** The images of one page, in object order. */
const groupByPage = (
  images: readonly FoundImage[]
): ReadonlyMap<number, readonly FoundImage[]> => {
  const pages = new Map<number, FoundImage[]>();
  for (const image of images) {
    const list = pages.get(image.pageIndex);
    if (list) {
      list.push(image);
    } else {
      pages.set(image.pageIndex, [image]);
    }
  }
  return pages;
};

/**
 * Re-encode every image on one page, then rebuild its content stream. PDFium
 * keeps the new JPEG on the object, and the rebuild writes the new reference
 * into the page. Without the rebuild, the saved file keeps the old stream.
 */
const compressPage = async (
  module: PdfRuntimeModule,
  document: Ptr,
  pageIndex: number,
  images: readonly FoundImage[],
  quality: number,
  onImage: () => void
): Promise<{ readonly changed: number; readonly kept: number }> => {
  const { fn } = module;
  const page = fn.FPDF_LoadPage(document, pageIndex);
  if (!page) {
    for (const _image of images) {
      onImage();
    }
    return { changed: 0, kept: images.length };
  }
  let changed = 0;
  try {
    for (const image of images) {
      let replaced = false;
      try {
        replaced = await compressImage(module, document, page, image, quality);
      } catch (error) {
        if (error instanceof FatalError) {
          throw error;
        }
      }
      if (replaced) {
        changed += 1;
      }
      onImage();
    }
    if (changed > 0 && !fn.FPDFPage_GenerateContent(page)) {
      throw new FatalError("the page content was not rebuilt");
    }
  } finally {
    fn.FPDF_ClosePage(page);
  }
  return { changed, kept: images.length - changed };
};

const statsOf = (options: {
  readonly images: number;
  readonly inputBytes: number;
  readonly kept: number;
  readonly outputBytes: number;
  readonly pages: number;
}): FolioCompressStats => ({
  images: options.images,
  inputBytes: options.inputBytes,
  kept: options.kept,
  outputBytes: options.outputBytes,
  pages: options.pages,
});

/** A signed file stays read only: a rewrite breaks its signature. */
const isSigned = (module: PdfRuntimeModule, document: Ptr): boolean => {
  const { fn } = module;
  const model = fn.EPDFSig_LoadModel(document);
  if (!model) {
    return false;
  }
  try {
    const count = fn.EPDFSig_Count(model);
    for (let index = 0; index < count; index += 1) {
      if (fn.EPDFSig_IsSigned(model, index)) {
        return true;
      }
    }
    return false;
  } finally {
    fn.EPDFSig_CloseModel(model);
  }
};

/** Reopen the saved copy and prove that it still holds every page. */
const verify = (
  module: PdfRuntimeModule,
  bytes: Uint8Array,
  pageCount: number
) => {
  let opened: OpenedDocument;
  try {
    opened = openDocument(module, bytes);
  } catch (error) {
    throw new VerifyError(
      error instanceof Error ? error.message : "the saved copy did not open"
    );
  }
  try {
    if (module.fn.FPDF_GetPageCount(opened.document) !== pageCount) {
      throw new VerifyError("the saved copy lost a page");
    }
  } finally {
    closeDocument(module, opened);
  }
};

const handle = async (request: FolioCompressRequest): Promise<void> => {
  const module = await loadRuntime();
  const { fn } = module;
  const bytes = new Uint8Array(request.bytes);
  let opened: OpenedDocument;
  try {
    opened = openDocument(module, bytes);
  } catch (error) {
    if (error instanceof SkipError) {
      post({
        id: request.id,
        reason: error.reason,
        stats: statsOf({
          images: 0,
          inputBytes: bytes.byteLength,
          kept: 0,
          outputBytes: 0,
          pages: 0,
        }),
        type: "skipped",
      });
      return;
    }
    post({
      id: request.id,
      message:
        error instanceof Error ? error.message : "the PDF could not be opened",
      reason: "unreadable",
      type: "failed",
    });
    return;
  }
  try {
    const baseStats = statsOf({
      images: 0,
      inputBytes: bytes.byteLength,
      kept: 0,
      outputBytes: 0,
      pages: opened.pageCount,
    });
    if (fn.EPDF_IsEncrypted(opened.document)) {
      post({
        id: request.id,
        reason: "encrypted",
        stats: baseStats,
        type: "skipped",
      });
      return;
    }
    if (isSigned(module, opened.document)) {
      post({
        id: request.id,
        reason: "signed",
        stats: baseStats,
        type: "skipped",
      });
      return;
    }
    const images = findImages(module, opened.document, request.preset);
    const { quality } = FOLIO_COMPRESS_PRESETS[request.preset];
    let changed = 0;
    let kept = 0;
    let done = 0;
    const onImage = () => {
      done += 1;
      post({
        done,
        id: request.id,
        total: images.length,
        type: "progress",
      });
    };
    for (const [pageIndex, pageImages] of groupByPage(images)) {
      const result = await compressPage(
        module,
        opened.document,
        pageIndex,
        pageImages,
        quality,
        onImage
      );
      changed += result.changed;
      kept += result.kept;
    }
    const output = saveDocument(module, opened.document);
    if (output.byteLength >= bytes.byteLength) {
      post({
        id: request.id,
        stats: statsOf({
          images: changed,
          inputBytes: bytes.byteLength,
          kept,
          outputBytes: bytes.byteLength,
          pages: opened.pageCount,
        }),
        type: "unchanged",
      });
      return;
    }
    verify(module, output, opened.pageCount);
    const stats = statsOf({
      images: changed,
      inputBytes: bytes.byteLength,
      kept,
      outputBytes: output.byteLength,
      pages: opened.pageCount,
    });
    // SAFETY: `saveDocument` returns a view over a fresh ArrayBuffer of its own.
    const transferable = output.buffer as ArrayBuffer;
    post({ bytes: transferable, id: request.id, stats, type: "done" }, [
      transferable,
    ]);
  } catch (error) {
    if (error instanceof SkipError) {
      post({
        id: request.id,
        reason: error.reason,
        stats: statsOf({
          images: 0,
          inputBytes: bytes.byteLength,
          kept: 0,
          outputBytes: 0,
          pages: opened.pageCount,
        }),
        type: "skipped",
      });
      return;
    }
    post({
      id: request.id,
      message:
        error instanceof Error
          ? error.message
          : "the PDF could not be compressed",
      reason: failureOf(error),
      type: "failed",
    });
  } finally {
    closeDocument(module, opened);
  }
};

/**
 * A request is handled one at a time. A DedicatedWorker receives messages only
 * from the document that created it, and Chrome reports `event.origin` as an
 * empty string for those messages, so an origin check here would drop every
 * request. The payload is the boundary.
 */
let queue: Promise<void> = Promise.resolve();

const runQueued = async (request: FolioCompressRequest): Promise<void> => {
  try {
    await queue;
    await handle(request);
  } catch (error) {
    post({
      id: request.id,
      message:
        error instanceof Error
          ? error.message
          : "the compression engine failed",
      reason: "engine",
      type: "failed",
    });
  }
};

self.addEventListener("message", (event: MessageEvent<unknown>) => {
  const request = event.data;
  if (!isFolioCompressRequest(request)) {
    return;
  }
  queue = runQueued(request);
});
