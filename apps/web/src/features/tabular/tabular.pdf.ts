/* oxlint-disable anti-slop/no-shape-in-symbol-names -- PdfOptions is the public export contract. */
import { jsPDF } from "jspdf";
import { autoTable } from "jspdf-autotable";

import * as T from "./tabular";
import { display } from "./tabular.format";
import type { FailureContext, OutputSheet, WriteJob } from "./tabular.format";
import {
  PDF_BODY_SIZE,
  PDF_CELL_PADDING,
  PDF_COMPACT_HEADER,
  PDF_FOOTER,
  PDF_MARGIN,
  PDF_TITLE_BLOCK,
  PDF_TITLE_SIZE,
  pdfColumnWidths,
  pdfPageSize,
  pdfSectionOf,
  readPdfFont,
  replaceUnsupportedCharacters,
} from "./tabular.pdf.metrics";
import type {
  PdfFontMetrics,
  PdfLayout,
  PdfLayoutPage,
  PdfWritten,
} from "./tabular.pdf.metrics";

export interface PdfAssets {
  readonly body: Uint8Array;
  readonly title: Uint8Array;
}

const toBase64 = (bytes: Uint8Array): string => {
  let binary = "";
  const chunk = 0x80_00;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCodePoint(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
};

const sanitize = (metrics: PdfFontMetrics, text: string): string =>
  replaceUnsupportedCharacters(metrics, text);

const sanitizeValue = (metrics: PdfFontMetrics, value: T.Value | undefined) =>
  sanitize(metrics, value ? display(value) : "");

const drawTitleBlock = (
  doc: jsPDF,
  metrics: PdfFontMetrics,
  sheet: OutputSheet,
  sourceName: string
): number => {
  doc.setFont("Archivo", "bold");
  doc.setFontSize(PDF_TITLE_SIZE);
  doc.setTextColor(17, 17, 17);
  doc.text(sanitize(metrics, sheet.name), PDF_MARGIN, PDF_MARGIN + 7);
  doc.setFont("Archivo", "normal");
  doc.setFontSize(9);
  doc.text(sanitize(metrics, sourceName), PDF_MARGIN, PDF_MARGIN + 13);
  const dataRows =
    sheet.header && sheet.rows.length
      ? sheet.rows.length - 1
      : sheet.rows.length;
  doc.text(`${dataRows} rows`, PDF_MARGIN, PDF_MARGIN + 18);
  doc.setDrawColor(215, 0, 26);
  doc.setLineWidth(0.8);
  doc.line(
    PDF_MARGIN,
    PDF_MARGIN + 21,
    doc.internal.pageSize.getWidth() - PDF_MARGIN,
    PDF_MARGIN + 21
  );
  return PDF_MARGIN + PDF_TITLE_BLOCK;
};

const drawCompactHeader = (
  doc: jsPDF,
  metrics: PdfFontMetrics,
  title: string
): void => {
  doc.setFont("Archivo", "bold");
  doc.setFontSize(PDF_BODY_SIZE);
  doc.setTextColor(17, 17, 17);
  doc.text(sanitize(metrics, title), PDF_MARGIN, PDF_MARGIN + 4);
  doc.setDrawColor(210, 210, 210);
  doc.setLineWidth(0.1);
  doc.line(
    PDF_MARGIN,
    PDF_MARGIN + 6.5,
    doc.internal.pageSize.getWidth() - PDF_MARGIN,
    PDF_MARGIN + 6.5
  );
};

const drawFooter = (
  doc: jsPDF,
  metrics: PdfFontMetrics,
  sourceName: string,
  page: number,
  total: number
): void => {
  const height = doc.internal.pageSize.getHeight();
  doc.setFont("Archivo", "normal");
  doc.setFontSize(7);
  doc.setTextColor(90, 90, 90);
  doc.text(sanitize(metrics, sourceName), PDF_MARGIN, height - 6);
  doc.text(
    `${page} / ${total}`,
    doc.internal.pageSize.getWidth() - PDF_MARGIN,
    height - 6,
    {
      align: "right",
    }
  );
};

const verify = (
  bytes: Uint8Array,
  pages: number,
  layout: PdfLayout,
  ctx: FailureContext
): void => {
  const head = new TextDecoder("latin1").decode(bytes.subarray(0, 5));
  const tail = new TextDecoder("latin1")
    .decode(bytes.subarray(Math.max(0, bytes.length - 32)))
    .trimEnd();
  if (
    head !== "%PDF-" ||
    !tail.endsWith("%%EOF") ||
    pages !== layout.pages.length ||
    layout.pages.some((page, index) => page.index !== index + 1)
  ) {
    throw new T.ExportVerificationFailed({ ...ctx, format: "pdf" });
  }
};

/** Writes one PDF report and checks its envelope, page count, and layout. */
// oxlint-disable-next-line eslint/complexity -- The writer owns section, page, and envelope verification in one pass.
export const writePdf = (
  job: WriteJob,
  assets: PdfAssets,
  ctx: FailureContext
): PdfWritten => {
  if (job.format !== "pdf" || !job.options.pdf) {
    throw new T.InvalidRequest({ ...ctx, field: "export.options.pdf" });
  }
  if (!job.sheets.length) {
    throw new T.InvalidRequest({ ...ctx, field: "sheets" });
  }
  const metrics = readPdfFont(assets.body);
  const options = job.options.pdf;
  const [width, height] = pdfPageSize(options);
  const doc = new jsPDF({
    unit: "mm",
    format: options.page,
    orientation: options.orientation,
    compress: true,
  });
  doc.setLanguage(job.locale === "id-ID" ? "id" : "en-US");
  doc.setProperties({
    title: sanitize(metrics, job.sourceName),
    creator: "Tabular",
    subject: job.sheets
      .map((sheet) => sanitize(metrics, sheet.name))
      .join(", "),
  });
  doc.addFileToVFS("archivo-400.ttf", toBase64(assets.body));
  doc.addFont("archivo-400.ttf", "Archivo", "normal");
  doc.addFileToVFS("archivo-900.ttf", toBase64(assets.title));
  doc.addFont("archivo-900.ttf", "Archivo", "bold");

  const sections = job.sheets.map(pdfSectionOf);
  const ranges: { readonly first: number; readonly last: number }[] = [];
  for (const [index, section] of sections.entries()) {
    if (index > 0) {
      doc.addPage();
    }
    const sheet = job.sheets[index];
    if (!sheet) {
      throw new T.InvalidRequest({ ...ctx, field: "sheets" });
    }
    const startY = drawTitleBlock(doc, metrics, sheet, job.sourceName);
    const first = doc.getNumberOfPages();
    if (section.columns > 0) {
      const available = width - PDF_MARGIN * 2;
      const widths = pdfColumnWidths(metrics, section, available);
      const head =
        section.header && section.headerRow
          ? [
              Array.from({ length: section.columns }, (_, column) =>
                sanitizeValue(metrics, section.headerRow?.[column])
              ),
            ]
          : undefined;
      const body = section.rows.map((row) =>
        Array.from({ length: section.columns }, (_, column) =>
          sanitizeValue(metrics, row[column])
        )
      );
      autoTable(doc, {
        head,
        body,
        startY,
        margin: {
          top: PDF_MARGIN + PDF_COMPACT_HEADER,
          bottom: PDF_FOOTER,
          left: PDF_MARGIN,
          right: PDF_MARGIN,
        },
        tableWidth: widths.reduce((sum, column) => sum + column, 0),
        showHead: "everyPage",
        rowPageBreak: "avoid",
        theme: "grid",
        styles: {
          font: "Archivo",
          fontSize: PDF_BODY_SIZE,
          cellPadding: PDF_CELL_PADDING,
          lineColor: [210, 210, 210],
          lineWidth: 0.1,
          overflow: "linebreak",
          textColor: [17, 17, 17],
          valign: "top",
        },
        headStyles: {
          fillColor: [30, 30, 30],
          font: "Archivo",
          fontStyle: "bold",
          lineColor: [30, 30, 30],
          lineWidth: 0.1,
          textColor: [255, 255, 255],
        },
        columnStyles: Object.fromEntries(
          widths.map((columnWidth, column) => [
            String(column),
            { cellWidth: columnWidth },
          ])
        ),
      });
    }
    ranges.push({ first, last: doc.getNumberOfPages() });
  }

  const pages = doc.getNumberOfPages();
  for (const [index, range] of ranges.entries()) {
    const section = job.sheets[index];
    if (!section) {
      continue;
    }
    const title = job.sheets.length === 1 ? section.name : job.sourceName;
    for (let page = range.first + 1; page <= range.last; page += 1) {
      doc.setPage(page);
      drawCompactHeader(doc, metrics, title);
    }
  }
  for (let page = 1; page <= pages; page += 1) {
    doc.setPage(page);
    drawFooter(doc, metrics, job.sourceName, page, pages);
  }
  const layoutPages: PdfLayoutPage[] = [];
  for (const [index, range] of ranges.entries()) {
    const section = sections[index];
    if (!section) {
      continue;
    }
    for (let page = range.first; page <= range.last; page += 1) {
      layoutPages.push({
        index: page,
        section: index,
        sheet: section.name,
        header:
          section.columns > 0 && section.header && section.headerRow !== null,
        first: page === range.first,
      });
    }
  }
  const layout: PdfLayout = {
    page: options.page,
    orientation: options.orientation,
    width,
    height,
    pages: layoutPages,
  };
  const bytes = new Uint8Array(doc.output("arraybuffer"));
  verify(bytes, pages, layout, ctx);
  return { bytes, pages, layout };
};
