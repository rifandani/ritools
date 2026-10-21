"use client";

import { cn } from "cn";
import { Option } from "effect";
import { memo } from "react";

import { Button } from "@/core/components/ui/button";
import { Loader } from "@/core/components/ui/loader";
import { useTranslation } from "@/features/i18n/use-translation";
import { StateMark } from "@/features/squeeze/components/squeeze-state-mark";
import type { StateMarkKind } from "@/features/squeeze/components/squeeze-state-mark";
import type {
  BatchItem,
  ImageFormat,
  InputFormat,
  ItemResult,
  RowNote,
  RowView,
} from "@/features/squeeze/squeeze";
import {
  BYTES_PER_KB,
  formatBytes,
  MAX_TARGET_BYTES,
  MIN_TARGET_BYTES,
  noteKey,
  problemKey,
  rowStateKey,
  rowViewOf,
} from "@/features/squeeze/squeeze";

type Translate = ReturnType<typeof useTranslation>["t"];

/** One note, in the Locale's words. */
const noteText = (note: RowNote, locale: string, t: Translate): string => {
  if (note.kind === "resized") {
    return t("squeezeNoteResized", { from: note.from, to: note.to });
  }
  if (note.kind === "bigger-than-input") {
    return t("squeezeNoteBiggerThanInput", { percent: note.percent });
  }
  if (note.kind === "raised") {
    return t("squeezeNoteRaised", { amount: formatBytes(note.bytes, locale) });
  }
  if (note.kind === "still-over") {
    return t("squeezeNoteStillOver", {
      amount: formatBytes(note.bytes, locale),
    });
  }
  return t(noteKey(note));
};

/** A signed percentage, in the saving or growth voice. */
const deltaOf = (saved: number): string => {
  if (saved === 0) {
    return "0%";
  }
  return saved > 0 ? `−${saved}%` : `+${Math.abs(saved)}%`;
};

/** A number cell: labelled under the desktop ledger head, labelled inline below it. */
const Num = ({
  className,
  label,
  value,
}: {
  readonly className?: string;
  readonly label: string;
  readonly value: string;
}) => (
  <span className={cn("flex items-baseline gap-x-2 xl:justify-end", className)}>
    <span className="text-muted-fg text-xs tracking-[0.08em] uppercase xl:sr-only">
      {label}
    </span>
    <span className="num text-[0.875rem] whitespace-nowrap">{value}</span>
  </span>
);

const PART_STATE_KEY = {
  bigger: "squeezeStateBigger",
  done: "squeezeStateDone",
  failed: "squeezePartFailed",
  miss: "squeezeStateMiss",
} as const;

const OVERRIDE_CLASS =
  "num w-14 min-w-0 bg-transparent px-1.5 py-1 text-end text-xs outline-hidden";

const markOf = (view: RowView): StateMarkKind =>
  view.state === "working" ? "queued" : view.state;

interface StateProps {
  readonly mark: StateMarkKind;
  readonly queuedWord: string;
  readonly settled: boolean;
  readonly stale: boolean;
  readonly stateWord: string;
  readonly working: boolean;
  readonly workingWord: string;
}

/** The outcome mark and its word, or the pending mark while the row works. */
const RowStateCell = ({
  mark,
  queuedWord,
  settled,
  stale,
  stateWord,
  working,
  workingWord,
}: StateProps) => {
  const { t } = useTranslation();
  const word = working ? workingWord : settled ? stateWord : queuedWord;
  return (
    <div className="flex items-center gap-x-2 md:col-start-1 md:row-span-2 md:row-start-1 xl:row-span-1">
      {working ? (
        <Loader aria-label={workingWord} />
      ) : (
        <StateMark
          className={settled && !stale ? undefined : "text-muted-fg"}
          kind={settled ? mark : "queued"}
        />
      )}
      <span
        className={
          stale
            ? "text-muted-fg font-display text-[0.875rem] leading-4 font-black tracking-[0.04em] uppercase [font-stretch:75%]"
            : "font-display text-[0.875rem] leading-4 font-black tracking-[0.04em] uppercase [font-stretch:75%]"
        }
      >
        {word}
      </span>
      {stale ? (
        <span className="text-muted-fg w-fit border-2 border-current px-1 py-0.5 text-xs font-bold tracking-[0.08em] uppercase [font-stretch:87.5%]">
          {t("squeezeStale")}
        </span>
      ) : null}
    </div>
  );
};

