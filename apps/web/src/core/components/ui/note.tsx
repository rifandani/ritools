'use client'

import {
  HiCheckCircle,
  HiExclamationCircle,
  HiExclamationTriangle,
  HiInformationCircle,
} from "react-icons/hi2"
import { twJoin, cn } from "cn"

export interface NoteProps extends React.HtmlHTMLAttributes<HTMLDivElement> {
  intent?: "default" | "info" | "warning" | "danger" | "success"
  indicator?: boolean
}

/**
 * A pinned note: a square frame, a wash of the status hue, and the words.
 *
 * The frame is the wash ink, not the fill hue, so the edge keeps its contrast
 * (Caution Yellow never reaches 3:1 on paper). The glyph names the state, so
 * the hue is never the only signal: info is an "i", warning a triangle, danger
 * an exclamation, success a check.
 */
export function Note({ indicator = true, intent = "default", className, ...props }: NoteProps) {
  const iconMap: Record<string, React.ElementType | null> = {
    info: HiInformationCircle,
    warning: HiExclamationTriangle,
    danger: HiExclamationCircle,
    success: HiCheckCircle,
    default: null,
  }

  const IconComponent = iconMap[intent] || null

  return (
    <div
      data-slot="note"
      className={cn([
        "grid w-full grid-cols-[auto_1fr] items-start gap-x-3 gap-y-1 rounded-none border-2 p-4 text-sm/6",
        "*:[a]:underline **:[strong]:font-bold",
        intent === "default" && "border-rule bg-card text-fg",
        intent === "info" && "border-rule bg-info-subtle text-info-subtle-fg",
        intent === "warning" &&
          "border-warning-subtle-fg bg-warning-subtle text-warning-subtle-fg",
        intent === "danger" && "border-danger-subtle-fg bg-danger-subtle text-danger-subtle-fg",
        intent === "success" &&
          "border-success-subtle-fg bg-success-subtle text-success-subtle-fg",
        className,
      ])}
      {...props}
    >
      {IconComponent && indicator && (
        <span
          data-slot="note-indicator"
          className={twJoin(
            "grid size-6 shrink-0 place-content-center rounded-none border-2 border-current"
          )}
        >
          <IconComponent className="size-4 shrink-0" />
        </span>
      )}
      <div className="text-pretty group-has-[svg]:col-start-2">{props.children}</div>
    </div>
  )
}
