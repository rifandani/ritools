'use client'

import { HiChevronDown } from "react-icons/hi2"
import { createContext, use, useCallback, useEffect, useMemo, useRef, useState } from "react"
import { type ButtonProps, Button as ButtonPrimitive } from "react-aria-components/Button"
import { composeRenderProps } from "react-aria-components/composeRenderProps"
import type { DisclosurePanelProps, DisclosureProps } from "react-aria-components/Disclosure"
import { Disclosure, DisclosurePanel } from "react-aria-components/Disclosure"
import { DisclosureGroup, type DisclosureGroupProps } from "react-aria-components/DisclosureGroup"
import { Header } from "react-aria-components/Header"
import { Heading } from "react-aria-components/Heading"
import { Link as LinkPrimitive, type LinkProps, type LinkRenderProps } from "react-aria-components/Link"
import type {
  NavigationTreeItemContentProps,
  NavigationTreeItemProps,
  NavigationTreeProps,
} from "react-aria-components/NavigationTree"
import {
  NavigationTree,
  NavigationTreeItem,
  NavigationTreeItemContent,
} from "react-aria-components/NavigationTree"
import {
  Separator,
  type SeparatorProps as SidebarSeparatorProps,
} from "react-aria-components/Separator"
import { twJoin, cn } from "cn"
import { SheetContent } from "@/core/components/ui/sheet"
import { TreeIndicator } from "@/core/components/ui/tree"
import { useIsMobile } from "@/core/hooks/use-mobile"
import { cx } from "@/core/utils/primitive"
import { Button } from "./button"
import type { Link } from "./link"
import { Tooltip, TooltipContent } from "./tooltip"

const SIDEBAR_WIDTH = "17rem"
const SIDEBAR_WIDTH_DOCK = "3.25rem"
const SIDEBAR_COOKIE_NAME = "sidebar_state"
const SIDEBAR_COOKIE_MAX_AGE = 60 * 60 * 24 * 7

type SidebarContextProps = {
  state: "expanded" | "collapsed"
  open: boolean
  setOpen: (open: boolean) => void
  isOpenOnMobile: boolean
  setIsOpenOnMobile: (open: boolean) => void
  isMobile: boolean
  toggleSidebar: () => void
}

const SidebarContext = createContext<SidebarContextProps | null>(null)

const useSidebar = () => {
  const context = use(SidebarContext)
  if (!context) {
    throw new Error("useSidebar must be used within a SidebarProvider.")
  }

  return context
}

interface SidebarProviderProps extends React.ComponentProps<"div"> {
  defaultOpen?: boolean
  isOpen?: boolean
  shortcut?: string
  onOpenChange?: (open: boolean) => void
}

