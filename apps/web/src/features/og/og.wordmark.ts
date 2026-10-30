/**
 * The Open Graph card prints the two marks of the site: the brand wordmark,
 * set at its seam (`ri/tools`), and Tool names, cut as ransom letters. Both
 * read the glyph atlas, so the card never opens a font file.
 *
 * A ransom name uses the same geometry as the build script
 * (`src/core/libs/brand/ransom-layout.ts`); only the drawing of a letter
 * differs. Here the outline is scaled by an SVG transform, because the glyph
 * atlas holds one outline per em and the card cannot bake path data at request
 * time.
 */

import type { EmFace } from "@/core/libs/brand/glyphs";
import {
  chipPose,
  placeWordmark,
  WORD_EM,
  wordmarkBox,
} from "@/core/libs/brand/ransom-layout";
import { PALETTE, round } from "@/core/libs/brand/svg";
import type { Chip, Face, Ground } from "@/core/libs/ransom-cut";

import { FACE_OF } from "./og.atlas";

/**
 * The hairline edge of a chip, in em. It matches the build script: one screen
 * pixel at the navbar size, scaled with the letterform.
 */
const EDGE = 1 / 28;

/** The chip colors of the ransom set, and the ink that sits on them. */
const CHIP_INK = {
  white: { background: PALETTE.white, foreground: PALETTE.ink },
  stock: { background: PALETTE.stock, foreground: PALETTE.ink },
  ink: { background: PALETTE.ink, foreground: PALETTE.paper },
  red: { background: PALETTE.red, foreground: PALETTE.white },
} satisfies Record<Chip, { background: string; foreground: string }>;

/** The wordmark, drawn: the note, and the box it takes. */
export interface CardWordmark {
  /** The drawn note, without a document around it. */
  content: string;
  width: number;
  height: number;
}

/** The seam setting: Archivo 900 at 125% width, lowercase. */
const SEAM = {
  text: "ri/tools",
  slash: "/",
  tracking: -0.028,
  size: WORD_EM,
} as const;

/**
 * The Ritools wordmark, drawn for a card: the name at its seam, with one slash
 * in the brand red. The navbar prints the same mark with `BrandWordmark`.
 */
export const buildBrandWordmark = (ground: Ground): CardWordmark => {
  const face = FACE_OF.grot;
  const letterInk = ground === "paper" ? PALETTE.ink : PALETTE.paper;
  const slashInk = ground === "red" ? PALETTE.ink : PALETTE.red;

  const parts: string[] = [];
  let pen = 0;
  let minX = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;

  for (const char of SEAM.text) {
    const path = face.pathOf(char);
    if (path) {
      parts.push(
        `<path d="${path}" transform="translate(${round(pen)} 0) scale(${SEAM.size})" fill="${char === SEAM.slash ? slashInk : letterInk}"/>`
      );
    }
    const ink = face.inkOf(char);
    minX = Math.min(minX, pen + ink.minX * SEAM.size);
    maxX = Math.max(maxX, pen + ink.maxX * SEAM.size);
    minY = Math.min(minY, ink.minY * SEAM.size);
    maxY = Math.max(maxY, ink.maxY * SEAM.size);
    pen += face.advanceOf(char) * SEAM.size + SEAM.tracking * SEAM.size;
  }

  return {
    content: `<g transform="translate(${round(-minX)} ${round(-minY)})">${parts.join("")}</g>`,
    height: Math.ceil(maxY - minY),
    width: Math.ceil(maxX - minX),
  };
};

/** A name in ransom letters, cut and drawn for a card. */
export const buildWordmark = (text: string, ground: Ground): CardWordmark => {
  const faces: Record<Face, EmFace> = {
    abril: FACE_OF.abril,
    anton: FACE_OF.anton,
    grot: FACE_OF.grot,
    slab: FACE_OF.slab,
  };
  const placed = placeWordmark(text, ground, faces);
  const { minX, maxX, minY, maxY } = wordmarkBox(placed);

  const body = placed
    .map((chip) => {
      const ink = CHIP_INK[chip.cut.chip];
      const pose = chipPose(chip, round);
      const letter = `<g transform="translate(${round(chip.penX - chip.x)} ${round(-chip.y)}) scale(${round(chip.size)})"><path d="${faces[chip.cut.face].pathOf(chip.cut.char)}" fill="${ink.foreground}"/></g>`;
      return [
        `<g transform="${pose}">`,
        `<path d="${chip.outline}" stroke="${PALETTE.edge}" stroke-opacity="${PALETTE.edgeOpacity}" stroke-width="${round(2 * EDGE * WORD_EM)}" fill="none"/>`,
        `<path d="${chip.outline}" fill="${ink.background}"/>`,
        letter,
        "</g>",
      ].join("");
    })
    .join("");

  return {
    content: `<g transform="translate(${round(-minX)} ${round(-minY)})">${body}</g>`,
    height: Math.ceil(maxY - minY),
    width: Math.ceil(maxX - minX),
  };
};
