"use client";

import { useState } from "react";

import { useTranslation } from "@/features/i18n/use-translation";

/** The read-more cut for a long value. The full value is always the copy. */
const VALUE_LIMIT = 120;

/**
 * A Metadata Field value, printed as text. A long value is cut at 120
 * characters and can be opened; the full value never enters the DOM as HTML.
 */
export const LongValue = ({ value }: { readonly value: string }) => {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  if (value.length <= VALUE_LIMIT) {
    return <span className="break-words">{value}</span>;
  }
  return (
    <span className="break-words">
      {open ? value : `${value.slice(0, VALUE_LIMIT)}…`}{" "}
      <button
        className="text-primary-ink font-semibold underline decoration-2 underline-offset-[0.24em]"
        onClick={() => {
          setOpen((current) => !current);
        }}
        type="button"
      >
        {open ? t("exposeShowLess") : t("exposeShowMore")}
      </button>
    </span>
  );
};