const SidebarProvider = ({
  defaultOpen = true,
  isOpen: openProp,
  onOpenChange: setOpenProp,
  className,
  style,
  children,
  shortcut = "b",
  ref,
  ...props
}: SidebarProviderProps) => {
  const [openMobile, setOpenMobile] = useState(false)

  const [internalOpenState, setInternalOpenState] = useState(defaultOpen)
  const open = openProp ?? internalOpenState
  const setOpen = useCallback(
    (value: boolean | ((value: boolean) => boolean)) => {
      const openState = typeof value === "function" ? value(open) : value

      if (setOpenProp) {
        setOpenProp(openState)
      } else {
        setInternalOpenState(openState)
      }

      document.cookie = `${SIDEBAR_COOKIE_NAME}=${openState}; path=/; max-age=${SIDEBAR_COOKIE_MAX_AGE}`
    },
    [setOpenProp, open]
  )

  const isMobile = useIsMobile()
  const isMobileRef = useRef(isMobile)
  isMobileRef.current = isMobile

  const toggleSidebar = useCallback(() => {
    if (isMobileRef.current) {
      setOpenMobile((prev) => !prev)
    } else {
      setOpen((prev) => !prev)
    }
  }, [setOpen])

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === shortcut && (event.metaKey || event.ctrlKey)) {
        const activeElement = document.activeElement

        const isInTextInput =
          activeElement instanceof HTMLInputElement ||
          activeElement instanceof HTMLTextAreaElement ||
          activeElement?.getAttribute("contenteditable") === "true" ||
          activeElement?.getAttribute("role") === "textbox"

        if (!isInTextInput) {
          event.preventDefault()
          toggleSidebar()
        }
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [toggleSidebar, shortcut])

  const state = open ? "expanded" : "collapsed"

  const contextValue = useMemo<SidebarContextProps>(
    () => ({
      state,
      open,
      setOpen,
      isMobile: isMobile ?? false,
      isOpenOnMobile: openMobile,
      setIsOpenOnMobile: setOpenMobile,
      toggleSidebar,
    }),
    [state, open, setOpen, isMobile, openMobile, toggleSidebar]
  )

  if (isMobile === undefined) {
    return null
  }

  return (
    <SidebarContext value={contextValue}>
      <div
        style={
          {
            "--sidebar-width": SIDEBAR_WIDTH,
            "--sidebar-width-dock": SIDEBAR_WIDTH_DOCK,
            ...style,
          } as React.CSSProperties
        }
        className={cn(
          "@container **:[svg]:shrink-0",
          "flex w-full text-sidebar-fg",
          "group/sidebar-root peer/sidebar-root has-data-[intent=inset]:bg-sidebar dark:has-data-[intent=inset]:bg-bg",
          className
        )}
        ref={ref}
        {...props}
      >
        {children}
      </div>
    </SidebarContext>
  )
}

interface SidebarProps extends React.ComponentProps<"div"> {
  intent?: "default" | "float" | "inset"
  collapsible?: "hidden" | "dock" | "none"
  side?: "left" | "right"
  closeButton?: boolean
}

const Sidebar = ({
  children,
  closeButton = true,
  collapsible = "hidden",
  side = "left",
  intent = "default",
  className,
  ...props
}: SidebarProps) => {
  const { isMobile, state, isOpenOnMobile, setIsOpenOnMobile } = useSidebar()
  if (collapsible === "none") {
    return (
      <div
        data-intent={intent}
        data-collapsible="none"
        data-state={state}
        data-slot="sidebar"
        className={cn(
          "ground-ink flex h-full w-(--sidebar-width) flex-col",
          className
        )}
        {...props}
      >
        {children}
      </div>
    )
  }

  if (isMobile) {
    return (
      <>
        <span className="sr-only" aria-hidden data-intent={intent} />
        <SheetContent
          isOpen={isOpenOnMobile}
          onOpenChange={setIsOpenOnMobile}
          closeButton={closeButton}
          aria-label="Sidebar"
          data-slot="sidebar"
          data-intent="default"
          className="ground-ink w-(--sidebar-width) [--sidebar-width:18rem] has-data-[slot=calendar]:[--sidebar-width:23rem]"
          side={side}
        >
          {children}
        </SheetContent>
      </>
    )
  }

  return (
    <div
      data-state={state}
      data-collapsible={state === "collapsed" ? collapsible : ""}
      data-intent={intent}
      data-side={side}
      data-slot="sidebar"
      className="group peer hidden text-sidebar-fg md:block"
      {...props}
    >
      <div
        data-slot="sidebar-gap"
        aria-hidden="true"
        className={cn([
          "w-(--sidebar-width) group-data-[collapsible=hidden]:w-0",
          "group-data-[side=right]:-rotate-180",
          "relative h-svh bg-transparent transition-[width] duration-200 ease-linear",
          intent === "default" && "group-data-[collapsible=dock]:w-(--sidebar-width-dock)",
          intent === "float" &&
            "group-data-[collapsible=dock]:w-[calc(var(--sidebar-width-dock)+(--spacing(4)))]",
          intent === "inset" &&
            "group-data-[collapsible=dock]:w-[calc(var(--sidebar-width-dock)+(--spacing(2)))]",
        ])}
      />
      <div
        data-slot="sidebar-container"
        className={cn(
          // The ink rail (`ground-ink`): stock controls on it turn to paper.
          "ground-ink fixed inset-y-0 z-10 hidden w-(--sidebar-width) not-has-data-[slot=sidebar-footer]:pb-2 md:flex",
          "transition-[left,right,width] duration-200 ease-linear",
          side === "left" && "left-0 group-data-[collapsible=hidden]:-left-(--sidebar-width)",
          side === "right" && "right-0 group-data-[collapsible=hidden]:-right-(--sidebar-width)",
          intent === "float" &&
            "bg-transparent p-2 group-data-[collapsible=dock]:w-[calc(--spacing(4)+2px)]",
          intent === "inset" &&
            "group-data-[collapsible=dock]:w-[calc(var(--sidebar-width-dock)+(--spacing(2))+2px)]",
          intent === "default" && "group-data-[collapsible=dock]:w-(--sidebar-width-dock)",
          className
        )}
        {...props}
      >
        <div
          data-sidebar="default"
          data-slot="sidebar-inner"
          className={twJoin(
            "flex size-full flex-col text-sidebar-fg",
            "group-data-[intent=float]:border-2 group-data-[intent=float]:border-rule group-data-[intent=float]:bg-sidebar"
          )}
        >
          {children}
        </div>
      </div>
    </div>
  )
}

