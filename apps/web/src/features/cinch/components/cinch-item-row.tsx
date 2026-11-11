"use client";

import { cn } from "cn";
import { memo, useEffect, useRef, useState } from "react";
import {
  HiArrowDownTray,
  HiArrowLongRight,
  HiEye,
  HiXMark,
} from "react-icons/hi2";

import { Badge } from "@/core/components/ui/badge";
import { Button } from "@/core/components/ui/button";
import { Loader } from "@/core/components/ui/loader";
import { Tooltip, TooltipContent } from "@/core/components/ui/tooltip";
import { formatBytes } from "@/core/utils/file-size";
import {
  extensionOf,
  formatDuration,
  LARGE_INPUT_BYTES,
  outputBytesOf,
  savedPercentOf,
} from "@/features/cinch/cinch";
import type {
  BatchItem,
  ItemResult,
  OutputFile,
  RejectProblem,
  ResultKind,
} from "@/features/cinch/cinch";
import { CinchPreview } from "@/features/cinch/components/cinch-preview";
import { useTranslation } from "@/features/i18n/use-translation";

type Translate = ReturnType<typeof useTranslation>["t"];

const STATE_KEY = {
  "already-fits": "cinchStateAlreadyFits",
  bigger: "cinchStateBigger",
  done: "cinchStateDone",
  miss: "cinchStateMiss",
  rejected: "cinchStateRejected",
} as const satisfies Record<ResultKind, string>;

const STATE_TONE = {
  "already-fits": "text-success-subtle-fg",
  bigger: "text-warning-subtle-fg",
  done: "text-success-subtle-fg",
  miss: "text-warning-subtle-fg",
  rejected: "text-danger-subtle-fg",
} as const satisfies Record<ResultKind, string>;

const PROBLEM_KEY = {
  container: "cinchProblemContainer",
  failed: "cinchProblemFailed",
  "no-video": "cinchProblemNoVideo",
  undecodable: "cinchProblemUndecodable",
  unencodable: "cinchProblemUnencodable",
} as const satisfies Record<RejectProblem, string>;

const LABEL_CLASS =
  "font-bold uppercase tracking-[0.05em] [font-stretch:87.5%]";

const WORD_CLASS =
  "text-xs/4 font-bold uppercase tracking-[0.14em] [font-stretch:87.5%]";

/** What the browser reads from the video tag: frame size and duration. */
interface Probe {
  readonly duration: number;
  readonly height: number;
  readonly width: number;
}

/**
 * The first frame of the video, in a square plate. The plate prints the file's
 * extension, and the frame covers it once the browser can show it. No library
 * loads for this: the browser's own video tag reads the frame.
 */
const RowThumb = ({
  item,
  onProbe,
}: {
  readonly item: BatchItem;
  readonly onProbe: (probe: Probe) => void;
}) => {
  const video = useRef<HTMLVideoElement>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const element = video.current;
    if (element === null) {
      return;
    }
    let url: string;
    try {
      url = URL.createObjectURL(item.source);
    } catch {
      return;
    }
    // A time past zero makes the browser paint a frame instead of black.
    element.src = `${url}#t=0.1`;
    return () => {
      element.removeAttribute("src");
      element.load();
      URL.revokeObjectURL(url);
    };
  }, [item.source]);

  return (
    <span
      aria-hidden="true"
      className="border-border bg-muted relative row-span-2 grid size-12 shrink-0 place-content-center overflow-hidden border-2 sm:row-span-1 sm:size-14"
    >
      <span className={cn("text-muted-fg text-[0.6875rem]/4", LABEL_CLASS)}>
        {extensionOf(item.name).slice(0, 4) || "?"}
      </span>
      {failed ? null : (
        // oxlint-disable-next-line jsx-a11y/media-has-caption -- A still frame with no sound.
        <video
          className="absolute inset-0 size-full object-cover"
          muted
          onError={() => {
            setFailed(true);
          }}
          onLoadedMetadata={(event) => {
            const loaded = event.currentTarget;
            onProbe({
              duration: loaded.duration,
              height: loaded.videoHeight,
              width: loaded.videoWidth,
            });
          }}
          playsInline
          preload="metadata"
          ref={video}
          tabIndex={-1}
        />
      )}
    </span>
  );
};

const Dot = () => (
  <span aria-hidden="true" className="text-border">
    ·
  </span>
);

const fileOf = (result: ItemResult | undefined): OutputFile | null => {
  const outcome = result?.outcome;
  return outcome === undefined ||
    outcome.kind === "rejected" ||
    outcome.kind === "already-fits"
    ? null
    : outcome.file;
};

