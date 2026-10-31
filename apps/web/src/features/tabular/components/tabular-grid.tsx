/* oxlint-disable promise/prefer-await-to-then -- Inline editor close and navigation follow the atomic engine commit. */
/* oxlint-disable react/immutability -- Scroll offsets are imperative DOM state on the grid element, not React data. */
/* oxlint-disable anti-slop/no-runtime-typeof -- react-data-grid exposes `editable` as a boolean-or-predicate union. */
/* oxlint-disable eslint/complexity -- The grid keeps one explicit branch per intercepted key and structural action. */
/* oxlint-disable react-doctor/no-giant-component -- One grid component owns the virtualized DOM surface; splitting it would duplicate focus and editor wiring. */
"use client";

import { Effect } from "effect";
import { useEffect, useMemo, useRef, useState } from "react";
import { Pressable } from "react-aria-components/Pressable";
import {
  DataGrid,
  renderHeaderCell as renderDefaultHeaderCell,
} from "react-data-grid";
import type {
  Column,
  ColumnWidths,
  DataGridHandle,
  RenderEditCellContentProps,
  RenderSortStatusProps,
} from "react-data-grid";
import {
  HiArrowDown,
  HiArrowLeft,
  HiArrowRight,
  HiArrowUp,
  HiPencilSquare,
  HiPlus,
  HiTrash,
} from "react-icons/hi2";
import { toast } from "sonner";

import { Button } from "@/core/components/ui/button";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuLabel,
  ContextMenuSeparator,
} from "@/core/components/ui/context-menu";
import { useTranslation } from "@/features/i18n/use-translation";

import * as T from "../tabular";
import { boundsOf, columnName, writeClipboardWhenReady } from "../tabular.ui";
import type { GridPosition } from "../tabular.ui";
import type { TabularController } from "../use-tabular";

import "react-data-grid/lib/styles.css";
import "./tabular-grid.css";

interface EditorSeed {
  readonly row: number;
  readonly columnId: string;
  readonly text: string;
}

const InlineEditor = ({
  value,
  selectAll,
  clearSeed,
  onCommit,
  onCancel,
}: {
  readonly value: string;
  readonly selectAll: boolean;
  readonly clearSeed: React.Dispatch<React.SetStateAction<EditorSeed | null>>;
  readonly onCommit: (
    text: string,
    direction: "down" | "right" | "up" | "left"
  ) => void;
  readonly onCancel: () => void;
}) => {
  const { t } = useTranslation();
  const [draft, setDraft] = useState(value);
  const selectOnMount = useRef(selectAll);
  const composing = useRef(false);
  const done = useRef(false);
  const input = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    const element = input.current;
    if (!element) {
      return;
    }
    element.focus();
    if (selectOnMount.current) {
      element.select();
    } else {
      element.setSelectionRange(element.value.length, element.value.length);
    }
    clearSeed(null);
  }, [clearSeed]);
  const commit = (direction: "down" | "right" | "up" | "left") => {
    if (done.current || composing.current) {
      return;
    }
    done.current = true;
    onCommit(draft, direction);
  };
  const cancel = () => {
    done.current = true;
    onCancel();
  };
  const singleLine = !/[\r\n]/u.test(draft);
  return (
    <div className="tabular-inline">
      <textarea
        aria-label={t("tabularCellText")}
        className={singleLine ? "tabular-inline-single" : undefined}
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
          // The draft owns every key while it has focus: arrows, Home, End,
          // and native undo must edit the text, not move the active cell.
          event.stopPropagation();
          if (event.key === "Escape") {
            cancel();
          } else if (event.key === "Tab") {
            event.preventDefault();
            commit(event.shiftKey ? "left" : "right");
          } else if (event.key === "Enter") {
            if (event.shiftKey || event.altKey) {
              // The textarea adds a line break.
              return;
            }
            event.preventDefault();
            commit("down");
          }
        }}
      />
    </div>
  );
};

