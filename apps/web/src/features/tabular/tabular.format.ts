/* oxlint-disable eslint/no-control-regex -- The explicit spreadsheet-safe policy includes leading control characters. */
/* oxlint-disable anti-slop/no-shape-in-symbol-names, anti-slop/no-runtime-typeof -- jsonShape is fixed by contract; SheetJS scalar types are checked at the parser boundary. */
import { unzipSync } from "fflate";
import Papa from "papaparse";
import * as XLSX from "xlsx";

import * as T from "./tabular";

/** Private parser boundary. Only normalized values leave the format job Worker. */
export interface StoredCell {
  readonly value: T.Value;
  readonly origin: T.Cell["origin"];
}
export interface ParsedSheet {
  readonly name: string;
  readonly visibility: T.Visibility;
  readonly width: number;
  readonly rows: readonly (readonly StoredCell[])[];
  readonly header: boolean;
  readonly warnings: readonly {
    code: T.WarningCode;
    count: number;
    sourceRecord?: number;
  }[];
}
export interface ParsedFile {
  readonly source: T.Source;
  readonly format: T.InputFormat;
  readonly sheets: readonly ParsedSheet[];
  readonly encoding: T.Candidate["encoding"];
  readonly delimiter: T.Candidate["delimiter"];
  readonly newline: T.Candidate["newline"];
  readonly bom: boolean;
}
export interface FailureContext {
  readonly requestId: T.RequestId;
  readonly operation: string;
  readonly sessionId: T.SessionId | null;
}
export const textCell = (text: string): StoredCell => ({
  value: { _tag: "Text", text },
  origin: "text",
});
export const blankCell: StoredCell = {
  value: { _tag: "Blank" },
  origin: "workbook",
};
export const display = (v: T.Value): string => {
  switch (v._tag) {
    case "Text": {
      return v.text;
    }
    case "Number": {
      return String(v.value);
    }
    case "Boolean": {
      return String(v.value);
    }
    case "Blank": {
      return "";
    }
    case "Unresolved": {
      return v.display;
    }
    default: {
      const unreachable: never = v;
      return unreachable;
    }
  }
};
export const equalValue = (a: T.Value, b: T.Value): boolean => {
  if (a._tag !== b._tag) {
    return false;
  }
  return JSON.stringify(a) === JSON.stringify(b);
};
const scalar = (value: T.Value): string | number | boolean | null => {
  switch (value._tag) {
    case "Text": {
      return value.text;
    }
    case "Number": {
      return value.value;
    }
    case "Boolean": {
      return value.value;
    }
    case "Blank": {
      return null;
    }
    case "Unresolved": {
      throw new Error("Unresolved output reached writer");
    }
    default: {
      const unreachable: never = value;
      return unreachable;
    }
  }
};

const decode = (
  source: T.Source,
  options: T.ParseOptions,
  ctx: FailureContext
) => {
  const b = source.bytes;
  const bomEncoding =
    b[0] === 0xef && b[1] === 0xbb && b[2] === 0xbf
      ? "utf-8"
      : b[0] === 0xff && b[1] === 0xfe
        ? "utf-16le"
        : b[0] === 0xfe && b[1] === 0xff
          ? "utf-16be"
          : null;
  let encoding: T.Encoding = "utf-8";
  let basis: NonNullable<T.Candidate["encoding"]>["basis"] = "valid-utf8";
  let ambiguous = false;
  if (options.encoding !== "auto") {
    ({ encoding } = options);
    basis = "user";
  } else if (bomEncoding) {
    encoding = bomEncoding;
    basis = "bom";
  } else {
    const sample = b.subarray(0, 4096);
    let even = 0;
    let odd = 0;
    for (let i = 0; i < sample.length; i += 1) {
      if (sample[i] === 0) {
        if (i % 2) {
          odd += 1;
        } else {
          even += 1;
        }
      }
    }
    if (odd > sample.length / 8 || even > sample.length / 8) {
      encoding = odd > even ? "utf-16le" : "utf-16be";
      basis = "heuristic";
      ambiguous = true;
    } else {
      try {
        new TextDecoder("utf-8", { fatal: true }).decode(b);
      } catch {
        encoding = "windows-1252";
        basis = "heuristic";
        ambiguous = true;
      }
    }
  }
  let text: string;
  try {
    text = new TextDecoder(encoding, { fatal: true }).decode(b);
  } catch {
    throw new T.InvalidEncoding({ ...ctx, encoding, byteOffset: 0 });
  }
  return {
    text,
    encoding: {
      value: encoding,
      basis,
      ambiguous,
      alternatives: (
        ["utf-8", "utf-16le", "utf-16be", "windows-1252"] as const
      ).filter((e) => e !== encoding),
    },
    bom: bomEncoding !== null,
  };
};

