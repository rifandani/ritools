import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";

import { describe, expect, it } from "vitest";

import {
  FACE_INSTANCES,
  FACE_NAMES,
  FONT_FILES,
} from "@/core/libs/brand/faces";
import { ATLAS_CHARSET } from "@/core/libs/brand/glyphs";

import { GLYPH_ATLAS, GLYPH_ATLAS_FONTS } from "./glyph-atlas.generated";
import type { AtlasFace } from "./glyph-atlas.generated";

const FONT_DIR = path.resolve(import.meta.dirname, "../../../public/fonts");

/** One face of the atlas, which the generator always writes. */
const faceOf = (name: string): AtlasFace => {
  const face = GLYPH_ATLAS[name];
  if (!face) {
    throw new Error(`The atlas has no face "${name}".`);
  }
  return face;
};

const sha256 = async (file: string) =>
  createHash("sha256")
    .update(await readFile(path.join(FONT_DIR, file)))
    .digest("hex");

describe("the glyph atlas", () => {
  it("holds every face the brand prints in", () => {
    expect(Object.keys(GLYPH_ATLAS).toSorted()).toEqual(FACE_NAMES.toSorted());
  });

  it("holds every character of the charset in every face", () => {
    for (const name of FACE_NAMES) {
      expect(Object.keys(faceOf(name).glyphs)).toHaveLength(
        ATLAS_CHARSET.length
      );
    }
  });

  it("measures each face in em", () => {
    for (const name of FACE_NAMES) {
      const face = faceOf(name);

      expect(face.ascent).toBeGreaterThan(0.5);
      expect(face.ascent).toBeLessThan(2);
      expect(face.capHeight).toBeGreaterThan(0.4);
      expect(face.capHeight).toBeLessThanOrEqual(face.ascent);
      expect(face.descent).toBeLessThan(0);
    }
  });

  it("gives a letter an outline and an advance", () => {
    const glyph = faceOf("anton").glyphs.R;
    if (!glyph) {
      throw new Error("The atlas has no R.");
    }
    const [outline, advance] = glyph;

    expect(outline.length).toBeGreaterThan(0);
    expect(advance).toBeGreaterThan(0);
  });

  it("was read from the font files on disk, not from an older copy", async () => {
    const files = [
      ...new Set(Object.values(FACE_INSTANCES).map((face) => face.file)),
    ];
    const digests = await Promise.all(
      files.map(async (file) => [
        FONT_FILES[file],
        await sha256(FONT_FILES[file]),
      ])
    );

    expect(GLYPH_ATLAS_FONTS).toEqual(Object.fromEntries(digests));
  });
});
