import { NULL_PTR } from "@embedpdf/engine-runtime";
import type { PdfRuntimeModule, Ptr } from "@embedpdf/engine-runtime";

import {
  closeDocument,
  isSigned,
  loadDocument,
  PDF_PASSWORD_ERROR,
  saveDocument,
} from "./folio.pdfium";
import { failedCheckOf, lostStructuresOf } from "./folio.repair";
import type {
  FolioLostStructure,
  FolioPageFacts,
  FolioRepairCheck,
  FolioRepairPath,
  FolioStructureFacts,
} from "./folio.repair";

/** One path that ran and the check its copy failed. */
export interface FolioRepairAttempt {
  readonly check: FolioRepairCheck;
  readonly path: FolioRepairPath;
}

/** Why the engine refuses to write any copy. */
export type FolioRepairRefusal = "encrypted" | "signed";

/** Why no verified copy exists. */
export type FolioRepairFailure = "unreadable" | "empty" | "unverified";

export type FolioRepairOutcome =
  | {
      readonly bytes: Uint8Array;
      /** The cross-reference table of the source was not valid. */
      readonly damaged: boolean;
      /** The paths that ran before this one, and the check each failed. */
      readonly attempts: readonly FolioRepairAttempt[];
      readonly lost: readonly FolioLostStructure[];
      readonly pages: number;
      readonly path: FolioRepairPath;
      readonly type: "repaired";
    }
  | {
      readonly attempts: readonly FolioRepairAttempt[];
      readonly reason: FolioRepairFailure;
      readonly type: "failed";
    }
  | { readonly reason: FolioRepairRefusal; readonly type: "refused" };

export interface FolioRepairProgress {
  readonly done: number;
  readonly path: FolioRepairPath;
  readonly total: number;
}

/** The paths a repair tries, in order: a full rewrite first, then a page rebuild. */
export const FOLIO_REPAIR_PATHS = ["rewrite", "rebuild"] as const;

export interface FolioRepairOptions {
  readonly onProgress?: (progress: FolioRepairProgress) => void;
  /** The paths to try, in order. Production passes every path. */
  readonly paths?: readonly FolioRepairPath[];
}

/** The longest edge of the render a check compares, in pixels. */
const RENDER_EDGE = 48;

/** The text characters a check compares at the top of each page. */
const SAMPLE_CHARS = 64;

/** The document information keys that count as metadata. */
const METADATA_KEYS = [
  "Title",
  "Author",
  "Subject",
  "Keywords",
  "Creator",
  "Producer",
  "CreationDate",
  "ModDate",
] as const;

/** The prime modulus of the pixel hash. Each step stays a safe integer. */
const HASH_MODULUS = 2_147_483_647;

/** A polynomial hash of the pixels, so two renders compare in one number. */
const hashOf = (bytes: Uint8Array): number => {
  let hash = 0;
  for (const byte of bytes) {
    hash = (hash * 257 + byte + 1) % HASH_MODULUS;
  }
  return hash;
};

const textOf = (module: PdfRuntimeModule, page: Ptr) => {
  const { fn, mem } = module;
  const text = fn.FPDFText_LoadPage(page);
  if (!text) {
    return { chars: 0, sample: "" };
  }
  try {
    const chars = Math.max(0, fn.FPDFText_CountChars(text));
    const count = Math.min(chars, SAMPLE_CHARS);
    if (count === 0) {
      return { chars, sample: "" };
    }
    const buffer = mem.alloc((count + 1) * 2);
    try {
      const written = fn.FPDFText_GetText(text, 0, count, buffer);
      const bytes = mem.readBytes(buffer, Math.max(0, written - 1) * 2);
      return { chars, sample: new TextDecoder("utf-16le").decode(bytes) };
    } finally {
      mem.free(buffer);
    }
  } finally {
    fn.FPDFText_ClosePage(text);
  }
};

const renderOf = (
  module: PdfRuntimeModule,
  page: Ptr,
  width: number,
  height: number
): number | null => {
  const { fn, mem } = module;
  const scale = RENDER_EDGE / Math.max(width, height, 1);
  const pixelWidth = Math.max(1, Math.round(width * scale));
  const pixelHeight = Math.max(1, Math.round(height * scale));
  const bitmap = fn.FPDFBitmap_Create(pixelWidth, pixelHeight, 0);
  if (!bitmap) {
    return null;
  }
  try {
    fn.FPDFBitmap_FillRect(bitmap, 0, 0, pixelWidth, pixelHeight, -1);
    fn.FPDF_RenderPageBitmap(bitmap, page, 0, 0, pixelWidth, pixelHeight, 0, 0);
    const buffer = fn.FPDFBitmap_GetBuffer(bitmap);
    if (!buffer) {
      return null;
    }
    const stride = fn.FPDFBitmap_GetStride(bitmap);
    return hashOf(mem.readBytes(buffer, stride * pixelHeight));
  } finally {
    fn.FPDFBitmap_Destroy(bitmap);
  }
};

/** What each page shows, in page order. */
const pagesOf = (
  module: PdfRuntimeModule,
  document: Ptr,
  onPage: (done: number, total: number) => void
): readonly FolioPageFacts[] => {
  const { fn } = module;
  const total = fn.FPDF_GetPageCount(document);
  const pages: FolioPageFacts[] = [];
  for (let index = 0; index < total; index += 1) {
    const page = fn.FPDF_LoadPage(document, index);
    if (page) {
      try {
        const width = fn.FPDF_GetPageWidthF(page);
        const height = fn.FPDF_GetPageHeightF(page);
        pages.push({
          ...textOf(module, page),
          annotations: Math.max(0, fn.FPDFPage_GetAnnotCount(page)),
          height,
          render: renderOf(module, page, width, height),
          width,
        });
      } finally {
        fn.FPDF_ClosePage(page);
      }
    } else {
      pages.push({
        annotations: 0,
        chars: 0,
        height: 0,
        render: null,
        sample: "",
        width: 0,
      });
    }
    onPage(index + 1, total);
  }
  return pages;
};

