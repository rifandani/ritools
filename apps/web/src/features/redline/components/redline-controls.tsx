import { Schema } from "effect";

import { Checkbox, CheckboxField } from "@/core/components/ui/checkbox";
import {
  NativeSelect,
  NativeSelectContent,
} from "@/core/components/ui/native-select";
import { useTranslation } from "@/features/i18n/use-translation";

import { LANGUAGES } from "../redline";
import type { Language } from "../redline";
import { Controls } from "../redline.controls";

export const RedlineControls = ({
  controls,
  language,
  marked,
  onChange,
  onLanguage,
}: {
  readonly controls: Controls;
  readonly language: Language;
  readonly marked: boolean;
  readonly onChange: (controls: Controls) => void;
  readonly onLanguage: (language: Language) => void;
}) => {
  const { t } = useTranslation();
  return (
    <div className="redline-controls">
      <label>
        {t("redlineLayout")}
        <NativeSelect>
          <NativeSelectContent
            aria-label={t("redlineLayout")}
            disabled={marked}
            value={marked ? "stacked" : controls.layout}
            onChange={(event) => {
              const layout = event.target.value;
              if (Schema.is(Controls.fields.layout)(layout)) {
                onChange({ ...controls, layout });
              }
            }}
          >
            <option value="split">{t("redlineSplit")}</option>
            <option value="stacked">{t("redlineStacked")}</option>
          </NativeSelectContent>
        </NativeSelect>
      </label>
      <label>
        {t("redlineIndicators")}
        <NativeSelect>
          <NativeSelectContent
            aria-label={t("redlineIndicators")}
            value={controls.indicators}
            onChange={(event) => {
              const indicators = event.target.value;
              if (Schema.is(Controls.fields.indicators)(indicators)) {
                onChange({ ...controls, indicators });
              }
            }}
          >
            <option value="bars">{t("redlineBars")}</option>
            <option value="classic">{t("redlineClassic")}</option>
            <option value="none">{t("redlineNone")}</option>
          </NativeSelectContent>
        </NativeSelect>
      </label>
      <label>
        {t("redlineHighlight")}
        <NativeSelect>
          <NativeSelectContent
            aria-label={t("redlineHighlight")}
            value={controls.highlight}
            onChange={(event) => {
              const highlight = event.target.value;
              if (Schema.is(Controls.fields.highlight)(highlight)) {
                onChange({ ...controls, highlight });
              }
            }}
          >
            {(
              [
                ["word-alt", "redlineWordAlt"],
                ["word", "redlineWord"],
                ["word-line", "redlineWordLine"],
                ["char", "redlineChar"],
                ["none", "redlineNone"],
              ] as const
            ).map(([value, label]) => (
              <option key={value} value={value}>
                {t(label)}
              </option>
            ))}
          </NativeSelectContent>
        </NativeSelect>
      </label>
      <label>
        {t("redlineLanguage")}
        <NativeSelect>
          <NativeSelectContent
            aria-label={t("redlineLanguage")}
            value={language}
            onChange={(event) => {
              const selected = LANGUAGES.find(
                (value) => value === event.target.value
              );
              if (selected) {
                onLanguage(selected);
              }
            }}
          >
            {LANGUAGES.map((value) => (
              <option key={value} value={value}>
                {value === "text" ? t("redlinePlain") : value}
              </option>
            ))}
          </NativeSelectContent>
        </NativeSelect>
      </label>
      {(
        [
          ["backgrounds", "redlineBackgrounds"],
          ["wrapping", "redlineWrapping"],
          ["numbers", "redlineNumbers"],
        ] as const
      ).map(([key, label]) => (
        <CheckboxField
          className="redline-check"
          key={key}
          isSelected={controls[key]}
          onChange={(selected) => onChange({ ...controls, [key]: selected })}
        >
          <Checkbox>{t(label)}</Checkbox>
        </CheckboxField>
      ))}
    </div>
  );
};
