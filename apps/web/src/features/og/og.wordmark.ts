/**
 * The Opens Graph card keeps the wordmark the site prints, so the card and the
 * navbar say the same name in the same cut.
 *
 * This is the same geometry the build script uses
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

/** The RITOOLS wordmark, cut and drawn for a card. */
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
