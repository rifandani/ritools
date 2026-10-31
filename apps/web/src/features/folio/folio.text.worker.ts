/// <reference lib="webworker" />

import { createPdfRuntime, NULL_PTR } from "@embedpdf/engine-runtime";
import type { Callback, PdfRuntimeModule, Ptr } from "@embedpdf/engine-runtime";
import wasmUrl from "@embedpdf/engine-runtime-wasm32/wasm-url";

import { FOLIO_PDF_PERMISSION } from "./folio.protect.types";
import type {
  FolioTextEdit,
  FolioTextObject,
  FolioTextRefusal,
  FolioTextReply,
} from "./folio.text.types";
import { isFolioTextRequest } from "./folio.text.types";
import {
  differsInside,
  differsOutside,
  FOLIO_TEXT_ARTWORK_MARGIN,
  FOLIO_TEXT_BOUNDS_TOLERANCE,
  fitsFreeWidth,
  freeWidth,
  refusalOf,
} from "./folio.text.verify";
import type { FolioBitmapView, FolioTextBounds } from "./folio.text.verify";

/** The PDF save flag that rewrites the file instead of appending to it. */
const PDF_NO_INCREMENTAL = 2;

/** PDFium's error code for a document that needs a password. */
const PDF_PASSWORD_ERROR = 4;

/** PDFium's page-object type for a text object. */
const FPDF_PAGEOBJ_TEXT = 1;

/** PDFium's text render mode that paints nothing, as an OCR layer uses. */
const PDF_TEXT_RENDER_INVISIBLE = 3;

/** The render scale for the before-and-after pixel check. */
const RENDER_SCALE = 2;

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

class RefusalError extends Error {
  readonly reason: FolioTextRefusal;

  constructor(reason: FolioTextRefusal) {
    super(reason);
    this.name = "RefusalError";
    this.reason = reason;
  }
}

/* oxlint-disable anti-slop/no-runtime-typeof, anti-slop/no-unknown-parameters, anti-slop/require-safety-comment-for-type-assertion -- PDFium delivers callback arguments as untyped numbers or bigints; this is the boundary that brands an address. */
/** Read a callback address as a runtime pointer. */
const asPtr = (value: unknown): Ptr => {
  if (typeof value === "number" || typeof value === "bigint") {
    return BigInt(value) as Ptr;
  }
  throw new Error("the PDF callback did not receive an address");
};
/* oxlint-enable anti-slop/no-runtime-typeof, anti-slop/no-unknown-parameters, anti-slop/require-safety-comment-for-type-assertion */

interface OpenedDocument {
  readonly data: Ptr;
  readonly document: Ptr;
  readonly pageCount: number;
}

const openDocument = (
  module: PdfRuntimeModule,
  bytes: Uint8Array,
  refusePassword: boolean
): OpenedDocument => {
  const { fn, mem } = module;
  const data = mem.alloc(bytes.byteLength);
  mem.writeBytes(data, bytes);
  const document = fn.FPDF_LoadMemDocument64(data, bytes.byteLength, "");
  if (!document) {
    const code = fn.FPDF_GetLastError();
    mem.free(data);
    if (refusePassword && code === PDF_PASSWORD_ERROR) {
      throw new RefusalError("permission");
    }
    throw new Error(`the PDF could not be opened (${code})`);
  }
  return { data, document, pageCount: fn.FPDF_GetPageCount(document) };
};

const closeDocument = (module: PdfRuntimeModule, opened: OpenedDocument) => {
  module.fn.FPDF_CloseDocument(opened.document);
  module.mem.free(opened.data);
};

interface OpenedPage {
  readonly page: Ptr;
  readonly textPage: Ptr;
}