interface FileProps {
  readonly batchTarget: number | null;
  readonly id: string;
  readonly inputFormat: InputFormat | null;
  readonly item: BatchItem;
  readonly onTarget: (id: string, targetBytes: number | null) => void;
  readonly overrideEnabled: boolean;
  readonly targetId: string;
}

/** The file name, its folder, its input format, and the per-row target. */
const RowFileCell = ({
  batchTarget,
  id,
  inputFormat,
  item,
  onTarget,
  overrideEnabled,
  targetId,
}: FileProps) => {
  const { t } = useTranslation();
  return (
    <div className="min-w-0 md:col-start-2 md:row-start-1 xl:col-start-2">
      <p className="truncate text-sm font-semibold" title={item.name}>
        {item.name}
      </p>
      <div className="text-muted-fg flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
        {item.folderPath === null ? null : (
          <span className="max-w-full truncate" title={item.folderPath}>
            {item.folderPath}
          </span>
        )}
        {inputFormat === null ? null : (
          <span className="border-2 border-current px-1 py-px text-xs font-bold tracking-[0.05em] uppercase [font-stretch:87.5%]">
            {inputFormat}
          </span>
        )}
        {overrideEnabled ? (
          <span className="flex items-center gap-x-1.5">
            <label className="sr-only" htmlFor={targetId}>
              {t("squeezeOverride")}
            </label>
            <span
              aria-hidden="true"
              className="text-xs tracking-[0.05em] uppercase"
            >
              {t("squeezeTargetSize")}
            </span>
            <span className="well bracket flex items-stretch">
              <input
                className={OVERRIDE_CLASS}
                id={targetId}
                inputMode="numeric"
                max={MAX_TARGET_BYTES / BYTES_PER_KB}
                min={MIN_TARGET_BYTES / BYTES_PER_KB}
                onChange={(event) => {
                  const kb = Number(event.target.value);
                  onTarget(
                    id,
                    event.target.value === "" || !Number.isFinite(kb)
                      ? null
                      : Math.round(kb * BYTES_PER_KB)
                  );
                }}
                placeholder={
                  batchTarget === null
                    ? ""
                    : String(Math.round(batchTarget / BYTES_PER_KB))
                }
                step={10}
                title={t("squeezeOverrideHint")}
                type="number"
                value={
                  item.targetBytes === null
                    ? ""
                    : Math.round(item.targetBytes / BYTES_PER_KB)
                }
              />
              <span className="text-xs uppercase [font-stretch:87.5%]">KB</span>
            </span>
          </span>
        ) : null}
      </div>
    </div>
  );
};

interface MeasureProps {
  readonly item: BatchItem;
  readonly locale: string;
  readonly multi: boolean;
  readonly stale: boolean;
  readonly view: RowView;
}

/** In, Out, and the delta. */
const RowMeasures = ({ item, locale, multi, stale, view }: MeasureProps) => {
  const { t } = useTranslation();
  return (
    <div className="items-baseline gap-x-5 gap-y-1 max-xl:flex max-xl:flex-wrap md:col-start-2 md:row-start-2 xl:contents">
      <Num
        className={stale ? "text-muted-fg" : undefined}
        label={t("squeezeColIn")}
        value={formatBytes(item.size, locale)}
      />
      <Num
        className={stale ? "text-muted-fg xl:col-start-4" : "xl:col-start-4"}
        label={t("squeezeColOut")}
        value={
          view.outputBytes === null
            ? "—"
            : multi
              ? t("squeezeFileCount", { count: view.writtenCount })
              : formatBytes(view.outputBytes, locale)
        }
      />
      <Num
        className={stale ? "text-muted-fg xl:col-start-5" : "xl:col-start-5"}
        label={t("squeezeColDelta")}
        value={view.outputBytes === null ? "—" : deltaOf(view.saved)}
      />
    </div>
  );
};