const SidebarHeader = ({ className, ref, ...props }: React.ComponentProps<"div">) => {
  const { state } = useSidebar()
  return (
    <div
      ref={ref}
      data-slot="sidebar-header"
      className={cn(
        "flex flex-col gap-2 p-2.5 [.border-b]:border-rule [.border-b]:border-b-2",
        "in-data-[intent=inset]:p-4",
        state === "collapsed" ? "items-center p-2.5" : "p-4",
        className
      )}
      {...props}
    />
  )
}

const SidebarFooter = ({ className, ...props }: React.ComponentProps<"div">) => {
  return (
    <div
      data-slot="sidebar-footer"
      className={cn([
        "mt-auto flex shrink-0 items-center justify-center p-4 **:data-[slot=chevron]:text-muted-fg [.border-t]:border-rule [.border-t]:border-t-2",
        "in-data-[intent=inset]:px-6 in-data-[intent=inset]:py-4",
        className,
      ])}
      {...props}
    />
  )
}

const SidebarContent = ({ className, ...props }: React.ComponentProps<"div">) => {
  const { state } = useSidebar()
  // Print has no fade: when more items wait below, a 2px rule closes the list.
  const [isAtBottom, setIsAtBottom] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    const check = () => {
      const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 1
      setIsAtBottom(atBottom)
    }

    check()
    el.addEventListener("scroll", check, { passive: true })

    const observer = new ResizeObserver(check)
    observer.observe(el)

    return () => {
      el.removeEventListener("scroll", check)
      observer.disconnect()
    }
  }, [])

  return (
    <div
      ref={ref}
      data-slot="sidebar-content"
      className={cn(
        "flex min-h-0 flex-1 scroll-mb-96 flex-col overflow-auto *:data-[slot=sidebar-section]:border-l-0",
        state === "collapsed" ? "items-center" : "border-b-2 border-transparent",
        state !== "collapsed" && !isAtBottom && "border-rule",
        className
      )}
      {...props}
    >
      {props.children}
    </div>
  )
}

const SidebarSectionGroup = ({ className, ...props }: React.ComponentProps<"section">) => {
  const { state, isMobile } = useSidebar()
  const collapsed = state === "collapsed" && !isMobile
  return (
    <section
      data-slot="sidebar-section-group"
      className={cn(
        "flex w-full min-w-0 flex-col gap-y-0.5",
        collapsed && "items-center justify-center",
        className
      )}
      {...props}
    />
  )
}

interface SidebarSectionProps extends React.ComponentProps<"div"> {
  label?: string
}

