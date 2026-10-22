'use client'

import { HiMagnifyingGlass } from "react-icons/hi2"
import { createContext, use, useEffect } from "react"
import { Autocomplete, type AutocompleteProps, useFilter } from "react-aria-components/Autocomplete"
import { Button } from "react-aria-components/Button"
import { Collection } from "react-aria-components/Collection"
import {
  type CollectionRenderer,
  CollectionRendererContext,
  DefaultCollectionRenderer,
} from "react-aria-components/CollectionBuilder"
import { Dialog, OverlayTriggerStateContext } from "react-aria-components/Dialog"
import { Header } from "react-aria-components/Header"
import { Input } from "react-aria-components/Input"
import type { MenuProps, MenuTriggerProps } from "react-aria-components/Menu"
import { Menu as MenuPrimitive, MenuSection } from "react-aria-components/Menu"
import type { ModalOverlayProps } from "react-aria-components/Modal"
import { Modal, ModalContext, ModalOverlay } from "react-aria-components/Modal"
import { SearchField, type SearchFieldProps } from "react-aria-components/SearchField"
import { cn } from "cn"
import { cx } from "@/core/utils/primitive"
import { DropdownKeyboard } from "./dropdown"
import { Loader } from "./loader"
import { MenuDescription, MenuItem, MenuLabel, type MenuSectionProps, MenuSeparator } from "./menu"

interface CommandMenuProviderProps {
  isPending?: boolean
  escapeButton?: boolean
}

const CommandMenuContext = createContext<CommandMenuProviderProps | undefined>(undefined)

const useCommandMenu = () => {
  const context = use(CommandMenuContext)

  if (!context) {
    throw new Error("useCommandMenu must be used within a <CommandMenuProvider />")
  }

  return context
}

const sizes = {
  xs: "sm:max-w-xs",
  sm: "sm:max-w-sm",
  md: "sm:max-w-md",
  lg: "sm:max-w-lg",
  xl: "sm:max-w-xl",
  "2xl": "sm:max-w-2xl",
  "3xl": "sm:max-w-3xl",
}

interface CommandMenuProps extends AutocompleteProps, MenuTriggerProps, CommandMenuProviderProps {
  isDismissable?: boolean
  "aria-label"?: string
  shortcut?: string
  className?: string
  size?: keyof typeof sizes
  overlay?: Pick<ModalOverlayProps, "className">
}

const CommandMenu = ({
  onOpenChange,
  className,
  isDismissable = true,
  escapeButton = true,
  isPending,
  overlay,
  size = "lg",
  shortcut,
  ...props
}: CommandMenuProps) => {
  const { contains } = useFilter({ sensitivity: "base" })
  const filter = (textValue: string, inputValue: string) => contains(textValue, inputValue)
  useEffect(() => {
    if (!shortcut) return

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === shortcut && (e.metaKey || e.ctrlKey)) {
        onOpenChange?.(true)
      }
    }

    document.addEventListener("keydown", onKeyDown)
    return () => document.removeEventListener("keydown", onKeyDown)
  }, [shortcut, onOpenChange])
  return (
    <CommandMenuContext value={{ isPending: isPending, escapeButton: escapeButton }}>
      <ModalContext value={{ isOpen: props.isOpen, onOpenChange: onOpenChange }}>
        <ModalOverlay
          {...props}
          isDismissable={isDismissable}
          className={cx(
            "fixed inset-0 z-50 h-(--visual-viewport-height,100vh) w-screen overflow-hidden",
            // A flat ink scrim. Print has no blur and no glass.
            "bg-ink/50 dark:bg-ink/70",
            "grid grid-rows-[1fr_auto] justify-items-center text-center sm:grid-rows-[1fr_auto_3fr]",
            "entering:animate-[fade-in_160ms_ease-out] exiting:animate-[fade-out_140ms_ease-in]",
            overlay?.className
          )}
        >
          <Modal
            className={cx(
              // White stock with a 2px rule. Square, no shadow, no ring.
              "border-rule row-start-2 border-2 bg-overlay text-start text-overlay-fg outline-hidden",
              "max-h-[calc(var(--visual-viewport-height)*0.8)] w-full sm:fixed sm:top-[10%] sm:left-1/2 sm:-translate-x-1/2",
              sizes[size],
              // The panel slams down from the top on the slash angle.
              "[--slam-y:-28px] [--slam-r:calc(var(--angle-slash)*1)]",
              "entering:animate-note-slam exiting:animate-note-unpin",
              className
            )}
          >
            <Dialog
              aria-label={props["aria-label"] ?? "Command Menu"}
              className="flex max-h-[inherit] flex-col overflow-hidden outline-hidden"
            >
              <Autocomplete filter={filter} {...props} />
            </Dialog>
          </Modal>
        </ModalOverlay>
      </ModalContext>
    </CommandMenuContext>
  )
}

interface CommandMenuSearchProps extends SearchFieldProps {
  placeholder?: string
  className?: string
}

