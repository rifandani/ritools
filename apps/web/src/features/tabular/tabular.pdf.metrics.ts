/* oxlint-disable anti-slop/no-shape-in-symbol-names -- PdfOptions is the public export contract. */
/* oxlint-disable eslint/no-bitwise -- TTF cmap idDelta arithmetic is 16-bit. */
import type * as T from "./tabular";
import { display } from "./tabular.format";

/** Geometry shared by the PDF plan and the writer, in millimetres. */
export const PDF_MARGIN = 12;
export const PDF_BODY_SIZE = 8;
export const PDF_TITLE_SIZE = 18;
const PDF_LINE_HEIGHT = 3.4;
export const PDF_CELL_PADDING = 1.2;
export const PDF_TITLE_BLOCK = 26;
export const PDF_COMPACT_HEADER = 9;
export const PDF_FOOTER = 10;
const PDF_MAX_COLUMN_SHARE = 0.4;

const MM_PER_POINT = 25.4 / 72;
const PAGE_MM = {
  a4: [210, 297],
  letter: [215.9, 279.4],
} as const;

export interface PdfFontMetrics {
  readonly unitsPerEm: number;
  readonly glyphs: ReadonlyMap<number, number>;
  readonly fallbackAdvance: number;
}

export interface PdfSectionInput {
  readonly name: string;
  readonly header: boolean;
  readonly columns: number;
  readonly headerRow: readonly T.Value[] | null;
  readonly rows: readonly (readonly T.Value[])[];
}

export interface PdfSheetLike {
  readonly name: string;
  readonly header: boolean;
  readonly width: number;
  readonly rows: readonly (readonly T.Value[])[];
}

export const pdfSectionOf = (sheet: PdfSheetLike): PdfSectionInput => {
  const headerRow =
    sheet.header && sheet.rows.length ? (sheet.rows[0] ?? null) : null;
  return {
    name: sheet.name,
    header: sheet.header,
    columns: sheet.width,
    headerRow,
    rows: headerRow ? sheet.rows.slice(1) : sheet.rows,
  };
};

export interface PdfLayoutPage {
  readonly index: number;
  readonly section: number;
  readonly sheet: string;
  readonly header: boolean;
  readonly first: boolean;
}

export interface PdfLayout {
  readonly page: T.PdfOptions["page"];
  readonly orientation: T.PdfOptions["orientation"];
  readonly width: number;
  readonly height: number;
  readonly pages: readonly PdfLayoutPage[];
}

export interface PdfWritten {
  readonly bytes: Uint8Array;
  readonly pages: number;
  readonly layout: PdfLayout;
}

const table = (
  bytes: Uint8Array,
  tag: string
): { readonly offset: number; readonly length: number } | null => {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const count = view.getUint16(4);
  for (let i = 0; i < count; i += 1) {
    const at = 12 + i * 16;
    const name = String.fromCodePoint(
      bytes[at] ?? 0,
      bytes[at + 1] ?? 0,
      bytes[at + 2] ?? 0,
      bytes[at + 3] ?? 0
    );
    if (name === tag) {
      return {
        offset: view.getUint32(at + 8),
        length: view.getUint32(at + 12),
      };
    }
  }
  return null;
};

const cmapTable = (
  bytes: Uint8Array,
  cmap: { readonly offset: number; readonly length: number }
): { readonly offset: number; readonly format: 4 | 12 } | null => {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const count = view.getUint16(cmap.offset + 2);
  let best: { readonly offset: number; readonly format: 4 | 12 } | null = null;
  for (let i = 0; i < count; i += 1) {
    const at = cmap.offset + 4 + i * 8;
    const platform = view.getUint16(at);
    const encoding = view.getUint16(at + 2);
    const offset = cmap.offset + view.getUint32(at + 4);
    const format = view.getUint16(offset);
    const full = format === 12 || (platform === 3 && encoding === 10);
    const basic =
      format === 4 && (platform === 3 || (platform === 0 && encoding === 3));
    if (!full && !basic) {
      continue;
    }
    if (full && format === 12) {
      return { offset, format: 12 };
    }
    if (!best) {
      best = { offset, format: 4 };
    }
  }
  return best;
};

