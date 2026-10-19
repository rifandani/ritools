'use client'

import { Children, isValidElement, useMemo, useRef } from "react"
import { Autocomplete, useFilter } from "react-aria-components/Autocomplete"
import { ListBox } from "react-aria-components/ListBox"
import { Select, type SelectProps, SelectValue } from "react-aria-components/Select"
import { cx } from "@/core/utils/primitive"
import { Button } from "./button"
import { printedFieldStyles } from "./field"
import { ListBoxItem } from "./list-box"
import { PopoverContent } from "./popover"
import { SearchField, SearchInput } from "./search-field"
import { Tag, TagGroup, TagList } from "./tag-group"

interface OptionBase {
  id: string | number
  name: string
}

interface MultipleSelectProps<T extends OptionBase> extends Omit<
  SelectProps<T, "multiple">,
  "selectionMode" | "children"
> {
  placeholder?: string
  className?: string
  children?: React.ReactNode
  name?: string
  searchPlaceholder?: string
  searchValue?: string
  onSearchChange?: (value: string) => void
}

interface MultipleSelectContentProps<T extends OptionBase> {
  items: Iterable<T>
  children: (item: T) => React.ReactNode
}

function MultipleSelectContent<T extends OptionBase>(_props: MultipleSelectContentProps<T>) {
  return null
}
;(MultipleSelectContent as any).displayName = "MultipleSelectContent"

function MultipleSelect<T extends OptionBase>({
  placeholder = "No selected items",
  className,
  children,
  name,
  searchPlaceholder,
  searchValue,
  onSearchChange,
  ...props
}: MultipleSelectProps<T>) {
  const triggerRef = useRef<HTMLDivElement | null>(null)
  const { contains } = useFilter({ sensitivity: "base" })

  const { before, after, list } = useMemo(() => {
    const arr = Children.toArray(children)
    const idx = arr.findIndex(
      (c) => isValidElement(c) && (c.type as any)?.displayName === "MultipleSelectContent"
    )
    if (idx === -1) {
      return { before: arr, after: [], list: null as null | MultipleSelectContentProps<T> }
    }
    const el = arr[idx] as React.ReactElement<MultipleSelectContentProps<T>>
    return { before: arr.slice(0, idx), after: arr.slice(idx + 1), list: el.props }
  }, [children])

  return (
    <Select
      name={name}
      data-slot="control"
      className={cx(printedFieldStyles(), className)}
      selectionMode="multiple"
      {...props}
    >
      {before}
      {list && (
        <>
          {/* A well holding the picked tags; the add mark brackets itself on focus. */}
          <div
            data-slot="control"
            ref={triggerRef}
            className="well flex min-h-11 w-full items-center gap-2 p-1.5 sm:min-h-10 sm:p-1"
          >
            <SelectValue<T> className="flex-1">
              {({ selectedItems, state }) => (
                <TagGroup
                  aria-label="Selected items"
                  onRemove={(keys) => {
                    if (Array.isArray(state.value)) {
                      state.setValue(state.value.filter((k) => !keys.has(k)))
                    }
                  }}
                >
                  <TagList
                    items={selectedItems.filter((i) => i != null)}
                    renderEmptyState={() => (
                      <span className="ps-2 text-base/6 text-muted-fg sm:text-sm/6">
                        {placeholder}
                      </span>
                    )}
                  >
                    {(item) => <Tag className="rounded-none">{item.name}</Tag>}
                  </TagList>
                </TagGroup>
              )}
            </SelectValue>
            <Button intent="outline" size="sq-xs" className="self-end">
              <svg
                data-slot="icon"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M12 3.75a.75.75 0 0 1 .75.75v6.75h6.75a.75.75 0 0 1 0 1.5h-6.75v6.75a.75.75 0 0 1-1.5 0v-6.75H4.5a.75.75 0 0 1 0-1.5h6.75V4.5a.75.75 0 0 1 .75-.75Z"
                  clipRule="evenodd"
                />
              </svg>
            </Button>
          </div>
          <PopoverContent
            triggerRef={triggerRef}
            placement="bottom"
            className="flex w-full min-w-(--trigger-width) flex-col overflow-hidden *:data-[slot=popover-inner]:flex *:data-[slot=popover-inner]:flex-col *:data-[slot=popover-inner]:overflow-hidden"
          >
            <Autocomplete filter={contains}>
              {/* The search strip drops its well: the popover frame and the rule under it hold it. */}
              <SearchField
                autoFocus
                className="outline-hidden [&_.well]:border-0 [&_.well]:after:hidden"
                value={searchValue}
                onChange={onSearchChange}
              >
                <SearchInput
                  className="outline-hidden"
                  placeholder={searchPlaceholder}
                />
              </SearchField>
              <ListBox
                className="grid min-h-0 w-full flex-1 grid-cols-[auto_1fr] gap-y-0.5 overflow-y-auto border-rule border-t-2 p-1.5 outline-hidden *:[[role='group']+[role=group]]:mt-4 *:[[role='group']+[role=separator]]:mt-1"
                items={list.items}
              >
                {list.children}
              </ListBox>
            </Autocomplete>
          </PopoverContent>
        </>
      )}
      {after}
    </Select>
  )
}

const MultipleSelectItem = ListBoxItem

export { MultipleSelect, MultipleSelectContent, MultipleSelectItem }
