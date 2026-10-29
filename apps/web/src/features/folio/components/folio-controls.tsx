import type { ReactNode } from "react";

import { Label } from "@/core/components/ui/field";
import { Input } from "@/core/components/ui/input";
import {
  NativeSelect,
  NativeSelectContent,
} from "@/core/components/ui/native-select";
import { TextField } from "@/core/components/ui/text-field";

export const FolioField = ({
  label,
  id,
  value,
  onChange,
  type = "text",
  disabled = false,
  required = false,
  maxLength,
  list,
  min,
  max,
  onKeyDown,
  onCompositionStart,
  onCompositionEnd,
  onBlur,
}: {
  readonly label: string;
  readonly id?: string;
  readonly value: string;
  readonly onChange: (value: string) => void;
  readonly type?: "text" | "number" | "password" | "search";
  readonly disabled?: boolean;
  readonly required?: boolean;
  readonly maxLength?: number;
  readonly list?: string;
  readonly min?: number;
  readonly max?: number;
  readonly onKeyDown?: React.KeyboardEventHandler<HTMLInputElement>;
  readonly onCompositionStart?: () => void;
  readonly onCompositionEnd?: () => void;
  readonly onBlur?: () => void;
}) => (
  <TextField
    value={value}
    onChange={onChange}
    isDisabled={disabled}
    isRequired={required}
    validationBehavior="aria"
    type={type}
  >
    <Label>{label}</Label>
    <Input
      id={id}
      maxLength={maxLength}
      list={list}
      className="min-h-11"
      min={min}
      max={max}
      onKeyDown={onKeyDown}
      onCompositionStart={onCompositionStart}
      onCompositionEnd={onCompositionEnd}
      onBlur={onBlur}
    />
  </TextField>
);

export const FolioSelect = ({
  label,
  id,
  value,
  onChange,
  children,
  disabled = false,
}: {
  readonly label: string;
  readonly id: string;
  readonly value: string;
  readonly onChange: (value: string) => void;
  readonly children: ReactNode;
  readonly disabled?: boolean;
}) => (
  <NativeSelect>
    <label className="mb-1 block text-sm font-bold" htmlFor={id}>
      {label}
    </label>
    <NativeSelectContent
      id={id}
      className="min-h-11"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
    >
      {children}
    </NativeSelectContent>
  </NativeSelect>
);
