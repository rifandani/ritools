"use client";

/* oxlint-disable complexity -- The result block prints every named state in one place; the browser suite is the acceptance. */

import {
  HiArrowDownTray,
  HiArrowPath,
  HiArrowUturnLeft,
} from "react-icons/hi2";

import { Button } from "@/core/components/ui/button";
import { Note } from "@/core/components/ui/note";
import { useTranslation } from "@/features/i18n/use-translation";
import {
  errorCopyOf,
  formatBytes,
  formatLabelKey,
  outputLabelKey,
  progressPercent,
  ROW_STATE_KEY,
} from "@/features/unmask/unmask";
import type { UnmaskItem } from "@/features/unmask/use-unmask";

interface ResultProps {
  readonly item: UnmaskItem;
  readonly onBackToBatch: (() => void) | null;
  readonly onCutAnother: () => void;
  readonly onDownload: () => void;
  readonly onRetry: () => void;
  readonly running: boolean;
}

const ProgressLine = ({ item }: { readonly item: UnmaskItem }) => {
  const { t } = useTranslation();
  const { progress } = item;
  if (progress?._tag === "ModelDownload") {
    const percent = progressPercent(progress);
    return (
      <p className="text-muted-fg text-sm" id="unmask-result-progress">
        {t("unmaskModelLoadingTitle")} ·{" "}
        {percent === null ? progress.loaded : `${percent}%`}
      </p>
    );
  }
  if (progress?._tag === "ModelInit") {
    return (
      <p className="text-muted-fg text-sm" id="unmask-result-progress">
        {t("unmaskModelLoadingTitle")}
      </p>
    );
  }
  if (item.state === "reading") {
    return (
      <p className="text-muted-fg text-sm" id="unmask-result-progress">
        {t("unmaskReading")}
      </p>
    );
  }
  return (
    <p className="text-muted-fg text-sm" id="unmask-result-progress">
      {t("unmaskRemoving")}
    </p>
  );
};

/** The one result block: state, facts, the model, and the download. */
export const UnmaskResult = ({
  item,
  onBackToBatch,
  onCutAnother,
  onDownload,
  onRetry,
  running,
}: ResultProps) => {
  const { t, locale } = useTranslation();
  const busy = running || item.state === "reading" || item.state === "removing";
  const { error: itemError, result } = item;
  const error = itemError === null ? null : errorCopyOf(itemError);
  const alphaNote = item.notes.some((note) => note._tag === "InputAlpha");
  const format = result?.format ?? item.facts?.format ?? item.claimedFormat;

  return (
    <section
      aria-labelledby="unmask-result-heading"
      className="border-rule mt-4 border-t-[3px] pt-3"
      id="unmask-result"
    >
      <h2
        className="font-display text-[clamp(1.5rem,4vw,2.25rem)] leading-none font-black uppercase [font-stretch:75%]"
        id="unmask-result-heading"
        tabIndex={-1}
      >
        {error === null
          ? item.state === "ready"
            ? t("unmaskResultReady")
            : item.state === "edited"
              ? t("unmaskResultEdited")
              : t(ROW_STATE_KEY[item.state])
          : t(error.title)}
      </h2>

      {busy ? (
        <div className="mt-2">
          <ProgressLine item={item} />
          <p className="text-muted-fg mt-1 text-xs">
            {t("unmaskRemovingHint")}
          </p>
        </div>
      ) : null}

      {error === null ? null : (
        <Note className="mt-3" intent="danger">
          <p role="alert">
            {item.name}: {t(error.body)}
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            <Button intent="outline" onPress={onRetry} size="xs">
              <HiArrowPath aria-hidden />
              {t("unmaskRetry")}
            </Button>
            <Button intent="plain" onPress={onCutAnother} size="xs">
              {t("unmaskChooseAnother")}
            </Button>
          </div>
        </Note>
      )}

      {item.state === "stale" ? (
        <p className="text-warning-subtle-fg mt-2 text-sm font-semibold">
          {t("unmaskResultStale")}
        </p>
      ) : null}

      {item.state === "cancelled" && error === null ? (
        <p className="text-muted-fg mt-2 text-sm">{t("unmaskCancelledBody")}</p>
      ) : null}

      {result === null ? null : (
        <div className={item.state === "stale" ? "mt-3 opacity-55" : "mt-3"}>
          <p className="num text-lg leading-7 font-bold">
            {t("unmaskResultLine", {
              format: t(outputLabelKey(result.format)),
              height: String(result.height),
              size: formatBytes(result.bytesLength, locale),
              width: String(result.width),
            })}
          </p>
          <p className="text-muted-fg text-sm">
            {item.model === null ? null : t("unmaskResultModel")}
          </p>
          {alphaNote ? (
            <p className="text-muted-fg text-sm">{t("unmaskResultAlpha")}</p>
          ) : null}
          <p className="text-muted-fg text-xs break-all">
            {t("unmaskDownloadLine", { name: result.name })}
          </p>
          <p className="text-muted-fg text-xs">{t("unmaskInputUnchanged")}</p>
          {item.state === "downloaded" ? (
            <p className="text-success-subtle-fg mt-1 text-sm font-semibold">
              {t("unmaskResultDownloaded", { name: result.name })}
            </p>
          ) : null}
          <div className="mt-3 flex flex-wrap gap-2">
            <Button
              intent="primary"
              isDisabled={item.state === "stale" || busy}
              onPress={onDownload}
              size="sm"
            >
              <HiArrowDownTray aria-hidden />
              {t("unmaskDownload")}
            </Button>
            {onBackToBatch === null ? null : (
              <Button intent="outline" onPress={onBackToBatch} size="sm">
                <HiArrowUturnLeft aria-hidden />
                {t("unmaskBackToBatch")}
              </Button>
            )}
            <Button intent="plain" onPress={onCutAnother} size="sm">
              {t("unmaskCutAnother")}
            </Button>
          </div>
        </div>
      )}

      {result === null && error === null && !busy ? (
        <div className="mt-3">
          <p className="text-muted-fg text-sm">
            {format === null
              ? t("unmaskCutOutDisabled")
              : t("unmaskCanvasEmpty")}
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            <Button intent="plain" onPress={onCutAnother} size="sm">
              {t("unmaskCutAnother")}
            </Button>
          </div>
        </div>
      ) : null}

      {result !== null && format !== null ? (
        <p className="sr-only">{t(formatLabelKey(format))}</p>
      ) : null}
    </section>
  );
};
