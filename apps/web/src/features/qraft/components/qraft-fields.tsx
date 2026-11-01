"use client";

import { useRef } from "react";
import { HiChevronDown } from "react-icons/hi2";
import { parseColor } from "react-stately";

import { Button } from "@/core/components/ui/button";
import { ColorArea } from "@/core/components/ui/color-area";
import { ColorPicker } from "@/core/components/ui/color-picker";
import {
  ColorSlider,
  ColorSliderTrack,
} from "@/core/components/ui/color-slider";
import { ColorSwatch } from "@/core/components/ui/color-swatch";
import { ColorThumb } from "@/core/components/ui/color-thumb";
import { Dialog } from "@/core/components/ui/dialog";
import { Label } from "@/core/components/ui/field";
import { Input } from "@/core/components/ui/input";
import { Menu, MenuContent } from "@/core/components/ui/menu";
import { NumberField, NumberInput } from "@/core/components/ui/number-field";
import { Popover, PopoverContent } from "@/core/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/core/components/ui/select";
import { Switch, SwitchField } from "@/core/components/ui/switch";
import { TextField } from "@/core/components/ui/text-field";
import { Textarea } from "@/core/components/ui/textarea";

export interface QraftOption {
  readonly id: string;
  readonly label: string;
}

/** A labelled select with the printed well trigger. */
export const QraftSelect = ({
  id,
  label,
  value,
  onChange,
  options,
  disabled = false,
}: {
  readonly id?: string;
  readonly label: string;
  readonly value: string;
  readonly onChange: (value: string) => void;
  readonly options: readonly QraftOption[];
  readonly disabled?: boolean;
}) => (
  <Select
    className="min-w-0"
    isDisabled={disabled}
    selectedKey={value === "" ? null : value}
    onSelectionChange={(key) => {
      if (key !== null) {
        onChange(String(key));
      }
    }}
  >
    <Label>{label}</Label>
    <div className="mt-1.5">
      <SelectTrigger id={id} />
    </div>
    <SelectContent items={options}>
      {(option) => (
        <SelectItem id={option.id} textValue={option.label}>
          {option.label}
        </SelectItem>
      )}
    </SelectContent>
  </Select>
);

/** A labelled text well. The input type is a hint, never validation. */
export const QraftText = ({
  id,
  label,
  value,
  onChange,
  type = "text",
  placeholder,
}: {
  readonly id?: string;
  readonly label: string;
  readonly value: string;
  readonly onChange: (value: string) => void;
  readonly type?: "date" | "datetime-local" | "email" | "tel" | "text" | "url";
  readonly placeholder?: string;
}) => (
  <TextField className="min-w-0" value={value} onChange={onChange}>
    <Label>{label}</Label>
    <div className="mt-1.5">
      <Input id={id} placeholder={placeholder} type={type} />
    </div>
  </TextField>
);

/** The hex a Swatch can print. An empty or invalid value prints as clear. */
const swatchColorOf = (value: string): string => {
  const text = value.trim();
  if (!/^#?(?:[\dA-Fa-f]{3}|[\dA-Fa-f]{6})$/u.test(text)) {
    return "#00000000";
  }
  return text.startsWith("#") ? text : `#${text}`;
};

/** The color the picker edits. An invalid hex starts from black. */
const pickerColorOf = (value: string) => {
  const color = swatchColorOf(value);
  return parseColor(color === "#00000000" ? "#000000" : color).toFormat("hsb");
};

/** A labelled color well: the swatch opens a picker, the hex text sits beside it. */
export const QraftColor = ({
  id,
  label,
  value,
  onChange,
  pickerLabel,
  hueLabel,
}: {
  readonly id?: string;
  readonly label: string;
  readonly value: string;
  readonly onChange: (value: string) => void;
  readonly pickerLabel: string;
  readonly hueLabel: string;
}) => (
  <TextField className="min-w-0" value={value} onChange={onChange}>
    <Label>{label}</Label>
    <div className="mt-1.5 flex items-center gap-2">
      <Popover>
        <Button
          aria-label={pickerLabel}
          className="*:data-[slot=color-swatch]:[--size:--spacing(10)]"
          intent="plain"
          size="sq-sm"
        >
          <ColorSwatch aria-hidden="true" color={swatchColorOf(value)} />
        </Button>
        <PopoverContent className="w-72 p-3" placement="bottom start">
          <Dialog aria-label={pickerLabel}>
            <ColorPicker
              className="flex w-full flex-col gap-3"
              value={pickerColorOf(value)}
              onChange={(color) =>
                onChange(color.toString("hex").toLowerCase())
              }
            >
              <ColorArea
                aria-label={pickerLabel}
                className="max-w-none"
                colorSpace="hsb"
                xChannel="saturation"
                yChannel="brightness"
              />
              <ColorSlider
                aria-label={hueLabel}
                channel="hue"
                className="w-full"
              >
                <ColorSliderTrack>
                  <ColorThumb />
                </ColorSliderTrack>
              </ColorSlider>
            </ColorPicker>
          </Dialog>
        </PopoverContent>
      </Popover>
      <div className="min-w-0 flex-1">
        <Input id={id} />
      </div>
    </div>
  </TextField>
);