// A sortable header keeps a faint up/down placeholder until the column sorts,
// so the header shows that it is clickable without waiting for a hover.
const SortStatus = ({ sortDirection, priority }: RenderSortStatusProps) =>
  sortDirection === undefined ? (
    <svg
      aria-hidden
      className="tabular-sort-placeholder"
      viewBox="0 0 12 12"
      width="12"
      height="12"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.25"
    >
      <path d="M4 10V2M2 4l2-2 2 2" />
      <path d="M8 2v8m-2-2 2 2 2-2" />
    </svg>
  ) : (
    <>
      <svg
        aria-hidden
        className="rdg-sort-arrow"
        viewBox="0 0 12 8"
        width="12"
        height="8"
      >
        <path d={sortDirection === "ASC" ? "M0 8 6 0 12 8" : "M0 0 6 8 12 0"} />
      </svg>
      {priority}
    </>
  );

const HeaderRename = ({
  value,
  onCommit,
  onCancel,
}: {
  readonly value: string;
  readonly onCommit: (text: string, focusHeader: boolean) => void;
  readonly onCancel: () => void;
}) => {
  const { t } = useTranslation();
  const [draft, setDraft] = useState(value);
  const composing = useRef(false);
  const done = useRef(false);
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const element = input.current;
    element?.focus();
    element?.select();
  }, []);
  const finish = (focusHeader: boolean) => {
    if (done.current || composing.current) {
      return;
    }
    done.current = true;
    onCommit(draft, focusHeader);
  };
  return (
    <input
      aria-label={t("tabularRenameHeader")}
      className="tabular-header-input"
      ref={input}
      value={draft}
      onChange={(event) => setDraft(event.target.value)}
      onCompositionStart={() => {
        composing.current = true;
      }}
      onCompositionEnd={() => {
        composing.current = false;
      }}
      onBlur={() => finish(false)}
      onKeyDown={(event) => {
        if (composing.current || event.nativeEvent.isComposing) {
          event.stopPropagation();
          return;
        }
        // Space, Enter, and arrows belong to the draft, not header sorting.
        event.stopPropagation();
        if (event.key === "Escape") {
          event.preventDefault();
          done.current = true;
          onCancel();
        } else if (event.key === "Enter") {
          event.preventDefault();
          finish(true);
        }
      }}
    />
  );
};

