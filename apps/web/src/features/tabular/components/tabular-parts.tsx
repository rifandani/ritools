/* oxlint-disable jsx-a11y/no-noninteractive-element-interactions -- The drop region duplicates its file button and is never the sole input. */
import { useState } from "react";
import {
  HiDocumentPlus,
  HiArrowUturnLeft,
  HiArrowUturnRight,
} from "react-icons/hi2";

import { Button } from "@/core/components/ui/button";
import { Note } from "@/core/components/ui/note";
import { SearchField, SearchInput } from "@/core/components/ui/search-field";
import { useTranslation } from "@/features/i18n/use-translation";

import * as T from "../tabular";
import { boundsOf } from "../tabular.ui";
import type { TabularController } from "../use-tabular";
import { TabularConfirm } from "./tabular-dialogs";
import { TabularSelect } from "./tabular-fields";

export const TabularInput = ({
  controller: c,
  input,
  onFiles: takeFiles,
}: {
  readonly controller: TabularController;
  readonly input: React.RefObject<HTMLInputElement | null>;
  readonly onFiles: (files: readonly File[]) => void;
}) => {
  const { t, locale } = useTranslation();
  const [dragging, setDragging] = useState(false);
  return (
    <section
      aria-label={t("tabularOpen")}
      className={`bracket border-input relative min-w-0 border-2 ${dragging ? "bg-wash-red" : ""} ${c.session ? "p-4" : "flex min-h-52 flex-col items-center justify-center px-6 py-8 text-center"}`}
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
      <div
        className={`flex min-w-0 flex-wrap items-center gap-3 ${c.session ? "justify-between" : "flex-col"}`}
      >
        <div className="min-w-0">
          {c.session ? (
            <>
              <p className="text-base font-bold [overflow-wrap:anywhere]">
                {c.session.sourceName}
              </p>
              <p className="num text-muted-fg mt-1 text-xs">
                {t("tabularSessionFacts", {
                  size: c.session.sourceBytes.toLocaleString(locale),
                  sheets: c.session.sheets.length.toLocaleString(locale),
                })}
              </p>
            </>
          ) : (
            <>
              <h2 className="text-xl font-extrabold">{t("tabularDrop")}</h2>
              <p className="text-muted-fg mt-2 text-sm">
                {t("tabularFormats")}
              </p>
            </>
          )}
        </div>
        <div className="flex flex-wrap items-center justify-center gap-2">
          <Button
            intent="primary"
            isDisabled={c.busy || !c.ready}
            onPress={() => input.current?.click()}
          >
            <HiDocumentPlus aria-hidden />
            {t(c.session ? "tabularOpen" : "tabularChoose")}
          </Button>
          <Button
            intent="outline"
            isDisabled={c.busy || !c.ready}
            onPress={() => c.openSample()}
          >
            {t("tabularSample")}
          </Button>
          {c.session ? (
            <Button
              intent="plain"
              isDisabled={c.busy || !c.ready}
              onPress={() => c.closeFile()}
            >
              {t("tabularClearFile")}
            </Button>
          ) : null}
        </div>
      </div>
      {c.detection?.encoding && c.session ? (
        <p className="num text-muted-fg mt-3 text-xs">
          {t("tabularDetected", {
            value: `${c.detection.encoding.value.toUpperCase()} · ${c.detection.delimiter?.value === "\t" ? t("tabularTab") : (c.detection.delimiter?.value ?? "")}`,
          })}
        </p>
      ) : null}
      {c.session ? null : (
        <p className="text-muted-fg mt-4 text-xs">{t("tabularSampleSource")}</p>
      )}
      <input
        ref={input}
        type="file"
        accept=".csv,.xls,.xlsx,.tsv,.tab,.txt"
        className="sr-only"
        tabIndex={-1}
        aria-hidden
        onChange={(event) => {
          takeFiles([...(event.target.files ?? [])]);
          event.target.value = "";
        }}
      />
    </section>
  );
};

