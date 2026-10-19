'use client'

import { HiChevronUpDown } from "react-icons/hi2"
import { Button } from "react-aria-components/Button"
import type {
  ComboBoxProps as ComboBoxPrimitiveProps,
  ComboBoxValueProps,
} from "react-aria-components/ComboBox"
import {
  ComboBox as ComboBoxPrimitive,
  ComboBoxContext,
  ComboBoxValue as ComboBoxValuePrimitive,
} from "react-aria-components/ComboBox"
import type { InputProps } from "react-aria-components/Input"
import { ListBox, type ListBoxProps } from "react-aria-components/ListBox"
import type { PopoverProps } from "react-aria-components/Popover"
import { useSlottedContext } from "react-aria-components/slots"
import { printedFieldStyles } from "@/core/components/ui/field"
import { Input } from "@/core/components/ui/input"
import { cx } from "@/core/utils/primitive"
import { DropdownDescription, DropdownItem, DropdownLabel, DropdownSection } from "./dropdown"
import { PopoverContent } from "./popover"

interface ComboBoxProps<T extends object, M extends "single" | "multiple" = "single"> extends Omit<
  ComboBoxPrimitiveProps<T, M>,
  "children"
> {
  children: React.ReactNode
}

const ComboBox = <T extends object, M extends "single" | "multiple" = "single">({
  className,
  ...props
}: ComboBoxProps<T, M>) => {
  return (
    <ComboBoxPrimitive
      data-slot="control"
      className={cx(printedFieldStyles(), className)}
      {...props}
    />
  )
}

interface ComboBoxListProps<T extends object>
  extends Omit<ListBoxProps<T>, "layout" | "orientation">, Pick<PopoverProps, "placement"> {
  popover?: Omit<PopoverProps, "children">
}

const ComboBoxContent = <T extends object>({
  children,
  items,
  className,
  popover,
  ...props
}: ComboBoxListProps<T>) => {
  return (
    <PopoverContent
      placement={popover?.placement ?? "bottom"}
      className={cx(
        "min-w-(--trigger-width) overflow-hidden *:data-[slot=popover-inner]:overflow-hidden",
        popover?.className
      )}
      {...popover}
    >
      <ListBox
        layout="stack"
        orientation="vertical"
        className={cx(
          "grid max-h-[inherit] w-full grid-cols-[auto_1fr] flex-col gap-y-0.5 overflow-y-auto p-1.5 outline-hidden *:[[role='group']+[role=group]]:mt-3 *:[[role='group']+[role=separator]]:mt-1",
          className
        )}
        items={items}
        {...props}
      >
        {children}
      </ListBox>
    </PopoverContent>
  )
}

const ComboBoxInput = (props: InputProps) => {
  const context = useSlottedContext(ComboBoxContext)!
  return (
    <span data-slot="control" className="relative isolate block">
      {/* The input is the well; the list button sits inside its 2px rule. */}
      <Input {...props} className={cx("pe-11 sm:pe-9", props.className)} placeholder={props?.placeholder} />
      <Button
        className={cx(
          "absolute inset-y-0.5 end-0.5 z-10 grid w-10 cursor-default place-content-center text-muted-fg outline-hidden sm:w-8",
          "hover:text-fg pressed:bg-fg pressed:text-bg disabled:cursor-not-allowed",
          "in-data-[demo=pressed]:bg-fg in-data-[demo=pressed]:text-bg",
          "forced-colors:text-[ButtonText]"
        )}
      >
        {!context?.inputValue && (
          <HiChevronUpDown data-slot="chevron" className="size-5 sm:size-4" />
        )}
      </Button>
    </span>
  )
}

const ComboBoxSection = DropdownSection
const ComboBoxItem = DropdownItem
const ComboBoxLabel = DropdownLabel
const ComboBoxDescription = DropdownDescription
const ComboBoxValue = <T extends object>(props: ComboBoxValueProps<T>) => (
  <ComboBoxValuePrimitive data-slot="control" {...props} />
)

export type { ComboBoxListProps, ComboBoxProps }
export {
  ComboBox,
  ComboBoxContent,
  ComboBoxDescription,
  ComboBoxInput,
  ComboBoxItem,
  ComboBoxLabel,
  ComboBoxSection,
  ComboBoxValue,
}
