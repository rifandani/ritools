'use client'

import { createContext, use } from "react"
import { composeRenderProps } from "react-aria-components/composeRenderProps"
import { ToggleButton, type ToggleButtonProps } from "react-aria-components/ToggleButton"
import {
  ToggleButtonGroup,
  type ToggleButtonGroupProps,
} from "react-aria-components/ToggleButtonGroup"
import { cn } from "cn"
import { tv } from "tailwind-variants"
import { cx } from "@/core/utils/primitive"
import { toggleStyles } from "./toggle"

type ToggleSize = "xs" | "sm" | "md" | "lg" | "sq-xs" | "sq-sm" | "sq-md" | "sq-lg"

interface ToggleGroupContextValue extends Pick<
  ToggleButtonGroupProps,
  "selectionMode" | "orientation"
> {
  size?: ToggleSize
  isCircle?: boolean
}

const ToggleGroupContext = createContext<ToggleGroupContextValue>({
  size: "md",
  selectionMode: "single",
  orientation: "horizontal",
})

const useToggleGroupContext = () => use(ToggleGroupContext)

interface ToggleGroupProps extends ToggleButtonGroupProps {
  size?: ToggleSize
  isCircle?: boolean
}

const ToggleGroup = ({
  size = "md",
  orientation = "horizontal",
  selectionMode = "single",
  isCircle,
  className,
  ...props
}: ToggleGroupProps) => {
  return (
    <ToggleGroupContext value={{ size, selectionMode, orientation, isCircle }}>
      <ToggleButtonGroup
        data-slot="control"
        selectionMode={selectionMode}
        orientation={orientation}
        className={cx(
          [
            // One printed strip: every item draws its own closed frame and
            // overlaps the one before it, so a shared rule prints once.
            "isolate inline-flex max-w-full",
            orientation === "horizontal" ? "flex-row" : "flex-col",
            // Seals stand apart, one round mark each; square marks join.
            isCircle
              ? "gap-1.5 *:data-[slot=toggle-group-item]:m-0"
              : orientation === "horizontal"
                ? "ps-0.5"
                : "pt-0.5",
          ],
          className
        )}
        {...props}
      />
    </ToggleGroupContext>
  )
}

interface ToggleGroupItemProps extends ToggleButtonProps {
  size?: ToggleSize
}

const toggleGroupItemStyles = tv({
  base: [
    // The selected print sits over its neighbors; hover and focus sit over it.
    "data-selected:z-10 data-hovered:z-20 in-data-[demo=hover]:z-20 data-focus-visible:z-30 in-data-[demo=focus]:z-30",
  ],
  variants: {
    // Two selected prints side by side keep a cut of ground between them.
    orientation: {
      horizontal: "-ms-0.5 justify-center [[data-selected]+&]:data-selected:border-s-bg",
      vertical: "-mt-0.5 justify-start [[data-selected]+&]:data-selected:border-t-bg",
    },
  },
})

const ToggleGroupItem = ({ className, ...props }: ToggleGroupItemProps) => {
  const { size, orientation, isCircle } = useToggleGroupContext()

  return (
    <ToggleButton
      data-slot="toggle-group-item"
      className={composeRenderProps(className, (className, renderProps) =>
        cn(
          toggleStyles({ ...renderProps, intent: "outline", size: props.size ?? size, isCircle }),
          toggleGroupItemStyles({ orientation }),
          className
        )
      )}
      {...props}
    />
  )
}

export type { ToggleGroupItemProps, ToggleGroupProps }
export { ToggleGroup, ToggleGroupItem }
