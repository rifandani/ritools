"use client";

import {
  HiArrowDownTray,
  HiArrowPath,
  HiCheck,
  HiStop,
  HiXMark,
} from "react-icons/hi2";

import { Badge } from "@/core/components/ui/badge";
import { Button } from "@/core/components/ui/button";
import { Note } from "@/core/components/ui/note";
import {
  ProgressBar,
  ProgressBarHeader,
  ProgressBarTrack,
  ProgressBarValue,
} from "@/core/components/ui/progress-bar";
import { formatBytes } from "@/core/utils/file-size";
import {
  formatDuration,
  MEMORY_WARN_BYTES,
  relayUrlOf,
} from "@/features/snag/snag";
import type {
  RefusalReason,
  SaveOption,
  SnagStream,
} from "@/features/snag/snag";
import { qualityOf } from "@/features/snag/snag.agent";
import { canSaveToDisk } from "@/features/snag/snag.save";
import type {
  SaveState,
  SnagCard,
  SnagController,
} from "@/features/snag/use-snag";

type T = SnagController["t"];

const REFUSAL_KEY = {
  "age-restricted": "snagRefusedAgeRestricted",
  "host-refused": "snagRefusedHostRefused",
  live: "snagRefusedLive",
  "members-only": "snagRefusedMembersOnly",
  "not-found": "snagRefusedNotFound",
  private: "snagRefusedPrivate",
  unplayable: "snagRefusedUnplayable",
  unreachable: "snagRefusedUnreachable",
} as const satisfies Record<RefusalReason, string>;

const FAILURE_KEY = {
  expired: "snagFailExpired",
  "host-refused": "snagFailHostRefused",
  library: "snagFailLibrary",
  network: "snagFailNetwork",
  unreadable: "snagFailUnreadable",
  "write-failed": "snagFailWriteFailed",
} as const satisfies Record<
  Extract<SaveState, { status: "failed" }>["reason"],
  string
>;

const CODEC_NAME: Readonly<Record<SnagStream["codec"], string>> = {
  aac: "AAC",
  av1: "AV1",
  avc: "H.264",
  vp9: "VP9",
};

const FORMAT: Readonly<
  Record<Exclude<SaveOption["kind"], "thumbnail">, string>
> = { m4a: "M4A", mp3: "MP3", video: "MP4" };

const formatOf = (option: SaveOption, t: T): string =>
  option.kind === "thumbnail" ? t("snagFormatThumbnail") : FORMAT[option.kind];

const codecOf = (option: SaveOption): string => {
  if (option.kind === "video") {
    return `${CODEC_NAME[option.video.codec]} + AAC`;
  }
  if (option.kind === "thumbnail") {
    return "—";
  }
  return option.kind === "mp3" ? "MP3" : "AAC";
};

const sizeOf = (option: SaveOption, locale: string, t: T): string => {
  if (option.kind === "thumbnail") {
    return "—";
  }
  const size = formatBytes(option.bytes, locale);
  return option.kind === "mp3" ? t("snagSizeEstimate", { size }) : size;
};

const ProgressOf = ({
  label,
  locale,
  state,
  t,
}: {
  readonly label: string;
  readonly locale: string;
  readonly state: Extract<SaveState, { status: "saving" }>;
  readonly t: T;
}) => {
  const { progress } = state;
  const value =
    progress.phase === "fetching"
      ? Math.round((progress.received / Math.max(1, progress.total)) * 100)
      : progress.phase === "encoding"
        ? Math.round(progress.fraction * 100)
        : undefined;
  const text =
    progress.phase === "fetching"
      ? t("snagPhaseFetching", {
          received: formatBytes(progress.received, locale),
          total: formatBytes(progress.total, locale),
        })
      : progress.phase === "encoding"
        ? t("snagPhaseEncoding")
        : t("snagPhaseMuxing");
  return (
    <ProgressBar
      aria-label={label}
      className="min-w-[10rem]"
      isIndeterminate={value === undefined}
      value={value}
    >
      <ProgressBarHeader>
        <span className="text-xs/5">{text}</span>
        {value === undefined ? null : <ProgressBarValue />}
      </ProgressBarHeader>
      <ProgressBarTrack />
    </ProgressBar>
  );
};