/** The input, and once it lands, the output: `1:24 · 1920×1080 · 84 MB → 24 MB · 1280×720`. */
const RowMeta = ({
  item,
  locale,
  probe,
  result,
  stale,
}: {
  readonly item: BatchItem;
  readonly locale: string;
  readonly probe: Probe | null;
  readonly result: ItemResult | undefined;
  readonly stale: boolean;
}) => {
  const { t } = useTranslation();
  const file = fileOf(result);
  const inputFrame = probe === null ? null : `${probe.width}×${probe.height}`;
  const outputFrame = file === null ? null : `${file.width}×${file.height}`;
  return (
    <p className="text-muted-fg flex flex-wrap items-center gap-x-2 text-xs/5 sm:text-[0.8125rem]/5">
      {probe !== null && Number.isFinite(probe.duration) ? (
        <>
          <span className="num">{formatDuration(probe.duration)}</span>
          <Dot />
        </>
      ) : null}
      {inputFrame === null ? null : (
        <>
          <span className="num">{inputFrame}</span>
          <Dot />
        </>
      )}
      <span className="num">{formatBytes(item.size, locale)}</span>
      {file === null ? null : (
        <>
          <HiArrowLongRight aria-hidden className="size-3.5 shrink-0" />
          <span className="sr-only">{t("cinchColOut")}</span>
          <span
            className={cn(
              "num font-semibold",
              stale
                ? "text-muted-fg"
                : file.bytes < item.size
                  ? "text-success-subtle-fg"
                  : "text-warning-subtle-fg"
            )}
          >
            {formatBytes(file.bytes, locale)}
          </span>
          <Dot />
          <span className={LABEL_CLASS}>{file.format}</span>
          {outputFrame === inputFrame ? null : (
            <>
              <Dot />
              <span className="num">{outputFrame}</span>
            </>
          )}
        </>
      )}
    </p>
  );
};

/** The notes of a row: Fit Scale, retry, Miss, Bigger, a large input, and the problem. */
const remarksOf = (
  item: BatchItem,
  result: ItemResult | undefined,
  t: Translate
) => {
  const outcome = result?.outcome;
  const file = fileOf(result);
  const notes = [
    file?.fitScale === null || file === null
      ? null
      : t("cinchNoteFitScale", { height: file.fitScale }),
    file?.retried === true ? t("cinchNoteRetried") : null,
    outcome?.kind === "miss" ? t("cinchMissNote") : null,
    outcome?.kind === "bigger" ? t("cinchBiggerNote") : null,
    outcome?.kind === "already-fits" ? t("cinchAlreadyFitsNote") : null,
    result === undefined && item.size > LARGE_INPUT_BYTES
      ? t("cinchNoteLarge")
      : null,
  ].filter((note): note is string => note !== null);
  return {
    notes,
    problem:
      outcome?.kind === "rejected" ? t(PROBLEM_KEY[outcome.problem]) : null,
  };
};

const RowRemarks = ({
  item,
  result,
}: {
  readonly item: BatchItem;
  readonly result: ItemResult | undefined;
}) => {
  const { t } = useTranslation();
  const { notes, problem } = remarksOf(item, result, t);
  if (notes.length === 0 && problem === null) {
    return null;
  }
  return (
    <p className="text-muted-fg mt-1 text-xs/4">
      {problem === null ? null : (
        <span className="text-danger-subtle-fg font-semibold">{problem}</span>
      )}
      {notes.map((note, index) => (
        <span key={note}>
          {index === 0 && problem === null ? null : " · "}
          {note}
        </span>
      ))}
    </p>
  );
};

/** The delta stamp and the state word, or the progress of the working row. */
const RowStatus = ({
  item,
  progress,
  result,
  stale,
}: {
  readonly item: BatchItem;
  readonly progress: number | null;
  readonly result: ItemResult | undefined;
  readonly stale: boolean;
}) => {
  const { t } = useTranslation();
  const kind = result?.outcome.kind;
  const bytes = result === undefined ? null : outputBytesOf(item, result);
  const saved = bytes === null ? null : savedPercentOf(item.size, bytes);
  const working = progress !== null;
  const word = working
    ? t("cinchWorking", { percent: Math.round(progress * 100) })
    : kind === undefined
      ? t("cinchStateQueued")
      : t(STATE_KEY[kind]);

  return (
    <div className="col-start-2 row-start-2 flex items-center gap-x-3 sm:col-start-3 sm:row-start-1 sm:justify-end">
      {saved === null || working || kind === "already-fits" ? null : (
        <Badge
          className="num min-w-[4.25rem] justify-center tracking-normal"
          intent={
            stale || saved === 0 ? "outline" : saved > 0 ? "success" : "warning"
          }
        >
          {saved === 0
            ? "0%"
            : saved > 0
              ? `−${saved}%`
              : `+${Math.abs(saved)}%`}
        </Badge>
      )}
      <span
        className={cn(
          "flex items-center gap-x-2 sm:min-w-[8.5rem]",
          WORD_CLASS,
          stale || kind === undefined || working
            ? "text-muted-fg"
            : STATE_TONE[kind]
        )}
      >
        {working ? <Loader aria-hidden className="size-3.5" /> : null}
        <span className="num">{word}</span>
      </span>
    </div>
  );
};

