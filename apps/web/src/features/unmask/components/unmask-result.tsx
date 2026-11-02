"use client";

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
  formatLabelKey,
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

/** The result block: state, facts, the model, and the download. */
/* oxlint-disable-next-line eslint/complexity -- One block prints the fixed state, error, result, and download branches. */
export const UnmaskResult = ({
  item,
  onBackToBatch,
  onCutAnother,
  onDownload,
  onRetry,
  running,
}: ResultProps) => {
  const { t } = useTranslation();
  const busy = running || item.state === "reading" || item.state === "removing";
  const error = item.error === null ? null : errorCopyOf(item.error);
  const { result } = item;
  const format = result?.format ?? item.facts?.format ?? item.claimedFormat;

  // The Cut out button carries the progress, so this block shows only a
  // Cutout, an error, or a stale note.
  if (result === null && error === null && item.state !== "stale") {
    return null;
  }

  return (
    <section
      aria-labelledby="unmask-result-heading"
      className="mt-6"
      id="unmask-result"
    >
      <h2
        className={
          result === null
            ? "font-display text-[clamp(1.5rem,4vw,2.25rem)] leading-none font-black uppercase [font-stretch:75%]"
            : "sr-only"
        }
        id="unmask-result-heading"
        tabIndex={-1}
      >
        {error === null ? t(ROW_STATE_KEY[item.state]) : t(error.title)}
      </h2>

      {error === null ? null : (
        <Note className="mt-3" intent="danger">
          <p role="alert">{t(error.body)}</p>
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

      {result === null ? null : (
        <div className={item.state === "stale" ? "mt-3 opacity-55" : "mt-3"}>
          <Button
            className="w-full"
            intent="primary"
            isDisabled={item.state === "stale" || busy}
            onPress={onDownload}
            size="md"
          >
            <HiArrowDownTray aria-hidden />
            {t("unmaskDownload")}
          </Button>
          {onBackToBatch === null ? null : (
            <Button
              className="mt-2 w-full"
              intent="outline"
              onPress={onBackToBatch}
              size="md"
            >
              <HiArrowUturnLeft aria-hidden />
              {t("unmaskBackToBatch")}
            </Button>
          )}
        </div>
      )}

      {result !== null && format !== null ? (
        <p className="sr-only">{t(formatLabelKey(format))}</p>
      ) : null}
    </section>
  );
};
