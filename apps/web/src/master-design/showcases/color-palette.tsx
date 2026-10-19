import { cn } from "cn";
import { useLayoutEffect, useRef, useState } from "react";

import { Variant, VariantGrid } from "../variant";

interface Swatch {
  name: string;
  /** Tailwind bg utility mapped from `@theme` in globals.css, or a raw CSS color. */
  bg: string;
}

interface Pair {
  name: string;
  /** Tailwind utilities for the foreground color and the ground under it. */
  fg: string;
  bg: string;
  /** Text needs 4.5:1; a UI part (an edge, a focus bracket) needs 3:1. */
  kind: "text" | "ui";
  /** A color field to print the pair on. */
  ground?: "ground-red" | "ground-ink";
  /** UI pairs only: the text color for the ratio, so small text stays legible. */
  label?: string;
}

interface Rgba {
  r: number;
  g: number;
  b: number;
  a: number;
}

const byteHex = (n: number) =>
  Math.round(n).toString(16).padStart(2, "0").toUpperCase();

const formatHex = ({ r, g, b, a }: Rgba): string => {
  const rgb = `#${byteHex(r)}${byteHex(g)}${byteHex(b)}`;
  return a < 1 ? `${rgb}${byteHex(a * 255)}` : rgb;
};

/** Resolve any CSS color to RGBA by painting one pixel (handles oklch/oklab). */
const cssColorToRgba = (color: string): Rgba | null => {
  const canvas = document.createElement("canvas");
  canvas.width = 1;
  canvas.height = 1;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) {
    return null;
  }

  // Sentinel: if `color` is rejected, fillStyle stays on this value.
  ctx.fillStyle = "rgba(1, 2, 3, 1)";
  const sentinel = ctx.fillStyle;
  ctx.fillStyle = color;
  if (ctx.fillStyle === sentinel) {
    return null;
  }

  ctx.clearRect(0, 0, 1, 1);
  ctx.fillRect(0, 0, 1, 1);
  // 1×1 getImageData always yields RGBA; index via ?? for noUncheckedIndexedAccess.
  const pixel = ctx.getImageData(0, 0, 1, 1).data;
  return {
    r: pixel[0] ?? 0,
    g: pixel[1] ?? 0,
    b: pixel[2] ?? 0,
    a: (pixel[3] ?? 0) / 255,
  };
};

/** Lay a translucent color over the opaque color under it. */
const over = (top: Rgba, under: Rgba): Rgba => ({
  r: top.r * top.a + under.r * (1 - top.a),
  g: top.g * top.a + under.g * (1 - top.a),
  b: top.b * top.a + under.b * (1 - top.a),
  a: 1,
});

/** The first opaque background at or above `el`: what a translucent color sits on. */
const groundUnder = (el: Element | null): Rgba => {
  for (let node = el; node; node = node.parentElement) {
    const rgba = cssColorToRgba(getComputedStyle(node).backgroundColor);
    if (rgba && rgba.a === 1) {
      return rgba;
    }
  }
  return { r: 255, g: 255, b: 255, a: 1 };
};

const toLinearChannel = (c: number): number => {
  const s = c / 255;
  return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
};

const luminance = ({ r, g, b }: Rgba) =>
  0.2126 * toLinearChannel(r) +
  0.7152 * toLinearChannel(g) +
  0.0722 * toLinearChannel(b);

const contrast = (a: Rgba, b: Rgba) => {
  const [hi, lo] = [luminance(a), luminance(b)].toSorted((x, y) => y - x);
  return ((hi ?? 0) + 0.05) / ((lo ?? 0) + 0.05);
};

