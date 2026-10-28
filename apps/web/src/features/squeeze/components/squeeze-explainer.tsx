"use client";

import {
  Disclosure,
  DisclosureGroup,
  DisclosurePanel,
  DisclosureTrigger,
} from "@/core/components/ui/disclosure-group";
import { Note } from "@/core/components/ui/note";
import { Ransom } from "@/core/components/ui/ransom";
import { useTranslation } from "@/features/i18n/use-translation";
import { SqueezeComparison } from "@/features/squeeze/components/squeeze-comparison";

const FAQ = [
  ["squeezeFaqFormatsQ", "squeezeFaqFormatsA"],
  ["squeezeFaqPngQ", "squeezeFaqPngA"],
  ["squeezeFaqMissQ", "squeezeFaqMissA"],
  ["squeezeFaqAvifQ", "squeezeFaqAvifA"],
  ["squeezeFaqCountQ", "squeezeFaqCountA"],
  ["squeezeFaqExifQ", "squeezeFaqExifA"],
  ["squeezeFaqGifQ", "squeezeFaqGifA"],
  ["squeezeFaqReloadQ", "squeezeFaqReloadA"],
] as const;

/**
 * Below the Tool: what Squeeze is, how it compares,
 * and the answers a person needs before they trust the Batch. Ritools copy only.
 */
export const SqueezeExplainer = () => {
  const { t } = useTranslation();

  return (
    <section className="border-rule border-t-[3px] pt-8">
      <h2 className="font-display text-[clamp(2rem,6vw,3.25rem)] leading-none font-black tracking-[0.01em] uppercase [font-stretch:75%]">
        {t("squeezeAltTitleLead")}{" "}
        <Ransom as="span">{t("squeezeAltTitleAccent")}</Ransom>{" "}
        {t("squeezeAltTitleBridge")}{" "}
        <span className="text-primary-ink">{t("squeezeAltTitleTail")}</span>
      </h2>
      <p className="text-muted-fg mt-4 text-base/6">{t("squeezeAltLead")}</p>
      <p className="text-muted-fg mt-4 text-base/6">{t("squeezeAltBody")}</p>

      <SqueezeComparison />

      <Note className="mt-12" intent="warning">
        <h3 className="font-display text-base/5 font-extrabold uppercase [font-stretch:75%]">
          {t("squeezeHonestyTitle")}
        </h3>
        <p className="mt-2 text-sm/6">{t("squeezeHonestyBody")}</p>
      </Note>

      <h3 className="border-rule mt-12 border-b-2 pb-1.5 text-[0.75rem] font-bold tracking-[0.08em] uppercase [font-stretch:87.5%]">
        {t("squeezeFaqHeading")}
      </h3>
      <DisclosureGroup className="mt-4">
        {FAQ.map(([question, answer]) => (
          <Disclosure id={question} key={question}>
            <DisclosureTrigger>{t(question)}</DisclosureTrigger>
            <DisclosurePanel>
              <p>{t(answer)}</p>
            </DisclosurePanel>
          </Disclosure>
        ))}
      </DisclosureGroup>

      <h3 className="border-rule mt-12 border-b-2 pb-1.5 text-[0.75rem] font-bold tracking-[0.08em] uppercase [font-stretch:87.5%]">
        {t("squeezeDisclaimerHeading")}
      </h3>
      <p className="text-muted-fg mt-4 font-mono text-xs/6">
        {t("squeezeDisclaimer")}
      </p>
    </section>
  );
};
