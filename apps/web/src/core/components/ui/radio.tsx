"use client"

import { composeRenderProps } from "react-aria-components/composeRenderProps"
import {
  RadioButton,
  type RadioButtonProps,
  RadioField as RadioFieldPrimitive,
  type RadioFieldProps,
  RadioGroup as RadioGroupPrimitive,
  type RadioGroupProps,
} from "react-aria-components/RadioGroup"
import { tv } from "tailwind-variants"
import { cx } from "@/core/utils/primitive"
import { Label } from "@/core/components/ui/field"

export function RadioGroup({ className, ...props }: RadioGroupProps) {
  return (
    <RadioGroupPrimitive
      {...props}
      data-slot="control"
      className={cx(
        "space-y-3 has-[[slot=description]]:not-has-[[slot=errorMessage]]:space-y-6",
        "*:data-[slot=label]:mb-3 *:[[slot=errorMessage]]:mt-3",
        className
      )}
    />
  )
}

export function RadioField({ className, ...props }: RadioFieldProps) {
  return (
    <RadioFieldPrimitive
      {...props}
      className={cx(
        "grid grid-cols-[1.25rem_1fr] gap-x-3 gap-y-1 sm:grid-cols-[1.125rem_1fr]",
        "*:data-[slot=control]:col-start-1 *:data-[slot=control]:row-start-1 *:data-[slot=control]:mt-0.75 sm:*:data-[slot=control]:mt-1",
        "**:data-[slot=control-label]:col-start-2 **:data-[slot=control-label]:row-start-1",
        "*:[[slot=description]]:col-start-2 *:[[slot=description]]:row-start-2",
        "has-[[slot=description]]:**:data-[slot=control-label]:font-medium",
        className
      )}
      data-slot="control"
    />
  )
}

/*
 * The radio is the one round seal among the choice controls, so it never
 * reads as a checkbox. Its states follow the printed marks: control edge at
 * rest, ink rule on hover, solid ink when pressed or selected with a square
 * paper dot (the dot is the signal), a danger edge when invalid (hollow, with
 * a doubled danger edge, when also selected), faded and struck
 * through when disabled. Focus brackets the whole control.
 */
const radioStyles = tv({
  slots: {
    root: "bracket group relative col-span-full inline-flex gap-x-3 outline-hidden disabled:cursor-not-allowed",
    indicator: [
      "relative col-start-1 row-start-1 mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border-2 border-input bg-(--control-bg,transparent) sm:mt-0.75 sm:size-4.5",
      "transition-[background-color,border-color] duration-90 ease-out",
      "group-hover:border-fg in-data-[demo=hover]:border-fg in-data-[demo=focus]:border-fg",
      "group-pressed:border-fg group-pressed:bg-fg in-data-[demo=pressed]:border-fg in-data-[demo=pressed]:bg-fg",
      "before:size-1.5 before:bg-transparent before:content-['']",
      "forced-colors:border-[ButtonText]",
    ],
    label:
      "font-normal decoration-2 decoration-muted-fg group-disabled:line-through",
  },
  variants: {
    isSelected: {
      true: {
        indicator:
          "border-fg bg-fg before:bg-bg forced-colors:border-[Highlight] forced-colors:bg-[Highlight] forced-colors:before:bg-[HighlightText]",
      },
    },
    isInvalid: {
      true: {
        indicator: "border-danger group-hover:border-danger",
      },
    },
    isDisabled: {
      true: {
        indicator:
          "border-[color-mix(in_oklab,var(--input)_40%,var(--bg))] bg-transparent group-hover:border-[color-mix(in_oklab,var(--input)_40%,var(--bg))] forced-colors:border-[GrayText] forced-colors:bg-transparent",
      },
    },
  },
  compoundVariants: [
    // A filled box has an ink edge already, so hover doubles it outward.
    {
      isSelected: true,
      isDisabled: false,
      class: { indicator: "group-hover:outline-2 group-hover:outline-fg in-data-[demo=hover]:outline-2 in-data-[demo=hover]:outline-fg" },
    },
    // Selected and invalid prints hollow: the edge doubles in danger and the
    // glyph takes the danger wash ink. A fill would change only the hue.
    {
      isSelected: true,
      isInvalid: true,
      isDisabled: false,
      class: {
        indicator:
          "border-danger bg-transparent shadow-[inset_0_0_0_2px_var(--danger)] before:bg-danger-subtle-fg group-hover:outline-danger in-data-[demo=hover]:outline-danger forced-colors:border-[Mark] forced-colors:bg-transparent forced-colors:before:bg-[Mark]",
      },
    },
    {
      isSelected: true,
      isDisabled: true,
      class: { indicator: "before:bg-muted-fg forced-colors:before:bg-[GrayText]" },
    },
  ],
})

export function Radio({ className, children, ...props }: RadioButtonProps) {
  return (
    <RadioButton
      data-slot="control"
      className={composeRenderProps(className, (className) => radioStyles().root({ className }))}
      {...props}
    >
      {composeRenderProps(children, (children, { isSelected, isInvalid, isDisabled }) => {
        const { indicator, label } = radioStyles({ isSelected, isInvalid, isDisabled })
        return (
          <>
            <span data-slot="indicator" className={indicator()} />
            <Label className={label()} data-slot="control-label" elementType="span">
              {children}
            </Label>
          </>
        )
      })}
    </RadioButton>
  )
}
