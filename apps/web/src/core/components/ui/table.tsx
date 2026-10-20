"use client"

import { HiChevronDown, HiChevronRight } from "react-icons/hi2"
import { createContext, use } from "react"
import { Button } from "react-aria-components/Button"
import { composeRenderProps } from "react-aria-components/composeRenderProps"
import { Group } from "react-aria-components/Group"
import type {
  CellProps,
  ColumnProps,
  ColumnResizerProps,
  TableHeaderProps as HeaderProps,
  RowProps,
  TableBodyProps,
  TableFooterProps,
  TableProps as TablePrimitiveProps,
} from "react-aria-components/Table"
import {
  Cell,
  Collection,
  Column,
  ColumnResizer as ColumnResizerPrimitive,
  ResizableTableContainer,
  Row,
  TableBody as TableBodyPrimitive,
  TableFooter as TableFooterPrimitive,
  TableHeader as TableHeaderPrimitive,
  Table as TablePrimitive,
  useTableOptions,
} from "react-aria-components/Table"
import { twJoin, cn } from "cn"
import { CardDescription, CardTitle } from "@/core/components/ui/card"
import { cx } from "@/core/utils/primitive"
import { Checkbox, CheckboxField } from "./checkbox"

interface TableProps extends Omit<TablePrimitiveProps, "className"> {
  allowResize?: boolean
  className?: string
  bleed?: boolean
  grid?: boolean
  striped?: boolean
  ref?: React.Ref<HTMLTableElement>
}

const TableContext = createContext<TableProps>({
  allowResize: false,
})

const useTableContext = () => use(TableContext)

/**
 * The ledger: a square table on 2px ink rules.
 *
 * The rules are drawn per cell with separated borders, so a row rule and a
 * column rule never collapse into one another and the red foot of a selected
 * row prints on top of its own rule.
 */
const Root = (props: TableProps) => {
  return (
    <TablePrimitive
      className="w-full min-w-full caption-bottom border-separate border-spacing-0 text-sm/6 outline-hidden"
      {...props}
    />
  )
}

const Table = ({
  allowResize,
  className,
  bleed = false,
  grid = false,
  striped = false,
  ref,
  ...props
}: TableProps) => {
  return (
    <TableContext value={{ allowResize, bleed, grid, striped }}>
      {/* `w-full` keeps the ledger inside its cell. Without it the table takes
          its own width and pushes the page sideways. */}
      <div className="flow-root w-full min-w-0">
        <div
          className={cn(
            "relative -mx-(--gutter) overflow-x-auto [--gutter-y:--spacing(2)] has-data-[slot=table-resizable-container]:overflow-auto",
            className
          )}
        >
          <div
            className={twJoin("inline-block min-w-full align-middle", !bleed && "sm:px-(--gutter)")}
          >
            {allowResize ? (
              <ResizableTableContainer data-slot="table-resizable-container">
                <Root ref={ref} {...props} />
              </ResizableTableContainer>
            ) : (
              <Root {...props} ref={ref} />
            )}
          </div>
        </div>
      </div>
    </TableContext>
  )
}

const ColumnResizer = ({ className, ...props }: ColumnResizerProps) => (
  <ColumnResizerPrimitive
    {...props}
    className={cx(
      "absolute end-0 top-0 bottom-0 grid w-2 &[data-resizable-direction=left]:cursor-e-resize &[data-resizable-direction=right]:cursor-w-resize resizable-both:cursor-ew-resize touch-none place-content-center px-1 [&[data-resizing]>div]:bg-primary",
      className
    )}
  >
    <div className="h-full w-0.5 bg-border py-(--gutter-y)" />
  </ColumnResizerPrimitive>
)

const TableBody = <T extends object>({ renderEmptyState, ...props }: TableBodyProps<T>) => (
  <TableBodyPrimitive
    data-slot="table-body"
    renderEmptyState={(state) => (
      <>
        {renderEmptyState ? (
          renderEmptyState(state)
        ) : (
          <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
            <span className="num text-[clamp(2.5rem,8vw,4rem)] leading-[0.82] font-extrabold text-fg">0</span>
            <span
              aria-hidden
              className="h-3 w-44 bg-primary [transform:skewX(var(--angle-slash))]"
            />
            <CardTitle className="text-lg">No rows yet</CardTitle>
            <CardDescription className="max-w-[36ch] text-center">
              Nothing is in this Batch. Add a folder to start the run.
            </CardDescription>
          </div>
        )}
      </>
    )}
    {...props}
  />
)

