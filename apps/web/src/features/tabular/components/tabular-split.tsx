/* oxlint-disable eslint/complexity -- The split panel renders the fixed plan, blocked, and failure states in one modal. */
/* oxlint-disable react-doctor/no-giant-component -- The split panel owns one fixed split contract in one modal. */
"use client";

import { makeZip } from "client-zip";
import { useState } from "react";

import { Button } from "@/core/components/ui/button";
import {
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
} from "@/core/components/ui/modal";
import { Note } from "@/core/components/ui/note";
import { download } from "@/core/libs/files";
import { useTranslation } from "@/features/i18n/use-translation";

import type * as T from "../tabular";
import { splitPartCount, splitPartName } from "../tabular.split";
import type { TabularController } from "../use-tabular";
import { TabularError } from "./tabular-error";
import { TabularSelect, TabularText } from "./tabular-fields";

const delimiters = [
  { id: ",", labelKey: "tabularComma" },
  { id: ";", labelKey: "tabularSemicolon" },
  { id: "|", labelKey: "tabularPipe" },
] as const;

export const TabularSplit = ({
  controller: c,
  onClose,
}: {
  readonly controller: TabularController;
  readonly onClose: () => void;
}) => {
  const { t, locale } = useTranslation();
  const { sheet } = c;
  const workbook = c.session?.format === "xls" || c.session?.format === "xlsx";
  const detected = c.detection?.delimiter?.value;
  const [rowsText, setRowsText] = useState("1000");
  const [delimiter, setDelimiter] = useState<T.Delimiter>(
    detected === "," || detected === ";" || detected === "|" ? detected : ","
  );
  const [building, setBuilding] = useState(false);
  const [zipFailed, setZipFailed] = useState(false);
  const dataRows = sheet?.rowCount ?? 0;
  const columns = sheet?.columnCount ?? 0;
  const parsedRows = /^\d+$/u.test(rowsText) ? Number(rowsText) : 0;
  const validRows = Number.isSafeInteger(parsedRows) && parsedRows >= 1;
  const partCount = validRows ? splitPartCount(dataRows, parsedRows) : 0;
  const names =
    partCount > 0
      ? {
          sourceName: c.session?.sourceName ?? "",
          sheetName: sheet?.name ?? "",
          workbook,
          partCount,
        }
      : null;
  const firstFile = names ? splitPartName(names, 0) : "";
  const lastFile = names ? splitPartName(names, partCount - 1) : "";
  const newline = c.detection?.newline === "crlf" ? "crlf" : "lf";
  const bom = c.detection?.bom ?? false;
  const unresolved = sheet?.unresolvedCount ?? 0;
  const blocked = !sheet || !validRows || dataRows === 0 || columns === 0;
  const downloadParts = async (result: T.SplitBytes) => {
    if (result.parts.length === 1) {
      const [part] = result.parts;
      if (part) {
        download(
          new Blob([Uint8Array.from(part.bytes)], { type: part.mime }),
          part.filename
        );
      }
      return;
    }
    setBuilding(true);
    setZipFailed(false);
    try {
      const zip = await new Response(
        makeZip(
          result.parts.map((part) => ({
            input: part.bytes,
            name: part.filename,
          }))
        )
      ).blob();
      download(zip, result.zipName);
    } catch {
      setZipFailed(true);
    }
    setBuilding(false);
  };
  const create = async () => {
    if (!sheet || blocked || unresolved > 0 || c.busy || building) {
      return;
    }
    setZipFailed(false);
    const splitOptions: T.SplitOptions = {
      sheetId: sheet.sheetId,
      rowsPerPart: parsedRows,
      delimiter,
      newline,
      bom,
      locale: locale === "id-id" ? "id-ID" : "en-US",
    };
    const result = await c.createSplit(splitOptions, workbook);
    if (result) {
      await downloadParts(result);
    }
  };
  const changeRows = (value: string) => {
    setRowsText(value);
    setZipFailed(false);
  };
  const changeDelimiter = (value: string) => {
    const next = delimiters.find((entry) => entry.id === value);
    if (next) {
      setDelimiter(next.id);
      setZipFailed(false);
    }
  };
  return (
    <ModalContent
      isOpen
      aria-label={t("tabularSplitTitle")}
      size="lg"
      isDismissable={!c.busy && !building}
      onOpenChange={(open) => {
        if (!open) {
          onClose();
        }
      }}
    >
      <ModalHeader title={t("tabularSplitTitle")} />
      <ModalBody>
        <div className="grid gap-4 sm:grid-cols-2">
          <TabularText
            label={t("tabularSplitRowsPerPart")}
            value={rowsText}
            type="number"
            min={1}
            disabled={c.busy}
            onChange={changeRows}
          />
          <TabularSelect
            label={t("tabularDelimiter")}
            id="tabular-split-delimiter"
            value={delimiter}
            disabled={c.busy}
            options={delimiters.map((entry) => ({
              id: entry.id,
              label: t(entry.labelKey),
            }))}
            onChange={changeDelimiter}
          />
        </div>
        {validRows ? null : (
          <Note className="mt-4" intent="warning">
            {t("tabularSplitInvalidRows")}
          </Note>
        )}
        {sheet && dataRows === 0 ? (
          <Note className="mt-4" intent="warning">
            {t("tabularSplitEmpty")}
          </Note>
        ) : null}
        {sheet && dataRows > 0 && columns === 0 ? (
          <Note className="mt-4" intent="warning">
            {t("tabularSplitNoColumns")}
          </Note>
        ) : null}
        {partCount > 0 ? (
          <div className="mt-4 space-y-2 text-sm">
            <p className="text-muted-fg [overflow-wrap:anywhere]">
              {t("tabularSplitFirstFile", { name: firstFile })}
            </p>
            {partCount > 1 ? (
              <p className="text-muted-fg [overflow-wrap:anywhere]">
                {t("tabularSplitLastFile", { name: lastFile })}
              </p>
            ) : null}
            <p className="text-muted-fg">
              {t("tabularSplitDialect", {
                delimiter: t(
                  delimiter === ","
                    ? "tabularComma"
                    : delimiter === ";"
                      ? "tabularSemicolon"
                      : "tabularPipe"
                ),
                newline: t(newline === "crlf" ? "tabularCrlf" : "tabularLf"),
                bom: t(bom ? "tabularBom" : "tabularNoBom"),
              })}
            </p>
            {partCount > 1000 ? (
              <Note intent="info">
                {t("tabularSplitMany", {
                  parts: partCount.toLocaleString(locale),
                })}
              </Note>
            ) : null}
          </div>
        ) : null}
        {sheet?.header ? null : (
          <p className="mt-4 text-sm">{t("tabularSplitNoHeaders")}</p>
        )}
        {workbook ? (
          <Note intent="warning">
            <p>{t("tabularValuesOnly")}</p>
            <p className="mt-2">{t("tabularStaleResults")}</p>
          </Note>
        ) : null}
        {unresolved > 0 ? (
          <Note intent="warning">
            <p>
              {t("tabularUnresolvedExport", {
                count: unresolved.toLocaleString(locale),
              })}
            </p>
            <div className="mt-3">
              <Button
                intent="outline"
                onPress={() => {
                  onClose();
                  c.nextUnresolved();
                }}
              >
                {t("tabularNextUnresolved")}
              </Button>
            </div>
          </Note>
        ) : null}
        {c.failure ? <TabularError error={c.failure} /> : null}
        {c.busy ? (
          <Note intent="info">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p>{t("tabularWriting")}</p>
              <Button
                intent="outline"
                onPress={() => {
                  c.cancel();
                }}
              >
                {t("tabularCancel")}
              </Button>
            </div>
          </Note>
        ) : null}
        {building ? (
          <Note intent="info">{t("tabularSplitBuilding")}</Note>
        ) : null}
        {zipFailed ? (
          <Note intent="danger">{t("tabularSplitZipFailed")}</Note>
        ) : null}
      </ModalBody>
      <ModalFooter>
        <Button
          intent="plain"
          isDisabled={c.busy || building}
          onPress={onClose}
        >
          {t("tabularCancel")}
        </Button>
        <Button
          intent="primary"
          isDisabled={blocked || unresolved > 0 || Boolean(c.busy) || building}
          onPress={create}
        >
          {t("tabularCreateDownload")}
        </Button>
      </ModalFooter>
    </ModalContent>
  );
};
