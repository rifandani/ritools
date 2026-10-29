/* oxlint-disable eslint/complexity -- The field renderer covers the five supported AcroForm kinds and their required/read-only states. */
/* oxlint-disable jsx-a11y/no-noninteractive-element-interactions -- The fieldset delegates Escape from its native draft controls. */
import { useEffect, useState } from "react";

import { Button } from "@/core/components/ui/button";
import { useTranslation } from "@/features/i18n/use-translation";

import type * as F from "../folio";
import type { FolioController } from "../use-folio";
import { FolioField, FolioSelect } from "./folio-controls";

const FolioFormField = ({
  controller: c,
  field,
}: {
  readonly controller: FolioController;
  readonly field: F.FormField;
}) => {
  const { t } = useTranslation();
  const [value, setValue] = useState(field.value);
  const [changed, setChanged] = useState(false);
  const [invalid, setInvalid] = useState(false);
  const [composing, setComposing] = useState(false);
  const chosen = new Set(value._tag === "Choice" ? value.selected : []);
  const readOnly =
    field.readOnly ||
    field.unsupportedReasons.length > 0 ||
    !c.permissions.fillForms;
  const unavailable = readOnly || (c.drafting && !changed);
  const id = `folio-field-${field.id}`;
  const change = (next: F.FormValue) => {
    setValue(next);
    setChanged(true);
    c.setDrafting(true);
    setInvalid(false);
  };
  const reset = () => {
    setValue(field.value);
    setChanged(false);
    c.setDrafting(false);
    setInvalid(false);
  };
  const apply = async () => {
    if (!changed || composing) {
      return;
    }
    const result = await c.applyDraft({
      _tag: "SetFormValue",
      field: field.id,
      value,
    });
    if (result) {
      setChanged(false);
      c.setDrafting(false);
    } else {
      setInvalid(true);
    }
  };
  const { setDrafting } = c;
  useEffect(
    () => () => {
      setDrafting(false);
    },
    [setDrafting]
  );
  const label = field.label || field.name;
  return (
    <fieldset
      className="border-input flex flex-col gap-3 border-b-2 py-4"
      aria-invalid={invalid}
      onKeyDown={(event) => {
        if (event.key === "Escape" && !event.nativeEvent.isComposing) {
          event.stopPropagation();
          reset();
        }
      }}
    >
      <legend className="max-w-full text-sm font-bold [overflow-wrap:anywhere]">
        {label}
        {field.required ? ` · ${t("folioRequired")}` : ""}
      </legend>
      {value._tag === "Text" ? (
        <FolioField
          id={id}
          required={field.required}
          maxLength={field.maxLength ?? undefined}
          label={label}
          value={value.value}
          disabled={unavailable || c.busy}
          onChange={(text) => change({ _tag: "Text", value: text })}
          onCompositionStart={() => setComposing(true)}
          onCompositionEnd={() => setComposing(false)}
        />
      ) : value._tag === "Check" ? (
        <label className="flex min-h-11 items-center gap-3 text-sm">
          <input
            id={id}
            className="accent-primary size-6"
            type="checkbox"
            checked={value.checked}
            disabled={unavailable || c.busy}
            aria-required={field.required}
            onChange={(event) =>
              change({ _tag: "Check", checked: event.target.checked })
            }
          />
          {label}
        </label>
      ) : value._tag === "Radio" ? (
        <div
          role="radiogroup"
          aria-label={label}
          aria-required={field.required}
        >
          {field.options.map((option, i) => (
            <label
              key={option.id}
              className="flex min-h-11 items-center gap-3 text-sm"
            >
              <input
                id={i === 0 ? id : undefined}
                type="radio"
                name={field.id}
                className="accent-primary size-6"
                checked={value.option === option.id}
                disabled={unavailable || c.busy}
                onChange={() => change({ _tag: "Radio", option: option.id })}
              />
              {option.label}
            </label>
          ))}
        </div>
      ) : field.editableCombo ? (
        <FolioField
          id={id}
          list={`${id}-options`}
          label={label}
          required={field.required}
          disabled={unavailable || c.busy}
          value={value.selected[0] ?? ""}
          onChange={(text) =>
            change({ _tag: "Choice", selected: text ? [text] : [] })
          }
        />
      ) : field.multiple ? (
        <p>{t("folioChooseOptions")}</p>
      ) : (
        <FolioSelect
          id={id}
          label={label}
          value={value.selected[0] ?? ""}
          disabled={unavailable || c.busy}
          onChange={(option) =>
            change({ _tag: "Choice", selected: option ? [option] : [] })
          }
        >
          <option value="">{t("folioChooseOption")}</option>
          {field.options.map((option) => (
            <option value={option.id} key={option.id}>
              {option.label}
            </option>
          ))}
        </FolioSelect>
      )}
      {field.editableCombo ? (
        <datalist id={`${id}-options`}>
          {field.options.map((option) => (
            <option key={option.id} value={option.id}>
              {option.label}
            </option>
          ))}
        </datalist>
      ) : null}
      {value._tag === "Choice" && field.multiple ? (
        <div>
          {field.options.map((option) => (
            <label
              key={option.id}
              className="flex min-h-11 items-center gap-3 text-sm"
            >
              <input
                type="checkbox"
                className="accent-primary size-6"
                checked={chosen.has(option.id)}
                disabled={unavailable || c.busy}
                onChange={(event) =>
                  change({
                    _tag: "Choice",
                    selected: field.options.flatMap((item) =>
                      (
                        item.id === option.id
                          ? event.target.checked
                          : chosen.has(item.id)
                      )
                        ? [item.id]
                        : []
                    ),
                  })
                }
              />
              {option.label}
            </label>
          ))}
        </div>
      ) : null}
      {field.required ? (
        <p className="text-muted-fg text-xs">{t("folioRequired")}</p>
      ) : null}
      {readOnly ? (
        <p className="text-muted-fg text-xs">{t("folioReadOnlyField")}</p>
      ) : null}
      {field.name === field.label || !field.label ? (
        <p className="text-muted-fg text-xs">{t("folioMissingLabel")}</p>
      ) : null}
      {changed ? (
        <div className="flex flex-wrap gap-2">
          <Button
            isDisabled={c.busy || composing}
            onPress={() => {
              void apply();
            }}
          >
            {t("folioApply")}
          </Button>
          <Button intent="plain" isDisabled={c.busy} onPress={reset}>
            {t("folioCancel")}
          </Button>
        </div>
      ) : null}
    </fieldset>
  );
};

export const FolioForms = ({
  controller: c,
}: {
  readonly controller: FolioController;
}) => {
  const { t } = useTranslation();
  return (
    <div className="min-w-0" data-folio-forms>
      <h3 className="mb-4 font-bold">{t("folioFormFields")}</h3>
      {c.forms.length ? (
        c.forms.map((field) => (
          <FolioFormField
            key={`${field.id}:${c.snapshot?.revision}`}
            controller={c}
            field={field}
          />
        ))
      ) : (
        <p className="text-sm">{t("folioNoFields")}</p>
      )}
    </div>
  );
};
