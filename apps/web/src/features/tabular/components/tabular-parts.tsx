/* oxlint-disable jsx-a11y/no-noninteractive-element-interactions -- The drop region duplicates its file button and is never the sole input. */
import { useState } from "react";
import {
  HiArrowDownTray,
  HiArrowUturnLeft,
  HiArrowUturnRight,
} from "react-icons/hi2";

import { Button } from "@/core/components/ui/button";
import { Label } from "@/core/components/ui/field";
import { Note } from "@/core/components/ui/note";
import { SearchField, SearchInput } from "@/core/components/ui/search-field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/core/components/ui/select";
import { useTranslation } from "@/features/i18n/use-translation";

import * as T from "../tabular";
import type { TabularController } from "../use-tabular";

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
          {c.session ? (
            <Button
              intent="outline"
              isDisabled={c.busy || !c.ready}
              onPress={() => c.closeFile()}
            >
              {t("tabularClearFile")}
            </Button>
          ) : (
            <>
              <Button
                intent="primary"
                isDisabled={c.busy || !c.ready}
                onPress={() => input.current?.click()}
              >
                {t("tabularChoose")}
              </Button>
              <Button
                intent="outline"
                isDisabled={c.busy || !c.ready}
                onPress={() => c.openSample()}
              >
                {t("tabularSample")}
              </Button>
            </>
          )}
        </div>
      </div>
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
  onExport,
}: {
  readonly controller: TabularController;
  readonly onExport: () => void;
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
          <Select
            className="w-full"
            selectedKey={c.sheetId ?? null}
            isDisabled={c.busy}
            onSelectionChange={(key) => {
              if (key !== null) {
                c.switchSheet(T.SheetId.make(String(key)));
              }
            }}
          >
            <Label>{t("tabularSheet")}</Label>
            <div className="mt-1">
              <SelectTrigger />
            </div>
            <SelectContent>
              {c.session.sheets.map((sheet) => {
                const visibility =
                  sheet.visibility === "visible"
                    ? ""
                    : ` · ${t(sheet.visibility === "hidden" ? "tabularHidden" : "tabularVeryHidden")}`;
                const label = `${t("tabularSheetRows", {
                  name: sheet.name,
                  rows: sheet.rowCount.toLocaleString(locale),
                })}${visibility}`;
                return (
                  <SelectItem
                    key={sheet.sheetId}
                    id={sheet.sheetId}
                    textValue={label}
                  >
                    {label}
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
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
          <SearchInput
            id="tabular-search"
            placeholder={t("tabularSearchValues")}
          />
        </SearchField>
        {c.query.sort ? (
          <Button
            intent="plain"
            isDisabled={c.busy}
            onPress={() => c.setQuery({ ...c.query, sort: null })}
          >
            {t("tabularClearSort")}
          </Button>
        ) : null}
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
        <Button
          id="tabular-open-export"
          className="ml-auto"
          intent="primary"
          isDisabled={c.busy || !c.view || c.viewStale}
          onPress={onExport}
        >
          <HiArrowDownTray aria-hidden />
          {t("tabularExport")}
        </Button>
      </div>
    </>
  );
};

export const TabularActions = ({
  controller: c,
}: {
  readonly controller: TabularController;
}) => {
  const { t } = useTranslation();
  const showClearSearch = c.view?.matchingRows === 0 && Boolean(c.query.search);
  const showNextUnresolved = Boolean(c.sheet?.unresolvedCount);
  if (!c.session || (!showClearSearch && !showNextUnresolved)) {
    return null;
  }
  return (
    <div className="-mt-4 flex flex-wrap gap-2">
      {showClearSearch ? (
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
      {showNextUnresolved ? (
        <Button intent="outline" onPress={() => c.nextUnresolved()}>
          {t("tabularNextUnresolved")}
        </Button>
      ) : null}
    </div>
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
