'use client'

import { createContext, use } from "react"
import { composeRenderProps } from "react-aria-components/composeRenderProps"
import { SelectionIndicator } from "react-aria-components/SelectionIndicator"
import { useSlottedContext } from "react-aria-components/slots"
import type {
  TabListProps as TabListPrimitiveProps,
  TabPanelProps as TabPanelPrimitiveProps,
  TabPanelsProps,
  TabProps as TabPrimitiveProps,
  TabsProps as TabsPrimitiveProps,
} from "react-aria-components/Tabs"
import {
  Tab as TabPrimitive,
  TabList as TabListPrimitive,
  TabPanel as TabPanelPrimitive,
  TabPanels as PrimitiveTabPanels,
  Tabs as TabsPrimitive,
  TabsContext,
} from "react-aria-components/Tabs"
import { cn } from "cn"
import { cx } from "@/core/utils/primitive"

interface TabsProps extends TabsPrimitiveProps {
  ref?: React.RefObject<HTMLDivElement>
}
const Tabs = ({ className, ref, orientation = "horizontal", ...props }: TabsProps) => {
  return (
    <TabsContext value={{ orientation }}>
      <TabsPrimitive
        orientation={orientation}
        className={cx(
          orientation === "vertical" ? "w-full flex-row" : "flex-col",
          "group/tabs flex gap-4 self-start forced-color-adjust-none",
          className
        )}
        ref={ref}
        {...props}
      />
    </TabsContext>
  )
}
interface TabListContextValue {
  selectionIndicator?: boolean
}
const TabListContext = createContext<TabListContextValue | undefined>(undefined)

export function useTabListContext() {
  const context = use(TabListContext)
  if (!context) {
    throw new Error("useTabsContext must be used within TabsContext")
  }
  return context
}

interface TabListProps<T extends object> extends TabListPrimitiveProps<T>, TabListContextValue {
  ref?: React.RefObject<HTMLDivElement>
}
const TabList = <T extends object>({
  className,
  selectionIndicator = true,
  ref,
  ...props
}: TabListProps<T>) => {
  return (
    <TabListContext value={{ selectionIndicator }}>
      <TabListPrimitive
        ref={ref}
        data-slot="tab-list"
        {...props}
        className={composeRenderProps(className, (className, { orientation }) =>
          cn([
            "[--tab-list-gutter:--spacing(1)]",
            "relative flex forced-color-adjust-none",
            // A hard rule closes the list, the way it closes a column on paper.
            orientation === "horizontal" &&
              "border-rule flex-row gap-x-3 border-b-2",
            orientation === "vertical" &&
              "border-rule min-w-40 shrink-0 flex-col items-stretch gap-y-1 border-s-2",
            className,
          ])
        )}
      />
    </TabListContext>
  )
}

export function TabScrollArea({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div className="relative">
      <div className={cn("scrollbar-none overflow-x-auto sm:overflow-x-visible", className)}>
        <div
          className="bg-rule pointer-events-none absolute inset-x-0 bottom-0 h-0.5 w-full"
          aria-hidden
        />
        {props.children}
      </div>
    </div>
  )
}

interface TabProps extends TabPrimitiveProps {
  ref?: React.RefObject<HTMLDivElement>
}
const Tab = ({ className, ref, ...props }: TabProps) => {
  const { orientation } = useSlottedContext(TabsContext)!
  const { selectionIndicator } = useTabListContext()
  return (
    <TabPrimitive
      {...props}
      data-slot="tab"
      ref={ref}
      className={cx(
        "group/tab mark relative flex cursor-default items-center whitespace-nowrap outline-hidden transition",
        // The tab is a printed mark: muted at rest, ink on hover, solid when
        // pressed or current, struck when disabled.
        "[--mark-line:transparent] [--mark-weight:0px] [--mark-ink:var(--muted-fg)] [--mark-hover-ink:var(--fg)] [--mark-hover-line:var(--fg)] [--mark-fill:var(--fg)] [--mark-on-fill:var(--bg)] [--mark-foot:transparent]",
        orientation === "horizontal" ? "px-3 py-2" : "w-full justify-start px-3 py-2",
        "font-semibold text-sm/6",
        "data-selected:font-bold",
        "*:[svg]:-ms-0.5 *:[svg]:me-2 *:[svg]:size-4 *:[svg]:shrink-0 *:[svg]:self-center *:[svg]:text-muted-fg",
        "href" in props ? "cursor-pointer" : "cursor-default",
        className
      )}
    >
      {composeRenderProps(props.children, (children) => (
        <>
          {children}
          {selectionIndicator && (
            <SelectionIndicator
              data-slot="selected-indicator"
              className={cn(
                // The red route stroke. It slides along the list, the way the
                // stroke slides down the rail.
                "absolute bg-primary will-change-transform",
                orientation === "horizontal"
                  ? "inset-e-3 start-3 -bottom-[2px] h-1 motion-safe:transition-[translate,width] duration-500"
                  : "-start-[2px] top-2 bottom-2 w-1 motion-safe:transition-[translate,height] duration-500"
              )}
            />
          )}
        </>
      ))}
    </TabPrimitive>
  )
}

interface TabPanelProps extends TabPanelPrimitiveProps {
  ref?: React.RefObject<HTMLDivElement>
}

const TabPanels = <T extends object>(props: TabPanelsProps<T>) => {
  return <PrimitiveTabPanels {...props} />
}

const TabPanel = ({ className, ref, ...props }: TabPanelProps) => {
  return (
    <TabPanelPrimitive
      {...props}
      ref={ref}
      data-slot="tab-panel"
      className={cx(
        "flex-1 min-w-0 text-base/6 text-fg focus-visible:outline-hidden sm:text-sm/6",
        className
      )}
    />
  )
}

export type { TabListProps, TabPanelProps, TabProps, TabsProps }
export { Tab, TabList, TabPanel, TabPanels, Tabs }
