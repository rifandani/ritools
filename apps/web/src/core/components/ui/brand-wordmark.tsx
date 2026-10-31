import { cn } from "cn";

import type { Ground } from "@/core/libs/ransom-cut";

/**
 * The field the mark sits on. `auto` follows the color mode, for a surface
 * that is the page ground rather than a fixed field.
 */
export type WordmarkGround = Ground | "auto";

export interface BrandWordmarkProps {
  className?: string;
  /** The field the mark sits on, so the slash keeps its contrast. */
  ground?: WordmarkGround;
}

/**
 * The Ritools wordmark: the name set at its seam, `ri/tools`, in Archivo 900
 * at 125% width with one slash in the brand red. It is type, not a drawing, so
 * it stays sharp at every size and follows the ground it sits on. Assistive
 * technology reads the name, never the slash.
 */
export const BrandWordmark = ({
  className,
  ground = "paper",
}: BrandWordmarkProps) => (
  <span
    className={cn("wordmark", className)}
    data-ground={ground}
    data-slot="wordmark"
  >
    <span className="sr-only">Ritools</span>
    <span aria-hidden="true">
      ri<span className="wordmark-slash">/</span>tools
    </span>
  </span>
);