const RowNumberMenu = ({
  controller: c,
  row,
  rowId,
  tabIndex,
  children,
}: {
  readonly controller: TabularController;
  readonly row: number;
  readonly rowId: T.RowId | undefined;
  readonly tabIndex: number | undefined;
  readonly children: React.ReactNode;
}) => {
  const { t } = useTranslation();
  const { sheetId } = c;
  return (
    <ContextMenu>
      <Pressable>
        <button
          type="button"
          tabIndex={tabIndex}
          className="tabular-row-index"
          onClick={() => c.select({ row, column: 0 })}
        >
          {children}
        </button>
      </Pressable>
      <ContextMenuContent>
        <ContextMenuItem
          id="insert-row-before"
          isDisabled={c.busy || !rowId}
          onAction={() => {
            if (rowId) {
              void c.insertRows("before", rowId);
            }
          }}
        >
          <HiArrowUp aria-hidden />
          <ContextMenuLabel>{t("tabularInsertRowBefore")}</ContextMenuLabel>
        </ContextMenuItem>
        <ContextMenuItem
          id="insert-row-after"
          isDisabled={c.busy || !rowId}
          onAction={() => {
            if (rowId) {
              void c.insertRows("after", rowId);
            }
          }}
        >
          <HiArrowDown aria-hidden />
          <ContextMenuLabel>{t("tabularInsertRowAfter")}</ContextMenuLabel>
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem
          id="delete-row"
          intent="danger"
          isDisabled={c.busy || !rowId || !sheetId}
          onAction={() => {
            if (rowId && sheetId) {
              void c.applyChange({
                _tag: "DeleteRows",
                sheetId,
                rowIds: [rowId],
              });
            }
          }}
        >
          <HiTrash aria-hidden />
          <ContextMenuLabel>{t("tabularDeleteRow")}</ContextMenuLabel>
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
};

const useTabularColumns = (
  c: TabularController,
  grid: React.RefObject<DataGridHandle | null>,
  seed: EditorSeed | null,
  clearSeed: React.Dispatch<React.SetStateAction<EditorSeed | null>>,
  rowMap: Map<number, T.Viewport["rows"][number]>,
  rows: readonly number[],
  box: ReturnType<typeof boundsOf>,
  widths: ColumnWidths,
  rename: { readonly columnId: T.ColumnId; readonly value: string } | null,
  startRename: (column: T.Viewport["columns"][number]) => void,
  commitRename: (
    column: T.Viewport["columns"][number],
    text: string,
    focusHeader: boolean
  ) => void,
  cancelRename: () => void
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
      // The index reads down the gutter (tabular-grid.css), so it needs 32px,
      // not the 56px of a horizontal number.
      width: 32,
      minWidth: 32,
      maxWidth: 32,
      frozen: true,
      resizable: false,
      sortable: false,
      cellClass: "tabular-row-number",
      headerCellClass: "tabular-row-number-header",
      renderHeaderCell: (props) => (
        <ContextMenu>
          <Pressable>
            <button
              type="button"
              tabIndex={props.tabIndex}
              className="tabular-header flex min-h-11 w-full min-w-0 items-center justify-center border-0 bg-transparent p-0 text-center text-inherit outline-hidden"
            >
              {renderDefaultHeaderCell(props)}
            </button>
          </Pressable>
          <ContextMenuContent>
            <ContextMenuItem
              id="add-row-end"
              isDisabled={c.busy || !c.sheetId}
              onAction={() => {
                void c.insertRows("end");
              }}
            >
              <HiPlus aria-hidden />
              <ContextMenuLabel>{t("tabularAddRow")}</ContextMenuLabel>
            </ContextMenuItem>
          </ContextMenuContent>
        </ContextMenu>
      ),
      renderCell: ({ row, tabIndex }) => (
        <RowNumberMenu
          controller={c}
          row={row}
          rowId={rowMap.get(row)?.rowId}
          tabIndex={tabIndex}
        >
          <span className="num" title={(row + 1).toLocaleString(locale)}>
            {(row + 1).toLocaleString(locale)}
          </span>
        </RowNumberMenu>
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
      headerCellClass:
        rename?.columnId === column.columnId
          ? "tabular-header-renaming"
          : undefined,
      renderHeaderCell: (props) => {
        if (rename?.columnId === column.columnId) {
          return (
            <HeaderRename
              value={rename.value}
              onCommit={(text, focusHeader) =>
                commitRename(column, text, focusHeader)
              }
              onCancel={cancelRename}
            />
          );
        }
        return (
          <ContextMenu>
            <Pressable>
              <button
                type="button"
                tabIndex={props.tabIndex}
                className="tabular-header flex min-h-11 w-full min-w-0 items-center border-0 bg-transparent p-0 text-start text-inherit outline-hidden"
                onClick={(event) => {
                  event.stopPropagation();
                  const active = c.query.sort;
                  c.setQuery({
                    ...c.query,
                    sort:
                      active?.columnId === column.columnId
                        ? active.direction === "ascending"
                          ? {
                              columnId: column.columnId,
                              direction: "descending",
                            }
                          : null
                        : { columnId: column.columnId, direction: "ascending" },
                  });
                }}
              >
                {renderDefaultHeaderCell(props)}
              </button>
            </Pressable>
            <ContextMenuContent>
              <ContextMenuItem
                id="rename-header"
                isDisabled={c.busy || !c.sheet?.header}
                onAction={() => startRename(column)}
              >
                <HiPencilSquare aria-hidden />
                <ContextMenuLabel>{t("tabularRenameHeader")}</ContextMenuLabel>
              </ContextMenuItem>
              <ContextMenuSeparator />
              <ContextMenuItem
                id="insert-column-before"
                isDisabled={c.busy || !c.sheetId}
                onAction={() => {
                  if (c.sheetId) {
                    void c.applyChange({
                      _tag: "InsertColumns",
                      sheetId: c.sheetId,
                      before: column.columnId,
                      count: 1,
                    });
                  }
                }}
              >
                <HiArrowLeft aria-hidden />
                <ContextMenuLabel>
                  {t("tabularInsertColumnBefore")}
                </ContextMenuLabel>
              </ContextMenuItem>
              <ContextMenuItem
                id="insert-column-after"
                isDisabled={c.busy || !c.sheetId}
                onAction={() => {
                  if (c.sheetId) {
                    void c.applyChange({
                      _tag: "InsertColumns",
                      sheetId: c.sheetId,
                      before: c.columns[index + 1]?.columnId ?? null,
                      count: 1,
                    });
                  }
                }}
              >
                <HiArrowRight aria-hidden />
                <ContextMenuLabel>
                  {t("tabularInsertColumnAfter")}
                </ContextMenuLabel>
              </ContextMenuItem>
              <ContextMenuSeparator />
              <ContextMenuItem
                id="delete-column"
                intent="danger"
                isDisabled={c.busy || !c.sheetId}
                onAction={() => {
                  if (c.sheetId) {
                    void c.applyChange({
                      _tag: "DeleteColumns",
                      sheetId: c.sheetId,
                      columnIds: [column.columnId],
                    });
                  }
                }}
              >
                <HiTrash aria-hidden />
                <ContextMenuLabel>{t("tabularDeleteColumn")}</ContextMenuLabel>
              </ContextMenuItem>
            </ContextMenuContent>
          </ContextMenu>
        );
      },
      cellClass: (row) =>
        `tabular-cell${row >= box.rowStart && row <= box.rowEnd && index >= box.columnStart && index <= box.columnEnd ? " tabular-range" : ""}`,
      editable: (row) =>
        !c.busy && !c.viewStale && Boolean(getCell(row, column.columnId)),
      renderCell: ({ row }) => {
        const cell = getCell(row, column.columnId);
        return cell ? (
          <span className="tabular-value" title={cell.display}>
            {/* The underline marks the text only. It must not continue under
                the edit dot, whose inline-block would receive it from the
                cell. */}
            <span className={cell.changed ? "tabular-changed" : undefined}>
              {cell.value._tag === "Unresolved" ? (
                <>
                  <span aria-hidden>!</span>{" "}
                  <span className="sr-only">{t("tabularUnresolved")}: </span>
                </>
              ) : null}
              {cell.display}
            </span>
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
        const seeded = seed;
        const seedText =
          seeded !== null &&
          seeded.row === props.row &&
          seeded.columnId === column.columnId
            ? seeded.text
            : null;
        return (
          <InlineEditor
            value={seedText ?? cell.display}
            selectAll={seedText === null}
            clearSeed={clearSeed}
            onCommit={(text, direction) =>
              commitInline(props, text, direction, cell)
            }
            onCancel={() => props.onClose(false)}
          />
        );
      },
    })),
  ];
  return columns;
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

