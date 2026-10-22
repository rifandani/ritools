/**
 * Writes the glyph atlas: every letter the brand faces can print, measured in
 * em, as one TypeScript module.
 *
 * The Open Graph card is drawn on request, in a runtime that may be a Worker:
 * it cannot read a WOFF2 file or hold a font parser. So the outlines are
 * measured here, once, and the card only does arithmetic with them.
 *
 * Usage: this module is called by `bun brand:gen`.
 */

import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import type { PathCommand } from "opentype.js";

import {
  FACE_INSTANCES,
  FACE_NAMES,
  FONT_FILES,
} from "@/core/libs/brand/faces";
import { ATLAS_CHARSET } from "@/core/libs/brand/glyphs";

import { loadFace } from "./fonts";

const APP_DIR = path.resolve(import.meta.dirname, "../..");

const FONT_DIR = path.join(APP_DIR, "public/fonts");

/** Where the atlas is written, relative to the app. */
const ATLAS_FILE = path.join(
  APP_DIR,
  "src/features/og/glyph-atlas.generated.ts"
);

/** Rounds a measurement to four decimals of an em, which is 0.01px at 42px. */
const round = (value: number) => Math.round(value * 10_000) / 10_000;

/** One glyph as the atlas stores it: outline, advance, and ink box. */
type AtlasGlyph = readonly [
  path: string,
  advance: number,
  minX: number,
  minY: number,
  maxX: number,
  maxY: number,
];

/** The SHA-256 of each font file the atlas was read from. */
const fontDigests = async () => {
  const files = [...new Set(Object.values(FACE_INSTANCES).map((i) => i.file))];
  const entries = await Promise.all(
    files.map(async (file) => {
      // fallow-ignore-next-line security-sink -- the name comes from the FACE_INSTANCES literal, not input
      const data = await readFile(path.join(FONT_DIR, FONT_FILES[file]));
      return [
        FONT_FILES[file],
        createHash("sha256").update(data).digest("hex"),
      ];
    })
  );
  // SAFETY: Every entry is a [file name, digest] pair built above.
  return Object.fromEntries(entries) as Record<string, string>;
};

/**
 * One number of an outline, in em.
 *
 * Two decimals is a hundredth of an em, under half a pixel at the sizes the
 * card prints, and it is what the atlas has always held; four decimals would
 * add about 25% to a module the server carries. The measurements beside the
 * outline stay at four, because they place the glyph rather than draw it.
 */
const em = (value: number) => String(Math.round(value * 100) / 100);

/**
 * Writes commands as SVG path data, in em with y down from the baseline.
 *
 * The reader hands coordinates in font units with y up, so this is the one
 * place that scales and flips them, where the rounding already happens. Two
 * kinds of segment are left out because they draw nothing: a line that ends
 * where the pen already is, and a line that closes the contour, which `Z`
 * already says.
 */
const toPathData = (commands: readonly PathCommand[], unit: number): string => {
  const point = (x: number, y: number) => `${em(x * unit)} ${em(-y * unit)}`;
  const parts: string[] = [];
  let start: { x: number; y: number } | undefined;
  let pen: { x: number; y: number } | undefined;

  for (const [index, command] of commands.entries()) {
    switch (command.type) {
      case "M": {
        start = command;
        pen = command;
        parts.push(`M${point(command.x, command.y)}`);
        break;
      }
      case "L": {
        const repeat = pen && command.x === pen.x && command.y === pen.y;
        const closes =
          start &&
          command.x === start.x &&
          command.y === start.y &&
          commands[index + 1]?.type === "Z";
        if (repeat || closes) {
          break;
        }
        pen = command;
        parts.push(`L${point(command.x, command.y)}`);
        break;
      }
      case "Q": {
        pen = command;
        parts.push(
          `Q${point(command.x1, command.y1)} ${point(command.x, command.y)}`
        );
        break;
      }
      case "C": {
        pen = command;
        parts.push(
          `C${point(command.x1, command.y1)} ${point(command.x2, command.y2)} ${point(command.x, command.y)}`
        );
        break;
      }
      case "Z": {
        parts.push("Z");
        start = undefined;
        pen = undefined;
        break;
      }
      default: {
        // SAFETY: The path commands of an OpenType outline are one of the
        // types handled above, and the reader keeps them as it read them.
        const unknown = command as never;
        throw new Error(`Unknown path command ${JSON.stringify(unknown)}`);
      }
    }
  }

  return parts.join("");
};