const openPage = (
  module: PdfRuntimeModule,
  document: Ptr,
  pageIndex: number
): OpenedPage | null => {
  const { fn } = module;
  const page = fn.FPDF_LoadPage(document, pageIndex);
  if (!page) {
    return null;
  }
  const textPage = fn.FPDFText_LoadPage(page);
  if (!textPage) {
    fn.FPDF_ClosePage(page);
    return null;
  }
  return { page, textPage };
};

const closePage = (module: PdfRuntimeModule, page: OpenedPage) => {
  module.fn.FPDFText_ClosePage(page.textPage);
  module.fn.FPDF_ClosePage(page.page);
};

type BoxReader = (left: Ptr, bottom: Ptr, right: Ptr, top: Ptr) => boolean;

const readBox = (
  module: PdfRuntimeModule,
  read: BoxReader
): FolioTextBounds | null => {
  const { mem } = module;
  const left = mem.alloc(4);
  const bottom = mem.alloc(4);
  const right = mem.alloc(4);
  const top = mem.alloc(4);
  try {
    if (!read(left, bottom, right, top)) {
      return null;
    }
    return {
      bottom: Number(mem.peek(bottom, "f32")),
      left: Number(mem.peek(left, "f32")),
      right: Number(mem.peek(right, "f32")),
      top: Number(mem.peek(top, "f32")),
    };
  } finally {
    mem.free(left);
    mem.free(bottom);
    mem.free(right);
    mem.free(top);
  }
};

const objectBounds = (
  module: PdfRuntimeModule,
  object: Ptr
): FolioTextBounds | null =>
  readBox(module, (left, bottom, right, top) =>
    module.fn.FPDFPageObj_GetBounds(object, left, bottom, right, top)
  );

/**
 * A page can inherit its boxes from the page tree, and then PDFium reports
 * neither a crop box nor a media box of its own. The bounding box is the
 * effective media box, so it is the last resort rather than no page geometry.
 */
const boundingBox = (
  module: PdfRuntimeModule,
  page: Ptr
): FolioTextBounds | null => {
  const { fn, mem } = module;
  const box = mem.alloc(16);
  try {
    if (!fn.FPDF_GetPageBoundingBox(page, box)) {
      return null;
    }
    const at = (offset: number) =>
      Number(mem.peek(asPtr(Number(box) + offset), "f32"));
    // FS_RECTF order is left, top, right, bottom.
    return { bottom: at(12), left: at(0), right: at(8), top: at(4) };
  } finally {
    mem.free(box);
  }
};

const pageBox = (
  module: PdfRuntimeModule,
  page: Ptr
): FolioTextBounds | null => {
  const crop = readBox(module, (left, bottom, right, top) =>
    module.fn.FPDFPage_GetCropBox(page, left, bottom, right, top)
  );
  if (crop) {
    return crop;
  }
  return (
    readBox(module, (left, bottom, right, top) =>
      module.fn.FPDFPage_GetMediaBox(page, left, bottom, right, top)
    ) ?? boundingBox(module, page)
  );
};

const fontNameOf = (module: PdfRuntimeModule, object: Ptr): string => {
  const { fn, mem } = module;
  const font = fn.FPDFTextObj_GetFont(object);
  if (!font) {
    return "";
  }
  const size = fn.FPDFFont_GetBaseFontName(font, NULL_PTR, 0);
  if (size <= 0) {
    return "";
  }
  const buffer = mem.alloc(size);
  try {
    if (fn.FPDFFont_GetBaseFontName(font, buffer, size) <= 0) {
      return "";
    }
    const bytes = mem.readBytes(buffer, size);
    const end = bytes.indexOf(0);
    return new TextDecoder().decode(
      bytes.subarray(0, end === -1 ? bytes.length : end)
    );
  } finally {
    mem.free(buffer);
  }
};

const fontSizeOf = (module: PdfRuntimeModule, object: Ptr): number => {
  const { fn, mem } = module;
  const size = mem.alloc(4);
  try {
    if (!fn.FPDFTextObj_GetFontSize(object, size)) {
      return 0;
    }
    return Number(mem.peek(size, "f32"));
  } finally {
    mem.free(size);
  }
};

