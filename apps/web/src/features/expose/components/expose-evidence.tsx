"use client";

import { useId } from "react";
import { HiClipboard } from "react-icons/hi2";

import { Badge } from "@/core/components/ui/badge";
import { Button } from "@/core/components/ui/button";
import { useObjectUrl } from "@/features/expose/components/expose-blob-url";
import { copyText } from "@/features/expose/components/expose-copy";
import { LongValue } from "@/features/expose/components/expose-long-value";
import type { AiProvenance, Thumbnail } from "@/features/expose/expose";
import { formatBytes } from "@/features/expose/expose.view";
import { useTranslation } from "@/features/i18n/use-translation";

const Label = ({ children }: { readonly children: string }) => (
  <dt className="text-muted-fg text-[0.75rem] font-bold tracking-[0.08em] uppercase [font-stretch:87.5%]">
    {children}
  </dt>
);

/**
 * The AI evidence: presence and size first, then what the manifest claims.
 * The card never prints "valid" or "authentic", and it never decides whether
 * the pixels were generated.
 */
export const ExposeAiCard = ({
  ai,
  locale,
}: {
  readonly ai: AiProvenance;
  readonly locale: string;
}) => {
  const { t } = useTranslation();
  const { c2pa } = ai;
  const hasEvidence =
    c2pa !== null ||
    ai.digitalSourceTypes.length > 0 ||
    ai.generationParameters.length > 0 ||
    ai.signals.length > 0;

  return (
    <section
      aria-labelledby="expose-ai-title"
      className="border-rule bg-card flex flex-col gap-3 border-2 p-4"
    >
      <div className="flex items-center gap-2">
        <span
          aria-hidden="true"
          className="border-rule grid size-6 shrink-0 place-content-center border-2 text-xs font-black tracking-[0.04em]"
        >
          AI
        </span>
        <h3
          className="font-display text-base/5 font-extrabold uppercase [font-stretch:75%]"
          id="expose-ai-title"
        >
          {t("exposeAiTitle")}
        </h3>
      </div>

      {hasEvidence ? null : (
        <p className="text-muted-fg text-sm/6">{t("exposeAiNone")}</p>
      )}

      {c2pa === null ? (
        <p className="text-sm/6">
          <span className="text-[0.75rem] font-bold tracking-[0.08em] uppercase [font-stretch:87.5%]">
            {t("exposeAiC2pa")}
          </span>{" "}
          · {t("exposeAiC2paAbsent")}
        </p>
      ) : (
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
          <span className="text-[0.75rem] font-bold tracking-[0.08em] uppercase [font-stretch:87.5%]">
            {t("exposeAiC2pa")}
          </span>
          <span className="text-sm/6">
            {t("exposeAiC2paPresent", {
              size: formatBytes(c2pa.bytes, locale),
            })}
          </span>
        </div>
      )}

      {c2pa === null ? null : (
        <dl className="grid grid-cols-1 gap-x-3 gap-y-2 text-sm/6">
          {c2pa.claimGenerator === null ? null : (
            <>
              <Label>{t("exposeAiGenerator")}</Label>
              <dd>
                <LongValue value={c2pa.claimGenerator} />
              </dd>
            </>
          )}
          {c2pa.claimedSigner === null ? null : (
            <>
              <Label>{t("exposeAiSigner")}</Label>
              <dd>
                <LongValue value={c2pa.claimedSigner} />
              </dd>
            </>
          )}
          {ai.digitalSourceTypes.length === 0 ? null : (
            <>
              <Label>{t("exposeAiSourceType")}</Label>
              <dd>{ai.digitalSourceTypes.join(", ")}</dd>
            </>
          )}
          {ai.generationParameters.length === 0 ? null : (
            <>
              <Label>{t("exposeAiParameters")}</Label>
              <dd>
                <dl className="border-rule divide-rule divide-y-2 border-y-2">
                  {ai.generationParameters.map((parameter) => (
                    <div
                      className="grid grid-cols-1 gap-x-2 py-1.5 sm:grid-cols-[minmax(0,10rem)_minmax(0,1fr)_auto]"
                      key={`${parameter.label}:${parameter.value}`}
                    >
                      <dt className="text-muted-fg text-xs/5">
                        {parameter.label}
                      </dt>
                      <dd className="min-w-0 text-sm/6">
                        <LongValue value={parameter.value} />
                      </dd>
                      <dd>
                        <Button
                          intent="plain"
                          onPress={() => {
                            copyText(parameter.value, t("exposeCopied"));
                          }}
                          size="sq-xs"
                        >
                          <HiClipboard aria-hidden="true" />
                          <span className="sr-only">{t("exposeCopy")}</span>
                        </Button>
                      </dd>
                    </div>
                  ))}
                </dl>
              </dd>
            </>
          )}
          {ai.signals.length === 0 ? null : (
            <>
              <Label>{t("exposeAiSignal")}</Label>
              <dd>
                <ul className="flex flex-col gap-1">
                  {ai.signals.map((signal) => (
                    <li
                      className="flex min-w-0 flex-wrap items-baseline gap-x-2"
                      key={`${signal.container}:${signal.label}:${signal.value}`}
                    >
                      <Badge className="shrink-0" intent="outline">
                        {signal.label}
                      </Badge>
                      <span className="min-w-0">
                        <LongValue value={signal.value} />
                      </span>
                    </li>
                  ))}
                </ul>
              </dd>
            </>
          )}
        </dl>
      )}

      {c2pa?.hasThumbnail === true ? (
        <p className="text-muted-fg text-xs/5">{t("exposeAiThumbnail")}</p>
      ) : null}

      {hasEvidence ? (
        <p className="border-rule text-muted-fg border-t-2 pt-2 text-xs/5">
          {t("exposeAiNotValidated")}
        </p>
      ) : null}
    </section>
  );
};

