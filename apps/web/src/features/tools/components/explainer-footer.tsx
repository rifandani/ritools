"use client";

import type { ReactNode } from "react";

import { FaqList } from "./faq-list";
import type { FaqItem } from "./faq-list";

/**
 * The FAQ and disclaimer under a Tool explainer. Every Tool prints the same
 * two sections with its own copy, so the shape lives here once.
 */
export const ExplainerFooter = ({
  disclaimer,
  disclaimerHeading,
  faq,
  faqHeading,
}: {
  readonly disclaimer: ReactNode;
  readonly disclaimerHeading: string;
  readonly faq: readonly FaqItem[];
  readonly faqHeading: string;
}) => (
  <>
    <div className="mt-6 flex flex-col gap-4">
      <h3 className="font-display text-[clamp(1.5rem,4vw,2.25rem)] leading-none font-black tracking-[0.01em] uppercase [font-stretch:75%]">
        {faqHeading}
      </h3>
      <FaqList items={faq} />
    </div>

    <div className="mt-6 flex flex-col gap-2">
      <h3 className="font-display text-[clamp(1.5rem,4vw,2.25rem)] leading-none font-black tracking-[0.01em] uppercase [font-stretch:75%]">
        {disclaimerHeading}
      </h3>
      <p className="text-muted-fg font-mono text-xs/6">{disclaimer}</p>
    </div>
  </>
);