interface TableColumnProps extends ColumnProps {
  isResizable?: boolean
}

const TableColumn = ({ isResizable = false, className, ...props }: TableColumnProps) => {
  const { bleed, grid } = useTableContext()
  return (
    <Column
      data-slot="table-column"
      {...props}
      className={cx(
        [
          // The head of the ledger: the Group Label voice over a 2px rule.
          "border-rule relative border-b-2 px-3 py-2 text-start text-xs font-bold uppercase tracking-[0.08em] [font-stretch:87.5%] text-muted-fg",
          "allows-sorting:cursor-default dragging:cursor-grabbing outline-hidden",
          "first:ps-(--gutter,--spacing(2)) last:pe-(--gutter,--spacing(2))",
          !bleed && "sm:last:pe-1 sm:first:ps-1",
          grid && "border-rule border-l-2 first:border-l-0",
          isResizable && "overflow-hidden truncate",
        ],
        className
      )}
    >
      {(values) => (
        <Group
          role="presentation"
          tabIndex={-1}
          className="inline-flex items-center gap-2 **:[svg]:shrink-0"
        >
          {typeof props.children === "function" ? props.children(values) : props.children}
          {values.allowsSorting && (
            <span
              className={twJoin(
                "touch-target grid size-4 flex-none shrink-0 place-content-center rounded-none border-2 text-fg",
                values.isHovered ? "border-fg" : "border-input"
              )}
            >
              <HiChevronDown
                className={values.sortDirection === "ascending" ? "rotate-180" : ""}
              />
            </span>
          )}
          {isResizable && <ColumnResizer />}
        </Group>
      )}
    </Column>
  )
}

interface TableHeaderProps<T extends object> extends HeaderProps<T> {
  ref?: React.Ref<HTMLTableSectionElement>
}

const TableHeader = <T extends object>({
  children,
  ref,
  columns,
  className,
  ...props
}: TableHeaderProps<T>) => {
  const { bleed } = useTableContext()
  const { selectionBehavior, selectionMode, allowsDragging } = useTableOptions()
  return (
    <TableHeaderPrimitive
      ref={ref}
      data-slot="table-header"
      className={cx(className)}
      {...props}
    >
      {allowsDragging && (
        <Column
          data-slot="table-column"
          className={cn("first:ps-(--gutter,--spacing(2))", !bleed && "sm:last:pe-1 sm:first:ps-1")}
        />
      )}
      {selectionBehavior === "toggle" && (
        <Column
          data-slot="table-column"
          width={32}
          minWidth={32}
          style={{ width: 32 }}
          className={cn("first:ps-(--gutter,--spacing(2))", !bleed && "sm:last:pe-1 sm:first:ps-1")}
        >
          {selectionMode === "multiple" && (
            <CheckboxField className="gap-x-0" slot="selection">
              <Checkbox className="col-span-1" />
            </CheckboxField>
          )}
        </Column>
      )}
      <Collection items={columns}>{children}</Collection>
    </TableHeaderPrimitive>
  )
}

interface TableRowProps<T extends object> extends RowProps<T> {
  ref?: React.Ref<HTMLTableRowElement>
}

