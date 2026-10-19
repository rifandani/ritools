'use client'

import { cn } from "cn"

type HeadingType = { level?: 1 | 2 | 3 | 4 } & React.ComponentPropsWithoutRef<
  "h1" | "h2" | "h3" | "h4"
>

interface HeadingProps extends HeadingType {
  className?: string | undefined
}

const Heading = ({ className, level = 1, ...props }: HeadingProps) => {
  const Element: `h${typeof level}` = `h${level}`
  return (
    <Element
      className={cn(
        // Plain print in the poster voice: Archivo at 75% width, uppercase.
        // Ransom is only for names (Tool names, state words); see `Ransom`.
        "text-balance font-display text-fg uppercase [font-stretch:75%]",
        level === 1 && "font-black text-[2rem]/[2.25rem] tracking-[0.01em]",
        level === 2 && "font-black text-2xl/7 tracking-[0.01em]",
        level === 3 && "font-extrabold text-lg/6 tracking-[0.02em]",
        level === 4 && "font-bold text-sm/5 tracking-[0.05em] [font-stretch:87.5%]",
        className
      )}
      {...props}
    />
  )
}

export type { HeadingProps }
export { Heading }