const SAVE_ICON = {
  done: HiCheck,
  failed: HiArrowPath,
} as const;

const SAVE_LABEL = {
  done: "snagSaved",
  failed: "snagRetry",
} as const;

/** The line under the action: a failure, a cancel, or the memory warning. */
const SaveNote = ({
  memoryWarn,
  state,
  t,
}: {
  readonly memoryWarn: boolean;
  readonly state: SaveState | undefined;
  readonly t: T;
}) => {
  if (state?.status === "failed") {
    return (
      <p className="text-danger-subtle-fg max-w-[22rem] text-end text-xs/5">
        {t(FAILURE_KEY[state.reason])}
      </p>
    );
  }
  if (state?.status === "cancelled") {
    return <p className="text-muted-fg text-xs/5">{t("snagCancelled")}</p>;
  }
  return memoryWarn ? (
    <p className="text-warning-subtle-fg max-w-[22rem] text-end text-xs/5">
      {t("snagMemoryWarning")}
    </p>
  ) : null;
};

/** The save column: Download, or progress and Cancel while it runs. */
const SaveCell = ({
  card,
  controller,
  option,
  optionName,
}: {
  readonly card: SnagCard;
  readonly controller: SnagController;
  readonly option: SaveOption;
  readonly optionName: string;
}) => {
  const { cancel, locale, save, t } = controller;
  const state = card.saves.get(option.id);
  const memoryWarn =
    option.kind !== "thumbnail" &&
    option.bytes > MEMORY_WARN_BYTES &&
    !canSaveToDisk();
  const settled =
    state?.status === "done" || state?.status === "failed"
      ? state.status
      : null;
  const Icon = settled === null ? HiArrowDownTray : SAVE_ICON[settled];

  return (
    <div className="flex flex-col items-end gap-1">
      {state?.status === "saving" ? (
        <div className="flex w-full items-center justify-end gap-2">
          <ProgressOf
            label={t("snagSavingAnnouncement", { name: optionName })}
            locale={locale}
            state={state}
            t={t}
          />
          <Button
            aria-label={t("snagCancelLabel", { option: optionName })}
            intent="outline"
            onPress={() => {
              cancel(card.key, option.id);
            }}
            size="sm"
          >
            <HiStop aria-hidden />
            {t("snagCancel")}
          </Button>
        </div>
      ) : (
        <Button
          aria-label={t("snagDownloadLabel", { option: optionName })}
          intent={settled === "done" ? "outline" : "primary"}
          onPress={() => {
            void save(card.key, option.id);
          }}
          size="sm"
        >
          <Icon aria-hidden />
          {t(settled === null ? "snagDownload" : SAVE_LABEL[settled])}
        </Button>
      )}
      <SaveNote memoryWarn={memoryWarn} state={state} t={t} />
    </div>
  );
};

const OptionRow = ({
  card,
  controller,
  option,
}: {
  readonly card: SnagCard;
  readonly controller: SnagController;
  readonly option: SaveOption;
}) => {
  const { locale, t } = controller;
  const format = formatOf(option, t);
  const quality = qualityOf(option);

  return (
    <tr className="align-middle">
      <th
        className="border-rule border-b-2 p-2 text-start font-bold"
        scope="row"
      >
        {format}
      </th>
      <td className="num border-rule border-b-2 p-2">{quality}</td>
      <td className="border-rule border-b-2 p-2">
        <span className="inline-flex flex-wrap items-center gap-2">
          {codecOf(option)}
          {option.kind === "mp3" ? (
            <Badge intent="warning">{t("snagReencoded")}</Badge>
          ) : null}
        </span>
      </td>
      <td className="num border-rule border-b-2 p-2 text-end">
        {sizeOf(option, locale, t)}
      </td>
      <td className="border-rule border-b-2 p-2">
        <SaveCell
          card={card}
          controller={controller}
          option={option}
          optionName={`${format} ${quality}`}
        />
      </td>
    </tr>
  );
};