interface NotesProps {
  readonly locale: string;
  readonly multi: boolean;
  readonly problemFormat: string;
  readonly view: RowView;
}

/** The notes, the smallest step, the state note, the problem, and the part counts. */
const RowNotes = ({ locale, multi, problemFormat, view }: NotesProps) => {
  const { t } = useTranslation();
  return (
    <div className="text-muted-fg flex min-w-0 flex-col gap-y-1 text-xs leading-4 md:col-start-2 md:row-start-3 xl:col-start-6 xl:row-start-1">
      {view.notes.length === 0 ? null : (
        <p className="flex flex-wrap gap-x-2">
          {view.notes.map((note) => (
            <span key={`${note.kind}-${noteText(note, locale, t)}`}>
              {noteText(note, locale, t)}
            </span>
          ))}
        </p>
      )}
      {view.smallestStep === null ? null : (
        <p>{t("squeezeSmallestStep", { step: view.smallestStep })}</p>
      )}
      {view.state === "miss" ? <p>{t("squeezeMissNote")}</p> : null}
      {view.state === "bigger" ? <p>{t("squeezeBiggerNote")}</p> : null}
      {view.problem === null ? null : view.problem === "codec-offline" ? (
        <p className="text-danger-subtle-fg font-semibold">
          {t("squeezeProblemCodecOffline", { format: problemFormat })}
        </p>
      ) : (
        <p className="text-danger-subtle-fg font-semibold">
          {t(problemKey(view.problem))}
        </p>
      )}
      {multi && view.writtenCount < 3 ? (
        <p>{t("squeezeWrittenCount", { count: view.writtenCount })}</p>
      ) : null}
      {multi && view.writtenCount === 3 && view.underTargetCount < 3 ? (
        <p>{t("squeezeUnderTargetCount", { count: view.underTargetCount })}</p>
      ) : null}
    </div>
  );
};

interface ActionProps {
  readonly downloadLabel: string;
  readonly id: string;
  readonly onDownload: (id: string) => void;
  readonly onRecompress: (id: string) => void;
  readonly onRemove: (id: string) => void;
  readonly onResize: () => void;
  readonly onTryFormat: () => void;
  readonly online: boolean;
  readonly rejected: boolean;
  readonly removeId: string;
  readonly running: boolean;
  readonly settled: boolean;
  readonly view: RowView;
}

/** Download, then the recovery the row offers, then Remove. */
const RowActions = ({
  downloadLabel,
  id,
  onDownload,
  onRecompress,
  onRemove,
  onResize,
  onTryFormat,
  online,
  rejected,
  removeId,
  running,
  settled,
  view,
}: ActionProps) => {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col items-start gap-y-1 md:col-start-3 md:row-span-3 md:row-start-1 md:items-end xl:col-start-7 xl:row-span-1 xl:items-start">
      <Button
        aria-label={downloadLabel}
        intent="outline"
        isDisabled={!settled || rejected}
        onPress={() => {
          onDownload(id);
        }}
        size="xs"
      >
        {t("squeezeDownload")}
      </Button>
      <div className="flex flex-wrap items-center gap-x-1 gap-y-1">
        {rejected ? (
          <>
            {/* A rejected row offers the recovery its problem names, and no
                retry that is known to fail: too large points at Resize, a
                codec failure at another format, and a missing codec at a
                retry that stays disabled until the connection returns. */}
            {view.problem === "too-large" ? (
              <Button intent="plain" onPress={onResize} size="xs">
                {t("squeezeActionResize")}
              </Button>
            ) : null}
            {view.problem === "codec-failed" ? (
              <Button intent="plain" onPress={onTryFormat} size="xs">
                {t("squeezeActionTryFormat")}
              </Button>
            ) : null}
            {view.problem === "codec-offline" ? (
              <Button
                intent="plain"
                isDisabled={!online || running}
                onPress={() => {
                  onRecompress(id);
                }}
                size="xs"
              >
                {t("squeezeRetry")}
              </Button>
            ) : null}
          </>
        ) : (
          <Button
            intent="plain"
            isDisabled={!settled || running}
            onPress={() => {
              onRecompress(id);
            }}
            size="xs"
          >
            {t("squeezeRecompress")}
          </Button>
        )}
        <Button
          id={removeId}
          intent="plain"
          onPress={() => {
            onRemove(id);
          }}
          size="xs"
        >
          {t("squeezeRemove")}
        </Button>
      </div>
    </div>
  );
};

