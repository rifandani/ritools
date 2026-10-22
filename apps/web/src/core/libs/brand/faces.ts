/**
 * The brand faces: the self-hosted, open-licensed fonts of `public/fonts`, and
 * the named instances the brand assets are cut from.
 *
 * The list lives here, not in the build script, because two readers need it:
 * `brand:gen` turns the files into outlines, and the Open Graph card reads the
 * glyph atlas the script wrote. One list keeps the two in step.
 */

/** The font files under `public/fonts`. */
export const FONT_FILES = {
  anton: "anton-latin-400-normal.woff2",
  abril: "abril-fatface-latin-400-normal.woff2",
  slab: "alfa-slab-one-latin-400-normal.woff2",
  archivo: "archivo-latin-wdth-normal.woff2",
  martian: "martian-mono-latin-wdth-normal.woff2",
} as const;

export type FontFile = keyof typeof FONT_FILES;

/** One named instance of a font. */
export interface FaceInstance {
  /** The file under `public/fonts`. */
  file: FontFile;
  /** The variable-font axes to instantiate, if the face has any. */
  variation?: Record<string, number>;
}

/** The named instances the brand assets use. */
export const FACE_INSTANCES = {
  /** The ransom face set. */
  anton: { file: "anton" },
  abril: { file: "abril" },
  slab: { file: "slab" },
  /** Archivo 900 at 125% width: the fourth ransom face. */
  grot: { file: "archivo", variation: { wght: 900, wdth: 125 } },
  /** Poster title: Archivo 900 at 75% width. */
  poster: { file: "archivo", variation: { wght: 900, wdth: 75 } },
  /** Label: Archivo 800 at 87.5% width. */
  label: { file: "archivo", variation: { wght: 800, wdth: 87.5 } },
  /** Numeral: Martian Mono 800 at 75% width. */
  numeral: { file: "martian", variation: { wght: 800, wdth: 75 } },
} as const satisfies Record<string, FaceInstance>;

/** The name of one named instance. */
export type FaceName = keyof typeof FACE_INSTANCES;

/** Every instance name, in the order the atlas writes them. */
// SAFETY: The keys of the literal FACE_INSTANCES are, by construction, FaceName.
export const FACE_NAMES = Object.keys(FACE_INSTANCES) as FaceName[];