/** A labelled textarea for a Payload or a message. */
export const QraftTextArea = ({
  id,
  label,
  value,
  onChange,
  rows = 3,
}: {
  readonly id?: string;
  readonly label: string;
  readonly value: string;
  readonly onChange: (value: string) => void;
  readonly rows?: number;
}) => (
  <TextField className="min-w-0" value={value} onChange={onChange}>
    <Label>{label}</Label>
    <div className="mt-1.5">
      <Textarea id={id} rows={rows} />
    </div>
  </TextField>
);

/** A labelled number well with a step and a bound. */
export const QraftNumber = ({
  id,
  label,
  value,
  onChange,
  min = 0,
  max = 10_000,
  step = 1,
}: {
  readonly id?: string;
  readonly label: string;
  readonly value: number;
  readonly onChange: (value: number) => void;
  readonly min?: number;
  readonly max?: number;
  readonly step?: number;
}) => (
  <NumberField
    className="min-w-0"
    maxValue={max}
    minValue={min}
    step={step}
    value={Number.isFinite(value) ? value : min}
    onChange={(next) => {
      onChange(Number.isFinite(next) ? next : min);
    }}
  >
    <Label>{label}</Label>
    <div className="mt-1.5">
      <NumberInput id={id} />
    </div>
  </NumberField>
);

/** A file picker in the body of a form. The button is the only focus stop. */
export const QraftFileButton = ({
  id,
  label,
  accept,
  onPick,
  isDisabled = false,
  intent = "outline",
  icon,
}: {
  readonly id?: string;
  readonly label: string;
  readonly accept: readonly string[];
  readonly onPick: (file: File) => void;
  readonly isDisabled?: boolean;
  readonly intent?: "outline" | "plain";
  readonly icon?: React.ReactNode;
}) => {
  const input = useRef<HTMLInputElement>(null);
  return (
    <>
      <Button
        intent={intent}
        isDisabled={isDisabled}
        onPress={() => input.current?.click()}
      >
        {icon}
        {label}
      </Button>
      <input
        accept={accept.join(",")}
        className="hidden"
        id={id}
        ref={input}
        type="file"
        onChange={(event) => {
          const [file] = event.target.files ? [...event.target.files] : [];
          if (file) {
            onPick(file);
          }
          event.target.value = "";
        }}
      />
    </>
  );
};

/** A mark that opens a menu of actions: one label, one icon, one chevron. */
export const QraftMenuButton = ({
  label,
  menuLabel,
  icon,
  isDisabled = false,
  children,
}: {
  readonly label: string;
  readonly menuLabel: string;
  readonly icon: React.ReactNode;
  readonly isDisabled?: boolean;
  readonly children: React.ReactNode;
}) => (
  <Menu>
    <Button intent="outline" isDisabled={isDisabled}>
      {icon}
      {label}
      <HiChevronDown aria-hidden="true" className="opacity-60" />
    </Button>
    <MenuContent aria-label={menuLabel} placement="bottom start">
      {children}
    </MenuContent>
  </Menu>
);

/**
 * A switch with its own label, for a style option that is on or off. A field
 * label prints with the form label voice, so it lines up with the field labels
 * beside it.
 */
export const QraftSwitch = ({
  label,
  isSelected,
  onChange,
  isFieldLabel = false,
}: {
  readonly label: string;
  readonly isSelected: boolean;
  readonly onChange: (value: boolean) => void;
  readonly isFieldLabel?: boolean;
}) => (
  <SwitchField isSelected={isSelected} onChange={onChange}>
    {isFieldLabel ? (
      <Switch>
        <Label data-slot="control-label" elementType="span">
          {label}
        </Label>
      </Switch>
    ) : (
      <Switch>{label}</Switch>
    )}
  </SwitchField>
);
