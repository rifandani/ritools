/* oxlint-disable eslint/no-control-regex -- Download names remove control characters and path separators. */
/* oxlint-disable anti-slop/no-shape-in-symbol-names -- jsonShape is a fixed public export field. */
import { Schema } from "effect";

import * as T from "./tabular";
import { findDuplicates } from "./tabular.dedupe";
import type { DiffSheet } from "./tabular.diff";
import {
  blankCell,
  display,
  equalValue,
  safeText,
  textCell,
} from "./tabular.format";
import type {
  FailureContext,
  OutputSheet,
  ParsedFile,
  ParsedSheet,
  StoredCell,
  WriteJob,
} from "./tabular.format";
import type { MergeSheet } from "./tabular.merge";
import { countPdfUnsupported, estimatePdfPages } from "./tabular.pdf.metrics";
import type { PdfFontMetrics, PdfSectionInput } from "./tabular.pdf.metrics";
import {
  cleanDownloadName,
  splitPartName,
  splitZipName,
} from "./tabular.split";

interface Sheet {
  readonly id: T.SheetId;
  readonly source: ParsedSheet;
  readonly baselineRows: readonly T.RowId[];
  readonly baselineColumns: readonly T.ColumnId[];
  readonly rowSources: Map<T.RowId, number>;
  readonly columnSources: Map<T.ColumnId, number>;
  readonly headerRowId: T.RowId | null;
  rows: readonly T.RowId[];
  columns: readonly T.ColumnId[];
  overrides: Map<string, StoredCell>;
  changedCells: Set<string>;
  changedHeaders: Set<string>;
  unresolved: number;
  structural: number;
  readonly baselineUnresolved: number;
  structureDirty: boolean;
}
interface CellPatch {
  readonly _tag: "Cell";
  readonly sheet: Sheet;
  readonly row: T.RowId;
  readonly column: T.ColumnId;
  readonly before: StoredCell;
  readonly after: StoredCell;
}
interface Structure {
  readonly rows: readonly T.RowId[];
  readonly columns: readonly T.ColumnId[];
  readonly structural: number;
}
interface StructurePatch {
  readonly _tag: "Structure";
  readonly sheet: Sheet;
  readonly before: Structure;
  readonly after: Structure;
}
type Patch = CellPatch | StructurePatch;
interface Entry {
  readonly editId: T.EditId;
  readonly kind: T.EditKind;
  readonly sheetIds: readonly T.SheetId[];
  readonly patches: readonly Patch[];
  readonly focus: T.FocusTarget;
  readonly bytes: number;
}
interface ModelView {
  readonly public: T.View;
  readonly sheet: Sheet;
  readonly rows: readonly T.RowId[];
  readonly underlying: Map<T.RowId, number> | null;
}
interface ExportPreparation {
  readonly plan: T.ExportPlan;
  readonly job: WriteJob;
  readonly filename: string;
  readonly mime: string;
}
export interface SplitPreparation {
  readonly jobs: readonly {
    readonly filename: string;
    readonly rows: number;
    readonly job: WriteJob;
  }[];
  readonly zipName: string;
  readonly warnings: readonly T.WarningCount[];
  readonly dataRows: number;
}
interface Planned {
  readonly public: T.ExportPlan;
  readonly rows: readonly { sheet: Sheet; rows: readonly T.RowId[] }[];
}
const key = (r: T.RowId, c: T.ColumnId) => JSON.stringify([r, c]);
const sameCell = (a: StoredCell, b: StoredCell) => equalValue(a.value, b.value);
const isUnresolved = (cell: StoredCell) => cell.value._tag === "Unresolved";
const structure = (s: Sheet): Structure => ({
  rows: s.rows,
  columns: s.columns,
  structural: s.structural,
});
const editKinds: Record<T.Edit["_tag"], T.EditKind> = {
  SetCell: "set-cell",
  Paste: "paste",
  InsertRows: "insert-rows",
  InsertColumns: "insert-columns",
  DeleteRows: "delete-rows",
  DeleteColumns: "delete-columns",
  RenameHeader: "rename-header",
  RevertCell: "revert-cell",
  RevertAll: "revert-all",
  Dedupe: "dedupe",
};
const dedupeIndexes = (
  s: Sheet,
  columnIds: readonly T.ColumnId[] | null,
  ctx: FailureContext
): readonly number[] => {
  if (columnIds === null) {
    return s.columns.map((_column, index) => index);
  }
  if (!columnIds.length) {
    throw new T.InvalidRequest({ ...ctx, field: "options.columnIds" });
  }
  const seen = new Set<T.ColumnId>();
  const indexes: number[] = [];
  for (const columnId of columnIds) {
    const index = s.columns.indexOf(columnId);
    if (index === -1) {
      throw new T.MissingIdentity({ ...ctx, sheetId: s.id, columnId });
    }
    if (seen.has(columnId)) {
      throw new T.InvalidRequest({ ...ctx, field: "options.columnIds" });
    }
    seen.add(columnId);
    indexes.push(index);
  }
  return indexes;
};
const compareCodePoints = (a: string, b: string): number => {
  const x = [...a];
  const y = [...b];
  for (let i = 0; i < Math.min(x.length, y.length); i += 1) {
    const d = (x[i]?.codePointAt(0) ?? 0) - (y[i]?.codePointAt(0) ?? 0);
    if (d) {
      return d;
    }
  }
  return x.length - y.length;
};
export const compareValues = (
  a: T.Value,
  b: T.Value,
  direction: "ascending" | "descending"
): number => {
  const rank = { Number: 0, Boolean: 1, Text: 2, Blank: 3, Unresolved: 4 };
  const ar = rank[a._tag];
  const br = rank[b._tag];
  const sign = direction === "ascending" ? 1 : -1;
  if (ar !== br) {
    return ar >= 3 || br >= 3 ? ar - br : (ar - br) * sign;
  }
  if (a._tag === "Number" && b._tag === "Number") {
    return (a.value - b.value) * sign;
  }
  if (a._tag === "Boolean" && b._tag === "Boolean") {
    return (Number(a.value) - Number(b.value)) * sign;
  }
  if (a._tag === "Text" && b._tag === "Text") {
    return (
      (compareCodePoints(a.text.toLowerCase(), b.text.toLowerCase()) ||
        compareCodePoints(a.text, b.text)) * sign
    );
  }
  return 0;
};
const historyEntry = (e: Entry | undefined) =>
  e ? { editId: e.editId, kind: e.kind, sheetIds: e.sheetIds } : null;
