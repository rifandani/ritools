/* oxlint-disable promise/prefer-await-to-then -- Inline editor close and navigation follow the atomic engine commit. */
/* oxlint-disable react/immutability -- Scroll offsets are imperative DOM state on the grid element, not React data. */
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { DataGrid } from "react-data-grid";
import type {
  Column,
  ColumnWidths,
  DataGridHandle,
  RenderEditCellContentProps,
} from "react-data-grid";
import { HiPencilSquare, HiArrowUturnLeft } from "react-icons/hi2";

import { Button } from "@/core/components/ui/button";
import { Note } from "@/core/components/ui/note";
import { useTranslation } from "@/features/i18n/use-translation";

import * as T from "../tabular";
import { boundsOf, columnName } from "../tabular.ui";
import type { TabularController } from "../use-tabular";

import "react-data-grid/lib/styles.css";
import "./tabular-grid.css";

const InlineEditor = ({
  value,
  onCommit,
  onExpand,
  onCancel,
}: {
  readonly value: string;
  readonly onCommit: (
    text: string,
    direction: "down" | "right" | "up" | "left"
  ) => void;
  readonly onExpand: (text: string) => void;
  readonly onCancel: () => void;
}) => {
  const { t } = useTranslation();
  const [draft, setDraft] = useState(value);
  const composing = useRef(false);
  const done = useRef(false);
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (/[\r\n]/u.test(value)) {
      if (!done.current) {
        done.current = true;
        onExpand(value);
      }
    } else {
      input.current?.focus();
      input.current?.select();
    }
  }, [value, onExpand]);
  const commit = (direction: "down" | "right" | "up" | "left") => {
    if (done.current || composing.current) {
      return;
    }
    done.current = true;
    onCommit(draft, direction);
  };
  if (/[\r\n]/u.test(value)) {
    return null;
  }
  return (
    <div className="tabular-inline">
      <input
        aria-label={t("tabularCellText")}
        ref={input}
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        onCompositionStart={() => {
          composing.current = true;
        }}
        onCompositionEnd={() => {
          composing.current = false;
        }}
        onBlur={(event) => {
          if (
            !event.currentTarget.parentElement?.contains(event.relatedTarget)
          ) {
            commit("down");
          }
        }}
        onKeyDown={(event) => {
          if (composing.current || event.nativeEvent.isComposing) {
            event.stopPropagation();
            return;
          }
          if (event.key === "Escape") {
            event.stopPropagation();
            done.current = true;
            onCancel();
          } else if (event.key === "Enter" && event.altKey) {
            event.preventDefault();
            event.stopPropagation();
            done.current = true;
            onExpand(`${draft}\n`);
          } else if (event.key === "Enter" || event.key === "Tab") {
            event.preventDefault();
            event.stopPropagation();
            commit(
              event.key === "Tab"
                ? event.shiftKey
                  ? "left"
                  : "right"
                : event.shiftKey
                  ? "up"
                  : "down"
            );
          }
        }}
      />
      <button
        type="button"
        aria-label={t("tabularMultiline")}
        onClick={() => {
          done.current = true;
          onExpand(draft);
        }}
      >
        <HiPencilSquare aria-hidden />
      </button>
    </div>
  );
};

