"use client"

import { HiChevronRight } from "react-icons/hi2"
import { createContext, use } from "react"
import type { BreadcrumbProps, BreadcrumbsProps } from "react-aria-components/Breadcrumbs"
import { Breadcrumb, Breadcrumbs as BreadcrumbsPrimitive } from "react-aria-components/Breadcrumbs"
import type { LinkProps } from "react-aria-components/Link"
import { cn } from "cn"
import { cx } from "@/core/utils/primitive"
import { Link } from "./link"
import { Ransom } from "./ransom"

type BreadcrumbsContextProps = { separator?: "chevron" | "slash" | boolean }
const BreadcrumbsProvider = createContext<BreadcrumbsContextProps>({
  separator: "chevron",
})

const Breadcrumbs = <T extends object>({
  className,
  ...props
}: BreadcrumbsProps<T> & BreadcrumbsContextProps) => {
  return (
    <BreadcrumbsProvider value={{ separator: props.separator }}>
      <BreadcrumbsPrimitive
        {...props}
        className={cn("flex flex-wrap items-center gap-x-1.5 gap-y-1", className)}
      />
    </BreadcrumbsProvider>
  )
}

interface BreadcrumbsItemProps extends BreadcrumbProps, BreadcrumbsContextProps {
  /**
   * The current page's name, printed in Ransom. It is the page's one `h1` and
   * never a link: a trail ends at the page it names.
   */
  ransom?: boolean
}

const BreadcrumbsItem = ({
  separator = true,
  className,
  ransom = false,
  children,
  ...props
}: BreadcrumbsItemProps & Partial<Omit<LinkProps, "className">>) => {
  const { separator: contextSeparator } = use(BreadcrumbsProvider)
  separator = contextSeparator ?? separator
  const separatorValue = separator === true ? "chevron" : separator

  return (
    <Breadcrumb
      className={cx("flex items-center gap-1.5 text-sm", className)}
      data-slot="breadcrumb-item"
      {...props}
    >
      {({ isCurrent }) => (
        <>
          {ransom ? (
            <Ransom
              aria-current="page"
              as="h1"
              className="text-[clamp(1.25rem,3.5vw,1.5rem)] max-sm:[--angle-tilt:0deg] max-sm:[--slash-run:0]"
            >
              {children as string}
            </Ransom>
          ) : (
            <Link
              className={cn(
                "has-data-[slot=icon]:inline-flex has-data-[slot=icon]:items-center has-data-[slot=icon]:gap-x-2 *:data-[slot=icon]:size-5 sm:*:data-[slot=icon]:size-4",
                // The trail is a route. The current page ends it: bold ink with
                // the red route stroke under it.
                isCurrent &&
                  "text-fg font-bold no-underline shadow-[inset_0_-4px_0_var(--primary)]"
              )}
              {...props}
            >
              {children}
            </Link>
          )}
          {!isCurrent && separator !== false && <Separator separator={separatorValue} />}
        </>
      )}
    </Breadcrumb>
  )
}

const Separator = ({
  separator = "chevron",
}: {
  separator?: BreadcrumbsItemProps["separator"]
}) => {
  return (
    <span
      aria-hidden
      className="flex h-4 w-3 items-center justify-center text-muted-fg *:shrink-0 *:data-[slot=icon]:size-3.5"
    >
      {separator === "chevron" && <HiChevronRight />}
      {separator === "slash" && <span className="block h-3.5 w-0.5 -skew-x-16 bg-rule" />}
    </span>
  )
}

export type { BreadcrumbsItemProps, BreadcrumbsProps }
export { Breadcrumbs, BreadcrumbsItem }