// A touch drag must not scroll the grid while a range selection is active, and
// it must not start selecting until the finger rests long enough to mean it.
const LONG_PRESS_MS = 420;
const TOUCH_SLOP_PX = 10;

const cellFromTarget = (target: EventTarget | null) => {
  const cell =
    target instanceof Element ? target.closest('[role="gridcell"]') : null;
  const row = cell?.parentElement?.getAttribute("aria-rowindex");
  const column = cell?.getAttribute("aria-colindex");
  if (!row || !column) {
    return null;
  }
  // Index 0 is the row-number gutter, which is never part of a range.
  const position = { row: Number(row) - 2, column: Number(column) - 2 };
  return position.row >= 0 && position.column >= 0 ? position : null;
};

const cellAtPoint = (x: number, y: number) =>
  cellFromTarget(document.elementFromPoint(x, y));

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
        c.query.search ? "#tabular-clear-search" : "#tabular-search"
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

const useHeaderRename = (
  c: TabularController,
  grid: React.RefObject<DataGridHandle | null>
) => {
  const [rename, setRename] = useState<{
    readonly columnId: T.ColumnId;
    readonly value: string;
  } | null>(null);
  const focusHeader = (columnId: T.ColumnId) => {
    const index = c.columns.findIndex((column) => column.columnId === columnId);
    if (index === -1) {
      return;
    }
    requestAnimationFrame(() => {
      const target = grid.current?.element?.querySelector(
        `[role="columnheader"][aria-colindex="${index + 2}"] button`
      );
      if (target instanceof HTMLElement) {
        target.focus();
      }
    });
  };
  const start = (column: T.Viewport["columns"][number]) => {
    if (c.busy || !c.sheet?.header) {
      return;
    }
    setRename({ columnId: column.columnId, value: column.label });
  };
  const commit = (
    column: T.Viewport["columns"][number],
    text: string,
    focusHeaderAfter: boolean
  ) => {
    setRename(null);
    if (focusHeaderAfter) {
      focusHeader(column.columnId);
    }
    if (c.sheetId) {
      void c.applyChange({
        _tag: "RenameHeader",
        sheetId: c.sheetId,
        columnId: column.columnId,
        text,
      });
    }
  };
  const cancel = () => {
    if (rename) {
      focusHeader(rename.columnId);
    }
    setRename(null);
  };
  return { rename, start, commit, cancel };
};

