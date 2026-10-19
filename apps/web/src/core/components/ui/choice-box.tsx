'use client'

import { createContext, use } from "react"
import type { GridListItemProps, GridListProps, TextProps } from "react-aria-components"
import { composeRenderProps, GridList, GridListItem, Text } from "react-aria-components"
import { cn } from "cn"
import type { VariantProps } from "tailwind-variants"
import { tv } from "tailwind-variants"
import { cx } from "@/core/utils/primitive"
import { Checkbox, CheckboxField } from "./checkbox"

const choiceBoxStyles = tv({
  base: "grid [--gutter:--spacing(4)]",
  variants: {
    columns: {
      1: "col-span-full grid-cols-[auto_1fr]",
      2: "sm:grid-cols-2",
      3: "sm:grid-cols-3",
      4: "sm:grid-cols-4",
      5: "sm:grid-cols-5",
      6: "sm:grid-cols-6",
    },
    gap: {
      0: "gap-0",
      1: "gap-1",
      2: "gap-2",
      3: "gap-3",
      4: "gap-4",
      5: "gap-5",
      6: "gap-6",
      8: "gap-8",
      10: "gap-10",
      12: "gap-12",
    },
  },
  defaultVariants: {
    columns: 1,
    gap: 0,
  },
  compoundVariants: [
    // Without a gap the options share their 2px rules, as the catalog grid does:
    // each one pulls 2px up and left over its neighbors, so a rule prints once.
    {
      gap: 0,
      className: "ps-0.5 pt-0.5 *:data-[slot=choice-box-item]:-ms-0.5 *:data-[slot=choice-box-item]:-mt-0.5",
    },
  ],
})

const ChoiceBoxContext = createContext<{ columns?: number; gap?: number; isReadOnly?: boolean }>({})

const useChoiceBoxContext = () => use(ChoiceBoxContext)

interface ChoiceBoxProps<T extends object>
  extends GridListProps<T>, VariantProps<typeof choiceBoxStyles> {
  isReadOnly?: boolean
}

const ChoiceBox = <T extends object>({
  columns = 1,
  gap = 0,
  className,
  selectionMode = "single",
  isReadOnly,
  ...props
}: ChoiceBoxProps<T>) => {
  return (
    <ChoiceBoxContext value={{ columns, gap, isReadOnly }}>
      <GridList
        data-slot="choice-box"
        layout={columns === 1 ? "stack" : "grid"}
        selectionMode={selectionMode}
        className={cx(
          choiceBoxStyles({
            columns,
            gap,
          }),
          className
        )}
        {...props}
      />
    </ChoiceBoxContext>
  )
}

/*
 * An option is a printed mark (globals.css): a 2px control edge at rest, a
 * doubled ink edge on hover, solid ink when pressed, solid ink with the red
 * foot when selected, faded and struck through when disabled, and the heavy
 * bracket on focus. On the solid print the description and the checkbox flip
 * to the paper side, so they stay legible.
 */
const choiceBoxItemStyles = tv({
  base: [
    "group mark rounded-none outline-hidden",
    "[--mark-fill:var(--fg)] [--mark-hover-line:var(--fg)] [--mark-line:var(--input)]",
    "p-(--gutter) **:data-[slot=label]:font-semibold",
    "**:data-[slot=avatar]:row-span-2 **:data-[slot=avatar]:mt-0.5 **:data-[slot=avatar]:shrink-0",
    "**:[svg]:row-span-2 **:[svg]:h-[1.1lh] **:[svg]:w-5 **:[svg]:shrink-0",
    "has-[svg:not([data-slot=check-indicator])]:grid-cols-[auto_1fr_auto] has-data-[slot=avatar]:grid-cols-[auto_1fr_auto]",
    "grid grid-cols-[1fr_auto] content-start items-start gap-x-[calc(var(--gutter)-(--spacing(1)))] gap-y-1",
    // The active print sits over its neighbors, so its ink edge is never cut.
    "data-hovered:z-10 data-focus-visible:z-30 data-selected:z-20 in-data-[demo]:z-10",
    // On the solid print: muted text and the checkbox take the paper side.
    // A disabled option keeps the system muted ink: its tint is light, not solid.
    "data-selected:not-data-disabled:[--muted-fg:color-mix(in_oklab,var(--mark-on-fill)_80%,var(--mark-fill))]",
    "data-pressed:[--muted-fg:color-mix(in_oklab,var(--mark-on-fill)_80%,var(--mark-fill))]",
    "in-data-[demo=pressed]:[--muted-fg:color-mix(in_oklab,var(--mark-on-fill)_80%,var(--mark-fill))]",
    "data-selected:not-data-disabled:**:data-[slot=indicator]:border-(--mark-on-fill)! data-selected:not-data-disabled:**:data-[slot=indicator]:bg-(--mark-on-fill)! data-selected:not-data-disabled:**:data-[slot=indicator]:text-(--mark-fill)!",
  ],
  variants: {
    isLink: {
      true: "cursor-pointer",
      false: "cursor-default",
    },
    isHovered: {
      true: "",
    },
    isFocused: {
      true: "",
    },
    isInvalid: {
      // Selected and invalid prints hollow in a doubled danger rule, never a fill.
      true: [
        "[--mark-hover-line:var(--danger)] [--mark-line:var(--danger)]",
        "data-selected:border-danger data-selected:bg-transparent data-selected:text-danger-subtle-fg data-selected:shadow-[inset_0_0_0_2px_var(--danger)]",
      ],
    },
    isOneColumn: {
      true: "col-span-full",
    },
    isActive: {
      true: "",
    },
    isDisabled: {
      true: "cursor-not-allowed forced-colors:text-[GrayText]",
    },
  },
})

