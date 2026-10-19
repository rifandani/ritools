'use client'

import { HiMinus, HiPlus } from "react-icons/hi2"
import { Button, type ButtonProps } from "react-aria-components/Button"
import type { InputProps as PrimitiveInputProps } from "react-aria-components/Input"
import {
  NumberField as NumberFieldPrimitive,
  type NumberFieldProps,
} from "react-aria-components/NumberField"
import { Input, InputGroup } from "@/core/components/ui/input"
import { cx } from "@/core/utils/primitive"
import { printedFieldStyles } from "./field"

const NumberField = ({ className, ...props }: NumberFieldProps) => {
  return (
    <NumberFieldPrimitive
      {...props}
      data-slot="control"
      className={cx(printedFieldStyles(), className)}
    />
  )
}

interface InputProps extends PrimitiveInputProps {
  ref?: React.RefObject<HTMLInputElement>
}

function NumberInput({ className, ...props }: InputProps) {
  return (
    // Two 44px steppers (36px from sm) sit inside the well's 2px rule.
    <InputGroup className="[--input-gutter-end:--spacing(21)]">
      {/* The value is a number: the one numerals face, tabular. */}
      <Input className={cx("num", className)} {...props} />
      <div data-slot="text" className="pointer-events-auto end-0.5 top-0.5! bottom-0.5! h-auto!">
        <div className="flex h-full items-stretch divide-x-2 divide-input border-input border-s-2 in-disabled:divide-[color-mix(in_oklab,var(--input)_40%,var(--bg))] in-disabled:border-[color-mix(in_oklab,var(--input)_40%,var(--bg))]">
          <StepperButton slot="decrement" />
          <StepperButton slot="increment" />
        </div>
      </div>
    </InputGroup>
  )
}

interface StepperButtonProps extends ButtonProps {
  slot: "increment" | "decrement"
  className?: string
}

// A stepper is a small printed mark: ink on hover, solid ink when pressed, and
// faded at its bound (the value cannot move that way).
const StepperButton = ({ slot, className, ...props }: StepperButtonProps) => {
  return (
    <Button
      className={cx(
        "inline-grid min-w-11 place-content-center text-muted-fg outline-hidden sm:min-w-9",
        "hover:text-fg pressed:bg-fg pressed:text-bg",
        "*:data-[slot=stepper-icon]:size-5 sm:*:data-[slot=stepper-icon]:size-4",
        "disabled:cursor-not-allowed disabled:text-muted-fg/45",
        "forced-colors:text-[ButtonText] forced-colors:disabled:text-[GrayText]",
        // The Component Catalog prints the increment stepper pressed.
        slot === "increment" && "in-data-[demo=pressed]:bg-fg in-data-[demo=pressed]:text-bg",
        className
      )}
      slot={slot}
      {...props}
    >
      {slot === "increment" ? (
        <HiPlus data-slot="stepper-icon" />
      ) : (
        <HiMinus data-slot="stepper-icon" />
      )}
    </Button>
  )
}

export type { NumberFieldProps }
export { NumberField, NumberInput }