const textOf = (
  module: PdfRuntimeModule,
  object: Ptr,
  textPage: Ptr
): string => {
  const { fn, mem } = module;
  const size = fn.FPDFTextObj_GetText(object, textPage, NULL_PTR, 0);
  if (size <= 0) {
    return "";
  }
  const buffer = mem.alloc(size);
  try {
    if (fn.FPDFTextObj_GetText(object, textPage, buffer, size) <= 0) {
      return "";
    }
    return mem.readU16String(buffer);
  } finally {
    mem.free(buffer);
  }
};

interface PageTextObject {
  readonly bounds: FolioTextBounds;
  readonly font: string;
  readonly index: number;
  readonly invisible: boolean;
  readonly object: Ptr;
  readonly size: number;
  readonly text: string;
}

const textObjectsOf = (
  module: PdfRuntimeModule,
  page: Ptr,
  textPage: Ptr
): readonly PageTextObject[] => {
  const { fn } = module;
  const count = fn.FPDFPage_CountObjects(page);
  const objects: PageTextObject[] = [];
  for (let index = 0; index < count; index += 1) {
    const object = fn.FPDFPage_GetObject(page, index);
    if (!object || fn.FPDFPageObj_GetType(object) !== FPDF_PAGEOBJ_TEXT) {
      continue;
    }
    const bounds = objectBounds(module, object);
    if (!bounds) {
      continue;
    }
    objects.push({
      bounds,
      font: fontNameOf(module, object),
      index,
      invisible:
        fn.FPDFTextObj_GetTextRenderMode(object) === PDF_TEXT_RENDER_INVISIBLE,
      object,
      size: fontSizeOf(module, object),
      text: textOf(module, object, textPage),
    });
  }
  return objects;
};

const toPublicObject = (object: PageTextObject): FolioTextObject => ({
  bounds: [
    object.bounds.left,
    object.bounds.bottom,
    object.bounds.right,
    object.bounds.top,
  ],
  font: object.font,
  index: object.index,
  invisible: object.invisible,
  size: object.size,
  text: object.text,
});

const renderPage = (
  module: PdfRuntimeModule,
  page: Ptr,
  scale: number
): FolioBitmapView => {
  const { fn, mem } = module;
  const width = Math.max(1, Math.ceil(fn.FPDF_GetPageWidthF(page) * scale));
  const height = Math.max(1, Math.ceil(fn.FPDF_GetPageHeightF(page) * scale));
  const bitmap = fn.FPDFBitmap_Create(width, height, 0);
  if (!bitmap) {
    throw new Error("the page could not be rendered");
  }
  try {
    if (!fn.FPDFBitmap_FillRect(bitmap, 0, 0, width, height, 0xff_ff_ff_ff)) {
      throw new Error("the page could not be cleared");
    }
    fn.FPDF_RenderPageBitmap(bitmap, page, 0, 0, width, height, 0, 0);
    const stride = fn.FPDFBitmap_GetStride(bitmap);
    return {
      bytes: mem.readBytes(fn.FPDFBitmap_GetBuffer(bitmap), stride * height),
      height,
      stride,
      width,
    };
  } finally {
    fn.FPDFBitmap_Destroy(bitmap);
  }
};

interface PageGeometry {
  readonly box: FolioTextBounds;
  readonly rotation: number;
}

const pageGeometry = (module: PdfRuntimeModule, page: Ptr): PageGeometry => {
  const box = pageBox(module, page);
  if (!box) {
    throw new Error("the page has no box");
  }
  return { box, rotation: module.fn.FPDFPage_GetRotation(page) };
};

/**
 * Map a page-space box to the bitmap the renderer produced. The four corners
 * cover every page rotation, so the result is the axis-aligned envelope.
 */