const useTabularColumns = (
  c: TabularController,
  grid: React.RefObject<DataGridHandle | null>,
  onEdit: (text?: string) => void,
  rowMap: Map<number, T.Viewport["rows"][number]>,
  rows: readonly number[],
  box: ReturnType<typeof boundsOf>,
  widths: ColumnWidths
) => {
  const { t, locale } = useTranslation();
  const getCell = (row: number, columnId: T.ColumnId) =>
    rowMap.get(row)?.cells.find((cell) => cell.columnId === columnId);
  const commitInline = (
    props: RenderEditCellContentProps<number>,
    text: string,
    direction: "down" | "right" | "up" | "left",
    cell: T.Cell
  ) => {
    props.onClose(false);
    if (!c.sheetId) {
      return;
    }
    void c
      .applyChange({
        _tag: "SetCell",
        address: {
          sheetId: c.sheetId,
          rowId: cell.rowId,
          columnId: cell.columnId,
        },
        text,
      })
      .then((result) => {
        if (!result || c.query.search || c.query.sort) {
          return;
        }
        const position = {
          rowIdx: Math.max(
            0,
            Math.min(
              rows.length - 1,
              props.rowIdx +
                (direction === "down" ? 1 : direction === "up" ? -1 : 0)
            )
          ),
          idx: Math.max(
            1,
            Math.min(
              c.columns.length,
              props.column.idx +
                (direction === "right" ? 1 : direction === "left" ? -1 : 0)
            )
          ),
        };
        grid.current?.setActivePosition(position, { shouldFocus: true });
      });
  };
  const columns: Column<number>[] = [
    {
      key: "row-number",
      name: "#",
      width: 56,
      frozen: true,
      resizable: false,
      sortable: false,
      cellClass: "tabular-row-number",
      renderCell: ({ row }) => (
        <span className="num">{(row + 1).toLocaleString(locale)}</span>
      ),
    },
    ...c.columns.map((column, index): Column<number> => ({
      key: column.columnId,
      name:
        column.label || t("tabularBlankHeader", { column: columnName(index) }),
      width: widths.get(column.columnId)?.width ?? 144,
      minWidth: 80,
      maxWidth: 640,
      resizable: true,
      sortable: true,
      cellClass: (row) =>
        `tabular-cell${row >= box.rowStart && row <= box.rowEnd && index >= box.columnStart && index <= box.columnEnd ? " tabular-range" : ""}${getCell(row, column.columnId)?.changed ? " tabular-changed" : ""}`,
      editable: (row) => !c.busy && Boolean(getCell(row, column.columnId)),
      renderCell: ({ row }) => {
        const cell = getCell(row, column.columnId);
        return cell ? (
          <span className="tabular-value" title={cell.display}>
            {cell.value._tag === "Unresolved" ? (
              <>
                <span aria-hidden>!</span>{" "}
                <span className="sr-only">{t("tabularUnresolved")}: </span>
              </>
            ) : null}
            {cell.display}
            {cell.changed ? (
              <>
                <span className="tabular-edit-mark" aria-hidden />{" "}
                <span className="sr-only">{t("tabularEdited")}</span>
              </>
            ) : null}
          </span>
        ) : (
          <span aria-label={t("loading")} className="tabular-cell-loading" />
        );
      },
      editorOptions: {
        commitOnOutsideClick: false,
        closeOnExternalRowChange: false,
      },
      renderEditCell: (props) => {
        const cell = getCell(props.row, column.columnId);
        if (!cell) {
          return null;
        }
        return (
          <InlineEditor
            value={cell.display}
            onCommit={(text, direction) =>
              commitInline(props, text, direction, cell)
            }
            onCancel={() => props.onClose(false)}
            onExpand={(text) => {
              props.onClose(false);
              onEdit(text);
            }}
          />
        );
      },
    })),
  ];
  return columns;
};

const CellActions = ({
  controller: c,
  onEdit,
  onRange,
}: {
  readonly controller: TabularController;
  readonly onEdit: (text?: string) => void;
  readonly onRange: () => void;
}) => {
  const { t } = useTranslation();
  const { view } = c;
  if (!view) {
    return null;
  }
  return (
    <>
      <div className="border-rule flex flex-wrap items-center gap-2 border-x-2 border-b-2 p-3">
        <output className="num min-w-16 text-sm">
          {columnName(c.range.extent.column)}
          {c.range.extent.row + 1}
        </output>
        <p className="text-muted-fg min-w-0 flex-1 truncate text-sm">
          {c.activeCell?.display || t("tabularBlankValue")}
        </p>
        <Button
          intent="outline"
          isDisabled={!c.address || c.busy}
          onPress={() => onEdit()}
        >
          <HiPencilSquare aria-hidden />
          {t("tabularEditCell")}
        </Button>
        <Button
          intent="plain"
          isDisabled={!c.activeCell?.canRevert || c.busy}
          onPress={() => {
            if (c.address) {
              void c.applyChange({ _tag: "RevertCell", address: c.address });
            }
          }}
        >
          <HiArrowUturnLeft aria-hidden />
          {t("tabularRevertCell")}
        </Button>
        <Button
          intent="plain"
          isDisabled={!view.matchingRows || !view.columnCount || c.busy}
          onPress={onRange}
        >
          {t("tabularSelectRange")}
        </Button>
      </div>
      {c.activeCell?.value._tag === "Unresolved" ? (
        <div className="mt-3">
          <Note intent="warning">
            {c.activeCell.value.reason === "missing-formula-result"
              ? t("tabularMissingResult")
              : c.activeCell.value.reason === "formula-error"
                ? t("tabularFormulaError", { error: c.activeCell.display })
                : c.activeCell.value.reason === "cell-error"
                  ? t("tabularCellError", { error: c.activeCell.display })
                  : t("tabularUnsupportedValue")}
          </Note>
        </div>
      ) : null}
    </>
  );
};
const focusGridCell = (
  grid: DataGridHandle | null,
  position: { row: number; column: number }
) => {
  // The grid API only focuses when its logical position changes.
  const target = grid?.element?.querySelector(
    `[role="row"][aria-rowindex="${position.row + 2}"] > [role="gridcell"][aria-colindex="${position.column + 2}"]`
  );
  if (target instanceof HTMLElement) {
    target.focus();
  }
};

