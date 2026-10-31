/* oxlint-disable promise/prefer-await-to-callbacks -- the engine registers synchronous callbacks, and these stubs call them directly. */
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";

import { NULL_PTR, createPdfRuntime } from "@embedpdf/engine-runtime";
import type { CallbackFn, PdfRuntimeModule } from "@embedpdf/engine-runtime";
import { beforeAll, describe, expect, it } from "vitest";

import { repairPdf } from "./folio.repair.engine";

const fixtures = path.join(import.meta.dirname, "fixtures");
const fixture = async (name: string) =>
  new Uint8Array(await readFile(path.join(fixtures, name)));

let module: PdfRuntimeModule;

beforeAll(async () => {
  module = await createPdfRuntime({ prefer: "wasm" });
  module.fn.FPDF_InitLibrary();
});

/** Open bytes in a fresh document and read what a test checks. */
const reopen = (bytes: Uint8Array) => {
  const { fn, mem } = module;
  const data = mem.alloc(bytes.byteLength);
  mem.writeBytes(data, bytes);
  const document = fn.FPDF_LoadMemDocument64(data, bytes.byteLength, "");
  try {
    return {
      opened: Boolean(document),
      pages: document ? fn.FPDF_GetPageCount(document) : 0,
      validTable: document
        ? fn.FPDF_DocumentHasValidCrossReferenceTable(document)
        : false,
    };
  } finally {
    if (document) {
      fn.FPDF_CloseDocument(document);
    }
    mem.free(data);
  }
};

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
 * Replace the engine's save with a write of `bytes`, or a failed write when
 * `bytes` is null. The stub holds the callback that `saveDocument` registers.
 */