const SidebarSection = ({ className, ...props }: SidebarSectionProps) => {
  const { state } = useSidebar()
  return (
    <div
      data-slot="sidebar-section"
      className={cn(
        "col-span-full flex min-w-0 flex-col gap-y-0.5 **:data-[slot=sidebar-section]:**:gap-y-0",
        "in-data-[state=collapsed]:p-2 p-4",
        className
      )}
      {...props}
    >
      {state !== "collapsed" && "label" in props && (
        <Header className="mb-1.5 flex shrink-0 items-center px-2 font-bold text-muted-fg text-xs/6 uppercase tracking-[0.08em] outline-none transition-[margin,opacity] duration-200 ease-linear [font-stretch:87.5%] group-data-[collapsible=dock]:-mt-8 group-data-[collapsible=dock]:opacity-0 *:[svg]:size-4 *:[svg]:shrink-0">
          {props.label}
        </Header>
      )}
      <div
        data-slot="sidebar-section-inner"
        className="grid grid-cols-[auto_1fr] gap-y-0.5 in-data-[state=collapsed]:gap-y-1.5 *:data-[slot=control]:col-span-full"
      >
        {props.children}
      </div>
    </div>
  )
}

/**
 * A row on the ink rail. Muted at rest; hover lays a carbon bar under it;
 * press prints it solid (paper bar, ink words); the current row is bold paper
 * with a red station at its start; disabled is struck through; focus is the
 * bracket. `[data-demo]` forces a state for the Component Catalog.
 */
const railRow = [
  "bracket relative min-w-0 items-center px-2 py-2 text-start font-medium text-[0.9375rem]/5 text-muted-fg no-underline outline-0 transition-colors duration-150",
  "[&_svg:not([class*='size-'])]:size-5 sm:[&_svg:not([class*='size-'])]:size-4 [&_svg:not([class*='text-'])]:text-current **:[svg]:shrink-0",
  "data-hovered:bg-carbon-raised data-hovered:text-fg in-data-[demo=hover]:bg-carbon-raised in-data-[demo=hover]:text-fg",
  "data-pressed:bg-fg data-pressed:text-bg in-data-[demo=pressed]:bg-fg in-data-[demo=pressed]:text-bg",
  "aria-[current=page]:font-bold aria-[current=page]:text-fg data-current:font-bold data-current:text-fg",
  "before:pointer-events-none before:absolute before:top-1/2 before:-start-3 before:size-2 before:-translate-y-1/2 before:bg-sidebar-primary before:opacity-0 in-data-[state=collapsed]:before:start-0.5 in-data-[state=collapsed]:before:size-1.5 aria-[current=page]:before:opacity-100 data-current:before:opacity-100 forced-colors:before:bg-[CanvasText]",
  "data-disabled:cursor-not-allowed data-disabled:text-muted-fg data-disabled:line-through in-data-[demo=disabled]:line-through",
]

interface SidebarItemProps extends Omit<React.ComponentProps<typeof Link>, "children"> {
  isCurrent?: boolean
  children?:
    | React.ReactNode
    | ((
        values: LinkRenderProps & { defaultChildren: React.ReactNode; isCollapsed: boolean }
      ) => React.ReactNode)
  tooltip?: string | React.ComponentProps<typeof TooltipContent>
}

const SidebarItem = ({
  isCurrent,
  tooltip,
  children,
  className,
  ref,
  ...props
}: SidebarItemProps) => {
  const { state, isMobile } = useSidebar()
  const isCollapsed = state === "collapsed" && !isMobile
  const link = (
    <LinkPrimitive
      ref={ref}
      data-slot="sidebar-item"
      aria-current={isCurrent ? "page" : undefined}
      className={composeRenderProps(className, (className) =>
        cn(
          railRow,
          "group/sidebar-item col-span-full w-full has-[a]:p-0",
          "grid grid-cols-[auto_1fr_1.5rem_0.5rem_auto] supports-[grid-template-columns:subgrid]:grid-cols-subgrid **:last:[svg]:ms-auto",
          "**:last:[svg]:size-5 sm:**:last:[svg]:size-4",
          "[&:has(svg+[data-slot=sidebar-label])_svg:has(+[data-slot=sidebar-label])]:me-2.5",

          // avatar
          "**:data-[slot=avatar]:[--avatar-size:--spacing(5)]",
          "[&:has([data-slot=avatar]+[data-slot=sidebar-label])_[data-slot=avatar]:has(+[data-slot=sidebar-label])]:me-2.5",
          className
        )
      )}
      {...props}
    >
      {(values) => (
        <>{typeof children === "function" ? children({ ...values, isCollapsed }) : children}</>
      )}
    </LinkPrimitive>
  )
  if (typeof tooltip === "string") {
    tooltip = {
      children: tooltip,
    }
  }

  return (
    <Tooltip delay={0}>
      {link}
      <TooltipContent
        className="**:data-[slot=sidebar-label-mask]:hidden **:[svg]:hidden"
        inverse
        placement="right"
        arrow
        hidden={!isCollapsed || isMobile || !tooltip}
        {...tooltip}
      />
    </Tooltip>
  )
}

