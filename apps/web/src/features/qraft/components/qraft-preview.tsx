"use client";

/* oxlint-disable anti-slop/require-safety-comment-for-type-assertion -- Every cast narrows a value this file built from a fixed option list. */

import { Button } from "@/core/components/ui/button";
import { Note } from "@/core/components/ui/note";

import { fileNameOf, svgDataUri, UNITS } from "../qraft";
import type { OutputFormat } from "../qraft";
import type { QraftController } from "../use-qraft";
import { QraftNumber, QraftSelect } from "./qraft-fields";

const formatOptions = [
  { id: "svg", label: "SVG" },
  { id: "png", label: "PNG" },
];

const unitOptions = UNITS.map((unit) => ({ id: unit, label: unit }));

/** The code, its Scan Warnings, and every way to take it away. */
export const QraftPreview = ({
  controller,
}: {
  readonly controller: QraftController;
}) => {
  const c = controller;
  const ready = c.preview.svg !== null && c.preview.error === null;
  return (
    <section aria-labelledby="qraft-preview-heading" className="min-w-0">
      <h2
        className="border-rule font-display border-b-2 pb-2 text-lg font-black uppercase [font-stretch:75%]"
        id="qraft-preview-heading"
      >
        {c.t("qraftPreview")}
      </h2>

      <div className="border-rule bg-card mt-4 grid min-h-64 place-items-center border-2 p-4">
        {c.preview.loading ? (
          <output aria-live="polite" className="text-muted-fg text-sm">
            {c.t("qraftLoadingFamily")}
          </output>
        ) : ready ? (
          <img
            alt={c.t("qraftPreviewAlt", { symbology: c.label })}
            className="h-auto max-h-[min(60vh,32rem)] w-auto max-w-full"
            src={svgDataUri(c.preview.svg ?? "")}
          />
        ) : (
          <Note intent="danger">{c.problem ?? c.t("qraftRenderFailed")}</Note>
        )}
      </div>

      <Note className="mt-4" intent="info">
        <p className="font-bold">{c.t("qraftStaticCode")}</p>
        <p className="mt-1 text-sm/6">{c.t("qraftStaticCodeHint")}</p>
      </Note>

      <output aria-live="polite" className="sr-only">
        {c.preview.revision > 1 ? (
          <span key={c.preview.revision}>
            {c.t("qraftPreviewUpdated", { symbology: c.label })}
          </span>
        ) : null}
      </output>

      {c.warnings.length > 0 && (
        <div className="mt-4 flex flex-col gap-2">
          <h3 className="text-xs font-bold tracking-[0.08em] uppercase [font-stretch:87.5%]">
            {c.t("qraftWarningsHeading")}
          </h3>
          {c.warnings.map((warning) => (
            <Note intent="warning" key={warning.id}>
              {c.warningText(warning)}
            </Note>
          ))}
          <p className="text-muted-fg text-xs/5">{c.t("qraftWarningNote")}</p>
        </div>
      )}

      <div className="border-rule mt-6 border-t-2 pt-4">
        <h3 className="font-display text-base font-black uppercase [font-stretch:75%]">
          {c.t("qraftOutputHeading")}
        </h3>
        <div className="mt-3 grid gap-4 sm:grid-cols-2">
          <QraftSelect
            id="qraft-output"
            label={c.t("qraftOutputFormat")}
            options={formatOptions}
            value={c.settings.output}
            onChange={(next) => c.changeOutput(next as OutputFormat)}
          />
          {c.settings.output === "svg" && (
            <QraftSelect
              id="qraft-unit"
              label={c.t("qraftUnit")}
              options={unitOptions}
              value={c.settings.style.unit}
              onChange={(next) =>
                c.changeStyle({
                  unit: next as "cm" | "in" | "mm" | "pt" | "px",
                })
              }
            />
          )}
          {c.settings.output === "svg" ? (
            <QraftNumber
              id="qraft-output-size"
              label={c.t("qraftSize")}
              max={2000}
              min={32}
              value={c.settings.style.size}
              onChange={(next) => c.changeStyle({ size: next })}
            />
          ) : (
            <QraftNumber
              id="qraft-png-size"
              label={c.t("qraftPixelSize")}
              max={4096}
              min={32}
              value={c.settings.style.pngSize}
              onChange={(next) => c.changeStyle({ pngSize: next })}
            />
          )}
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <Button isDisabled={!ready} onPress={() => c.save()}>
            {c.t("qraftDownload", {
              format: c.settings.output.toUpperCase(),
            })}
          </Button>
          <Button
            intent="outline"
            isDisabled={!ready}
            onPress={() => c.copy("svg")}
          >
            {c.t("qraftCopySvg")}
          </Button>
          <Button
            intent="outline"
            isDisabled={!ready}
            onPress={() => c.copy("png")}
          >
            {c.t("qraftCopyPng")}
          </Button>
          <Button
            intent="outline"
            isDisabled={c.settings.payload === ""}
            onPress={() => c.copy("payload")}
          >
            {c.t("qraftCopyPayload")}
          </Button>
          <Button
            intent="outline"
            isDisabled={!ready}
            onPress={() => c.print()}
          >
            {c.t("qraftPrint")}
          </Button>
        </div>

        <p className="text-muted-fg mt-3 font-mono text-xs">
          {c.t("qraftFileName")}: {fileNameOf(c.settings)}
        </p>

        {c.settings.symbology === "qr" && c.terminal !== "" && (
          <details className="border-rule mt-4 border-2 p-3">
            <summary className="text-xs font-bold tracking-[0.08em] uppercase [font-stretch:87.5%]">
              {c.t("qraftTerminal")}
            </summary>
            <p className="text-muted-fg mt-2 text-xs/5">
              {c.t("qraftTerminalHint")}
            </p>
            <pre className="mt-2 overflow-x-auto font-mono text-[0.625rem] leading-[0.75]">
              {c.terminal}
            </pre>
          </details>
        )}
      </div>
    </section>
  );
};
