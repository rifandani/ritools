import { Schema } from "effect";
import type { ReactNode } from "react";
import { HiArrowsRightLeft, HiTrash } from "react-icons/hi2";

import { Button } from "@/core/components/ui/button";
import { Checkbox, CheckboxField } from "@/core/components/ui/checkbox";
import { Label } from "@/core/components/ui/field";
import {
  Select,
  SelectContent,
  SelectDescription,
  SelectItem,
  SelectLabel,
  SelectTrigger,
} from "@/core/components/ui/select";
import { useTranslation } from "@/features/i18n/use-translation";

import type { Language } from "../cleave";
import { Controls } from "../cleave.controls";
import type { LanguageOption, LanguageSelection } from "../cleave.languages";
import type { ThemeMode } from "../cleave.themes";
import { CleaveLanguage } from "./cleave-language";
import { CleaveTheme } from "./cleave-theme";

export const CleaveControls = ({
  children,
  controls,
  colorMode,
  isDisabled,
  language,
  languageSelection,
  languages,
  marked,
  onChange,
  onClear,
  onLanguage,
  onSwap,
}: {
  readonly children?: ReactNode;
  readonly controls: Controls;
  readonly colorMode: ThemeMode;
  readonly isDisabled: boolean;
  readonly language: Language;
  readonly languageSelection: LanguageSelection;
  readonly languages: readonly LanguageOption[];
  readonly marked: boolean;
  readonly onChange: (controls: Controls) => void;
  readonly onClear: () => void;
  readonly onLanguage: (language: LanguageSelection) => void;
  readonly onSwap?: () => void;
}) => {
  const { t } = useTranslation();
  return (
    <div className="cleave-controls">
      <Select
        className="cleave-select"
        isDisabled={marked}
        selectedKey={marked ? "stacked" : controls.layout}
        onSelectionChange={(layout) => {
          if (Schema.is(Controls.fields.layout)(layout)) {
            onChange({ ...controls, layout });
          }
        }}
      >
        <Label>{t("cleaveLayout")}</Label>
        <SelectTrigger />
        <SelectContent>
          <SelectItem id="split">{t("cleaveSplit")}</SelectItem>
          <SelectItem id="stacked">{t("cleaveStacked")}</SelectItem>
        </SelectContent>
      </Select>
      <Select
        className="cleave-select"
        selectedKey={controls.indicators}
        onSelectionChange={(indicators) => {
          if (Schema.is(Controls.fields.indicators)(indicators)) {
            onChange({ ...controls, indicators });
          }
        }}
      >
        <Label>{t("cleaveIndicators")}</Label>
        <SelectTrigger />
        <SelectContent>
          <SelectItem id="bars">{t("cleaveBars")}</SelectItem>
          <SelectItem id="classic">{t("cleaveClassic")}</SelectItem>
          <SelectItem id="none">{t("cleaveNone")}</SelectItem>
        </SelectContent>
      </Select>
      <Select
        className="cleave-select"
        selectedKey={controls.highlight}
        onSelectionChange={(highlight) => {
          if (Schema.is(Controls.fields.highlight)(highlight)) {
            onChange({ ...controls, highlight });
          }
        }}
      >
        <Label>{t("cleaveHighlight")}</Label>
        <SelectTrigger />
        <SelectContent>
          {(
            [
              ["word-alt", "cleaveWordAlt", "cleaveWordAltDescription"],
              ["word", "cleaveWord", "cleaveWordDescription"],
              ["word-line", "cleaveWordLine", "cleaveWordLineDescription"],
              ["char", "cleaveChar", "cleaveCharDescription"],
              ["none", "cleaveNone", "cleaveNoneDescription"],
            ] as const
          ).map(([value, label, description]) => (
            <SelectItem id={value} key={value} textValue={t(label)}>
              <SelectLabel>{t(label)}</SelectLabel>
              <SelectDescription>{t(description)}</SelectDescription>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <CleaveLanguage
        language={language}
        selection={languageSelection}
        languages={languages}
        isDisabled={isDisabled}
        onChange={onLanguage}
      />
      <CleaveTheme
        key={colorMode}
        mode={colorMode}
        theme={colorMode === "dark" ? controls.darkTheme : controls.lightTheme}
        isDisabled={isDisabled}
        onChange={(theme) =>
          onChange(
            colorMode === "dark"
              ? { ...controls, darkTheme: theme }
              : { ...controls, lightTheme: theme }
          )
        }
      />
      {(
        [
          ["backgrounds", "cleaveBackgrounds"],
          ["wrapping", "cleaveWrapping"],
          ["numbers", "cleaveNumbers"],
        ] as const
      ).map(([key, label]) => (
        <CheckboxField
          className="cleave-check"
          key={key}
          isSelected={controls[key]}
          onChange={(selected) => onChange({ ...controls, [key]: selected })}
        >
          <Checkbox>{t(label)}</Checkbox>
        </CheckboxField>
      ))}
      <div className="ms-auto flex min-w-0 flex-wrap items-center justify-end gap-2">
        {onSwap ? (
          <Button intent="outline" isDisabled={isDisabled} onPress={onSwap}>
            <HiArrowsRightLeft aria-hidden="true" />
            {t("cleaveSwap")}
          </Button>
        ) : null}
        <Button intent="outline" isDisabled={isDisabled} onPress={onClear}>
          <HiTrash aria-hidden="true" />
          {t("cleaveClear")}
        </Button>
        {children}
      </div>
    </div>
  );
};
