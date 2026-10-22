import { cn } from "cn";
import type { ReactNode } from "react";

/** The supplied logo file. The guidelines copy and download this one file. */
export const LOGO_SRC = "/logo.png";

/** Its edge, in px. The file is a square raster, so this is both sides. */
export const LOGO_SIZE = 1254;

/**
 * The two grounds a copy of the logo is chosen for. They are fixed, not theme
 * tokens: the file goes onto the destination's ground, whatever color mode the
 * reader has on. Paper is the page ground; ink is the rail field.
 */
const BRAND_GROUNDS = {
  paper: "bg-paper",
  ink: "bg-ink",
} as const;

export type BrandGround = keyof typeof BRAND_GROUNDS;

/**
 * A framed plate that holds one specimen on a fixed ground. The frame is a
 * 2px rule, like every other closed plate in the kit.
 */
export const BrandPlate = ({
  className,
  ground,
  children,
}: {
  className?: string;
  ground: BrandGround;
  children: ReactNode;
}) => (
  <div
    className={cn(
      "relative flex items-center justify-center overflow-hidden border-2",
      ground === "ink" ? "border-paper/30" : "border-rule",
      BRAND_GROUNDS[ground],
      className
    )}
  >
    {children}
  </div>
);

/**
 * The supplied logo, drawn from its one file. Every specimen on the page reads
 * this image, so no second copy can drift from the file the site ships. The
 * caption names the specimen, so the image itself is decorative.
 */
export const LogoFile = ({
  alt = "",
  className,
}: {
  alt?: string;
  className?: string;
}) => (
  <img
    alt={alt}
    className={cn("block size-32 select-none sm:size-40", className)}
    draggable={false}
    height={LOGO_SIZE}
    src={LOGO_SRC}
    width={LOGO_SIZE}
  />
);

/** A guideline's lead line: body copy in Muted Ink, held to a reading measure. */
export const GuideLead = ({ children }: { children: ReactNode }) => (
  <p className="text-muted-fg max-w-[62ch] text-base/7 text-pretty">
    {children}
  </p>
);

/** A sub-heading inside a guideline, in the Group Label voice. */
export const GuideLabel = ({ children }: { children: ReactNode }) => (
  <h4 className="text-muted-fg text-xs font-bold tracking-[0.08em] uppercase [font-stretch:87.5%]">
    {children}
  </h4>
);
