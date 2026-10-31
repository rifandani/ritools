/* oxlint-disable max-classes-per-file -- The Worker names a refusal and a failed check apart from an engine failure. */
/// <reference lib="webworker" />
import { NULL_PTR } from "@embedpdf/engine-runtime";
import type { PdfRuntimeModule, Ptr } from "@embedpdf/engine-runtime";

import {
  FOLIO_FLATTEN_MAX_LOST_INK,
  folioFlattenFlagsRefusal,
  folioFlattenHasLayers,
  folioFlattenInteractiveNames,
  folioFlattenKeepsText,
  folioFlattenLostInk,
} from "@/features/folio/folio.flatten";
import type {
  FolioFlattenInteractiveName,
  FolioFlattenRefusal,
} from "@/features/folio/folio.flatten";
import type {
  FolioFlattenCheck,
  FolioFlattenReply,
  FolioFlattenRequest,
} from "@/features/folio/folio.flatten.types";
import { isFolioFlattenRequest } from "@/features/folio/folio.flatten.types";
import {
  closeDocument,
  isSigned,
  loadDocument,
  PDF_PASSWORD_ERROR,
  saveDocument,
} from "@/features/folio/folio.pdfium";
import { loadFolioRuntime } from "@/features/folio/folio.worker-runtime";

declare let self: DedicatedWorkerGlobalScope;

/** Flatten the pages as they show on screen, not as they print. */
const FLAT_NORMALDISPLAY = 0;

/** Paint the annotations into the page content. */
const EXPORT_FLATTENED_ANNOTATIONS = 1;

/** Paint the form fields into the page content. */
const EXPORT_FLATTENED_FORM_FIELDS = 2;

/** PDFium's form type for a document without a form. */
const FORMTYPE_NONE = 0;

/** Render the annotation appearances, so the source shows what the user sees. */
const FPDF_ANNOT = 0x01;

/** The width of the render that proves a page draws. */
const RENDER_WIDTH = 200;

/** Two page sizes match to this many points. */
const SIZE_TOLERANCE = 0.5;

const post = (
  message: FolioFlattenReply,
  transfer: readonly Transferable[] = []
): void => {
  self.postMessage(message, { transfer: [...transfer] });
};

/** A file that stays read only. No copy is made. */
class RefusalError extends Error {
  readonly reason: FolioFlattenRefusal;

  constructor(reason: FolioFlattenRefusal) {
    super(reason);
    this.name = "RefusalError";
    this.reason = reason;
  }
}

/** The saved copy failed one check. It is discarded. */
class CheckError extends Error {
  readonly check: FolioFlattenCheck;
  readonly names: readonly FolioFlattenInteractiveName[];

  constructor(
    check: FolioFlattenCheck,
    message: string,
    names: readonly FolioFlattenInteractiveName[] = []
  ) {
    super(message);
    this.name = "CheckError";
    this.check = check;
    this.names = names;
  }
}

/** The copy could not be written. */
class WriteError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "WriteError";
  }
}

/** The document's title as UTF-16LE bytes with their end mark, or null. */
const titleOf = (
  module: PdfRuntimeModule,
  document: Ptr
): Uint8Array | null => {
  const { fn, mem } = module;
  if (!fn.EPDF_HasMetaText(document, "Title")) {
    return null;
  }
  const length = fn.FPDF_GetMetaText(document, "Title", NULL_PTR, 0);
  if (length <= 0) {
    return null;
  }
  const buffer = mem.alloc(length);
  try {
    fn.FPDF_GetMetaText(document, "Title", buffer, length);
    return Uint8Array.from(mem.readBytes(buffer, length));
  } finally {
    mem.free(buffer);
  }
};

/** The copy keeps the title, the one metadata entry a flattened copy keeps. */
const setTitle = (
  module: PdfRuntimeModule,
  document: Ptr,
  title: Uint8Array
) => {
  const { fn, mem } = module;
  const buffer = mem.alloc(title.byteLength);
  try {
    mem.writeBytes(buffer, title);
    fn.EPDF_SetMetaText(document, "Title", buffer);
  } finally {
    mem.free(buffer);
  }
};

/** What one page holds, read before and after the flatten. */
interface PageFacts {
  readonly height: number;
  readonly text: string;
  readonly width: number;
}

const textOf = (module: PdfRuntimeModule, page: Ptr): string => {
  const { fn, mem } = module;
  const textPage = fn.FPDFText_LoadPage(page);
  if (!textPage) {
    return "";
  }
  try {
    const count = fn.FPDFText_CountChars(textPage);
    if (count <= 0) {
      return "";
    }
    const buffer = mem.alloc((count + 1) * 2);
    try {
      const written = fn.FPDFText_GetText(textPage, 0, count, buffer);
      const units = Math.max(0, written - 1);
      return new TextDecoder("utf-16le").decode(
        mem.readBytes(buffer, units * 2)
      );
    } finally {
      mem.free(buffer);
    }
  } finally {
    fn.FPDFText_ClosePage(textPage);
  }
};