const pixelRect = (
  bounds: FolioTextBounds,
  geometry: PageGeometry,
  bitmap: FolioBitmapView
) => {
  const boxWidth = geometry.box.right - geometry.box.left;
  const boxHeight = geometry.box.top - geometry.box.bottom;
  if (boxWidth <= 0 || boxHeight <= 0) {
    throw new Error("the page has no area");
  }

  const project = (x: number, y: number) => {
    const u = (x - geometry.box.left) / boxWidth;
    const v = (y - geometry.box.bottom) / boxHeight;
    switch (geometry.rotation) {
      case 1: {
        return { x: v * bitmap.width, y: u * bitmap.height };
      }
      case 2: {
        return { x: (1 - u) * bitmap.width, y: v * bitmap.height };
      }
      case 3: {
        return { x: (1 - v) * bitmap.width, y: (1 - u) * bitmap.height };
      }
      default: {
        return { x: u * bitmap.width, y: (1 - v) * bitmap.height };
      }
    }
  };

  const corners = [
    project(bounds.left, bounds.bottom),
    project(bounds.left, bounds.top),
    project(bounds.right, bounds.bottom),
    project(bounds.right, bounds.top),
  ];
  let left = bitmap.width;
  let top = bitmap.height;
  let right = 0;
  let bottom = 0;
  for (const corner of corners) {
    left = Math.min(left, corner.x);
    top = Math.min(top, corner.y);
    right = Math.max(right, corner.x);
    bottom = Math.max(bottom, corner.y);
  }
  return { bottom, left, right, top };
};

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
      throw new Error("the PDF could not be written");
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

const withinTolerance = (left: number, right: number) =>
  Math.abs(left - right) <= FOLIO_TEXT_BOUNDS_TOLERANCE;

interface Verification {
  readonly before: readonly PageTextObject[];
  readonly beforeBitmap: FolioBitmapView;
  readonly edit: FolioTextEdit;
  readonly expectVisible: boolean;
  readonly geometry: PageGeometry;
  readonly newBounds: FolioTextBounds;
  readonly objectCount: number;
  readonly oldBounds: FolioTextBounds;
  readonly pageCount: number;
  readonly saved: Uint8Array;
  readonly tagged: boolean;
}

/**
 * Compare the reopened page's text objects with the listing, then check the
 * edited object's text, font, size, and box.
 */
const verifyTextObjects = (
  check: Verification,
  after: readonly PageTextObject[]
) => {
  const target = after.find(
    (object) => object.index === check.edit.objectIndex
  );
  const original = check.before.find(
    (object) => object.index === check.edit.objectIndex
  );
  if (!target || !original) {
    throw new RefusalError("verify-failed");
  }
  if (target.text !== check.edit.next) {
    throw new RefusalError("glyph-coverage");
  }
  if (
    target.font !== original.font ||
    Math.abs(target.size - original.size) > FOLIO_TEXT_BOUNDS_TOLERANCE
  ) {
    throw new RefusalError("verify-failed");
  }
  if (after.length !== check.before.length) {
    throw new RefusalError("verify-failed");
  }
  const texts = new Map(
    check.before.map((object) => [object.index, object.text])
  );
  for (const object of after) {
    if (object.index === check.edit.objectIndex) {
      continue;
    }
    if (texts.get(object.index) !== object.text) {
      throw new RefusalError("verify-failed");
    }
  }
  if (
    !withinTolerance(target.bounds.left, check.newBounds.left) ||
    !withinTolerance(target.bounds.bottom, check.newBounds.bottom) ||
    !withinTolerance(target.bounds.right, check.newBounds.right) ||
    !withinTolerance(target.bounds.top, check.newBounds.top)
  ) {
    throw new RefusalError("verify-failed");
  }
};

/**
 * Render the reopened page, refuse any pixel change outside the edit, and
 * refuse a changed string that paints nothing inside it.
 */