const SOURCE_LABEL = {
  c2pa: "C2PA",
  exif: "EXIF",
  mpf: "MPF",
} as const;

/** The embedded preview, always with the warning that it can show the original. */
export const ExposeThumbnailCard = ({
  locale,
  thumbnail,
}: {
  readonly locale: string;
  readonly thumbnail: Thumbnail | null;
}) => {
  const { t } = useTranslation();
  const url = useObjectUrl(thumbnail?.data);
  const titleId = useId();

  return (
    <section
      aria-labelledby={titleId}
      className="border-rule bg-card flex flex-col gap-3 border-2 p-4"
    >
      <div className="flex items-baseline justify-between gap-3">
        <h3
          className="text-[0.75rem] font-bold tracking-[0.08em] uppercase [font-stretch:87.5%]"
          id={titleId}
        >
          {t("exposeThumbnailTitle")}
        </h3>
        {thumbnail === null ? null : (
          <span className="num text-xs">{SOURCE_LABEL[thumbnail.source]}</span>
        )}
      </div>

      {thumbnail === null ? (
        <p className="text-muted-fg text-sm/6">{t("exposeThumbnailNone")}</p>
      ) : (
        <>
          <div className="border-rule bg-muted flex min-h-24 items-center justify-center border-2">
            {url === null ? null : (
              <img
                alt={t("exposeThumbnailAlt")}
                className="max-h-[12rem] w-full object-contain"
                height={thumbnail.height}
                src={url}
                width={thumbnail.width}
              />
            )}
          </div>
          <p className="num text-xs">
            {t("exposeThumbnailSize", {
              height: String(thumbnail.height),
              width: String(thumbnail.width),
            })}{" "}
            · {formatBytes(thumbnail.bytes, locale)}
          </p>
        </>
      )}

      <p className="text-muted-fg text-xs/5">{t("exposeThumbnailWarning")}</p>
    </section>
  );
};
