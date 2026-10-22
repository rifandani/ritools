"use client"

import { HiBars2 } from "react-icons/hi2"
import { LayoutGroup, motion, useReducedMotion } from "motion/react"
import { createContext, use, useCallback, useId, useMemo, useState } from "react"
import { twJoin, cn } from "cn"
import { Link as LinkPrimitive } from "react-aria-components/Link"
import type { LinkProps } from "@/core/components/ui/link"
import { useIsMobile } from "@/core/hooks/use-mobile"
import { cx } from "@/core/utils/primitive"
import { Button, type ButtonProps } from "./button"
import { Separator } from "./separator"
import { Sheet, SheetBody, SheetContent } from "./sheet"

interface NavbarContextProps {
  open: boolean
  setOpen: (open: boolean) => void
  isMobile: boolean
  toggleNavbar: () => void
}

const NavbarContext = createContext<NavbarContextProps | null>(null)

const useNavbar = () => {
  const context = use(NavbarContext)
  if (!context) {
    throw new Error("useNavbar must be used within a NavbarProvider.")
  }

  return context
}

interface NavbarProviderProps extends React.ComponentProps<"div"> {
  defaultOpen?: boolean
  isOpen?: boolean
  onOpenChange?: (open: boolean) => void
}

const NavbarProvider = ({
  isOpen: openProp,
  onOpenChange: setOpenProp,
  defaultOpen = false,
  className,
  ...props
}: NavbarProviderProps) => {
  const [openInternal, setOpenInternal] = useState(defaultOpen)
  const open = openProp ?? openInternal

  const setOpen = useCallback(
    (value: boolean | ((value: boolean) => boolean)) => {
      if (setOpenProp) {
        return setOpenProp?.(typeof value === "function" ? value(open) : value)
      }

      setOpenInternal(value)
    },
    [setOpenProp, open]
  )

  const toggleNavbar = useCallback(() => {
    setOpen((open) => !open)
  }, [setOpen])

  const isMobile = useIsMobile()

  const contextValue = useMemo<NavbarContextProps>(
    () => ({
      open,
      setOpen,
      isMobile: isMobile ?? false,
      toggleNavbar,
    }),
    [open, setOpen, isMobile, toggleNavbar]
  )

  if (isMobile === undefined) {
    return null
  }

  return (
    <NavbarContext value={contextValue}>
      <div
        className={cn(
          "peer/navbar group/navbar relative isolate z-10 flex w-full flex-col",
          // The navbar is a red field in both color modes.
          "has-data-navbar-inset:min-h-svh has-data-navbar-inset:bg-navbar",
          className
        )}
        {...props}
      />
    </NavbarContext>
  )
}

type Intent = "default" | "float" | "inset"
type Placement = "top" | "bottom"
type Side = "left" | "right"

interface StickyWithPlacement extends React.ComponentProps<"div"> {
  isSticky: true
  placement?: Placement
  side?: Side
  intent?: Intent
}

interface NonStickyWithoutPlacement extends React.ComponentProps<"div"> {
  isSticky?: false
  placement?: never
  side?: Side
  intent?: Intent
}

type NavbarProps = StickyWithPlacement | NonStickyWithoutPlacement

