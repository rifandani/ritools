'use client'

import {
  type DialogProps,
  DialogTrigger as DialogTriggerPrimitive,
  type DialogTriggerProps,
} from "react-aria-components/Dialog"

import {
  Modal as ModalPrimitive,
  ModalOverlay,
  type ModalOverlayProps,
} from "react-aria-components/Modal"
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

const Modal = (props: DialogTriggerProps) => {
  return <DialogTriggerPrimitive {...props} />
}

const sizes = {
  "2xs": "sm:max-w-2xs",
  xs: "sm:max-w-xs",
  sm: "sm:max-w-sm",
  md: "sm:max-w-md",
  lg: "sm:max-w-lg",
  xl: "sm:max-w-xl",
  "2xl": "sm:max-w-2xl",
  "3xl": "sm:max-w-3xl",
  "4xl": "sm:max-w-4xl",
  "5xl": "sm:max-w-5xl",
  fullscreen: "",
}

interface ModalContentProps
  extends
    Omit<ModalOverlayProps, "children">,
    Pick<DialogProps, "aria-label" | "aria-labelledby" | "role" | "children"> {
  size?: keyof typeof sizes
  closeButton?: boolean
  overlay?: Pick<ModalOverlayProps, "className">
}

const ModalContent = ({
  className,
  isDismissable: isDismissableInternal,
  children,
  overlay,
  size = "md",
  role = "dialog",
  closeButton = true,
  ...props
}: ModalContentProps) => {
  const isDismissable = isDismissableInternal ?? role !== "alertdialog"
  const isFullscreen = size === "fullscreen"
  return (
    <ModalOverlay
      data-slot="modal-overlay"
      isDismissable={isDismissable}
      className={cx(
        "fixed start-0 top-0 z-50 h-(--visual-viewport-height,100vh) w-screen overflow-hidden",
        // A flat ink scrim. Print has no blur and no glass.
        "bg-ink/50 dark:bg-ink/70",
        "grid grid-rows-[1fr_auto] justify-items-center sm:grid-rows-[1fr_auto_3fr]",
        "entering:animate-[fade-in_160ms_ease-out] exiting:animate-[fade-out_140ms_ease-in]",
        isFullscreen ? "md:p-3" : "md:p-4",
        overlay?.className
      )}
      {...props}
    >
      <ModalPrimitive
        data-slot="modal-content"
        className={cx(
          "row-start-2 w-full text-start align-middle",
          "[--visual-viewport-vertical-padding:16px]",
          isFullscreen
            ? "**:data-[slot=dialog-body]:min-h-[calc(var(--visual-viewport-height)-var(--visual-viewport-vertical-padding)-var(--dialog-header-height)-var(--dialog-footer-height))] sm:[--visual-viewport-vertical-padding:16px]"
            : "sm:[--visual-viewport-vertical-padding:32px]",
          // White stock with a 2px rule. No shadow, no ring, no radius.
          "border-rule relative overflow-hidden border-2 bg-overlay text-overlay-fg",
          sizes[size],
          // The panel slams in on the slash angle and shows where it came from.
          isFullscreen
            ? "[--slam-y:40px] [--slam-r:calc(var(--angle-tilt)*-1)]"
            : "[--slam-y:32px] [--slam-r:calc(var(--angle-slash)*-1)]",
          "entering:animate-note-slam exiting:animate-note-unpin",
          className
        )}
      >
        <Dialog role={role} aria-label={props["aria-label"] ?? undefined}>
          {(values) => (
            <>
              {typeof children === "function" ? children(values) : children}
              {closeButton && <DialogCloseIcon isDismissable={isDismissable} />}
            </>
          )}
        </Dialog>
      </ModalPrimitive>
    </ModalOverlay>
  )
}

const ModalTrigger = DialogTrigger
const ModalHeader = DialogHeader
const ModalTitle = DialogTitle
const ModalDescription = DialogDescription
const ModalFooter = DialogFooter
const ModalBody = DialogBody
const ModalClose = DialogClose

export {
  Modal,
  ModalBody,
  ModalClose,
  ModalContent,
  ModalDescription,
  ModalFooter,
  ModalHeader,
  ModalTitle,
  ModalTrigger,
}
