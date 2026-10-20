import { cn } from "cn";

/** The five outcomes and the two pending states, as shapes. */
export type StateMarkKind =
  | "already-fits"
  | "bigger"
  | "done"
  | "miss"
  | "queued"
  | "rejected";

/**
 * A state mark: a square plate, drawn rather than tinted, so a row reads by
 * shape as well as by its word. The frame is the plate; the glyph inside is
 * the outcome. Every mark uses `currentColor`, so it follows the row's print.
 *
 * - DONE: a plate with a check.
 * - ALREADY FITS: a hollow plate.
 * - MISS: a crossed plate.
 * - BIGGER: a plate with an outward arrow.
 * - REJECTED: a plate with a stop bar.
 * - QUEUED: a plate with a queue rule.
 */
export const StateMark = ({
  kind,
  className,
}: {
  readonly kind: StateMarkKind;
  readonly className?: string;
}) => (
  <svg
    aria-hidden="true"
    className={cn("size-4 shrink-0", className)}
    fill="none"
    stroke="currentColor"
    strokeLinecap="square"
    strokeLinejoin="miter"
    strokeWidth={2}
    viewBox="0 0 20 20"
  >
    <rect height="16" width="16" x="2" y="2" />
    {kind === "done" ? <path d="M6 10.5 9 13.5 14.5 7" /> : null}
    {kind === "miss" ? <path d="M6.5 6.5 13.5 13.5M13.5 6.5 6.5 13.5" /> : null}
    {kind === "bigger" ? (
      <>
        <path d="M13.5 9.5V6.5H10.5" />
        <path d="M13.5 6.5 8 12" />
      </>
    ) : null}
    {kind === "rejected" ? <path d="M6.5 10H13.5" /> : null}
    {kind === "queued" ? (
      <>
        <path d="M6.5 7.5H13.5" />
        <path d="M6.5 12.5H11" />
      </>
    ) : null}
  </svg>
);