const stubSave = (bytes: Uint8Array | null): (() => void) => {
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
    if (!(bytes && handler)) {
      return false;
    }
    const data = mem.alloc(bytes.byteLength);
    mem.writeBytes(data, bytes);
    try {
      handler(0n, data, BigInt(bytes.byteLength));
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

/** Run `body` with one engine function replaced, then put the real one back. */
const withFn = <K extends keyof Functions>(
  key: K,
  stub: Functions[K],
  body: () => void
): void => {
  const restore = stubFn(key, stub);
  try {
    body();
  } finally {
    restore();
  }
};

/** Run `body` with the engine's save replaced, then put the real one back. */
const withSave = (bytes: Uint8Array | null, body: () => void): void => {
  const restore = stubSave(bytes);
  try {
    body();
  } finally {
    restore();
  }
};

/** The failure a repair reports when no path yields a verified copy. */
const unverified = (check: string, repairPath: "rewrite" | "rebuild") => ({
  attempts: [{ check, path: repairPath }],
  reason: "unverified",
  type: "failed",
});

/** What a rebuild from pages reports as lost for one fixture. */
const rebuildLostOf = async (name: string) => {
  const result = repairPdf(module, await fixture(name), {
    paths: ["rebuild"],
  });
  return result.type === "repaired" ? result.lost : result;
};

describe("the damaged fixture", () => {
  it("matches its manifest entry", async () => {
    const manifest = JSON.parse(
      await readFile(path.join(fixtures, "manifest.json"), "utf-8")
    );
    const bytes = await fixture("broken-xref.pdf");
    expect(
      manifest.fixtures.find(
        (entry: { readonly name: string }) => entry.name === "broken-xref.pdf"
      )
    ).toEqual({
      bytes: bytes.byteLength,
      name: "broken-xref.pdf",
      sha256: createHash("sha256").update(bytes).digest("hex"),
    });
  });

  it("opens in the engine only after the engine rebuilds its table", async () => {
    expect(reopen(await fixture("broken-xref.pdf"))).toEqual({
      opened: true,
      pages: 10,
      validTable: false,
    });
  });
});

describe("repairPdf", () => {
  it("rewrites a file with a broken cross-reference table", async () => {
    const source = await fixture("broken-xref.pdf");
    const before = new Uint8Array(source);
    const result = repairPdf(module, source);
    expect(result).toMatchObject({
      damaged: true,
      lost: [],
      pages: 10,
      path: "rewrite",
      type: "repaired",
    });
    if (result.type !== "repaired") {
      throw new Error(`expected a repaired copy, got ${result.type}`);
    }
    expect(reopen(result.bytes)).toEqual({
      opened: true,
      pages: 10,
      validTable: true,
    });
    expect(source).toEqual(before);
  });

  it("names the error for a file the engine cannot open", async () => {
    expect(repairPdf(module, await fixture("corrupt.pdf"))).toEqual({
      attempts: [],
      reason: "unreadable",
      type: "failed",
    });
  });

  it("names the error for a file without pages", async () => {
    expect(repairPdf(module, await fixture("pages-0.pdf"))).toEqual({
      attempts: [],
      reason: "empty",
      type: "failed",
    });
  });

  it("refuses an encrypted file", async () => {
    expect(repairPdf(module, await fixture("encrypted.pdf"))).toEqual({
      reason: "encrypted",
      type: "refused",
    });
  });

  it("refuses a signed file", async () => {
    expect(repairPdf(module, await fixture("signed.pdf"))).toEqual({
      reason: "signed",
      type: "refused",
    });
  });

  it("rebuilds from the pages and names what the rebuild lost", async () => {
    const result = repairPdf(module, await fixture("broken-xref.pdf"), {
      paths: ["rebuild"],
    });
    expect(result).toMatchObject({
      lost: ["metadata"],
      pages: 10,
      path: "rebuild",
      type: "repaired",
    });
  });

  it("reports the outlines, attachments, and scripts a rebuild drops", async () => {
    await expect(rebuildLostOf("structure.pdf")).resolves.toContain("outlines");
    await expect(rebuildLostOf("attachments.pdf")).resolves.toContain(
      "attachments"
    );
    await expect(rebuildLostOf("script.pdf")).resolves.toContain("javascript");
    await expect(rebuildLostOf("all-forms.pdf")).resolves.toContain("forms");
  });

  it("keeps every structure the rewrite loaded", async () => {
    const result = repairPdf(module, await fixture("structure.pdf"));
    expect(result).toMatchObject({
      attempts: [],
      damaged: false,
      lost: [],
      path: "rewrite",
      type: "repaired",
    });
  });

  it("reports progress for each verified page", async () => {
    const seen: string[] = [];
    repairPdf(module, await fixture("broken-xref.pdf"), {
      onProgress: ({ done, path: step, total }) => {
        seen.push(`${step} ${done}/${total}`);
      },
    });
    expect(seen).toEqual(
      Array.from({ length: 10 }, (_, index) => `rewrite ${index + 1}/10`)
    );
  });
});

describe("a repair without a verified copy", () => {
  it("reports a write the engine refused", async () => {
    const source = await fixture("broken-xref.pdf");
    withSave(null, () => {
      expect(repairPdf(module, source, { paths: ["rewrite"] })).toEqual(
        unverified("write", "rewrite")
      );
    });
  });

  it("reports the check a copy fails", async () => {
    const source = await fixture("broken-xref.pdf");
    const copy = await fixture("pages-1.pdf");
    withSave(copy, () => {
      expect(repairPdf(module, source, { paths: ["rewrite"] })).toEqual(
        unverified("pages", "rewrite")
      );
    });
  });

  it("reports a copy that does not open", async () => {
    const source = await fixture("broken-xref.pdf");
    const copy = await fixture("corrupt.pdf");
    withSave(copy, () => {
      expect(repairPdf(module, source, { paths: ["rewrite"] })).toEqual(
        unverified("opens", "rewrite")
      );
    });
  });

  it("reports a copy the engine reads as encrypted", async () => {
    const source = await fixture("broken-xref.pdf");
    let calls = 0;
    withFn(
      "EPDF_IsEncrypted",
      () => {
        calls += 1;
        return calls > 1;
      },
      () => {
        withSave(source, () => {
          expect(repairPdf(module, source, { paths: ["rewrite"] })).toEqual(
            unverified("opens", "rewrite")
          );
        });
      }
    );
  });

  it("refuses a document the engine reads as encrypted", async () => {
    const source = await fixture("broken-xref.pdf");
    withFn("EPDF_IsEncrypted", () => true, () => {
      expect(repairPdf(module, source)).toEqual({
        reason: "encrypted",
        type: "refused",
      });
    });
  });

  it("reports a rebuild that cannot create a document", async () => {
    const source = await fixture("broken-xref.pdf");
    withFn("FPDF_CreateNewDocument", () => NULL_PTR, () => {
      expect(repairPdf(module, source, { paths: ["rebuild"] })).toEqual(
        unverified("write", "rebuild")
      );
    });
  });

  it("reports a rebuild that cannot import the pages", async () => {
    const source = await fixture("broken-xref.pdf");
    withFn("FPDF_ImportPagesByIndex", () => false, () => {
      expect(repairPdf(module, source, { paths: ["rebuild"] })).toEqual(
        unverified("write", "rebuild")
      );
    });
  });

  it("records a page the engine cannot load", async () => {
    const source = await fixture("broken-xref.pdf");
    withFn("FPDF_LoadPage", () => NULL_PTR, () => {
      expect(repairPdf(module, source, { paths: ["rewrite"] })).toEqual(
        unverified("render", "rewrite")
      );
    });
  });

  it("repairs a document whose text the engine cannot read", async () => {
    const source = await fixture("broken-xref.pdf");
    withFn("FPDFText_LoadPage", () => NULL_PTR, () => {
      expect(
        repairPdf(module, source, { paths: ["rewrite"] })
      ).toMatchObject({ lost: [], path: "rewrite", type: "repaired" });
    });
  });

  it("records a page the engine cannot render", async () => {
    const source = await fixture("broken-xref.pdf");
    withFn("FPDFBitmap_Create", () => NULL_PTR, () => {
      expect(repairPdf(module, source, { paths: ["rewrite"] })).toEqual(
        unverified("render", "rewrite")
      );
    });
  });

  it("records a page whose pixels the engine cannot read", async () => {
    const source = await fixture("broken-xref.pdf");
    withFn("FPDFBitmap_GetBuffer", () => NULL_PTR, () => {
      expect(repairPdf(module, source, { paths: ["rewrite"] })).toEqual(
        unverified("render", "rewrite")
      );
    });
  });
});