const metadataOf = (
  module: PdfRuntimeModule,
  document: Ptr
): readonly string[] => {
  const { fn, mem } = module;
  const entries: string[] = [];
  for (const key of METADATA_KEYS) {
    const length = fn.FPDF_GetMetaText(document, key, NULL_PTR, 0);
    // An empty UTF-16 value is two bytes: the terminator only.
    if (length <= 2) {
      continue;
    }
    const buffer = mem.alloc(length);
    try {
      fn.FPDF_GetMetaText(document, key, buffer, length);
      const value = new TextDecoder("utf-16le").decode(
        mem.readBytes(buffer, length - 2)
      );
      entries.push(`${key}=${value}`);
    } finally {
      mem.free(buffer);
    }
  }
  return entries;
};

const structureOf = (
  module: PdfRuntimeModule,
  document: Ptr
): FolioStructureFacts => {
  const { fn } = module;
  return {
    attachments: Math.max(0, fn.FPDFDoc_GetAttachmentCount(document)),
    forms: fn.FPDF_GetFormType(document) !== 0,
    javascript: Math.max(0, fn.FPDFDoc_GetJavaScriptActionCount(document)),
    metadata: metadataOf(module, document),
    outlines: Boolean(fn.FPDFBookmark_GetFirstChild(document, NULL_PTR)),
  };
};

/** A new document that holds a copy of every page, and nothing else. */
const rebuildFrom = (
  module: PdfRuntimeModule,
  source: Ptr
): Uint8Array | null => {
  const { fn } = module;
  const target = fn.FPDF_CreateNewDocument();
  if (!target) {
    return null;
  }
  try {
    if (!fn.FPDF_ImportPagesByIndex(target, source, NULL_PTR, 0, 0)) {
      return null;
    }
    return saveDocument(module, target);
  } finally {
    fn.FPDF_CloseDocument(target);
  }
};

/** The first check the copy failed, or null and the copy's losses. */
type Verified =
  | { readonly check: FolioRepairCheck; readonly lost: null }
  | { readonly check: null; readonly lost: readonly FolioLostStructure[] };

/**
 * Reopen the copy and compare it with the source, page by page.
 */
const verify = (
  module: PdfRuntimeModule,
  bytes: Uint8Array,
  source: {
    readonly pages: readonly FolioPageFacts[];
    readonly structure: FolioStructureFacts;
  },
  onPage: (done: number, total: number) => void
): Verified => {
  const { opened } = loadDocument(module, bytes);
  if (!opened) {
    return { check: "opens", lost: null };
  }
  try {
    if (module.fn.EPDF_IsEncrypted(opened.document)) {
      return { check: "opens", lost: null };
    }
    const pages = pagesOf(module, opened.document, onPage);
    const check = failedCheckOf(source.pages, pages);
    if (check) {
      return { check, lost: null };
    }
    return {
      check: null,
      lost: lostStructuresOf(
        source.pages,
        source.structure,
        pages,
        structureOf(module, opened.document)
      ),
    };
  } finally {
    closeDocument(module, opened);
  }
};

/**
 * Write a repaired copy of a PDF that PDFium can open. The rewrite keeps every
 * structure the engine loaded; the rebuild keeps only the pages. A copy is
 * returned only after it reopens and matches the source. The input bytes do
 * not change.
 */
export const repairPdf = (
  module: PdfRuntimeModule,
  bytes: Uint8Array,
  options: FolioRepairOptions = {}
): FolioRepairOutcome => {
  const { fn } = module;
  const paths = options.paths ?? FOLIO_REPAIR_PATHS;
  const { code, opened } = loadDocument(module, bytes);
  if (!opened) {
    return code === PDF_PASSWORD_ERROR
      ? { reason: "encrypted", type: "refused" }
      : { attempts: [], reason: "unreadable", type: "failed" };
  }
  try {
    if (fn.EPDF_IsEncrypted(opened.document)) {
      return { reason: "encrypted", type: "refused" };
    }
    if (isSigned(module, opened.document)) {
      return { reason: "signed", type: "refused" };
    }
    if (opened.pageCount < 1) {
      return { attempts: [], reason: "empty", type: "failed" };
    }
    const damaged = !fn.FPDF_DocumentHasValidCrossReferenceTable(
      opened.document
    );
    const source = {
      pages: pagesOf(module, opened.document, () => null),
      structure: structureOf(module, opened.document),
    };
    const attempts: FolioRepairAttempt[] = [];
    for (const path of paths) {
      const copy =
        path === "rewrite"
          ? saveDocument(module, opened.document)
          : rebuildFrom(module, opened.document);
      if (!copy) {
        attempts.push({ check: "write", path });
        continue;
      }
      const result = verify(module, copy, source, (done, total) => {
        options.onProgress?.({ done, path, total });
      });
      if (result.check) {
        attempts.push({ check: result.check, path });
        continue;
      }
      return {
        attempts,
        bytes: copy,
        damaged,
        lost: result.lost,
        pages: opened.pageCount,
        path,
        type: "repaired",
      };
    }
    return { attempts, reason: "unverified", type: "failed" };
  } finally {
    closeDocument(module, opened);
  }
};