const CommandMenuSearch = ({ className, placeholder, ...props }: CommandMenuSearchProps) => {
  const state = use(OverlayTriggerStateContext)!
  const { isPending, escapeButton } = useCommandMenu()
  return (
    <SearchField
      aria-label="Quick search"
      autoFocus
      // The strip drops its well: a 2px rule closes it.
      className={cx(
        "border-rule flex w-full items-center gap-2 border-b-2 px-3 py-2",
        className
      )}
      {...props}
    >
      {isPending ? (
        <Loader className="size-4.5" variant="spin" />
      ) : (
        <HiMagnifyingGlass
          data-slot="command-menu-search-icon"
          className="size-5 shrink-0 text-muted-fg"
        />
      )}
      <Input
        placeholder={placeholder ?? "Search..."}
        className="w-full min-w-0 bg-transparent px-0 text-base text-fg placeholder-muted-fg outline-hidden focus:outline-hidden sm:text-sm [&::-ms-reveal]:hidden [&::-webkit-search-cancel-button]:hidden"
      />
      {escapeButton && (
        <Button
          onPress={() => state?.close()}
          className="border-rule hidden cursor-default border-2 px-1.5 py-0.5 font-mono text-[0.6875rem] uppercase tracking-[0.08em] text-muted-fg hover:bg-fg hover:text-bg lg:inline"
        >
          Esc
        </Button>
      )}
    </SearchField>
  )
}

const CommandMenuList = <T extends object>({ className, ...props }: MenuProps<T>) => {
  return (
    <CollectionRendererContext value={renderer}>
      <MenuPrimitive
        className={cx(
          "grid max-h-full flex-1 grid-cols-[auto_1fr] content-start overflow-y-auto p-1.5 sm:max-h-110 *:[[role=group]]:mb-6 *:[[role=group]]:last:mb-0",
          className
        )}
        {...props}
      />
    </CollectionRendererContext>
  )
}

const CommandMenuSection = <T extends object>({
  className,
  ref,
  ...props
}: MenuSectionProps<T>) => {
  return (
    <MenuSection
      ref={ref}
      className={cn("col-span-full grid grid-cols-[auto_1fr] content-start gap-y-0.25", className)}
      {...props}
    >
      {"label" in props && (
        <Header className="col-span-full mb-1 block min-w-(--trigger-width) truncate px-2.5 font-bold text-muted-fg text-xs/4 uppercase tracking-[0.08em] [font-stretch:87.5%]">
          {props.label}
        </Header>
      )}
      <Collection items={props.items}>{props.children}</Collection>
    </MenuSection>
  )
}

const CommandMenuItem = ({ className, ...props }: React.ComponentProps<typeof MenuItem>) => {
  const textValue =
    props.textValue || (typeof props.children === "string" ? props.children : undefined)
  return (
    <MenuItem
      {...props}
      textValue={textValue}
      className={cx("items-center gap-y-0.5", className)}
    />
  )
}

interface CommandMenuDescriptionProps extends React.ComponentProps<typeof MenuDescription> {}

const CommandMenuDescription = ({ className, ...props }: CommandMenuDescriptionProps) => {
  return <MenuDescription className={cn("col-start-3 row-start-1 ms-auto", className)} {...props} />
}

const renderer: CollectionRenderer = {
  CollectionRoot(props) {
    if (props.collection.size === 0) {
      return (
        <div className="col-span-full flex flex-col items-center gap-1 px-4 py-8 text-center">
          <span className="num text-muted-fg text-3xl font-extrabold">0</span>
          <span className="text-muted-fg text-sm">No Tool carries that name.</span>
        </div>
      )
    }
    return <DefaultCollectionRenderer.CollectionRoot {...props} />
  },
  CollectionBranch: DefaultCollectionRenderer.CollectionBranch,
}

const CommandMenuSeparator = ({
  className,
  ...props
}: React.ComponentProps<typeof MenuSeparator>) => (
  <MenuSeparator className={cn("-mx-1.5", className)} {...props} />
)

const CommandMenuFooter = ({ className, ...props }: React.ComponentProps<"div">) => {
  return (
    <div
      className={cn(
        "border-rule col-span-full flex-none border-t-2 px-3 py-2 text-muted-fg text-sm",
        "*:[kbd]:border-rule *:[kbd]:mx-1 *:[kbd]:inline-grid *:[kbd]:h-5 *:[kbd]:min-w-5 *:[kbd]:place-content-center *:[kbd]:border-2 *:[kbd]:bg-secondary *:[kbd]:font-mono *:[kbd]:text-[0.6875rem]",
        className
      )}
      {...props}
    />
  )
}

const CommandMenuLabel = MenuLabel
const CommandMenuShortcut = ({
  className,
  ...props
}: React.ComponentProps<typeof DropdownKeyboard>) => (
  <DropdownKeyboard
    className={cn(
      // The shortcut is a key cap: a square, a hard 2px rule, the code voice.
      // Each cap has no fill, so it reads on the item's own ground.
      "gap-0.5 font-sans text-[0.6875rem] tracking-[0.08em] uppercase *:grid *:size-5.5 *:place-content-center *:border-2 *:border-rule group-hover:*:border-current group-focus:*:border-current",
      className
    )}
    {...props}
  />
)

export type { CommandMenuDescriptionProps, CommandMenuProps, CommandMenuSearchProps }
export {
  CommandMenu,
  CommandMenuDescription,
  CommandMenuFooter,
  CommandMenuItem,
  CommandMenuLabel,
  CommandMenuList,
  CommandMenuSearch,
  CommandMenuSection,
  CommandMenuSeparator,
  CommandMenuShortcut,
}
