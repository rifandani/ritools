import { useRef, useState } from "react";
import type { ReactNode } from "react";

import { Button } from "@/core/components/ui/button";
import { useTranslation } from "@/features/i18n/use-translation";

import type * as F from "../folio";
import type { FolioController } from "../use-folio";

/** Local drafts keep native undo. Shared widgets commit through one Field ID. */
export const FolioWidget = ({
  controller: c,
  field,
  style,
  index,
}: {
  readonly controller: FolioController;
  readonly field: F.FormField;
  readonly style: React.CSSProperties;
  readonly index: number;
}) => {
  const { t } = useTranslation();
  const [value, setValue] = useState(field.value);
  const [changed, setChanged] = useState(false);
  const composing = useRef(false);
  const disabled =
    (c.drafting && !changed) ||
    field.readOnly ||
    field.unsupportedReasons.length > 0 ||
    !c.permissions.fillForms ||
    c.busy;
  const label = field.label || field.name;
  const commit = async (next = value) => {
    if (composing.current) {
      return;
    }
    const result = await c.applyDraft({
      _tag: "SetFormValue",
      field: field.id,
      value: next,
    });
    if (result) {
      setChanged(false);
      c.setDrafting(false);
    }
  };
  const change = (next: F.FormValue) => {
    setValue(next);
    if (next._tag === "Text") {
      setChanged(true);
      c.setDrafting(true);
    } else {
      void commit(next);
    }
  };
  const reset = () => {
    setValue(field.value);
    setChanged(false);
    c.setDrafting(false);
  };
  const common = {
    "aria-label": label,
    "aria-required": field.required,
    disabled,
    className:
      "bracket absolute border-2 border-input bg-white/90 px-1 text-black focus:border-black",
    style: {
      width: style.width,
      height: style.height,
      fontSize: style.fontSize,
      left: 0,
      top: 0,
      colorScheme: "light",
    },
    onBlur: () => {
      if (changed) {
        void commit();
      }
    },
    onKeyDown: (event: React.KeyboardEvent) => {
      if (event.nativeEvent.isComposing) {
        return;
      }
      if (event.key === "Escape") {
        event.stopPropagation();
        reset();
      }
      if (event.key === "Enter" && changed) {
        event.preventDefault();
        void commit();
      }
    },
  };
  const wrap = (control: ReactNode) => (
    <label
      className="absolute min-h-11 min-w-11"
      style={{ ...style, colorScheme: "light" }}
    >
      {control}
    </label>
  );
  if (value._tag === "Text") {
    return (
      <>
        {wrap(
          <input
            {...common}
            type="text"
            value={value.value}
            maxLength={field.maxLength ?? undefined}
            onChange={(event) =>
              change({ _tag: "Text", value: event.target.value })
            }
            onCompositionStart={() => {
              composing.current = true;
            }}
            onCompositionEnd={() => {
              composing.current = false;
            }}
          />
        )}
        {changed ? (
          <Button
            className="absolute min-h-11 bg-white text-black"
            style={{
              left: style.left,
              top: Number(style.top) + Number(style.height),
            }}
            onPress={() => {
              void commit();
            }}
          >
            {t("folioApply")}
          </Button>
        ) : null}
      </>
    );
  }
  if (value._tag === "Check") {
    return wrap(
      <input
        {...common}
        type="checkbox"
        checked={value.checked}
        onChange={(event) =>
          change({ _tag: "Check", checked: event.target.checked })
        }
      />
    );
  }
  if (value._tag === "Radio") {
    const option = field.options[index];
    if (!option) {
      return null;
    }
    return wrap(
      <input
        {...common}
        aria-label={`${label}: ${option.label}`}
        type="radio"
        name={`folio-widget-${field.id}`}
        checked={value.option === option.id}
        onChange={() => change({ _tag: "Radio", option: option.id })}
      />
    );
  }
  if (field.editableCombo) {
    return wrap(
      <>
        <input
          {...common}
          type="text"
          value={value.selected[0] ?? ""}
          list={`folio-options-${field.id}`}
          onChange={(event) => {
            setValue({ _tag: "Choice", selected: [event.target.value] });
            setChanged(true);
            c.setDrafting(true);
          }}
        />
        <datalist id={`folio-options-${field.id}`}>
          {field.options.map((option) => (
            <option key={option.id} value={option.id}>
              {option.label}
            </option>
          ))}
        </datalist>
      </>
    );
  }
  return wrap(
    <select
      {...common}
      value={field.multiple ? [...value.selected] : (value.selected[0] ?? "")}
      multiple={field.multiple}
      onChange={(event) =>
        change({
          _tag: "Choice",
          selected: [...event.target.selectedOptions].map(
            (option) => option.value
          ),
        })
      }
    >
      {field.multiple ? null : (
        <option value="">{t("folioChooseOption")}</option>
      )}
      {field.options.map((option) => (
        <option key={option.id} value={option.id}>
          {option.label}
        </option>
      ))}
    </select>
  );
};
