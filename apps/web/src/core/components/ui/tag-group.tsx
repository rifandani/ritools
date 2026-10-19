"use client"

import { HiXMark } from "react-icons/hi2"
import { Button } from "react-aria-components/Button"
import type { TagGroupProps, TagListProps, TagProps } from "react-aria-components/TagGroup"
import {
  Tag as PrimitiveTag,
  TagGroup as PrimitiveTagGroup,
  TagList as PrimitiveTagList,
} from "react-aria-components/TagGroup"
import { cn } from "cn"
import { cx } from "@/core/utils/primitive"

export function TagGroup({ className, ...props }: TagGroupProps) {
  return (
    <PrimitiveTagGroup
      data-slot="control"
      className={cn(
        "flex flex-col gap-y-2",
        "*:[[slot=description]]:block *:[[slot=description]]:text-muted-fg *:[[slot=description]]:text-sm/6",
        className
      )}
      {...props}
    />
  )
}

export function TagList<T extends object>({ className, ...props }: TagListProps<T>) {
  return <PrimitiveTagList className={cx("flex flex-wrap gap-1.5", className)} {...props} />
}

/*
 * A tag is a small printed mark (globals.css): a 2px control edge at rest, a
 * doubled ink edge on hover, solid ink when pressed, solid ink with the red
 * foot when selected, faded and struck through when disabled, and the heavy
 * bracket on focus. Its text is plain print and keeps the case it was given.
 */
export function Tag({ children, className, ...props }: TagProps) {
  const textValue = typeof children === "string" ? children : undefined

  return (
    <PrimitiveTag
      textValue={textValue}
      className={cx(
        "mark rounded-none [--mark-fill:var(--fg)] [--mark-hover-line:var(--fg)] [--mark-line:var(--input)]",
        "inline-flex min-h-7 cursor-default items-center gap-x-1.5 px-2 font-medium text-sm/5 outline-hidden",
        "*:[svg]:size-4 *:[svg]:shrink-0 sm:*:[svg]:size-3.5",
        "has-[[slot=remove]]:pe-0.5",
        "data-focus-visible:z-10 in-data-[demo=focus]:z-10",
        "forced-colors:border-[ButtonBorder]",
        props.href && "cursor-pointer",
        className
      )}
      {...props}
    >
      {({ allowsRemoving }) => (
        <>
          {children}
          {allowsRemoving && (
            // An inner mark, 24px square: the tag's ink at rest, an outline on
            // hover, solid when pressed.
            <Button
              slot="remove"
              className={cx(
                "grid size-6 shrink-0 cursor-default place-content-center outline-hidden",
                "hover:inset-ring-2 hover:inset-ring-current",
                "pressed:bg-current pressed:*:[svg]:text-(--mark-on-fill) in-data-selected:pressed:*:[svg]:text-(--mark-fill)"
              )}
            >
              <HiXMark className="size-4" />
            </Button>
          )}
        </>
      )}
    </PrimitiveTag>
  )
}
