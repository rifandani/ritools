"use client"

import { cn } from "cn"
import { useLayoutEffect, useRef } from "react"

import { cutWords, type Ground } from "@/core/libs/ransom-cut"

const REDUCED_MOTION = "(prefers-reduced-motion: reduce)"

let observer: IntersectionObserver | null = null
const onEnter = new WeakMap<Element, () => void>()

const viewObserver = () => {
  observer ??= new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          onEnter.get(entry.target)?.()
        }
      }
    },
    { rootMargin: "0px 0px -8% 0px" }
  )
  return observer
}

/**
 * Holds a Ransom that starts off-screen in its cut-up state and lets it
 * assemble when it enters the view. One already in view assembles at once
 * through CSS alone, so a server render needs no script to show it.
 */
const useAssembly = (ref: React.RefObject<HTMLElement | null>) => {
  useLayoutEffect(() => {
    const el = ref.current
    if (!el || matchMedia(REDUCED_MOTION).matches) {
      return
    }
    const box = el.getBoundingClientRect()
    if (box.bottom > 0 && box.top < window.innerHeight) {
      return
    }
    const io = viewObserver()
    el.dataset.ransom = "waiting"
    onEnter.set(el, () => {
      delete el.dataset.ransom
      io.unobserve(el)
      onEnter.delete(el)
    })
    io.observe(el)
    return () => {
      io.unobserve(el)
      onEnter.delete(el)
    }
  }, [ref])
}

export interface RansomProps extends Omit<React.HTMLAttributes<HTMLElement>, "children"> {
  /** The plain name. Assistive technology reads this, never the chips. */
  children: string
  as?: "h1" | "h2" | "h3" | "h4" | "span" | "p"
  /** The field the letters sit on, so no chip vanishes into it. */
  ground?: Ground
  /** Shrinks a word that would overflow its line, so a long name always fits. */
  fit?: boolean
}

/**
 * A name assembled from cut-out letters on paper chips. Use it only for
 * Component Entry titles, Category headings, the Ritools wordmark, Tool names,
 * Squeeze state words, and the title of a drawer, never for labels,
 * buttons, inputs, numbers, or body text.
 */
export function Ransom({
  children,
  as: Element = "span",
  ground = "paper",
  fit = false,
  className,
  ...props
}: RansomProps) {
  const ref = useRef<HTMLElement>(null)
  useAssembly(ref)
  const words = cutWords(children, ground)

  return (
    <Element
      ref={ref as React.RefObject<never>}
      data-slot="ransom"
      className={cn(
        "font-normal leading-none",
        fit && "block [container-type:inline-size]",
        className
      )}
      {...props}
    >
      <span className="sr-only">{children}</span>
      <span
        aria-hidden="true"
        className={cn(
          "inline-flex items-baseline gap-x-[0.28em]",
          fit ? "flex-wrap gap-y-[0.18em]" : "flex-nowrap whitespace-nowrap"
        )}
      >
        {words.map((word, w) => (
          <span
            className="ransom-word"
            // Each word is its own line unit; `fit` scales it to the line.
            key={`${w}-${word.map((cut) => cut.char).join("")}`}
            style={
              fit
                ? { fontSize: `min(1em, calc(100cqi / ${(word.length * 1.12).toFixed(2)}))` }
                : undefined
            }
          >
            {word.map((cut, i) => (
              <span
                className="ransom-chip"
                data-chip={cut.chip}
                data-face={cut.face}
                data-snip={cut.snip}
                key={i}
                style={
                  {
                    "--r": `calc(var(--angle-tilt) * ${cut.tilt})`,
                    "--dy": `${cut.dy}em`,
                    "--order": cut.order,
                    "--sx": `${cut.sx}em`,
                    "--sy": `${cut.sy}em`,
                    "--sr": `calc(var(--angle-slash) * ${cut.sr})`,
                  } as React.CSSProperties
                }
              >
                {cut.char}
              </span>
            ))}
          </span>
        ))}
      </span>
    </Element>
  )
}
