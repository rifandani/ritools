"use client";

import {
  Disclosure,
  DisclosureGroup,
  DisclosurePanel,
  DisclosureTrigger,
} from "@/core/components/ui/disclosure-group";
import { useTranslation } from "@/features/i18n/use-translation";

const USE_CASES = [
  ["squeezeCaseSiteTitle", "squeezeCaseSiteBody"],
  ["squeezeCaseFormTitle", "squeezeCaseFormBody"],
  ["squeezeCaseInboxTitle", "squeezeCaseInboxBody"],
] as const;

const FAQ = [
  ["squeezeFaqFreeQ", "squeezeFaqFreeA"],
  ["squeezeFaqDeviceQ", "squeezeFaqDeviceA"],
  ["squeezeFaqFormatsQ", "squeezeFaqFormatsA"],
  ["squeezeFaqPngQ", "squeezeFaqPngA"],
  ["squeezeFaqMissQ", "squeezeFaqMissA"],
  ["squeezeFaqOfflineQ", "squeezeFaqOfflineA"],
  ["squeezeFaqAvifQ", "squeezeFaqAvifA"],
  ["squeezeFaqCountQ", "squeezeFaqCountA"],
  ["squeezeFaqExifQ", "squeezeFaqExifA"],
  ["squeezeFaqGifQ", "squeezeFaqGifA"],
  ["squeezeFaqReloadQ", "squeezeFaqReloadA"],
] as const;

/**
 * Below the Tool: why a Target beats a slider, three real jobs, and the
 * answers a person needs before they trust the Batch. Ritools copy only.
 */
export const SqueezeExplainer = () => {
  const { t } = useTranslation();

  return (
    <section className="border-rule border-t-[3px] pt-8">
      <h2 className="font-display text-[clamp(2rem,6vw,3.25rem)] leading-none font-black tracking-[0.01em] uppercase [font-stretch:75%]">
        {t("squeezeWhyTitle")}
      </h2>
      <p className="text-muted-fg mt-4 max-w-[58ch] text-base/6">
        {t("squeezeWhyLead")}
      </p>

      <ul className="border-rule divide-rule mt-8 grid divide-y-2 border-2 sm:grid-cols-3 sm:divide-x-2 sm:divide-y-0">
        {USE_CASES.map(([title, body]) => (
          <li className="flex flex-col gap-y-2 p-4 sm:p-5" key={title}>
            <h3 className="font-display text-lg leading-6 font-extrabold tracking-[0.02em] uppercase [font-stretch:75%]">
              {t(title)}
            </h3>
            <p className="text-muted-fg text-sm/6">{t(body)}</p>
          </li>
        ))}
      </ul>

      <h3 className="border-rule mt-12 border-b-2 pb-1.5 text-[0.75rem] font-bold tracking-[0.08em] uppercase [font-stretch:87.5%]">
        {t("squeezeFaqHeading")}
      </h3>
      <DisclosureGroup className="mt-4">
        {FAQ.map(([question, answer]) => (
          <Disclosure id={question} key={question}>
            <DisclosureTrigger>{t(question)}</DisclosureTrigger>
            <DisclosurePanel>
              <p className="max-w-[72ch]">{t(answer)}</p>
            </DisclosurePanel>
          </Disclosure>
        ))}
      </DisclosureGroup>
    </section>
  );
};