/** Re-reads tokens on mount and whenever ThemeToggle flips `.dark` on <html>. */
const useTokenRead = (read: () => void) => {
  useLayoutEffect(() => {
    read();
    const observer = new MutationObserver(read);
    observer.observe(document.documentElement, {
      attributeFilter: ["class"],
      attributes: true,
    });
    return () => {
      observer.disconnect();
    };
    // `read` closes over refs only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
};

const brand: Swatch[] = [
  { name: "red", bg: "bg-red" },
  { name: "ink", bg: "bg-ink" },
  { name: "paper", bg: "bg-paper" },
  { name: "white", bg: "bg-white" },
  { name: "chip-stock", bg: "bg-[var(--chip-stock)]" },
];

const groups: { label: string; swatches: Swatch[] }[] = [
  { label: "Brand", swatches: brand },
  {
    label: "Surface",
    swatches: [
      { name: "bg", bg: "bg-bg" },
      { name: "fg", bg: "bg-fg" },
      { name: "rule", bg: "bg-rule" },
      { name: "card", bg: "bg-card" },
      { name: "card-fg", bg: "bg-card-fg" },
      { name: "muted", bg: "bg-muted" },
      { name: "muted-fg", bg: "bg-muted-fg" },
      { name: "overlay", bg: "bg-overlay" },
      { name: "overlay-fg", bg: "bg-overlay-fg" },
    ],
  },
  {
    label: "Roles",
    swatches: [
      { name: "primary", bg: "bg-primary" },
      { name: "primary-fg", bg: "bg-primary-fg" },
      { name: "primary-ink", bg: "bg-primary-ink" },
      { name: "primary-subtle", bg: "bg-primary-subtle" },
      { name: "primary-subtle-fg", bg: "bg-primary-subtle-fg" },
      { name: "secondary", bg: "bg-secondary" },
      { name: "secondary-fg", bg: "bg-secondary-fg" },
      { name: "accent", bg: "bg-accent" },
      { name: "accent-fg", bg: "bg-accent-fg" },
    ],
  },
  {
    label: "Status",
    swatches: [
      { name: "success", bg: "bg-success" },
      { name: "success-fg", bg: "bg-success-fg" },
      { name: "success-subtle", bg: "bg-success-subtle" },
      { name: "success-subtle-fg", bg: "bg-success-subtle-fg" },
      { name: "danger", bg: "bg-danger" },
      { name: "danger-fg", bg: "bg-danger-fg" },
      { name: "danger-subtle", bg: "bg-danger-subtle" },
      { name: "danger-subtle-fg", bg: "bg-danger-subtle-fg" },
      { name: "warning", bg: "bg-warning" },
      { name: "warning-fg", bg: "bg-warning-fg" },
      { name: "warning-subtle", bg: "bg-warning-subtle" },
      { name: "warning-subtle-fg", bg: "bg-warning-subtle-fg" },
      { name: "info-subtle", bg: "bg-info-subtle" },
      { name: "info-subtle-fg", bg: "bg-info-subtle-fg" },
    ],
  },
  {
    label: "Chrome",
    swatches: [
      { name: "border", bg: "bg-border" },
      { name: "input", bg: "bg-input" },
      { name: "ring", bg: "bg-ring" },
      { name: "navbar", bg: "bg-navbar" },
      { name: "navbar-fg", bg: "bg-navbar-fg" },
      { name: "sidebar", bg: "bg-sidebar" },
      { name: "sidebar-fg", bg: "bg-sidebar-fg" },
      { name: "sidebar-primary", bg: "bg-sidebar-primary" },
      { name: "sidebar-primary-fg", bg: "bg-sidebar-primary-fg" },
      { name: "sidebar-accent", bg: "bg-sidebar-accent" },
      { name: "sidebar-accent-fg", bg: "bg-sidebar-accent-fg" },
      { name: "sidebar-border", bg: "bg-sidebar-border" },
      { name: "sidebar-ring", bg: "bg-sidebar-ring" },
    ],
  },
  {
    label: "Chart",
    swatches: [
      { name: "chart-1", bg: "bg-chart-1" },
      { name: "chart-2", bg: "bg-chart-2" },
      { name: "chart-3", bg: "bg-chart-3" },
      { name: "chart-4", bg: "bg-chart-4" },
      { name: "chart-5", bg: "bg-chart-5" },
    ],
  },
];

const pairs: Pair[] = [
  { name: "fg on bg", fg: "text-fg", bg: "bg-bg", kind: "text" },
  { name: "muted-fg on bg", fg: "text-muted-fg", bg: "bg-bg", kind: "text" },
  {
    name: "primary-ink on bg",
    fg: "text-primary-ink",
    bg: "bg-bg",
    kind: "text",
  },
  {
    name: "primary-fg on primary",
    fg: "text-primary-fg",
    bg: "bg-primary",
    kind: "text",
  },
  {
    name: "primary-subtle-fg on primary-subtle",
    fg: "text-primary-subtle-fg",
    bg: "bg-primary-subtle",
    kind: "text",
  },
  {
    name: "muted-fg on card",
    fg: "text-muted-fg",
    bg: "bg-card",
    kind: "text",
  },
  {
    name: "secondary-fg on secondary",
    fg: "text-secondary-fg",
    bg: "bg-secondary",
    kind: "text",
  },
  {
    name: "accent-fg on accent",
    fg: "text-accent-fg",
    bg: "bg-accent",
    kind: "text",
  },
  {
    name: "success-fg on success",
    fg: "text-success-fg",
    bg: "bg-success",
    kind: "text",
  },
  {
    name: "success-subtle-fg on success-subtle",
    fg: "text-success-subtle-fg",
    bg: "bg-success-subtle",
    kind: "text",
  },
  {
    name: "warning-fg on warning",
    fg: "text-warning-fg",
    bg: "bg-warning",
    kind: "text",
  },
  {
    name: "warning-subtle-fg on warning-subtle",
    fg: "text-warning-subtle-fg",
    bg: "bg-warning-subtle",
    kind: "text",
  },
  {
    name: "danger-fg on danger",
    fg: "text-danger-fg",
    bg: "bg-danger",
    kind: "text",
  },
  {
    name: "danger-subtle-fg on danger-subtle",
    fg: "text-danger-subtle-fg",
    bg: "bg-danger-subtle",
    kind: "text",
  },
  { name: "input edge on bg", fg: "text-input", bg: "bg-bg", kind: "ui" },
  { name: "ring on bg", fg: "text-ring", bg: "bg-bg", kind: "ui" },
  {
    name: "red foot on the selected fill",
    fg: "text-red",
    bg: "bg-fg",
    kind: "ui",
    label: "text-bg",
  },
  {
    name: "fg on the red field",
    fg: "text-fg",
    bg: "bg-bg",
    kind: "text",
    ground: "ground-red",
  },
  {
    name: "fg on the ink rail",
    fg: "text-fg",
    bg: "bg-bg",
    kind: "text",
    ground: "ground-ink",
  },
  {
    name: "muted-fg on the ink rail",
    fg: "text-muted-fg",
    bg: "bg-bg",
    kind: "text",
    ground: "ground-ink",
  },
];

const SwatchTile = ({ name, bg }: Swatch) => {
  const ref = useRef<HTMLDivElement>(null);
  const [hex, setHex] = useState("");
  const [ink, setInk] = useState("var(--ink)");

  useTokenRead(() => {
    const el = ref.current;
    if (!el) {
      return;
    }
    const rgba = cssColorToRgba(getComputedStyle(el).backgroundColor);
    if (!rgba) {
      setHex("");
      return;
    }
    setHex(formatHex(rgba));
    // Print the hex in whichever of ink or white reads on the composed tile.
    const shown = over(rgba, groundUnder(el.parentElement));
    setInk(luminance(shown) > 0.18 ? "var(--ink)" : "var(--white)");
  });

  return (
    <div
      aria-label={name}
      className={cn(
        "border-rule num flex h-16 w-full items-end border-2 p-2 text-xs",
        bg
      )}
      ref={ref}
      style={{ color: ink }}
    >
      {hex || "…"}
    </div>
  );
};

const PairTile = ({ fg, bg, kind, ground, label = "text-fg" }: Pair) => {
  const ref = useRef<HTMLDivElement>(null);
  const sample = useRef<HTMLSpanElement>(null);
  const [ratio, setRatio] = useState<number | null>(null);
  const floor = kind === "text" ? 4.5 : 3;

  useTokenRead(() => {
    const el = ref.current;
    if (!el) {
      return;
    }
    const back = cssColorToRgba(getComputedStyle(el).backgroundColor);
    const front = sample.current
      ? cssColorToRgba(getComputedStyle(sample.current).color)
      : null;
    if (!back || !front) {
      setRatio(null);
      return;
    }
    const under = over(back, groundUnder(el.parentElement));
    setRatio(contrast(over(front, under), under));
  });

  const passes = ratio !== null && ratio >= floor;

  return (
    <div className={cn("w-full", ground)}>
      <div
        className={cn(
          "border-rule flex h-16 w-full items-center justify-between gap-3 border-2 px-3",
          bg,
          // A text pair prints its ratio in its own colors; a UI pair prints
          // only the sample bar in them.
          kind === "text" ? fg : label
        )}
        ref={ref}
      >
        {kind === "text" ? (
          <span className="text-lg font-bold" ref={sample}>
            Squeeze
          </span>
        ) : (
          <span
            aria-hidden
            className={cn("h-1 w-12 bg-current", fg)}
            ref={sample}
          />
        )}
        <span className="num text-right text-xs font-semibold">
          {ratio === null ? "…" : `${ratio.toFixed(1)}:1`}
          <br />
          <span className={passes ? undefined : "line-through"}>
            {kind === "text" ? "AA text" : "AA UI"}
          </span>
        </span>
      </div>
    </div>
  );
};

export const ColorPaletteShowcase = () => (
  <div className="flex flex-col gap-10">
    {groups.map((group) => (
      <section aria-label={group.label} key={group.label}>
        <h4 className="text-muted-fg mb-3 text-xs font-bold tracking-[0.08em] uppercase [font-stretch:87.5%]">
          {group.label}
        </h4>
        <VariantGrid>
          {group.swatches.map((swatch) => (
            <Variant key={swatch.name} label={swatch.name}>
              <SwatchTile {...swatch} />
            </Variant>
          ))}
        </VariantGrid>
      </section>
    ))}

    {/* The pairs the system relies on, measured live in this color mode. */}
    <section aria-label="Contrast pairs">
      <h4 className="text-muted-fg mb-3 text-xs font-bold tracking-[0.08em] uppercase [font-stretch:87.5%]">
        Contrast pairs, WCAG 2.2
      </h4>
      <VariantGrid>
        {pairs.map((pair) => (
          <Variant key={pair.name} label={pair.name}>
            <PairTile {...pair} />
          </Variant>
        ))}
      </VariantGrid>
    </section>
  </div>
);