interface ChoiceBoxItemProps extends GridListItemProps, VariantProps<typeof choiceBoxItemStyles> {
  label?: string
  description?: string
}

const ChoiceBoxItem = ({
  className,
  label,
  description,
  children,
  ...props
}: ChoiceBoxItemProps) => {
  const textValue = typeof children === "string" ? children : undefined
  const { columns, isReadOnly } = useChoiceBoxContext()
  return (
    <GridListItem
      textValue={textValue}
      data-readonly={isReadOnly}
      data-slot="choice-box-item"
      {...props}
      className={composeRenderProps(
        className,
        (className, { isFocusVisible, isSelected, ...renderProps }) =>
          choiceBoxItemStyles({
            ...renderProps,
            isOneColumn: columns === 1,
            isLink: "href" in props,
            isFocused: !isReadOnly && renderProps.isFocused,
            isActive: (!isReadOnly && isSelected) || isFocusVisible,
            className,
          })
      )}
    >
      {composeRenderProps(children, (children, { selectionMode }) => {
        const isStringChild = typeof children === "string"
        const hasCustomChildren = typeof children !== "undefined"

        const content = hasCustomChildren ? (
          isStringChild ? (
            <ChoiceBoxLabel>{children}</ChoiceBoxLabel>
          ) : (
            children
          )
        ) : (
          <>
            {label && <ChoiceBoxLabel>{label}</ChoiceBoxLabel>}
            {description && <ChoiceBoxDescription>{description}</ChoiceBoxDescription>}
          </>
        )
        return (
          <>
            {content}
            {selectionMode === "multiple" && (
              <CheckboxField
                slot="selection"
                className="gap-x-0 col-start-2 self-start group-has-[svg:not([data-slot=check-indicator])]:col-start-3 group-has-data-[slot=avatar]:col-start-3"
              >
                <Checkbox className="col-span-1" />
              </CheckboxField>
            )}
          </>
        )
      })}
    </GridListItem>
  )
}

interface ChoiceBoxLabelProps extends TextProps {
  ref?: React.Ref<HTMLDivElement>
}

const ChoiceBoxLabel = ({ className, ref, ...props }: ChoiceBoxLabelProps) => {
  return (
    <Text
      data-slot="label"
      ref={ref}
      className={cn(
        "select-none text-base/6 sm:text-sm/6",
        "col-start-1 row-start-1",
        "group-has-[svg:not([data-slot=check-indicator])]:col-start-2",
        "group-has-data-[slot=avatar]:col-start-2",
        className
      )}
      {...props}
    />
  )
}

type ChoiceBoxDescriptionProps = ChoiceBoxLabelProps

const ChoiceBoxDescription = ({ className, ref, ...props }: ChoiceBoxDescriptionProps) => {
  return (
    <Text
      slot="description"
      ref={ref}
      className={cn(
        "col-start-1 row-start-2",
        "group-has-[svg:not([data-slot=check-indicator])]:col-start-2",
        "group-has-data-[slot=avatar]:col-start-2",
        "text-muted-fg text-sm/6",
        "group-disabled:text-current",
        className
      )}
      {...props}
    />
  )
}

export type { ChoiceBoxItemProps, ChoiceBoxProps }
export { ChoiceBox, ChoiceBoxDescription, ChoiceBoxItem, ChoiceBoxLabel }