export const TabularToolbar = ({
  controller: c,
}: {
  readonly controller: TabularController;
}) => {
  const { t, locale } = useTranslation();
  if (!c.session) {
    return null;
  }
  return (
    <>
      {c.session.format === "xls" || c.session.format === "xlsx" ? (
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
      ) : null}
      <div className="flex min-w-0 flex-wrap items-end gap-3">
        <div className="w-full min-w-0 sm:w-64">
          <TabularSelect
            label={t("tabularSheet")}
            value={c.sheetId ?? ""}
            disabled={c.busy}
            onChange={(id) => c.switchSheet(T.SheetId.make(id))}
          >
            {c.session.sheets.map((sheet) => (
              <option key={sheet.sheetId} value={sheet.sheetId}>
                {sheet.name} · {sheet.rowCount.toLocaleString(locale)}
                {sheet.visibility === "visible"
                  ? ""
                  : ` · ${t(sheet.visibility === "hidden" ? "tabularHidden" : "tabularVeryHidden")}`}
              </option>
            ))}
          </TabularSelect>
        </div>
        <SearchField
          aria-label={t("tabularSearch")}
          className="min-w-0 flex-1 basis-60"
          value={c.query.search}
          onChange={(search) => c.setQuery({ ...c.query, search })}
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              c.setQuery({ ...c.query, search: "" });
            }
          }}
        >
          <SearchInput id="tabular-search" placeholder={t("tabularSearch")} />
        </SearchField>
        <Button
          intent="outline"
          isDisabled={!c.session.history.canUndo || c.busy}
          onPress={() => {
            void c.applyChange("undo");
          }}
        >
          <HiArrowUturnLeft aria-hidden />
          {t("tabularUndo")}
        </Button>
        <Button
          intent="outline"
          isDisabled={!c.session.history.canRedo || c.busy}
          onPress={() => {
            void c.applyChange("redo");
          }}
        >
          <HiArrowUturnRight aria-hidden />
          {t("tabularRedo")}
        </Button>
      </div>
      <div className="-mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm">
        <p className="num">
          {t("tabularRowCounts", {
            matched: (c.view?.matchingRows ?? 0).toLocaleString(locale),
            total: (c.sheet?.rowCount ?? 0).toLocaleString(locale),
          })}
        </p>
        <p>
          {t("tabularEditedCount", {
            count: c.session.history.changedCellCount.toLocaleString(locale),
          })}
        </p>
        <p>
          {t("tabularHeaderCount", {
            count: c.session.history.changedHeaderCount.toLocaleString(locale),
          })}
        </p>
        <p>
          {t("tabularStructureCount", {
            count: c.session.history.structuralEditCount.toLocaleString(locale),
          })}
        </p>
        <p>
          {t("tabularSheetOrder")}
          {c.query.sort
            ? ` · ${t(c.query.sort.direction === "ascending" ? "tabularSortAscending" : "tabularSortDescending")}`
            : ""}
        </p>
        {c.query.sort ? (
          <Button
            intent="plain"
            onPress={() => c.setQuery({ ...c.query, sort: null })}
          >
            {t("tabularClearSort")}
          </Button>
        ) : null}
      </div>
    </>
  );
};

export const TabularActions = ({
  controller: c,
  onCopy: copy,
  onPaste,
  onRevert,
  onParse,
}: {
  readonly controller: TabularController;
  readonly onCopy: () => void;
  readonly onPaste: () => void;
  readonly onRevert: () => void;
  readonly onParse: () => void;
}) => {
  const { t, locale } = useTranslation();
  const [confirmRows, setConfirmRows] = useState(false);
  const box = boundsOf(c.range);
  if (!c.session) {
    return null;
  }
  return (
    <>
      {c.view?.matchingRows === 0 && c.query.search ? (
        <Button
          id="tabular-clear-search"
          intent="outline"
          onPress={() => {
            c.setQuery({ ...c.query, search: "" });
          }}
        >
          {t("tabularClearSearch")}
        </Button>
      ) : null}
      <div className="-mt-4 flex flex-wrap gap-2">
        <Button
          id="tabular-add-row"
          intent="outline"
          isDisabled={c.busy || !c.sheet?.columnCount}
          onPress={() => {
            if (c.query.search || c.query.sort) {
              setConfirmRows(true);
            } else {
              void c.insertRows("end");
            }
          }}
        >
          {t("tabularAddRow")}
        </Button>
        <Button
          id="tabular-add-column"
          intent="outline"
          isDisabled={c.busy || !c.ready}
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
          {t("tabularAddColumn")}
        </Button>
        <Button intent="plain" isDisabled={c.busy || !c.address} onPress={copy}>
          {t("tabularCopyRange")}
        </Button>
        <Button
          intent="plain"
          isDisabled={c.busy || !c.address}
          onPress={onPaste}
        >
          {t("tabularPasteText")}
        </Button>
        <Button
          intent="plain"
          isDisabled={c.busy || !c.session.history.dirty}
          onPress={onRevert}
        >
          {t("tabularRevertAll")}
        </Button>
        <Button
          intent="plain"
          isDisabled={c.busy || !c.ready}
          onPress={onParse}
        >
          {t("tabularParseSettings")}
        </Button>
        {c.sheet?.unresolvedCount ? (
          <Button intent="outline" onPress={() => c.nextUnresolved()}>
            {t("tabularNextUnresolved")}
          </Button>
        ) : null}
      </div>
      {box.rowEnd > box.rowStart || box.columnEnd > box.columnStart ? (
        <p className="num -mt-4 text-sm">
          {t("tabularRangeSize", {
            rows: (box.rowEnd - box.rowStart + 1).toLocaleString(locale),
            columns: (box.columnEnd - box.columnStart + 1).toLocaleString(
              locale
            ),
          })}
        </p>
      ) : null}
      {confirmRows ? (
        <TabularConfirm
          title={t("tabularAddRow")}
          description={t("tabularInsertViewWarning")}
          onCancel={() => setConfirmRows(false)}
          onConfirm={() => {
            setConfirmRows(false);
            void c.insertRows("end");
          }}
        />
      ) : null}
    </>
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

export const TabularExplainer = () => {
  const { t } = useTranslation();
  return (
    <section className="border-rule border-t-[3px] pt-8">
      <h2 className="font-display text-3xl font-black uppercase">
        {t("tabularLocalHeading")}
      </h2>
      <div className="mt-4 max-w-prose space-y-3 text-sm/6">
        <p>{t("tabularLocalBody")}</p>
        <p>
          {t("tabularFormats")}. {t("tabularSourceSafe")}
        </p>
        <p>{t("tabularDateText")}</p>
        <p>{t("tabularValuesOnly")}</p>
        <p>{t("tabularValuesBody")}</p>
        <p>{t("tabularEngineOfflineHint")}</p>
        <p>
          {t("homeLocalLimit")} {t("tabularLifetime")}
        </p>
      </div>
    </section>
  );
};