/** The page drawn in gray levels at a fixed width, or null when it fails. */
const grayOf = (
  module: PdfRuntimeModule,
  page: Ptr,
  width: number,
  height: number
): Uint8Array | null => {
  const { fn, mem } = module;
  const bitmap = fn.FPDFBitmap_Create(width, height, 1);
  if (!bitmap) {
    return null;
  }
  try {
    fn.FPDFBitmap_FillRect(bitmap, 0, 0, width, height, 0xff_ff_ff_ff);
    fn.FPDF_RenderPageBitmap(bitmap, page, 0, 0, width, height, 0, FPDF_ANNOT);
    const stride = fn.FPDFBitmap_GetStride(bitmap);
    const buffer = fn.FPDFBitmap_GetBuffer(bitmap);
    if (!buffer || stride < width * 4) {
      return null;
    }
    const pixels = mem.readBytes(buffer, stride * height);
    const gray = new Uint8Array(width * height);
    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        const at = y * stride + x * 4;
        gray[y * width + x] = Math.round(
          ((pixels[at] ?? 0) + (pixels[at + 1] ?? 0) + (pixels[at + 2] ?? 0)) /
            3
        );
      }
    }
    return gray;
  } finally {
    fn.FPDFBitmap_Destroy(bitmap);
  }
};

/** Read one page's size, text, and drawing. */
const readPage = (
  module: PdfRuntimeModule,
  document: Ptr,
  index: number
): (PageFacts & { readonly gray: Uint8Array | null }) | null => {
  const { fn } = module;
  const page = fn.FPDF_LoadPage(document, index);
  if (!page) {
    return null;
  }
  try {
    const width = fn.FPDF_GetPageWidthF(page);
    const height = fn.FPDF_GetPageHeightF(page);
    const renderHeight = Math.max(
      1,
      Math.round((RENDER_WIDTH * height) / Math.max(width, 1))
    );
    return {
      gray: grayOf(module, page, RENDER_WIDTH, renderHeight),
      height,
      text: textOf(module, page),
      width,
    };
  } finally {
    fn.FPDF_ClosePage(page);
  }
};

/** The interactive parts the reopened copy still has, as PDFium reads it. */
const assertNoInteractiveParts = (
  module: PdfRuntimeModule,
  document: Ptr,
  bytes: Uint8Array
) => {
  const { fn } = module;
  const names = folioFlattenInteractiveNames(bytes);
  if (names.length > 0) {
    throw new CheckError(
      "interactive",
      `the copy still holds ${names.join(", ")}`,
      names
    );
  }
  if (fn.FPDF_GetFormType(document) !== FORMTYPE_NONE) {
    throw new CheckError("interactive", "the copy still holds a form");
  }
  if (fn.FPDFDoc_GetAttachmentCount(document) > 0) {
    throw new CheckError("interactive", "the copy still holds an attachment");
  }
  if (fn.FPDFDoc_GetJavaScriptActionCount(document) > 0) {
    throw new CheckError("interactive", "the copy still holds a script");
  }
  if (fn.FPDFBookmark_GetFirstChild(document, NULL_PTR)) {
    throw new CheckError("interactive", "the copy still holds an outline");
  }
};

/**
 * Reopen the saved copy and prove it before it is offered: it opens with no
 * password, it has the same pages in the same order and size, each page
 * draws and keeps the open source's text and the copy's ink, and no
 * interactive part is left.
 */
const verify = (
  module: PdfRuntimeModule,
  bytes: Uint8Array,
  source: readonly (PageFacts & { readonly gray: Uint8Array | null })[],
  sourceText: readonly string[],
  onPage: () => void
) => {
  const { fn } = module;
  const result = loadDocument(module, bytes);
  if (!result.opened) {
    throw new CheckError("open", `the copy did not open (${result.code})`);
  }
  const { opened } = result;
  try {
    if (fn.EPDF_IsEncrypted(opened.document)) {
      throw new CheckError("open", "the copy is encrypted");
    }
    if (fn.FPDF_GetPageCount(opened.document) !== source.length) {
      throw new CheckError("pages", "the copy has a different page count");
    }
    assertNoInteractiveParts(module, opened.document, bytes);
    for (const [index, expected] of source.entries()) {
      const page = fn.FPDF_LoadPage(opened.document, index);
      if (!page) {
        throw new CheckError("render", `page ${index + 1} did not open`);
      }
      const annotations = fn.FPDFPage_GetAnnotCount(page);
      fn.FPDF_ClosePage(page);
      if (annotations > 0) {
        throw new CheckError(
          "interactive",
          `page ${index + 1} still has annotations`
        );
      }
      const actual = readPage(module, opened.document, index);
      if (!actual?.gray || !expected.gray) {
        throw new CheckError("render", `page ${index + 1} did not draw`);
      }
      if (
        Math.abs(actual.width - expected.width) > SIZE_TOLERANCE ||
        Math.abs(actual.height - expected.height) > SIZE_TOLERANCE
      ) {
        throw new CheckError("pages", `page ${index + 1} changed its size`);
      }
      if (!folioFlattenKeepsText(sourceText[index] ?? "", actual.text)) {
        throw new CheckError("text", `page ${index + 1} lost text`);
      }
      if (
        folioFlattenLostInk(expected.gray, actual.gray) >
        FOLIO_FLATTEN_MAX_LOST_INK
      ) {
        throw new CheckError("render", `page ${index + 1} lost content`);
      }
      onPage();
    }
  } finally {
    closeDocument(module, opened);
  }
};

