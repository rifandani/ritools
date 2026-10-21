/**
 * The small SVG vocabulary the brand assets are written in: the print palette,
 * the document shell, and the paths the chips and the rules are made of.
 */

/** The print palette of the design system. */
export const PALETTE = {
  red: "#D7001A",
  ink: "#0B0B0B",
  paper: "#F6F4EF",
  white: "#FFFFFF",
  stock: "#E6DFCF",
  /** The hairline edge of a chip: ink at 14%. */
  edge: "#0B0B0B",
  edgeOpacity: 0.14,
} as const;

/** The two diagonals of the world. */
const ANGLES = {
  /** The tilt of a chip. */
  tilt: 4,
  /** The slant of a scissor cut and of the slash bar. */
  slash: 16,
} as const;

/** Escapes the five characters that may not sit in XML text raw. */
export const escapeXml = (value: string) =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");

/** A rectangle as a closed path. */
export const rectPath = (x: number, y: number, width: number, height: number) =>
  `M${x} ${y}L${x + width} ${y}L${x + width} ${y + height}L${x} ${y + height}Z`;

/**
 * A chip with one side cut on the slash angle.
 *
 * `snip` names the side that leans: `r` cuts the right edge, `l` the left.
 * The run of the lean is the width the cut removes at the bottom.
 */
export const chipPath = (
  width: number,
  height: number,
  snip: "l" | "r" | undefined,
  run: number
) => {
  if (snip === "r") {
    return `M0 0L${width} 0L${width - run} ${height}L0 ${height}Z`;
  }
  if (snip === "l") {
    return `M${run} 0L${width} 0L${width} ${height}L0 ${height}Z`;
  }
  return rectPath(0, 0, width, height);
};

/** The slash bar of the poster pages: a rule that leans on the slash angle. */
export const slashBar = (
  x: number,
  y: number,
  width: number,
  height: number,
  lean: number = ANGLES.slash
) => {
  const run = height * Math.tan((lean * Math.PI) / 180);
  return `M${x} ${y}L${x + width} ${y}L${x + width - run} ${y + height}L${x} ${y + height}Z`;
};

/** One SVG document. The background is optional, for a transparent asset. */
export const svgDocument = (options: {
  width: number;
  height: number;
  viewBox?: string;
  body: string;
  background?: string;
}) => {
  const { width, height, viewBox, body, background } = options;
  const ground = background
    ? `<rect width="${width}" height="${height}" fill="${background}"/>`
    : "";
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="${viewBox ?? `0 0 ${width} ${height}`}" fill="none">${ground}${body}</svg>`;
};

/** Rounds to two decimals, so the path data stays small and stable. */
export const round = (value: number) => Math.round(value * 100) / 100;