export const TabularGrid = ({
  controller: c,
  onPaste,
}: {
  readonly controller: TabularController;
  readonly onPaste: (text?: string) => void;
}) => {
  const { t, locale } = useTranslation();
  const grid = useRef<DataGridHandle>(null);
  const surface = useRef<HTMLDivElement>(null);
  const [seed, setSeed] = useState<EditorSeed | null>(null);
  const widths = c.columnWidths;
  const setWidths = c.setColumnWidths;
  const dragging = useRef(false);
  const longPress = useRef<{
    timer: number;
    x: number;
    y: number;
  } | null>(null);
  const suppressClick = useRef(false);
  const { view } = c;
  const {
    rename,
    start: startRename,
    commit: commitRename,
    cancel: cancelRename,
  } = useHeaderRename(c, grid);
  const box = boundsOf(c.range);
  // The primary border marks the active cell, so a range must move it with the
  // extent. The grid reports a programmatic move as a collapsed position, so
  // restore the range the caller already computed.
  const placeActiveCell = (position: GridPosition, anchor: GridPosition) => {
    grid.current?.setActivePosition(
      { idx: position.column + 1, rowIdx: position.row },
      { shouldFocus: true }
    );
    c.setRange({ anchor, extent: position });
  };
  const copySelection = () => {
    if (c.busy || c.viewStale) {
      return;
    }
    void Effect.runPromise(writeClipboardWhenReady(c.copyRange()))
      .then((written) => {
        if (!written) {
          return;
        }
        toast.success(
          t("tabularCopied", {
            rows: (box.rowEnd - box.rowStart + 1).toLocaleString(locale),
          }),
          { id: "tabular-copy" }
        );
      })
      .catch(() => {
        toast.error(t("tabularCopyDenied"), { id: "tabular-copy" });
      });
  };
  const rows = useMemo(
    () => Array.from({ length: view?.matchingRows ?? 0 }, (_, index) => index),
    [view?.matchingRows]
  );
  const rowMap = useMemo(
    () => new Map(c.viewport?.rows.map((row) => [row.viewIndex, row])),
    [c.viewport]
  );
  const columns = useTabularColumns(
    c,
    grid,
    seed,
    setSeed,
    rowMap,
    rows,
    box,
    widths,
    rename,
    startRename,
    commitRename,
    cancelRename
  );
  useGridFocus(c, grid);
  // A chart replaces the grid without touching the Cell Selection. When the
  // grid comes back, put its active position back on that selection without
  // taking focus from the Chart button.
  const restored = useRef(false);
  useEffect(() => {
    if (restored.current) {
      return;
    }
    restored.current = true;
    const { row, column } = c.range.extent;
    const handle = requestAnimationFrame(() => {
      grid.current?.scrollToCell({ rowIdx: row, idx: column + 1 });
      grid.current?.setActivePosition(
        { idx: column + 1, rowIdx: row },
        { shouldFocus: false }
      );
    });
    return () => cancelAnimationFrame(handle);
  }, [c.range.extent]);
  const live = view !== null;
  useEffect(() => {
    const element = surface.current;
    if (!element || !live) {
      return;
    }
    // React registers touchmove as passive, so the wrapper cannot stop the
    // scroll that would cancel a selection drag from there.
    const blockScroll = (event: TouchEvent) => {
      if (dragging.current) {
        event.preventDefault();
      }
    };
    element.addEventListener("touchmove", blockScroll, { passive: false });
    return () => element.removeEventListener("touchmove", blockScroll);
  }, [live]);
  useEffect(
    () => () => {
      const press = longPress.current;
      if (press) {
        window.clearTimeout(press.timer);
      }
    },
    []
  );
  const clearLongPress = () => {
    const press = longPress.current;
    if (press) {
      window.clearTimeout(press.timer);
      longPress.current = null;
    }
  };
  if (!view) {
    return null;
  }
  return (
    <div
      className="min-w-0"
      ref={surface}
      onKeyDownCapture={(event) => {
        if (
          event.target instanceof Element &&
          event.target.closest("input,textarea")
        ) {
          return;
        }
        if (
          event.altKey &&
          !event.metaKey &&
          !event.ctrlKey &&
          event.key === "Backspace"
        ) {
          // Alt + Backspace reverts the active cell. It stays silent when
          // the cell has no source value to restore.
          event.preventDefault();
          event.stopPropagation();
          if (!c.busy && c.address && c.activeCell?.canRevert) {
            void c.applyChange({ _tag: "RevertCell", address: c.address });
          }
          return;
        }
        if (event.key !== "F2") {
          return;
        }
        const header =
          event.target instanceof Element
            ? event.target.closest('[role="columnheader"]')
            : null;
        const index = Number(header?.getAttribute("aria-colindex") ?? 0) - 2;
        const column = c.columns[index];
        if (!column) {
          return;
        }
        event.preventDefault();
        event.stopPropagation();
        startRename(column);
      }}
      onPointerDown={(event) => {
        suppressClick.current = false;
        if (
          event.target instanceof Element &&
          event.target.closest("input,textarea")
        ) {
          return;
        }
        const position = cellFromTarget(event.target);
        if (!position) {
          return;
        }
        if (event.pointerType !== "touch") {
          dragging.current = true;
          return;
        }
        if (!event.isPrimary) {
          return;
        }
        // Touch scrolls by default, so a finger must rest on a cell before
        // the drag turns into a selection. A quick drag scrolls as usual.
        clearLongPress();
        longPress.current = {
          timer: window.setTimeout(() => {
            longPress.current = null;
            dragging.current = true;
            suppressClick.current = true;
            c.select(position);
          }, LONG_PRESS_MS),
          x: event.clientX,
          y: event.clientY,
        };
      }}
      onPointerUp={() => {
        clearLongPress();
        dragging.current = false;
      }}
      onPointerCancel={() => {
        clearLongPress();
        dragging.current = false;
      }}
      onPointerLeave={() => {
        clearLongPress();
        dragging.current = false;
      }}
      onPointerMove={(event) => {
        if (!event.isPrimary) {
          return;
        }
        const press = longPress.current;
        if (press) {
          if (
            Math.abs(event.clientX - press.x) > TOUCH_SLOP_PX ||
            Math.abs(event.clientY - press.y) > TOUCH_SLOP_PX
          ) {
            clearLongPress();
          }
          return;
        }
        if (!dragging.current || event.buttons !== 1) {
          return;
        }
        // A touch pointer stays captured by the cell it started on, so read
        // the cell under the finger instead of the event target.
        const position =
          event.pointerType === "touch"
            ? cellAtPoint(event.clientX, event.clientY)
            : cellFromTarget(event.target);
        if (position) {
          c.select(position, true);
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
        copySelection();
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
        // The grid opens its inline editor on Ctrl/Cmd+V unless this prop is
        // present. The wrapper's paste event owns range paste; never turn a
        // clipboard block into one cell of text.
        onCellPaste={({ row }) => row}
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
            const position = { row: rowIdx, column: column.idx - 1 };
            const { anchor } = c.range;
            c.select(position, true);
            placeActiveCell(position, anchor);
          }
        }}
        onCellClick={({ rowIdx, column }, event) => {
          // The click that ends a long press would collapse the range that
          // press just selected.
          if (suppressClick.current) {
            suppressClick.current = false;
            event.preventGridDefault();
            return;
          }
          if (column.idx > 0 && rowIdx >= 0) {
            c.select({ row: rowIdx, column: column.idx - 1 }, event.shiftKey);
            if (event.shiftKey) {
              event.preventGridDefault();
            }
          }
        }}
        onCellKeyDown={(args, event) => {
          const { column } = args;
          if (
            args.mode !== "ACTIVE" ||
            !column ||
            column.idx === 0 ||
            args.rowIdx < 0
          ) {
            return;
          }
          if (
            (event.ctrlKey || event.metaKey) &&
            !event.altKey &&
            event.key.startsWith("Arrow")
          ) {
            // Ctrl/Cmd + Arrow jumps to the sheet edge, as a spreadsheet
            // does. Shift keeps the anchor so the jump extends the range.
            event.preventDefault();
            event.preventGridDefault();
            const { anchor } = c.range;
            const position = {
              row:
                event.key === "ArrowDown"
                  ? Math.max(0, view.matchingRows - 1)
                  : event.key === "ArrowUp"
                    ? 0
                    : c.range.extent.row,
              column:
                event.key === "ArrowRight"
                  ? Math.max(0, view.columnCount - 1)
                  : event.key === "ArrowLeft"
                    ? 0
                    : c.range.extent.column,
            };
            c.select(position);
            grid.current?.scrollToCell({
              rowIdx: position.row,
              idx: position.column + 1,
            });
            placeActiveCell(position, event.shiftKey ? anchor : position);
            return;
          }
          if (event.shiftKey && event.key.startsWith("Arrow")) {
            event.preventDefault();
            event.preventGridDefault();
            const { anchor } = c.range;
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
            placeActiveCell(position, anchor);
          }
          const { editable } = column;
          const cell = rowMap
            .get(args.rowIdx)
            ?.cells.find((candidate) => candidate.columnId === column.key);
          const canEdit =
            cell !== undefined &&
            (typeof editable === "function"
              ? editable(args.row)
              : editable === true);
          if (
            (event.key === "Enter" || event.key === "F2") &&
            !event.nativeEvent.isComposing &&
            canEdit
          ) {
            // Stop the key default, or it edits the new textarea instead.
            event.preventDefault();
            event.preventGridDefault();
            setSeed(null);
            args.setActivePosition(
              { idx: column.idx, rowIdx: args.rowIdx },
              { enableEditor: true }
            );
            return;
          }
          if (
            event.key.length === 1 &&
            !event.metaKey &&
            !event.ctrlKey &&
            !event.altKey &&
            !event.nativeEvent.isComposing &&
            canEdit
          ) {
            event.preventDefault();
            event.preventGridDefault();
            setSeed(
              event.key === " "
                ? null
                : {
                    row: args.rowIdx,
                    columnId: column.key,
                    text: event.key,
                  }
            );
            args.setActivePosition(
              { idx: column.idx, rowIdx: args.rowIdx },
              { enableEditor: true }
            );
          }
        }}
        renderers={{
          renderSortStatus: SortStatus,
          noRowsFallback: (
            <div
              className="flex flex-col items-start gap-3 p-6 text-sm"
              style={{ gridColumn: "1 / -1" }}
            >
              <p>
                {t(
                  view.totalRows === 0
                    ? c.columns.length
                      ? "tabularEmptyRows"
                      : "tabularEmptySheet"
                    : "tabularNoMatches"
                )}
              </p>
              {view.totalRows === 0 ? (
                <div className="flex flex-wrap gap-2">
                  {c.columns.length ? (
                    <Button
                      intent="outline"
                      isDisabled={c.busy}
                      onPress={() => {
                        void c.insertRows("end");
                      }}
                    >
                      <HiPlus aria-hidden />
                      {t("tabularAddRow")}
                    </Button>
                  ) : (
                    <Button
                      intent="outline"
                      isDisabled={c.busy || !c.sheetId}
                      onPress={() => {
                        if (c.sheetId) {
                          void c.applyChange({
                            _tag: "InsertColumns",
                            sheetId: c.sheetId,
                            before: null,
                            count: 1,
                          });
                        }
                      }}
                    >
                      <HiPlus aria-hidden />
                      {t("tabularAddColumn")}
                    </Button>
                  )}
                </div>
              ) : null}
            </div>
          ),
        }}
      />
    </div>
  );
};