function SidebarBadge({ className, ...props }: React.ComponentProps<"span">) {
  const { state, isMobile } = useSidebar()

  if (state === "collapsed" && !isMobile) {
    return (
      <span
        aria-hidden
        data-slot="sidebar-badge"
        className="absolute end-1 top-1 size-1.5 bg-fg forced-colors:bg-[CanvasText]"
      />
    )
  }

  return (
    <span
      data-slot="sidebar-badge"
      className={cn(
        "num absolute inset-y-1/2 end-1.5 h-5 w-auto min-w-6 -translate-y-1/2 border-2 border-input bg-secondary px-1 text-center font-semibold text-fg text-xs/4 in-[[data-collapsible=none][data-state=collapsed]]:hidden",
        className
      )}
      {...props}
    />
  )
}

interface SidebarLinkProps extends LinkProps {
  ref?: React.RefObject<HTMLAnchorElement>
}

const SidebarLink = ({ className, ref, ...props }: SidebarLinkProps) => {
  return (
    <LinkPrimitive
      ref={ref}
      className={cx(
        "bracket relative col-span-full min-w-0 shrink-0 items-center p-2 no-underline outline-0",
        "grid grid-cols-[auto_1fr_1.5rem_0.5rem_auto] supports-[grid-template-columns:subgrid]:grid-cols-subgrid",
        className
      )}
      {...props}
    />
  )
}

const SidebarInset = ({ className, ref, ...props }: React.ComponentProps<"main">) => {
  return (
    <main
      data-slot="sidebar-inset"
      ref={ref}
      className={cn(
        "relative flex w-full flex-1 flex-col bg-bg text-fg lg:min-w-0",
        "md:group-has-data-[intent=inset]/sidebar-root:border-2 group-has-data-[intent=inset]/sidebar-root:border-rule group-has-data-[intent=inset]/sidebar-root:bg-muted",
        "md:group-has-data-[intent=inset]/sidebar-root:m-2",
        "md:group-has-data-[side=left]:group-has-data-[intent=inset]/sidebar-root:ms-0",
        "md:group-has-data-[side=right]:group-has-data-[intent=inset]/sidebar-root:me-0",
        "md:group-has-data-[intent=inset]/sidebar-root:peer-data-[state=collapsed]:ms-2",
        className
      )}
      {...props}
    />
  )
}

type SidebarDisclosureGroupProps = DisclosureGroupProps
const SidebarDisclosureGroup = ({
  allowsMultipleExpanded = true,
  className,
  ...props
}: SidebarDisclosureGroupProps) => {
  return (
    <DisclosureGroup
      data-slot="sidebar-disclosure-group"
      allowsMultipleExpanded={allowsMultipleExpanded}
      className={cx(
        "col-span-full flex min-w-0 flex-col gap-y-0.5 in-data-[state=collapsed]:gap-y-1.5",
        className
      )}
      {...props}
    />
  )
}

interface SidebarDisclosureProps extends DisclosureProps {
  ref?: React.Ref<HTMLDivElement>
}

