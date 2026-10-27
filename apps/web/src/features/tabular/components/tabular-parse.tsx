/* oxlint-disable eslint/complexity -- The parse preview renders the fixed workbook and delimited input states. */
/* oxlint-disable react-doctor/no-derived-useState -- Parse settings are an explicit draft, reset by the parent Candidate key. */
/* oxlint-disable react-doctor/no-array-index-as-key -- Immutable preview rows and columns use source coordinates; duplicate values are allowed. */
import { useState } from "react";

import { Button } from "@/core/components/ui/button";
import { Note } from "@/core/components/ui/note";
import { useTranslation } from "@/features/i18n/use-translation";

import * as T from "../tabular";
import { displayValue } from "../tabular.ui";
import type { TabularController } from "../use-tabular";
import { TabularSelect } from "./tabular-fields";

export const TabularParse = ({
  controller: c,
}: {
  readonly controller: TabularController;
}) => {
  const { t, locale } = useTranslation();
  const [options, setOptions] = useState(c.options);
  const { candidate } = c;
  const preview = candidate?.sheets[0];
  const workbook =
    candidate?.valuesOnlyAcknowledgementRequired ??
    (c.session?.format === "xls" || c.session?.format === "xlsx");
  return (
    <section
      className="border-rule min-w-0 border-y-2 py-5"
      aria-labelledby="tabular-parse-title"
    >
      <h2 className="text-xl font-extrabold" id="tabular-parse-title">
        {t(candidate ? "tabularParsePreview" : "tabularParseSettings")}
      </h2>
      <p className="text-muted-fg mt-2 max-w-prose text-sm/6">
        {t("tabularReparse")}
      </p>
      <div className="mt-4 grid gap-4 sm:grid-cols-3">
        {workbook ? null : (
          <>
            <TabularSelect
              label={t("tabularEncoding")}
              value={options.encoding}
              onChange={(value) =>
                setOptions({
                  ...options,
                  encoding:
                    value === "auto"
                      ? "auto"
                      : (T.Encoding.literals.find((entry) => entry === value) ??
                        "utf-8"),
                })
              }
            >
              <option value="auto">{t("tabularAuto")}</option>
              {T.Encoding.literals.map((encoding) => (
                <option key={encoding} value={encoding}>
                  {encoding.toUpperCase()}
                </option>
              ))}
            </TabularSelect>
            <TabularSelect
              label={t("tabularDelimiter")}
              value={options.delimiter}
              onChange={(value) =>
                setOptions({
                  ...options,
                  delimiter:
                    value === "auto"
                      ? "auto"
                      : (T.Delimiter.literals.find(
                          (entry) => entry === value
                        ) ?? ","),
                })
              }
            >
              <option value="auto">{t("tabularAuto")}</option>
              <option value=",">{t("tabularComma")}</option>
              <option value=";">{t("tabularSemicolon")}</option>
              <option value="	">{t("tabularTab")}</option>
              <option value="|">{t("tabularPipe")}</option>
            </TabularSelect>
          </>
        )}
        <TabularSelect
          label={t("tabularHeader")}
          value={options.header ? "yes" : "no"}
          onChange={(value) =>
            setOptions({ ...options, header: value === "yes" })
          }
        >
          <option value="yes">{t("tabularHeader")}</option>
          <option value="no">{t("tabularJsonNoHeader")}</option>
        </TabularSelect>
      </div>
      {candidate?.encoding ? (
        <p className="num mt-3 text-sm">
          {t("tabularDetected", {
            value: `${candidate.encoding.value.toUpperCase()} · ${candidate.delimiter?.value === "\t" ? t("tabularTab") : (candidate.delimiter?.value ?? "")} · ${candidate.newline?.toUpperCase() ?? ""}`,
          })}
        </p>
      ) : null}
      {candidate?.encoding?.ambiguous || candidate?.delimiter?.ambiguous ? (
        <div className="mt-3">
          <Note intent="warning">{t("tabularAmbiguous")}</Note>
        </div>
      ) : null}
      {preview ? (
        <>
          <p className="mt-4 text-sm">
            {t("tabularPreviewSample", {
              rows: preview.sampledRows.toLocaleString(locale),
              columns: preview.sampledColumns.toLocaleString(locale),
            })}
          </p>
          <div className="border-rule mt-2 max-h-64 max-w-full overflow-auto border-2">
            <table className="w-full border-collapse text-left text-sm">
              <caption className="sr-only">{t("tabularParsePreview")}</caption>
              <tbody>
                {preview.sample.map((row, index) => (
                  <tr key={index}>
                    {row.map((value, column) => (
                      <td
                        key={column}
                        className="border-border max-w-72 min-w-28 border-2 px-3 py-2 [overflow-wrap:anywhere] whitespace-pre-wrap"
                      >
                        {displayValue(value)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : null}
      {workbook ? (
        <div className="mt-4">
          <Note intent="warning">
            <p>{t("tabularValuesOnly")}</p>
            <p className="mt-2">{t("tabularStaleResults")}</p>
          </Note>
        </div>
      ) : null}
      <div className="mt-4 flex flex-wrap gap-2">
        <Button
          intent="outline"
          isDisabled={c.busy}
          onPress={() => c.applyParse(options)}
        >
          {t("tabularApplyParse")}
        </Button>
        {candidate ? (
          <Button
            intent="primary"
            isDisabled={
              c.busy || JSON.stringify(options) !== JSON.stringify(c.options)
            }
            onPress={() => c.acceptCandidate()}
          >
            {t(workbook ? "tabularAcknowledge" : "tabularOpen")}
          </Button>
        ) : null}
        {candidate ? (
          <Button
            intent="plain"
            isDisabled={c.busy}
            onPress={() => c.discardPreview()}
          >
            {t("tabularCancel")}
          </Button>
        ) : null}
      </div>
    </section>
  );
};
