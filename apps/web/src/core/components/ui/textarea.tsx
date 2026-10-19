"use client"

import {
  TextArea,
  type TextAreaProps as TextAreaPrimitiveProps,
} from "react-aria-components/TextArea"
import { cx } from "@/core/utils/primitive"

interface TextAreaProps extends TextAreaPrimitiveProps {
  ref?: React.Ref<HTMLTextAreaElement>
}
export function Textarea({ className, ref, ...props }: TextAreaProps) {
  return (
    // The well carries the rule, the bracket, and the strike (globals.css).
    // No resize grip: its hatch is a third diagonal, and the box grows with
    // its content (field-sizing).
    <span data-slot="control" className="well bracket w-full">
      <TextArea
        {...props}
        ref={ref}
        className={cx(
          "field-sizing-content relative block min-h-24 w-full resize-none appearance-none bg-transparent px-[calc(--spacing(3.5)-2px)] py-[calc(--spacing(2.5)-2px)] sm:px-[calc(--spacing(3)-2px)] sm:py-[calc(--spacing(2)-2px)]",
          "text-base/6 placeholder:text-muted-fg sm:text-sm/6",
          "outline-hidden disabled:cursor-not-allowed",
          "forced-colors:in-disabled:text-[GrayText]",
          "dark:scheme-dark",
          className
        )}
      />
    </span>
  )
}
