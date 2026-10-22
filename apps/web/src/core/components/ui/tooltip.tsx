"use client"

import { composeRenderProps } from "react-aria-components/composeRenderProps"
import type { TooltipProps as TooltipPrimitiveProps } from "react-aria-components/Tooltip"
import {
  OverlayArrow,
  Tooltip as TooltipPrimitive,
  TooltipTrigger as TooltipTriggerPrimitive,
} from "react-aria-components/Tooltip"
import { twJoin } from "cn"
import type { VariantProps } from "tailwind-variants"
import { tv } from "tailwind-variants"
import { Button } from "./button"

const tooltipStyles = tv({
  base: [
    // A small note: white stock, a 2px rule, square, never a rounded chip.
    "group max-w-sm origin-(--trigger-anchor-point) rounded-none border-2 border-rule bg-overlay px-2.5 py-1.5 text-base/6 will-change-transform sm:text-sm/6 *:[strong]:font-medium",
    // The note drops toward its trigger, from the side it sits on.
    "placement-bottom:[--tip-y:-6px] placement-left:[--tip-x:6px] placement-right:[--tip-x:-6px] placement-top:[--tip-y:6px]",
  ],
  variants: {
    inverse: {
      true: ["border-transparent bg-fg text-bg", "**:[.text-muted-fg]:text-bg/60"],
      false: "bg-overlay text-overlay-fg",
    },
    isEntering: {
      true: "animate-note-tip",
    },
    isExiting: {
      true: "animate-note-untip",
    },
  },
  defaultVariants: {
    inverse: false,
  },
})

type TooltipProps = React.ComponentProps<typeof TooltipTriggerPrimitive>
const Tooltip = (props: TooltipProps) => <TooltipTriggerPrimitive {...props} />

interface TooltipContentProps
  extends Omit<TooltipPrimitiveProps, "children">, VariantProps<typeof tooltipStyles> {
  arrow?: boolean
  children?: React.ReactNode
}

const TooltipContent = ({
  offset = 10,
  arrow = true,
  inverse,
  children,
  ...props
}: TooltipContentProps) => {
  return (
    <TooltipPrimitive
      {...props}
      offset={offset}
      className={composeRenderProps(props.className, (className, renderProps) =>
        tooltipStyles({
          ...renderProps,
          inverse,
          className,
        })
      )}
    >
      {arrow && (
        <OverlayArrow className="group">
          {/* The tab is a square of the same stock, so the note reads as one
              cut shape. It breaks the rule where it meets the note. */}
          <span
            className={twJoin(
              "block size-3",
              inverse ? "bg-fg" : "bg-overlay",
              "group-placement-bottom:translate-y-0.5 group-placement-left:translate-x-0.5 group-placement-right:-translate-x-0.5 group-placement-top:-translate-y-0.5"
            )}
          />
        </OverlayArrow>
      )}
      {children}
    </TooltipPrimitive>
  )
}

/** The trigger is a printed mark, like every other control. */
const TooltipTrigger = Button

export type { TooltipContentProps, TooltipProps }
export { Tooltip, TooltipContent, TooltipTrigger }
