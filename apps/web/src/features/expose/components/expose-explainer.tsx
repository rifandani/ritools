"use client";

import { useTranslation } from "@/features/i18n/use-translation";

const BLOCKS = [
  ["exposeExplainerExifTitle", "exposeExplainerExifBody"],
  ["exposeExplainerGpsTitle", "exposeExplainerGpsBody"],
  ["exposeExplainerC2paTitle", "exposeExplainerC2paBody"],
  ["exposeExplainerWatermarkTitle", "exposeExplainerWatermarkBody"],
  ["exposeExplainerLocalTitle", "exposeExplainerLocalBody"],
] as const;

/**
 * Below the Tool: what EXIF is, why a GPS point matters, what a C2PA Manifest
 * records, what a Clean cannot remove, and where the file stays. Ritools copy
 * only: no competitor names, no comparison table, no numbers we cannot prove.
 */
export const ExposeExplainer = () => {
  const { t } = useTranslation();
  return (
    <section
      aria-labelledby="expose-explainer-title"
      className="border-rule flex flex-col gap-6 border-t-[3px] pt-6"
    >
      <h2
        className="font-display text-[clamp(1.75rem,4vw,2.5rem)] leading-none font-black tracking-[0.01em] uppercase [font-stretch:75%]"
        id="expose-explainer-title"
      >
        {t("exposeExplainerTitle")}
      </h2>

      <div className="grid grid-cols-1 gap-x-8 gap-y-6 sm:grid-cols-2">
        {BLOCKS.map(([title, body]) => (
          <article className="border-rule border-t-2 pt-3" key={title}>
            <h3 className="font-display text-base/5 font-extrabold uppercase [font-stretch:75%]">
              {t(title)}
            </h3>
            <p className="text-muted-fg mt-2 text-sm/6">{t(body)}</p>
          </article>
        ))}
      </div>

      <div className="border-rule bg-warning-subtle text-warning-subtle-fg border-2 p-4">
        <h3 className="font-display text-base/5 font-extrabold uppercase [font-stretch:75%]">
          {t("exposeHonestyTitle")}
        </h3>
        <p className="mt-2 text-sm/6">{t("exposeHonestyBody")}</p>
      </div>

      <div className="border-rule flex flex-col gap-2 border-t-2 pt-4">
        <h3 className="text-[0.75rem] font-bold tracking-[0.08em] uppercase [font-stretch:87.5%]">
          {t("exposeSampleAbout")}
        </h3>
        <p className="text-muted-fg text-xs/5">{t("exposeSampleCameraLine")}</p>
        <p className="text-muted-fg text-xs/5">{t("exposeSampleAiLine")}</p>
      </div>
    </section>
  );
};
