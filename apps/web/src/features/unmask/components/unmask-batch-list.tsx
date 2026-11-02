"use client";

import { useEffect, useRef, useState } from "react";
import {
  HiArrowDownTray,
  HiArrowPath,
  HiCheck,
  HiClock,
  HiExclamationTriangle,
  HiPencilSquare,
  HiQueueList,
  HiXMark,
} from "react-icons/hi2";

import { Button } from "@/core/components/ui/button";
import { Tooltip, TooltipContent } from "@/core/components/ui/tooltip";
import { useTranslation } from "@/features/i18n/use-translation";
import type { RowState } from "@/features/unmask/unmask";
import {
  errorCopyOf,
  isDownloadable,
  formatBytes,
  formatDimensions,
  formatLabelKey,
  ROW_STATE_KEY,
} from "@/features/unmask/unmask";
import type { UnmaskItem } from "@/features/unmask/use-unmask";

const StateMark = ({ state }: { readonly state: RowState }) => {
  const { t } = useTranslation();
  const Icon =
    state === "failed"
      ? HiExclamationTriangle
      : state === "stale"
        ? HiClock
        : state === "ready" || state === "downloaded"
          ? HiCheck
          : state === "edited"
            ? HiPencilSquare
            : state === "queued" || state === "cancelled"
              ? HiQueueList
              : HiArrowPath;
  return (
    <span className="inline-flex items-center gap-2 text-xs font-bold uppercase">
      <Icon aria-hidden="true" className="size-4 shrink-0" />
      <span>{t(ROW_STATE_KEY[state])}</span>
    </span>
  );
};

const Dot = () => (
  <span aria-hidden="true" className="text-border">
    ·
  </span>
);

const RowThumb = ({ item }: { readonly item: UnmaskItem }) => {
  const image = useRef<HTMLImageElement>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    const element = image.current;
    if (element === null) {
      return;
    }
    let url: string;
    try {
      url = URL.createObjectURL(item.file);
    } catch {
      return;
    }
    element.src = url;
    return () => {
      element.removeAttribute("src");
      URL.revokeObjectURL(url);
    };
  }, [item.file]);

  return (
    <span
      aria-hidden="true"
      className="border-border bg-muted relative grid size-12 shrink-0 place-content-center overflow-hidden border-2"
    >
      <span className="text-muted-fg text-[0.6875rem]/4 font-bold tracking-[0.05em] uppercase [font-stretch:87.5%]">
        {item.claimedFormat?.toUpperCase() ?? "?"}
      </span>
      {failed ? null : (
        <img
          alt=""
          className="absolute inset-0 size-full object-cover"
          decoding="async"
          onError={() => {
            setFailed(true);
          }}
          ref={image}
        />
      )}
    </span>
  );
};

const FileMeta = ({
  byteSize,
  dimensions,
  format,
}: {
  readonly byteSize: number;
  readonly dimensions: {
    readonly width: number;
    readonly height: number;
  } | null;
  readonly format: string | null;
}) => {
  const { locale } = useTranslation();
  return (
    <span className="text-muted-fg flex flex-wrap items-center gap-x-2 gap-y-1 text-xs/5">
      {format === null ? null : (
        <>
          <span className="text-xs/4 font-bold tracking-[0.05em] uppercase [font-stretch:87.5%]">
            {format}
          </span>
          <Dot />
        </>
      )}
      <span className="num">{formatBytes(byteSize, locale)}</span>
      {dimensions === null ? null : (
        <>
          <Dot />
          <span className="num">
            {formatDimensions(dimensions.width, dimensions.height)}
          </span>
        </>
      )}
    </span>
  );
};

interface BatchListProps {
  readonly batch: readonly UnmaskItem[];
  readonly folderPath: string | null;
  readonly onDownload: (id: string) => void;
  readonly onOpen: (id: string) => void;
  readonly onRemove: (id: string) => void;
  readonly onRetry: (id: string) => void;
  readonly skipped: number;
}

