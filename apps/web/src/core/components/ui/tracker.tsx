'use client'

import { useState } from "react"
import { Pressable } from "react-aria-components/Pressable"
import { twJoin, cn } from "cn"
import { Tooltip, TooltipContent } from "./tooltip"

interface TrackerBlockProps {
  key?: string | number
  color?: string
  tooltip?: string
  defaultBackgroundColor?: string
  disabledTooltip?: boolean
}

const Block = ({
  color,
  tooltip,
  disabledTooltip,
  defaultBackgroundColor = "bg-secondary",
}: TrackerBlockProps) => {
  const [open, setOpen] = useState(false)

  // A square plate, a 2px rule apart from its neighbour. The hover draws a
  // rule inside the plate, so the block keeps its own colour.
  const plate = (
    <div className="size-full overflow-hidden">
      <div
        className={twJoin(
          "size-full rounded-none",
          color || defaultBackgroundColor,
          "hover:outline-2 hover:outline-offset-[-2px] hover:outline-fg",
          "[[data-demo=hover]_&]:outline-2 [[data-demo=hover]_&]:outline-offset-[-2px] [[data-demo=hover]_&]:outline-fg"
        )}
      />
    </div>
  )

  return disabledTooltip ? (
    plate
  ) : (
    <Tooltip isOpen={open} onOpenChange={setOpen} delay={0} closeDelay={0}>
      <Pressable onPress={() => setOpen(true)}>
        <div
          role="button"
          tabIndex={0}
          aria-label={tooltip ?? "Show status"}
          className="size-full overflow-hidden"
        >
          {plate}
        </div>
      </Pressable>
      <TooltipContent
        arrow={false}
        offset={10}
        placement="top"
        inverse
        className="px-2 py-1.5 text-xs"
      >
        {tooltip}
      </TooltipContent>
    </Tooltip>
  )
}

interface TrackerProps
  extends React.ComponentProps<"div">, Pick<TrackerBlockProps, "disabledTooltip"> {
  data: TrackerBlockProps[]
  defaultBackgroundColor?: string
}

const Tracker = ({
  data = [],
  disabledTooltip = false,
  className,
  ref,
  ...props
}: TrackerProps) => {
  return (
    <div
      ref={ref}
      className={cn("group flex h-6 w-full items-center gap-0.5", className)}
      {...props}
    >
      {data.map((props, index) => (
        <Block disabledTooltip={disabledTooltip} key={props.key ?? index} {...props} />
      ))}
    </div>
  )
}

export { Tracker, type TrackerBlockProps }
