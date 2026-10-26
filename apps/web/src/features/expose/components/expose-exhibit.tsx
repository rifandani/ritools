/* eslint-disable eslint/complexity, react/iframe-missing-sandbox, jsx-a11y/media-has-caption -- native PDF previews require the browser renderer; user media has no supplied caption track; the preview adds named native controls without autoplay */
"use client";

import { useMemo, useState } from "react";

import {
  ExposeAiCard,
  ExposeThumbnailCard,
} from "@/features/expose/components/expose-evidence";
import { ExposeLocator } from "@/features/expose/components/expose-locator";
import { useObjectUrl } from "@/features/expose/components/use-object-url";
import type { ExposeSource, ReadReport } from "@/features/expose/expose";
import { FORMAT_LABEL } from "@/features/expose/expose";
import { viewerFor, formatBytes } from "@/features/expose/expose.view";
import { useTranslation } from "@/features/i18n/use-translation";

const Fact = ({
  label,
  value,
}: {
  readonly label: string;
  readonly value: string;
}) => (
  <div className="flex min-w-0 flex-col">
    <dt className="text-muted-fg text-xs/5 font-bold tracking-[0.08em] uppercase [font-stretch:87.5%]">
      {label}
    </dt>
    <dd className="num min-w-0 text-sm/5 wrap-anywhere">{value}</dd>
  </div>
);

/** The image itself, or a file-type plate when the browser cannot draw it. */
const ExhibitPreview = ({
  report,
  source,
}: {
  readonly report: ReadReport;
  readonly source: ExposeSource | null;
}) => {
  const { t } = useTranslation();
  const { facts } = report;
  const dngPreview = facts.format === "dng" ? report.thumbnail : null;
  const blob = useMemo(
    () =>
      facts.format === "dng"
        ? dngPreview?.data
        : source?.bytes.slice(0, source.bytes.size, facts.mime),
    [source, facts.mime, facts.format, dngPreview]
  );
  const url = useObjectUrl(blob);
  const coverUrl = useObjectUrl(report.thumbnail?.data);
  const viewer = dngPreview === null ? viewerFor(facts.format) : "image";
  const playable = useMemo(
    () =>
      (viewer !== "video" && viewer !== "audio") ||
      (typeof document !== "undefined" &&
        document.createElement(viewer).canPlayType(facts.mime) !== ""),
    [facts.mime, viewer]
  );
  // The failed decode belongs to one source, so a new file clears it without
  // an effect that would print the old plate for a frame.
  const [failedFor, setFailedFor] = useState<ExposeSource | null>(null);
  const plate =
    viewer === "plate" ||
    failedFor === source ||
    !playable ||
    (viewer === "pdf" &&
      typeof navigator !== "undefined" &&
      navigator.pdfViewerEnabled === false);

  return (
    <div className="border-rule bg-card border-2 p-2">
      {plate ? (
        <div className="border-rule bg-muted flex min-h-56 flex-col items-center justify-center gap-2 border-2 p-6 text-center">
          <p className="font-display text-[clamp(2rem,6vw,3.25rem)] leading-none font-black uppercase [font-stretch:75%]">
            {FORMAT_LABEL[facts.format]}
          </p>
          <p className="num text-sm">
            {facts.width !== null && facts.height !== null
              ? `${facts.width} × ${facts.height}`
              : facts.pageCount === null
                ? facts.parts === null
                  ? formatBytes(facts.bytes, "en-US")
                  : `${t("exposeFactParts")}: ${facts.parts}`
                : `${t("exposeFactPages")}: ${facts.pageCount}`}
          </p>
          <p className="text-muted-fg max-w-[34ch] text-xs/5">
            {t(
              facts.family === "office"
                ? "exposeOfficePropertiesOnly"
                : "exposePreviewUnavailable"
            )}
          </p>
        </div>
      ) : (
        <div className="border-rule bg-muted relative flex min-h-40 items-center justify-center border-2">
          <span className="border-rule bg-card absolute start-2 top-2 border-2 px-1.5 py-0.5 text-xs/4 font-bold tracking-[0.05em] uppercase [font-stretch:87.5%]">
            {dngPreview === null
              ? FORMAT_LABEL[facts.format]
              : t("exposeDngPreview")}
          </span>
          {url === null ? null : viewer === "pdf" ? (
            <iframe
              className="h-[420px] w-full"
              onError={() => setFailedFor(source)}
              src={url}
              title={t("exposePdfPreview")}
            />
          ) : viewer === "video" ? (
            <video
              aria-label={t("exposeVideoPreview")}
              className="max-h-[420px] w-full"
              controls
              onError={() => setFailedFor(source)}
              poster={coverUrl ?? undefined}
              preload="metadata"
              src={url}
            />
          ) : viewer === "audio" ? (
            <div className="flex w-full min-w-0 flex-col gap-3 p-3">
              {coverUrl === null ? null : (
                <img
                  alt={t("exposeCoverArt")}
                  className="max-h-64 w-full object-contain"
                  src={coverUrl}
                />
              )}
              <audio
                aria-label={t("exposeAudioPreview")}
                className="w-full min-w-0"
                controls
                onError={() => setFailedFor(source)}
                preload="metadata"
                src={url}
              />
            </div>
          ) : (
            <img
              alt={t(
                dngPreview === null ? "exposePreviewAlt" : "exposeDngPreview"
              )}
              className="max-h-[420px] w-full object-contain"
              height={
                dngPreview === null ? (facts.height ?? undefined) : undefined
              }
              onError={() => {
                setFailedFor(source);
              }}
              src={url}
              width={
                dngPreview === null ? (facts.width ?? undefined) : undefined
              }
            />
          )}
        </div>
      )}
    </div>
  );
};