const Navbar = ({
  children,
  isSticky,
  placement = "top",
  intent = "default",
  side = "left",
  className,
  ref,
  ...props
}: NavbarProps) => {
  const { isMobile, open, setOpen } = useNavbar()
  if (isMobile) {
    return (
      <>
        <span
          className="sr-only"
          aria-hidden
          data-navbar={intent}
          data-navbar-sticky={isSticky}
          data-placement={placement ?? undefined}
        />
        <Sheet isOpen={open} onOpenChange={setOpen} {...props}>
          <SheetContent
            side={side}
            aria-label="Mobile Navbar"
            className="[&>button]:hidden"
          >
            <SheetBody className="p-[calc(var(--gutter)-(--spacing(2)))] sm:p-[calc(var(--gutter)-(--spacing(4)))]">
              {children}
            </SheetBody>
          </SheetContent>
        </Sheet>
      </>
    )
  }

  return (
    <div
      data-navbar={intent}
      ref={ref}
      data-placement={placement ?? undefined}
      data-navbar-sticky={isSticky}
      className={cn([
        "group/navbar-intent relative isolate",
        isSticky && "sticky top-0 z-40",
        placement === "top" && intent === "float" && "md:pt-8",
        placement === "bottom" && intent === "float" && "bottom-0 md:pb-8",
        intent === "float" && "mx-auto w-full max-w-7xl px-4 xl:max-w-(--breakpoint-xl)",
      ])}
      {...props}
    >
      <div
        className={cn(
          "relative isolate hidden py-(--navbar-gutter) [--navbar-gutter:--spacing(2.5)] md:block",
          // The red field (`ground-red`): stock controls on it turn white.
          intent === "float" && "bg-bg py-0",
          ["default", "inset"].includes(intent) && "ground-red min-h-16 px-4 sm:px-6",
          className
        )}
      >
        <div
          data-navbar="content"
          className={cn(
            "mx-auto flex min-h-11 w-full max-w-(--breakpoint-2xl) items-center gap-2.5",
            intent === "float" && "ground-red min-h-16 max-w-7xl px-4 py-(--navbar-gutter)"
          )}
        >
          {children}
        </div>
      </div>
    </div>
  )
}

const NavbarSection = ({ className, ...props }: React.ComponentProps<"div">) => {
  const id = useId()
  return (
    <LayoutGroup id={id}>
      <div
        data-slot="navbar-section"
        className={cn(
          "col-span-full gap-y-0.5 max-md:grid max-md:grid-cols-[auto_1fr] max-md:flex-col max-md:gap-3 md:flex md:flex-none md:flex-row md:items-center md:gap-2.5",
          className
        )}
        {...props}
      >
        {props.children}
      </div>
    </LayoutGroup>
  )
}

interface NavbarItemProps extends LinkProps {
  isCurrent?: boolean
}

const NavbarItem = ({ className, isCurrent, ...props }: NavbarItemProps) => {
  const reduceMotion = useReducedMotion()
  return (
    <LinkPrimitive
      data-slot="navbar-item"
      aria-current={isCurrent ? "page" : undefined}
      className={cx(
        [
          // A plain printed mark (globals.css): no outline at rest, a 2px
          // outline on hover, a solid fill when pressed, a bracket on focus.
          "mark [--mark-fill:var(--fg)] [--mark-hover-line:var(--fg)] [--mark-line:transparent]",
          "href" in props ? "cursor-pointer" : "cursor-default",
          "col-span-full grid grid-cols-[auto_1fr_1.5rem_0.5rem_auto] supports-[grid-template-columns:subgrid]:grid-cols-subgrid md:supports-[grid-template-columns:subgrid]:grid-cols-none",
          "min-h-11 min-w-0 items-center gap-x-3 px-3 py-2 text-start font-bold text-[0.9375rem]/6 uppercase tracking-[0.05em] no-underline outline-0 [font-stretch:87.5%] md:min-h-10 md:gap-x-2 md:text-sm/5",
          "*:[svg]:size-5 *:[svg]:shrink-0 md:*:[svg]:size-4",
          "*:data-[slot=loader]:size-5 *:data-[slot=loader]:shrink-0 md:*:data-[slot=loader]:size-4",
          "*:not-nth-2:last:[svg]:row-start-1 *:not-nth-2:last:[svg]:ms-auto *:not-nth-2:last:[svg]:size-5 md:*:not-nth-2:last:[svg]:size-4",
          "*:data-[slot=avatar]:-m-0.5 *:data-[slot=avatar]:size-6 md:*:data-[slot=avatar]:size-5",
          "forced-colors:data-disabled:text-[GrayText]",
        ],
        className
      )}
      {...props}
    >
      {(values) => (
        <>
          {typeof props.children === "function" ? props.children(values) : props.children}

          {/*
           * The current item: a 4px bar under the label (a square station in
           * the phone sheet). It travels to the next item on the expo ease;
           * under reduced motion it moves at once. Motion owns `transform`,
           * so the placement uses `translate` only.
           */}
          {(isCurrent || values.isCurrent) && (
            <motion.span
              aria-hidden
              data-slot="current-indicator"
              layoutId="current-indicator"
              transition={
                reduceMotion ? { duration: 0 } : { duration: 0.5, ease: [0.16, 1, 0.3, 1] }
              }
              className={twJoin(
                "pointer-events-none absolute bg-fg forced-colors:bg-[CanvasText]",
                "top-1/2 -start-3.5 size-2 -translate-y-1/2",
                "md:inset-x-1 md:top-auto md:-bottom-2 md:size-auto md:h-1 md:translate-y-0"
              )}
            />
          )}
        </>
      )}
    </LinkPrimitive>
  )
}

