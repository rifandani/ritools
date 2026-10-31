import { cn } from "cn";
import { Schema } from "effect";
import { HiGlobeAlt } from "react-icons/hi2";

import { Button } from "@/core/components/ui/button";
import {
  Menu,
  MenuContent,
  MenuHeader,
  MenuItem,
  MenuSection,
} from "@/core/components/ui/menu";
import { Locale } from "@/features/i18n/locale";
import { useTranslation } from "@/features/i18n/use-translation";

/** The name of each Locale, in its own language. */
const LOCALE_LABELS = {
  "en-us": "English",
  "id-id": "Indonesia",
} as const satisfies Record<Locale, string>;

const isLocale = Schema.is(Locale);

export interface LanguageToggleProps {
  readonly className?: string;
  /** Fills the row, for a sidebar footer. */
  readonly block?: boolean;
  /** The globe alone, for a collapsed rail. */
  readonly compact?: boolean;
}

export const LanguageToggle = ({
  className,
  block = false,
  compact = false,
}: LanguageToggleProps) => {
  const { t, setLocale, locale } = useTranslation();

  return (
    <Menu>
      <Button
        aria-label={
          compact ? `${t("language")}: ${LOCALE_LABELS[locale]}` : undefined
        }
        className={cn(
          compact ? "w-full gap-x-0 px-0" : "shrink-0 gap-x-2 px-3.5",
          block && !compact && "min-w-0 flex-1 justify-start",
          className
        )}
        intent="outline"
      >
        <HiGlobeAlt aria-hidden="true" />
        {compact ? null : <span>{LOCALE_LABELS[locale]}</span>}
      </Button>

      <MenuContent
        selectionMode="single"
        selectedKeys={new Set([locale])}
        onSelectionChange={(selection) => {
          // `selectionMode="single"`: the set holds the picked key, or nothing.
          const [key] = selection === "all" ? [] : selection;
          if (isLocale(key)) {
            // Switches the UI at once; persisting for the next server render
            // happens in the background.
            setLocale(key);
          }
        }}
      >
        <MenuSection>
          <MenuHeader separator>{t("language")}</MenuHeader>

          {Object.entries(LOCALE_LABELS).map(([id, label]) => (
            <MenuItem key={id} id={id}>
              {label}
            </MenuItem>
          ))}
        </MenuSection>
      </MenuContent>
    </Menu>
  );
};