const SidebarDisclosure = ({ className, ref, ...props }: SidebarDisclosureProps) => {
  const { state } = useSidebar()
  return (
    <Disclosure
      ref={ref}
      data-slot="sidebar-disclosure"
      className={cx("col-span-full min-w-0", state === "collapsed" ? "px-2" : "px-4", className)}
      {...props}
    />
  )
}

interface SidebarDisclosureTriggerProps extends ButtonProps {
  ref?: React.Ref<HTMLButtonElement>
}

const SidebarDisclosureTrigger = ({ className, ref, ...props }: SidebarDisclosureTriggerProps) => {
  const { state } = useSidebar()
  return (
    <Heading level={3}>
      <ButtonPrimitive
        ref={ref}
        slot="trigger"
        className={composeRenderProps(className, (className) =>
          cn(
            // A group label, like a Category on the Component Catalog rail.
            railRow,
            "group/sidebar-disclosure-trigger col-span-full flex w-full gap-2.5 py-2.5 font-extrabold text-[0.8125rem]/4 uppercase tracking-[0.07em] [font-stretch:87.5%]",
            "**:[svg]:size-5 **:[svg]:shrink-0 sm:**:[svg]:size-4",
            "**:last:[svg]:size-5 sm:**:last:[svg]:size-4 **:last:[svg]:ms-auto",
            "**:data-[slot=avatar]:size-6 sm:**:data-[slot=avatar]:size-5",
            className
          )
        )}
        {...props}
      >
        {(values) => (
          <>
            {typeof props.children === "function" ? props.children(values) : props.children}
            {state !== "collapsed" && (
              <HiChevronDown
                data-slot="chevron"
                aria-hidden
                className="z-10 ms-auto size-4 transition-transform duration-200 group-aria-[expanded=false]/sidebar-disclosure-trigger:-rotate-90"
              />
            )}
          </>
        )}
      </ButtonPrimitive>
    </Heading>
  )
}

const SidebarDisclosurePanel = ({ className, ...props }: DisclosurePanelProps) => {
  return (
    <DisclosurePanel
      data-slot="sidebar-disclosure-panel"
      className={cx(
        "h-(--disclosure-panel-height) overflow-clip transition-[height] duration-200",
        className
      )}
      {...props}
    >
      <div
        data-slot="sidebar-disclosure-panel-content"
        className="col-span-full grid grid-cols-[auto_1fr] gap-y-0.5 in-data-[state=collapsed]:gap-y-1.5"
      >
        {props.children}
      </div>
    </DisclosurePanel>
  )
}

const SidebarSeparator = ({ className, ...props }: SidebarSeparatorProps) => {
  return (
    <Separator
      data-slot="sidebar-separator"
      orientation="horizontal"
      className={cn(
        "mx-auto h-0.5 w-[calc(var(--sidebar-width)-(--spacing(8)))] border-0 bg-sidebar-border forced-colors:bg-[ButtonBorder]",
        className
      )}
      {...props}
    />
  )
}

const SidebarTrigger = ({
  onPress,
  className,
  children,
  ...props
}: React.ComponentProps<typeof Button>) => {
  const { toggleSidebar } = useSidebar()
  return (
    <Button
      aria-label={props["aria-label"] || "Toggle Sidebar"}
      data-slot="sidebar-trigger"
      intent={props.intent || "plain"}
      size={props.size || "sq-sm"}
      className={cx("shrink-0", className)}
      onPress={(event) => {
        onPress?.(event)
        toggleSidebar()
      }}
      {...props}
    >
      {children || (
        <>
          <svg
            className="size-4"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 16 16"
            width={16}
            height={16}
            fill="currentcolor"
          >
            <path d="M13.25 2.5c.69 0 1.25.56 1.25 1.25v8.5c0 .69-.56 1.25-1.25 1.25H7.5V15h5.75A2.75 2.75 0 0 0 16 12.25v-8.5A2.75 2.75 0 0 0 13.25 1H7.5v1.5zM5.75 1a.75.75 0 0 1 .75.75v12.5a.75.75 0 0 1-.75.75h-3A2.75 2.75 0 0 1 0 12.25v-8.5A2.75 2.75 0 0 1 2.75 1z" />
          </svg>
          <span className="sr-only">Toggle Sidebar</span>
        </>
      )}
    </Button>
  )
}

