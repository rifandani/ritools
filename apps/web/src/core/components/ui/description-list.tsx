'use client'

import { cn } from "cn"

const DescriptionList = ({ className, ref, ...props }: React.ComponentProps<"dl">) => {
  return (
    <dl
      ref={ref}
      className={cn(
        "grid grid-cols-1 text-sm/6 sm:grid-cols-[minmax(0,12rem)_minmax(0,1fr)]",
        className
      )}
      {...props}
    />
  )
}

/** The name of the field, in the Group Label voice, over a rule. */
const DescriptionTerm = ({ className, ref, ...props }: React.ComponentProps<"dt">) => {
  return (
    <dt
      ref={ref}
      className={cn(
        "col-start-1 py-2 text-xs font-bold uppercase tracking-[0.08em] [font-stretch:87.5%] text-muted-fg sm:border-b-2 sm:border-rule",
        className
      )}
      {...props}
    />
  )
}

/** The value. Figures in it take the one numerals face. */
const DescriptionDetails = ({ className, ...props }: React.ComponentProps<"dd">) => {
  return (
    <dd
      {...props}
      data-slot="description-details"
      className={cn(
        "col-start-1 border-b-2 border-rule py-2 text-fg sm:col-start-2",
        className
      )}
    />
  )
}

export { DescriptionDetails, DescriptionList, DescriptionTerm }
