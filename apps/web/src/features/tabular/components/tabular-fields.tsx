import { Label } from "@/core/components/ui/field";
import { Input } from "@/core/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/core/components/ui/select";
import { TextField } from "@/core/components/ui/text-field";

export interface TabularSelectOption {
  readonly id: string;
  readonly label: string;
}

export const TabularSelect = ({
  label,
  id,
  value,
  onChange,
  options,
  placeholder,
  disabled = false,
}: {
  readonly id?: string;
  readonly label: string;
  readonly value: string;
  readonly onChange: (value: string) => void;
  readonly options: readonly TabularSelectOption[];
  readonly placeholder?: string;
  readonly disabled?: boolean;
}) => (
  <Select
    className="min-w-0"
    selectedKey={value === "" ? null : value}
    placeholder={placeholder}
    isDisabled={disabled}
    onSelectionChange={(key) => {
      if (key !== null) {
        onChange(String(key));
      }
    }}
  >
    <Label>{label}</Label>
    <SelectTrigger id={id} />
    <SelectContent items={options}>
      {(option) => (
        <SelectItem id={option.id} textValue={option.label}>
          {option.label}
        </SelectItem>
      )}
    </SelectContent>
  </Select>
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
