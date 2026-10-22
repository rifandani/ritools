"use client"

import { HiMinus } from "react-icons/hi2"
import { OTPInput, OTPInputContext } from "input-otp"
import { use } from "react"
import { cn } from "cn"
import { Label, printedFieldStyles } from "@/core/components/ui/field"

export function InputOTP({
  containerClassName,
  ...props
}: React.ComponentPropsWithoutRef<typeof OTPInput>) {
  return (
    <span data-slot="control" className="relative block">
      <OTPInput
        data-slot="input-otp"
        containerClassName={cn(
          // The whole code takes one bracket on focus and one strike when disabled.
          printedFieldStyles({
            className:
              "group/otp bracket bracket-within strike-within relative flex w-fit items-center gap-2 has-disabled:cursor-not-allowed",
          }),
          containerClassName
        )}
        {...props}
      />
    </span>
  )
}

export function InputOTPControl({ className, ...props }: React.ComponentProps<"span">) {
  return <span data-slot="control" className={cn("flex items-center gap-2", className)} {...props} />
}

export function InputOTPGroup({ className, ...props }: React.ComponentProps<"div">) {
  return (
    // Slots share their 2px rules: each one pulls 2px over its neighbor.
    <div
      data-slot="input-otp-group"
      className={cn("flex items-center ps-0.5 *:-ms-0.5", className)}
      {...props}
    />
  )
}

export function InputOTPSlot({
  index,
  className,
  ...props
}: React.ComponentProps<"div"> & {
  index: number
}) {
  const inputOTPContext = use(OTPInputContext)
  const { char, hasFakeCaret, isActive } = inputOTPContext?.slots[index] ?? {}

  return (
    <div
      data-slot="input-otp-slot"
      data-active={isActive}
      className={cn(
        "num relative flex size-11 items-center justify-center border-2 border-input bg-(--control-bg,transparent) font-semibold text-fg text-lg sm:size-10 sm:text-base",
        "transition-[border-color,box-shadow] duration-100",
        // The active slot prints a doubled ink rule above its neighbors.
        "data-[active=true]:z-10 data-[active=true]:border-fg data-[active=true]:inset-ring-2 data-[active=true]:inset-ring-fg",
        "aria-invalid:z-[5] aria-invalid:border-danger aria-invalid:inset-ring-2 aria-invalid:inset-ring-danger",
        "group-has-disabled/otp:border-[color-mix(in_oklab,var(--input)_40%,var(--bg))] group-has-disabled/otp:text-muted-fg",
        "forced-colors:data-[active=true]:border-[Highlight]",
        className
      )}
      {...props}
    >
      {char}
      {hasFakeCaret && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="h-5 w-0.5 animate-caret-blink bg-primary-ink duration-1000" />
        </div>
      )}
    </div>
  )
}

export function InputOTPSeparator({ ...props }: React.ComponentProps<"div">) {
  return (
    <div data-slot="input-otp-separator" className="flex items-center text-muted-fg" {...props}>
      <HiMinus className="size-4" />
    </div>
  )
}

export function InputOTPLabel(props: React.ComponentProps<typeof Label>) {
  return <Label elementType="span" data-slot="control-label" {...props} />
}
