"use client"

import {
  type DialogProps,
  DialogTrigger as DialogTriggerPrimitive,
} from "react-aria-components/Dialog"
import { Modal, ModalOverlay, type ModalOverlayProps } from "react-aria-components/Modal"
import { cx } from "@/core/utils/primitive"
import {
  Dialog,
  DialogBody,
  DialogClose,
  DialogCloseIcon,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./dialog"

const Sheet = DialogTriggerPrimitive

interface SheetContentProps
  extends
    Omit<ModalOverlayProps, "children">,
    Pick<DialogProps, "aria-label" | "role" | "aria-labelledby" | "children"> {
  closeButton?: boolean
  isFloat?: boolean
  side?: "top" | "bottom" | "left" | "right"
  overlay?: Omit<ModalOverlayProps, "children">
}

/**
 * Each side keeps its own rule and its own slam, so the sheet shows which
 * edge it came from. The lean is the slash angle, the only steep diagonal
 * the system draws.
 */
const sideVariants: Record<string, string> = {
  top: "inset-x-0 top-0 border-t-0 [--slam-y:-32px] [--slam-r:calc(var(--angle-slash)*1)]",
  bottom:
    "inset-x-0 bottom-0 border-b-0 [--slam-y:32px] [--slam-r:calc(var(--angle-slash)*-1)]",
  left: "inset-y-0 left-0 h-auto w-3/4 overflow-y-auto border-l-0 sm:max-w-80 [--slam-x:-32px] [--slam-r:calc(var(--angle-slash)*-1)]",
  right:
    "inset-y-0 right-0 h-auto w-3/4 overflow-y-auto border-r-0 sm:max-w-80 [--slam-x:32px] [--slam-r:calc(var(--angle-slash)*1)]",
}

const floatVariants: Record<string, string> = {
  top: "data-[float=true]:inset-x-2 data-[float=true]:top-2 data-[float=true]:border-t-2",
  bottom:
    "data-[float=true]:inset-x-2 data-[float=true]:bottom-2 data-[float=true]:border-b-2",
  left: "data-[float=true]:inset-y-2 data-[float=true]:left-2 data-[float=true]:border-l-2",
  right:
    "data-[float=true]:inset-y-2 data-[float=true]:right-2 data-[float=true]:border-r-2",
}

const SheetContent = ({
  className,
  isDismissable: isDismissableInternal,
  side = "right",
  role = "dialog",
  closeButton = true,
  isFloat = true,
  overlay,
  children,
  ...props
}: SheetContentProps) => {
  const isDismissable = isDismissableInternal ?? role !== "alertdialog"
  return (
    <ModalOverlay
      isDismissable={isDismissable}
      className={cx(
        "fixed start-0 top-0 z-50 size-full overflow-hidden",
        // A flat ink scrim. No blur, no glass.
        "bg-ink/50 dark:bg-ink/70",
        "entering:animate-[fade-in_160ms_ease-out] exiting:animate-[fade-out_140ms_ease-in]",
        overlay?.className
      )}
      {...props}
    >
      <Modal
        data-float={isFloat}
        className={cx(
          // White stock with a 2px rule. Square, no shadow, no ring.
          "border-rule fixed z-50 grid gap-4 border-2 bg-overlay text-overlay-fg",
          "[--visual-viewport-vertical-padding:16px]",
          sideVariants[side],
          floatVariants[side],
          // The panel slams in on the slash angle and shows where it came from.
          "entering:animate-note-slam exiting:animate-note-unpin",
          className
        )}
      >
        <Dialog
          className="sm:[--gutter:--spacing(6)]"
          aria-label={props["aria-label"] ?? undefined}
          role={role}
        >
          {(values) => (
            <>
              {typeof children === "function" ? children(values) : children}
              {closeButton && (
                <DialogCloseIcon className="end-2.5 top-2.5" isDismissable={isDismissable} />
              )}
            </>
          )}
        </Dialog>
      </Modal>
    </ModalOverlay>
  )
}

const SheetTrigger = DialogTrigger
const SheetFooter = DialogFooter
const SheetHeader = DialogHeader
const SheetTitle = DialogTitle
const SheetDescription = DialogDescription
const SheetBody = DialogBody
const SheetClose = DialogClose

export type { SheetContentProps }
export {
  Sheet,
  SheetBody,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
}