const readFormat4 = (
  view: DataView,
  offset: number,
  add: (codePoint: number, glyph: number) => void
): void => {
  const segCount = view.getUint16(offset + 6) / 2;
  const endCodes = offset + 14;
  const startCodes = endCodes + segCount * 2 + 2;
  const deltas = startCodes + segCount * 2;
  const rangeOffsets = deltas + segCount * 2;
  for (let segment = 0; segment < segCount; segment += 1) {
    const start = view.getUint16(startCodes + segment * 2);
    const end = view.getUint16(endCodes + segment * 2);
    const delta = view.getInt16(deltas + segment * 2);
    const range = view.getUint16(rangeOffsets + segment * 2);
    if (start === 0xff_ff && end === 0xff_ff) {
      continue;
    }
    for (let codePoint = start; codePoint <= end; codePoint += 1) {
      let glyph: number;
      if (range === 0) {
        glyph = (codePoint + delta) & 0xff_ff;
      } else {
        const at = rangeOffsets + segment * 2 + range + (codePoint - start) * 2;
        if (at + 2 > view.byteLength) {
          continue;
        }
        glyph = view.getUint16(at);
        if (glyph !== 0) {
          glyph = (glyph + delta) & 0xff_ff;
        }
      }
      if (glyph !== 0) {
        add(codePoint, glyph);
      }
    }
  }
};

const readFormat12 = (
  view: DataView,
  offset: number,
  add: (codePoint: number, glyph: number) => void
): void => {
  const groups = view.getUint32(offset + 12);
  for (let group = 0; group < groups; group += 1) {
    const at = offset + 16 + group * 12;
    const start = view.getUint32(at);
    const end = view.getUint32(at + 4);
    const glyph = view.getUint32(at + 8);
    for (let codePoint = start; codePoint <= end; codePoint += 1) {
      if (glyph + (codePoint - start) !== 0) {
        add(codePoint, glyph + (codePoint - start));
      }
    }
  }
};

/** Reads the TTF cmap and hmtx so the plan can count and measure glyphs. */
export const readPdfFont = (bytes: Uint8Array): PdfFontMetrics => {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const head = table(bytes, "head");
  const maxp = table(bytes, "maxp");
  const hhea = table(bytes, "hhea");
  const hmtx = table(bytes, "hmtx");
  const cmap = table(bytes, "cmap");
  if (!head || !maxp || !hhea || !hmtx || !cmap) {
    throw new Error("Invalid PDF font");
  }
  const unitsPerEm = view.getUint16(head.offset + 18);
  const numGlyphs = view.getUint16(maxp.offset + 4);
  const numberOfHMetrics = view.getUint16(hhea.offset + 34);
  const advances = new Map<number, number>();
  for (let glyph = 0; glyph < numberOfHMetrics; glyph += 1) {
    advances.set(glyph, view.getUint16(hmtx.offset + glyph * 4));
  }
  const lastAdvance =
    numberOfHMetrics > 0
      ? view.getUint16(hmtx.offset + (numberOfHMetrics - 1) * 4)
      : 0;
  const advance = (glyph: number) =>
    glyph < numberOfHMetrics
      ? (advances.get(glyph) ?? lastAdvance)
      : lastAdvance;
  const glyphs = new Map<number, number>();
  const add = (codePoint: number, glyph: number) => {
    if (glyph < numGlyphs) {
      glyphs.set(codePoint, advance(glyph));
    }
  };
  const selected = cmapTable(bytes, cmap);
  if (!selected) {
    throw new Error("Invalid PDF font cmap");
  }
  if (selected.format === 12) {
    readFormat12(view, selected.offset, add);
  } else {
    readFormat4(view, selected.offset, add);
  }
  const question = glyphs.get(0x3f);
  return {
    unitsPerEm: unitsPerEm || 1000,
    glyphs,
    fallbackAdvance: question ?? advance(0),
  };
};