const TableRow = <T extends object>({
  children,
  className,
  columns,
  id,
  ref,
  ...props
}: TableRowProps<T>) => {
  const { selectionBehavior, allowsDragging } = useTableOptions()
  const { striped } = useTableContext()
  return (
    <Row
      ref={ref}
      data-slot="table-row"
      id={id}
      {...props}
      className={composeRenderProps(
        className,
        (
          className,
          { isSelected, selectionMode, isFocusVisibleWithin, isDragging, isDisabled, isFocusVisible }
        ) =>
          cn(
            "group relative cursor-default outline-hidden",
            // Hover: the ink bar, the same bar a list or a menu prints.
            "data-[hovered]:bg-accent data-[hovered]:text-accent-fg",
            "[[data-demo=hover]_&]:bg-accent [[data-demo=hover]_&]:text-accent-fg",
            "[[data-demo=hover]_&_[data-slot=badge]]:border-(--accent-fg) [[data-demo=hover]_&_[data-slot=badge]]:bg-transparent [[data-demo=hover]_&_[data-slot=badge]]:text-(--accent-fg)",
            "data-[pressed]:bg-accent data-[pressed]:text-accent-fg",
            "[[data-demo=pressed]_&]:bg-accent [[data-demo=pressed]_&]:text-accent-fg",
            // Selected: the ink bar. The red foot that says "on" prints on the
            // cell, so it sits on top of the row rule.
            "data-[selected]:bg-accent data-[selected]:text-accent-fg",
            // Focus: the world's bracket, two 3px arms at each side, drawn
            // inside the row so it never crosses the rows above and below.
            "bracket after:inset-0",
            // Disabled: muted ink. The strike belongs to the control itself.
            "data-[disabled]:text-muted-fg",
            "[[data-demo=disabled]_&]:text-muted-fg",
            "[&[data-disabled]>td]:line-through",
            "[[data-demo=disabled]_&>td]:line-through",
            striped && "even:bg-muted",
            (props.href || props.onAction || selectionMode === "multiple") &&
              "cursor-pointer",
            isFocusVisibleWithin && "text-fg",
            isDragging && "cursor-grabbing",
            isDisabled && "cursor-not-allowed",
            className
          )
      )}
    >
      {allowsDragging && (
        <TableCell className="px-0">
          <Button
            slot="drag"
            className="bracket grid place-content-center rounded-none px-[calc(var(--gutter)/2)] outline-hidden"
          >
            <svg
              aria-hidden
              xmlns="http://www.w3.org/2000/svg"
              width={16}
              height={16}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx={9} cy={12} r={1} />
              <circle cx={9} cy={5} r={1} />
              <circle cx={9} cy={19} r={1} />
              <circle cx={15} cy={12} r={1} />
              <circle cx={15} cy={5} r={1} />
              <circle cx={15} cy={19} r={1} />
            </svg>
          </Button>
        </TableCell>
      )}
      {selectionBehavior === "toggle" && (
        <TableCell className="px-0">
          <CheckboxField className="gap-x-0" slot="selection">
            <Checkbox className="col-span-1" />
          </CheckboxField>
        </TableCell>
      )}
      <Collection items={columns}>{children}</Collection>
    </Row>
  )
}

interface TableCellProps extends CellProps {
  ref?: React.Ref<HTMLTableCellElement>
}
const TableCell = ({ className, ref, ...props }: TableCellProps) => {
  const { allowResize, bleed, grid } = useTableContext()
  return (
    <Cell
      ref={ref}
      data-slot="table-cell"
      {...props}
      className={cx(
        twJoin(
          "group border-rule border-b-2 px-3 py-2 align-middle outline-hidden first:ps-(--gutter,--spacing(2)) last:pe-(--gutter,--spacing(2)) group-has-data-focus-visible-within:text-fg",
          // The red foot of a selected row. It prints on the cell, above its
          // own rule, so the row keeps the foot and the rule below it.
          "data-[selected]:shadow-[inset_0_-4px_0_var(--primary)]",
          grid && "border-rule border-l-2 first:border-l-0",
          !bleed && "sm:last:pe-1 sm:first:ps-1",
          allowResize && "overflow-hidden truncate"
        ),
        className
      )}
      style={({ hasChildItems, isTreeColumn, level }) => ({
        paddingInlineStart: isTreeColumn
          ? 4 + (hasChildItems ? 0 : 24) + (level - 1) * 20
          : undefined,
      })}
    >
      {composeRenderProps(
        props.children,
        (children, { hasChildItems, isTreeColumn, isExpanded, isDisabled }) => (
          <div className={isTreeColumn ? "flex items-center" : undefined}>
            {hasChildItems && isTreeColumn && (
              <Button
                slot="chevron"
                className={twJoin(
                  isDisabled && "opacity-50",
                  "mr-2 grid size-5 flex-none shrink-0 place-content-center rounded-none text-fg hover:bg-accent hover:text-accent-fg"
                )}
              >
                <HiChevronRight
                  className={twJoin(
                    "size-4 transition-transform duration-200",
                    isExpanded && "rotate-90"
                  )}
                />
              </Button>
            )}

            {children}
          </div>
        )
      )}
    </Cell>
  )
}

const TableFooter = <T extends object>({ className, ...props }: TableFooterProps<T>) => {
  return <TableFooterPrimitive className={cn("**:font-semibold", className)} {...props} />
}

export type { TableColumnProps, TableProps, TableRowProps }
export { Table, TableBody, TableCell, TableColumn, TableFooter, TableHeader, TableRow }
