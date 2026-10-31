"use client";

import { Button } from "@/core/components/ui/button";
import { Label } from "@/core/components/ui/field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectSection,
  SelectTrigger,
} from "@/core/components/ui/select";

import type { PresetId, PresetValues, QraftKey } from "../qraft";
import { ADVANCED_PRESETS, PRESETS, PRESET_FIELD_SPECS } from "../qraft";
import type { QraftController } from "../use-qraft";
import {
  QraftNumber,
  QraftSelect,
  QraftText,
  QraftTextArea,
  QraftSwitch,
} from "./qraft-fields";
import type { QraftOption } from "./qraft-fields";

const PRESET_LABEL_KEY = {
  email: "qraftPresetEmail",
  event: "qraftPresetEvent",
  "gs1-digital-link": "qraftPresetGs1DigitalLink",
  gs1qr: "qraftPresetGs1qr",
  location: "qraftPresetLocation",
  mecard: "qraftPresetMecard",
  phone: "qraftPresetPhone",
  sms: "qraftPresetSms",
  swiss: "qraftPresetSwiss",
  text: "qraftPresetText",
  vcard: "qraftPresetVcard",
  wifi: "qraftPresetWifi",
} as const satisfies Readonly<Record<PresetId, QraftKey>>;

const MAIN_PRESETS = PRESETS.filter(
  (preset) => !ADVANCED_PRESETS.includes(preset)
);

const dateType = (name: string): "date" | "datetime-local" =>
  name === "start" || name === "end" ? "datetime-local" : "date";

const inputType = (
  placeholder: string | undefined
): "email" | "tel" | "text" | "url" => {
  if (placeholder === "email") {
    return "email";
  }
  if (placeholder === "tel") {
    return "tel";
  }
  if (placeholder === "url") {
    return "url";
  }
  return "text";
};

const optionsOfField = (field: {
  readonly kind: string;
  readonly options?: readonly string[];
}): readonly string[] => field.options ?? [];

const placeholderOf = (field: {
  readonly kind: string;
  readonly placeholder?: string;
}): string | undefined => field.placeholder;

const optionsOf = (
  t: QraftController["t"],
  field: (typeof PRESET_FIELD_SPECS)[PresetId][number]
): readonly QraftOption[] => {
  if (field.name === "encryption") {
    return [
      { id: "WPA", label: t("qraftOptWpa") },
      { id: "WEP", label: t("qraftOptWep") },
      { id: "nopass", label: t("qraftOptNone") },
    ];
  }
  if (field.name === "currency") {
    return [
      { id: "CHF", label: t("qraftOptChf") },
      { id: "EUR", label: t("qraftOptEur") },
    ];
  }
  if (field.name === "referenceType") {
    return [
      { id: "NON", label: t("qraftOptNon") },
      { id: "QRR", label: t("qraftOptQrr") },
      { id: "SCOR", label: t("qraftOptScor") },
    ];
  }
  return optionsOfField(field).map((option) => ({ id: option, label: option }));
};

const fieldValue = (fields: PresetValues, name: string): string =>
  fields[name] ?? "";

