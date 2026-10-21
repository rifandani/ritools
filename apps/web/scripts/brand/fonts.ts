/**
 * The brand faces, read as outlines from the self-hosted files.
 *
 * Every shipped letterform comes from one of the WOFF2 files under
 * `public/fonts`. The build script reads those files, turns the glyphs it needs
 * into paths, and writes the glyph atlas the Open Graph card reads at request
 * time. No font file is embedded in a shipped asset.
 */

import { readFile } from "node:fs/promises";
import path from "node:path";

import { create } from "fontkit";
import type { Font, GlyphPath } from "fontkit";
import { decompress } from "wawoff2";

import { FACE_INSTANCES, FONT_FILES } from "@/core/libs/brand/faces";
import type { FaceInstance, FaceName } from "@/core/libs/brand/faces";

/** One face, ready to hand out outlines. */
export interface LoadedFace {
  /** The em square of the font, in font units. */
  readonly unitsPerEm: number;
  /** The ascender, in font units. */
  readonly ascent: number;
  /** The descender, in font units. Negative, as the font stores it. */
  readonly descent: number;
  /** The cap height, in font units. */
  readonly capHeight: number;
  /** The outline of one character, in font units with y up, and its advance. */
  readonly glyph: (char: string) => {
    /** The path of the character, so it can be scaled and moved. */
    path: GlyphPath;
    advance: number;
    /** The ink box of the character, in font units. */
    bbox: { minX: number; minY: number; maxX: number; maxY: number };
  };
}

const FONT_DIR = path.resolve(import.meta.dirname, "../../public/fonts");

const cache = new Map<FaceName, Promise<LoadedFace>>();

const readFont = async (file: keyof typeof FONT_FILES) => {
  const woff2 = await readFile(path.join(FONT_DIR, FONT_FILES[file]));
  // The variable faces need a TrueType font to be varied, and the variable
  // support of the outline reader only works on one.
  const ttf = Buffer.from(await decompress(woff2));
  return create(ttf);
};

const toFace = (font: Font): LoadedFace => ({
  unitsPerEm: font.unitsPerEm,
  ascent: font.ascent,
  descent: font.descent,
  capHeight: font.capHeight,
  glyph: (char: string) => {
    const glyph = font.glyphForCodePoint(char.codePointAt(0) ?? 0);
    const { minX, minY, maxX, maxY } = glyph.path.bbox;
    return {
      path: glyph.path,
      advance: glyph.advanceWidth,
      bbox: { minX, minY, maxX, maxY },
    };
  },
});

/** Loads one named instance of a face. The file is read once per run. */
export const loadFace = (name: FaceName): Promise<LoadedFace> => {
  const hit = cache.get(name);
  if (hit) {
    return hit;
  }
  const instance: FaceInstance = FACE_INSTANCES[name];
  const pending = (async () => {
    const font = await readFont(instance.file);
    return toFace(
      instance.variation ? font.getVariation(instance.variation) : font
    );
  })();
  cache.set(name, pending);
  return pending;
};
