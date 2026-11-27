/** The share of the Split view, in percent, that the source pane takes. */
export const SPLIT_DEFAULT = 50;
export const SPLIT_MIN = 20;
export const SPLIT_MAX = 80;
/** Shift and an arrow key count as this many presses. */
export const SPLIT_LARGE_STEPS = 5;

export const clampSplit = (percent: number): number =>
  Math.min(SPLIT_MAX, Math.max(SPLIT_MIN, percent));

/** Move the border by a pointer distance across panes of the given width. */
export const dragSplit = (
  percent: number,
  deltaX: number,
  width: number
): number =>
  width > 0 ? clampSplit(percent + (deltaX / width) * 100) : percent;

/**
 * Move the border by `steps` arrow key presses, 2% for each press. A negative
 * count moves it left. The step is a literal so typerange can bound the sum.
 */
export const stepSplit = (percent: number, steps: number): number =>
  clampSplit(percent + steps * 2);

/** The two grid tracks for the source and reader panes. */
export const splitTracks = (percent: number) => {
  const start = clampSplit(percent);
  return { start: `${start}fr`, end: `${100 - start}fr` } as const;
};
