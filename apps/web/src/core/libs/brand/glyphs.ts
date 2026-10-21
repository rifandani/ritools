/**
 * The letterforms the brand assets are drawn with, measured in em.
 *
 * One face hands out three things for a character: the outline, the advance,
 * and the ink box. All three are in em of the face size and in SVG
 * orientation, so a caller multiplies by the size it wants and draws. The
 * build script reads this from the font files; the Open Graph card reads it
 * from the glyph atlas the script wrote.
 */

/** The ink box of one character, in em, y down from the baseline. */
export interface InkBox {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

/** One face, measured in em. */
export interface EmFace {
  /** The ascender, in em. Positive. */
  readonly ascent: number;
  /** The descender, in em. Negative, so `ascent - descent` is the line. */
  readonly descent: number;
  /** The cap height, in em. */
  readonly capHeight: number;
  /** The advance width of one character, in em. */
  readonly advanceOf: (char: string) => number;
  /** The ink box of one character, in em. A blank gets an empty box. */
  readonly inkOf: (char: string) => InkBox;
  /** The outline of one character, in em. A blank has none. */
  readonly pathOf: (char: string) => string;
}

/** The empty box a character without ink reports. */
export const EMPTY_INK: InkBox = { minX: 0, maxX: 0, minY: 0, maxY: 0 };

/**
 * The characters the glyph atlas holds.
 *
 * Printable ASCII, because every wordmark and every poster line is set in the
 * language the site ships first, plus the marks a sentence may borrow.
 */
export const ATLAS_CHARSET = [
  ...Array.from({ length: 95 }, (_, index) => String.fromCodePoint(32 + index)),
  "’",
  "‘",
  "“",
  "”",
  "–",
  "—",
  "…",
  "°",
  "©",
  "×",
  "·",
].join("");
