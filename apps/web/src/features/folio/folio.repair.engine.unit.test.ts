import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";

import { createPdfRuntime } from "@embedpdf/engine-runtime";
import type { PdfRuntimeModule } from "@embedpdf/engine-runtime";
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