/** A mark with no word of its own: the note says what it does. */
const MarkNote = ({
  children,
  label,
}: {
  readonly children: React.ReactNode;
  readonly label: string;
}) => (
  <Tooltip delay={0}>
    {children}
    <TooltipContent>{label}</TooltipContent>
  </Tooltip>
);

interface ItemRowProps {
  readonly item: BatchItem;
  readonly locale: string;
  readonly onDownload: (id: string) => void;
  readonly onRemove: (id: string) => void;
  /** How far the working row is, or `null` when this row is not working. */
  readonly progress: number | null;
  readonly result: ItemResult | undefined;
  readonly stale: boolean;
}

/**
 * One video of the Batch: its first frame, its name, what went in and what
 * came out, the delta stamp, the state word, and the marks. A row with an
 * output offers a before-and-after preview.
 */
const CinchItemRowInner = ({
  item,
  locale,
  onDownload,
  onRemove,
  progress,
  result,
  stale,
}: ItemRowProps) => {
  const { t } = useTranslation();
  const [probe, setProbe] = useState<Probe | null>(null);
  const [previewing, setPreviewing] = useState(false);
  const file = fileOf(result);
  const downloadable =
    result !== undefined && result.outcome.kind !== "rejected";
  const downloadLabel = t("cinchDownload");
  const removeLabel = t("cinchRemoveFile", { name: item.name });
  const previewLabel = previewing
    ? t("cinchPreviewHide")
    : t("cinchPreviewShow");

  return (
    <li
      className={cn(
        "border-border grid grid-cols-[3rem_minmax(0,1fr)_auto] items-start gap-x-3 gap-y-2 border-b-2 px-3 py-3 last:border-b-0",
        "sm:grid-cols-[3.5rem_minmax(0,1fr)_auto_auto] sm:items-center sm:gap-x-5 sm:px-4"
      )}
    >
      <RowThumb item={item} onProbe={setProbe} />

      <div className="col-start-2 row-start-1 min-w-0">
        <p
          className="truncate text-sm/5 font-semibold sm:text-[0.9375rem]/6"
          title={
            item.folderPath === null
              ? item.name
              : `${item.folderPath}/${item.name}`
          }
        >
          {item.folderPath === null ? null : (
            <span className="text-muted-fg font-normal">
              {item.folderPath}/
            </span>
          )}
          {item.name}
        </p>
        <RowMeta
          item={item}
          locale={locale}
          probe={probe}
          result={result}
          stale={stale}
        />
        <RowRemarks item={item} result={result} />
        {progress === null ? null : (
          <div
            aria-hidden="true"
            className="border-rule bg-card mt-2 h-2 w-full border"
          >
            <div
              className="bg-primary h-full transition-[width] duration-200 ease-linear motion-reduce:transition-none"
              style={{ width: `${Math.round(progress * 100)}%` }}
            />
          </div>
        )}
      </div>

      <RowStatus
        item={item}
        progress={progress}
        result={result}
        stale={stale}
      />

      <div className="col-start-3 row-start-1 flex items-center gap-x-1.5 sm:col-start-4">
        {file === null ? null : (
          <MarkNote label={previewLabel}>
            <Button
              aria-expanded={previewing}
              aria-label={previewLabel}
              intent={previewing ? "primary" : "plain"}
              onPress={() => {
                setPreviewing((open) => !open);
              }}
              size="sq-xs"
            >
              <HiEye aria-hidden />
            </Button>
          </MarkNote>
        )}
        {downloadable ? (
          <MarkNote label={downloadLabel}>
            <Button
              aria-label={downloadLabel}
              intent="outline"
              onPress={() => {
                onDownload(item.id);
              }}
              size="sq-xs"
            >
              <HiArrowDownTray aria-hidden />
            </Button>
          </MarkNote>
        ) : (
          <span aria-hidden="true" className="size-8 sm:size-7" />
        )}
        <MarkNote label={removeLabel}>
          <Button
            aria-label={removeLabel}
            id={`cinch-remove-${item.id}`}
            intent="plain"
            onPress={() => {
              onRemove(item.id);
            }}
            size="sq-xs"
          >
            <HiXMark aria-hidden />
          </Button>
        </MarkNote>
      </div>

      {previewing && file !== null ? (
        <div className="col-span-3 sm:col-span-4">
          <CinchPreview input={item.source} output={file.blob} />
        </div>
      ) : null}
    </li>
  );
};

/** A row is memoized, so one progress tick does not re-render the whole Batch. */
export const CinchItemRow = memo(CinchItemRowInner);
