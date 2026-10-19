'use client'

import { composeRenderProps } from "react-aria-components/composeRenderProps"
import { ToggleButton } from "react-aria-components/ToggleButton"
import { tv } from "tailwind-variants"
import { buttonStyles } from "@/core/components/ui/button"
import { Text } from "@/core/components/ui/text"

const showMoreStyles = tv({
  // A 2px rule broken by one mark or one group label.
  base: "text-sm leading-6 before:border-rule after:border-rule",
  variants: {
    orientation: {
      vertical: "mx-1 h-auto self-stretch",
      horizontal: "my-0.5 w-full self-stretch",
    },
  },
  compoundVariants: [
    {
      orientation: "vertical",
      className:
        "mx-2 flex flex-col items-center before:mb-3 before:flex-1 before:border-l-2 after:mt-3 after:flex-1 after:border-l-2",
    },
    {
      orientation: "horizontal",
      className:
        "my-2 flex items-center self-stretch before:me-3 before:flex-1 before:border-t-2 after:ms-3 after:flex-1 after:border-t-2",
    },
  ],
  defaultVariants: {
    orientation: "horizontal",
  },
})

interface ShowMoreProps extends Omit<React.ComponentProps<typeof ToggleButton>, "className"> {
  className?: string
  orientation?: "horizontal" | "vertical"
  as?: "text" | "button"
  text?: string
}

const ShowMore = ({
  as = "button",
  orientation = "horizontal",
  className,
  ...props
}: ShowMoreProps) => {
  return (
    <div className={showMoreStyles({ orientation, className })}>
      {as === "button" ? (
        <ToggleButton
          {...props}
          className={buttonStyles({ intent: "secondary", size: "sm", className: "shrink-0" })}
        >
          {composeRenderProps(props.children, (children) => children)}
        </ToggleButton>
      ) : (
        <Text className="shrink-0 font-bold text-muted-fg text-xs/4 uppercase tracking-[0.08em] [font-stretch:87.5%] sm:text-xs/4">
          {props.text}
        </Text>
      )}
    </div>
  )
}

export type { ShowMoreProps }
export { ShowMore }
