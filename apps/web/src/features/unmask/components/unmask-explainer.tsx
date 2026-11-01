"use client";

import { Ransom } from "@/core/components/ui/ransom";
import { useTranslation } from "@/features/i18n/use-translation";
import { UnmaskComparison } from "@/features/unmask/components/unmask-comparison";

const FAQ = [
  ["unmaskFaqMatteQuestion", "unmaskFaqMatteAnswer"],
  ["unmaskFaqHairQuestion", "unmaskFaqHairAnswer"],
  ["unmaskFaqWatermarkQuestion", "unmaskFaqWatermarkAnswer"],
  ["unmaskFaqLocalQuestion", "unmaskFaqLocalAnswer"],
] as const;

const BLOCKS = [
  ["unmaskHonestyTitle", "unmaskHonestyBody"],
  ["unmaskExplainerWhatTitle", "unmaskExplainerWhatBody"],
  ["unmaskExplainerMatteTitle", "unmaskExplainerMatteBody"],
  ["unmaskExplainerBrushTitle", "unmaskExplainerBrushBody"],
  ["unmaskExplainerFeatherTitle", "unmaskExplainerFeatherBody"],
  ["unmaskExplainerLimitsTitle", "unmaskExplainerLimitsBody"],
  ["unmaskExplainerBackdropTitle", "unmaskExplainerBackdropBody"],
  ["unmaskExplainerLocalTitle", "unmaskExplainerLocalBody"],
] as const;

/** Below the Tool: what a Cutout is, what the Matte is, and the limits. */
export const UnmaskExplainer = () => {
  const { t } = useTranslation();
  return (
    <section
      aria-labelledby="unmask-explainer-heading"
      className="border-rule border-t-[3px] pt-8"
    >
      <h2 className="font-display text-[clamp(2rem,6vw,3.25rem)] leading-none font-black tracking-[0.01em] uppercase [font-stretch:75%]">
        <Ransom as="span">{t("unmaskName")}</Ransom> {t("unmaskExplainerTitle")}
      </h2>
      <div className="mt-6 grid gap-x-8 gap-y-6 sm:grid-cols-2">
        {BLOCKS.map(([title, body], index) => (
          <section
            className={index === 0 ? "sm:col-span-2" : undefined}
            key={title}
          >
            <h3 className="text-lg leading-6 font-bold">{t(title)}</h3>
            <p className="text-muted-fg mt-1 max-w-[68ch] text-[0.9375rem] leading-[1.625rem]">
              {t(body)}
            </p>
          </section>
        ))}
      </div>
      <UnmaskComparison />
      <section aria-labelledby="unmask-faq-heading" className="mt-12">
        <h3
          className="font-display text-[clamp(1.5rem,4vw,2.25rem)] leading-none font-black tracking-[0.01em] uppercase [font-stretch:75%]"
          id="unmask-faq-heading"
        >
          {t("unmaskFaqTitle")}
        </h3>
        <dl className="mt-4 grid gap-x-8 gap-y-4 sm:grid-cols-2">
          {FAQ.map(([question, answer]) => (
            <div key={question}>
              <dt className="text-sm font-bold">{t(question)}</dt>
              <dd className="text-muted-fg mt-1 max-w-[62ch] text-sm/6">
                {t(answer)}
              </dd>
            </div>
          ))}
        </dl>
      </section>
    </section>
  );
};