const useGridFocus = (
  c: TabularController,
  grid: React.RefObject<DataGridHandle | null>
) => {
  const { view } = c;
  const appliedFocus = useRef(0);
  useEffect(() => {
    if (!c.focus || c.focus.serial === appliedFocus.current) {
      return;
    }
    if (
      c.viewport?.viewId === view?.viewId &&
      c.columns.length === view?.columnCount &&
      view?.matchingRows
    ) {
      appliedFocus.current = c.focus.serial;
      grid.current?.scrollToCell({
        rowIdx: c.focus.position.row,
        idx: c.focus.position.column + 1,
      });
      grid.current?.setActivePosition(
        {
          rowIdx: c.focus.position.row,
          idx: c.focus.position.column + 1,
        },
        { shouldFocus: c.focus.shouldFocus !== false }
      );
      if (c.focus.shouldFocus !== false) {
        focusGridCell(grid.current, c.focus.position);
      }
    } else if (view?.matchingRows === 0) {
      if (c.focus.shouldFocus === false) {
        appliedFocus.current = c.focus.serial;
        return;
      }
      appliedFocus.current = c.focus.serial;
      const target = document.querySelector(
        view.columnCount === 0
          ? "#tabular-add-column"
          : c.query.search
            ? "#tabular-clear-search"
            : "#tabular-add-row"
      );
      if (target instanceof HTMLElement) {
        target.focus();
      }
    }
  }, [
    grid,
    c.focus,
    c.viewport,
    c.columns.length,
    c.query.search,
    view?.matchingRows,
    view?.viewId,
    view?.columnCount,
  ]);
};

