'use client'

import { tv } from "tailwind-variants"

export const badgeStyles = tv({
  base: [
    // A printed stamp: square, a 2px rule, the label voice.
    "inline-flex items-center gap-x-1.5 rounded-none border-2 px-2 py-0.5 text-xs/5 font-bold uppercase tracking-[0.05em] [font-stretch:87.5%]",
    "border-(--badge-line) bg-(--badge-bg) text-(--badge-fg)",
    // On a solid ink print the stamp turns to the paper side, so it stays
    // legible on the bar. A row that is hovered or selected prints that bar.
    "group-hover:border-(--accent-fg) group-hover:bg-transparent group-hover:text-(--accent-fg)",
    "group-data-[hovered]:border-(--accent-fg) group-data-[hovered]:bg-transparent group-data-[hovered]:text-(--accent-fg)",
    "group-data-[selected]:border-(--accent-fg) group-data-[selected]:bg-transparent group-data-[selected]:text-(--accent-fg)",
    "group-data-[pressed]:border-(--accent-fg) group-data-[pressed]:bg-transparent group-data-[pressed]:text-(--accent-fg)",
    "*:data-[slot=icon]:size-3 *:data-[slot=icon]:shrink-0",
  ],
  variants: {
    intent: {
      primary:
        "[--badge-bg:var(--color-primary-subtle)] [--badge-fg:var(--color-primary-subtle-fg)] [--badge-line:var(--color-primary)]",
      secondary:
        "[--badge-bg:var(--color-secondary)] [--badge-fg:var(--color-secondary-fg)] [--badge-line:var(--color-input)]",
      success:
        "[--badge-bg:var(--color-success-subtle)] [--badge-fg:var(--color-success-subtle-fg)] [--badge-line:var(--color-success)]",
      info: "[--badge-bg:var(--color-info-subtle)] [--badge-fg:var(--color-info-subtle-fg)] [--badge-line:var(--color-input)]",
      warning:
        "[--badge-bg:var(--color-warning-subtle)] [--badge-fg:var(--color-warning-subtle-fg)] [--badge-line:var(--color-warning-subtle-fg)]",
      danger:
        "[--badge-bg:var(--color-danger-subtle)] [--badge-fg:var(--color-danger-subtle-fg)] [--badge-line:var(--color-danger)]",
      outline:
        "[--badge-bg:transparent] [--badge-fg:var(--color-fg)] [--badge-line:var(--color-input)]",
    },
    isCircle: {
      // The round seal: a fixed square plate with a round edge, holding one
      // mark. It stays opt-in; the stamp is square by default.
      true: "size-7 rounded-full justify-center p-0 text-[0.6875rem]/4",
      false: "rounded-none",
    },
  },
  defaultVariants: {
    intent: "primary",
    isCircle: false,
  },
})

export interface BadgeProps extends React.ComponentProps<"span"> {
  intent?: "primary" | "secondary" | "success" | "info" | "warning" | "danger" | "outline"
  isCircle?: boolean
}

export function Badge({ intent, isCircle, className, ...props }: BadgeProps) {
  return (
    <span
      data-slot="badge"
      {...props}
      className={badgeStyles({ intent, isCircle, className })}
    />
  )
}
