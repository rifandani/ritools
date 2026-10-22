'use client'

import { ProgressBar } from "react-aria-components/ProgressBar"
import { cn } from "cn"

/** A square track with one solid run that travels its edge. */
const Ring = ({ className, ...props }: React.SVGProps<SVGSVGElement>) => (
  <svg
    className={cn("size-4", className)}
    {...props}
    xmlns="http://www.w3.org/2000/svg"
    width={16}
    height={16}
    fill="none"
    viewBox="0 0 24 24"
    aria-hidden="true"
  >
    <rect x="3" y="3" width="18" height="18" stroke="currentColor" strokeOpacity="0.22" strokeWidth="3" />
    <rect
      x="3"
      y="3"
      width="18"
      height="18"
      pathLength={72}
      stroke="currentColor"
      strokeWidth="3"
      strokeDasharray="18 54"
      strokeLinecap="square"
      className="animate-loader-run"
    />
  </svg>
)

/**
 * Four square blocks that light in turn, round the square. Nothing rotates, so
 * no diagonal appears; under reduced motion they hold their stepped shades.
 */
const Spin = ({ className, ...props }: React.SVGProps<SVGSVGElement>) => (
  <svg className={cn("size-4", className)} viewBox="0 0 24 24" fill="currentColor" {...props}>
    <rect x="2" y="2" width="9" height="9" className="animate-loader-blink" />
    <rect
      x="13"
      y="2"
      width="9"
      height="9"
      opacity="0.7"
      className="animate-loader-blink [animation-delay:0.2s]"
    />
    <rect
      x="13"
      y="13"
      width="9"
      height="9"
      opacity="0.45"
      className="animate-loader-blink [animation-delay:0.4s]"
    />
    <rect
      x="2"
      y="13"
      width="9"
      height="9"
      opacity="0.25"
      className="animate-loader-blink [animation-delay:0.6s]"
    />
  </svg>
)

const LOADERS = {
  ring: Ring,
  spin: Spin,
}

const DEFAULT_SPINNER = "spin"

export interface LoaderProps extends Omit<
  React.ComponentPropsWithoutRef<"svg">,
  "display" | "opacity" | "intent"
> {
  variant?: keyof typeof LOADERS
  percentage?: number
  isIndeterminate?: boolean
  formatOptions?: Intl.NumberFormatOptions
  ref?: React.RefObject<SVGSVGElement>
  "data-slot"?: string
}

export function Loader({ isIndeterminate = true, ref, ...props }: LoaderProps) {
  const { className, variant = DEFAULT_SPINNER, ...spinnerProps } = props
  const LoaderPrimitive = LOADERS[variant in LOADERS ? variant : DEFAULT_SPINNER]

  return (
    <ProgressBar
      data-slot={props["data-slot"] ?? "loader"}
      aria-label={props["aria-label"] ?? "Pending..."}
      formatOptions={props.formatOptions}
      isIndeterminate={isIndeterminate}
    >
      <LoaderPrimitive
        role="presentation"
        className={cn(
          "size-4",
          className
        )}
        ref={ref}
        {...spinnerProps}
      />
    </ProgressBar>
  )
}