const SidebarRail = ({ className, ref, ...props }: React.ComponentProps<"button">) => {
  const { toggleSidebar } = useSidebar()

  return !props.children ? (
    <button
      ref={ref}
      data-slot="sidebar-rail"
      aria-label="Toggle Sidebar"
      title="Toggle Sidebar"
      tabIndex={-1}
      onClick={toggleSidebar}
      className={cn(
        "absolute inset-y-0 z-20 hidden w-4 -translate-x-1/2 outline-hidden transition-all ease-linear after:absolute after:inset-y-0 after:left-1/2 after:w-0.5 hover:after:bg-rule group-data-[side=left]:-right-4 group-data-[side=right]:left-0 sm:flex",
        "in-data-[side=left]:cursor-w-resize in-data-[side=right]:cursor-e-resize",
        "[[data-side=left][data-state=collapsed]_&]:cursor-e-resize [[data-side=right][data-state=collapsed]_&]:cursor-w-resize",
        "group-data-[collapsible=hidden]:translate-x-0 group-data-[collapsible=hidden]:hover:bg-carbon-raised group-data-[collapsible=hidden]:after:left-full",
        "[[data-side=left][data-collapsible=hidden]_&]:-right-2 [[data-side=right][data-collapsible=hidden]_&]:-left-2",
        className
      )}
      {...props}
    />
  ) : (
    props.children
  )
}

function SidebarLabel({ className, ref, ...props }: React.ComponentProps<"span">) {
  const { state, isMobile } = useSidebar()
  const collapsed = state === "collapsed" && !isMobile
  if (!collapsed) {
    return (
      <span
        data-slot="sidebar-label"
        tabIndex={-1}
        ref={ref}
        className={cn(
          // On a phone an inline dock still hides its labels.
          "col-start-2 truncate pe-6 outline-hidden in-[[data-collapsible=none][data-state=collapsed]]:hidden",
          className
        )}
        {...props}
      />
    )
  }
  return null
}

interface SidebarNavProps extends React.ComponentProps<"nav"> {
  isSticky?: boolean
}

const SidebarNav = ({ isSticky = false, className, ...props }: SidebarNavProps) => {
  return (
    <nav
      data-slot="sidebar-nav"
      className={cn(
        "isolate flex min-h-16 items-center justify-between gap-x-2 border-rule border-b-2 bg-bg px-(--container-padding,--spacing(4)) py-2.5 text-fg sm:justify-start sm:px-(--gutter,--spacing(4)) md:w-full",
        isSticky && "static top-0 z-40 group-has-data-[intent=default]/sidebar-root:sticky",
        className
      )}
      {...props}
    />
  )
}

interface SidebarMenuTriggerProps extends ButtonProps {
  alwaysVisible?: boolean
}
const SidebarMenuTrigger = ({
  alwaysVisible = false,
  className,
  ...props
}: SidebarMenuTriggerProps) => {
  return (
    <ButtonPrimitive
      className={cx(
        !alwaysVisible &&
          "pressed:text-fg text-muted-fg opacity-0 pressed:opacity-100 hover:text-fg",
        "absolute end-0 flex h-full w-[calc(var(--sidebar-width)-90%)] items-center justify-end pe-2.5 outline-hidden",
        "[&_svg:not([class*='size-'])]:size-5 sm:[&_svg:not([class*='size-'])]:size-4 pressed:[&_svg:not([class*='text-'])]:text-fg **:[svg]:shrink-0",
        "group-hover/sidebar-item:opacity-100 group-focus-visible/sidebar-item:opacity-100 group/sidebar-item:pressed:opacity-100",
        "group-hover/tree-item:opacity-100 group-focus-visible/tree-item:opacity-100 group/tree-item:pressed:opacity-100",
        className
      )}
      {...props}
    />
  )
}