/** One submitted Video Link: the video, then its Save Options. */
export const SnagVideoCard = ({
  card,
  controller,
}: {
  readonly card: SnagCard;
  readonly controller: SnagController;
}) => {
  const { remove, t } = controller;
  const { state } = card;
  const video = state.status === "ready" ? state.video : null;
  const headingId = `${card.key}-title`;

  return (
    <article
      aria-busy={state.status === "reading"}
      aria-labelledby={headingId}
      className="border-rule flex min-w-0 flex-col gap-4 border-2 p-3 sm:p-4"
    >
      <header className="flex min-w-0 items-start gap-3 sm:gap-4">
        {video?.thumbnail ? (
          <img
            alt=""
            className="border-rule aspect-video w-28 shrink-0 border-2 object-cover sm:w-44"
            decoding="async"
            loading="lazy"
            src={relayUrlOf(video.thumbnail)}
          />
        ) : (
          <span
            aria-hidden="true"
            className="border-rule bg-muted aspect-video w-28 shrink-0 border-2 sm:w-44"
          />
        )}
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <h3 className="text-base/6 font-extrabold break-words" id={headingId}>
            {video === null
              ? state.status === "reading"
                ? t("snagReading")
                : t("snagRefusedTitle")
              : video.title || video.id}
          </h3>
          {video === null ? (
            <p className="num text-muted-fg text-xs/5">{card.id}</p>
          ) : (
            <p className="text-muted-fg text-sm/6">
              {video.channel === ""
                ? formatDuration(video.seconds)
                : t("snagChannelDuration", {
                    channel: video.channel,
                    duration: formatDuration(video.seconds),
                  })}
            </p>
          )}
        </div>
        <Button
          aria-label={t("snagRemoveLabel")}
          intent="plain"
          onPress={() => {
            remove(card.key);
          }}
          size="sq-sm"
        >
          <HiXMark aria-hidden />
        </Button>
      </header>

      {state.status === "reading" ? (
        <ProgressBar aria-label={t("snagReading")} isIndeterminate>
          <ProgressBarTrack />
        </ProgressBar>
      ) : null}

      {state.status === "refused" ? (
        <Note intent="danger">
          <p className="text-sm/6">{t(REFUSAL_KEY[state.reason])}</p>
        </Note>
      ) : null}

      {state.status === "ready" ? (
        <div className="overflow-x-auto">
          <table className="border-rule w-full min-w-[40rem] border-2 text-sm/6">
            <caption className="sr-only">
              {t("snagOptionsCaption", { title: state.video.title })}
            </caption>
            <thead>
              <tr className="text-[0.75rem] font-bold tracking-[0.08em] uppercase [font-stretch:87.5%]">
                <th
                  className="border-rule border-b-2 p-2 text-start"
                  scope="col"
                >
                  {t("snagColFormat")}
                </th>
                <th
                  className="border-rule border-b-2 p-2 text-start"
                  scope="col"
                >
                  {t("snagColQuality")}
                </th>
                <th
                  className="border-rule border-b-2 p-2 text-start"
                  scope="col"
                >
                  {t("snagColCodec")}
                </th>
                <th className="border-rule border-b-2 p-2 text-end" scope="col">
                  {t("snagColSize")}
                </th>
                <th className="border-rule border-b-2 p-2 text-end" scope="col">
                  {t("snagColSave")}
                </th>
              </tr>
            </thead>
            <tbody>
              {state.options.map((option) => (
                <OptionRow
                  card={card}
                  controller={controller}
                  key={option.id}
                  option={option}
                />
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </article>
  );
};