/** One image per row, with the same reading order at every width. */
export const UnmaskBatchList = ({
  batch,
  folderPath,
  onDownload,
  onOpen,
  onRemove,
  onRetry,
  skipped,
}: BatchListProps) => {
  const { t } = useTranslation();

  return (
    <section aria-labelledby="unmask-batch-heading" className="min-w-0">
      <h2 className="sr-only" id="unmask-batch-heading" tabIndex={-1}>
        {t("unmaskBatchTitle")}
      </h2>
      {folderPath === null ? null : (
        <p className="text-muted-fg mb-2 text-sm break-all">
          {t("unmaskBatchFolder", { path: folderPath })}
        </p>
      )}
      {skipped > 0 ? (
        <p className="text-muted-fg mb-2 text-sm">
          {t("unmaskBatchSkipped", { count: skipped })}
        </p>
      ) : null}

      <ul
        aria-label={t("unmaskBatchTitle")}
        className="border-rule divide-border divide-y-2 border-2"
      >
        {batch.map((item) => {
          const format = item.facts?.format ?? item.claimedFormat;
          const error = item.error === null ? null : errorCopyOf(item.error);
          return (
            <li className="min-w-0" key={item.id}>
              <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-1 p-2 sm:gap-3 sm:p-3">
                <div className="grid min-w-0 grid-cols-[auto_minmax(0,1fr)] items-center gap-x-3 gap-y-2 px-1 py-1 sm:grid-cols-[auto_minmax(0,1fr)_8.5rem]">
                  <RowThumb item={item} />
                  <span className="flex min-w-0 flex-col gap-1">
                    <Button
                      aria-describedby={`unmask-row-state-${item.id}`}
                      aria-label={t("unmaskBatchOpenRow", { name: item.name })}
                      className="-ml-1 h-auto max-w-full min-w-0 justify-start self-start px-1 py-1 text-left text-sm font-semibold tracking-normal normal-case"
                      data-unmask-open={item.id}
                      intent="plain"
                      onPress={() => {
                        onOpen(item.id);
                      }}
                      size="sm"
                    >
                      <span className="truncate" title={item.name}>
                        {item.name}
                      </span>
                    </Button>
                    <FileMeta
                      byteSize={item.byteSize}
                      dimensions={item.facts}
                      format={
                        format === null ? null : t(formatLabelKey(format))
                      }
                    />
                    {item.folderPath === null ? null : (
                      <span className="text-muted-fg text-xs font-normal tracking-normal [overflow-wrap:anywhere]">
                        {item.folderPath}
                      </span>
                    )}
                    {item.result === null ? null : (
                      <FileMeta
                        byteSize={item.result.bytesLength}
                        dimensions={item.result}
                        format={t(formatLabelKey(item.result.format))}
                      />
                    )}
                  </span>
                  <span
                    className="col-start-2 flex min-w-0 flex-col items-start gap-1 sm:col-start-3 sm:row-start-1"
                    id={`unmask-row-state-${item.id}`}
                  >
                    <StateMark state={item.state} />
                    {item.operations.length > 0 && item.state !== "edited" ? (
                      <StateMark state="edited" />
                    ) : null}
                  </span>
                </div>
                <div className="flex flex-col items-center gap-1 sm:flex-row">
                  {item.result !== null && isDownloadable(item.state) ? (
                    <Tooltip delay={0}>
                      <Button
                        aria-label={`${t("unmaskDownload")}: ${item.name}`}
                        intent="plain"
                        onPress={() => {
                          onDownload(item.id);
                        }}
                        size="sq-xs"
                      >
                        <HiArrowDownTray aria-hidden />
                      </Button>
                      <TooltipContent>
                        {`${t("unmaskDownload")}: ${item.name}`}
                      </TooltipContent>
                    </Tooltip>
                  ) : item.state === "failed" ? (
                    <Button
                      aria-label={t("unmaskBatchRetryRow", { name: item.name })}
                      intent="plain"
                      onPress={() => {
                        onRetry(item.id);
                      }}
                      size="sq-xs"
                    >
                      <HiArrowPath aria-hidden />
                    </Button>
                  ) : (
                    <span aria-hidden className="size-8 sm:size-7" />
                  )}
                  <Tooltip delay={0}>
                    <Button
                      aria-label={t("unmaskBatchRemoveRow", {
                        name: item.name,
                      })}
                      intent="plain"
                      onPress={() => {
                        onRemove(item.id);
                      }}
                      size="sq-xs"
                    >
                      <HiXMark aria-hidden />
                    </Button>
                    <TooltipContent>
                      {t("unmaskBatchRemoveRow", { name: item.name })}
                    </TooltipContent>
                  </Tooltip>
                </div>
              </div>
              {item.state === "stale" ? (
                <p className="text-muted-fg px-4 pb-3 text-xs/5">
                  {t("unmaskResultStale")}
                </p>
              ) : null}
              {error === null ? null : (
                <p
                  className="text-danger-subtle-fg px-4 pb-3 text-xs/5"
                  role="alert"
                >
                  {t(error.title)} {t(error.body)}
                </p>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
};