const verifyArtwork = (
  module: PdfRuntimeModule,
  page: Ptr,
  check: Verification
) => {
  const afterBitmap = renderPage(module, page, RENDER_SCALE);
  if (
    afterBitmap.width !== check.beforeBitmap.width ||
    afterBitmap.height !== check.beforeBitmap.height
  ) {
    throw new RefusalError("verify-failed");
  }
  const keepOut = pixelRect(
    {
      bottom:
        Math.min(check.oldBounds.bottom, check.newBounds.bottom) -
        FOLIO_TEXT_ARTWORK_MARGIN,
      left:
        Math.min(check.oldBounds.left, check.newBounds.left) -
        FOLIO_TEXT_ARTWORK_MARGIN,
      right:
        Math.max(check.oldBounds.right, check.newBounds.right) +
        FOLIO_TEXT_ARTWORK_MARGIN,
      top:
        Math.max(check.oldBounds.top, check.newBounds.top) +
        FOLIO_TEXT_ARTWORK_MARGIN,
    },
    check.geometry,
    check.beforeBitmap
  );
  if (differsOutside(check.beforeBitmap, afterBitmap, keepOut)) {
    throw new RefusalError("artwork");
  }
  if (
    check.expectVisible &&
    !differsInside(check.beforeBitmap, afterBitmap, keepOut)
  ) {
    throw new RefusalError("invisible");
  }
};

/**
 * Verify the saved bytes, not the in-memory state: reopen, re-extract, and
 * render. Every failure is a refusal, so the caller keeps the input bytes.
 */
const verifySavedBytes = (module: PdfRuntimeModule, check: Verification) => {
  const { fn } = module;
  const opened = openDocument(module, check.saved, false);
  try {
    if (fn.FPDF_GetPageCount(opened.document) !== check.pageCount) {
      throw new RefusalError("verify-failed");
    }
    if (fn.FPDFCatalog_IsTagged(opened.document) !== check.tagged) {
      throw new RefusalError("verify-failed");
    }
    if (check.edit.pageIndex >= opened.pageCount) {
      throw new RefusalError("verify-failed");
    }
    const page = openPage(module, opened.document, check.edit.pageIndex);
    if (!page) {
      throw new RefusalError("verify-failed");
    }
    try {
      if (fn.FPDFPage_CountObjects(page.page) !== check.objectCount) {
        throw new RefusalError("verify-failed");
      }
      const after = textObjectsOf(module, page.page, page.textPage);
      verifyTextObjects(check, after);
      verifyArtwork(module, page.page, check);
    } finally {
      closePage(module, page);
    }
  } finally {
    closeDocument(module, opened);
  }
};

/**
 * Any failure while checking the saved file is a `verify-failed` refusal, so an
 * engine error can never return bytes that did not pass every gate.
 */
const verifySaved = (module: PdfRuntimeModule, check: Verification) => {
  try {
    verifySavedBytes(module, check);
  } catch (error) {
    if (error instanceof RefusalError) {
      throw error;
    }
    throw new RefusalError("verify-failed");
  }
};

/**
 * The free width from a target's right edge to the next object on its line, or
 * to the page's right edge.
 */
const freeWidthFor = (
  target: PageTextObject,
  objects: readonly PageTextObject[],
  right: number
): number => {
  const neighbors: FolioTextBounds[] = [];
  for (const object of objects) {
    if (object.index !== target.index) {
      neighbors.push(object.bounds);
    }
  }
  return freeWidth(target.bounds, neighbors, right);
};

interface Fit {
  readonly fits: boolean;
  readonly free: number;
  readonly needed: number;
}

/**
 * Measure a candidate string against the line's free width. The object is
 * rewritten in memory only: nothing is generated or saved, so the document
 * bytes stay untouched.
 */
