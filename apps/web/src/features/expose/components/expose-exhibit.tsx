"use client";

import { useState } from "react";

import { Badge } from "@/core/components/ui/badge";
import { useObjectUrl } from "@/features/expose/components/expose-blob-url";
import {
  ExposeAiCard,
  ExposeThumbnailCard,
} from "@/features/expose/components/expose-evidence";
import { ExposeLocator } from "@/features/expose/components/expose-locator";
import type { ExposeSource, ReadReport } from "@/features/expose/expose";
import { FORMAT_LABEL } from "@/features/expose/expose";
import { canPreview, formatBytes } from "@/features/expose/expose.view";
import type { SampleName } from "@/features/expose/use-expose";
import { useTranslation } from "@/features/i18n/use-translation";

const SAMPLE_LINE = {
  ai: "exposeSampleAiLine",
  camera: "exposeSampleCameraLine",
} as const;

const Fact = ({
  label,
  value,
}: {
  readonly label: string;
  readonly value: string;
}) => (
  <div className="flex flex-col">
    <dt className="text-muted-fg text-xs/5 font-bold tracking-[0.08em] uppercase [font-stretch:87.5%]">
      {label}
    </dt>
    <dd className="num text-sm/5">{value}</dd>
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
  const url = useObjectUrl(source?.bytes);
  // The failed decode belongs to one source, so a new file clears it without
  // an effect that would print the old plate for a frame.
  const [failedFor, setFailedFor] = useState<ExposeSource | null>(null);
  const plate = !canPreview(facts.format) || failedFor === source;

  return (
    <div className="border-rule bg-card border-2 p-2">
      {plate ? (
        <div className="border-rule bg-muted flex min-h-56 flex-col items-center justify-center gap-2 border-2 p-6 text-center">
          <p className="font-display text-[clamp(2rem,6vw,3.25rem)] leading-none font-black uppercase [font-stretch:75%]">
            {FORMAT_LABEL[facts.format]}
          </p>
          <p className="num text-sm">
            {facts.width} × {facts.height}
          </p>
          <p className="text-muted-fg max-w-[34ch] text-xs/5">
            {t("exposePlateBody")}
          </p>
        </div>
      ) : (
        <div className="border-rule bg-muted relative flex min-h-40 items-center justify-center border-2">
          <span className="border-rule bg-card absolute start-2 top-2 border-2 px-1.5 py-0.5 text-xs/4 font-bold tracking-[0.05em] uppercase [font-stretch:87.5%]">
            {FORMAT_LABEL[facts.format]}
          </span>
          {url === null ? null : (
            <img
              alt={t("exposePreviewAlt")}
              className="max-h-[420px] w-full object-contain"
              height={facts.height}
              onError={() => {
                setFailedFor(source);
              }}
              src={url}
              width={facts.width}
            />
          )}
        </div>
      )}
    </div>
  );
};

/**
 * The exhibit: the image as evidence, its facts, the Offline Locator, the AI
 * Provenance, and the embedded thumbnail. Everything here is a fact about the
 * file, not a group the Clean removes.
 */
export const ExposeExhibit = ({
  locale,
  report,
  sample,
  source,
}: {
  readonly locale: string;
  readonly report: ReadReport;
  readonly sample: SampleName | null;
  readonly source: ExposeSource | null;
}) => {
  const { t } = useTranslation();
  const { facts } = report;

  return (
    <div className="flex flex-col gap-4">
      {sample === null ? null : (
        <div className="flex flex-col gap-2">
          <Badge className="self-start" intent="primary">
            {t("exposeSampleBadge")}
          </Badge>
          <details className="border-rule bg-card border-2 px-4 py-3">
            <summary className="cursor-pointer text-[0.75rem] font-bold tracking-[0.08em] uppercase [font-stretch:87.5%]">
              {t("exposeSampleAbout")}
            </summary>
            <p className="text-muted-fg mt-2 text-xs/5">
              {t(SAMPLE_LINE[sample])}
            </p>
          </details>
        </div>
      )}

      <ExhibitPreview report={report} source={source} />

      <dl className="border-rule grid grid-cols-2 gap-x-4 gap-y-3 border-t-2 pt-3 sm:grid-cols-3">
        <Fact
          label={t("exposeFactDimensions")}
          value={`${facts.width} × ${facts.height}`}
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
      </dl>

      <ExposeLocator gps={report.gps} />
      <ExposeAiCard ai={report.ai} locale={locale} />
      <ExposeThumbnailCard locale={locale} thumbnail={report.thumbnail} />
    </div>
  );
};
