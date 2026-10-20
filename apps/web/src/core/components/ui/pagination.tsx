"use client"

import { cn } from "cn"
import {
  Link as LinkPrimitive,
  type LinkProps as LinkPrimitiveProps,
} from "react-aria-components/Link"
import { type ButtonProps, buttonStyles } from "@/core/components/ui/button"
import { Text } from "@/core/components/ui/text"

const Pagination = ({ className, ref, ...props }: React.ComponentProps<"nav">) => (
  <nav
    data-slot="pagination"
    aria-label="pagination"
    className={cn(
      "mx-auto flex w-full items-center justify-center gap-1 [--pagination-gap:--spacing(1)] **:data-[slot=control]:w-auto",
      "**:data-[slot=pagination-item]:cursor-default",
      className
    )}
    ref={ref}
    {...props}
  />
)

const PaginationSection = ({ className, ref, ...props }: React.ComponentProps<"ul">) => (
  <li data-slot="pagination-section">
    <ul ref={ref} className={cn("flex h-full gap-1.5 text-sm/6", className)} {...props} />
  </li>
)

const PaginationList = ({ className, ref, ...props }: React.ComponentProps<"ul">) => {
  return (
    <ul
      ref={ref}
      data-slot="pagination-list"
      aria-label={props["aria-label"] || "Pagination"}
      className={cn("flex gap-1", className)}
      {...props}
    />
  )
}

/** The page cell is a fixed square, so the numbers sit in one column. */
const cellSizes: Record<string, string> = {
  xs: "w-8 sm:w-7",
  sm: "w-9 sm:w-8",
  md: "w-11 sm:w-10",
  lg: "w-12 sm:w-11",
}

interface PaginationItemProps
  extends Omit<LinkPrimitiveProps, "children">, Pick<ButtonProps, "isCircle" | "size" | "intent"> {
  className?: string
  isCurrent?: boolean
  children?: string | number | React.ReactNode
}

const PaginationItem = ({
  className,
  size = "sm",
  isCircle,
  isCurrent,
  intent,
  ...props
}: PaginationItemProps) => {
  return (
    <li>
      {/* A printed mark, not an ink link: the page number sits in a cell, and
          the current one is a solid print with the red route stroke. */}
      <LinkPrimitive
        data-slot="pagination-item"
        href={isCurrent ? undefined : props.href}
        aria-current={isCurrent ? "page" : undefined}
        data-selected={isCurrent ? "" : undefined}
        className={buttonStyles({
          size: size,
          isCircle: isCircle,
          intent: intent ?? "plain",
          className: cn(
            // The one numerals face, in a fixed column.
            "num touch-target shrink-0 justify-center font-semibold tracking-[0.02em] [font-stretch:75%]",
            "[--mark-line:transparent] [--mark-weight:0px] [--mark-hover-line:var(--fg)]",
            cellSizes[size] ?? "w-9 sm:w-8",
            className
          ),
        })}
        {...props}
      />
    </li>
  )
}

const PaginationFirst = (props: PaginationItemProps) => {
  return (
    <PaginationItem data-slot="pagination-item" aria-label="First page" {...props}>
      <>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width={16}
          height={16}
          fill="none"
          viewBox="0 0 25 24"
          aria-hidden="true"
        >
          <path
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1.5"
            d="m17.5 18-6-6 6-6m-10 0v12"
          />
        </svg>
        {props.children}
      </>
    </PaginationItem>
  )
}

const PaginationPrevious = (props: PaginationItemProps) => {
  return (
    <PaginationItem {...props}>
      <>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
          aria-hidden="true"
          data-slot="icon"
        >
          <path
            fillRule="evenodd"
            d="M11.78 5.22a.75.75 0 0 1 0 1.06L8.06 10l3.72 3.72a.75.75 0 1 1-1.06 1.06l-4.25-4.25a.75.75 0 0 1 0-1.06l4.25-4.25a.75.75 0 0 1 1.06 0Z"
            clipRule="evenodd"
          />
        </svg>
        {props.children}
      </>
    </PaginationItem>
  )
}

const PaginationNext = (props: PaginationItemProps) => {
  return (
    <PaginationItem aria-label="Next page" {...props}>
      <>
        {props.children}
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
          aria-hidden="true"
        >
          <path
            fillRule="evenodd"
            d="M8.22 5.22a.75.75 0 0 1 1.06 0l4.25 4.25a.75.75 0 0 1 0 1.06l-4.25 4.25a.75.75 0 0 1-1.06-1.06L11.94 10 8.22 6.28a.75.75 0 0 1 0-1.06Z"
            clipRule="evenodd"
          />
        </svg>
      </>
    </PaginationItem>
  )
}

const PaginationLast = (props: PaginationItemProps) => {
  return (
    <PaginationItem aria-label="Last page" {...props}>
      <>
        {props.children}
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width={16}
          height={16}
          fill="none"
          viewBox="0 0 25 24"
          className="intentui-icons size-4"
          aria-hidden="true"
        >
          <path
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1.5"
            d="m7.5 18 6-6-6-6m10 0v12"
          />
        </svg>
      </>
    </PaginationItem>
  )
}

const PaginationSpacer = ({ className, ...props }: React.ComponentPropsWithoutRef<"div">) => {
  return <div aria-hidden className={cn("flex-1", className)} {...props} />
}

const PaginationGap = ({
  className,
  children = <>&hellip;</>,
  ...props
}: React.ComponentProps<"li">) => {
  return (
    <li
      data-slot="pagination-gap"
      className={cn(
        "num w-9 select-none text-center font-semibold text-muted-fg text-sm/6 outline-hidden",
        className
      )}
      {...props}
      aria-hidden
    >
      {children}
    </li>
  )
}

const PaginationLabel = ({ className, ...props }: React.ComponentPropsWithoutRef<"li">) => {
  return (
    <li
      data-slot="pagination-label"
      className={cn(
        "text-muted-fg min-w-4 self-center text-sm *:[strong]:font-semibold *:[strong]:text-fg *:[strong]:num",
        className
      )}
      {...props}
    />
  )
}

const PaginationInfo = Text

export {
  Pagination,
  PaginationFirst,
  PaginationGap,
  PaginationInfo,
  PaginationItem,
  PaginationLabel,
  PaginationLast,
  PaginationList,
  PaginationNext,
  PaginationPrevious,
  PaginationSection,
  PaginationSpacer,
}