const NavbarSpacer = ({ className, ref, ...props }: React.ComponentProps<"div">) => {
  return <div ref={ref} className={cn("-ms-4 flex-1", className)} {...props} />
}

const NavbarStart = ({ className, ref, ...props }: React.ComponentProps<"div">) => {
  return (
    <div
      ref={ref}
      className={cn(
        "relative p-2 py-4 md:px-(--navbar-gutter) md:py-[calc(var(--navbar-gutter)---spacing(0.5))]",
        className
      )}
      {...props}
    />
  )
}

const NavbarGap = ({ className, ref, ...props }: React.ComponentProps<"div">) => {
  return <div ref={ref} className={cn("mx-2", className)} {...props} />
}

const NavbarSeparator = ({ className, ...props }: React.ComponentProps<typeof Separator>) => {
  return <Separator orientation="vertical" className={cn("h-5", className)} {...props} />
}

const NavbarMobile = ({ className, ref, ...props }: React.ComponentProps<"div">) => {
  return (
    <div
      ref={ref}
      data-slot="navbar-mobile"
      className={cn(
        "group/navbar-mobile ground-red flex min-h-16 items-center gap-x-3 px-4 py-2.5 md:hidden",
        "group-has-data-navbar-sticky/navbar:sticky",
        // top
        "group-has-data-navbar-sticky/navbar:group-has-placement-top/navbar:top-0",
        // bottom
        "group-has-data-navbar-sticky/navbar:group-has-placement-bottom/navbar:bottom-0",
        className
      )}
      {...props}
    />
  )
}

const NavbarInset = ({ className, ref, children, ...props }: React.ComponentProps<"div">) => {
  return (
    <div
      ref={ref}
      data-navbar-inset={true}
      className={cn("flex flex-1 flex-col bg-navbar pb-2 md:px-2", className)}
      {...props}
    >
      {/* A paper sheet pinned inside the red field, framed by a 2px ink rule. */}
      <div className="grow bg-bg p-6 text-fg md:border-2 md:border-rule md:p-16">
        <div className="mx-auto max-w-7xl">{children}</div>
      </div>
    </div>
  )
}

interface NavbarTriggerProps extends ButtonProps {
  ref?: React.RefObject<HTMLButtonElement>
}

const NavbarTrigger = ({ className, onPress, ref, ...props }: NavbarTriggerProps) => {
  const { toggleNavbar } = useNavbar()
  return (
    <Button
      ref={ref}
      data-slot="navbar-trigger"
      intent="plain"
      aria-label={props["aria-label"] || "Toggle Navbar"}
      size="sq-sm"
      className={cx("-ms-2 lg:hidden", className)}
      onPress={(event) => {
        onPress?.(event)
        toggleNavbar()
      }}
      {...props}
    >
      <HiBars2 />
      <span className="sr-only">Toggle Navbar</span>
    </Button>
  )
}

const NavbarLabel = ({ className, ...props }: React.ComponentProps<"span">) => {
  return (
    <span
      data-slot="navbar-label"
      className={twJoin("col-start-2 row-start-1 truncate", className)}
      {...props}
    />
  )
}

export type { NavbarItemProps, NavbarProps, NavbarProviderProps, NavbarTriggerProps }
export {
  Navbar,
  NavbarGap,
  NavbarInset,
  NavbarItem,
  NavbarLabel,
  NavbarMobile,
  NavbarProvider,
  NavbarSection,
  NavbarSeparator,
  NavbarSpacer,
  NavbarStart,
  NavbarTrigger,
  useNavbar,
}
