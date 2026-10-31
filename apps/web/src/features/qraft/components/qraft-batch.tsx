"use client";

import { Button } from "@/core/components/ui/button";
import { Note } from "@/core/components/ui/note";

import type { QraftController } from "../use-qraft";
import {
  QraftFileButton,
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
      <p className="text-muted-fg mt-3 max-w-[68ch] text-sm/6">
        {c.t("qraftBatchIntro")}
      </p>

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
              id="qraft-batch-file"
              label={c.t("qraftBatchCsv")}
              onPick={(file) => c.loadCsv(file)}
            />
            <span className="text-muted-fg text-xs/5">
              {c.t("qraftBatchCsvHint")}
            </span>
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

      <p aria-live="polite" className="mt-4 text-sm">
        {c.t("qraftBatchCount", { count: c.entries.length })}
      </p>

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
        <Button isDisabled={c.batchBusy} onPress={() => c.downloadSheet("svg")}>
          {c.t("qraftBatchSheetSvg")}
        </Button>
        <Button
          intent="outline"
          isDisabled={c.batchBusy}
          onPress={() => c.downloadSheet("png")}
        >
          {c.t("qraftBatchSheetPng")}
        </Button>
        <Button
          intent="outline"
          isDisabled={c.batchBusy}
          onPress={() => c.downloadZip(c.settings.output)}
        >
          {c.t("qraftBatchZipFormat", {
            format: c.settings.output.toUpperCase(),
          })}
        </Button>
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
