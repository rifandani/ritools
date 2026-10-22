/**
 * The faces the Open Graph card prints in, and the setting of its lines.
 *
 * The outlines come from the glyph atlas the build script wrote, so nothing
 * here reads a font file: a Worker can draw the same card as a Node server.
 * Every measurement is in em, and a glyph is placed by an SVG transform.
 */

import { FACE_NAMES } from "@/core/libs/brand/faces";
import type { FaceName } from "@/core/libs/brand/faces";
import { EMPTY_INK } from "@/core/libs/brand/glyphs";
import type { EmFace, InkBox } from "@/core/libs/brand/glyphs";
import { round } from "@/core/libs/brand/svg";

import { GLYPH_ATLAS } from "./glyph-atlas.generated";
import type { AtlasFace } from "./glyph-atlas.generated";

/** The character the atlas falls back to for the advance of an unknown one. */
const BLANK = " ";

const emFaceOf = (face: AtlasFace): EmFace => {
  const glyphOf = (char: string) => face.glyphs[char];
  return {
    ascent: face.ascent,
    descent: face.descent,
    capHeight: face.capHeight,
    advanceOf: (char: string) => glyphOf(char)?.[1] ?? glyphOf(BLANK)?.[1] ?? 0,
    inkOf: (char: string): InkBox => {
      const glyph = glyphOf(char);
      if (!glyph) {
        return EMPTY_INK;
      }
      return { maxX: glyph[4], maxY: glyph[5], minX: glyph[2], minY: glyph[3] };
    },
    pathOf: (char: string) => glyphOf(char)?.[0] ?? "",
  };
};

/** Every face, ready to set a line. */
// SAFETY: FACE_NAMES is the key set of the atlas, and the loop throws for a
// face the atlas does not hold, so every name is mapped before this returns.
export const FACE_OF: Record<FaceName, EmFace> = Object.fromEntries(
  FACE_NAMES.map((name) => {
    const face = GLYPH_ATLAS[name];
    if (!face) {
      throw new Error(
        `The glyph atlas has no face "${name}". Run \`bun brand:gen\`.`
      );
    }
    return [name, emFaceOf(face)];
  })
) as Record<FaceName, EmFace>;

/** One line of text, set in one face: its ink, as SVG, and its measure. */
export interface TextRun {
  /** The line, as SVG, with the pen at the origin of the baseline. */
  content: string;
  /** The width the line takes, including the trailing tracking. */
  width: number;
  /** The height of the ink of the line. */
  height: number;
}

/**
 * Sets one line of text.
 *
 * `tracking` is in em, the way the design system measures it. Each letter is
 * its own path with a transform, because the atlas holds one outline per em
 * and the same outline serves every size.
 */
export const layoutText = (
  text: string,
  face: EmFace,
  size: number,
  tracking = 0
): TextRun => {
  const parts: string[] = [];
  let pen = 0;
  let minY = 0;
  let maxY = 0;

  for (const char of text) {
    if (char !== " ") {
      const path = face.pathOf(char);
      if (path) {
        parts.push(
          `<path d="${path}" transform="translate(${round(pen)} 0) scale(${round(size)})"/>`
        );
      }
      const ink = face.inkOf(char);
      minY = Math.min(minY, ink.minY * size);
      maxY = Math.max(maxY, ink.maxY * size);
    }
    pen += face.advanceOf(char) * size + tracking * size;
  }

  return {
    content: parts.join(""),
    height: maxY - minY,
    width: pen - tracking * size,
  };
};

/** Sets a line of text, and shrinks it until it fits the measure. */
export const fitText = (
  text: string,
  face: EmFace,
  size: number,
  tracking: number,
  measure: number
) => {
  let fitted = size;
  let run = layoutText(text, face, fitted, tracking);
  while (run.width > measure && fitted > 8) {
    fitted -= 1;
    run = layoutText(text, face, fitted, tracking);
  }
  return run;
};

/**
 * Breaks a line into the lines that fit the sheet.
 *
 * The measure is the width of the column, and the words keep their order.
 */
export const wrapText = (
  text: string,
  face: EmFace,
  size: number,
  tracking: number,
  measure: number
): TextRun[] => {
  const words = text.split(/\s+/u).filter(Boolean);
  const lines: string[] = [];
  let line = "";

  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    const run = layoutText(candidate, face, size, tracking);
    if (line && run.width > measure) {
      lines.push(line);
      line = word;
    } else {
      line = candidate;
    }
  }
  if (line) {
    lines.push(line);
  }

  return lines.map((broken) => layoutText(broken, face, size, tracking));
};
