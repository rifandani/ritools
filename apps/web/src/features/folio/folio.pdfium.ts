import type { Callback, PdfRuntimeModule, Ptr } from "@embedpdf/engine-runtime";

/** The PDF save flag that rewrites the file instead of appending to it. */
const PDF_NO_INCREMENTAL = 2;

/** PDFium's error code for a document that needs a password. */
export const PDF_PASSWORD_ERROR = 4;

/** A document PDFium holds in memory, with the bytes it reads from. */
export interface OpenedDocument {
  readonly data: Ptr;
  readonly document: Ptr;
  readonly pageCount: number;
}

/** The open document, or PDFium's error code when the bytes do not open. */
export type LoadedDocument =
  | { readonly code: 0; readonly opened: OpenedDocument }
  | { readonly code: number; readonly opened: null };

/** Open bytes in PDFium without a password. */
export const loadDocument = (
  module: PdfRuntimeModule,
  bytes: Uint8Array
): LoadedDocument => {
  const { fn, mem } = module;
  const data = mem.alloc(bytes.byteLength);
  mem.writeBytes(data, bytes);
  const document = fn.FPDF_LoadMemDocument64(data, bytes.byteLength, "");
  if (!document) {
    const code = fn.FPDF_GetLastError();
    mem.free(data);
    return { code, opened: null };
  }
  return {
    code: 0,
    opened: { data, document, pageCount: fn.FPDF_GetPageCount(document) },
  };
};

export const closeDocument = (
  module: PdfRuntimeModule,
  opened: OpenedDocument
): void => {
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

/**
 * Write a full copy of the document, with a new cross-reference table. The
 * result is null when PDFium cannot write it.
 */
export const saveDocument = (
  module: PdfRuntimeModule,
  document: Ptr
): Uint8Array | null => {
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
      return null;
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

/** A signed file stays read only: a rewrite breaks its signature. */
export const isSigned = (module: PdfRuntimeModule, document: Ptr): boolean => {
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