export const checkWorkbookDimensions = (
  format: "xls" | "xlsx",
  dimensions: {
    readonly sheetId: T.SheetId;
    readonly physicalRows: number;
    readonly columns: number;
  },
  ctx: FailureContext
): readonly T.FormatLimit[] => {
  const maxRows = format === "xls" ? 65_536 : 1_048_576;
  const maxColumns = format === "xls" ? 256 : 16_384;
  const errors: T.FormatLimit[] = [];
  if (dimensions.physicalRows > maxRows) {
    errors.push(
      new T.FormatLimit({
        ...ctx,
        sheetId: dimensions.sheetId,
        dimension: "rows",
        actual: dimensions.physicalRows,
        limit: maxRows,
      })
    );
  }
  if (dimensions.columns > maxColumns) {
    errors.push(
      new T.FormatLimit({
        ...ctx,
        sheetId: dimensions.sheetId,
        dimension: "columns",
        actual: dimensions.columns,
        limit: maxColumns,
      })
    );
  }
  return errors;
};
const columnLabel = (index: number): string => {
  let i = index + 1;
  let name = "";
  while (i > 0) {
    i -= 1;
    name = String.fromCodePoint(65 + (i % 26)) + name;
    i = Math.floor(i / 26);
  }
  return name;
};

/** The sole accepted data model. History holds inverse patches, never Sheet copies. */
export class TabularModel {
  readonly sessionId: T.SessionId;
  readonly file: ParsedFile;
  readonly sheets: readonly Sheet[];
  revision = 0;
  private sequence = 0;
  private undo: Entry[] = [];
  private redo: Entry[] = [];
  private readonly views = new Map<T.SheetId, ModelView>();
  private plan: Planned | null = null;
  constructor(file: ParsedFile, candidateId: T.CandidateId) {
    this.file = file;
    this.sessionId = T.SessionId.make(`session-${candidateId}`);
    this.sheets = file.sheets.map((source, index) => {
      const id = T.SheetId.make(`${candidateId}-s${index}`);
      const allRows = source.rows.map((_, r) => T.RowId.make(`${id}-r${r}`));
      const columns = Array.from({ length: source.width }, (_, c) =>
        T.ColumnId.make(`${id}-c${c}`)
      );
      const headerRowId = source.header
        ? (allRows[0] ?? T.RowId.make(`${id}-header`))
        : null;
      const rows = source.header && allRows.length ? allRows.slice(1) : allRows;
      const unresolved = source.rows.reduce(
        (n, row) => n + row.filter(isUnresolved).length,
        0
      );
      return {
        id,
        source,
        headerRowId,
        rows,
        columns,
        baselineRows: rows,
        baselineColumns: columns,
        rowSources: new Map(allRows.map((r, i) => [r, i])),
        columnSources: new Map(columns.map((c, i) => [c, i])),
        overrides: new Map(),
        changedCells: new Set(),
        changedHeaders: new Set(),
        unresolved,
        baselineUnresolved: unresolved,
        structural: 0,
        structureDirty: false,
      };
    });
  }
  private id(kind: string) {
    this.sequence += 1;
    return `${this.sessionId}-${kind}${this.sequence}`;
  }
  guard(guard: T.Guard, ctx: FailureContext) {
    if (guard.sessionId !== this.sessionId) {
      throw new T.StaleSession({ ...ctx, currentSessionId: this.sessionId });
    }
    if (guard.expectedRevision !== this.revision) {
      throw new T.RevisionConflict({
        ...ctx,
        expected: guard.expectedRevision,
        actual: this.revision,
      });
    }
  }
  private sheet(id: T.SheetId, ctx: FailureContext): Sheet {
    const s = this.sheets.find((sheet) => sheet.id === id);
    if (!s) {
      throw new T.MissingIdentity({ ...ctx, sheetId: id });
    }
    return s;
  }
  private baseline(s: Sheet, r: T.RowId, c: T.ColumnId): StoredCell {
    const ri = s.rowSources.get(r);
    const ci = s.columnSources.get(c);
    if (ri === undefined || ci === undefined) {
      return { value: { _tag: "Text", text: "" }, origin: "edit" };
    }
    return (
      s.source.rows[ri]?.[ci] ??
      (this.file.format === "xls" || this.file.format === "xlsx"
        ? blankCell
        : textCell(""))
    );
  }
  private cell(s: Sheet, r: T.RowId, c: T.ColumnId): StoredCell {
    return s.overrides.get(key(r, c)) ?? this.baseline(s, r, c);
  }
  private address(a: T.Address, ctx: FailureContext, header = false): Sheet {
    const s = this.sheet(a.sheetId, ctx);
    if (
      (!s.rows.includes(a.rowId) && !(header && a.rowId === s.headerRowId)) ||
      !s.columns.includes(a.columnId)
    ) {
      throw new T.MissingIdentity({ ...ctx, ...a });
    }
    return s;
  }
  private headerCell(s: Sheet, c: T.ColumnId): StoredCell {
    return s.headerRowId ? this.cell(s, s.headerRowId, c) : textCell("");
  }
  private headerValue(s: Sheet, c: T.ColumnId): T.Value {
    const v = this.headerCell(s, c).value;
    return v._tag === "Unresolved" ? v : { _tag: "Text", text: display(v) };
  }
  private recount(s: Sheet) {
    s.changedCells.clear();
    s.changedHeaders.clear();
    s.unresolved = 0;
    for (const r of s.rows) {
      for (const c of s.columns) {
        const cell = this.cell(s, r, c);
        if (isUnresolved(cell)) {
          s.unresolved += 1;
        }
        if (!sameCell(cell, this.baseline(s, r, c))) {
          s.changedCells.add(key(r, c));
        }
      }
    }
    if (s.headerRowId) {
      for (const c of s.columns) {
        const cell = this.headerCell(s, c);
        if (isUnresolved(cell)) {
          s.unresolved += 1;
        }
        if (!sameCell(cell, this.baseline(s, s.headerRowId, c))) {
          s.changedHeaders.add(key(s.headerRowId, c));
        }
      }
    }
  }
  summary(): T.Session {
    const changedCellCount = this.sheets.reduce(
      (n, s) => n + s.changedCells.size,
      0
    );
    const changedHeaderCount = this.sheets.reduce(
      (n, s) => n + s.changedHeaders.size,
      0
    );
    const structuralEditCount = this.sheets.reduce(
      (n, s) => n + s.structural,
      0
    );
    return {
      sessionId: this.sessionId,
      revision: this.revision,
      sourceName: this.file.source.name,
      sourceBytes: this.file.source.size,
      format: this.file.format,
      sheets: this.sheets.map((s) => ({
        sheetId: s.id,
        name: s.source.name,
        visibility: s.source.visibility,
        header: s.source.header,
        headerRowId: s.headerRowId,
        rowCount: s.rows.length,
        columnCount: s.columns.length,
        unresolvedCount: s.unresolved,
        storedFormulaCount: s.source.warnings
          .filter((w) => w.code === "stored-formula")
          .reduce((n, w) => n + w.count, 0),
        changedCellCount: s.changedCells.size,
        structuralEditCount: s.structural,
      })),
      history: {
        canUndo: !!this.undo.length,
        canRedo: !!this.redo.length,
        undoCount: this.undo.length,
        redoCount: this.redo.length,
        nextUndo: historyEntry(this.undo.at(-1)),
        nextRedo: historyEntry(this.redo.at(-1)),
        estimatedBytes: [...this.undo, ...this.redo].reduce(
          (n, e) => n + e.bytes,
          0
        ),
        dirty:
          !!(changedCellCount + changedHeaderCount) ||
          this.sheets.some((s) => s.structureDirty),
        changedCellCount,
        changedHeaderCount,
        structuralEditCount,
      },
      warningCounts: this.warningCounts(),
    };
  }
  private warningCounts(): T.WarningCount[] {
    return this.sheets.flatMap((s) => {
      const counts = new Map<T.WarningCode, number>();
      for (const w of s.source.warnings) {
        if (w.code !== "unresolved-value") {
          counts.set(w.code, (counts.get(w.code) ?? 0) + w.count);
        }
      }
      if (s.unresolved) {
        counts.set("unresolved-value", s.unresolved);
      }
      return [...counts].map(([code, count]) => ({
        code,
        count,
        sheetId: s.id,
      }));
    });
  }
  /** One Sheet as a Merge Source. Header and data keep edits and stable order. */
  mergeSheet(
    sourceId: T.MergeSourceId,
    sheetId: T.SheetId,
    ctx: FailureContext
  ): MergeSheet {
    const s = this.sheet(sheetId, ctx);
    const counts = new Map<T.WarningCode, number>();
    for (const warning of s.source.warnings) {
      if (warning.code !== "unresolved-value") {
        counts.set(
          warning.code,
          (counts.get(warning.code) ?? 0) + warning.count
        );
      }
    }
    return {
      sourceId,
      name: this.file.source.name,
      sheetName: s.source.name,
      origin: "session",
      format: this.file.format,
      size: this.file.source.size,
      header: s.headerRowId
        ? s.columns.map((column) => this.headerValue(s, column))
        : null,
      rows: s.rows.map((row) =>
        s.columns.map((column) => this.cell(s, row, column).value)
      ),
      columns: s.columns.length,
      unresolved: s.unresolved,
      delimiter: this.file.delimiter?.value ?? null,
      newline: this.file.newline,
      bom: this.file.bom,
      warnings: [...counts].map(([code, count]) => ({ code, count })),
    };
  }
  /** One Sheet as a Diff side. The merge source id is unused by a Diff. */
  diffSheet(sheetId: T.SheetId, ctx: FailureContext): DiffSheet {
    const source = this.mergeSheet(
      T.MergeSourceId.make("diff-side"),
      sheetId,
      ctx
    );
    return {
      name: source.name,
      sheetName: source.sheetName,
      format: source.format,
      header: source.header,
      rows: source.rows,
      columns: source.columns,
      unresolved: source.unresolved,
      workbook: source.format === "xls" || source.format === "xlsx",
    };
  }
  warnings(request: T.WarningQuery, ctx: FailureContext): T.WarningPage {
    this.guard(request, ctx);
    const items: T.Warning[] = [];
    for (const s of this.sheets) {
      if (request.sheetId && request.sheetId !== s.id) {
        continue;
      }
      for (const w of s.source.warnings) {
        if (
          w.code !== "unresolved-value" &&
          (!request.code || request.code === w.code)
        ) {
          items.push({ ...w, sheetId: s.id });
        }
      }
      if (!request.code || request.code === "unresolved-value") {
        for (const r of [
          ...(s.headerRowId ? [s.headerRowId] : []),
          ...s.rows,
        ]) {
          for (const c of s.columns) {
            if (isUnresolved(this.cell(s, r, c))) {
              items.push({
                code: "unresolved-value",
                count: 1,
                sheetId: s.id,
                address: { sheetId: s.id, rowId: r, columnId: c },
              });
            }
          }
        }
      }
    }
    return {
      items: items.slice(request.offset, request.offset + request.limit),
      total: items.length,
      nextOffset:
        request.offset + request.limit < items.length
          ? request.offset + request.limit
          : null,
    };
  }
  async setView(
    request: T.ViewRequest,
    ctx: FailureContext,
    checkpoint: () => Promise<void>
  ): Promise<T.View> {
    this.guard(request, ctx);
    const s = this.sheet(request.sheetId, ctx);
    if (request.sort && !s.columns.includes(request.sort.columnId)) {
      throw new T.MissingIdentity({ ...ctx, columnId: request.sort.columnId });
    }
    const query = request.search.toLowerCase();
    let rows: readonly T.RowId[] = s.rows;
    let underlying: Map<T.RowId, number> | null = null;
    if (query || request.sort) {
      const matching: T.RowId[] = [];
      underlying = new Map<T.RowId, number>();
      const sourceColumns = s.columns.map((column) =>
        s.columnSources.get(column)
      );
      const hasOverrides = s.overrides.size > 0;
      for (let i = 0; i < s.rows.length; i += 1) {
        const r = s.rows[i];
        if (!r) {
          continue;
        }
        underlying.set(r, i);
        const sourceRow = s.source.rows[s.rowSources.get(r) ?? -1];
        if (
          !query ||
          s.columns.some((c, index) => {
            const sourceColumn = sourceColumns[index];
            const stored =
              (hasOverrides ? s.overrides.get(key(r, c)) : undefined) ??
              (sourceColumn === undefined
                ? undefined
                : sourceRow?.[sourceColumn]);
            return stored
              ? display(stored.value).toLowerCase().includes(query)
              : false;
          })
        ) {
          matching.push(r);
        }
        if (i % 2048 === 0) {
          // oxlint-disable-next-line eslint/no-await-in-loop, react-doctor/async-await-in-loop -- Yield between ordered model chunks to handle cancellation.
          await checkpoint();
        }
      }
      if (request.sort) {
        const { sort } = request;
        matching.sort((a, b) =>
          compareValues(
            this.cell(s, a, sort.columnId).value,
            this.cell(s, b, sort.columnId).value,
            sort.direction
          )
        );
      }
      rows = matching;
    }
    await checkpoint();
    this.guard(request, ctx);
    const view: T.View = {
      sessionId: this.sessionId,
      revision: this.revision,
      viewId: T.ViewId.make(this.id("v")),
      sheetId: s.id,
      search: request.search,
      sort: request.sort,
      matchingRows: rows.length,
      totalRows: s.rows.length,
      columnCount: s.columns.length,
    };
    this.views.set(s.id, { public: view, sheet: s, rows, underlying });
    return view;
  }
  private view(viewId: T.ViewId, ctx: FailureContext): ModelView {
    const v = [...this.views.values()].find(
      (view) => view.public.viewId === viewId
    );
    if (!v || v.public.revision !== this.revision) {
      throw new T.StaleView({ ...ctx, viewId });
    }
    return v;
  }
  viewport(request: T.ViewportRequest, ctx: FailureContext): T.Viewport {
    this.guard(request, ctx);
    if (
      request.rowCount * request.columnCount > 4096 ||
      request.columnCount > 256
    ) {
      throw new T.InvalidRequest({ ...ctx, field: "viewport.bounds" });
    }
    const v = this.view(request.viewId, ctx);
    const s = v.sheet;
    const columns = s.columns.slice(
      request.columnStart,
      request.columnStart + request.columnCount
    );
    return {
      sessionId: this.sessionId,
      revision: this.revision,
      viewId: request.viewId,
      sheetId: s.id,
      rowStart: request.rowStart,
      columnStart: request.columnStart,
      totalMatchingRows: v.rows.length,
      totalColumns: s.columns.length,
      columns: columns.map((columnId, i) => {
        const h = this.headerCell(s, columnId);
        const label = s.source.header
          ? display(h.value)
          : columnLabel(request.columnStart + i);
        return {
          columnId,
          index: request.columnStart + i,
          label,
          blankHeader: !label.trim(),
          headerChanged:
            s.headerRowId !== null &&
            s.changedHeaders.has(key(s.headerRowId, columnId)),
          headerValue: s.source.header ? h.value : null,
        };
      }),
      rows: v.rows
        .slice(request.rowStart, request.rowStart + request.rowCount)
        .map((rowId, i) => ({
          rowId,
          viewIndex: request.rowStart + i,
          underlyingIndex: v.underlying?.get(rowId) ?? request.rowStart + i,
          cells: columns.map((columnId) => {
            const cell = this.cell(s, rowId, columnId);
            const changed = s.changedCells.has(key(rowId, columnId));
            return {
              rowId,
              columnId,
              value: cell.value,
              display: display(cell.value),
              origin: cell.origin,
              changed,
              canRevert: changed,
            };
          }),
        })),
    };
  }
  locate(request: T.LocateRequest, ctx: FailureContext): T.Location {
    this.guard(request, ctx);
    const v = this.view(request.viewId, ctx);
    if (v.sheet.id !== request.address.sheetId) {
      return null;
    }
    const rowIndex = v.rows.indexOf(request.address.rowId);
    const columnIndex = v.sheet.columns.indexOf(request.address.columnId);
    return rowIndex === -1 || columnIndex === -1
      ? null
      : { rowIndex, columnIndex };
  }
  private stageCell(
    patches: Patch[],
    s: Sheet,
    r: T.RowId,
    c: T.ColumnId,
    after: StoredCell
  ) {
    const before = this.cell(s, r, c);
    if (!sameCell(before, after)) {
      patches.push({
        _tag: "Cell",
        sheet: s,
        row: r,
        column: c,
        before,
        after,
      });
    }
  }
  // oxlint-disable-next-line eslint/complexity -- Stage both inverse cell patches and structure before one atomic publication.
  private apply(patches: readonly Patch[], forward: boolean) {
    const staged = new Map<Sheet, Sheet>();
    for (const p of patches) {
      if (!staged.has(p.sheet)) {
        staged.set(p.sheet, {
          ...p.sheet,
          overrides: new Map(p.sheet.overrides),
          changedCells: new Set(p.sheet.changedCells),
          changedHeaders: new Set(p.sheet.changedHeaders),
        });
      }
    }
    const structures = new Set<Sheet>();
    for (const original of forward ? patches : patches.toReversed()) {
      const shadow = staged.get(original.sheet);
      if (!shadow) {
        throw new Error("Missing staged Sheet");
      }
      const p = { ...original, sheet: shadow };
      // oxlint-disable-next-line oxc/branches-sharing-code -- Discriminating first preserves the patch-specific before/after types.
      if (p._tag === "Structure") {
        const next = forward ? p.after : p.before;
        p.sheet.rows = next.rows;
        p.sheet.columns = next.columns;
        p.sheet.structural = next.structural;
        structures.add(p.sheet);
      } else {
        const next = forward ? p.after : p.before;
        const previous = this.cell(p.sheet, p.row, p.column);
        const k = key(p.row, p.column);
        if (sameCell(next, this.baseline(p.sheet, p.row, p.column))) {
          p.sheet.overrides.delete(k);
        } else {
          p.sheet.overrides.set(k, next);
        }
        const present =
          p.sheet.columns.includes(p.column) &&
          (p.row === p.sheet.headerRowId || p.sheet.rows.includes(p.row));
        const set =
          p.row === p.sheet.headerRowId
            ? p.sheet.changedHeaders
            : p.sheet.changedCells;
        if (
          !present ||
          sameCell(next, this.baseline(p.sheet, p.row, p.column))
        ) {
          set.delete(k);
        } else {
          set.add(k);
        }
        if (present) {
          p.sheet.unresolved +=
            Number(isUnresolved(next)) - Number(isUnresolved(previous));
        }
      }
    }
    for (const s of structures) {
      s.structureDirty =
        s.rows.length !== s.baselineRows.length ||
        s.columns.length !== s.baselineColumns.length ||
        s.rows.some((r, i) => r !== s.baselineRows[i]) ||
        s.columns.some((c, i) => c !== s.baselineColumns[i]);
      this.recount(s);
    }
    // Publish only after all patch allocations and validation have succeeded.
    for (const [target, next] of staged) {
      target.rows = next.rows;
      target.columns = next.columns;
      target.structural = next.structural;
      target.structureDirty = next.structureDirty;
      target.overrides = next.overrides;
      target.changedCells = next.changedCells;
      target.changedHeaders = next.changedHeaders;
      target.unresolved = next.unresolved;
    }
    this.revision += 1;
    this.views.clear();
    this.plan = null;
  }
  private dedupeResult(s: Sheet, indexes: readonly number[]) {
    return findDuplicates(
      s.rows.map((rowId) => ({
        rowId,
        values: s.columns.map((column) =>
          display(this.cell(s, rowId, column).value)
        ),
      })),
      indexes
    );
  }
  /** The counts for one Dedupe, computed from the current values. */
  dedupePreview(
    request: T.DedupeRequest,
    ctx: FailureContext
  ): T.DedupePreview {
    this.guard(request, ctx);
    const { options } = request;
    const s = this.sheet(options.sheetId, ctx);
    const indexes = dedupeIndexes(s, options.columnIds, ctx);
    if (!s.columns.length) {
      return {
        sessionId: this.sessionId,
        revision: this.revision,
        sheetId: s.id,
        columnIds: options.columnIds,
        rows: 0,
        duplicates: 0,
        remaining: 0,
      };
    }
    const result = this.dedupeResult(s, indexes);
    return {
      sessionId: this.sessionId,
      revision: this.revision,
      sheetId: s.id,
      columnIds: options.columnIds,
      rows: result.rows,
      duplicates: result.duplicates,
      remaining: result.remaining,
    };
  }
  // oxlint-disable-next-line eslint/complexity -- Each command validates its complete patch set before the shared commit.
  edit(request: T.EditRequest, ctx: FailureContext): T.Change {
    this.guard(request, ctx);
    const e = request.edit;
    const patches: Patch[] = [];
    let focus: T.FocusTarget = null;
    const s =
      e._tag === "RevertAll"
        ? null
        : this.sheet("address" in e ? e.address.sheetId : e.sheetId, ctx);
    if (s) {
      if (e._tag === "SetCell" || e._tag === "RevertCell") {
        this.address(e.address, ctx, e._tag === "RevertCell");
        this.stageCell(
          patches,
          s,
          e.address.rowId,
          e.address.columnId,
          e._tag === "SetCell"
            ? { value: { _tag: "Text", text: e.text }, origin: "edit" }
            : this.baseline(s, e.address.rowId, e.address.columnId)
        );
        focus = { ...e.address, reason: "changed" };
      } else if (e._tag === "RenameHeader") {
        if (!s.source.header || !s.columns.includes(e.columnId)) {
          throw new T.InvalidRequest({ ...ctx, field: "header" });
        }
        // A zero-row Sheet has a logical header slot after its first column is added.
        const r = s.headerRowId;
        if (!r) {
          throw new T.InvalidRequest({ ...ctx, field: "headerRowId" });
        }
        this.stageCell(patches, s, r, e.columnId, {
          value: { _tag: "Text", text: e.text },
          origin: "edit",
        });
        focus = {
          sheetId: s.id,
          rowId: r,
          columnId: e.columnId,
          reason: "changed",
        };
      } else if (e._tag === "Paste") {
        const v = this.view(e.viewId, ctx);
        const ri = v.rows.indexOf(e.rowIds[0] ?? T.RowId.make("missing"));
        const ci = s.columns.indexOf(
          e.columnIds[0] ?? T.ColumnId.make("missing")
        );
        if (
          v.sheet !== s ||
          ri === -1 ||
          ci === -1 ||
          !e.rowIds.length ||
          !e.columnIds.length ||
          new Set(e.rowIds).size !== e.rowIds.length ||
          new Set(e.columnIds).size !== e.columnIds.length ||
          e.rowIds.some((r, i) => v.rows[ri + i] !== r) ||
          e.columnIds.some((c, i) => s.columns[ci + i] !== c)
        ) {
          throw new T.InvalidPaste({ ...ctx, reason: "stale-range" });
        }
        if (
          e.values.length !== e.rowIds.length ||
          e.values.some((r) => r.length !== e.columnIds.length)
        ) {
          throw new T.InvalidPaste({ ...ctx, reason: "ragged" });
        }
        for (const [ir, r] of e.rowIds.entries()) {
          for (const [ic, c] of e.columnIds.entries()) {
            this.stageCell(patches, s, r, c, {
              value: { _tag: "Text", text: e.values[ir]?.[ic] ?? "" },
              origin: "edit",
            });
          }
        }
        focus = {
          sheetId: s.id,
          rowId: e.rowIds[0] ?? null,
          columnId: e.columnIds[0] ?? null,
          reason: "changed",
        };
      } else if (e._tag === "InsertRows" || e._tag === "InsertColumns") {
        if (e.count === 0 || (e._tag === "InsertRows" && !s.columns.length)) {
          throw new T.InvalidRequest({ ...ctx, field: "count" });
        }
        const before = structure(s);
        let after: Structure;
        if (e._tag === "InsertRows") {
          const at =
            e.before === null ? s.rows.length : s.rows.indexOf(e.before);
          if (at < 0) {
            throw new T.MissingIdentity({ ...ctx, sheetId: s.id });
          }
          const added = Array.from({ length: e.count }, () =>
            T.RowId.make(this.id("r"))
          );
          after = {
            ...before,
            rows: [...s.rows.slice(0, at), ...added, ...s.rows.slice(at)],
            structural: s.structural + 1,
          };
          focus = {
            sheetId: s.id,
            rowId: added[0] ?? null,
            columnId: s.columns[0] ?? null,
            reason: "inserted",
          };
        } else {
          const at =
            e.before === null ? s.columns.length : s.columns.indexOf(e.before);
          if (at < 0) {
            throw new T.MissingIdentity({ ...ctx, sheetId: s.id });
          }
          const added = Array.from({ length: e.count }, () =>
            T.ColumnId.make(this.id("c"))
          );
          after = {
            ...before,
            columns: [
              ...s.columns.slice(0, at),
              ...added,
              ...s.columns.slice(at),
            ],
            structural: s.structural + 1,
          };
          focus = {
            sheetId: s.id,
            rowId: s.rows[0] ?? null,
            columnId: added[0] ?? null,
            reason: "inserted",
          };
        }
        patches.push({ _tag: "Structure", sheet: s, before, after });
      } else if (e._tag === "DeleteRows" || e._tag === "DeleteColumns") {
        const ids: readonly string[] =
          e._tag === "DeleteRows" ? e.rowIds : e.columnIds;
        if (!ids.length || new Set(ids).size !== ids.length) {
          throw new T.InvalidRequest({ ...ctx, field: "identities" });
        }
        const currentRows = new Set(s.rows);
        const currentColumns = new Set(s.columns);
        if (
          e._tag === "DeleteRows" &&
          e.rowIds.some((r) => !currentRows.has(r))
        ) {
          throw new T.MissingIdentity({ ...ctx, sheetId: s.id });
        }
        if (
          e._tag === "DeleteColumns" &&
          e.columnIds.some((c) => !currentColumns.has(c))
        ) {
          throw new T.MissingIdentity({ ...ctx, sheetId: s.id });
        }
        const rowSelection = new Set(e._tag === "DeleteRows" ? e.rowIds : []);
        const columnSelection = new Set(
          e._tag === "DeleteColumns" ? e.columnIds : []
        );
        const before = structure(s);
        const columns =
          e._tag === "DeleteColumns"
            ? s.columns.filter((c) => !columnSelection.has(c))
            : s.columns;
        const rows = columns.length
          ? e._tag === "DeleteRows"
            ? s.rows.filter((r) => !rowSelection.has(r))
            : s.rows
          : [];
        patches.push({
          _tag: "Structure",
          sheet: s,
          before,
          after: { rows, columns, structural: s.structural + 1 },
        });
        focus = {
          sheetId: s.id,
          rowId: rows[0] ?? null,
          columnId: columns[0] ?? null,
          reason: "deleted",
        };
      } else if (e._tag === "Dedupe") {
        const indexes = dedupeIndexes(s, e.columnIds, ctx);
        if (s.columns.length && s.rows.length) {
          const result = this.dedupeResult(s, indexes);
          if (result.duplicates > 0) {
            const removed = new Set(result.duplicateIds);
            const rows = s.rows.filter((rowId) => !removed.has(rowId));
            patches.push({
              _tag: "Structure",
              sheet: s,
              before: structure(s),
              after: {
                rows,
                columns: s.columns,
                structural: s.structural + 1,
              },
            });
            focus = {
              sheetId: s.id,
              rowId: rows[0] ?? null,
              columnId: s.columns[0] ?? null,
              reason: "deleted",
            };
          }
        }
      }
    } else if (e._tag === "RevertAll") {
      for (const sheet of this.sheets) {
        // Include tombstoned values, so undoing Revert all restores them exactly.
        for (const [k, before] of sheet.overrides) {
          const [row, column] = Schema.decodeUnknownSync(
            Schema.Tuple([T.RowId, T.ColumnId])
          )(JSON.parse(k));
          if (row && column) {
            patches.push({
              _tag: "Cell",
              sheet,
              row: T.RowId.make(row),
              column: T.ColumnId.make(column),
              before,
              after: this.baseline(
                sheet,
                T.RowId.make(row),
                T.ColumnId.make(column)
              ),
            });
          }
        }
        if (sheet.structural) {
          patches.push({
            _tag: "Structure",
            sheet,
            before: structure(sheet),
            after: {
              rows: sheet.baselineRows,
              columns: sheet.baselineColumns,
              structural: 0,
            },
          });
        }
      }
      const [first] = this.sheets;
      if (first) {
        focus = {
          sheetId: first.id,
          rowId: first.rows[0] ?? null,
          columnId: first.columns[0] ?? null,
          reason: "changed",
        };
      }
    }
    if (!patches.length) {
      return {
        session: this.summary(),
        editId: null,
        affectedSheets: [],
        focus: null,
      };
    }
    const sheetIds = [...new Set(patches.map((p) => p.sheet.id))];
    const bytes = patches.reduce(
      (n, p) =>
        n +
        (p._tag === "Cell"
          ? 128 +
            display(p.before.value).length * 2 +
            display(p.after.value).length * 2
          : 64 +
            (p.before.rows.length +
              p.after.rows.length +
              p.before.columns.length +
              p.after.columns.length) *
              8),
      0
    );
    const entry: Entry = {
      editId: T.EditId.make(this.id("e")),
      kind: editKinds[e._tag],
      sheetIds,
      patches,
      focus,
      bytes,
    };
    // Stage all allocations before changing the accepted revision.
    const nextUndo = [...this.undo, entry];
    this.apply(patches, true);
    this.undo = nextUndo;
    this.redo = [];
    return {
      session: this.summary(),
      editId: entry.editId,
      affectedSheets: sheetIds,
      focus,
    };
  }
  history(request: T.HistoryRequest, ctx: FailureContext): T.Change {
    this.guard(request, ctx);
    const from = request.direction === "undo" ? this.undo : this.redo;
    const to = request.direction === "undo" ? this.redo : this.undo;
    const e = from.at(-1);
    if (!e) {
      throw new T.HistoryEmpty({ ...ctx, direction: request.direction });
    }
    const nextFrom = from.slice(0, -1);
    const nextTo = [...to, e];
    this.apply(e.patches, request.direction === "redo");
    if (request.direction === "undo") {
      this.undo = nextFrom;
      this.redo = nextTo;
    } else {
      this.redo = nextFrom;
      this.undo = nextTo;
    }
    return {
      session: this.summary(),
      editId: e.editId,
      affectedSheets: e.sheetIds,
      focus: this.historyFocus(e.focus),
    };
  }
  private historyFocus(focus: T.FocusTarget): T.FocusTarget {
    if (!focus) {
      return null;
    }
    const sheet = this.sheets.find((s) => s.id === focus.sheetId);
    if (!sheet) {
      return null;
    }
    return {
      ...focus,
      reason: "history",
      rowId:
        focus.rowId &&
        (sheet.rows.includes(focus.rowId) || sheet.headerRowId === focus.rowId)
          ? focus.rowId
          : (sheet.rows[0] ?? null),
      columnId:
        focus.columnId && sheet.columns.includes(focus.columnId)
          ? focus.columnId
          : (sheet.columns[0] ?? null),
    };
  }
  // oxlint-disable-next-line eslint/complexity -- One plan checks every format policy against the same requested projection.
  planExport(
    request: T.ExportRequest,
    ctx: FailureContext,
    pdfMetrics: PdfFontMetrics | null = null
  ): T.ExportPlan {
    this.guard(request, ctx);
    const { options } = request;
    const { format } = options;
    const workbook = format === "xls" || format === "xlsx";
    const pdf = format === "pdf";
    const multiSheet = workbook || pdf;
    if (
      (options.scope._tag === "WholeWorkbook" && !multiSheet) ||
      (format === "csv" && options.delimiter === "\t") ||
      ((format === "tsv" || format === "tab" || format === "clipboard") &&
        options.delimiter !== "\t") ||
      (format === "clipboard" && (options.bom || options.newline !== "lf")) ||
      (format === "json" && options.bom) ||
      (pdf ? options.pdf === null : options.pdf !== null)
    ) {
      throw new T.InvalidRequest({ ...ctx, field: "export.options" });
    }
    if (pdf && !pdfMetrics) {
      throw new T.EngineFailed({ ...ctx, phase: "planning-export" });
    }
    const selected =
      options.scope._tag === "WholeWorkbook"
        ? this.sheets
        : [this.sheet(options.scope.sheetId, ctx)];
    const { scope } = options;
    const projection = selected.map((sheet) => ({
      sheet,
      rows:
        scope._tag === "CurrentView"
          ? this.view(scope.viewId, ctx).rows
          : sheet.rows,
    }));
    if (
      scope._tag === "CurrentView" &&
      this.view(scope.viewId, ctx).sheet.id !== scope.sheetId
    ) {
      throw new T.StaleView({ ...ctx, viewId: scope.viewId });
    }
    let unresolvedCount = 0;
    let firstUnresolved: T.Address | null = null;
    let changedOutputCells = 0;
    const examples: T.ExportPlan["examples"][number][] = [];
    const blockedBy: T.EngineError[] = [];
    const warn: T.WarningCount[] = this.warningCounts().filter(
      (w) => !w.sheetId || selected.some((s) => s.id === w.sheetId)
    );
    const allHidden = selected.every((s) => s.source.visibility !== "visible");
    if (allHidden && workbook) {
      warn.push({ code: "all-hidden-output", count: 1 });
    }
    const names = new Set<string>();
    const addLimit = (
      s: Sheet,
      dimension: T.FormatLimit["dimension"],
      actual: number,
      limit: number
    ) =>
      blockedBy.push(
        new T.FormatLimit({ ...ctx, sheetId: s.id, dimension, actual, limit })
      );
    for (const { sheet: s, rows } of projection) {
      const physicalRows =
        rows.length + (s.source.header && s.columns.length ? 1 : 0);
      if (workbook) {
        blockedBy.push(
          ...checkWorkbookDimensions(
            format,
            { sheetId: s.id, physicalRows, columns: s.columns.length },
            ctx
          )
        );
        if (
          !s.source.name.length ||
          s.source.name.length > 31 ||
          /[[\]:*?/\\]/u.test(s.source.name) ||
          names.has(s.source.name.toLowerCase())
        ) {
          addLimit(s, "sheet-name", s.source.name.length, 31);
        }
        names.add(s.source.name.toLowerCase());
      }
      for (const r of [
        ...(s.source.header && s.headerRowId ? [s.headerRowId] : []),
        ...rows,
      ]) {
        for (const c of s.columns) {
          const value =
            r === s.headerRowId
              ? this.headerValue(s, c)
              : this.cell(s, r, c).value;
          if (value._tag === "Unresolved") {
            unresolvedCount += 1;
            firstUnresolved ??= { sheetId: s.id, rowId: r, columnId: c };
          }
          if (workbook && value._tag === "Text" && value.text.length > 32_767) {
            addLimit(s, "cell-text", value.text.length, 32_767);
          }
          if (
            !workbook &&
            !pdf &&
            format !== "json" &&
            options.textPolicy === "spreadsheet-safe"
          ) {
            const safe = safeText(value);
            if (safe !== value) {
              changedOutputCells += 1;
              if (examples.length < 5) {
                examples.push({
                  before: display(value).slice(0, 120),
                  after: display(safe).slice(0, 121),
                });
              }
            }
          }
        }
      }
    }
    if (firstUnresolved) {
      blockedBy.push(
        new T.UnresolvedValues({
          ...ctx,
          count: unresolvedCount,
          first: firstUnresolved,
        })
      );
    }
    if (changedOutputCells) {
      warn.push({ code: "spreadsheet-safe", count: changedOutputCells });
    }
    const pdfSections: PdfSectionInput[] = pdf
      ? projection.map(({ sheet: s, rows }) => ({
          name: s.source.name,
          header: s.source.header,
          columns: s.columns.length,
          headerRow:
            s.source.header && s.columns.length
              ? s.columns.map((c) => this.headerValue(s, c))
              : null,
          rows: rows.map((r) => s.columns.map((c) => this.cell(s, r, c).value)),
        }))
      : [];
    const unsupportedCharacters =
      pdf && pdfMetrics
        ? countPdfUnsupported(pdfMetrics, pdfSections, this.file.source.name)
        : 0;
    const estimatedPages =
      pdf && pdfMetrics && options.pdf
        ? estimatePdfPages(pdfMetrics, pdfSections, options.pdf)
        : null;
    let jsonShape: T.ExportPlan["jsonShape"] = null;
    let jsonReason: T.ExportPlan["jsonReason"] = null;
    const [first] = selected;
    if (format === "json" && first) {
      const labels = first.columns.map((c) =>
        display(this.headerValue(first, c))
      );
      jsonReason =
        options.jsonShape === "arrays"
          ? "user-arrays"
          : first.source.header
            ? labels.some((h) => !h.trim())
              ? "blank-headers"
              : new Set(labels).size === labels.length
                ? "unique-headers"
                : "duplicate-headers"
            : "headers-off";
      jsonShape = jsonReason === "unique-headers" ? "objects" : "arrays";
    }
    const plan: T.ExportPlan = {
      planId: T.PlanId.make(this.id("p")),
      sessionId: this.sessionId,
      revision: this.revision,
      options,
      sheets: projection.map(({ sheet: s, rows }, i) => ({
        sheetId: s.id,
        name: s.source.name,
        rows: rows.length,
        columns: s.columns.length,
        header: s.source.header,
        visibility:
          !workbook || selected.length === 1 || (allHidden && i === 0)
            ? "visible"
            : s.source.visibility,
      })),
      unresolvedCount,
      changedOutputCells,
      jsonShape,
      jsonReason,
      examples,
      estimatedPages,
      unsupportedCharacters,
      warnings: warn,
      blockedBy,
    };
    this.plan = { public: plan, rows: projection };
    return plan;
  }
  exportJob(request: T.ExportCommit, ctx: FailureContext): ExportPreparation {
    this.guard(request, ctx);
    const planned = this.plan;
    if (
      !planned ||
      planned.public.planId !== request.planId ||
      planned.public.revision !== this.revision
    ) {
      throw new T.StaleExportPlan({ ...ctx, planId: request.planId });
    }
    const plan = planned.public;
    if (plan.blockedBy[0]) {
      throw plan.blockedBy[0];
    }
    const { format } = plan.options;
    if (
      (format === "xls" || format === "xlsx" || format === "pdf") &&
      !request.acknowledgeValuesOnly
    ) {
      throw new T.InvalidRequest({ ...ctx, field: "acknowledgeValuesOnly" });
    }
    const sheets: OutputSheet[] = planned.rows.map(({ sheet: s, rows }, i) => ({
      name: s.source.name,
      visibility: plan.sheets[i]?.visibility ?? "visible",
      width: s.columns.length,
      header: s.source.header,
      rows: [
        ...(s.source.header && s.columns.length
          ? [s.columns.map((c) => this.headerValue(s, c))]
          : []),
        ...rows.map((r) => s.columns.map((c) => this.cell(s, r, c).value)),
      ],
    }));

    const stem = cleanDownloadName(
      this.file.source.name.replace(/\.[^.]*$/u, "")
    );
    const [first] = plan.sheets;
    const suffix =
      plan.options.scope._tag === "WholeWorkbook"
        ? "workbook"
        : `${cleanDownloadName(first?.name ?? "tabular")}-${plan.options.scope._tag === "CurrentView" ? "view" : "sheet"}`;
    const extension = format === "clipboard" ? "tsv" : format;
    const mime: Record<T.OutputFormat, string> = {
      csv: "text/csv;charset=utf-8",
      tsv: "text/tab-separated-values;charset=utf-8",
      tab: "text/tab-separated-values;charset=utf-8",
      clipboard: "text/plain",
      json: "application/json;charset=utf-8",
      xls: "application/vnd.ms-excel",
      xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      pdf: "application/pdf",
    };
    return {
      plan,
      job: {
        format,
        sourceName: this.file.source.name,
        sheets,
        options: plan.options,
        jsonShape: plan.jsonShape,
        headers: first?.header ?? false,
        locale: plan.options.locale,
      },
      filename: `${stem}-${suffix}.${extension}`,
      mime: mime[format],
    };
  }
  /** The write jobs for a Split. The header repeats in every Part. */
  splitJob(request: T.SplitRequest, ctx: FailureContext): SplitPreparation {
    this.guard(request, ctx);
    const { options } = request;
    const workbook = this.file.format === "xls" || this.file.format === "xlsx";
    if (options.delimiter === "\t") {
      throw new T.InvalidRequest({ ...ctx, field: "options.delimiter" });
    }
    if (workbook && !request.acknowledgeValuesOnly) {
      throw new T.InvalidRequest({
        ...ctx,
        field: "acknowledgeValuesOnly",
      });
    }
    const sheet = this.sheet(options.sheetId, ctx);
    const dataRows = sheet.rows.length;
    if (dataRows === 0 || sheet.columns.length === 0) {
      throw new T.InvalidRequest({ ...ctx, field: "options.sheetId" });
    }
    let unresolvedCount = 0;
    let firstUnresolved: T.Address | null = null;
    for (const row of [
      ...(sheet.source.header && sheet.headerRowId ? [sheet.headerRowId] : []),
      ...sheet.rows,
    ]) {
      for (const column of sheet.columns) {
        const value =
          row === sheet.headerRowId
            ? this.headerValue(sheet, column)
            : this.cell(sheet, row, column).value;
        if (value._tag === "Unresolved") {
          unresolvedCount += 1;
          firstUnresolved ??= {
            sheetId: sheet.id,
            rowId: row,
            columnId: column,
          };
        }
      }
    }
    if (firstUnresolved) {
      throw new T.UnresolvedValues({
        ...ctx,
        count: unresolvedCount,
        first: firstUnresolved,
      });
    }
    const partCount = Math.ceil(dataRows / options.rowsPerPart);
    const names = {
      sourceName: this.file.source.name,
      sheetName: sheet.source.name,
      workbook,
      partCount,
    };
    const exportOptions: T.ExportOptions = {
      format: "csv",
      scope: { _tag: "WholeSheet", sheetId: sheet.id },
      delimiter: options.delimiter,
      newline: options.newline,
      bom: options.bom,
      textPolicy: "exact",
      jsonShape: "auto",
      pdf: null,
      locale: options.locale,
    };
    const header =
      sheet.source.header && sheet.headerRowId
        ? [sheet.columns.map((column) => this.headerValue(sheet, column))]
        : [];
    const jobs = Array.from({ length: partCount }, (_part, index) => {
      const start = index * options.rowsPerPart;
      const end = Math.min(start + options.rowsPerPart, dataRows);
      return {
        filename: splitPartName(names, index),
        rows: end - start,
        job: {
          format: "csv" as const,
          sourceName: this.file.source.name,
          sheets: [
            {
              name: sheet.source.name,
              visibility: "visible" as const,
              width: sheet.columns.length,
              header: sheet.source.header,
              rows: [
                ...header,
                ...sheet.rows
                  .slice(start, end)
                  .map((row) =>
                    sheet.columns.map(
                      (column) => this.cell(sheet, row, column).value
                    )
                  ),
              ],
            },
          ],
          options: exportOptions,
          jsonShape: null,
          headers: sheet.source.header,
          locale: options.locale,
        },
      };
    });
    return {
      jobs,
      zipName: splitZipName(names),
      dataRows,
      warnings: this.warningCounts().filter(
        (warning) => !warning.sheetId || warning.sheetId === sheet.id
      ),
    };
  }
}

export const candidate = (
  file: ParsedFile,
  candidateId: T.CandidateId
): T.Candidate => ({
  candidateId,
  sourceName: file.source.name,
  format: file.format,
  encoding: file.encoding,
  delimiter: file.delimiter,
  newline: file.newline,
  bom: file.bom,
  sheets: file.sheets.map((sheet, index) => ({
    sheetId: T.SheetId.make(`${candidateId}-s${index}`),
    header: sheet.header,
  })),
});
