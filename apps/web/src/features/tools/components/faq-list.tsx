"use client";

import {
  Disclosure,
  DisclosureGroup,
  DisclosurePanel,
  DisclosureTrigger,
} from "@/core/components/ui/disclosure-group";

export interface FaqItem {
  readonly answer: string;
  /** The stable translation key, so a Locale change keeps the same DOM id. */
  readonly id: string;
  readonly question: string;
}

/** The FAQ rows under a Tool: one disclosure per question, opened in place. */
export const FaqList = ({
  className,
  items,
}: {
  readonly className?: string;
  readonly items: readonly FaqItem[];
}) => (
  <DisclosureGroup className={className}>
    {items.map((item) => (
      <Disclosure id={item.id} key={item.id}>
        <DisclosureTrigger>{item.question}</DisclosureTrigger>
        <DisclosurePanel>
          <p>{item.answer}</p>
        </DisclosurePanel>
      </Disclosure>
    ))}
  </DisclosureGroup>
);
