"use client"

import { HiCheck, HiChevronRight } from "react-icons/hi2"
import { Button, type ButtonProps } from "react-aria-components/Button"
import { Collection } from "react-aria-components/Collection"
import { composeRenderProps } from "react-aria-components/composeRenderProps"
import { Header } from "react-aria-components/Header"
import type {
  MenuItemProps as MenuItemPrimitiveProps,
  MenuProps as MenuPrimitiveProps,
  MenuSectionProps as MenuSectionPrimitiveProps,
  MenuTriggerProps as MenuTriggerPrimitiveProps,
} from "react-aria-components/Menu"
import {
  Menu as MenuPrimitive,
  MenuItem as MenuItemPrimitive,
  MenuSection as MenuSectionPrimitive,
  MenuTrigger as MenuTriggerPrimitive,
  SubmenuTrigger as SubmenuTriggerPrimitive,
} from "react-aria-components/Menu"
import { cn } from "cn"
import { tv, type VariantProps } from "tailwind-variants"
import { cx } from "@/core/utils/primitive"
import {
  DropdownDescription,
  dropdownItemStyles,
  DropdownKeyboard,
  DropdownLabel,
  dropdownSectionStyles,
  DropdownSeparator,
} from "./dropdown"
import { PopoverContent, type PopoverContentProps } from "./popover"

const Menu = (props: MenuTriggerPrimitiveProps) => <MenuTriggerPrimitive {...props} />

const MenuSubMenu = ({ delay = 0, ...props }) => (
  <SubmenuTriggerPrimitive {...props} delay={delay}>
    {props.children}
  </SubmenuTriggerPrimitive>
)

interface MenuTriggerProps extends ButtonProps {
  ref?: React.Ref<HTMLButtonElement>
}

const MenuTrigger = ({ className, ref, ...props }: MenuTriggerProps) => (
  <Button
    ref={ref}
    data-slot="menu-trigger"
    className={cx(
      "bracket relative inline text-start outline-hidden",
      "*:data-[slot=chevron]:size-5 sm:*:data-[slot=chevron]:size-4",
      className
    )}
    {...props}
  />
)

interface MenuContentProps<T>
  extends MenuPrimitiveProps<T>, Pick<PopoverContentProps, "placement"> {
  className?: string
  popover?: Pick<
    PopoverContentProps,
    | "arrow"
    | "className"
    | "placement"
    | "offset"
    | "crossOffset"
    | "arrowBoundaryOffset"
    | "triggerRef"
    | "isOpen"
    | "onOpenChange"
    | "shouldFlip"
    | "isNonModal"
    | "trigger"
    | "getTargetRect"
  >
}

const menuContentStyles = tv({
  base: "grid max-h-[inherit] grid-cols-[auto_minmax(0,1fr)] gap-y-0.5 overflow-y-auto overflow-x-hidden overscroll-contain p-1.5 outline-hidden [&>[data-slot=menu-section]+[data-slot=menu-section]:not([class*='mt-']):not([class*='my-'])]:mt-3",
})

const MenuContent = <T extends object>({
  className,
  placement,
  popover,
  ...props
}: MenuContentProps<T>) => {
  return (
    <PopoverContent
      className={cx("min-w-32 *:data-[slot=popover-inner]:overflow-hidden", popover?.className)}
      placement={placement}
      {...popover}
    >
      <MenuPrimitive
        data-slot="menu-content"
        className={menuContentStyles({ className })}
        {...props}
      />
    </PopoverContent>
  )
}

interface MenuItemProps extends MenuItemPrimitiveProps, VariantProps<typeof dropdownItemStyles> {}

const MenuItem = ({ className, intent, children, ...props }: MenuItemProps) => {
  const textValue = props.textValue || (typeof children === "string" ? children : undefined)
  return (
    <MenuItemPrimitive
      data-slot="menu-item"
      className={composeRenderProps(
        className,
        (className, { hasSubmenu, ...renderProps }) =>
          dropdownItemStyles({
            ...renderProps,
            intent,
            className: cn(
              // Reserve the check column on every item of a selection menu, so
              // the menu keeps the width of its longest item when the
              // selection moves.
              "data-[selection-mode=single]:pe-8 data-[selection-mode=multiple]:pe-8",
              hasSubmenu
                ? cn(
                    intent === "danger" && "open:bg-danger-subtle open:text-danger-subtle-fg",
                    intent === "warning" &&
                      "open:bg-warning-subtle open:text-warning-subtle-fg",
                    intent === undefined &&
                      "open:bg-accent open:text-accent-fg open:*:[.text-muted-fg]:text-accent-fg open:*:[svg]:text-accent-fg",
                    className
                  )
                : className
            ),
          })
      )}
      textValue={textValue}
      {...props}
    >
      {(values) => (
        <>
          {typeof children === "function" ? (
            children(values)
          ) : typeof children === "string" ? (
            <MenuLabel>{children}</MenuLabel>
          ) : (
            children
          )}

          {/* A menu with no selection mode can still mark one item as the
              current value, so the check follows `isSelected` alone. */}
          {values.isSelected && (
            <HiCheck
              data-slot="check-indicator"
              className={cn(
                "absolute end-2 top-1/2 h-lh w-4 shrink-0 -translate-y-1/2",
                "group-has-data-[slot=keyboard]:end-9",
                values.hasSubmenu && "end-8"
              )}
            />
          )}

          {values.hasSubmenu && (
            <HiChevronRight
              data-slot="chevron"
              className="absolute end-0 size-4 -translate-y-1/2"
              style={{
                top: "calc(var(--spacing) * 3)",
              }}
            />
          )}
        </>
      )}
    </MenuItemPrimitive>
  )
}

export interface MenuHeaderProps extends React.ComponentProps<typeof Header> {
  separator?: boolean
}

const MenuHeader = ({ className, separator = false, ...props }: MenuHeaderProps) => (
  <Header
    className={cn(
      "col-span-full px-2.5 py-2 font-bold text-muted-fg text-xs/4 uppercase tracking-[0.08em] [font-stretch:87.5%]",
      separator && "-mx-1.5 -mt-1.5 mb-1 border-rule border-b-2 px-4 py-2.5",
      className
    )}
    {...props}
  />
)

const { section, header } = dropdownSectionStyles()

interface MenuSectionProps<T> extends MenuSectionPrimitiveProps<T> {
  ref?: React.Ref<HTMLDivElement>
  label?: string
}

const MenuSection = <T extends object>({
  className,
  children,
  ref,
  ...props
}: MenuSectionProps<T>) => {
  return (
    <MenuSectionPrimitive
      data-slot="menu-section"
      ref={ref}
      className={section({ className })}
      {...props}
    >
      {"label" in props && <Header className={header()}>{props.label}</Header>}
      <Collection items={props.items}>{children}</Collection>
    </MenuSectionPrimitive>
  )
}

const MenuSeparator = DropdownSeparator
const MenuShortcut = DropdownKeyboard
const MenuLabel = DropdownLabel
const MenuDescription = DropdownDescription

export type { MenuContentProps, MenuItemProps, MenuSectionProps, MenuTriggerProps }
export {
  Menu,
  MenuContent,
  MenuDescription,
  MenuHeader,
  MenuItem,
  MenuLabel,
  MenuSection,
  MenuSeparator,
  MenuShortcut,
  MenuSubMenu,
  MenuTrigger,
  menuContentStyles,
}
