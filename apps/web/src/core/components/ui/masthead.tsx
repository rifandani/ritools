'use client'

import { cn } from "cn"

import { Ransom } from "@/core/components/ui/ransom"

/** The size of the name: a phone floor, a viewport step, a desk cap. */
const NAME_SIZE = "clamp(2.75rem, 8vw, 7rem)"

/**
 * The width of the name column, in em of the name size. It is the width of
 * SQUEEZE, the widest tool name, so every masthead gives its name the same
 * room: a short name leaves space on the right of its column, and the gap and
 * the text column start at the same x on every tool page. A name wider than
 * SQUEEZE widens its column and takes the room from the text column.
 *
 * Measure the wordmark again if a tool name gets longer or a face changes:
 * set the name size to a known value, read the width of the name, and divide.
 * At 112px, SQUEEZE is 748px wide, so 748 / 112 = 6.68.
 */
const NAME_WIDTH = 6.68

export interface MastheadProps {
  /** The tool name, in ransom letters. A brand name does not translate. */
  readonly name: string
  /** Optional copy to the right of the tool name. */
  readonly tagline?: React.ReactNode
  /** Optional note under the tagline, in the quiet voice. */
  readonly note?: React.ReactNode
  readonly className?: string
}

/**
 * The top of a tool page: the name in ransom letters at the left, with
 * optional supporting copy at the right. The name takes a fixed column, so
 * the line is the same on every tool. It stacks at the narrow width.
 */
export const Masthead = ({
  name,
  tagline,
  note,
  className,
}: MastheadProps) => (
  <header className={cn("flex flex-col gap-y-4", className)}>
    <div
      className="flex flex-col gap-y-4 lg:grid lg:grid-cols-[minmax(var(--name-column),auto)_minmax(0,1fr)] lg:items-end lg:gap-x-16"
      style={
        {
          "--name-size": NAME_SIZE,
          "--name-column": `calc(${NAME_WIDTH} * var(--name-size))`,
        } as React.CSSProperties
      }
    >
      <Ransom
        as="h1"
        className="text-[length:var(--name-size)] max-sm:[--angle-tilt:0deg] max-sm:[--slash-run:0]"
      >
        {name}
      </Ransom>
      {tagline === undefined ? null : (
        <div className="flex flex-col gap-y-2 text-base">
          <p className="text-lg leading-7 font-semibold">{tagline}</p>
          {note === undefined ? null : (
            <p className="text-muted-fg text-sm/6">{note}</p>
          )}
        </div>
      )}
    </div>
  </header>
)
