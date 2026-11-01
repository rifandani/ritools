"use client";

import { useEffect, useRef, useState } from "react";
import {
  HiArrowDownTray,
  HiArrowPath,
  HiArrowTopRightOnSquare,
  HiCheckCircle,
  HiClock,
  HiExclamationTriangle,
  HiPencilSquare,
  HiQueueList,
  HiTrash,
} from "react-icons/hi2";

import { Badge } from "@/core/components/ui/badge";
import { Button } from "@/core/components/ui/button";
import { useTranslation } from "@/features/i18n/use-translation";
import type { RowState } from "@/features/unmask/unmask";
import {
  errorCopyOf,
  formatBytes,
  formatLabelKey,
  outputLabelKey,
  ROW_STATE_KEY,
} from "@/features/unmask/unmask";
import type { UnmaskItem } from "@/features/unmask/use-unmask";

const STATE_INTENT = {
  cancelled: "outline",
  downloaded: "success",
  edited: "primary",
  failed: "danger",
  queued: "outline",
  reading: "info",
  ready: "success",
  removing: "info",
  stale: "warning",
} as const satisfies Record<
  RowState,
  "danger" | "info" | "outline" | "primary" | "success" | "warning"
>;

const StateMark = ({ state }: { readonly state: RowState }) => {
  const { t } = useTranslation();
  const Icon =
    state === "failed"
      ? HiExclamationTriangle
      : state === "stale"
        ? HiClock
        : state === "ready" || state === "downloaded"
          ? HiCheckCircle
          : state === "edited"
            ? HiPencilSquare
            : state === "queued" || state === "cancelled"
              ? HiQueueList
              : HiArrowPath;
  return (
    <Badge intent={STATE_INTENT[state]}>
      <Icon aria-hidden="true" />
      {t(ROW_STATE_KEY[state])}
    </Badge>
  );
};

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

const ResultLine = ({ item }: { readonly item: UnmaskItem }) => {
  const { t, locale } = useTranslation();
  const { result } = item;
  if (result === null) {
    return null;
  }
  return (
    <span className="num text-muted-fg text-xs leading-4">
      {t("unmaskResultLine", {
        format: t(outputLabelKey(result.format)),
        height: String(result.height),
        size: formatBytes(result.bytesLength, locale),
        width: String(result.width),
      })}
    </span>
  );
};

/** One row's state words and its reason, never the hue alone. */
const RowStateCell = ({ item }: { readonly item: UnmaskItem }) => {
  const { t } = useTranslation();
  const error = item.error === null ? null : errorCopyOf(item.error);
  return (
    <div className="flex min-w-0 flex-col gap-y-1">
      <div className="flex flex-wrap items-center gap-1.5">
        <StateMark state={item.state} />
        {item.operations.length > 0 ? (
          <Badge intent="primary">{t("unmaskBatchEdited")}</Badge>
        ) : null}
      </div>
      {item.state === "stale" ? (
        <p className="text-muted-fg text-xs leading-4">
          {t("unmaskResultStale")}
        </p>
      ) : null}
      {error === null ? null : (
        <p className="text-danger-subtle-fg text-xs leading-4" role="alert">
          {t(error.title)} {t(error.body)}
        </p>
      )}
      <span className={item.state === "stale" ? "opacity-55" : ""}>
        <ResultLine item={item} />
      </span>
    </div>
  );
};

