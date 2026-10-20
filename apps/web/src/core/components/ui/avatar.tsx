'use client'

import { cn } from "cn"

export interface AvatarProps {
  src?: string | null
  initials?: string
  alt?: string
  className?: string
  isSquare?: boolean
  size?:
    | "xs"
    | "sm"
    | "md"
    | "lg"
    | "xl"
    | "2xl"
    | "3xl"
    | "4xl"
    | "5xl"
    | "6xl"
    | "7xl"
    | "8xl"
    | "9xl"
}

/**
 * A photo cut from the page: a square plate with a 2px rule. The round seal
 * is the exception and it stays opt-in through `isSquare={false}`.
 */
export function Avatar({
  src = null,
  isSquare = true,
  size = "md",
  initials,
  alt = "",
  className,
  ...props
}: AvatarProps & React.ComponentPropsWithoutRef<"span">) {
  return (
    <span
      data-slot="avatar"
      {...props}
      className={cn(
        "inline-grid size-(--avatar-size) shrink-0 align-middle overflow-hidden rounded-none border-2 border-rule bg-muted",
        size === "xs" && "[--avatar-size:--spacing(5)]",
        size === "sm" && "[--avatar-size:--spacing(6)]",
        size === "md" && "[--avatar-size:--spacing(8)]",
        size === "lg" && "[--avatar-size:--spacing(10)]",
        size === "xl" && "[--avatar-size:--spacing(12)]",
        size === "2xl" && "[--avatar-size:--spacing(14)]",
        size === "3xl" && "[--avatar-size:--spacing(16)]",
        size === "4xl" && "[--avatar-size:--spacing(20)]",
        size === "5xl" && "[--avatar-size:--spacing(24)]",
        size === "6xl" && "[--avatar-size:--spacing(28)]",
        size === "7xl" && "[--avatar-size:--spacing(32)]",
        size === "8xl" && "[--avatar-size:--spacing(36)]",
        size === "9xl" && "[--avatar-size:--spacing(42)]",
        isSquare ? "rounded-none" : "rounded-full",
        className
      )}
    >
      {initials && (
        <svg
          className="size-full select-none fill-current p-[5%] font-display font-extrabold uppercase [font-stretch:75%]"
          viewBox="0 0 100 100"
          aria-hidden={alt ? undefined : "true"}
        >
          {alt && <title>{alt}</title>}
          <text
            fontSize="48"
            x="50%"
            y="50%"
            alignmentBaseline="middle"
            dominantBaseline="middle"
            textAnchor="middle"
            dy=".125em"
          >
            {initials}
          </text>
        </svg>
      )}
      {src && <img className="size-full object-cover object-center" src={src} alt={alt} />}
    </span>
  )
}
