/**
 * Where the chips of the ransom wordmark sit.
 *
 * The cut says which face, which chip, which tilt and which lift each letter
 * gets (`src/core/libs/ransom-cut.ts`). This module turns that cut into
 * numbers: a box per chip, a pen position per letter, and the box the whole
 * word takes. It draws nothing, so the build script and the Open Graph card
 * place the same chips, and only the drawing of the letter differs.
 */

import { cutWords, RANSOM_GEOMETRY } from "@/core/libs/ransom-cut";
import type { Cut, Face, Ground } from "@/core/libs/ransom-cut";

import type { InkBox } from "./glyphs";
import { chipPath } from "./svg";

/** SVG units per em of the word. The wordmark is 100 units per em. */
export const WORD_EM = 100;

/** What the layout needs from a face. */
export interface FaceMetrics {
  /** The ascender, in em. Positive. */
  readonly ascent: number;
  /** The descender, in em. Negative, as the font stores it. */
  readonly descent: number;
  /** The advance width of one character, in em. */
  readonly advanceOf: (char: string) => number;
  /** The ink box of one character, in em, y down. */
  readonly inkOf: (char: string) => InkBox;
}

/** A box, in word units. */
export interface Box {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** One chip of the wordmark, placed. */
export interface PlacedChip {
  cut: Cut;
  /** The border box of the chip, in word coordinates. */
  x: number;
  y: number;
  width: number;
  height: number;
  /** The box the chip takes once it is tilted, in word coordinates. */
  outer: Box;
  /** The chip outline, in chip coordinates. */
  outline: string;
  /** The size of the chip's face, in word units (one em). */
  size: number;
  /** The pen position of the letter, in word coordinates. */
  penX: number;
  /** The ink box of the letter, in word coordinates. */
  ink: InkBox;
}

/** The box a chip takes once it is tilted: the rectangle, turned. */
export const tiltedBox = (
  x: number,
  y: number,
  width: number,
  height: number,
  tilt: number
): Box => {
  const radians = (tilt * Math.PI) / 180;
  const halfWidth = width / 2;
  const halfHeight = height / 2;
  const halfX =
    Math.abs(halfWidth * Math.cos(radians)) +
    Math.abs(halfHeight * Math.sin(radians));
  const halfY =
    Math.abs(halfWidth * Math.sin(radians)) +
    Math.abs(halfHeight * Math.cos(radians));
  const centerX = x + halfWidth;
  const centerY = y + halfHeight;
  return {
    x: centerX - halfX,
    y: centerY - halfY,
    width: halfX * 2,
    height: halfY * 2,
  };
};

/**
 * Places the chips of a cut on the page.
 *
 * Every number here is the number the browser uses: the chip padding is in em
 * of the chip's own face, the gap is in em of the word, the baseline is
 * shared by the whole word, and the letters sit where the line box puts them.
 */
export const placeWordmark = (
  text: string,
  ground: Ground,
  faces: Record<Face, FaceMetrics>
): PlacedChip[] => {
  const placed: PlacedChip[] = [];
  let pen = 0;

  for (const [wordIndex, word] of cutWords(text, ground).entries()) {
    if (wordIndex > 0) {
      pen += RANSOM_GEOMETRY.wordGap;
    }

    for (const cut of word) {
      const face = faces[cut.face];
      const size = RANSOM_GEOMETRY.faceSize[cut.face] * WORD_EM;
      const advance = face.advanceOf(cut.char) * size;
      const pad = RANSOM_GEOMETRY.padding.inline * size;
      const height =
        size *
        (1 + RANSOM_GEOMETRY.padding.top + RANSOM_GEOMETRY.padding.bottom);
      const run = height * RANSOM_GEOMETRY.slashRun;
      const snipped = cut.snip ? run : 0;
      const marginStart = cut.snip === "l" ? -run / 2 : 0;
      const marginEnd = cut.snip === "r" ? -run / 2 : 0;

      const ascent = face.ascent * size;
      const descent = -face.descent * size;
      const halfLeading = (size - (ascent + descent)) / 2;
      const contentTop = -halfLeading - ascent;
      const y = contentTop - RANSOM_GEOMETRY.padding.top * size;
      const width = advance + 2 * pad + snipped;
      const penX = pen * WORD_EM;
      const x = penX - pad - (cut.snip === "l" ? snipped : 0);
      const box = face.inkOf(cut.char);

      placed.push({
        cut,
        x,
        y,
        width,
        height,
        size,
        penX,
        outline: chipPath(width, height, cut.snip, run),
        outer: tiltedBox(x, y, width, height, cut.tilt * RANSOM_GEOMETRY.tilt),
        ink: {
          minX: penX + box.minX * size,
          maxX: penX + box.maxX * size,
          minY: box.minY * size,
          maxY: box.maxY * size,
        },
      });

      pen +=
        (advance + 2 * pad + snipped + marginStart + marginEnd) / WORD_EM +
        RANSOM_GEOMETRY.gap;
    }
  }

  return placed;
};

/** The box the whole note takes: the chips and the ink of the letters. */
export const wordmarkBox = (placed: readonly PlacedChip[]) => {
  const minX = Math.min(
    ...placed.map((chip) => chip.outer.x),
    ...placed.map((chip) => chip.ink.minX)
  );
  const maxX = Math.max(
    ...placed.map((chip) => chip.outer.x + chip.outer.width),
    ...placed.map((chip) => chip.ink.maxX)
  );
  const minY = Math.min(
    ...placed.map((chip) => chip.outer.y),
    ...placed.map((chip) => chip.ink.minY)
  );
  const maxY = Math.max(
    ...placed.map((chip) => chip.outer.y + chip.outer.height),
    ...placed.map((chip) => chip.ink.maxY)
  );
  return { minX, maxX, minY, maxY };
};

/** Where a placed chip sits, on the page: its anchor, its lift, its tilt. */
export const chipPose = (
  chip: PlacedChip,
  round: (value: number) => number
) => {
  const dy = chip.cut.dy * RANSOM_GEOMETRY.faceSize[chip.cut.face] * WORD_EM;
  const tilt = chip.cut.tilt * RANSOM_GEOMETRY.tilt;
  return `translate(${round(chip.x)} ${round(chip.y)}) translate(0 ${round(dy)}) rotate(${tilt} ${round(chip.width / 2)} ${round(chip.height / 2)})`;
};