const isLineBreak = (character: string) =>
  character === "\n" || character === "\r";

const supportsPdfCharacter = (
  metrics: PdfFontMetrics,
  character: string
): boolean => metrics.glyphs.has(character.codePointAt(0) ?? 0);

/** Every code point outside the embedded font, except structural line breaks. */
export const countUnsupportedCharacters = (
  metrics: PdfFontMetrics,
  text: string
): number => {
  let count = 0;
  for (const character of text) {
    if (!isLineBreak(character) && !supportsPdfCharacter(metrics, character)) {
      count += 1;
    }
  }
  return count;
};

/** Replaces a missing glyph with `?`; line breaks stay as structural breaks. */
export const replaceUnsupportedCharacters = (
  metrics: PdfFontMetrics,
  text: string
): string => {
  let out = "";
  for (const character of text) {
    if (character === "\r") {
      continue;
    }
    out +=
      character === "\n" || supportsPdfCharacter(metrics, character)
        ? character
        : "?";
  }
  return out;
};

const pageSize = (options: T.PdfOptions): readonly [number, number] => {
  const [width, height] = PAGE_MM[options.page];
  return options.orientation === "portrait" ? [width, height] : [height, width];
};

export const pdfPageSize = pageSize;

const advance = (metrics: PdfFontMetrics, character: string): number =>
  metrics.glyphs.get(character.codePointAt(0) ?? 0) ?? metrics.fallbackAdvance;

/** The widest explicit line, in millimetres. */
const pdfTextWidth = (
  metrics: PdfFontMetrics,
  text: string,
  fontSize = PDF_BODY_SIZE
): number => {
  let widest = 0;
  for (const line of text.replaceAll("\r", "").split("\n")) {
    let width = 0;
    for (const character of line) {
      width += advance(metrics, character);
    }
    widest = Math.max(widest, width);
  }
  return (widest / metrics.unitsPerEm) * fontSize * MM_PER_POINT;
};

const wrapCount = (
  metrics: PdfFontMetrics,
  text: string,
  width: number,
  fontSize = PDF_BODY_SIZE
): number => {
  let lines = 0;
  const limit = width + 0.5;
  for (const paragraph of text.replaceAll("\r", "").split("\n")) {
    let count = 1;
    let current = 0;
    for (const word of paragraph.split(" ")) {
      const wordWidth = pdfTextWidth(metrics, word, fontSize);
      const space = pdfTextWidth(metrics, " ", fontSize);
      if (wordWidth <= limit) {
        if (current > 0 && current + space + wordWidth > limit) {
          count += 1;
          current = wordWidth;
        } else {
          current += (current > 0 ? space : 0) + wordWidth;
        }
      } else {
        if (current > 0) {
          count += 1;
          current = 0;
        }
        let chunk = 0;
        for (const character of word) {
          const next = advance(metrics, character) / metrics.unitsPerEm;
          const charWidth = next * fontSize * MM_PER_POINT;
          if (chunk > 0 && chunk + charWidth > limit) {
            count += 1;
            chunk = 0;
          }
          chunk += charWidth;
        }
        current = chunk;
      }
    }
    lines += count;
  }
  return Math.max(1, lines);
};

const cellHeight = (
  metrics: PdfFontMetrics,
  value: T.Value | null,
  width: number
): number => {
  const text = value ? display(value) : "";
  const lines = wrapCount(metrics, text, width - PDF_CELL_PADDING * 2);
  return lines * PDF_LINE_HEIGHT + PDF_CELL_PADDING * 2;
};

