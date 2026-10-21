"use client";

import { Option } from "effect";

import { useTranslation } from "@/features/i18n/use-translation";
import { SqueezeItemRow } from "@/features/squeeze/components/squeeze-item-row";
import type {
  BatchItem,
  ImageFormat,
  ItemResult,
  SqueezeSettings,
} from "@/features/squeeze/squeeze";
import { formatBytes, keepFormatOf } from "@/features/squeeze/squeeze";

type Translate = ReturnType<typeof useTranslation>["t"];

const OUTPUT_KEY = {
  avif: "squeezeOutputAvif",
  jpeg: "squeezeOutputJpeg",
  keep: "squeezeOutputKeep",
  multi: "squeezeOutputMulti",
  png: "squeezeOutputPng",
  webp: "squeezeOutputWebp",
} as const;

/** The format a rejected codec row names in its offline message. */
const problemFormatOf = (
  settings: SqueezeSettings,
  item: BatchItem,
  t: Translate
): string => {
  if (settings.outputFormat === "multi") {
    return t("squeezeOutputMulti");
  }
  if (settings.outputFormat === "keep") {
    return t(OUTPUT_KEY[keepFormatOf(Option.getOrNull(item.format) ?? "jpeg")]);
  }
  return t(OUTPUT_KEY[settings.outputFormat]);
};

interface BatchListProps {
  readonly batch: ReadonlyMap<string, BatchItem>;
  readonly batchTarget: number | null;
  readonly onDownload: (id: string) => void;
  readonly onDownloadPart: (id: string, format: ImageFormat) => void;
  readonly onRaiseTarget: (id: string) => void;
  readonly onRecompress: (id: string) => void;
  readonly onRemove: (id: string) => void;
  readonly onResize: () => void;
  readonly onTarget: (id: string, targetBytes: number | null) => void;
  readonly onTryFormat: () => void;
  readonly online: boolean;
  readonly overrideEnabled: boolean;
  readonly results: ReadonlyMap<string, ItemResult>;
  readonly running: boolean;
  readonly settings: SqueezeSettings;
  readonly staleIds: ReadonlySet<string>;
  readonly workingIds: ReadonlySet<string>;
}

const HEAD_CLASS =
  "border-rule hidden border-b-[3px] px-3 pb-2 text-muted-fg text-xs font-bold uppercase tracking-[0.08em] [font-stretch:87.5%] gap-x-3 md:grid md:grid-cols-[9rem_minmax(0,1fr)_10rem] xl:grid-cols-[9rem_minmax(0,1.5fr)_4.25rem_4.25rem_3.5rem_minmax(0,1fr)_12rem]";

/**
 * The Batch, as a proof ledger. The head names the columns once; below it,
 * every row prints its own numbers in fixed columns. An empty Batch keeps the
 * local poster: the numeral zero, a red slash, and one line of words.
 */
export const SqueezeBatchList = ({
  batch,
  batchTarget,
  onDownload,
  onDownloadPart,
  onRaiseTarget,
  onRecompress,
  onRemove,
  onResize,
  onTarget,
  onTryFormat,
  online,
  overrideEnabled,
  results,
  running,
  settings,
  staleIds,
  workingIds,
}: BatchListProps) => {
  const { t, locale } = useTranslation();

  if (batch.size === 0) {
    return (
      <>
        <h2 className="sr-only">{t("squeezeFilesHeading")}</h2>
        <div className="border-rule border-2 px-4 pt-6 pb-10 sm:px-6">
          <p className="num text-[clamp(4rem,12vw,7rem)] leading-none font-extrabold">
            0
          </p>
          <div
            aria-hidden="true"
            className="bg-red mt-4 h-3 w-44 -skew-x-[16deg]"
          />
          <p className="font-display mt-5 text-2xl font-black uppercase [font-stretch:75%]">
            {t("squeezeEmptyTitle")}
          </p>
          <p className="text-muted-fg mt-1 text-sm">{t("squeezeEmptyHint")}</p>
          <p className="num text-muted-fg mt-4 text-xs">
            {t("squeezeBatchCount", { count: 0 })} · {formatBytes(0, locale)}
          </p>
        </div>
      </>
    );
  }

  return (
    <div className="border-rule border-2">
      <h2 className="sr-only">{t("squeezeFilesHeading")}</h2>
      <div className={HEAD_CLASS} role="presentation">
        <span className="md:col-start-1">{t("squeezeColState")}</span>
        <span className="md:col-start-2">{t("squeezeColFile")}</span>
        <span className="hidden xl:col-start-3 xl:block xl:text-end">
          {t("squeezeColIn")}
        </span>
        <span className="hidden xl:col-start-4 xl:block xl:text-end">
          {t("squeezeColOut")}
        </span>
        <span className="hidden xl:col-start-5 xl:block xl:text-end">
          {t("squeezeColDelta")}
        </span>
        <span className="hidden xl:col-start-6 xl:block">
          {t("squeezeColNotes")}
        </span>
        <span className="md:col-start-3 xl:col-start-7">
          {t("squeezeActions")}
        </span>
      </div>

      <ul className="px-3">
        {[...batch.entries()].map(([id, item]) => {
          const stale = staleIds.has(id);
          return (
            <SqueezeItemRow
              batchTarget={batchTarget}
              id={id}
              item={item}
              key={id}
              locale={locale}
              onDownload={onDownload}
              onDownloadPart={onDownloadPart}
              onRaiseTarget={onRaiseTarget}
              onRecompress={onRecompress}
              onRemove={onRemove}
              onResize={onResize}
              onTarget={onTarget}
              onTryFormat={onTryFormat}
              online={online}
              overrideEnabled={
                overrideEnabled && settings.sizeMode === "per-image"
              }
              problemFormat={problemFormatOf(settings, item, t)}
              result={results.get(id)}
              running={running}
              stale={stale}
              working={workingIds.has(id)}
            />
          );
        })}
      </ul>
    </div>
  );
};