const measureFit = (
  module: PdfRuntimeModule,
  bytes: Uint8Array,
  request: FolioTextEdit
): Fit => {
  const { fn, mem } = module;
  const opened = openDocument(module, bytes, false);
  try {
    if (request.pageIndex >= opened.pageCount) {
      throw new RefusalError("no-text-object");
    }
    const page = openPage(module, opened.document, request.pageIndex);
    if (!page) {
      throw new RefusalError("no-text-object");
    }
    try {
      const objects = textObjectsOf(module, page.page, page.textPage);
      const target = objects.find(
        (object) => object.index === request.objectIndex
      );
      if (!target) {
        throw new RefusalError("no-text-object");
      }
      if (target.text !== request.expected) {
        throw new RefusalError("verify-failed");
      }
      if (target.invisible) {
        throw new RefusalError("invisible");
      }
      const geometry = pageGeometry(module, page.page);
      const free = freeWidthFor(target, objects, geometry.box.right);
      const text = mem.writeU16String(request.next);
      let written = false;
      try {
        written = fn.FPDFText_SetText(target.object, text);
      } finally {
        mem.free(text);
      }
      if (!written) {
        throw new RefusalError("glyph-coverage");
      }
      if (!fn.FPDFPage_GenerateContent(page.page)) {
        throw new RefusalError("verify-failed");
      }
      const nextBounds = objectBounds(module, target.object);
      if (!nextBounds) {
        throw new RefusalError("verify-failed");
      }
      return {
        fits: fitsFreeWidth(target.bounds, nextBounds, free),
        free,
        // The extra width that the line does not have. Zero when the text fits.
        needed: Math.max(0, nextBounds.right - target.bounds.right - free),
      };
    } finally {
      closePage(module, page);
    }
  } finally {
    closeDocument(module, opened);
  }
};

const edit = (
  module: PdfRuntimeModule,
  bytes: Uint8Array,
  request: FolioTextEdit
) => {
  const { fn, mem } = module;
  const opened = openDocument(module, bytes, true);
  try {
    const permissions = fn.FPDF_GetDocPermissions(opened.document);
    // oxlint-disable-next-line eslint/no-bitwise -- PDF permission bits are one integer.
    const permitted = (permissions & FOLIO_PDF_PERMISSION.modifyContents) !== 0;
    const refusal = refusalOf({
      permitted,
      signed: fn.FPDF_GetSignatureCount(opened.document) > 0,
      xfa: fn.FPDF_GetXFAPacketCount(opened.document) > 0,
    });
    if (refusal) {
      throw new RefusalError(refusal);
    }
    const tagged = fn.FPDFCatalog_IsTagged(opened.document);
    if (request.pageIndex >= opened.pageCount) {
      throw new RefusalError("no-text-object");
    }

    const page = openPage(module, opened.document, request.pageIndex);
    if (!page) {
      throw new RefusalError("no-text-object");
    }
    try {
      const objectCount = fn.FPDFPage_CountObjects(page.page);
      const before = textObjectsOf(module, page.page, page.textPage);
      const target = before.find(
        (object) => object.index === request.objectIndex
      );
      if (!target) {
        throw new RefusalError("no-text-object");
      }
      if (target.text !== request.expected) {
        throw new RefusalError("verify-failed");
      }
      if (target.invisible) {
        throw new RefusalError("invisible");
      }

      const geometry = pageGeometry(module, page.page);
      const width = freeWidthFor(target, before, geometry.box.right);
      const beforeBitmap = renderPage(module, page.page, RENDER_SCALE);

      const text = mem.writeU16String(request.next);
      let written = false;
      try {
        written = fn.FPDFText_SetText(target.object, text);
      } finally {
        mem.free(text);
      }
      if (!written) {
        throw new RefusalError("glyph-coverage");
      }
      if (!fn.FPDFPage_GenerateContent(page.page)) {
        throw new RefusalError("verify-failed");
      }
      const newBounds = objectBounds(module, target.object);
      if (!newBounds) {
        throw new RefusalError("verify-failed");
      }
      if (!fitsFreeWidth(target.bounds, newBounds, width)) {
        throw new RefusalError("overflow");
      }

      const saved = saveDocument(module, opened.document);
      verifySaved(module, {
        before,
        beforeBitmap,
        edit: request,
        expectVisible: request.next.trim() !== target.text.trim(),
        geometry,
        newBounds,
        objectCount,
        oldBounds: target.bounds,
        pageCount: opened.pageCount,
        saved,
        tagged,
      });
      return { bytes: saved, tagged };
    } finally {
      closePage(module, page);
    }
  } finally {
    closeDocument(module, opened);
  }
};

