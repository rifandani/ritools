/* oxlint-disable anti-slop/no-shape-in-symbol-names -- PdfOptions is the public export contract. */
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

import * as T from "../../../apps/web/src/features/tabular/tabular";
import type { FailureContext, WriteJob } from "../../../apps/web/src/features/tabular/tabular.format";
import { writePdf } from "../../../apps/web/src/features/tabular/tabular.pdf";
import {
  countPdfUnsupported,
  estimatePdfPages,
  pdfSectionOf,
  readPdfFont,
} from "../../../apps/web/src/features/tabular/tabular.pdf.metrics";

const here = import.meta.dirname;
const fontDir = path.join(here, "../../../apps/web/public/fonts/pdf");
const body = new Uint8Array(
  readFileSync(path.join(fontDir, "archivo-latin-400-normal.ttf"))
);
const title = new Uint8Array(
  readFileSync(path.join(fontDir, "archivo-latin-wdth125-wght900.ttf"))
);
const metrics = readPdfFont(body);
const text = (value: string): T.Value => ({ _tag: "Text", text: value });
const rows: T.Value[][] = [
  [text("Order"), text("Customer"), text("Amount"), text("Note")],
];
for (let i = 0; i < 60; i += 1) {
  rows.push([
    text(`#${String(i + 1).padStart(4, "0")}`),
    text(i % 7 === 0 ? "Ångström & Söhne" : `Customer ${i + 1}`),
    { _tag: "Number", value: i * 12.5 },
    text(
      i % 11 === 0
        ? "A longer note that wraps across more than one line in the report table."
        : "Short note"
    ),
  ]);
}
const sheet = {
  name: "Orders",
  visibility: "visible" as const,
  width: 4,
  header: true,
  rows,
};
const options: T.ExportOptions = {
  format: "pdf",
  scope: { _tag: "WholeSheet", sheetId: T.SheetId.make("orders") },
  delimiter: ",",
  newline: "lf",
  bom: false,
  textPolicy: "exact",
  jsonShape: "auto",
  pdf: { page: "a4", orientation: "portrait" },
  locale: "en-US",
};
const job: WriteJob = {
  format: "pdf",
  sourceName: "orders-2026.csv",
  sheets: [sheet],
  options,
  jsonShape: null,
  headers: true,
  locale: "en-US",
};
const ctx: FailureContext = {
  requestId: T.RequestId.make("pdf-proof"),
  operation: "exportBytes",
  sessionId: null,
};
const written = writePdf(job, { body, title }, ctx);
const out = path.join(here, "evidence/pdf-check.pdf");
writeFileSync(out, written.bytes);
const sections = [pdfSectionOf(sheet)];
const record = {
  checkedAt: new Date().toISOString(),
  file: "pdf-check.pdf",
  bytes: written.bytes.byteLength,
  pages: written.pages,
  estimatedPages: estimatePdfPages(metrics, sections, options.pdf ?? {
    page: "a4",
    orientation: "portrait",
  }),
  unsupportedCharacters: countPdfUnsupported(metrics, sections, "orders-2026.csv"),
  layout: written.layout,
  envelope: {
    head: new TextDecoder("latin1").decode(written.bytes.subarray(0, 5)),
    tail: new TextDecoder("latin1")
      .decode(written.bytes.subarray(-32))
      .trimEnd()
      .endsWith("%%EOF"),
  },
};
writeFileSync(
  path.join(here, "evidence/pdf-check.json"),
  `${JSON.stringify(record, null, 2)}\n`
);
console.log(JSON.stringify(record, null, 2));
