"use client";

import { Note } from "@/core/components/ui/note";
import { Ransom } from "@/core/components/ui/ransom";
import { useTranslation } from "@/features/i18n/use-translation";
import type { ComparisonRow } from "@/features/tools/components/comparison-table";
import { ComparisonTable } from "@/features/tools/components/comparison-table";
import { ExplainerFooter } from "@/features/tools/components/explainer-footer";

const COLUMNS = [
  "qraftColQrCodeGenerator",
  "qraftColQrTiger",
  "qraftColBitly",
  "qraftColQraft",
] as const;

const OURS = 3;

const ROWS = [
  {
    cells: [
      ["qraftValueLocal", "good"],
      ["qraftValueServer", "limit"],
      ["qraftValueServer", "limit"],
      ["qraftValueLocal", "good"],
    ],
    label: "qraftRowUpload",
  },
  {
    cells: [
      ["qraftValueNo", "good"],
      ["qraftValuePaid", "limit"],
      ["qraftValuePaid", "limit"],
      ["qraftValueNo", "good"],
    ],
    label: "qraftRowScans",
  },
  {
    cells: [
      ["qraftValueNo", "good"],
      ["qraftValueYes", "limit"],
      ["qraftValueYes", "limit"],
      ["qraftValueNo", "good"],
    ],
    label: "qraftRowRedirect",
  },
  {
    cells: [
      ["qraftValueStatic", "good"],
      ["qraftValuePaid", "limit"],
      ["qraftValuePaid", "limit"],
      ["qraftValueStatic", "good"],
    ],
    label: "qraftRowExpiry",
  },
  {
    cells: [
      ["qraftValueFreeLimit", "limit"],
      ["qraftValueFreeLimit", "limit"],
      ["qraftValueFreeLimit", "limit"],
      ["qraftValueNoCap", "good"],
    ],
    label: "qraftRowBatch",
  },
  {
    cells: [
      ["qraftValueNo", "limit"],
      ["qraftValueNo", "limit"],
      ["qraftValueNo", "limit"],
      ["qraftValueYes", "good"],
    ],
    label: "qraftRowFormats",
  },
  {
    cells: [
      ["qraftValueSomeStyle", "good"],
      ["qraftValueSomeStyle", "good"],
      ["qraftValueNoStyle", "limit"],
      ["qraftValueQraftStyle", "good"],
    ],
    label: "qraftRowStyle",
  },
  {
    cells: [
      ["qraftValueNo", "limit"],
      ["qraftValueNo", "limit"],
      ["qraftValueNo", "limit"],
      ["qraftValueOffline", "good"],
    ],
    label: "qraftRowOffline",
  },
  {
    cells: [
      ["qraftValuePaid", "limit"],
      ["qraftValuePaid", "limit"],
      ["qraftValuePaid", "limit"],
      ["qraftValueFreeNoAccount", "good"],
    ],
    label: "qraftRowCost",
  },
] as const satisfies readonly ComparisonRow[];

const SOURCES = [
  { href: "https://www.qr-code-generator.com/", label: "QR Code Generator" },
  { href: "https://www.qrcode-tiger.com/", label: "QR Tiger" },
  { href: "https://bitly.com/pages/pricing", label: "Bitly" },
] as const;

const FAQ = [
  ["qraftFaqErrorQ", "qraftFaqErrorA"],
  ["qraftFaqQuietQ", "qraftFaqQuietA"],
  ["qraftFaqScanQ", "qraftFaqScanA"],
  ["qraftFaqStaticQ", "qraftFaqStaticA"],
  ["qraftFaqLocalQ", "qraftFaqLocalA"],
  ["qraftFaqPngQ", "qraftFaqPngA"],
] as const;

/** Below the Tool: what Qraft is, how it compares, and the answers to trust. */
export const QraftExplainer = () => {
  const { t } = useTranslation();
  return (
    <section className="border-rule mt-12 border-t-[3px] pt-8">
      <h2 className="font-display text-[clamp(2rem,6vw,3.25rem)] leading-none font-black tracking-[0.01em] uppercase [font-stretch:75%]">
        {t("qraftExplainerTitleLead")}{" "}
        <Ransom as="span">{t("qraftExplainerTitleAccent")}</Ransom>{" "}
        {t("qraftExplainerTitleBridge")}{" "}
        <span className="text-primary-ink">{t("qraftExplainerTitleTail")}</span>
      </h2>
      <p className="text-muted-fg mt-4 max-w-[68ch] text-base/6">
        {t("qraftExplainerLede")}
      </p>
      <p className="text-muted-fg mt-4 max-w-[68ch] text-base/6">
        {t("qraftExplainerIntro")}
      </p>

      <div className="mt-12">
        <h3 className="font-display text-[clamp(1.5rem,4vw,2.25rem)] leading-none font-black tracking-[0.01em] uppercase [font-stretch:75%]">
          {t("qraftCompareHeading")}
        </h3>
        <ComparisonTable
          caption="qraftCompareCaption"
          columns={COLUMNS}
          featureHeading="qraftCompareFeature"
          minWidthClassName="min-w-[52rem]"
          ours={OURS}
          rows={ROWS}
        />
        <p className="text-muted-fg mt-3 text-xs/5">
          {t("qraftCompareChecked")}{" "}
          {SOURCES.map((source, index) => (
            <span key={source.href}>
              {index === 0 ? null : " · "}
              <a
                className="underline decoration-2 underline-offset-2"
                href={source.href}
                rel="noreferrer noopener"
                target="_blank"
              >
                {source.label}
              </a>
            </span>
          ))}
        </p>
        <p className="text-muted-fg mt-2 text-xs/5">
          {t("qraftCompareScroll")}
        </p>
      </div>

      <Note className="mt-12" intent="warning">
        <h3 className="font-display text-base/5 font-extrabold uppercase [font-stretch:75%]">
          {t("qraftHonestyTitle")}
        </h3>
        <p className="mt-2 text-sm/6">{t("qraftHonestyBody")}</p>
      </Note>

      <ExplainerFooter
        disclaimer={t("qraftDisclaimer")}
        disclaimerHeading={t("qraftDisclaimerHeading")}
        faq={FAQ.map(([question, answer]) => ({
          answer: t(answer),
          id: question,
          question: t(question),
        }))}
        faqHeading={t("qraftFaqHeading")}
      />
    </section>
  );
};
