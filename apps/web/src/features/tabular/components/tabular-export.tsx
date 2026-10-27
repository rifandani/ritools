/* oxlint-disable eslint/complexity -- Explicit format and scope controls render the fixed export contract. */
/* oxlint-disable anti-slop/no-shape-in-symbol-names -- jsonShape is a field of the public engine contract. */
/* oxlint-disable promise/prefer-await-to-then -- UI callbacks settle prepared output before focus moves to its receipt. */
/* oxlint-disable react-doctor/no-array-index-as-key -- Examples and failures are immutable ordered entries in one export plan. */
import { Effect } from "effect";
import { useRef, useState } from "react";

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

import * as T from "../tabular";
import { writeClipboard } from "../tabular.ui";
import type { TabularController } from "../use-tabular";
import { TabularError } from "./tabular-error";
import { TabularSelect } from "./tabular-fields";

const TabularClipboard = ({
  text,
  rows = 0,
}: {
  readonly text: string;
  readonly rows?: number;
}) => {
  const { t, locale } = useTranslation();
  const [state, setState] = useState<"ready" | "copied" | "denied">("ready");
  const fallback = useRef<HTMLTextAreaElement>(null);
  const copy = () => {
    void Effect.runPromise(writeClipboard(text))
      .then(() => setState("copied"))
      .catch(() => {
        setState("denied");
        requestAnimationFrame(() => fallback.current?.focus());
      });
  };
  return (
    <div className="flex min-w-0 flex-col gap-3">
      <output className="text-sm">
        {state === "copied"
          ? t("tabularCopied", { rows: rows.toLocaleString(locale) })
          : t(
              state === "denied" ? "tabularClipboardDenied" : "tabularCopyReady"
            )}
      </output>
      <div className="flex flex-wrap gap-2">
        <Button intent="primary" onPress={copy}>
          {t("tabularCopy")}
        </Button>
        <Button
          intent="outline"
          onPress={() => {
            fallback.current?.focus();
            fallback.current?.select();
          }}
        >
          {t("tabularSelectText")}
        </Button>
        <Button
          intent="outline"
          onPress={() =>
            download(
              new Blob([text], {
                type: "text/tab-separated-values;charset=utf-8",
              }),
              "tabular-range.tsv"
            )
          }
        >
          {t("tabularDownloadTsv")}
        </Button>
      </div>
      <textarea
        ref={fallback}
        aria-label={t("tabularSelectText")}
        readOnly
        value={text}
        className="border-input bg-card min-h-32 w-full border-2 p-3 text-base outline-offset-2"
      />
    </div>
  );
};

interface ExportSettings {
  readonly format: T.OutputFormat;
  readonly scope: string;
  readonly delimiter: T.Delimiter;
  readonly newline: "lf" | "crlf";
  readonly bom: boolean;
  readonly policy: "spreadsheet-safe" | "exact";
  readonly jsonChoice: "auto" | "arrays";
}
const ExportFields = ({
  settings,
  busy,
  setFormat,
  setScope,
  setDelimiter,
  setNewline,
  setBom,
  setPolicy,
  setJsonChoice,
}: {
  readonly settings: ExportSettings;
  readonly busy: boolean;
  readonly setFormat: (v: T.OutputFormat) => void;
  readonly setScope: (v: string) => void;
  readonly setDelimiter: (v: T.Delimiter) => void;
  readonly setNewline: (v: "lf" | "crlf") => void;
  readonly setBom: (v: boolean) => void;
  readonly setPolicy: (v: "spreadsheet-safe" | "exact") => void;
  readonly setJsonChoice: (v: "auto" | "arrays") => void;
}) => {
  const { t } = useTranslation();
  const { format, scope, delimiter, newline, bom, policy, jsonChoice } =
    settings;
  const workbook = format === "xls" || format === "xlsx";
  const textOutput = ["csv", "tsv", "tab", "clipboard"].includes(format);
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <TabularSelect
        label={t("tabularFormat")}
        id="tabular-export-format"
        value={format}
        disabled={busy}
        onChange={(value) => {
          const next =
            T.OutputFormat.literals.find((entry) => entry === value) ?? "csv";
          setFormat(next);
          if (scope === "workbook" && next !== "xls" && next !== "xlsx") {
            setScope("");
          }
        }}
      >
        {T.OutputFormat.literals.map((value) => (
          <option key={value} value={value}>
            {value === "clipboard" ? t("tabularCopy") : value.toUpperCase()}
          </option>
        ))}
      </TabularSelect>
      <TabularSelect
        label={t("tabularScope")}
        value={scope}
        disabled={busy}
        onChange={setScope}
      >
        <option value="">{t("tabularSelectScope")}</option>
        <option value="view">{t("tabularCurrentView")}</option>
        <option value="sheet">{t("tabularWholeSheet")}</option>
        {workbook ? (
          <option value="workbook">{t("tabularWholeWorkbook")}</option>
        ) : null}
      </TabularSelect>
      {format === "csv" ? (
        <TabularSelect
          label={t("tabularDelimiter")}
          value={delimiter}
          onChange={(value) =>
            setDelimiter(
              T.Delimiter.literals.find((entry) => entry === value) ?? ","
            )
          }
        >
          <option value=",">{t("tabularComma")}</option>
          <option value=";">{t("tabularSemicolon")}</option>
          <option value="|">{t("tabularPipe")}</option>
        </TabularSelect>
      ) : null}
      {textOutput && format !== "clipboard" ? (
        <>
          <TabularSelect
            label={t("tabularNewline")}
            value={newline}
            onChange={(value) => setNewline(value === "crlf" ? "crlf" : "lf")}
          >
            <option value="lf">LF</option>
            <option value="crlf">CRLF</option>
          </TabularSelect>
          <TabularSelect
            label={t("tabularBom")}
            value={bom ? "yes" : "no"}
            onChange={(value) => setBom(value === "yes")}
          >
            <option value="no">{t("tabularNoBom")}</option>
            <option value="yes">{t("tabularBom")}</option>
          </TabularSelect>
        </>
      ) : null}
      {textOutput ? (
        <TabularSelect
          label={t("tabularSafeText")}
          value={policy}
          onChange={(value) =>
            setPolicy(value === "exact" ? "exact" : "spreadsheet-safe")
          }
        >
          <option value="spreadsheet-safe">{t("tabularSafeText")}</option>
          <option value="exact">{t("tabularExact")}</option>
        </TabularSelect>
      ) : null}
      {format === "json" ? (
        <TabularSelect
          label={t("tabularFormat")}
          value={jsonChoice}
          onChange={(value) =>
            setJsonChoice(value === "arrays" ? "arrays" : "auto")
          }
        >
          <option value="auto">{t("tabularAuto")}</option>
          <option value="arrays">{t("tabularJsonArrays")}</option>
        </TabularSelect>
      ) : null}
    </div>
  );
};

