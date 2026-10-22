"use client"

import { HiMagnifyingGlass, HiXMark } from "react-icons/hi2"
import { Button } from "react-aria-components/Button"
import type { InputProps } from "react-aria-components/Input"
import {
  SearchField as SearchFieldPrimitive,
  type SearchFieldProps,
} from "react-aria-components/SearchField"
import { twJoin } from "cn"
import { printedFieldStyles } from "@/core/components/ui/field"
import { cx } from "@/core/utils/primitive"
import { Input, InputGroup } from "./input"

export function SearchField({ className, ...props }: SearchFieldProps) {
  return (
    <SearchFieldPrimitive
      data-slot="control"
      aria-label={props["aria-label"] ?? "Search"}
      className={cx(printedFieldStyles({ className: "group/search-field" }), className)}
      {...props}
    />
  )
}

export function SearchInput(props: InputProps) {
  return (
    <InputGroup className="[--input-gutter-end:--spacing(9)]">
      <HiMagnifyingGlass data-slot="icon" />
      <Input {...props} />
      {/* Clear: a small mark that prints solid when pressed. */}
      <Button
        className={twJoin(
          "touch-target grid w-10 place-content-center text-muted-fg outline-hidden sm:w-8",
          "hover:text-fg pressed:bg-fg pressed:text-bg group-empty/search-field:invisible",
          "in-data-[demo=pressed]:bg-fg in-data-[demo=pressed]:text-bg",
          "forced-colors:text-[ButtonText]"
        )}
      >
        <HiXMark className="size-5 sm:size-4" />
      </Button>
    </InputGroup>
  )
}
