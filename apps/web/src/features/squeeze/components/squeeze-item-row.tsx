"use client";

import { cn } from "cn";
import { Option } from "effect";
import { Fragment, memo, useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { HiArrowDownTray, HiArrowLongRight, HiXMark } from "react-icons/hi2";

import { Badge } from "@/core/components/ui/badge";
import { Button } from "@/core/components/ui/button";
import { Loader } from "@/core/components/ui/loader";
import { useTranslation } from "@/features/i18n/use-translation";
import type {
  BatchItem,
  ImageFormat,
  ItemResult,
  OutputFile,
  RowNote,
  RowState,
  RowView,
} from "@/features/squeeze/squeeze";
import {
  formatBytes,
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

/** The stamp a delta prints in: a saving, a growth, or no change. */
const deltaIntent = (saved: number, stale: boolean) => {
  if (stale || saved === 0) {
    return "outline" as const;
  }
  return saved > 0 ? ("success" as const) : ("warning" as const);
};

/** The wash ink each state word prints in. The word names the state. */
const STATE_TONE = {
  "already-fits": "text-success-subtle-fg",
  bigger: "text-warning-subtle-fg",
  done: "text-success-subtle-fg",
  miss: "text-warning-subtle-fg",
  rejected: "text-danger-subtle-fg",
  working: "text-muted-fg",
} as const satisfies Record<RowState, string>;

const PART_STATE_KEY = {
  bigger: "squeezeStateBigger",
  done: "squeezeStateDone",
  failed: "squeezePartFailed",
  miss: "squeezeStateMiss",
} as const;

const PART_TONE = {
  bigger: "text-warning-subtle-fg",
  done: "text-success-subtle-fg",
  failed: "text-danger-subtle-fg",
  miss: "text-warning-subtle-fg",
} as const;

const LABEL_CLASS =
  "font-bold uppercase tracking-[0.05em] [font-stretch:87.5%]";

const WORD_CLASS =
  "text-xs/4 font-bold uppercase tracking-[0.14em] [font-stretch:87.5%]";

/** The extension of a file name, for a plate that has no picture. */
const extensionOf = (name: string): string => {
  const dot = name.lastIndexOf(".");
  return dot <= 0 ? "?" : name.slice(dot + 1, dot + 5);
};

/**
 * The image itself, in a square plate. The plate prints the file's extension,
 * and the picture covers it once the browser can show it. The object URL is
 * set on the element and revoked when the row leaves.
 */
const RowThumb = ({
  item,
  onSize,
}: {
  readonly item: BatchItem;
  readonly onSize: (size: string) => void;
}) => {
  const image = useRef<HTMLImageElement>(null);
  const [failed, setFailed] = useState(false);
  const readable = Option.isSome(item.format) && item.source.size > 0;

  useEffect(() => {
    const element = image.current;
    if (element === null || !readable) {
      return;
    }
    let url: string;
    try {
      url = URL.createObjectURL(item.source);
    } catch {
      // The plate keeps its extension.
      return;
    }
    element.src = url;
    return () => {
      element.removeAttribute("src");
      URL.revokeObjectURL(url);
    };
  }, [item.source, readable]);

  return (
    <span
      aria-hidden="true"
      className="border-border bg-muted relative row-span-2 grid size-12 shrink-0 place-content-center overflow-hidden border-2 sm:row-span-1 sm:size-14"
    >
      <span className={cn("text-muted-fg text-[0.6875rem]/4", LABEL_CLASS)}>
        {extensionOf(item.name)}
      </span>
      {readable && !failed ? (
        <img
          alt=""
          className="absolute inset-0 size-full object-cover"
          decoding="async"
          onError={() => {
            setFailed(true);
          }}
          onLoad={(event) => {
            const loaded = event.currentTarget;
            onSize(`${loaded.naturalWidth}×${loaded.naturalHeight}`);
          }}
          ref={image}
        />
      ) : null}
    </span>
  );
};

const Dot = () => (
  <span aria-hidden="true" className="text-border">
    ·
  </span>
);

/** Whether a row has an encoded output to show beside its input. */
const showsOutputOf = (view: RowView): boolean =>
  view.outputBytes !== null &&
  (view.state === "done" || view.state === "miss" || view.state === "bigger");

interface OutputProps {
  readonly inputFormat: string | null;
  readonly inputSize: string | null;
  readonly locale: string;
  readonly multi: boolean;
  readonly stale: boolean;
  readonly view: RowView;
}

interface OutputExtra {
  readonly key: string;
  readonly node: ReactNode;
}

const outputExtrasOf = (
  file: OutputFile | null,
  inputFormat: string | null,
  inputSize: string | null
): OutputExtra[] => {
  if (file === null) {
    return [];
  }
  const size = `${file.width}×${file.height}`;
  const extras: OutputExtra[] = [];
  if (file.format !== inputFormat) {
    extras.push({
      key: "format",
      node: <span className={LABEL_CLASS}>{file.format}</span>,
    });
  }
  if (size !== inputSize) {
    extras.push({ key: "size", node: <span className="num">{size}</span> });
  }
  if (file.quality !== null) {
    extras.push({
      key: "quality",
      node: <span className="num">q{file.quality}</span>,
    });
  }
  return extras;
};

/** The output half of the meta line: `→ 14.3 KB · WEBP · 800×600 · q95`. */
const RowOutput = ({
  inputFormat,
  inputSize,
  locale,
  multi,
  stale,
  view,
}: OutputProps) => {
  const { t } = useTranslation();
  const file = multi ? null : (view.files[0] ?? null);
  const extras = outputExtrasOf(file, inputFormat, inputSize);
  const output = multi
    ? t("squeezeFileCount", { count: view.writtenCount })
    : formatBytes(view.outputBytes ?? 0, locale);

  return (
    <>
      <HiArrowLongRight aria-hidden className="size-3.5 shrink-0" />
      <span className="sr-only">{t("squeezeColOut")}</span>
      <span
        className={cn(
          "num font-semibold",
          stale ? "text-muted-fg" : "text-primary-ink"
        )}
      >
        {output}
      </span>
      {extras.map((extra) => (
        <Fragment key={extra.key}>
          <Dot />
          {extra.node}
        </Fragment>
      ))}
    </>
  );
};

interface MetaProps {
  readonly inputSize: string | null;
  readonly item: BatchItem;
  readonly locale: string;
  readonly multi: boolean;
  readonly stale: boolean;
  readonly view: RowView;
}

/** The input, and once it lands, the output: `PNG · 22.8 KB · 300×300 → 14.3 KB · q95`. */
const RowMeta = ({
  inputSize,
  item,
  locale,
  multi,
  stale,
  view,
}: MetaProps) => {
  const inputFormat = Option.getOrNull(item.format);
  return (
    <p className="text-muted-fg flex flex-wrap items-center gap-x-2 text-xs/5 sm:text-[0.8125rem]/5">
      {inputFormat === null ? null : (
        <>
          <span className={LABEL_CLASS}>{inputFormat}</span>
          <Dot />
        </>
      )}
      <span className="num">{formatBytes(item.size, locale)}</span>
      {inputSize === null ? null : (
        <>
          <Dot />
          <span className="num">{inputSize}</span>
        </>
      )}
      {showsOutputOf(view) ? (
        <RowOutput
          inputFormat={inputFormat}
          inputSize={inputSize}
          locale={locale}
          multi={multi}
          stale={stale}
          view={view}
        />
      ) : null}
    </p>
  );
};

interface RemarksProps {
  readonly locale: string;
  readonly multi: boolean;
  readonly problemFormat: string;
  readonly view: RowView;
}

/** The notes that do not depend on a single note entry. */
const stateRemarksOf = (
  view: RowView,
  multi: boolean,
  t: Translate
): string[] =>
  [
    view.smallestStep === null
      ? null
      : t("squeezeSmallestStep", { step: view.smallestStep }),
    view.state === "miss" ? t("squeezeMissNote") : null,
    view.state === "bigger" ? t("squeezeBiggerNote") : null,
    multi && view.writtenCount < 3
      ? t("squeezeWrittenCount", { count: view.writtenCount })
      : null,
    multi && view.writtenCount === 3 && view.underTargetCount < 3
      ? t("squeezeUnderTargetCount", { count: view.underTargetCount })
      : null,
  ].filter((remark): remark is string => remark !== null);

/** One text per note, minus the growth note the delta stamp already prints. */
const noteRemarksOf = (
  view: RowView,
  locale: string,
  t: Translate
): string[] => {
  const remarks: string[] = [];
  for (const note of view.notes) {
    if (note.kind !== "bigger-than-input") {
      remarks.push(noteText(note, locale, t));
    }
  }
  return remarks;
};

const problemTextOf = (
  view: RowView,
  problemFormat: string,
  t: Translate
): string | null => {
  if (view.problem === null) {
    return null;
  }
  return view.problem === "codec-offline"
    ? t("squeezeProblemCodecOffline", { format: problemFormat })
    : t(problemKey(view.problem));
};

/** The notes, the state note, and the problem: one quiet line, or none. */
const RowRemarks = ({ locale, multi, problemFormat, view }: RemarksProps) => {
  const { t } = useTranslation();
  const problem = problemTextOf(view, problemFormat, t);
  const remarks = [
    ...noteRemarksOf(view, locale, t),
    ...stateRemarksOf(view, multi, t),
  ];

  if (remarks.length === 0 && problem === null) {
    return null;
  }
  return (
    <p className="text-muted-fg mt-1 text-xs/4">
      {problem === null ? null : (
        <span className="text-danger-subtle-fg font-semibold">{problem}</span>
      )}
      {remarks.map((remark, index) => (
        <span key={remark}>
          {index === 0 && problem === null ? null : " · "}
          {remark}
        </span>
      ))}
    </p>
  );
};

interface RecoveryProps {
  readonly id: string;
  readonly onRaiseTarget: () => void;
  readonly onRecompress: (id: string) => void;
  readonly onResize: () => void;
  readonly onTryFormat: () => void;
  readonly online: boolean;
  readonly running: boolean;
  readonly view: RowView;
}

/**
 * The way out a row offers, in place. A Miss names three; a rejected row names
 * the one its problem points at, and no retry that is known to fail.
 */
interface RecoveryContext {
  readonly id: string;
  readonly onRaiseTarget: () => void;
  readonly onRecompress: (id: string) => void;
  readonly onResize: () => void;
  readonly onTryFormat: () => void;
  readonly online: boolean;
  readonly running: boolean;
}

type RecoveryKey =
  | "squeezeActionRaiseTarget"
  | "squeezeActionResize"
  | "squeezeActionTryFormat"
  | "squeezeRetry";

interface RecoveryAction {
  readonly disabled?: (context: RecoveryContext) => boolean;
  readonly intent: "outline" | "plain";
  readonly key: RecoveryKey;
  readonly onPress: (context: RecoveryContext) => void;
  readonly shows: (view: RowView) => boolean;
}

/** The way out a row can offer, in the order the brief names them. */
const RECOVERY_ACTIONS: readonly RecoveryAction[] = [
  {
    intent: "outline",
    key: "squeezeActionRaiseTarget",
    onPress: (context) => {
      context.onRaiseTarget();
    },
    shows: (view) => view.state === "miss",
  },
  {
    intent: "plain",
    key: "squeezeActionResize",
    onPress: (context) => {
      context.onResize();
    },
    shows: (view) => view.state === "miss" || view.problem === "too-large",
  },
  {
    intent: "plain",
    key: "squeezeActionTryFormat",
    onPress: (context) => {
      context.onTryFormat();
    },
    shows: (view) => view.state === "miss" || view.problem === "codec-failed",
  },
  {
    disabled: (context) => !context.online || context.running,
    intent: "outline",
    key: "squeezeRetry",
    onPress: (context) => {
      context.onRecompress(context.id);
    },
    shows: (view) => view.problem === "codec-offline",
  },
];

/**
 * The way out a row offers, in place. A Miss names three; a rejected row names
 * the one its problem points at, and no retry that is known to fail.
 */
const RowRecovery = (props: RecoveryProps) => {
  const { t } = useTranslation();
  const { view } = props;
  const actionable = view.state === "miss" || view.state === "rejected";
  if (!actionable || view.stale) {
    return null;
  }
  const actions = RECOVERY_ACTIONS.filter((action) => action.shows(view));
  return (
    <div className="mt-2 flex flex-wrap items-center gap-1.5">
      {actions.map((action) => (
        <Button
          intent={action.intent}
          isDisabled={action.disabled?.(props)}
          key={action.key}
          onPress={() => {
            action.onPress(props);
          }}
          size="xs"
        >
          {t(action.key)}
        </Button>
      ))}
    </div>
  );
};

interface StatusProps {
  readonly stale: boolean;
  readonly view: RowView;
  readonly working: boolean;
}

/** The delta stamp and the state word. */
const RowStatus = ({ stale, view, working }: StatusProps) => {
  const { t } = useTranslation();
  const settled = view.state !== "working";
  const showsDelta = showsOutputOf(view);
  const word = working
    ? t("squeezeWorking")
    : settled
      ? t(rowStateKey(view.state))
      : t("squeezeStateQueued");

  return (
    <div className="col-start-2 row-start-2 flex items-center gap-x-3 sm:col-start-3 sm:row-start-1 sm:justify-end">
      {showsDelta ? (
        <Badge
          className="num min-w-[4.25rem] justify-center tracking-normal"
          intent={deltaIntent(view.saved, stale)}
        >
          {deltaOf(view.saved)}
        </Badge>
      ) : null}
      <span
        className={cn(
          "flex items-center gap-x-2 sm:min-w-[8.5rem]",
          WORD_CLASS,
          stale || !settled ? "text-muted-fg" : STATE_TONE[view.state]
        )}
      >
        {working ? <Loader aria-label={word} className="size-3.5" /> : null}
        {word}
      </span>
    </div>
  );
};

interface PartsProps {
  readonly id: string;
  readonly locale: string;
  readonly onDownloadPart: (id: string, format: ImageFormat) => void;
  readonly stale: boolean;
  readonly view: RowView;
}

/** Multi: one compact entry per format, each with its own download. */
const RowParts = ({ id, locale, onDownloadPart, stale, view }: PartsProps) => {
  const { t } = useTranslation();
  return (
    <ul
      className={cn(
        "col-span-2 col-start-2 row-start-3 flex flex-wrap gap-x-6 gap-y-1 sm:col-span-3 sm:row-start-2",
        stale && "text-muted-fg"
      )}
    >
      {view.parts.map((part) => (
        <li className="flex items-center gap-x-2 text-xs/5" key={part.format}>
          <span className={LABEL_CLASS}>{part.format}</span>
          <span className="num">
            {part.size === null ? "—" : formatBytes(part.size, locale)}
          </span>
          {part.size === null ? null : (
            <span
              className={cn(
                "num",
                stale || part.saved === 0
                  ? "text-muted-fg"
                  : part.saved > 0
                    ? "text-success-subtle-fg"
                    : "text-warning-subtle-fg"
              )}
            >
              {deltaOf(part.saved)}
            </span>
          )}
          {part.state === "done" ? null : (
            <span
              className={cn(
                LABEL_CLASS,
                stale ? "text-muted-fg" : PART_TONE[part.state]
              )}
            >
              {t(PART_STATE_KEY[part.state])}
            </span>
          )}
          {part.file === null ? null : (
            <Button
              aria-label={`${t("squeezeDownload")} ${part.format.toUpperCase()}`}
              intent="plain"
              onPress={() => {
                onDownloadPart(id, part.format);
              }}
              size="sq-xs"
            >
              <HiArrowDownTray aria-hidden />
            </Button>
          )}
        </li>
      ))}
    </ul>
  );
};

interface ItemRowProps {
  readonly id: string;
  readonly item: BatchItem;
  readonly locale: string;
  readonly onDownload: (id: string) => void;
  readonly onDownloadPart: (id: string, format: ImageFormat) => void;
  readonly onRaiseTarget: () => void;
  readonly onRecompress: (id: string) => void;
  readonly onRemove: (id: string) => void;
  readonly onResize: () => void;
  readonly onTryFormat: () => void;
  readonly online: boolean;
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

/** The file's name, with its folder path when it came from one. */
const RowTitle = ({ item }: { readonly item: BatchItem }) => (
  <p
    className="truncate text-sm/5 font-semibold sm:text-[0.9375rem]/6"
    title={
      item.folderPath === null ? item.name : `${item.folderPath}/${item.name}`
    }
  >
    {item.folderPath === null ? null : (
      <span className="text-muted-fg font-normal">{item.folderPath}/</span>
    )}
    {item.name}
  </p>
);

interface RowActionsProps {
  readonly downloadable: boolean;
  readonly downloadLabel: string;
  readonly id: string;
  readonly itemName: string;
  readonly onDownload: (id: string) => void;
  readonly onRemove: (id: string) => void;
}

/** Download, or its spacer, and Remove. */
const RowActions = (props: RowActionsProps) => {
  const { downloadable, downloadLabel, id, itemName, onDownload, onRemove } =
    props;
  const { t } = useTranslation();
  return (
    <div className="col-start-3 row-start-1 flex items-center gap-x-1.5 sm:col-start-4">
      {downloadable ? (
        <Button
          aria-label={downloadLabel}
          intent="outline"
          onPress={() => {
            onDownload(id);
          }}
          size="sq-xs"
        >
          <HiArrowDownTray aria-hidden />
        </Button>
      ) : (
        // Holds the column, so the state words line up down the Batch.
        <span aria-hidden="true" className="size-8 sm:size-7" />
      )}
      <Button
        aria-label={t("squeezeRemoveFile", { name: itemName })}
        id={`squeeze-remove-${id}`}
        intent="plain"
        onPress={() => {
          onRemove(id);
        }}
        size="sq-xs"
      >
        <HiXMark aria-hidden />
      </Button>
    </div>
  );
};

/**
 * One image of the Batch: the picture, its name, what went in and what came
 * out, the delta stamp, the state word, and two marks. A row offers Download
 * only once there is a file to hand over, so a queued row stays quiet.
 */
const SqueezeItemRowInner = (props: ItemRowProps) => {
  const {
    id,
    item,
    locale,
    onDownload,
    onDownloadPart,
    onRaiseTarget,
    onRecompress,
    onRemove,
    onResize,
    onTryFormat,
    online,
    problemFormat,
    result,
    running,
    stale,
    view: still,
    working,
  } = props;
  const { t } = useTranslation();
  const [inputSize, setInputSize] = useState<string | null>(null);
  const view = still ?? rowViewOf(item, result, stale);
  const multi = view.parts.length > 0;
  const downloadable = view.state !== "working" && view.state !== "rejected";

  return (
    <li
      className={cn(
        "border-border grid grid-cols-[3rem_minmax(0,1fr)_auto] items-start gap-x-3 gap-y-2 border-b-2 px-3 py-3 last:border-b-0",
        "sm:grid-cols-[3.5rem_minmax(0,1fr)_auto_auto] sm:items-center sm:gap-x-5 sm:px-4"
      )}
    >
      <RowThumb item={item} onSize={setInputSize} />

      <div className="col-start-2 row-start-1 min-w-0">
        <RowTitle item={item} />
        <RowMeta
          inputSize={inputSize}
          item={item}
          locale={locale}
          multi={multi}
          stale={stale}
          view={view}
        />
        <RowRemarks
          locale={locale}
          multi={multi}
          problemFormat={problemFormat}
          view={view}
        />
        <RowRecovery
          id={id}
          onRaiseTarget={onRaiseTarget}
          onRecompress={onRecompress}
          onResize={onResize}
          onTryFormat={onTryFormat}
          online={online}
          running={running}
          view={view}
        />
      </div>

      <RowStatus stale={stale} view={view} working={working} />

      <RowActions
        downloadLabel={downloadLabelOf(view, multi, t)}
        downloadable={downloadable}
        id={id}
        itemName={item.name}
        onDownload={onDownload}
        onRemove={onRemove}
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
    </li>
  );
};

/**
 * A row is memoized so one landing result does not re-render the whole Batch:
 * the Batch list reuses each unchanged view, and an unchanged row skips.
 */
export const SqueezeItemRow = memo(SqueezeItemRowInner);
