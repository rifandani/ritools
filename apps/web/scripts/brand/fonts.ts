/**
 * The brand faces, read as outlines from the self-hosted files.
 *
 * Every shipped letterform comes from one of the WOFF2 files under
 * `public/fonts`. The build script reads those files, turns the glyphs it needs
 * into paths, and writes the glyph atlas the Open Graph card reads at request
 * time. No font file is embedded in a shipped asset.
 *
 * The atlas reads the static instances of the faces, not the variable files
 * the stylesheet loads: it takes outlines as the files store them, and the
 * instances the brand assets print are fixed. What each file is, and how it
 * was cut from its variable source, is in `@/core/libs/brand/faces`.
 */

import { readFile } from "node:fs/promises";
import path from "node:path";

import { parse } from "opentype.js";
import type { Font, PathCommand } from "opentype.js";
import decompress from "woff2-encoder/decompress";

import { FACE_INSTANCES, FONT_FILES } from "@/core/libs/brand/faces";
import type { FaceName } from "@/core/libs/brand/faces";

/** The ink box of one glyph, in font units with y up. */
interface GlyphBox {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

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
    /** The path commands of the character, so it can be scaled and moved. */
    commands: readonly PathCommand[];
    advance: number;
    /** The ink box of the character, in font units with y up. */
    bbox: GlyphBox;
  };
}

const FONT_DIR = path.resolve(import.meta.dirname, "../../public/fonts");

const cache = new Map<FaceName, Promise<LoadedFace>>();

const readFont = async (file: keyof typeof FONT_FILES) => {
  const woff2 = await readFile(path.join(FONT_DIR, FONT_FILES[file]));
  // The outline reader wants an OpenType file, so the WOFF2 wrapper goes first.
  const ttf = Buffer.from(await decompress(woff2));
  // SAFETY: The parser reads the bytes of this view, and nothing else.
  const bytes = ttf.buffer.slice(
    ttf.byteOffset,
    ttf.byteOffset + ttf.byteLength
  ) as ArrayBuffer;
  return parse(bytes);
};

const toFace = (font: Font): LoadedFace => ({
  unitsPerEm: font.unitsPerEm,
  ascent: font.ascender,
  descent: font.descender,
  capHeight: font.tables.os2.sCapHeight,
  glyph: (char: string) => {
    const glyph = font.charToGlyph(char);
    const { x1, y1, x2, y2 } = glyph.getBoundingBox();
    return {
      commands: glyph.path.commands,
      advance: glyph.advanceWidth,
      bbox: { minX: x1, minY: y1, maxX: x2, maxY: y2 },
    };
  },
});

/** Loads one named instance of a face. The file is read once per run. */
export const loadFace = (name: FaceName): Promise<LoadedFace> => {
  const hit = cache.get(name);
  if (hit) {
    return hit;
  }
  const pending = (async () =>
    toFace(await readFont(FACE_INSTANCES[name].file)))();
  cache.set(name, pending);
  return pending;
};