/** Papa accepts some illegal quote placements. Validate grammar before parsing. */
// oxlint-disable-next-line eslint/complexity -- This strict CSV state machine rejects quote repair before Papa Parse runs.
export const parseText = (
  text: string,
  delimiter: T.Delimiter,
  ctx: FailureContext
): string[][] => {
  if (!text.length) {
    return [];
  }
  let state: "start" | "plain" | "quoted" | "closed" = "start";
  let record = 1;
  let column = 1;
  for (let i = 0; i < text.length; i += 1) {
    const c = text[i];
    if (c && c < " " && c !== "\t" && c !== "\r" && c !== "\n") {
      throw new T.InvalidDelimitedText({ ...ctx, record, column });
    }
    if (state === "quoted") {
      if (c === '"') {
        if (text[i + 1] === '"') {
          i += 1;
        } else {
          state = "closed";
        }
      }
      continue;
    }
    if (c === delimiter) {
      column += 1;
      state = "start";
    } else if (c === "\r" || c === "\n") {
      if (c === "\r" && text[i + 1] === "\n") {
        i += 1;
      }
      record += 1;
      column = 1;
      state = "start";
    } else if (c === '"' && state === "start") {
      state = "quoted";
    } else if (c === '"' || state === "closed") {
      throw new T.InvalidDelimitedText({ ...ctx, record, column });
    } else {
      state = "plain";
    }
  }
  if (state === "quoted") {
    throw new T.InvalidDelimitedText({ ...ctx, record, column });
  }
  const result = Papa.parse<string[]>(text, {
    delimiter,
    header: false,
    dynamicTyping: false,
    skipEmptyLines: false,
  });
  if (result.errors.length) {
    throw new T.InvalidDelimitedText({
      ...ctx,
      record: (result.errors[0]?.row ?? 0) + 1,
      column: 1,
    });
  }
  const rows = result.data;
  if (
    /[\r\n]$/u.test(text) &&
    rows.at(-1)?.length === 1 &&
    rows.at(-1)?.[0] === ""
  ) {
    rows.pop();
  }
  return rows;
};
const detectDelimiter = (
  text: string,
  options: T.ParseOptions,
  ctx: FailureContext
): NonNullable<T.Candidate["delimiter"]> => {
  if (options.delimiter !== "auto") {
    return {
      value: options.delimiter,
      basis: "user",
      ambiguous: false,
      alternatives: [],
    };
  }
  // Cut the sample only outside quotes, at a complete record boundary.
  let end = text.length;
  let quoted = false;
  for (let i = 0; i < text.length; i += 1) {
    if (text[i] === '"') {
      if (quoted && text[i + 1] === '"') {
        i += 1;
      } else {
        quoted = !quoted;
      }
    }
    if (i >= 65_536 && !quoted && (text[i] === "\n" || text[i] === "\r")) {
      end = i;
      break;
    }
  }
  const ranked = ([",", ";", "\t", "|"] as const)
    .map((value) => {
      try {
        const rows = parseText(text.slice(0, end), value, ctx);
        const width = rows[0]?.length ?? 1;
        return {
          value,
          width,
          consistent: rows.every((r) => r.length === width),
        };
      } catch {
        return { value, width: 0, consistent: false };
      }
    })
    .toSorted(
      (a, b) =>
        Number(b.consistent && b.width > 1) -
          Number(a.consistent && a.width > 1) || b.width - a.width
    );
  const [best] = ranked;
  return {
    value: best?.value ?? ",",
    basis: "heuristic",
    ambiguous:
      !best?.consistent || best.width <= 1 || ranked[1]?.width === best.width,
    alternatives: ranked.slice(1).map((r) => r.value),
  };
};
const workbookCell = (
  cell: XLSX.CellObject | undefined,
  date1904: boolean
): StoredCell => {
  if (!cell || cell.t === "z") {
    return blankCell;
  }
  const origin = cell.f ? "stored-formula" : "workbook";
  const unresolved = (
    reason: Extract<T.Value, { _tag: "Unresolved" }>["reason"],
    label: string
  ): StoredCell => ({
    value: { _tag: "Unresolved", reason, display: label },
    origin,
  });
  if (cell.f && (cell.v === undefined || cell.v === null)) {
    return unresolved("missing-formula-result", "Missing stored result");
  }
  if (cell.t === "e") {
    return unresolved(cell.f ? "formula-error" : "cell-error", "Cell error");
  }
  if (cell.t === "n" && typeof cell.v === "number" && Number.isFinite(cell.v)) {
    if (cell.z && XLSX.SSF.is_date(cell.z)) {
      return {
        value: {
          _tag: "Text",
          text: XLSX.SSF.format(cell.z, cell.v, { date1904 }),
        },
        origin: "date-display",
      };
    }
    return { value: { _tag: "Number", value: cell.v }, origin };
  }
  if (cell.t === "b" && typeof cell.v === "boolean") {
    return { value: { _tag: "Boolean", value: cell.v }, origin };
  }
  if (cell.t === "s" && typeof cell.v === "string") {
    return { value: { _tag: "Text", text: cell.v }, origin };
  }
  return unresolved("unsupported-value", "Unsupported value");
};
// oxlint-disable-next-line eslint/complexity -- All supported container signatures are checked at this boundary.
const sniff = (source: T.Source, ctx: FailureContext): T.InputFormat => {
  const b = source.bytes;
  const ext = source.name.split(".").at(-1)?.toLowerCase();
  if (b[0] === 0x50 && b[1] === 0x4b) {
    let entries: Record<string, Uint8Array>;
    try {
      entries = unzipSync(b, {
        filter: (file) =>
          /^(?:\[Content_Types\]\.xml|xl\/workbook\.xml|EncryptionInfo|EncryptedPackage)$/u.test(
            file.name
          ),
      });
    } catch {
      throw new T.CorruptFile(ctx);
    }
    const names = Object.keys(entries);
    if (
      names.includes("EncryptionInfo") ||
      names.includes("EncryptedPackage")
    ) {
      throw new T.EncryptedFile(ctx);
    }
    const types = new TextDecoder().decode(entries["[Content_Types].xml"]);
    if (
      !names.includes("xl/workbook.xml") ||
      !types.includes(
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"
      ) ||
      /<Override[^>]*ContentType="[^"]*(?:macroEnabled|vbaProject)/u.test(types)
    ) {
      throw new T.UnsupportedFormat({ ...ctx, detected: "unsupported-zip" });
    }
    return "xlsx";
  }
  if (b[0] === 0xd0 && b[1] === 0xcf && b[2] === 0x11 && b[3] === 0xe0) {
    return "xls";
  }
  if ((b[0] === 9 || b[0] === 0x09) && [0, 2, 4, 8].includes(b[1] ?? -1)) {
    return "xls";
  }
  const prefixEncoding =
    b[0] === 0xff && b[1] === 0xfe
      ? "utf-16le"
      : b[0] === 0xfe && b[1] === 0xff
        ? "utf-16be"
        : "utf-8";
  const prefix = new TextDecoder(prefixEncoding).decode(b.subarray(0, 2048));
  if (/urn:schemas-microsoft-com:office:spreadsheet/u.test(prefix)) {
    return "xls";
  }
  if (ext === "xls" || ext === "xlsx") {
    throw new T.CorruptFile(ctx);
  }
  if (ext !== "csv" && ext !== "tsv" && ext !== "tab" && ext !== "txt") {
    throw new T.UnsupportedFormat({ ...ctx, detected: "unknown" });
  }
  return ext;
};
export const parseFile = (
  source: T.Source,
  options: T.ParseOptions,
  ctx: FailureContext
): ParsedFile => {
  if (source.bytes.byteLength !== source.size) {
    throw new T.InvalidRequest({ ...ctx, field: "source.size" });
  }
  const format = sniff(source, ctx);
  if (format !== "xls" && format !== "xlsx") {
    const decoded = decode(source, options, ctx);
    const delimiter = detectDelimiter(decoded.text, options, ctx);
    const rawRows = parseText(decoded.text, delimiter.value, ctx);
    const width = rawRows.reduce((n, r) => Math.max(n, r.length), 0);
    const warnings: ParsedSheet["warnings"][number][] = [];
    for (const [i, r] of rawRows.entries()) {
      if (r.length !== width) {
        warnings.push({
          code: "ragged-records",
          count: width - r.length,
          sourceRecord: i + 1,
        });
      }
    }
    if (decoded.encoding.ambiguous) {
      warnings.push({ code: "encoding-guess", count: 1 });
    }
    if (delimiter.ambiguous) {
      warnings.push({ code: "delimiter-guess", count: 1 });
    }
    const crlf = /\r\n/u.test(decoded.text);
    const lf = /(?<!\r)\n|\r(?!\n)/u.test(decoded.text);
    return {
      source,
      format,
      encoding: decoded.encoding,
      delimiter,
      bom: decoded.bom,
      newline: crlf && lf ? "mixed" : crlf ? "crlf" : "lf",
      sheets: [
        {
          name: "Sheet1",
          visibility: "visible",
          width,
          header: options.header,
          rows: rawRows.map((r) =>
            Array.from({ length: width }, (_, i) => textCell(r[i] ?? ""))
          ),
          warnings,
        },
      ],
    };
  }
  let book: XLSX.WorkBook;
  try {
    book = XLSX.read(source.bytes, {
      type: "array",
      cellFormula: true,
      cellNF: true,
      cellDates: false,
      sheetStubs: true,
      dense: true,
      WTF: true,
    });
  } catch (error) {
    // Third-party errors stay private. Only classify known encryption diagnostics.
    if (
      error instanceof Error &&
      /encrypt|password|FilePass/iu.test(error.message)
    ) {
      throw new T.EncryptedFile(ctx);
    }
    throw new T.CorruptFile(ctx);
  }
  if (!book.SheetNames.length) {
    throw new T.CorruptFile(ctx);
  }
  // oxlint-disable-next-line eslint/complexity -- Normalize vendor scalar types and geometry once at import.
  const sheets = book.SheetNames.map((name, index): ParsedSheet => {
    const sheet = book.Sheets[name];
    if (!sheet) {
      throw new T.CorruptFile(ctx);
    }
    const warnings: ParsedSheet["warnings"][number][] = [
      { code: "values-only", count: 1 },
      { code: "ignored-features", count: 1 },
    ];
    const hidden = book.Workbook?.Sheets?.[index]?.Hidden ?? 0;
    if (
      hidden ||
      sheet["!rows"]?.some((r) => r.hidden) ||
      sheet["!cols"]?.some((c) => c.hidden)
    ) {
      warnings.push({ code: "hidden-data", count: 1 });
    }
    if (sheet["!merges"]?.length) {
      warnings.push({ code: "merged-cells", count: sheet["!merges"].length });
    }
    const ref = sheet["!ref"];
    if (ref && !/^[A-Z]+[1-9]\d*:[A-Z]+[1-9]\d*$|^[A-Z]+[1-9]\d*$/u.test(ref)) {
      throw new T.CorruptFile(ctx);
    }
    const range = ref ? XLSX.utils.decode_range(ref) : null;
    if (range && (range.e.r >= 1_048_576 || range.e.c >= 16_384)) {
      throw new T.CorruptFile(ctx);
    }
    // Inspect material cells; formatting-only trailing cells do not create geometry.
    const data: XLSX.CellObject[][] | undefined = sheet["!data"];
    let height = 0;
    let width = 0;
    let formulaCount = 0;
    for (const [r, row] of (data ?? []).entries()) {
      for (const [c, cell] of (row ?? []).entries()) {
        if (cell?.f) {
          formulaCount += 1;
        }
        if (cell && (cell.v !== undefined || cell.f)) {
          height = Math.max(height, r + 1);
          width = Math.max(width, c + 1);
        }
      }
    }
    if (formulaCount) {
      warnings.push({ code: "stored-formula", count: formulaCount });
    }
    const rows = Array.from({ length: height }, (_, r) => {
      const raw = data?.[r];
      let end = 0;
      for (const [c, cell] of (raw ?? []).entries()) {
        if (cell && (cell.v !== undefined || cell.f)) {
          end = c + 1;
        }
      }
      return Array.from({ length: end }, (_cellSlot, c) =>
        workbookCell(raw?.[c], book.Workbook?.WBProps?.date1904 === true)
      );
    });
    for (const row of rows) {
      for (const cell of row) {
        if (
          cell.value._tag === "Number" &&
          Number.isInteger(cell.value.value) &&
          !Number.isSafeInteger(cell.value.value)
        ) {
          warnings.push({ code: "source-precision", count: 1 });
        }
        if (cell.origin === "date-display") {
          warnings.push({ code: "date-as-text", count: 1 });
        }
        if (cell.value._tag === "Unresolved") {
          warnings.push({ code: "unresolved-value", count: 1 });
        }
      }
    }
    return {
      name,
      visibility: hidden === 2 ? "very-hidden" : hidden ? "hidden" : "visible",
      width,
      rows,
      header: options.header,
      warnings,
    };
  });
  return {
    source,
    format,
    sheets,
    encoding: null,
    delimiter: null,
    newline: null,
    bom: false,
  };
};

