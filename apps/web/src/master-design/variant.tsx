import { cn } from "cn";
import type { ReactNode } from "react";

/** A state the catalog can force on the control inside a Variant (see `.mark` in globals.css). */
type DemoState = "hover" | "pressed" | "focus" | "disabled";

/**
 * The strict showcase grid: equal cells on fixed 2px rules. Every cell draws
 * its own closed frame, and the grid pulls each one 2px up and left over its
 * neighbors, so a shared rule prints once at the same weight. A cell alone, or
 * beside an empty track, stays closed on all four sides.
 */
export const VariantGrid = ({ children }: { children: ReactNode }) => (
  <div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,13.5rem),1fr))] pt-0.5 pl-0.5 *:-mt-0.5 *:-ml-0.5">
    {children}
  </div>
);

/** Showcases sized for a wide stage take more cells than one. */
const cellSpan = (className = "") => {
  if (/\bw-full\b/u.test(className)) {
    return "col-span-full";
  }
  if (/\bw-(?:56|64|72|80|96)\b/u.test(className)) {
    return "sm:col-span-2";
  }
  return null;
};

/** A single labeled example within a Component Entry. */
export const Variant = ({
  className,
  label,
  demo,
  children,
}: {
  className?: string;
  label: string;
  /** Prints the control in this state, so every state sits side by side. */
  demo?: DemoState;
  children: ReactNode;
}) => (
  <div
    className={cn(
      "border-rule flex min-w-0 flex-col gap-5 border-2 p-5",
      cellSpan(className)
    )}
    data-demo={demo}
  >
    <span className="text-muted-fg font-mono text-[0.6875rem] leading-4">
      {label}
    </span>
    <div
      className={cn(
        "flex max-w-full min-w-0 flex-1 flex-col items-start justify-center gap-2",
        className
      )}
    >
      {children}
    </div>
  </div>
);
