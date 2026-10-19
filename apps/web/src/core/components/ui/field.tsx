"use client"

import { HiExclamationTriangle } from "react-icons/hi2"
import {
  FieldError as FieldErrorPrimitive,
  type FieldErrorProps,
} from "react-aria-components/FieldError"
import { LabelContext, Label as LabelPrimitive, type LabelProps } from "react-aria-components/Label"
import { Text, type TextProps } from "react-aria-components/Text"
import { cn } from "cn"
import { tv } from "tailwind-variants"
import { cx } from "@/core/utils/primitive"

// Labels stay plain print: Archivo, sentence case, no ransom. A required field
// takes a bold ink asterisk: the glyph is the signal, and brand red stays out
// of semantic states.
export const labelStyles = tv({
  base: [
    "select-none font-semibold text-base/6 text-fg sm:text-sm/6",
    "in-data-required:not-data-[slot='control-label']:after:ms-1 in-data-required:not-data-[slot='control-label']:after:font-bold in-data-required:not-data-[slot='control-label']:after:text-fg in-data-required:not-data-[slot='control-label']:after:content-['*']",
    "in-disabled:pointer-events-none in-disabled:text-muted-fg group-disabled:text-muted-fg",
  ],
})

export const descriptionStyles = tv({
  base: "block text-muted-fg text-sm/6",
})

// An error is a line of text with an icon in the danger wash ink: never the
// hue alone.
export const fieldErrorStyles = tv({
  base: [
    "flex items-start gap-x-1.5 font-medium text-danger-subtle-fg text-sm/6 forced-colors:text-[Mark]",
    "*:data-[slot=icon]:mt-1 *:data-[slot=icon]:size-4 *:data-[slot=icon]:shrink-0",
  ],
})

export const fieldStyles = tv({
  base: [
    "w-full",
    "[&>[data-slot=control]+[data-slot=control]]:mt-2",
    "[&>[data-slot=label]+[data-slot=control]]:mt-2",
    "[&>[data-slot=label]+[slot='description']]:mt-1",
    "[&>[slot=description]+[data-slot=control]]:mt-2",
    "[&>[data-slot=control]+[slot=description]]:mt-2",
    "[&>[data-slot=control]+[slot=errorMessage]]:mt-2",
    "[&>[slot=description]+[slot=errorMessage]]:mt-1",
    "in-disabled:opacity-50 disabled:opacity-50",
  ],
})

/**
 * Fields whose control prints its own disabled state (a struck well, a struck
 * label) do not fade as a whole, so their text keeps its contrast.
 */
export const printedFieldStyles = tv({
  extend: fieldStyles,
  base: "in-disabled:opacity-100 disabled:opacity-100",
})

export function Label({ className, htmlFor, slot, ...props }: LabelProps) {
  const label = (
    <LabelPrimitive
      data-slot="label"
      htmlFor={htmlFor}
      slot={slot}
      {...props}
      className={labelStyles({ className })}
    />
  )

  if (htmlFor && slot === undefined) {
    return <LabelContext value={null}>{label}</LabelContext>
  }

  return label
}

export function Description({ className, ...props }: TextProps) {
  return <Text {...props} slot="description" className={descriptionStyles({ className })} />
}

export function Fieldset({ className, ...props }: React.ComponentProps<"fieldset">) {
  return (
    <fieldset
      className={cn(
        "*:data-[slot=text]:mt-1 [&>*+[data-slot=control]]:mt-6 [&>[data-slot=legend]+[slot=description]]:mt-3",
        className
      )}
      {...props}
    />
  )
}

export function FieldGroup({ className, ...props }: React.ComponentPropsWithoutRef<"div">) {
  return <div data-slot="control" className={cn("space-y-6", className)} {...props} />
}

export function FieldError({ className, children, ...props }: FieldErrorProps) {
  return (
    <FieldErrorPrimitive {...props} className={cx(fieldErrorStyles(), className)}>
      {(validation) => (
        <>
          <HiExclamationTriangle aria-hidden data-slot="icon" />
          <span>
            {typeof children === "function"
              ? children(validation)
              : (children ?? validation.validationErrors.join(" "))}
          </span>
        </>
      )}
    </FieldErrorPrimitive>
  )
}

// A legend names a group of fields: the group label voice over a 2px rule.
export function Legend({ className, ...props }: React.ComponentProps<"legend">) {
  return (
    <legend
      data-slot="legend"
      {...props}
      className={cn(
        "block w-full border-rule border-b-2 pb-2 font-bold text-xs/4 uppercase tracking-[0.08em] [font-stretch:87.5%] data-disabled:text-muted-fg",
        className
      )}
    />
  )
}