/**
 * The exhibit: the image as evidence, its facts, the embedded thumbnail, the
 * AI Provenance, and the Offline Locator. Everything here is a fact about the
 * file, not a group the Clean removes.
 */
export const ExposeExhibit = ({
  locale,
  report,
  source,
}: {
  readonly locale: string;
  readonly report: ReadReport;
  readonly source: ExposeSource | null;
}) => {
  const { t } = useTranslation();
  const { facts } = report;

  const codec = report.fields.find(
    (field) =>
      field.group === "display" &&
      /^(?:Compressor ID|Compressor Name|Codec ID|Audio Format|Audio Codec ID)$/u.test(
        field.label
      )
  )?.value;
  return (
    <div className="flex flex-col gap-4">
      <ExhibitPreview report={report} source={source} />

      <dl className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-3">
        <Fact
          label={t("exposeFactDimensions")}
          value={
            facts.width === null || facts.height === null
              ? t("exposeFactNotReported")
              : `${facts.width} × ${facts.height}`
          }
        />
        <Fact
          label={t("exposeFactSize")}
          value={formatBytes(facts.bytes, locale)}
        />
        <Fact
          label={t("exposeFactFormat")}
          value={FORMAT_LABEL[facts.format]}
        />
        <Fact
          label={t("exposeFactOrientation")}
          value={String(facts.orientation)}
        />
        <Fact
          label={t("exposeFactFrames")}
          value={
            facts.frames === null
              ? t("exposeFactNotReported")
              : String(facts.frames)
          }
        />
        <Fact
          label={t("exposeFactFamily")}
          value={t(
            (
              {
                image: "exposeFamilyImage",
                raw: "exposeFamilyRaw",
                document: "exposeFamilyDocument",
                video: "exposeFamilyVideo",
                audio: "exposeFamilyAudio",
                office: "exposeFamilyOffice",
              } as const
            )[facts.family]
          )}
        />
        {facts.durationSeconds === null ? null : (
          <Fact
            label={t("exposeFactDuration")}
            value={`${facts.durationSeconds} s`}
          />
        )}
        {facts.pageCount === null ? null : (
          <Fact label={t("exposeFactPages")} value={String(facts.pageCount)} />
        )}
        {facts.sampleRate === null ? null : (
          <Fact
            label={t("exposeFactSampleRate")}
            value={`${facts.sampleRate} Hz`}
          />
        )}
        {facts.channels === null ? null : (
          <Fact
            label={t("exposeFactChannels")}
            value={String(facts.channels)}
          />
        )}
        {facts.family === "video" || facts.family === "audio" ? (
          <Fact
            label={t("exposeFactCodec")}
            value={codec ?? t("exposeFactNotReported")}
          />
        ) : null}
        {facts.parts === null ? null : (
          <Fact label={t("exposeFactParts")} value={String(facts.parts)} />
        )}
      </dl>

      <ExposeThumbnailCard locale={locale} thumbnail={report.thumbnail} />
      <ExposeAiCard
        ai={report.ai}
        locale={locale}
        c2paScan={
          facts.family === "document" || facts.family === "office"
            ? "unsupported"
            : "supported"
        }
      />
      <ExposeLocator gps={report.gps} />
    </div>
  );
};