const PresetField = ({
  controller,
  field,
}: {
  readonly controller: QraftController;
  readonly field: (typeof PRESET_FIELD_SPECS)[PresetId][number];
}) => {
  const c = controller;
  const value = fieldValue(c.settings.fields, field.name);
  const label = c.t(field.labelTranslation);
  if (field.kind === "textarea") {
    return (
      <QraftTextArea
        id={`qraft-field-${field.name}`}
        label={label}
        value={value}
        onChange={(next) => c.changeField(field.name, next)}
      />
    );
  }
  if (field.kind === "number") {
    return (
      <QraftNumber
        id={`qraft-field-${field.name}`}
        label={label}
        max={10_000_000}
        min={-10_000_000}
        step={
          field.name === "latitude" || field.name === "longitude" ? 0.1 : 0.01
        }
        value={Number(value) || 0}
        onChange={(next) => c.changeField(field.name, String(next))}
      />
    );
  }
  if (field.kind === "select") {
    return (
      <QraftSelect
        id={`qraft-field-${field.name}`}
        label={label}
        options={optionsOf(c.t, field)}
        value={value}
        onChange={(next) => c.changeField(field.name, next)}
      />
    );
  }
  if (field.kind === "checkbox") {
    return (
      <QraftSwitch
        isSelected={value === "true"}
        label={label}
        onChange={(next) => c.changeField(field.name, next ? "true" : "false")}
      />
    );
  }
  const placeholder = placeholderOf(field);
  return (
    <QraftText
      id={`qraft-field-${field.name}`}
      label={label}
      placeholder={placeholder}
      type={
        field.kind === "date" ? dateType(field.name) : inputType(placeholder)
      }
      value={value}
      onChange={(next) => c.changeField(field.name, next)}
    />
  );
};

/** The Payload: a Preset form, its fields, and the Raw Payload under them. */
export const QraftPayload = ({
  controller,
}: {
  readonly controller: QraftController;
}) => {
  const c = controller;
  const fields = PRESET_FIELD_SPECS[c.settings.preset];
  return (
    <section aria-labelledby="qraft-payload-heading" className="min-w-0">
      <h2
        className="border-rule font-display border-b-2 pb-2 text-lg font-black uppercase [font-stretch:75%]"
        id="qraft-payload-heading"
      >
        {c.t("qraftPayloadHeading")}
      </h2>

      <div className="mt-4 flex flex-col gap-4">
        <Select
          className="min-w-0"
          selectedKey={c.settings.preset}
          onSelectionChange={(key) => {
            const next = PRESETS.find((preset) => preset === key);
            if (next) {
              c.choosePreset(next);
            }
          }}
        >
          <Label>{c.t("qraftPreset")}</Label>
          <div className="mt-1.5">
            <SelectTrigger id="qraft-preset" />
          </div>
          <SelectContent>
            <SelectSection>
              {MAIN_PRESETS.map((preset) => (
                <SelectItem
                  id={preset}
                  key={preset}
                  textValue={c.t(PRESET_LABEL_KEY[preset])}
                >
                  {c.t(PRESET_LABEL_KEY[preset])}
                </SelectItem>
              ))}
            </SelectSection>
            <SelectSection title={c.t("qraftPresetAdvanced")}>
              {ADVANCED_PRESETS.map((preset) => (
                <SelectItem
                  id={preset}
                  key={preset}
                  textValue={c.t(PRESET_LABEL_KEY[preset])}
                >
                  {c.t(PRESET_LABEL_KEY[preset])}
                </SelectItem>
              ))}
            </SelectSection>
          </SelectContent>
        </Select>

        {fields.length > 0 && (
          <div className="grid gap-4 sm:grid-cols-2">
            {fields.map((field) => (
              <div
                className={
                  field.kind === "textarea" ? "sm:col-span-2" : undefined
                }
                key={field.name}
              >
                <PresetField controller={c} field={field} />
              </div>
            ))}
          </div>
        )}

        <div>
          <QraftTextArea
            id="qraft-payload"
            label={c.t("qraftRawPayload")}
            rows={3}
            value={c.settings.payload}
            onChange={(next) => c.changeRaw(next)}
          />
          <div className="mt-1.5 flex flex-wrap items-center justify-between gap-2">
            <p className="text-muted-fg text-xs/5">
              {c.t("qraftRawPayloadHint")}
            </p>
            <div className="flex items-center gap-2">
              <span className="num text-muted-fg text-xs">
                {c.t("qraftPayloadCount", {
                  count: String(c.settings.payload.length),
                })}
              </span>
              <Button intent="plain" onPress={() => c.clear()} size="sm">
                {c.t("qraftClearPayload")}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
