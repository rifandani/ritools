/* oxlint-disable promise/prefer-await-to-callbacks -- the engine registers synchronous callbacks, and these stubs call them directly. */
import { NULL_PTR, createPdfRuntime } from "@embedpdf/engine-runtime";
import type { CallbackFn, PdfRuntimeModule, Ptr } from "@embedpdf/engine-runtime";
import { beforeAll, describe, expect, it } from "vitest";

import { isSigned, saveDocument } from "./folio.pdfium";

let module: PdfRuntimeModule;

beforeAll(async () => {
  module = await createPdfRuntime({ prefer: "wasm" });
  module.fn.FPDF_InitLibrary();
});

type Functions = PdfRuntimeModule["fn"];

/** Replace one engine function and return the call that puts it back. */
const stubFn = <K extends keyof Functions>(
  key: K,
  stub: Functions[K]
): (() => void) => {
  const real = module.fn[key];
  module.fn[key] = stub;
  return () => {
    module.fn[key] = real;
  };
};

/**
 * Replace the engine's save. The callback that `saveDocument` registers
 * receives `bytes`, or a value that is not an address for `"bad-address"`.
 * A null write fails the way a refused save does.
 */
const stubSave = (bytes: Uint8Array | "bad-address" | null): (() => void) => {
  const { cb, fn, mem } = module;
  const { register } = cb;
  const save = fn.FPDF_SaveAsCopy;
  let handler: CallbackFn | null = null;
  // SAFETY: the wrapper keeps the runtime's declared registration signature
  // and only records the callback it hands to the real table.
  cb.register = ((kind: string, callback: CallbackFn) => {
    handler = callback;
    return register(kind, callback);
  }) as typeof cb.register;
  fn.FPDF_SaveAsCopy = () => {
    if (!(handler && bytes)) {
      return false;
    }
    const registered = handler;
    if (bytes === "bad-address") {
      registered(0n, "not-an-address", 0n);
      return true;
    }
    const data = mem.alloc(bytes.byteLength);
    mem.writeBytes(data, bytes);
    try {
      // A number address covers the runtime's non-bigint pointer path.
      registered(0n, Number(data), BigInt(bytes.byteLength));
    } finally {
      mem.free(data);
    }
    return true;
  };
  return () => {
    fn.FPDF_SaveAsCopy = save;
    cb.register = register;
  };
};

describe("saveDocument", () => {
  it("returns null when the engine cannot write a copy", () => {
    const restore = stubSave(null);
    try {
      expect(saveDocument(module, NULL_PTR)).toBeNull();
    } finally {
      restore();
    }
  });

  it("collects the bytes the callback receives", () => {
    const bytes = new Uint8Array([1, 2, 3, 4]);
    const restore = stubSave(bytes);
    try {
      expect(saveDocument(module, NULL_PTR)).toEqual(bytes);
    } finally {
      restore();
    }
  });

  it("throws when the callback receives no address", () => {
    const restore = stubSave("bad-address");
    try {
      expect(() => saveDocument(module, NULL_PTR)).toThrow(
        "the PDF callback did not receive an address"
      );
    } finally {
      restore();
    }
  });

  it("frees the struct when the callback does not register", () => {
    const { cb, mem } = module;
    const { register } = cb;
    const { free } = mem;
    let freed = 0;
    mem.free = (ptr) => {
      freed += 1;
      free(ptr);
    };
    cb.register = () => {
      throw new Error("the callback table is full");
    };
    try {
      expect(() => saveDocument(module, NULL_PTR)).toThrow(
        "the callback table is full"
      );
      expect(freed).toBe(1);
    } finally {
      cb.register = register;
      mem.free = free;
    }
  });
});

describe("isSigned", () => {
  it("reports a document without a signature model as unsigned", () => {
    const restore = stubFn("EPDFSig_LoadModel", () => NULL_PTR);
    try {
      expect(isSigned(module, NULL_PTR)).toBe(false);
    } finally {
      restore();
    }
  });

  it("reports a model with no signature as unsigned", () => {
    // SAFETY: PDFium treats the model pointer as opaque, and the stub only
    // checks that it is non-null before the model is closed.
    const model = 1n as Ptr;
    const { fn } = module;
    const count = fn.EPDFSig_Count;
    const isSignature = fn.EPDFSig_IsSigned;
    const close = fn.EPDFSig_CloseModel;
    let closed = 0;
    const restore = stubFn("EPDFSig_LoadModel", () => model);
    fn.EPDFSig_Count = () => 1;
    fn.EPDFSig_IsSigned = () => false;
    fn.EPDFSig_CloseModel = () => {
      closed += 1;
    };
    try {
      expect(isSigned(module, NULL_PTR)).toBe(false);
      expect(closed).toBe(1);
    } finally {
      fn.EPDFSig_Count = count;
      fn.EPDFSig_IsSigned = isSignature;
      fn.EPDFSig_CloseModel = close;
      restore();
    }
  });
});
