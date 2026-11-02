"use client";

/* oxlint-disable anti-slop/require-safety-comment-for-type-assertion -- Every cast narrows a value this file built from a fixed option list. */

import {
  HiArrowDownTray,
  HiClipboard,
  HiClipboardDocument,
  HiCodeBracket,
  HiCommandLine,
  HiPhoto,
  HiPrinter,
} from "react-icons/hi2";

import { Button } from "@/core/components/ui/button";
import { MenuItem, MenuLabel } from "@/core/components/ui/menu";
import { Note } from "@/core/components/ui/note";

import { fileNameOf, svgDataUri, UNITS } from "../qraft";
import type { OutputFormat } from "../qraft";
import type { QraftController } from "../use-qraft";
import { QraftMenuButton, QraftNumber, QraftSelect } from "./qraft-fields";

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
        </div>
      )}

      <div className="mt-6">
        <h3 className="font-display text-base font-black uppercase [font-stretch:75%]">
          {c.t("qraftOutputHeading")}
        </h3>
        <div
          className={
            c.settings.output === "svg"
              ? "mt-3 grid gap-4 sm:grid-cols-3"
              : "mt-3 grid gap-4 sm:grid-cols-2"
          }
        >
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
            <HiArrowDownTray aria-hidden="true" />
            {c.t("qraftDownload", {
              format: c.settings.output.toUpperCase(),
            })}
          </Button>
          <QraftMenuButton
            icon={<HiClipboard aria-hidden="true" />}
            isDisabled={!ready}
            label={c.t("qraftCopy")}
            menuLabel={c.t("qraftCopyAs")}
          >
            <MenuItem onAction={() => c.copy("svg")} textValue="SVG">
              <HiCodeBracket aria-hidden="true" />
              <MenuLabel>SVG</MenuLabel>
            </MenuItem>
            <MenuItem onAction={() => c.copy("png")} textValue="PNG">
              <HiPhoto aria-hidden="true" />
              <MenuLabel>PNG</MenuLabel>
            </MenuItem>
            <MenuItem
              isDisabled={c.settings.payload === ""}
              onAction={() => c.copy("payload")}
              textValue={c.t("qraftCopyPayload")}
            >
              <HiClipboardDocument aria-hidden="true" />
              <MenuLabel>{c.t("qraftCopyPayload")}</MenuLabel>
            </MenuItem>
            {c.settings.symbology === "qr" && c.terminal !== "" && (
              <MenuItem
                onAction={() => c.copy("terminal")}
                textValue={c.t("qraftCopyTerminal")}
              >
                <HiCommandLine aria-hidden="true" />
                <MenuLabel>{c.t("qraftCopyTerminal")}</MenuLabel>
              </MenuItem>
            )}
          </QraftMenuButton>
          <Button
            intent="outline"
            isDisabled={!ready}
            onPress={() => c.print()}
          >
            <HiPrinter aria-hidden="true" />
            {c.t("qraftPrint")}
          </Button>
        </div>

        <p className="text-muted-fg mt-3 font-mono text-xs">
          {c.t("qraftFileName")}: {fileNameOf(c.settings)}
        </p>
      </div>
    </section>
  );
};
