'use client'

import { HiXMark } from "react-icons/hi2"
import { Dialog as PrimitiveDialog } from "react-aria-components/Dialog"
import { Heading, type HeadingProps } from "react-aria-components/Heading"
import type { TextProps } from "react-aria-components/Text"
import { cn } from "cn"
import { cx } from "@/core/utils/primitive"
import { Button, type ButtonProps } from "./button"

const Dialog = ({
  role = "dialog",
  className,
  ...props
}: React.ComponentProps<typeof PrimitiveDialog>) => {
  return (
    <PrimitiveDialog
      data-slot="dialog"
      role={role}
      className={cn(
        "peer/dialog group/dialog relative flex max-h-[calc(var(--visual-viewport-height)-var(--visual-viewport-vertical-padding))] flex-col overflow-hidden outline-hidden [--gutter:--spacing(5)] sm:[--gutter:--spacing(6)]",
        className
      )}
      {...props}
    />
  )
}

const DialogTrigger = ({ className, ...props }: ButtonProps) => (
  <Button className={cx("cursor-pointer", className)} {...props} />
)

interface DialogHeaderProps extends Omit<React.ComponentProps<"div">, "title"> {
  title?: string
  description?: string
}

const DialogHeader = ({ className, ...props }: DialogHeaderProps) => {
  return (
    <div
      data-slot="dialog-header"
      className={cn(
        // A hard rule closes the header, the way it closes a column on paper.
        "border-rule relative space-y-2 border-b-2 p-(--gutter) pb-[calc(var(--gutter)---spacing(3))]",
        className
      )}
    >
      {props.title && <DialogTitle>{props.title}</DialogTitle>}
      {props.description && <DialogDescription>{props.description}</DialogDescription>}
      {!props.title && typeof props.children === "string" ? (
        <DialogTitle>{props.children}</DialogTitle>
      ) : (
        props.children
      )}
    </div>
  )
}

interface DialogTitleProps extends HeadingProps {
  ref?: React.Ref<HTMLHeadingElement>
}
const DialogTitle = ({ className, ref, children, ...props }: DialogTitleProps) => (
  <Heading
    slot="title"
    ref={ref}
    // A dialog title is plain Title text, never ransom.
    className={cn(
      "text-balance font-display font-extrabold text-lg/6 uppercase tracking-[0.02em] [font-stretch:75%]",
      className
    )}
    {...props}
  >
    {children}
  </Heading>
)

interface DialogDescriptionProps extends TextProps {
  ref?: React.Ref<HTMLDivElement>
}
const DialogDescription = ({ className, ref, ...props }: DialogDescriptionProps) => (
  <p
    data-slot="description"
    className={cn(
      "text-pretty text-muted-fg text-sm/6",
      className
    )}
    ref={ref}
    {...props}
  />
)

interface DialogBodyProps extends React.ComponentProps<"div"> {}
const DialogBody = ({ className, ...props }: DialogBodyProps) => (
  <div
    data-slot="dialog-body"
    className={cn(
      "isolate flex min-h-0 flex-1 flex-col overflow-auto px-(--gutter) py-4",
      "**:data-[slot=dialog-footer]:px-0 **:data-[slot=dialog-footer]:pt-0",
      className
    )}
    {...props}
  />
)

interface DialogFooterProps extends React.ComponentProps<"div"> {}
const DialogFooter = ({ className, ...props }: DialogFooterProps) => {
  return (
    <div
      data-slot="dialog-footer"
      className={cn(
        "border-rule isolate mt-auto flex flex-col-reverse justify-end gap-3 border-t-2 px-(--gutter) pt-3 pb-(--gutter) sm:flex-row",
        className
      )}
      {...props}
    />
  )
}

const DialogClose = ({ intent = "plain", ref, ...props }: ButtonProps) => {
  return <Button slot="close" ref={ref} intent={intent} {...props} />
}

interface CloseButtonIndicatorProps extends Omit<ButtonProps, "children"> {
  className?: string
  isDismissable?: boolean | undefined
}

const DialogCloseIcon = ({ className, isDismissable, ...props }: CloseButtonIndicatorProps) => {
  return isDismissable ? (
    <Button
      slot="close"
      // A caller's label wins, so a translated one can be passed in.
      aria-label="Close"
      intent="outline"
      size="sq-sm"
      className={cx(
        // A printed mark: an outline at rest, solid when pressed, a heavy
        // bracket on focus. Never a rounded chip.
        "absolute end-2 top-2 z-50",
        className
      )}
      {...props}
    >
      <HiXMark />
    </Button>
  ) : null
}

export type {
  CloseButtonIndicatorProps,
  DialogBodyProps,
  DialogDescriptionProps,
  DialogFooterProps,
  DialogHeaderProps,
  DialogTitleProps,
}
export {
  Dialog,
  DialogBody,
  DialogClose,
  DialogCloseIcon,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
}
