/* oxlint-disable jsx-a11y/no-noninteractive-element-interactions -- The drop region duplicates its file button and is never the sole input. */
import { Fragment, useState } from "react";
import {
  HiArrowDownTray,
  HiArrowUturnLeft,
  HiArrowUturnRight,
  HiArrowsRightLeft,
  HiChartBar,
  HiChevronUpDown,
  HiEllipsisHorizontal,
  HiFolderOpen,
  HiInformationCircle,
  HiQueueList,
  HiScissors,
  HiSquare2Stack,
  HiTableCells,
  HiXMark,
} from "react-icons/hi2";

import { Button } from "@/core/components/ui/button";
import { Keyboard } from "@/core/components/ui/keyboard";
import {
  Menu,
  MenuContent,
  MenuHeader,
  MenuItem,
  MenuLabel,
  MenuSection,
} from "@/core/components/ui/menu";
import { Note } from "@/core/components/ui/note";
import {
  Popover,
  PopoverBody,
  PopoverContent,
  PopoverHeader,
  PopoverTitle,
} from "@/core/components/ui/popover";
import { SearchField, SearchInput } from "@/core/components/ui/search-field";
import { SelectTrigger } from "@/core/components/ui/select";
import { formatKilobytes } from "@/core/utils/file-size";
import { useTranslation } from "@/features/i18n/use-translation";

import * as T from "../tabular";
import { chartTypeLabelKey, chartTypes } from "../tabular.chart";
import type { ChartType } from "../tabular.chart";
import { columnName } from "../tabular.ui";
import type { TabularController } from "../use-tabular";
import { ChartTypeIcon } from "./tabular-chart-icons";

/**
 * The shortcut legend opened from the info mark. The grid keeps the same words
 * as its description; the popover prints them as keys and actions so a reader
 * can find one line without parsing a sentence.
 */
const shortcutRows = [
  ["tabularShortcutKeysMove", "tabularShortcutMove"],
  ["tabularShortcutKeysRange", "tabularShortcutRange"],
  ["tabularShortcutKeysEdge", "tabularShortcutEdge"],
  ["tabularShortcutKeysCopy", "tabularShortcutCopy"],
  ["tabularShortcutKeysEdit", "tabularShortcutEdit"],
  ["tabularShortcutKeysReplace", "tabularShortcutReplace"],
  ["tabularShortcutKeysNewline", "tabularShortcutNewline"],
  ["tabularShortcutKeysRevert", "tabularShortcutRevert"],
] as const;

/**
 * The drop zone is only for a page with no file. Once a file is open, its
 * name, size, and close action live in the Sheet menu, and the frame below
 * takes the drop.
 */