/** Every character of the charset in one face, in em. */
const glyphsOf = async (name: (typeof FACE_NAMES)[number]) => {
  const face = await loadFace(name);
  const glyphs: Record<string, AtlasGlyph> = {};
  const unit = 1 / face.unitsPerEm;

  for (const char of ATLAS_CHARSET) {
    const glyph = face.glyph(char);
    const { minX, minY, maxX, maxY } = glyph.bbox;
    glyphs[char] = [
      toPathData(glyph.commands, unit),
      round(glyph.advance * unit),
      round(minX * unit),
      round(-maxY * unit),
      round(maxX * unit),
      round(-minY * unit),
    ];
  }

  return {
    ascent: round(face.ascent * unit),
    capHeight: round(face.capHeight * unit),
    descent: round(face.descent * unit),
    glyphs,
  };
};

const glyphLine = (char: string, glyph: AtlasGlyph) =>
  `    ${JSON.stringify(char)}: [${[
    JSON.stringify(glyph[0]),
    ...glyph.slice(1),
  ].join(", ")}],`;

const faceLines = (
  name: string,
  face: Awaited<ReturnType<typeof glyphsOf>>
) => [
  `  ${name}: {`,
  `    ascent: ${face.ascent},`,
  `    capHeight: ${face.capHeight},`,
  `    descent: ${face.descent},`,
  `    glyphs: {`,
  ...Object.entries(face.glyphs).map(([char, glyph]) => glyphLine(char, glyph)),
  "    },",
  "  },",
];

/** Writes the atlas, and says how many letters it holds. */
export const generateGlyphAtlas = async () => {
  const [digests, faces] = await Promise.all([
    fontDigests(),
    Promise.all(
      FACE_NAMES.map(async (name) => [name, await glyphsOf(name)] as const)
    ),
  ]);

  const source = [
    "/**",
    " * The letterforms of the brand faces, measured in em.",
    " *",
    " * Generated by `bun brand:gen`",
    " * (apps/web/scripts/brand/glyph-atlas.ts) from the WOFF2 files under",
    " * public/fonts. Do not edit this file: change the script, then run it.",
    " *",
    " * One glyph is [outline, advance, minX, minY, maxX, maxY]. The outline and",
    " * every measurement are in em, with y down from the baseline on the pen.",
    " */",
    "",
    "export type AtlasGlyph = readonly [",
    "  path: string,",
    "  advance: number,",
    "  minX: number,",
    "  minY: number,",
    "  maxX: number,",
    "  maxY: number,",
    "];",
    "",
    "export interface AtlasFace {",
    "  ascent: number;",
    "  capHeight: number;",
    "  descent: number;",
    "  glyphs: Record<string, AtlasGlyph>;",
    "}",
    "",
    "/** The SHA-256 of each font file the atlas was read from. */",
    `export const GLYPH_ATLAS_FONTS: Record<string, string> = ${JSON.stringify(digests, null, 2)};`,
    "",
    "/** Every face the brand assets print in. */",
    "export const GLYPH_ATLAS: Record<string, AtlasFace> = {",
    ...faces.flatMap(([name, face]) => faceLines(name, face)),
    "};",
    "",
  ].join("\n");

  await writeFile(ATLAS_FILE, source);

  return {
    characters: ATLAS_CHARSET.length * FACE_NAMES.length,
    file: path.relative(APP_DIR, ATLAS_FILE),
    size: Buffer.byteLength(source),
  };
};