export const TabularExport = ({
  controller: c,
  onClose,
}: {
  readonly controller: TabularController;
  readonly onClose: () => void;
}) => {
  const { t, locale } = useTranslation();
  const [format, setFormat] = useState<T.OutputFormat>("csv");
  const [scope, setScope] = useState("view");
  const [delimiter, setDelimiter] = useState<T.Delimiter>(",");
  const [newline, setNewline] = useState<"lf" | "crlf">("lf");
  const [bom, setBom] = useState(false);
  const [policy, setPolicy] = useState<"spreadsheet-safe" | "exact">(
    "spreadsheet-safe"
  );
  const [jsonChoice, setJsonChoice] = useState<"auto" | "arrays">("auto");
  const token = JSON.stringify([
    format,
    scope,
    delimiter,
    newline,
    bom,
    policy,
    jsonChoice,
    c.session?.revision,
    c.view?.viewId,
  ]);
  const [ackToken, setAckToken] = useState("");
  const acknowledged = ackToken === token;
  const [review, setReview] = useState<{
    token: string;
    plan: T.ExportPlan;
  } | null>(null);
  const [receipt, setReceipt] = useState<{
    token: string;
    bytes: T.ExportBytes;
  } | null>(null);
  const prepared = review?.token === token ? review.plan : null;
  const output = receipt?.token === token ? receipt.bytes : null;
  const downloadButton = useRef<HTMLButtonElement>(null);
  const workbook = format === "xls" || format === "xlsx";
  const needsAck =
    workbook || c.session?.format === "xls" || c.session?.format === "xlsx";
  const textOutput =
    format === "csv" ||
    format === "tsv" ||
    format === "tab" ||
    format === "clipboard";
  const plan = () => {
    if (
      !c.sheetId ||
      !c.view ||
      !scope ||
      (scope === "workbook" && !workbook)
    ) {
      return;
    }
    const options: T.ExportOptions = {
      format,
      scope:
        scope === "workbook"
          ? { _tag: "WholeWorkbook" }
          : scope === "sheet"
            ? { _tag: "WholeSheet", sheetId: c.sheetId }
            : {
                _tag: "CurrentView",
                sheetId: c.sheetId,
                viewId: c.view.viewId,
              },
      delimiter:
        format === "tsv" || format === "tab" || format === "clipboard"
          ? "\t"
          : delimiter,
      newline: format === "clipboard" ? "lf" : newline,
      bom: format === "clipboard" ? false : bom,
      textPolicy: policy,
      jsonShape: jsonChoice,
    };
    void c.makePlan(options).then((next) => {
      if (next) {
        setReview({ token, plan: next });
      }
    });
  };
  const create = () => {
    void c.createOutput(acknowledged).then((result) => {
      if (result) {
        setReceipt({ token, bytes: result });
        requestAnimationFrame(() => downloadButton.current?.focus());
      }
    });
  };
  return (
    <ModalContent
      isOpen
      aria-label={t("tabularExportTitle")}
      size="4xl"
      onOpenChange={(open) => {
        if (!open) {
          onClose();
        }
      }}
    >
      <ModalHeader title={t("tabularExportTitle")} />
      <ModalBody>
        <ExportFields
          settings={{
            format,
            scope,
            delimiter,
            newline,
            bom,
            policy,
            jsonChoice,
          }}
          busy={c.busy}
          setFormat={setFormat}
          setScope={setScope}
          setDelimiter={setDelimiter}
          setNewline={setNewline}
          setBom={setBom}
          setPolicy={setPolicy}
          setJsonChoice={setJsonChoice}
        />
        {scope === "sheet" || scope === "workbook" ? (
          <p className="mt-4 max-w-prose text-sm/6">
            {t(
              scope === "workbook" ? "tabularWorkbookHint" : "tabularSheetHint"
            )}
          </p>
        ) : null}
        {textOutput && policy === "exact" ? (
          <p className="text-muted-fg mt-4 max-w-prose text-sm/6">
            {t("tabularExactHint")}
          </p>
        ) : null}
        <div className="mt-4 flex flex-wrap gap-2">
          <Button intent="outline" isDisabled={c.busy || !scope} onPress={plan}>
            {t("tabularCheckExport")}
          </Button>
          {format === "csv" &&
          c.detection?.delimiter &&
          c.detection.delimiter.value !== "\t" &&
          c.detection.newline !== "mixed" ? (
            <Button
              intent="plain"
              isDisabled={c.busy}
              onPress={() => {
                setDelimiter(c.detection?.delimiter?.value ?? ",");
                setNewline(c.detection?.newline === "crlf" ? "crlf" : "lf");
                setBom(c.detection?.bom ?? false);
              }}
            >
              {t("tabularUseSource")}
            </Button>
          ) : null}
        </div>
        {prepared ? (
          <div className="mt-5 space-y-4">
            {prepared.jsonShape ? (
              <Note>
                {t(
                  prepared.jsonShape === "objects"
                    ? "tabularJsonUnique"
                    : prepared.jsonReason === "blank-headers"
                      ? "tabularJsonBlank"
                      : prepared.jsonReason === "duplicate-headers"
                        ? "tabularJsonDuplicate"
                        : prepared.jsonReason === "headers-off"
                          ? "tabularJsonNoHeader"
                          : "tabularJsonArrays"
                )}
              </Note>
            ) : null}
            {textOutput ? (
              <div className="text-sm">
                <p>
                  {t("tabularSafeCount", {
                    count: prepared.changedOutputCells.toLocaleString(locale),
                  })}
                </p>
                {prepared.examples.map((example, index) => (
                  <p
                    className="mt-1 [overflow-wrap:anywhere] whitespace-pre-wrap"
                    key={index}
                  >
                    {t("tabularBeforeAfter", example)}
                  </p>
                ))}
              </div>
            ) : null}
            <Note intent="warning">
              <p>{t("tabularValuesOnly")}</p>
              <p className="mt-2">{t("tabularStaleResults")}</p>
            </Note>
            {prepared.blockedBy.map((error, index) => (
              <TabularError error={error} key={index} />
            ))}
            {prepared.unresolvedCount > 0 ? (
              <Button intent="outline" onPress={() => c.nextUnresolved()}>
                {t("tabularNextUnresolved")}
              </Button>
            ) : null}
            {needsAck ? (
              <label className="flex min-h-11 items-center gap-3 text-sm font-semibold">
                <input
                  type="checkbox"
                  checked={acknowledged}
                  onChange={(event) =>
                    setAckToken(event.target.checked ? token : "")
                  }
                  className="size-5 accent-current"
                />
                {t("tabularAcknowledgeExport")}
              </label>
            ) : null}
            <Button
              intent="primary"
              isDisabled={
                c.busy ||
                prepared.blockedBy.length > 0 ||
                prepared.unresolvedCount > 0 ||
                (needsAck && !acknowledged)
              }
              onPress={create}
            >
              {t("tabularCreateDownload")}
            </Button>
          </div>
        ) : null}
        {output ? (
          <div className="border-rule mt-5 border-t-2 pt-4">
            <output>
              {t("tabularDownloadReady", {
                sheets: output.writtenSheets.toLocaleString(locale),
                rows: output.writtenRows.toLocaleString(locale),
              })}
            </output>
            <p className="text-muted-fg my-3 text-sm">
              {t("tabularDownloadHint")}
            </p>
            {format === "clipboard" ? (
              <TabularClipboard
                text={new TextDecoder().decode(output.bytes)}
                rows={output.writtenRows}
              />
            ) : (
              <Button
                ref={downloadButton}
                intent="primary"
                onPress={() =>
                  download(
                    new Blob([Uint8Array.from(output.bytes)], {
                      type: output.mime,
                    }),
                    output.filename
                  )
                }
              >
                {t("tabularDownload", { format: format.toUpperCase() })}
              </Button>
            )}
          </div>
        ) : null}
      </ModalBody>
      <ModalFooter>
        <Button intent="plain" onPress={onClose} isDisabled={c.busy}>
          {t("tabularCancel")}
        </Button>
      </ModalFooter>
    </ModalContent>
  );
};
