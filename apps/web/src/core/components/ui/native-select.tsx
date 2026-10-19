'use client'

import { HiChevronUpDown } from "react-icons/hi2"
import { cn } from "cn"
import { printedFieldStyles } from "@/core/components/ui/field"

export function NativeSelect({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="control"
      className={printedFieldStyles({
        className: cn("relative w-full", className),
      })}
      {...props}
    />
  )
}

export interface NativeSelectContentProps extends React.ComponentProps<"select"> {
  isInvalid?: boolean
}
export function NativeSelectContent({ className, isInvalid, ...props }: NativeSelectContentProps) {
  return (
    // The well carries the rule, the bracket, and the strike (globals.css).
    <div data-slot="control" className="well bracket flex items-center">
      <select
        data-slot="select"
        aria-invalid={isInvalid ? "true" : undefined}
        className={cn(
          "relative block w-full appearance-none bg-transparent py-[calc(--spacing(2.5)-2px)] ps-[calc(--spacing(3.5)-2px)] pe-10 sm:py-[calc(--spacing(2)-2px)] sm:ps-[calc(--spacing(3)-2px)] sm:pe-8",
          "text-base/6 sm:text-sm/6",
          "outline-hidden disabled:cursor-not-allowed",
          "forced-colors:in-disabled:text-[GrayText]",
          "dark:scheme-dark",
          className
        )}
        {...props}
      />
      <HiChevronUpDown className="pointer-events-none absolute end-3 top-1/2 size-5 -translate-y-1/2 text-muted-fg sm:end-2.5 sm:size-4" />
    </div>
  )
}
