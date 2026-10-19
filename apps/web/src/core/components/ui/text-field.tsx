'use client'

import {
  TextField as TextFieldPrimitive,
  type TextFieldProps,
} from "react-aria-components/TextField"
import { cx } from "@/core/utils/primitive"
import { printedFieldStyles } from "./field"

export function TextField({ className, ...props }: TextFieldProps) {
  return (
    <TextFieldPrimitive data-slot="control" className={cx(printedFieldStyles(), className)} {...props} />
  )
}
