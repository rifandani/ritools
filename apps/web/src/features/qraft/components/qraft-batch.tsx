"use client";

import {
  HiArchiveBox,
  HiArrowDownTray,
  HiArrowUpTray,
  HiDocumentText,
  HiPhoto,
} from "react-icons/hi2";

import { Button } from "@/core/components/ui/button";
import { MenuItem, MenuLabel } from "@/core/components/ui/menu";
import { Note } from "@/core/components/ui/note";

import type { QraftController } from "../use-qraft";
import {
  QraftFileButton,
  QraftMenuButton,
  QraftNumber,
  QraftSwitch,
  QraftTextArea,
} from "./qraft-fields";

/** The Batch: pasted lines or a CSV, a Label Sheet, and a ZIP. */
export const QraftBatch = ({
  controller,
}: {
  readonly controller: QraftController;
}) => {
  const c = controller;
  const zipSvgLabel = c.t("qraftBatchZipFormat", { format: "SVG" });
  const zipPngLabel = c.t("qraftBatchZipFormat", { format: "PNG" });
  const failed =
    c.batchProblem === null
      ? null
      : c.batchProblem === "empty"
        ? c.t("qraftBatchEmpty")
        : c.t("qraftBatchFailed");
  return (
    <section aria-labelledby="qraft-batch-heading" className="min-w-0">
      <h2
        className="border-rule font-display border-b-2 pb-2 text-[clamp(1.5rem,4vw,2.25rem)] font-black uppercase [font-stretch:75%]"
        id="qraft-batch-heading"
      >
        {c.t("qraftBatchHeading")}
      </h2>
      <p className="text-muted-fg mt-3 text-sm/6">{c.t("qraftBatchIntro")}</p>

      <div className="mt-4 grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="min-w-0">
          <QraftTextArea
            id="qraft-batch-text"
            label={c.t("qraftBatchText")}
            rows={8}
            value={c.batchText}
            onChange={(next) => c.changeBatchText(next)}
          />
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <QraftFileButton
              accept={["text/csv", "text/plain"]}
              icon={<HiArrowUpTray aria-hidden="true" />}
              id="qraft-batch-file"
              label={c.t("qraftBatchCsv")}
              onPick={(file) => c.loadCsv(file)}
            />
            <Button intent="outline" onPress={() => c.loadSample()}>
              <HiDocumentText aria-hidden="true" />
              {c.t("qraftBatchSample")}
            </Button>
          </div>
        </div>

        <div className="border-rule grid content-start gap-4 border-2 p-4">
          <QraftNumber
            id="qraft-batch-columns"
            label={c.t("qraftBatchColumns")}
            max={12}
            min={1}
            value={c.sheet.columns}
            onChange={(next) =>
              c.setSheet((current) => ({ ...current, columns: next }))
            }
          />
          <QraftNumber
            id="qraft-batch-gap"
            label={c.t("qraftBatchGap")}
            max={120}
            min={0}
            value={c.sheet.gap}
            onChange={(next) =>
              c.setSheet((current) => ({ ...current, gap: next }))
            }
          />
          <QraftNumber
            id="qraft-batch-padding"
            label={c.t("qraftBatchPadding")}
            max={120}
            min={0}
            value={c.sheet.padding}
            onChange={(next) =>
              c.setSheet((current) => ({ ...current, padding: next }))
            }
          />
          <QraftSwitch
            isSelected={c.sheet.captions}
            label={c.t("qraftBatchCaptions")}
            onChange={(next) =>
              c.setSheet((current) => ({ ...current, captions: next }))
            }
          />
        </div>
      </div>

      {c.warnBatch && (
        <Note className="mt-3" intent="warning">
          {c.t("qraftBatchWarn")}
        </Note>
      )}

      {failed !== null && (
        <Note className="mt-3" intent="danger">
          {failed}
        </Note>
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        <QraftMenuButton
          icon={<HiArrowDownTray aria-hidden="true" />}
          isDisabled={c.batchBusy}
          label={c.t("qraftBatchDownload")}
          menuLabel={c.t("qraftBatchDownloadAs")}
        >
          <MenuItem
            onAction={() => c.downloadSheet("svg")}
            textValue={c.t("qraftBatchSheetSvg")}
          >
            <HiDocumentText aria-hidden="true" />
            <MenuLabel>{c.t("qraftBatchSheetSvg")}</MenuLabel>
          </MenuItem>
          <MenuItem
            onAction={() => c.downloadSheet("png")}
            textValue={c.t("qraftBatchSheetPng")}
          >
            <HiPhoto aria-hidden="true" />
            <MenuLabel>{c.t("qraftBatchSheetPng")}</MenuLabel>
          </MenuItem>
          <MenuItem
            onAction={() => c.downloadZip("svg")}
            textValue={zipSvgLabel}
          >
            <HiArchiveBox aria-hidden="true" />
            <MenuLabel>{zipSvgLabel}</MenuLabel>
          </MenuItem>
          <MenuItem
            onAction={() => c.downloadZip("png")}
            textValue={zipPngLabel}
          >
            <HiArchiveBox aria-hidden="true" />
            <MenuLabel>{zipPngLabel}</MenuLabel>
          </MenuItem>
        </QraftMenuButton>
        {c.batchBusy && (
          <output
            aria-live="polite"
            className="text-muted-fg self-center text-sm"
          >
            {c.t("qraftBatchBuilding")}
          </output>
        )}
      </div>
    </section>
  );
};