/** Column widths come from the header and the first 200 data rows. */
export const pdfColumnWidths = (
  metrics: PdfFontMetrics,
  section: PdfSectionInput,
  available: number
): readonly number[] => {
  const minimum = pdfTextWidth(metrics, "MMM") + PDF_CELL_PADDING * 2;
  const maximum = available * PDF_MAX_COLUMN_SHARE;
  const widths = Array.from({ length: section.columns }, (_, column) => {
    let widest = pdfTextWidth(
      metrics,
      section.headerRow?.[column] ? display(section.headerRow[column]) : ""
    );
    for (const row of section.rows.slice(0, 200)) {
      widest = Math.max(
        widest,
        pdfTextWidth(metrics, row[column] ? display(row[column]) : "")
      );
    }
    return Math.min(maximum, Math.max(minimum, widest + PDF_CELL_PADDING * 2));
  });
  const total = widths.reduce((sum, width) => sum + width, 0);
  if (total > available) {
    const scale = available / total;
    return widths.map((width) => width * scale);
  }
  // Use the full page width while keeping the sampled proportions and the
  // 40% cap. A narrow table should not leave half the report empty.
  const filled = [...widths];
  let extra = available - total;
  while (extra > 0.01) {
    const adjustable: number[] = [];
    for (const [index, width] of filled.entries()) {
      if (width < maximum - 0.01) {
        adjustable.push(index);
      }
    }
    if (!adjustable.length) {
      break;
    }
    const share = extra / adjustable.length;
    for (const index of adjustable) {
      const add = Math.min(share, maximum - (filled[index] ?? 0));
      filled[index] = (filled[index] ?? 0) + add;
      extra -= add;
    }
  }
  return filled;
};

const sectionPages = (
  metrics: PdfFontMetrics,
  section: PdfSectionInput,
  options: T.PdfOptions
): number => {
  const [, height] = pageSize(options);
  const width = pageSize(options)[0] - PDF_MARGIN * 2;
  if (section.columns === 0) {
    return 1;
  }
  const widths = pdfColumnWidths(metrics, section, width);
  const headHeight =
    section.header && section.headerRow
      ? Math.max(
          ...section.headerRow.map((value, column) =>
            cellHeight(metrics, value, widths[column] ?? width)
          )
        )
      : 0;
  const firstCapacity = Math.max(
    1,
    height - PDF_MARGIN - PDF_FOOTER - PDF_TITLE_BLOCK - headHeight
  );
  const laterCapacity = Math.max(
    1,
    height - PDF_MARGIN - PDF_FOOTER - PDF_COMPACT_HEADER - headHeight
  );
  let pages = 1;
  let used = 0;
  let capacity = firstCapacity;
  for (const row of section.rows) {
    const rowHeight = Math.max(
      ...row.map((value, column) =>
        cellHeight(metrics, value, widths[column] ?? width)
      ),
      PDF_LINE_HEIGHT + PDF_CELL_PADDING * 2
    );
    let remaining = rowHeight;
    while (remaining > 0) {
      const room = Math.max(capacity - used, 0);
      if (remaining <= room) {
        used += remaining;
        remaining = 0;
      } else {
        remaining -= Math.max(room, 1);
        pages += 1;
        capacity = laterCapacity;
        used = 0;
      }
    }
  }
  return pages;
};

export const estimatePdfPages = (
  metrics: PdfFontMetrics,
  sections: readonly PdfSectionInput[],
  options: T.PdfOptions
): number =>
  sections.reduce(
    (total, section) => total + sectionPages(metrics, section, options),
    0
  );

/** Counts unsupported characters across every value the report renders. */
export const countPdfUnsupported = (
  metrics: PdfFontMetrics,
  sections: readonly PdfSectionInput[],
  sourceName: string
): number => {
  let count = countUnsupportedCharacters(metrics, sourceName);
  for (const section of sections) {
    count += countUnsupportedCharacters(metrics, section.name);
    for (const value of section.headerRow ?? []) {
      count += countUnsupportedCharacters(metrics, display(value));
    }
    for (const row of section.rows) {
      for (const value of row) {
        count += countUnsupportedCharacters(metrics, display(value));
      }
    }
  }
  return count;
};