export const TabularGrid = ({
  controller: c,
  onEdit,
  onRange,
  onPaste,
  onCopy,
}: {
  readonly controller: TabularController;
  readonly onEdit: (text?: string) => void;
  readonly onRange: () => void;
  readonly onPaste: (text?: string) => void;
  readonly onCopy: () => void;
}) => {
  const { t } = useTranslation();
  const grid = useRef<DataGridHandle>(null);
  const widths = c.columnWidths;
  const setWidths = c.setColumnWidths;
  const dragging = useRef(false);
  const { view } = c;
  const box = boundsOf(c.range);
  const multiline = /[\r\n]/u.test(c.activeCell?.display ?? "");
  const rows = useMemo(
    () => Array.from({ length: view?.matchingRows ?? 0 }, (_, index) => index),
    [view?.matchingRows]
  );
  const rowMap = useMemo(
    () => new Map(c.viewport?.rows.map((row) => [row.viewIndex, row])),
    [c.viewport]
  );
  const columns = useTabularColumns(c, grid, onEdit, rowMap, rows, box, widths);
  useGridFocus(c, grid);
  if (!view) {
    return null;
  }
  return (
    <section
      aria-label={t("tabularGridLabel", { sheet: c.sheet?.name ?? "" })}
      className="min-w-0"
    >
      <p className="text-muted-fg mb-2 text-xs/5" id="tabular-grid-help">
        {t("tabularGridHint")}
      </p>
      <div
        className="min-w-0"
        onPointerDown={(event) => {
          if (
            event.pointerType !== "touch" &&
            (event.target instanceof Element
              ? event.target.closest('[role="gridcell"]')
              : null)
          ) {
            dragging.current = true;
          }
        }}
        onPointerUp={() => (dragging.current = false)}
        onPointerLeave={() => (dragging.current = false)}
        onPointerMove={(event) => {
          if (!dragging.current || event.buttons !== 1) {
            return;
          }
          const cell =
            event.target instanceof Element
              ? event.target.closest('[role="gridcell"]')
              : null;
          const row = cell?.parentElement?.getAttribute("aria-rowindex");
          const column = cell?.getAttribute("aria-colindex");
          if (row && column && Number(column) > 1) {
            c.select(
              { row: Number(row) - 2, column: Number(column) - 2 },
              true
            );
          }
          const element = grid.current?.element;
          if (element) {
            const rect = element.getBoundingClientRect();
            if (event.clientY > rect.bottom - 40) {
              element.scrollTop += 44;
            }
            if (event.clientY < rect.top + 70) {
              element.scrollTop -= 44;
            }
            if (event.clientX > rect.right - 40) {
              element.scrollLeft += 40;
            }
            if (event.clientX < rect.left + 70) {
              element.scrollLeft -= 40;
            }
          }
        }}
        onPaste={(event) => {
          if (
            event.target instanceof Element &&
            event.target.closest("input,textarea")
          ) {
            return;
          }
          event.preventDefault();
          onPaste(event.clipboardData.getData("text/plain"));
        }}
        onCopy={(event) => {
          if (
            event.target instanceof Element &&
            event.target.closest("input,textarea")
          ) {
            return;
          }
          event.preventDefault();
          onCopy();
        }}
      >
        <DataGrid
          aria-label={t("tabularGridLabel", { sheet: c.sheet?.name ?? "" })}
          aria-describedby="tabular-grid-help"
          className="tabular-grid"
          ref={grid}
          columns={columns}
          rows={rows}
          rowKeyGetter={(row) => row}
          rowHeight={44}
          headerRowHeight={44}
          columnWidths={widths}
          onColumnWidthsChange={setWidths}
          sortColumns={
            c.query.sort
              ? [
                  {
                    columnKey: c.query.sort.columnId,
                    direction:
                      c.query.sort.direction === "ascending" ? "ASC" : "DESC",
                  },
                ]
              : []
          }
          onSortColumnsChange={(sorts) => {
            const sort = sorts.at(-1);
            c.setQuery({
              ...c.query,
              sort: sort
                ? {
                    columnId:
                      c.columns.find(
                        (column) => column.columnId === sort.columnKey
                      )?.columnId ?? T.ColumnId.make(sort.columnKey),
                    direction:
                      sort.direction === "ASC" ? "ascending" : "descending",
                  }
                : null,
            });
          }}
          onScroll={(event) => {
            let left = Math.max(0, event.currentTarget.scrollLeft);
            let column = 0;
            for (const entry of c.columns) {
              const width = widths.get(entry.columnId)?.width ?? 144;
              if (left <= width) {
                break;
              }
              left -= width;
              column += 1;
            }
            c.setWindowStart({
              row: Math.max(
                0,
                Math.floor(event.currentTarget.scrollTop / 44) - 8
              ),
              column: Math.max(0, column - 3),
            });
          }}
          onActivePositionChange={({ rowIdx, column }) => {
            if (rowIdx >= 0 && column && column.idx > 0) {
              c.select({ row: rowIdx, column: column.idx - 1 });
            }
          }}
          onCellMouseDown={({ rowIdx, column }, event) => {
            if (event.shiftKey && column.idx > 0 && rowIdx >= 0) {
              event.preventGridDefault();
              c.select({ row: rowIdx, column: column.idx - 1 }, true);
            }
          }}
          onCellClick={({ rowIdx, column }, event) => {
            if (column.idx > 0 && rowIdx >= 0) {
              c.select({ row: rowIdx, column: column.idx - 1 }, event.shiftKey);
              if (event.shiftKey) {
                event.preventGridDefault();
              }
            }
          }}
          onCellKeyDown={(args, event) => {
            if (
              args.mode !== "ACTIVE" ||
              !args.column ||
              args.column.idx === 0 ||
              args.rowIdx < 0
            ) {
              return;
            }
            if (event.key === "Enter" && multiline) {
              event.preventDefault();
              event.preventGridDefault();
              onEdit();
              return;
            }
            if (event.shiftKey && event.key.startsWith("Arrow")) {
              event.preventDefault();
              event.preventGridDefault();
              const position = {
                row: Math.max(
                  0,
                  Math.min(
                    view.matchingRows - 1,
                    c.range.extent.row +
                      (event.key === "ArrowDown"
                        ? 1
                        : event.key === "ArrowUp"
                          ? -1
                          : 0)
                  )
                ),
                column: Math.max(
                  0,
                  Math.min(
                    view.columnCount - 1,
                    c.range.extent.column +
                      (event.key === "ArrowRight"
                        ? 1
                        : event.key === "ArrowLeft"
                          ? -1
                          : 0)
                  )
                ),
              };
              c.select(position, true);
              grid.current?.scrollToCell({
                rowIdx: position.row,
                idx: position.column + 1,
              });
            }
            if (
              event.key.length === 1 &&
              !event.metaKey &&
              !event.ctrlKey &&
              !event.altKey &&
              !event.nativeEvent.isComposing
            ) {
              event.preventDefault();
              event.preventGridDefault();
              onEdit(event.key);
            }
            if (event.key === "F2") {
              event.preventDefault();
              event.preventGridDefault();
              onEdit();
            }
          }}
          renderers={{
            noRowsFallback: (
              <div className="p-6 text-sm" style={{ gridColumn: "1 / -1" }}>
                {t(
                  view.totalRows === 0
                    ? c.columns.length
                      ? "tabularEmptyRows"
                      : "tabularEmptySheet"
                    : "tabularNoMatches"
                )}
              </div>
            ),
          }}
        />
      </div>
      <CellActions controller={c} onEdit={onEdit} onRange={onRange} />
    </section>
  );
};
