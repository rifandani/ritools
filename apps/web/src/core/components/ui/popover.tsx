"use client"

import {
  DialogTrigger as DialogTriggerPrimitive,
  type DialogTriggerProps,
} from "react-aria-components/Dialog"
import {
  OverlayArrow,
  Popover as PopoverPrimitive,
  type PopoverProps,
} from "react-aria-components/Popover"
import { cx } from "@/core/utils/primitive"
import {
  DialogBody,
  DialogClose,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./dialog"

const Popover = (props: DialogTriggerProps) => {
  return <DialogTriggerPrimitive {...props} />
}

const PopoverTitle = DialogTitle
const PopoverHeader = DialogHeader
const PopoverBody = DialogBody
const PopoverFooter = DialogFooter

interface PopoverContentProps extends PopoverProps {
  arrow?: boolean
  ref?: React.Ref<HTMLDivElement>
}

const PopoverContent = ({
  children,
  arrow = false,
  className,
  ref,
  ...props
}: PopoverContentProps) => {
  const offset = props.offset ?? (arrow ? 12 : 8)
  return (
    <PopoverPrimitive
      ref={ref}
      offset={offset}
      className={cx(
        "[--visual-viewport-vertical-padding:16px] sm:[--visual-viewport-vertical-padding:32px]",
        "max-h-[calc(var(--visual-viewport-height)-var(--visual-viewport-vertical-padding)*2)]",
        // White stock, a 2px rule, square. At most 20rem wide.
        "group/popover min-w-(--trigger-width) max-w-xs origin-(--trigger-anchor-point) rounded-none border-2 border-rule bg-overlay text-overlay-fg outline-hidden [--gutter:--spacing(5)] text-base sm:text-sm **:[[role=dialog]]:[--gutter:--spacing(5)]",
        // A note pinned under its trigger: it drops in from a tilt and settles.
        "entering:animate-note-drop exiting:animate-note-lift",
        "forced-colors:bg-[Canvas]",
        className
      )}
      {...props}
    >
      {(values) => (
        <>
          {arrow && (
            <OverlayArrow className="group">
              {/* The tab is a square of the same stock, so the note reads as
                  one cut shape. It breaks the rule where it meets the note. */}
              <span className="block size-3 bg-overlay group-placement-bottom:translate-y-0.5 group-placement-left:translate-x-0.5 group-placement-right:-translate-x-0.5 group-placement-top:-translate-y-0.5" />
            </OverlayArrow>
          )}
          <div data-slot="popover-inner" className="max-h-[inherit] overflow-y-auto flex flex-col">
            {typeof children === "function" ? children(values) : children}
          </div>
        </>
      )}
    </PopoverPrimitive>
  )
}

const PopoverTrigger = DialogTrigger
const PopoverClose = DialogClose
const PopoverDescription = DialogDescription

export type { PopoverContentProps, PopoverProps }
export {
  Popover,
  PopoverBody,
  PopoverClose,
  PopoverContent,
  PopoverDescription,
  PopoverFooter,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
}