const RowActions = ({
  item,
  onDownload,
  onOpen,
  onRemove,
  onRetry,
  view,
}: {
  readonly item: UnmaskItem;
  readonly onDownload: (id: string) => void;
  readonly onOpen: (id: string) => void;
  readonly onRemove: (id: string) => void;
  readonly onRetry: (id: string) => void;
  readonly view: "card" | "table";
}) => {
  const { t } = useTranslation();
  const downloadable = item.result !== null && item.state !== "stale";
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <Button
        data-unmask-open={item.id}
        id={`unmask-open-${view}-${item.id}`}
        intent="outline"
        onPress={() => {
          onOpen(item.id);
        }}
        size="xs"
      >
        <HiArrowTopRightOnSquare aria-hidden="true" />
        {t("unmaskBatchOpen")}
      </Button>
      {downloadable ? (
        <Button
          aria-label={`${t("unmaskDownload")}: ${item.name}`}
          intent="plain"
          onPress={() => {
            onDownload(item.id);
          }}
          size="sq-xs"
        >
          <HiArrowDownTray aria-hidden="true" />
        </Button>
      ) : null}
      {item.state === "failed" ? (
        <Button
          intent="plain"
          onPress={() => {
            onRetry(item.id);
          }}
          size="sq-xs"
        >
          <HiArrowPath aria-hidden="true" />
        </Button>
      ) : null}
      <Button
        aria-label={t("unmaskBatchRemoveRow", { name: item.name })}
        id={`unmask-remove-${view}-${item.id}`}
        intent="plain"
        onPress={() => {
          onRemove(item.id);
        }}
        size="sq-xs"
      >
        <HiTrash aria-hidden="true" />
      </Button>
    </div>
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

/**
 * The Batch: a real table at 1440 with column heads, and the same rows as
 * cards at 390. The state is a word and a mark, never a hue alone.
 */
export const UnmaskBatchList = ({
  batch,
  folderPath,
  onDownload,
  onOpen,
  onRemove,
  onRetry,
  skipped,
}: BatchListProps) => {
  const { t, locale } = useTranslation();

  if (batch.length === 0) {
    return (
      <p className="border-rule border-2 p-4 text-sm">
        {t("unmaskBatchEmpty")}
      </p>
    );
  }

  return (
    <section aria-labelledby="unmask-batch-heading" className="min-w-0">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2
          className="border-rule font-display border-b-2 pb-2 text-[clamp(1.5rem,4vw,2.25rem)] font-black uppercase [font-stretch:75%]"
          id="unmask-batch-heading"
          tabIndex={-1}
        >
          {t("unmaskBatchTitle")}
        </h2>
        <span className="num text-sm">
          {t("unmaskBatchCount", { count: batch.length })}
        </span>
      </div>
      {folderPath === null ? null : (
        <p className="text-muted-fg mt-2 text-sm break-all">
          {t("unmaskBatchFolder", { path: folderPath })}
        </p>
      )}
      {skipped > 0 ? (
        <p className="text-muted-fg mt-1 text-sm">
          {t("unmaskBatchSkipped", { count: skipped })}
        </p>
      ) : null}

      <div className="border-rule mt-3 hidden border-2 lg:block">
        <table className="w-full table-fixed border-separate border-spacing-0 text-sm/6">
          <caption className="sr-only">{t("unmaskBatchTitle")}</caption>
          <thead>
            <tr className="bg-muted">
              {(
                [
                  "unmaskBatchFileColumn",
                  "unmaskBatchFormatColumn",
                  "unmaskBatchSizeColumn",
                  "unmaskBatchStateColumn",
                  "unmaskBatchActionColumn",
                ] as const
              ).map((key, index) => (
                <th
                  className={`border-rule border-b-2 px-3 py-2 text-left text-xs font-bold tracking-[0.06em] uppercase [font-stretch:87.5%] ${
                    index === 0 ? "w-[34%]" : index === 3 ? "w-[30%]" : ""
                  }`}
                  key={key}
                  scope="col"
                >
                  {t(key)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {batch.map((item) => {
              const format = item.facts?.format ?? item.claimedFormat;
              return (
                <tr className="align-top" key={item.id}>
                  <th
                    className="border-rule border-b-2 px-3 py-3 text-left font-normal"
                    scope="row"
                  >
                    <span className="flex min-w-0 items-start gap-2.5">
                      <RowThumb item={item} />
                      <span className="min-w-0">
                        <span className="block truncate font-semibold">
                          {item.name}
                        </span>
                        {item.folderPath === null ? null : (
                          <span className="text-muted-fg block truncate text-xs">
                            {item.folderPath}
                          </span>
                        )}
                        {item.operations.length > 0 ? (
                          <span className="text-muted-fg mt-1 block text-xs">
                            {t("unmaskOperationCount", {
                              count: item.operations.length,
                            })}
                          </span>
                        ) : null}
                      </span>
                    </span>
                  </th>
                  <td className="border-rule num border-b-2 px-3 py-3 text-xs uppercase">
                    {format === null ? "—" : t(formatLabelKey(format))}
                  </td>
                  <td className="border-rule num border-b-2 px-3 py-3 text-xs">
                    <span className="block">
                      {formatBytes(item.byteSize, locale)}
                    </span>
                    {item.result === null ? null : (
                      <span className="text-muted-fg block">
                        {formatBytes(item.result.bytesLength, locale)}
                      </span>
                    )}
                  </td>
                  <td className="border-rule border-b-2 px-3 py-3">
                    <RowStateCell item={item} />
                  </td>
                  <td className="border-rule border-b-2 px-3 py-3">
                    <RowActions
                      item={item}
                      onDownload={onDownload}
                      onOpen={onOpen}
                      onRemove={onRemove}
                      onRetry={onRetry}
                      view="table"
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <ul className="mt-3 flex flex-col gap-2 lg:hidden">
        {batch.map((item) => {
          const format = item.facts?.format ?? item.claimedFormat;
          return (
            <li className="border-rule border-2 p-3" key={item.id}>
              <div className="flex items-start gap-2.5">
                <RowThumb item={item} />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{item.name}</p>
                  {item.folderPath === null ? null : (
                    <p className="text-muted-fg truncate text-xs">
                      {item.folderPath}
                    </p>
                  )}
                  <p className="num text-muted-fg mt-1 text-xs">
                    {format === null ? "—" : t(formatLabelKey(format))} ·{" "}
                    {formatBytes(item.byteSize, locale)}
                  </p>
                </div>
              </div>
              <div className="mt-2">
                <RowStateCell item={item} />
              </div>
              <div className="mt-2">
                <RowActions
                  item={item}
                  onDownload={onDownload}
                  onOpen={onOpen}
                  onRemove={onRemove}
                  onRetry={onRetry}
                  view="card"
                />
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
};
