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

export const LanguageToggle = () => {
  const { t, setLocale, locale } = useTranslation();
  return (
    <Menu>
      <Button intent="plain">
        <HiGlobeAlt className="size-6" />
        {LOCALE_LABELS[locale]}
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