export const TabularInput = ({
  controller: c,
  onOpenFile,
  onFiles: takeFiles,
}: {
  readonly controller: TabularController;
  readonly onOpenFile: () => void;
  readonly onFiles: (files: readonly File[]) => void;
}) => {
  const { t } = useTranslation();
  const [dragging, setDragging] = useState(false);
  return (
    <section
      aria-label={t("tabularOpen")}
      className={`bracket border-input relative flex min-h-52 min-w-0 flex-col items-center justify-center border-2 px-6 py-8 text-center ${dragging ? "bg-wash-red" : ""}`}
      onDragOver={(event) => {
        event.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(event) => {
        event.preventDefault();
        setDragging(false);
        if (!c.busy) {
          takeFiles([...event.dataTransfer.files]);
        }
      }}
    >
      <div className="flex min-w-0 flex-col flex-wrap items-center gap-3">
        <div className="min-w-0">
          <h2 className="font-display text-xl leading-6 font-black uppercase [font-stretch:75%]">
            {t("tabularDrop")}
          </h2>
          <p className="text-muted-fg mt-2 text-xs/5">{t("tabularFormats")}</p>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-2">
          <Button intent="primary" isDisabled={c.busy} onPress={onOpenFile}>
            {t("tabularChoose")}
          </Button>
          <Button
            intent="outline"
            isDisabled={c.busy}
            onPress={() => c.openSample()}
          >
            {t("tabularSample")}
          </Button>
        </div>
      </div>
    </section>
  );
};

export const TabularSheetNote = ({
  controller: c,
}: {
  readonly controller: TabularController;
}) => {
  const { t, locale } = useTranslation();
  if (
    !c.session ||
    (c.session.format !== "xls" && c.session.format !== "xlsx")
  ) {
    return null;
  }
  return (
    <Note intent="warning">
      <div>
        <p>{t("tabularValuesOnly")}</p>
        <p className="mt-2">{t("tabularStaleResults")}</p>
        <p className="num mt-2">
          {t("tabularStoredCount", {
            count: c.session.sheets
              .reduce((sum, sheet) => sum + sheet.storedFormulaCount, 0)
              .toLocaleString(locale),
            unresolved: c.session.sheets
              .reduce((sum, sheet) => sum + sheet.unresolvedCount, 0)
              .toLocaleString(locale),
          })}
        </p>
      </div>
    </Note>
  );
};

/**
 * The phones fold the transformation actions into one menu, so the ribbon keeps
 * the grid tall and every mark keeps a 44px target.
 */
const TabularMoreMenu = ({
  controller: c,
  charting,
  onChart,
  onTable,
  onSplit,
  onMerge,
  onDedupe,
  onDiff,
}: {
  readonly controller: TabularController;
  readonly charting: boolean;
  readonly onChart: (type: ChartType) => void;
  readonly onTable: () => void;
  readonly onSplit: () => void;
  readonly onMerge: () => void;
  readonly onDedupe: () => void;
  readonly onDiff: () => void;
}) => {
  const { t } = useTranslation();
  return (
    <Menu>
      <Button
        id="tabular-open-more"
        intent="outline"
        size="sq-md"
        aria-label={t("tabularMoreActions")}
        isDisabled={c.busy}
      >
        <HiEllipsisHorizontal aria-hidden />
      </Button>
      <MenuContent
        aria-label={t("tabularMoreActions")}
        onAction={(key) => {
          if (key === "diff") {
            onDiff();
          } else if (key === "dedupe") {
            onDedupe();
          } else if (key === "split") {
            onSplit();
          } else if (key === "merge") {
            onMerge();
          } else if (key === "table") {
            onTable();
          } else {
            const next = chartTypes.find((type) => type === key);
            if (next) {
              onChart(next);
            }
          }
        }}
      >
        <MenuItem id="diff" textValue={t("tabularDiff")}>
          <HiArrowsRightLeft aria-hidden />
          <MenuLabel>{t("tabularDiff")}</MenuLabel>
        </MenuItem>
        <MenuItem id="dedupe" textValue={t("tabularDedupe")}>
          <HiSquare2Stack aria-hidden />
          <MenuLabel>{t("tabularDedupe")}</MenuLabel>
        </MenuItem>
        <MenuItem id="split" textValue={t("tabularSplit")}>
          <HiScissors aria-hidden />
          <MenuLabel>{t("tabularSplit")}</MenuLabel>
        </MenuItem>
        <MenuItem id="merge" textValue={t("tabularMerge")}>
          <HiQueueList aria-hidden />
          <MenuLabel>{t("tabularMerge")}</MenuLabel>
        </MenuItem>
        {charting ? (
          <MenuItem id="table" textValue={t("tabularTable")}>
            <HiTableCells aria-hidden />
            <MenuLabel>{t("tabularTable")}</MenuLabel>
          </MenuItem>
        ) : (
          <MenuSection>
            <MenuHeader separator>{t("tabularChartType")}</MenuHeader>
            {chartTypes.map((type) => (
              <MenuItem
                id={type}
                key={type}
                isDisabled={!c.view || c.viewStale}
                textValue={t(chartTypeLabelKey[type])}
              >
                <ChartTypeIcon type={type} />
                <MenuLabel>{t(chartTypeLabelKey[type])}</MenuLabel>
              </MenuItem>
            ))}
          </MenuSection>
        )}
      </MenuContent>
    </Menu>
  );
};

/**
 * The Sheet menu carries the file facts that used to stand in a section above
 * the frame. Its trigger names the file and the open Sheet, and its panel holds
 * the file actions, the Sheet list, and the file size.
 *
 * `SelectTrigger` is the shared well trigger shape; here the press context comes
 * from the surrounding `Menu`, so the mark opens the file menu.
 */
const TabularFileMenu = ({
  controller: c,
  onOpenFile,
}: {
  readonly controller: TabularController;
  readonly onOpenFile: () => void;
}) => {
  const { t, locale } = useTranslation();
  if (!c.session || !c.sheet) {
    return null;
  }
  const sheetLabel = t("tabularSheetRows", {
    name: c.sheet.name,
    rows: c.sheet.rowCount.toLocaleString(locale),
  });
  return (
    <Menu>
      <div className="w-full min-w-0 sm:w-80">
        <SelectTrigger
          className="py-1.5 sm:py-1"
          id="tabular-open-file"
          isDisabled={c.busy}
        >
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-bold">
              {c.session.sourceName}
            </span>
            <span className="num text-muted-fg block truncate text-xs">
              {sheetLabel}
            </span>
          </span>
          <HiChevronUpDown
            aria-hidden
            className="text-muted-fg ms-auto -me-1 size-5 shrink-0 sm:size-4"
          />
        </SelectTrigger>
      </div>
      <MenuContent
        aria-label={t("tabularSheetMenu")}
        className="min-w-64"
        onAction={(key) => {
          if (key === "open-file") {
            onOpenFile();
          } else if (key === "close-file") {
            c.closeFile();
          } else {
            c.switchSheet(T.SheetId.make(String(key)));
          }
        }}
      >
        <MenuSection>
          <MenuHeader
            className="text-fg tracking-normal [overflow-wrap:anywhere] normal-case"
            separator
          >
            {c.session.sourceName}
          </MenuHeader>
          <MenuItem id="open-file" textValue={t("tabularOpen")}>
            <HiFolderOpen aria-hidden />
            <MenuLabel>{t("tabularOpen")}</MenuLabel>
          </MenuItem>
          <MenuItem id="close-file" textValue={t("tabularClearFile")}>
            <HiXMark aria-hidden />
            <MenuLabel>{t("tabularClearFile")}</MenuLabel>
          </MenuItem>
        </MenuSection>
        <MenuSection>
          <MenuHeader className="num tracking-normal normal-case" separator>
            {t("tabularSessionFacts", {
              size: formatKilobytes(c.session.sourceBytes, locale),
              sheets: c.session.sheets.length.toLocaleString(locale),
            })}
          </MenuHeader>
          {c.session.sheets.map((sheet) => {
            const open = sheet.sheetId === c.sheetId;
            const visibility =
              sheet.visibility === "visible"
                ? ""
                : ` · ${t(sheet.visibility === "hidden" ? "tabularHidden" : "tabularVeryHidden")}`;
            const label = `${t("tabularSheetRows", {
              name: sheet.name,
              rows: sheet.rowCount.toLocaleString(locale),
            })}${visibility}`;
            return (
              <MenuItem
                key={sheet.sheetId}
                id={sheet.sheetId}
                className="pe-8"
                isSelected={open}
                textValue={label}
              >
                <MenuLabel>
                  {label}
                  {open ? (
                    <span className="sr-only">
                      , {t("tabularSheetCurrent")}
                    </span>
                  ) : null}
                </MenuLabel>
              </MenuItem>
            );
          })}
        </MenuSection>
      </MenuContent>
    </Menu>
  );
};

/**
 * The ribbon is the top floor of the editor frame: the work line, the operate
 * line, and the assist line. It reads as one window with the grid, not as a
 * toolbar on the page.
 */
export const TabularRibbon = ({
  controller: c,
  charting,
  onOpenFile,
  onExport,
  onChart,
  onTable,
  onSplit,
  onMerge,
  onDedupe,
  onDiff,
}: {
  readonly controller: TabularController;
  readonly charting: boolean;
  readonly onOpenFile: () => void;
  readonly onExport: () => void;
  readonly onChart: (type: ChartType) => void;
  readonly onTable: () => void;
  readonly onSplit: () => void;
  readonly onMerge: () => void;
  readonly onDedupe: () => void;
  readonly onDiff: () => void;
}) => {
  const { t } = useTranslation();
  if (!c.session) {
    return null;
  }
  const showClearSearch = c.view?.matchingRows === 0 && Boolean(c.query.search);
  const showNextUnresolved = Boolean(c.sheet?.unresolvedCount);
  const assist = showClearSearch || showNextUnresolved;
  return (
    <div className="bg-card border-rule flex min-w-0 flex-col border-b-2">
      <p className="sr-only" id="tabular-grid-help">
        {t("tabularGridHint")}
      </p>
      <div className="flex min-w-0 flex-wrap items-center gap-3 p-3">
        <TabularFileMenu controller={c} onOpenFile={onOpenFile} />
        <div className="flex min-w-0 flex-1 basis-56 items-center gap-2">
          <SearchField
            aria-label={t("tabularSearch")}
            className="min-w-0 flex-1"
            value={c.query.search}
            onChange={(search) => c.setQuery({ ...c.query, search })}
            onKeyDown={(event) => {
              if (event.key === "Escape") {
                c.setQuery({ ...c.query, search: "" });
              }
            }}
          >
            <SearchInput
              id="tabular-search"
              placeholder={t("tabularSearchValues")}
            />
          </SearchField>
          <div className="flex shrink-0 items-center gap-2">
            <Button
              className="max-lg:w-11 max-lg:px-0"
              intent="outline"
              aria-label={t("tabularUndo")}
              isDisabled={!c.session.history.canUndo || c.busy}
              onPress={() => {
                void c.applyChange("undo");
              }}
            >
              <HiArrowUturnLeft aria-hidden />
              <span className="hidden lg:inline">{t("tabularUndo")}</span>
            </Button>
            <Button
              className="max-lg:w-11 max-lg:px-0"
              intent="outline"
              aria-label={t("tabularRedo")}
              isDisabled={!c.session.history.canRedo || c.busy}
              onPress={() => {
                void c.applyChange("redo");
              }}
            >
              <HiArrowUturnRight aria-hidden />
              <span className="hidden lg:inline">{t("tabularRedo")}</span>
            </Button>
          </div>
        </div>
        {c.query.sort ? (
          <Button
            className="ms-auto"
            intent="plain"
            isDisabled={c.busy}
            onPress={() => c.setQuery({ ...c.query, sort: null })}
          >
            {t("tabularClearSort")}
          </Button>
        ) : null}
      </div>
      <div className="border-border flex min-w-0 flex-wrap items-center gap-2 border-t-2 px-3 py-2">
        <div className="hidden min-w-0 flex-wrap items-center gap-2 sm:flex">
          <Button
            id="tabular-open-diff"
            intent="outline"
            isDisabled={c.busy}
            onPress={onDiff}
          >
            <HiArrowsRightLeft aria-hidden />
            {t("tabularDiff")}
          </Button>
          <Button
            id="tabular-open-dedupe"
            intent="outline"
            isDisabled={c.busy}
            onPress={onDedupe}
          >
            <HiSquare2Stack aria-hidden />
            {t("tabularDedupe")}
          </Button>
          <Button
            id="tabular-open-split"
            intent="outline"
            isDisabled={c.busy}
            onPress={onSplit}
          >
            <HiScissors aria-hidden />
            {t("tabularSplit")}
          </Button>
          <Button
            id="tabular-open-merge"
            intent="outline"
            isDisabled={c.busy}
            onPress={onMerge}
          >
            <HiQueueList aria-hidden />
            {t("tabularMerge")}
          </Button>
        </div>
        <div className="ms-auto flex min-w-0 flex-wrap items-center justify-end gap-2">
          {charting ? (
            <Button id="tabular-open-table" intent="outline" onPress={onTable}>
              <HiTableCells aria-hidden />
              {t("tabularTable")}
            </Button>
          ) : (
            <div className="hidden sm:block">
              <Menu>
                <Button
                  id="tabular-open-chart"
                  intent="outline"
                  isDisabled={c.busy || !c.view || c.viewStale}
                >
                  <HiChartBar aria-hidden />
                  {t("tabularChart")}
                </Button>
                <MenuContent
                  aria-label={t("tabularChartType")}
                  onAction={(key) => {
                    const next = chartTypes.find((type) => type === key);
                    if (next) {
                      onChart(next);
                    }
                  }}
                >
                  {chartTypes.map((type) => (
                    <MenuItem id={type} key={type}>
                      <ChartTypeIcon type={type} />
                      <MenuLabel>{t(chartTypeLabelKey[type])}</MenuLabel>
                    </MenuItem>
                  ))}
                </MenuContent>
              </Menu>
            </div>
          )}
          <Button
            id="tabular-open-export"
            intent="primary"
            isDisabled={c.busy || !c.view || c.viewStale}
            onPress={onExport}
          >
            <HiArrowDownTray aria-hidden />
            {t("tabularExport")}
          </Button>
          <div className="sm:hidden">
            <TabularMoreMenu
              charting={charting}
              controller={c}
              onChart={onChart}
              onDedupe={onDedupe}
              onDiff={onDiff}
              onMerge={onMerge}
              onSplit={onSplit}
              onTable={onTable}
            />
          </div>
          <Popover>
            <Button
              id="tabular-open-shortcuts"
              intent="outline"
              size="sq-md"
              aria-label={t("tabularShortcuts")}
            >
              <HiInformationCircle aria-hidden />
            </Button>
            <PopoverContent
              className="w-[min(20rem,calc(100vw-2rem))]"
              placement="bottom end"
            >
              <PopoverHeader>
                <PopoverTitle>{t("tabularShortcuts")}</PopoverTitle>
              </PopoverHeader>
              <PopoverBody>
                <dl className="grid grid-cols-[auto_minmax(0,1fr)] items-baseline gap-x-3 gap-y-2">
                  {shortcutRows.map(([keys, label]) => (
                    <Fragment key={keys}>
                      <dt>
                        <Keyboard className="inline-flex whitespace-nowrap">
                          {t(keys)}
                        </Keyboard>
                      </dt>
                      <dd className="text-sm/5">{t(label)}</dd>
                    </Fragment>
                  ))}
                </dl>
                <p className="text-muted-fg mt-3 text-xs/5">
                  {t("tabularShortcutTouch")}
                </p>
              </PopoverBody>
            </PopoverContent>
          </Popover>
        </div>
      </div>
      {charting ? null : (
        <div
          className={`border-border min-w-0 flex-wrap items-center gap-2 border-t-2 px-3 py-2 ${
            assist ? "flex" : "hidden"
          }`}
        >
          {showClearSearch ? (
            <Button
              className="touch-target"
              id="tabular-clear-search"
              intent="outline"
              size="xs"
              onPress={() => {
                c.setQuery({ ...c.query, search: "" });
              }}
            >
              {t("tabularClearSearch")}
            </Button>
          ) : null}
          {showNextUnresolved ? (
            <Button
              className="touch-target"
              intent="outline"
              size="xs"
              onPress={() => c.nextUnresolved()}
            >
              {t("tabularNextUnresolved")}
            </Button>
          ) : null}
        </div>
      )}
    </div>
  );
};

export const TabularCellBar = ({
  controller: c,
}: {
  readonly controller: TabularController;
}) => {
  const { t } = useTranslation();
  if (!c.view) {
    return null;
  }
  return (
    <div className="border-rule bg-secondary flex min-w-0 items-center gap-2 border-t-2 px-3 py-2">
      <output className="num min-w-12 shrink-0 text-sm">
        {columnName(c.range.extent.column)}
        {c.range.extent.row + 1}
      </output>
      <span aria-hidden className="bg-border h-5 w-0.5 shrink-0" />
      <p className="text-muted-fg min-w-0 flex-1 truncate text-sm">
        {c.activeCell?.display || t("tabularBlankValue")}
      </p>
    </div>
  );
};

export const TabularCellNote = ({
  controller: c,
}: {
  readonly controller: TabularController;
}) => {
  const { t } = useTranslation();
  if (!c.view || c.activeCell?.value._tag !== "Unresolved") {
    return null;
  }
  return (
    <Note intent="warning">
      {c.activeCell.value.reason === "missing-formula-result"
        ? t("tabularMissingResult")
        : c.activeCell.value.reason === "formula-error"
          ? t("tabularFormulaError", { error: c.activeCell.display })
          : c.activeCell.value.reason === "cell-error"
            ? t("tabularCellError", { error: c.activeCell.display })
            : t("tabularUnsupportedValue")}
    </Note>
  );
};

export const TabularNotes = ({
  controller: c,
}: {
  readonly controller: TabularController;
}) => {
  const { t, locale } = useTranslation();
  const warningCount =
    c.session?.warningCounts.reduce((sum, warning) => sum + warning.count, 0) ??
    0;
  if (!c.session) {
    return null;
  }
  return warningCount ? (
    <details>
      <summary className="cursor-pointer py-2 font-semibold">
        {t("tabularWarnings")} · {warningCount.toLocaleString(locale)}
      </summary>
      <div className="space-y-2 py-3 text-sm">
        {c.session.warningCounts.map((warning, index) => (
          <p key={index}>
            {warning.code === "ragged-records"
              ? t("tabularRagged", {
                  count: warning.count.toLocaleString(locale),
                })
              : warning.code === "unresolved-value"
                ? t("tabularUnresolvedExport", {
                    count: warning.count.toLocaleString(locale),
                  })
                : t(
                    warning.code === "date-as-text"
                      ? "tabularDateText"
                      : warning.code === "merged-cells"
                        ? "tabularMerged"
                        : warning.code === "hidden-data"
                          ? "tabularHiddenData"
                          : warning.code === "source-precision"
                            ? "tabularPrecision"
                            : warning.code === "stored-formula"
                              ? "tabularStaleResults"
                              : warning.code === "encoding-guess" ||
                                  warning.code === "delimiter-guess"
                                ? "tabularAmbiguous"
                                : "tabularIgnoredFeatures"
                  )}
          </p>
        ))}
      </div>
    </details>
  ) : null;
};
