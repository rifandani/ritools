"use client"

import { AnimatePresence, motion, useReducedMotion } from "motion/react"
import { use } from "react"
import type { DialogProps, DialogTriggerProps } from "react-aria-components/Dialog"
import { Dialog, DialogTrigger, OverlayTriggerStateContext } from "react-aria-components/Dialog"
import { Heading, type HeadingProps } from "react-aria-components/Heading"
import {
  Modal as ModalPrimitive,
  ModalOverlay,
  type ModalOverlayProps,
} from "react-aria-components/Modal"
import { Text, type TextProps } from "react-aria-components/Text"
import { twJoin, cn } from "cn"
import { cx } from "@/core/utils/primitive"
import { Button, type ButtonProps } from "./button"
import { Ransom } from "./ransom"

const DrawerRoot = motion.create(ModalPrimitive)
const DrawerOverlay = motion.create(ModalOverlay)

/** The expo ease, the only easing the system uses. */
const SLAM = { duration: 0.34, ease: [0.16, 1, 0.3, 1] as const }

const Drawer = (props: DialogTriggerProps) => <DialogTrigger {...props} />

interface DrawerContentProps
  extends
    Omit<ModalOverlayProps, "className" | "children" | "isDismissable">,
    Pick<DialogProps, "aria-label" | "aria-labelledby" | "role" | "children" | "className"> {
  isFloat?: boolean
  className?: string
  overlay?: Pick<ModalOverlayProps, "className">
  side?: "top" | "bottom" | "left" | "right"
  notch?: boolean
}

const DrawerContent = ({
  side = "bottom",
  isFloat = false,
  notch = true,
  children,
  className,
  overlay,
  ...props
}: DrawerContentProps) => {
  const state = use(OverlayTriggerStateContext)!
  const isOpen = props.isOpen ?? state?.isOpen ?? false
  const onOpenChange = props.onOpenChange ?? state?.setOpen
  const reduced = useReducedMotion()

  // The panel leans on the slash angle and shows the edge it came from.
  const from =
    side === "left"
      ? { x: "-100%", rotate: -16 }
      : side === "right"
        ? { x: "100%", rotate: 16 }
        : side === "top"
          ? { y: "-100%", rotate: 16 }
          : { y: "100%", rotate: -16 }

  return (
    <AnimatePresence>
      {isOpen && (
        <DrawerOverlay
          isDismissable
          isOpen={isOpen}
          onOpenChange={onOpenChange}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: reduced ? 0 : 0.16, ease: "easeOut" }}
          className={cx(
            "fixed inset-0 z-50 will-change-auto [--visual-viewport-vertical-padding:32px]",
            // A flat ink scrim. Print has no blur.
            "bg-ink/50 dark:bg-ink/70",
            overlay?.className
          )}
        >
          {({ state }) => (
            <DrawerRoot
              className={twJoin(
                "border-rule fixed max-h-full touch-none overflow-hidden border-2 bg-overlay text-overlay-fg",
                side === "top" && (isFloat ? "inset-x-2 top-2" : "inset-x-0 top-0 border-t-0"),
                side === "right" && [
                  "w-full max-w-xs overflow-y-auto",
                  "**:[[slot=header]]:text-start",
                  isFloat ? "inset-y-2 right-2" : "inset-y-0 right-0 h-auto border-r-0",
                ],
                side === "bottom" &&
                  (isFloat ? "inset-x-2 bottom-2" : "inset-x-0 bottom-0 border-b-0"),
                side === "left" && [
                  "w-full max-w-xs overflow-y-auto",
                  "**:[[slot=header]]:text-start",
                  isFloat ? "inset-y-2 left-2" : "inset-y-0 left-0 h-auto border-l-0",
                ],
                className
              )}
              initial={reduced ? { opacity: 1 } : { ...from, opacity: 0 }}
              animate={{ x: 0, y: 0, rotate: 0, opacity: 1 }}
              exit={reduced ? { opacity: 0 } : { ...from, opacity: 0 }}
              drag={side === "left" || side === "right" ? "x" : "y"}
              whileDrag={{ cursor: "grabbing" }}
              dragConstraints={{
                top: 0,
                bottom: 0,
                left: 0,
                right: 0,
              }}
              dragTransition={{
                bounceStiffness: 600,
                bounceDamping: 20,
              }}
              transition={reduced ? { duration: 0 } : SLAM}
              onDragEnd={(_, { offset, velocity }) => {
                if (side === "bottom" && (velocity.y > 150 || offset.y > screen.height * 0.25)) {
                  state.close()
                }
                if (side === "top" && (velocity.y < -150 || offset.y < screen.height * 0.25)) {
                  state.close()
                }
                if (side === "left" && velocity.x < -150) {
                  state.close()
                }
                if (side === "right" && velocity.x > 150) {
                  state.close()
                }
              }}
              dragElastic={{
                top: side === "top" ? 1 : 0,
                bottom: side === "bottom" ? 1 : 0,
                left: side === "left" ? 1 : 0,
                right: side === "right" ? 1 : 0,
              }}
              dragPropagation
            >
              <Dialog
                aria-label="Drawer"
                role="dialog"
                className={twJoin(
                  "relative flex flex-col overflow-hidden outline-hidden will-change-auto",
                  side === "top" || side === "bottom"
                    ? "mx-auto max-h-[calc(var(--visual-viewport-height)-var(--visual-viewport-vertical-padding))] max-w-lg"
                    : "h-full"
                )}
              >
                {notch && side === "bottom" && (
                  <div className="notch sticky top-0 mx-auto mt-2.5 h-0.5 w-10 shrink-0 touch-pan-y bg-muted-fg" />
                )}
                {children as React.ReactNode}
                {notch && side === "top" && (
                  <div className="notch sticky bottom-0 mx-auto mb-2.5 h-0.5 w-10 shrink-0 touch-pan-y bg-muted-fg" />
                )}
              </Dialog>
            </DrawerRoot>
          )}
        </DrawerOverlay>
      )}
    </AnimatePresence>
  )
}

const DrawerHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => {
  return (
    <div
      slot="header"
      className={cn(
        "border-rule flex flex-col gap-1 border-b-2 p-5 text-start",
        className
      )}
      {...props}
    />
  )
}

const DrawerTitle = ({ className, children, ...props }: HeadingProps) => (
  <Heading slot="title" className={cn("text-balance", className)} {...props}>
    {typeof children === "string" ? (
      <Ransom as="span" className="text-lg leading-none" fit>
        {children}
      </Ransom>
    ) : (
      children
    )}
  </Heading>
)

const DrawerDescription = ({ className, ...props }: TextProps) => (
  <Text slot="description" className={cn("text-muted-fg text-sm/6", className)} {...props} />
)

const DrawerBody = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    slot="body"
    className={cn(
      "isolate flex max-h-[calc(var(--visual-viewport-height)-var(--visual-viewport-vertical-padding))] flex-col overflow-auto px-5 py-4 will-change-scroll",
      className
    )}
    {...props}
  />
)

const DrawerFooter = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => {
  return (
    <div
      slot="footer"
      className={cn(
        "border-rule isolate mt-auto flex flex-col-reverse justify-end gap-2 border-t-2 px-5 pt-3 pb-5 sm:flex-row",
        className
      )}
      {...props}
    />
  )
}

const DrawerClose = ({ intent = "outline", ref, className, ...props }: ButtonProps) => {
  return <Button slot="close" className={className} ref={ref} intent={intent} {...props} />
}

const DrawerTrigger = (props: ButtonProps) => <Button intent="outline" {...props} />

export type { DrawerContentProps }
export {
  Drawer,
  DrawerBody,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
}
