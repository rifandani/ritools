'use client'

import { use } from "react"
import { Button, type ButtonProps } from "react-aria-components/Button"
import { composeRenderProps } from "react-aria-components/composeRenderProps"
import {
  Disclosure as PrimitiveDisclosure,
  type DisclosureProps,
} from "react-aria-components/Disclosure"
import type {
  DisclosureGroupProps,
  DisclosurePanelProps,
} from "react-aria-components/DisclosureGroup"
import {
  DisclosureGroup as PrimitiveDisclosureGroup,
  DisclosurePanel as PrimitiveDisclosurePanel,
  DisclosureStateContext,
} from "react-aria-components/DisclosureGroup"
import { Heading } from "react-aria-components/Heading"
import { twJoin, cn } from "cn"
import { cx } from "@/core/utils/primitive"

export function DisclosureGroup({ className, ...props }: DisclosureGroupProps) {
  return (
    <PrimitiveDisclosureGroup
      className={cx(
        // One closed frame, and the rows share the rules inside it.
        "border-rule divide-rule flex flex-col divide-y-2 border-2 bg-card",
        className
      )}
      {...props}
    />
  )
}

export function Disclosure({ className, ...props }: DisclosureProps) {
  return (
    <PrimitiveDisclosure
      className={composeRenderProps(className, (className) =>
        cn("group/disclosure-item", className)
      )}
      {...props}
    />
  )
}

export interface DisclosureTriggerProps extends ButtonProps {
  ref?: React.Ref<HTMLButtonElement>
  triggerIndicator?: boolean
}

export function DisclosureTrigger({
  ref,
  className,
  triggerIndicator = true,
  ...props
}: DisclosureTriggerProps) {
  const state = use(DisclosureStateContext)!
  return (
    <Heading>
      <Button
        {...props}
        ref={ref}
        slot="trigger"
        className={cx(
          [
            // A printed label with the heavy bracket on focus.
            "bracket relative isolate flex w-full cursor-default items-center justify-between gap-3 px-4 py-3 text-start font-semibold outline-hidden",
            "text-sm/6",
            // Muted at rest, ink on hover, solid when pressed.
            "text-muted-fg",
            "data-hovered:text-fg in-data-[demo=hover]:text-fg",
            "data-pressed:bg-fg data-pressed:text-bg in-data-[demo=pressed]:bg-fg in-data-[demo=pressed]:text-bg",
            "data-disabled:text-muted-fg data-disabled:line-through in-data-[demo=disabled]:line-through",
            "[&_svg:not([class*='size-'])]:size-5 sm:[&_svg:not([class*='size-'])]:size-4 **:[svg]:shrink-0",
          ],
          // The open row is ink and bold: the state reads by weight.
          state.isExpanded ? "text-fg font-bold" : "font-semibold",
          className
        )}
      >
        {(values) => (
          <>
            {typeof props.children === "function" ? props.children(values) : props.children}
            {triggerIndicator && <DisclosureIndicator />}
          </>
        )}
      </Button>
    </Heading>
  )
}

export function DisclosureIndicator({ className, ...props }: React.ComponentProps<"span">) {
  return (
    <span
      data-slot="disclosure-indicator"
      className={cn(
        "pointer-events-none relative flex size-6 shrink-0 items-center justify-center",
        className
      )}
      {...props}
    >
      <span
        className={twJoin([
          // Two square bars. The vertical one turns away when the row opens.
          "absolute h-0.5 w-4 origin-center bg-current transition-transform duration-200",
          "rotate-90 group-expanded/disclosure-item:rotate-0 group-expanded:rotate-0",
        ])}
      />
      <span className="absolute h-0.5 w-4 origin-center bg-current transition-transform duration-200" />
    </span>
  )
}

export function DisclosurePanel({ className, ...props }: DisclosurePanelProps) {
  return (
    <PrimitiveDisclosurePanel
      data-slot="disclosure-panel"
      className={cx(
        "h-(--disclosure-panel-height) overflow-clip text-sm/6 transition-[height] duration-200",
        className
      )}
    >
      <div
        data-slot="disclosure-panel-content"
        className="border-rule justify-start self-stretch border-t-2 px-4 pt-4 pb-5 text-pretty text-muted-fg"
      >
        {props.children}
      </div>
    </PrimitiveDisclosurePanel>
  )
}
