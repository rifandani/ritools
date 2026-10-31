"use client";

import { useRef } from "react";

import { Button } from "@/core/components/ui/button";
import { Label } from "@/core/components/ui/field";
import { Input } from "@/core/components/ui/input";
import { NumberField, NumberInput } from "@/core/components/ui/number-field";
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
}: {
  readonly id?: string;
  readonly label: string;
  readonly accept: readonly string[];
  readonly onPick: (file: File) => void;
  readonly isDisabled?: boolean;
  readonly intent?: "outline" | "plain";
}) => {
  const input = useRef<HTMLInputElement>(null);
  return (
    <>
      <Button
        intent={intent}
        isDisabled={isDisabled}
        onPress={() => input.current?.click()}
      >
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

/** A switch with its own label, for a style option that is on or off. */
export const QraftSwitch = ({
  label,
  isSelected,
  onChange,
}: {
  readonly label: string;
  readonly isSelected: boolean;
  readonly onChange: (value: boolean) => void;
}) => (
  <SwitchField isSelected={isSelected} onChange={onChange}>
    <Switch>{label}</Switch>
  </SwitchField>
);
