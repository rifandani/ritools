'use client'

import {
  CheckboxButton,
  type CheckboxButtonProps,
  CheckboxField as CheckboxFieldPrimitive,
  type CheckboxFieldProps,
} from "react-aria-components/Checkbox"
import {
  CheckboxGroup as CheckboxGroupPrimitive,
  type CheckboxGroupProps,
} from "react-aria-components/CheckboxGroup"
import { composeRenderProps } from "react-aria-components/composeRenderProps"
import { tv } from "tailwind-variants"
import { cx } from "@/core/utils/primitive"
import { Label } from "@/core/components/ui/field"

export function CheckboxGroup({ className, ...props }: CheckboxGroupProps) {
  return (
    <CheckboxGroupPrimitive
      {...props}
      data-slot="control"
      className={cx(
        "space-y-3 has-[[slot=description]]:not-has-[[slot=errorMessage]]:space-y-6 has-[[slot=description]]:**:data-[slot=control-label]:font-medium **:[[slot=description]]:block",
        "*:data-[slot=label]:mb-3 *:[[slot=errorMessage]]:mt-3",
        className
      )}
    />
  )
}

export function CheckboxField({ className, ...props }: CheckboxFieldProps) {
  return (
    <CheckboxFieldPrimitive
      data-slot="control"
      {...props}
      className={cx(
        "grid grid-cols-[1.25rem_1fr] gap-x-3 gap-y-1 sm:grid-cols-[1.125rem_1fr]",
        "*:data-[slot=control]:col-start-1 *:data-[slot=control]:row-start-1 *:data-[slot=control]:mt-0.75 sm:*:data-[slot=control]:mt-1",
        "*:[[slot=errorMessage]]:col-span-full",
        "**:data-[slot=control-label]:col-start-2 **:data-[slot=control-label]:row-start-1",
        "*:[[slot=description]]:col-start-2 *:[[slot=description]]:row-start-2",
        "has-[[slot=description]]:**:data-[slot=control-label]:font-medium",
        className
      )}
    />
  )
}

/*
 * A printed box: a 2px control edge at rest, an ink rule on hover, solid ink
 * when pressed or checked (the check or dash is the signal, not the fill),
 * a danger edge when invalid (hollow, with a doubled danger edge, when also
 * checked), faded and struck through when disabled. Focus brackets
 * the whole control, box and label. `[data-demo]` forces a state in the
 * Component Catalog.
 */
const checkboxStyles = tv({
  slots: {
    root: "bracket group relative col-span-full inline-flex gap-x-3 outline-hidden disabled:cursor-not-allowed",
    indicator: [
      "relative col-start-1 row-start-1 flex size-5 shrink-0 items-center justify-center border-2 border-input bg-(--control-bg,transparent) text-bg sm:size-4.5",
      "transition-[background-color,border-color] duration-90 ease-out",
      "group-hover:border-fg in-data-[demo=hover]:border-fg in-data-[demo=focus]:border-fg",
      "group-pressed:border-fg group-pressed:bg-fg in-data-[demo=pressed]:border-fg in-data-[demo=pressed]:bg-fg",
      "*:size-3.5 sm:*:size-3",
      "forced-colors:border-[ButtonText]",
    ],
    label:
      "col-start-2 row-start-1 font-normal decoration-2 decoration-muted-fg group-disabled:line-through",
  },
  variants: {
    isSelected: {
      false: {
        // An unchecked box on a row that prints the ink bar takes the bar's
        // foreground. Without this its ink hover edge would print ink on ink
        // and the box would vanish.
        indicator:
          "group-data-[hovered]/ink-bar:border-(--accent-fg) group-data-[selected]/ink-bar:border-(--accent-fg) group-data-[pressed]/ink-bar:border-(--accent-fg)",
      },
      true: {
        indicator:
          "border-fg bg-fg forced-colors:border-[Highlight] forced-colors:bg-[Highlight] forced-colors:text-[HighlightText]",
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
          "border-[color-mix(in_oklab,var(--input)_40%,var(--bg))] bg-transparent text-muted-fg group-hover:border-[color-mix(in_oklab,var(--input)_40%,var(--bg))] forced-colors:border-[GrayText] forced-colors:bg-transparent forced-colors:text-[GrayText]",
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
          "border-danger bg-transparent text-danger-subtle-fg shadow-[inset_0_0_0_2px_var(--danger)] *:size-3 sm:*:size-2.5 group-hover:outline-danger in-data-[demo=hover]:outline-danger forced-colors:border-[Mark] forced-colors:bg-transparent forced-colors:text-[Mark]",
      },
    },
  ],
})

export function Checkbox({ className, ...props }: CheckboxButtonProps) {
  return (
    <CheckboxButton
      className={composeRenderProps(className, (className) =>
        checkboxStyles().root({ className })
      )}
      {...props}
    >
      {composeRenderProps(
        props.children,
        (children, { isSelected, isIndeterminate, isInvalid, isDisabled }) => {
          const { indicator, label } = checkboxStyles({
            isSelected: isSelected || isIndeterminate,
            isInvalid,
            isDisabled,
          })

          return (
            <div className="grid grid-cols-[1.25rem_1fr] items-center gap-y-1 has-data-[slot=control-label]:gap-x-3 sm:grid-cols-[1.125rem_1fr]">
              <span data-slot="indicator" className={indicator()}>
                {isIndeterminate ? (
                  <svg data-slot="check-indicator" viewBox="0 0 12 12" aria-hidden>
                    <path d="M2 6h8" fill="none" stroke="currentColor" strokeWidth="2.5" />
                  </svg>
                ) : isSelected ? (
                  <svg data-slot="check-indicator" viewBox="0 0 12 12" aria-hidden>
                    <path
                      d="M1.75 6.25 4.75 9.25 10.25 3"
                      fill="none"
                      stroke="currentColor"
                      strokeLinecap="square"
                      strokeWidth="2.25"
                    />
                  </svg>
                ) : null}
              </span>
              <Label className={label()} data-slot="control-label" elementType="span">
                {children}
              </Label>
            </div>
          )
        }
      )}
    </CheckboxButton>
  )
}
