import { createPdfRuntime } from "@embedpdf/engine-runtime";
import type { PdfRuntimeModule } from "@embedpdf/engine-runtime";
import wasmUrl from "@embedpdf/engine-runtime-wasm32/wasm-url";

let runtime: PdfRuntimeModule | null = null;
let loading: Promise<PdfRuntimeModule> | null = null;

/**
 * Load and initialize the one PDFium runtime of a Worker. A failed load clears
 * the cache, so the next request tries again.
 */
export const loadFolioRuntime = async (): Promise<PdfRuntimeModule> => {
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
