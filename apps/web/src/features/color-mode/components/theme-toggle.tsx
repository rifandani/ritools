import { useAtom } from "@effect/atom-react";
import { Match, Schema } from "effect";
import { HiComputerDesktop, HiMoon, HiSun } from "react-icons/hi2";

import { Button } from "@/core/components/ui/button";
import {
  Menu,
  MenuContent,
  MenuHeader,
  MenuItem,
  MenuSection,
} from "@/core/components/ui/menu";
import { ColorMode } from "@/features/color-mode/color-mode";
import { colorModeAtom } from "@/features/color-mode/color-mode.atoms";
import { useTranslation } from "@/features/i18n/use-translation";

const colorModeIcon = Match.type<ColorMode>().pipe(
  Match.when("auto", () => <HiComputerDesktop className="size-6" />),
  Match.when("light", () => <HiSun className="size-6" />),
  Match.when("dark", () => <HiMoon className="size-6" />),
  Match.exhaustive
);

const isColorMode = Schema.is(ColorMode);

export const ThemeToggle = () => {
  const { t } = useTranslation();
  // `ColorModeSync` applies the mode to `<html>`; this only reads and writes the pick
  const [colorMode, setColorMode] = useAtom(colorModeAtom);
  return (
    <Menu>
      <Button intent="outline" aria-label={t("theme")}>
        {colorModeIcon(colorMode)}
      </Button>

      <MenuContent
        selectionMode="single"
        selectedKeys={new Set([colorMode])}
        onSelectionChange={(selection) => {
          // `selectionMode="single"`: the set holds the picked key, or nothing.
          const [key] = selection === "all" ? [] : selection;
          if (isColorMode(key)) {
            setColorMode(key);
          }
        }}
      >
        <MenuSection>
          <MenuHeader separator>{t("theme")}</MenuHeader>

          <MenuItem id="auto" className="mt-1">
            {t("system")}
          </MenuItem>
          <MenuItem id="light">{t("light")}</MenuItem>
          <MenuItem id="dark">{t("dark")}</MenuItem>
        </MenuSection>
      </MenuContent>
    </Menu>
  );
};