interface SidebarTreeProps<T extends object> extends NavigationTreeProps<T> {}
function SidebarTree<T extends object>({ className, ...props }: SidebarTreeProps<T>) {
  return (
    <NavigationTree
      className={cx(
        "col-span-full flex w-full min-w-0 cursor-default flex-col gap-y-0.5 in-data-[state=collapsed]:p-2 p-4 outline-hidden forced-color-adjust-none",
        className
      )}
      {...props}
    />
  )
}

function SidebarTreeItem<T extends object>({ className, ...props }: NavigationTreeItemProps<T>) {
  return (
    <NavigationTreeItem
      className={cx(
        "min-w-0 shrink-0 cursor-default select-none outline-hidden",
        "href" in props && "cursor-pointer",
        className
      )}
      {...props}
    />
  )
}

interface SidebarTreeContentProps extends NavigationTreeItemContentProps {
  className?: string
  isCurrent?: boolean
}

function SidebarTreeContent({ className, isCurrent, children }: SidebarTreeContentProps) {
  return (
    <NavigationTreeItemContent>
      {(values) => (
        <div data-slot="sidebar-item-content" className="relative flex w-full min-w-0 items-center">
          <div
            aria-hidden
            className="shrink-0"
            style={{
              width: `calc((var(--tree-item-level) - 1) * 1.25rem)`,
            }}
          />
          <div
            data-current={values.isCurrent || isCurrent || undefined}
            data-hovered={values.isHovered || undefined}
            data-pressed={values.isPressed || undefined}
            data-disabled={values.isDisabled || undefined}
            className={cn(
              railRow,
              "group/tree-item flex flex-1 gap-x-2 **:[svg]:-mx-0.5",
              values.isFocusVisible && "after:transform-none after:opacity-100",
              values.isCurrentAncestor && "text-fg",
              className
            )}
          >
            {values.hasChildItems && (
              <TreeIndicator
                values={{
                  isDisabled: values.isDisabled,
                  isExpanded: values.isExpanded,
                }}
              />
            )}
            {typeof children === "function" ? children(values) : children}
          </div>
        </div>
      )}
    </NavigationTreeItemContent>
  )
}

interface SidebarTreeLinkProps extends Omit<LinkProps, "href"> {}

function SidebarTreeLink({ className, ...props }: SidebarTreeLinkProps) {
  return (
    <LinkPrimitive
      data-slot="sidebar-tree-link"
      className={cx(
        "flex min-w-0 flex-1 items-center gap-x-2 no-underline outline-hidden focus-visible:outline-hidden",
        className
      )}
      {...props}
    />
  )
}

function SidebarTreeLabel({ className, ...props }: React.ComponentProps<"span">) {
  const { state, isMobile } = useSidebar()

  if (state === "collapsed" && !isMobile) {
    return null
  }

  return (
    <span
      data-slot="sidebar-label"
      className={cn("col-start-2 truncate pe-6 outline-hidden", className)}
      {...props}
    />
  )
}

export type {
  SidebarDisclosureGroupProps,
  SidebarDisclosureProps,
  SidebarDisclosureTriggerProps,
  SidebarItemProps,
  SidebarLinkProps,
  SidebarNavProps,
  SidebarProps,
  SidebarProviderProps,
  SidebarSectionProps,
  SidebarSeparatorProps,
}

export {
  Sidebar,
  SidebarContent,
  SidebarDisclosure,
  SidebarDisclosureGroup,
  SidebarDisclosurePanel,
  SidebarDisclosureTrigger,
  SidebarFooter,
  SidebarHeader,
  SidebarInset,
  SidebarBadge,
  SidebarItem,
  SidebarLabel,
  SidebarLink,
  SidebarMenuTrigger,
  SidebarNav,
  SidebarProvider,
  SidebarRail,
  SidebarSection,
  SidebarSectionGroup,
  SidebarSeparator,
  SidebarTree,
  SidebarTreeContent,
  SidebarTreeItem,
  SidebarTreeLabel,
  SidebarTreeLink,
  SidebarTrigger,
  useSidebar,
}
