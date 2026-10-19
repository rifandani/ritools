"use client"

import { cn } from "cn"
import { useLayoutEffect, useRef } from "react"

type Face = "anton" | "abril" | "slab" | "grot"
type Chip = "white" | "stock" | "ink" | "red"
type Ground = "paper" | "red" | "ink"

const FACES: readonly Face[] = ["anton", "abril", "slab", "grot"]
const CHIPS: readonly Chip[] = ["white", "ink", "red", "stock"]

/** The chip that would vanish on each ground. */
/** Glyphs too narrow to lose a side to a cut. */
const NARROW = new Set([..."IiJjLlTtFfRr1!.,'"])

/** Chips that may be cut: a cut clips the edge a light chip needs on paper. */
const CUTTABLE = new Set<Chip>(["ink", "red"])

const HIDDEN_ON: Record<Ground, Chip | null> = {
  paper: null,
  red: "red",
  ink: "ink",
}

interface Cut {
  char: string
  face: Face
  chip: Chip
  /** Rest pose: tilt in units of `--angle-tilt`, lift in em. */
  tilt: -1 | 0 | 1
  dy: number
  snip: "l" | "r" | undefined
  /** Assembly: landing order, and where the chip flies in from. */
  order: number
  sx: number
  sy: number
  sr: -1 | 1
}

/** FNV-1a: a stable hash, so the server and the client cut the same letters. */
const hash = (text: string) => {
  let h = 2166136261
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

/** mulberry32: a small seeded generator. */
const generator = (seed: number) => {
  let a = seed
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const pick = <T,>(next: () => number, from: readonly T[], not?: T) => {
  const pool = from.filter((item) => item !== not)
  return pool[Math.floor(next() * pool.length)] as T
}

/** Cuts each word of `text` into chips. The same text always cuts the same way. */
const cutWords = (text: string, ground: Ground): Cut[][] => {
  const next = generator(hash(text))
  const chips = CHIPS.filter((chip) => chip !== HIDDEN_ON[ground])
  const words = text.split(/\s+/).filter(Boolean)
  const total = words.reduce((sum, word) => sum + word.length, 0)
  // Letters land out of reading order, like a note pasted in a hurry.
  const order = Array.from({ length: total }, (_, i) => i)
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(next() * (i + 1))
    ;[order[i], order[j]] = [order[j] as number, order[i] as number]
  }

  let face: Face | undefined
  let chip: Chip | undefined
  let index = 0
  return words.map((word) =>
    [...word].map((letter, i) => {
      face = pick(next, FACES, face)
      chip = pick(next, chips, chip)
      const lower = i > 0 && next() < 0.28
      const roll = next()
      const cut: Cut = {
        char: lower ? letter.toLowerCase() : letter.toUpperCase(),
        face,
        chip,
        tilt: roll < 0.36 ? -1 : roll < 0.72 ? 1 : 0,
        dy: Math.round((next() - 0.5) * 10) / 100,
        snip:
          next() < 0.3 && CUTTABLE.has(chip) && !NARROW.has(letter)
            ? next() < 0.5
              ? "l"
              : "r"
            : undefined,
        order: order[index] ?? index,
        sx: Math.round((next() - 0.5) * 180) / 100,
        sy: Math.round((next() - 0.5) * 240) / 100,
        sr: next() < 0.5 ? -1 : 1,
      }
      index++
      return cut
    })
  )
}

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
 * and Squeeze state words, never for labels, inputs, numbers, or body text.
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
