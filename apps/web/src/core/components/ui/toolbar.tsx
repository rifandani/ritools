"use client"

import { createContext, use } from "react"
import { composeRenderProps } from "react-aria-components/composeRenderProps"
import { Group, type GroupProps } from "react-aria-components/Group"
import type { SeparatorProps } from "react-aria-components/Separator"
import {
  Toolbar as ToolbarPrimitive,
  type ToolbarProps as ToolbarPrimitiveProps,
} from "react-aria-components/Toolbar"
import { cn } from "cn"
import { cx } from "@/core/utils/primitive"
import { Separator } from "./separator"
import { Toggle, type ToggleProps } from "./toggle"

const ToolbarContext = createContext<ToolbarProps>({
  orientation: "horizontal",
  isCircle: false,
})

interface ToolbarProps extends ToolbarPrimitiveProps {
  isCircle?: boolean
}

const Toolbar = ({ orientation = "horizontal", isCircle, className, ...props }: ToolbarProps) => {
  return (
    <ToolbarContext value={{ orientation, isCircle }}>
      <ToolbarPrimitive
        orientation={orientation}
        {...props}
        className={composeRenderProps(className, (className, { orientation }) =>
          cn(
            // A strip of white stock in a 2px rule. A long toolbar wraps on a
            // phone, so no item hides past the edge; the 8px inset leaves room
            // for the focus bracket.
            "group inline-flex max-w-full gap-1.5 border-2 border-rule bg-overlay p-2 text-overlay-fg",
            // The strip stays square; `isCircle` makes each item a seal.
            "rounded-none",
            orientation === "horizontal"
              ? "flex-row flex-wrap items-center"
              : "flex-col items-start",
            className
          )
        )}
      />
    </ToolbarContext>
  )
}

const ToolbarGroupContext = createContext<{ isDisabled?: boolean; isCircle?: boolean }>({})

interface ToolbarGroupProps extends GroupProps {}
const ToolbarGroup = ({ isDisabled, className, ...props }: ToolbarGroupProps) => {
  return (
    <ToolbarGroupContext value={{ isDisabled }}>
      <Group
        className={cx(
          "flex gap-1.5 group-orientation-vertical:flex-col group-orientation-vertical:items-start group-orientation-horizontal:items-center",
          className
        )}
        {...props}
      >
        {props.children}
      </Group>
    </ToolbarGroupContext>
  )
}

interface ToggleItemProps extends ToggleProps {}

const ToolbarItem = ({
  isDisabled,
  isCircle,
  size = "sm",
  intent = "outline",
  ref,
  className,
  ...props
}: ToggleItemProps) => {
  const context = use(ToolbarGroupContext)
  const { isCircle: contextCircle } = use(ToolbarContext)
  const effectiveIsDisabled = isDisabled || context.isDisabled
  const effectiveIsCircle = isCircle || contextCircle
  return (
    <Toggle
      intent={intent}
      size={size}
      ref={ref}
      data-slot="toolbar-item"
      className={cx(
        "shrink-0",
        effectiveIsCircle ? "rounded-full" : "rounded-none",
        className
      )}
      isDisabled={effectiveIsDisabled}
      {...props}
    />
  )
}
type ToolbarSeparatorProps = SeparatorProps
const ToolbarSeparator = ({ className, ...props }: ToolbarSeparatorProps) => {
  const { orientation } = use(ToolbarContext)
  const reverseOrientation = orientation === "vertical" ? "horizontal" : "vertical"
  return (
    <Separator
      orientation={reverseOrientation}
      className={cn(
        reverseOrientation === "vertical" ? "mx-1 h-7 self-center" : "my-1 w-8",
        className
      )}
      {...props}
    />
  )
}

export type { ToggleItemProps, ToolbarGroupProps, ToolbarProps, ToolbarSeparatorProps }
export { Toolbar, ToolbarGroup, ToolbarItem, ToolbarSeparator }