/** Paint every page of the copy into a new document, with its title. */
const flatten = (
  module: PdfRuntimeModule,
  document: Ptr,
  pageCount: number
): Uint8Array => {
  const { fn, mem } = module;
  const indexes = mem.alloc(4 * pageCount);
  let flat = NULL_PTR;
  try {
    for (let index = 0; index < pageCount; index += 1) {
      mem.poke(indexes, "i32", index, 4 * index);
    }
    flat = fn.EPDFDoc_ExportPagesFlattened(
      document,
      indexes,
      pageCount,
      FLAT_NORMALDISPLAY,
      // The two flags are separate bits, so their sum sets both.
      EXPORT_FLATTENED_ANNOTATIONS + EXPORT_FLATTENED_FORM_FIELDS
    );
    if (!flat) {
      throw new Error("the pages could not be flattened");
    }
    const title = titleOf(module, document);
    if (title) {
      setTitle(module, flat, title);
    }
    const output = saveDocument(module, flat);
    if (!output) {
      throw new WriteError("the copy could not be written");
    }
    return output;
  } finally {
    if (flat) {
      fn.FPDF_CloseDocument(flat);
    }
    mem.free(indexes);
  }
};

const handle = async (request: FolioFlattenRequest): Promise<void> => {
  const flagRefusal = folioFlattenFlagsRefusal(request.flags);
  if (flagRefusal) {
    post({ id: request.id, reason: flagRefusal, type: "refused" });
    return;
  }
  const module = await loadFolioRuntime();
  const { fn } = module;
  const bytes = new Uint8Array(request.bytes);
  const result = loadDocument(module, bytes);
  if (!result.opened) {
    if (result.code === PDF_PASSWORD_ERROR) {
      post({ id: request.id, reason: "encrypted", type: "refused" });
      return;
    }
    post({
      check: null,
      id: request.id,
      message: `the PDF could not be opened (${result.code})`,
      names: [],
      reason: "unreadable",
      type: "failed",
    });
    return;
  }
  const { opened } = result;
  try {
    if (request.sourceText.length !== request.pages) {
      throw new CheckError(
        "pages",
        "the open source text has a different page count"
      );
    }
    if (fn.EPDF_IsEncrypted(opened.document)) {
      throw new RefusalError("encrypted");
    }
    if (isSigned(module, opened.document)) {
      throw new RefusalError("signed");
    }
    if (folioFlattenHasLayers(bytes)) {
      throw new RefusalError("layers");
    }
    const { pageCount } = opened;
    if (pageCount !== request.pages) {
      throw new CheckError("pages", "the page copy has a different count");
    }
    const total = pageCount * 2;
    let done = 0;
    const tick = () => {
      done += 1;
      post({ done, id: request.id, total, type: "progress" });
    };
    const source: (PageFacts & { readonly gray: Uint8Array | null })[] = [];
    for (let index = 0; index < pageCount; index += 1) {
      const facts = readPage(module, opened.document, index);
      if (!facts) {
        throw new CheckError("render", `page ${index + 1} did not open`);
      }
      source.push(facts);
      tick();
    }
    const output = flatten(module, opened.document, pageCount);
    verify(module, output, source, request.sourceText, tick);
    // SAFETY: `saveDocument` returns a copy over a fresh ArrayBuffer of its own.
    const transferable = output.buffer as ArrayBuffer;
    post(
      {
        bytes: transferable,
        id: request.id,
        stats: {
          inputBytes: bytes.byteLength,
          outputBytes: output.byteLength,
          pages: pageCount,
        },
        type: "done",
      },
      [transferable]
    );
  } catch (error) {
    if (error instanceof RefusalError) {
      post({ id: request.id, reason: error.reason, type: "refused" });
      return;
    }
    post({
      check: error instanceof CheckError ? error.check : null,
      id: request.id,
      message:
        error instanceof Error ? error.message : "the PDF was not flattened",
      names: error instanceof CheckError ? error.names : [],
      reason:
        error instanceof CheckError
          ? "verify"
          : error instanceof WriteError
            ? "write"
            : "engine",
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

const runQueued = async (request: FolioFlattenRequest): Promise<void> => {
  try {
    await queue;
    await handle(request);
  } catch (error) {
    post({
      check: null,
      id: request.id,
      message:
        error instanceof Error ? error.message : "the flatten engine failed",
      names: [],
      reason: "engine",
      type: "failed",
    });
  }
};

self.addEventListener("message", (event: MessageEvent<unknown>) => {
  const request = event.data;
  if (!isFolioFlattenRequest(request)) {
    return;
  }
  queue = runQueued(request);
});