interface PartProps {
  readonly id: string;
  readonly locale: string;
  readonly onDownloadPart: (id: string, format: ImageFormat) => void;
  readonly stale: boolean;
  readonly view: RowView;
}

/** Multi: one line per format. */
const RowParts = ({ id, locale, onDownloadPart, stale, view }: PartProps) => {
  const { t } = useTranslation();
  return (
    <ul
      className={cn(
        "flex flex-col gap-y-1 border-l-2 border-current pl-3 md:col-span-2 md:col-start-2 md:row-start-4",
        "xl:col-span-6 xl:col-start-2 xl:row-start-2 xl:border-l-0 xl:pl-0",
        stale && "text-muted-fg"
      )}
    >
      {view.parts.map((part) => (
        <li
          className={cn(
            "flex flex-wrap items-center gap-x-3 gap-y-1",
            "xl:grid xl:grid-cols-[minmax(0,1.5fr)_4.25rem_4.25rem_3.5rem_minmax(0,1fr)_auto] xl:items-center"
          )}
          key={part.format}
        >
          <span className="flex items-center gap-x-2">
            <span className="border-2 border-current px-1 py-px text-xs font-bold tracking-[0.05em] uppercase [font-stretch:87.5%]">
              {part.format}
            </span>
            <span
              className={cn(
                "text-xs font-bold tracking-[0.05em] uppercase [font-stretch:87.5%]",
                part.state === "failed" || part.state === "miss"
                  ? "text-danger-subtle-fg"
                  : "text-muted-fg"
              )}
            >
              {t(PART_STATE_KEY[part.state])}
            </span>
          </span>
          <span className="num text-[0.875rem] whitespace-nowrap xl:col-start-3 xl:text-end">
            {part.size === null ? "—" : formatBytes(part.size, locale)}
          </span>
          <span className="num text-[0.875rem] whitespace-nowrap xl:col-start-4 xl:text-end">
            {part.size === null ? "—" : deltaOf(part.saved)}
          </span>
          {part.file === null ? null : (
            <Button
              className="xl:col-start-6 xl:justify-self-end"
              intent="plain"
              onPress={() => {
                onDownloadPart(id, part.format);
              }}
              size="xs"
            >
              {t("squeezeDownload")}
            </Button>
          )}
        </li>
      ))}
    </ul>
  );
};

interface MissProps {
  readonly id: string;
  readonly onRaiseTarget: (id: string) => void;
  readonly onResize: () => void;
  readonly onTryFormat: () => void;
}

/** A Miss names the three ways out, in place. */
const RowMissActions = ({
  id,
  onRaiseTarget,
  onResize,
  onTryFormat,
}: MissProps) => {
  const { t } = useTranslation();
  return (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 md:col-span-2 md:col-start-2 xl:col-span-6 xl:col-start-2">
      <Button
        intent="outline"
        onPress={() => {
          onRaiseTarget(id);
        }}
        size="xs"
      >
        {t("squeezeActionRaiseTarget")}
      </Button>
      <Button intent="plain" onPress={onResize} size="xs">
        {t("squeezeActionResize")}
      </Button>
      <Button intent="plain" onPress={onTryFormat} size="xs">
        {t("squeezeActionTryFormat")}
      </Button>
    </div>
  );
};