/** List the text objects that one page draws, as page-space boxes. */
const listTextObjects = async (
  bytes: Uint8Array,
  pageIndex: number
): Promise<{
  readonly objects: readonly FolioTextObject[];
  readonly tagged: boolean;
}> => {
  const module = await loadRuntime();
  const opened = openDocument(module, bytes, false);
  try {
    const tagged = module.fn.FPDFCatalog_IsTagged(opened.document);
    if (pageIndex >= opened.pageCount) {
      return { objects: [], tagged };
    }
    const page = openPage(module, opened.document, pageIndex);
    if (!page) {
      return { objects: [], tagged };
    }
    try {
      return {
        objects: textObjectsOf(module, page.page, page.textPage).map(
          toPublicObject
        ),
        tagged,
      };
    } finally {
      closePage(module, page);
    }
  } finally {
    closeDocument(module, opened);
  }
};

/** Rewrite one PDF Text Object and return the verified saved bytes. */
const rewriteTextObject = async (
  bytes: Uint8Array,
  request: FolioTextEdit
): Promise<
  | { readonly bytes: Uint8Array; readonly ok: true; readonly tagged: boolean }
  | { readonly ok: false; readonly reason: FolioTextRefusal }
> => {
  const module = await loadRuntime();
  try {
    return { ...edit(module, bytes, request), ok: true };
  } catch (error) {
    if (error instanceof RefusalError) {
      return { ok: false, reason: error.reason };
    }
    throw error;
  }
};

// SAFETY: this module runs only as the dedicated worker created in
// folio.text.ts, where `self` is a DedicatedWorkerGlobalScope.
const worker = self as DedicatedWorkerGlobalScope;

const post = (reply: FolioTextReply) => {
  if (reply.type === "rewritten") {
    worker.postMessage(reply, [reply.bytes]);
    return;
  }
  worker.postMessage(reply, []);
};

worker.addEventListener("message", async (event: MessageEvent<unknown>) => {
  const request = event.data;
  if (!isFolioTextRequest(request)) {
    return;
  }
  try {
    if (request.type === "list") {
      const listed = await listTextObjects(
        new Uint8Array(request.bytes),
        request.pageIndex
      );
      post({
        id: request.id,
        objects: listed.objects,
        ok: true,
        tagged: listed.tagged,
        type: "objects",
      });
      return;
    }

    if (request.type === "measure") {
      const fit = measureFit(
        await loadRuntime(),
        new Uint8Array(request.bytes),
        request.edit
      );
      post({
        fits: fit.fits,
        free: fit.free,
        id: request.id,
        needed: fit.needed,
        ok: true,
        type: "measured",
      });
      return;
    }

    const result = await rewriteTextObject(
      new Uint8Array(request.bytes),
      request.edit
    );
    if (!result.ok) {
      post({
        id: request.id,
        ok: false,
        reason: result.reason,
        type: "refused",
      });
      return;
    }
    const bytes = new ArrayBuffer(result.bytes.byteLength);
    new Uint8Array(bytes).set(result.bytes);
    post({
      bytes,
      id: request.id,
      ok: true,
      tagged: result.tagged,
      type: "rewritten",
    });
  } catch (error) {
    post({
      id: request.id,
      message: error instanceof Error ? error.message : "the text edit failed",
      ok: false,
      type: "failed",
    });
  }
});
