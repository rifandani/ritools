/// <reference lib="webworker" />

import { createPdfRuntime } from "@embedpdf/engine-runtime";
import type { PdfRuntimeModule } from "@embedpdf/engine-runtime";
import wasmUrl from "@embedpdf/engine-runtime-wasm32/wasm-url";

import type {
  FolioProtectReply,
  FolioProtectRequest,
} from "./folio.protect.types";

/** The PDF save flag that rewrites the file instead of appending to it. */
const PDF_NO_INCREMENTAL = 2;

let runtime: Promise<PdfRuntimeModule> | null = null;

const loadRuntime = () => {
  runtime ??= createPdfRuntime({ wasmUrl });
  return runtime;
};

const protect = async (request: FolioProtectRequest): Promise<ArrayBuffer> => {
  const { fn, mem } = await loadRuntime();
  const input = new Uint8Array(request.bytes);
  const data = mem.alloc(input.byteLength);
  const size = mem.alloc(8);

  try {
    mem.writeBytes(data, input);
    mem.poke(size, "i32", 0);
    const document = fn.EPDF_LoadMemBaseDocument64(data, input.byteLength, "");
    if (!document) {
      throw new Error("the PDF could not be opened");
    }

    try {
      if (
        !fn.EPDF_SetEncryption(
          document,
          request.userPassword,
          request.ownerPassword,
          request.flags
        )
      ) {
        throw new Error("the PDF could not be protected");
      }
      const output = fn.EPDF_SaveDocumentToOwnedBuffer(
        document,
        PDF_NO_INCREMENTAL,
        size
      );
      const length = Number(mem.peek(size, "i32"));
      if (!output || length <= 0) {
        throw new Error("the protected PDF could not be written");
      }

      try {
        const bytes = mem.readBytes(output, length);
        const protectedBytes = new ArrayBuffer(bytes.byteLength);
        new Uint8Array(protectedBytes).set(bytes);
        return protectedBytes;
      } finally {
        fn.EPDF_FreeBuffer(output);
      }
    } finally {
      fn.EPDF_ReleaseBaseDocument(document);
    }
  } finally {
    mem.free(size);
    mem.free(data);
  }
};

// SAFETY: this module runs only as the dedicated worker created in folio.protect.ts,
// where `self` is a DedicatedWorkerGlobalScope.
const worker = self as DedicatedWorkerGlobalScope;

worker.addEventListener(
  "message",
  async (event: MessageEvent<FolioProtectRequest>) => {
    const request = event.data;
    let reply: FolioProtectReply;
    try {
      reply = { bytes: await protect(request), id: request.id, ok: true };
    } catch (error) {
      reply = {
        id: request.id,
        message: error instanceof Error ? error.message : "protection failed",
        ok: false,
      };
    }
    // SAFETY: the reply carries one ArrayBuffer, and the worker owns it after post.
    worker.postMessage(reply, reply.ok ? [reply.bytes] : []);
  }
);