interface ItemRowProps {
  readonly batchTarget: number | null;
  readonly id: string;
  readonly item: BatchItem;
  readonly locale: string;
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
  readonly problemFormat: string;
  /** The row's result, or `undefined` before it lands. */
  readonly result: ItemResult | undefined;
  readonly running: boolean;
  readonly stale: boolean;
  /** A still specimen for the development gallery. The app passes `result`. */
  readonly view?: RowView;
  readonly working: boolean;
}

const downloadLabelOf = (view: RowView, multi: boolean, t: Translate) => {
  if (!multi) {
    return t("squeezeDownload");
  }
  return view.writtenCount === 3
    ? t("squeezeDownloadMultiHint")
    : `${t("squeezeDownload")} · ${t("squeezeWrittenCount", {
        count: view.writtenCount,
      })}`;
};

/**
 * One image of the Batch, as a ledger row: the outcome word and its mark, the
 * file, In, Out, Δ, the notes, and the actions. At 390 px the same tree stacks;
 * it is one DOM tree, not two.
 */
const SqueezeItemRowInner = ({
  batchTarget,
  id,
  item,
  locale,
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
  problemFormat,
  result,
  running,
  stale,
  view: still,
  working,
}: ItemRowProps) => {
  const { t } = useTranslation();
  const view = still ?? rowViewOf(item, result, stale);
  const inputFormat = Option.getOrNull(item.format);
  const multi = view.parts.length > 0;
  const settled = view.state !== "working";
  const stateWord = t(rowStateKey(view.state));
  const targetId = `squeeze-target-${id}`;
  const removeId = `squeeze-remove-${id}`;
  const downloadLabel = downloadLabelOf(view, multi, t);
  const rejected = view.state === "rejected";
  const mark = markOf(view);

  return (
    <li
      className={cn(
        "border-rule grid grid-cols-1 items-start gap-x-3 gap-y-2 border-b-2 py-3 last:border-b-0",
        "md:grid-cols-[8rem_minmax(0,1fr)_10rem] md:gap-y-1",
        "xl:grid-cols-[9rem_minmax(0,1.5fr)_4.25rem_4.25rem_3.5rem_minmax(0,1fr)_12rem] xl:gap-y-0"
      )}
    >
      <RowStateCell
        mark={mark}
        queuedWord={t("squeezeStateQueued")}
        settled={settled}
        stale={stale}
        stateWord={stateWord}
        working={working}
        workingWord={t("squeezeWorking")}
      />

      <RowFileCell
        batchTarget={batchTarget}
        id={id}
        inputFormat={inputFormat}
        item={item}
        onTarget={onTarget}
        overrideEnabled={overrideEnabled}
        targetId={targetId}
      />

      <RowMeasures
        item={item}
        locale={locale}
        multi={multi}
        stale={stale}
        view={view}
      />

      <RowNotes
        locale={locale}
        multi={multi}
        problemFormat={problemFormat}
        view={view}
      />

      <RowActions
        downloadLabel={downloadLabel}
        id={id}
        onDownload={onDownload}
        onRecompress={onRecompress}
        onRemove={onRemove}
        onResize={onResize}
        onTryFormat={onTryFormat}
        online={online}
        rejected={rejected}
        removeId={removeId}
        running={running}
        settled={settled}
        view={view}
      />

      {multi ? (
        <RowParts
          id={id}
          locale={locale}
          onDownloadPart={onDownloadPart}
          stale={stale}
          view={view}
        />
      ) : null}

      {view.state === "miss" ? (
        <RowMissActions
          id={id}
          onRaiseTarget={onRaiseTarget}
          onResize={onResize}
          onTryFormat={onTryFormat}
        />
      ) : null}
    </li>
  );
};

/**
 * A row is memoized so one landing result does not re-render the whole ledger:
 * the Batch list reuses each unchanged view, and an unchanged row skips.
 */
export const SqueezeItemRow = memo(SqueezeItemRowInner);