export interface OutputSheet {
  readonly name: string;
  readonly visibility: T.Visibility;
  readonly width: number;
  readonly rows: readonly (readonly T.Value[])[];
}
export interface WriteJob {
  readonly format: T.OutputFormat;
  readonly sheets: readonly OutputSheet[];
  readonly options: T.ExportOptions;
  readonly jsonShape: T.ExportPlan["jsonShape"];
  readonly headers: boolean;
}
// oxlint-disable-next-line eslint/no-control-regex -- The confirmed text policy checks leading control and space characters.
export const safeText = (value: T.Value): T.Value =>
  value._tag === "Text" &&
  (/^[\t\r\n]/u.test(value.text) || /^[\u0000-\u0020]*[=+@-]/u.test(value.text))
    ? { _tag: "Text", text: `'${value.text}` }
    : value;
const encode = (s: string) => new TextEncoder().encode(s);
// oxlint-disable-next-line eslint/complexity -- Text, JSON, and workbook writers all verify their exact projection before returning bytes.
export const writeOutput = (job: WriteJob, ctx: FailureContext): Uint8Array => {
  const { format, sheets, options } = job;
  const [first] = sheets;
  if (!first) {
    throw new T.InvalidRequest({ ...ctx, field: "sheets" });
  }
  if (format === "json") {
    const data = first.rows.map((row) => row.map(scalar));
    const json =
      job.jsonShape === "objects"
        ? data
            .slice(1)
            .map((row) =>
              Object.fromEntries(
                (data[0] ?? []).map((key, i) => [
                  String(key ?? ""),
                  row[i] ?? null,
                ])
              )
            )
        : data;
    const bytes = encode(`${JSON.stringify(json, null, 2)}\n`);
    if (
      JSON.stringify(JSON.parse(new TextDecoder().decode(bytes))) !==
      JSON.stringify(json)
    ) {
      throw new T.ExportVerificationFailed({ ...ctx, format });
    }
    return bytes;
  }
  if (format !== "xls" && format !== "xlsx") {
    const delimiter = format === "csv" ? options.delimiter : "\t";
    const newline =
      format === "clipboard" || options.newline === "lf" ? "\n" : "\r\n";
    const rows = first.rows.map((row) =>
      row.map((v) =>
        display(options.textPolicy === "spreadsheet-safe" ? safeText(v) : v)
      )
    );
    const quote = (s: string) =>
      s.includes(delimiter) ||
      /["\r\n]/u.test(s) ||
      /^\s|\s$/u.test(s) ||
      s === ""
        ? `"${s.replaceAll('"', '""')}"`
        : s;
    const text =
      rows.map((row) => row.map(quote).join(delimiter)).join(newline) +
      (rows.length ? newline : "");
    const reread = parseText(text, delimiter, ctx);
    if (JSON.stringify(reread) !== JSON.stringify(rows)) {
      throw new T.ExportVerificationFailed({ ...ctx, format });
    }
    return encode(
      `${format !== "clipboard" && options.bom ? "\uFEFF" : ""}${text}`
    );
  }
  const entries = sheets.map((sheet) => {
    const matrix = sheet.rows.map((row) => row.map(scalar));
    const output = XLSX.utils.aoa_to_sheet(matrix, {
      dense: true,
      sheetStubs: true,
    });
    if (matrix.length && sheet.width) {
      output["!ref"] = XLSX.utils.encode_range({
        s: { r: 0, c: 0 },
        e: { r: matrix.length - 1, c: sheet.width - 1 },
      });
    }
    return [sheet.name, output] as const;
  });
  const book: XLSX.WorkBook = {
    SheetNames: sheets.map((s) => s.name),
    Sheets: Object.fromEntries(entries),
  };
  book.Workbook = {
    Sheets: sheets.map((s) => ({
      name: s.name,
      Hidden:
        s.visibility === "very-hidden" ? 2 : s.visibility === "hidden" ? 1 : 0,
    })),
  };
  const bytes = new Uint8Array(
    XLSX.write(book, {
      type: "array",
      bookType: format === "xls" ? "biff8" : "xlsx",
      compression: true,
    })
  );
  const check = XLSX.read(bytes, {
    type: "array",
    dense: true,
    cellFormula: true,
    sheetStubs: true,
  });
  if (
    JSON.stringify(check.SheetNames) !==
    JSON.stringify(sheets.map((s) => s.name))
  ) {
    throw new T.ExportVerificationFailed({ ...ctx, format });
  }
  for (const [i, expected] of sheets.entries()) {
    const sheet = check.Sheets[expected.name];
    if (
      !sheet ||
      (check.Workbook?.Sheets?.[i]?.Hidden ?? 0) !==
        (book.Workbook?.Sheets?.[i]?.Hidden ?? 0)
    ) {
      throw new T.ExportVerificationFailed({ ...ctx, format });
    }
    const data: XLSX.CellObject[][] | undefined = sheet["!data"];
    for (const [r, row] of expected.rows.entries()) {
      for (const [c, v] of row.entries()) {
        const cell = data?.[r]?.[c];
        if (cell?.f || !equalValue(workbookCell(cell, false).value, v)) {
          throw new T.ExportVerificationFailed({ ...ctx, format });
        }
      }
    }
    const ref = sheet["!ref"];
    if (
      expected.rows.length &&
      expected.width &&
      (!ref ||
        XLSX.utils.decode_range(ref).e.r + 1 !== expected.rows.length ||
        XLSX.utils.decode_range(ref).e.c + 1 !== expected.width)
    ) {
      throw new T.ExportVerificationFailed({ ...ctx, format });
    }
  }
  return bytes;
};
