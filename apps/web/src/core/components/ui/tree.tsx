'use client'

import { HiChevronRight } from "react-icons/hi2"
import { Button } from "react-aria-components/Button"
import type {
  TreeItemContentProps,
  TreeItemContentRenderProps,
  TreeItemProps,
  TreeProps,
} from "react-aria-components/Tree"
import {
  Tree as TreePrimitive,
  TreeItem as TreeItemPrimitive,
  TreeItemContent,
} from "react-aria-components/Tree"
import { twJoin, cn } from "cn"
import { cx } from "@/core/utils/primitive"
import { Checkbox, CheckboxField } from "./checkbox"

const Tree = <T extends object>({ className, ...props }: TreeProps<T>) => {
  return (
    <TreePrimitive
      className={cx(
        twJoin(
          "flex cursor-default flex-col gap-y-0.5 overflow-auto outline-hidden forced-color-adjust-none"
        ),
        className
      )}
      {...props}
    />
  )
}

const TreeItem = <T extends object>({ className, ...props }: TreeItemProps<T>) => {
  return (
    <TreeItemPrimitive
      className={cx(
        [
          "shrink-0 rounded-none px-2 py-1.5 pe-2",
          "group/tree-item relative flex select-none outline-hidden",
          // Hover and keyboard focus: the ink bar.
          "data-[hovered]:bg-accent data-[hovered]:text-accent-fg",
          "[[data-demo=hover]_&]:bg-accent [[data-demo=hover]_&]:text-accent-fg",
          "data-[pressed]:bg-accent data-[pressed]:text-accent-fg",
          "[[data-demo=pressed]_&]:bg-accent [[data-demo=pressed]_&]:text-accent-fg",
          // Focus: the world's bracket, two 3px arms at each side, drawn
          // inside the row.
          "bracket after:inset-0",
          // Selected: the ink bar and the red foot.
          "data-[selected]:bg-accent data-[selected]:text-accent-fg",
          "data-[selected]:shadow-[inset_0_-4px_0_var(--primary)]",
          // Disabled: muted ink.
          "data-[disabled]:text-muted-fg data-[disabled]:line-through",
          "[[data-demo=disabled]_&]:text-muted-fg",
          "[[data-demo=disabled]_&_*]:line-through",
          "**:data-[slot=avatar]:*:size-6 **:data-[slot=avatar]:size-6 sm:**:data-[slot=avatar]:*:size-5 sm:**:data-[slot=avatar]:size-5",
          "**:[svg]:size-5 **:[svg]:shrink-0 sm:**:[svg]:size-4",
          "**:[svg:not([data-slot=check-indicator]):not([data-slot=chevron])]:me-1",
          "forced-colors:[",
          "href" in props ? "cursor-pointer" : "cursor-default",
          "[&[data-disabled]_*]:line-through",
        ],
        className
      )}
      {...props}
    />
  )
}

interface TreeContentProps extends TreeItemContentProps {
  className?: string
}

const TreeContent = ({ className, children, ...props }: TreeContentProps) => {
  return (
    <TreeItemContent {...props}>
      {(values) => (
        <div
          className={cn(
            "relative flex w-full min-w-0 items-center gap-x-1 truncate text-sm/6",
            className
          )}
        >
          {values.allowsDragging && <Button className="sr-only" slot="drag" />}
          {values.selectionMode === "multiple" && values.selectionBehavior === "toggle" && (
            <CheckboxField className="gap-x-0" slot="selection">
              <Checkbox className="col-span-1" />
            </CheckboxField>
          )}
          <div
            className={twJoin(
              "relative w-[calc(calc(var(--tree-item-level)-1)*(--spacing(5)))] shrink-0",
              "before:absolute before:inset-0 before:-ms-1 before:bg-[repeating-linear-gradient(to_right,transparent_0,transparent_calc(var(--tree-item-level)-1px),var(--border)_calc(var(--tree-item-level)-1px),var(--border)_calc(var(--tree-item-level)))]"
            )}
          />
          {values.hasChildItems ? (
            <TreeIndicator
              values={{
                isDisabled: values.isDisabled,
                isExpanded: values.isExpanded,
              }}
            />
          ) : (
            <span aria-hidden className="block w-5 shrink-0" />
          )}
          {typeof children === "function" ? children(values) : children}
        </div>
      )}
    </TreeItemContent>
  )
}

const TreeIndicator = ({
  values,
}: {
  values: Pick<TreeItemContentRenderProps, "isDisabled" | "isExpanded">
}) => {
  return (
    <Button
      slot="chevron"
      isDisabled={values.isDisabled}
      className={twJoin(
        "shrink-0 content-center rounded-none text-muted-fg hover:bg-accent hover:text-accent-fg",
        values.isExpanded && "text-fg"
      )}
    >
      <HiChevronRight
        data-slot="chevron"
        className={twJoin(
          "size-5 transition-transform duration-200 ease-in-out sm:size-4",
          values.isExpanded && "rotate-90"
        )}
      />
    </Button>
  )
}

export type { TreeItemProps, TreeProps }
export { Tree, TreeContent, TreeIndicator, TreeItem }
