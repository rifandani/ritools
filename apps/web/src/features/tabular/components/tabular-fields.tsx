import { Label } from "@/core/components/ui/field";
import { Input } from "@/core/components/ui/input";
import {
  NativeSelect,
  NativeSelectContent,
} from "@/core/components/ui/native-select";
import { TextField } from "@/core/components/ui/text-field";

export const TabularSelect = ({
  label,
  id,
  value,
  onChange,
  children,
  disabled = false,
}: {
  readonly id?: string;
  readonly label: string;
  readonly value: string;
  readonly onChange: (value: string) => void;
  readonly children: React.ReactNode;
  readonly disabled?: boolean;
}) => (
  <label className="flex min-w-0 flex-col gap-1 text-sm font-semibold">
    {label}
    <NativeSelect>
      <NativeSelectContent
        id={id}
        disabled={disabled}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        {children}
      </NativeSelectContent>
    </NativeSelect>
  </label>
);

// oxlint-disable-next-line eslint/no-unused-vars -- Kept with the shared field controls.
const TabularText = ({
  label,
  value,
  onChange,
  type = "text",
  min,
  max,
}: {
  readonly label: string;
  readonly value: string;
  readonly onChange: (value: string) => void;
  readonly type?: "text" | "number";
  readonly min?: number;
  readonly max?: number;
}) => (
  <TextField value={value} onChange={onChange}>
    <Label>{label}</Label>
    <Input type={type} min={min} max={max} />
  </TextField>
);
