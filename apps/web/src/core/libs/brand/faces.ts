/**
 * The brand faces: the self-hosted, open-licensed fonts of `public/fonts`, and
 * the named instances the brand assets are cut from.
 *
 * The list lives here, not in the build script, because two readers need it:
 * `brand:gen` turns the files into outlines, and the Open Graph card reads the
 * glyph atlas the script wrote. One list keeps the two in step.
 *
 * The stylesheet loads the variable files, so the browser can set any weight
 * and width. The atlas needs the opposite: fixed instances, read as outlines.
 * So the files below are the static instances of those variable faces, cut at
 * the weight and width each brand asset prints, and the stylesheet keeps the
 * variable ones. Each cut was made once from its variable source with
 * fonttools (`instantiateVariableFont(font, { wght, wdth })`) and committed,
 * because the atlas reads outlines as the files store them and never varies
 * one itself.
 */

/** The font files under `public/fonts` that the atlas reads. */
export const FONT_FILES = {
  anton: "anton-latin-400-normal.woff2",
  abril: "abril-fatface-latin-400-normal.woff2",
  slab: "alfa-slab-one-latin-400-normal.woff2",
  /** Archivo 900 at 125% width, out of `archivo-latin-wdth-normal.woff2`. */
  archivoWide: "instances/archivo-latin-wdth125-wght900.woff2",
  /** Archivo 900 at 75% width, out of `archivo-latin-wdth-normal.woff2`. */
  archivoNarrow: "instances/archivo-latin-wdth75-wght900.woff2",
  /** Archivo 800 at 87.5% width, out of `archivo-latin-wdth-normal.woff2`. */
  archivoSemi: "instances/archivo-latin-wdth87.5-wght800.woff2",
  /** Martian Mono 800 at 75% width, out of the variable file of the same name. */
  martianNarrow: "instances/martian-mono-latin-wdth75-wght800.woff2",
} as const;

export type FontFile = keyof typeof FONT_FILES;

/** One named instance of a face. */
export interface FaceInstance {
  /** The file under `public/fonts`. */
  file: FontFile;
}

/** The named instances the brand assets use. */
export const FACE_INSTANCES = {
  /** The ransom face set. */
  anton: { file: "anton" },
  abril: { file: "abril" },
  slab: { file: "slab" },
  /** Archivo 900 at 125% width: the fourth ransom face. */
  grot: { file: "archivoWide" },
  /** Poster title: Archivo 900 at 75% width. */
  poster: { file: "archivoNarrow" },
  /** Label: Archivo 800 at 87.5% width. */
  label: { file: "archivoSemi" },
  /** Numeral: Martian Mono 800 at 75% width. */
  numeral: { file: "martianNarrow" },
} as const satisfies Record<string, FaceInstance>;

/** The name of one named instance. */
export type FaceName = keyof typeof FACE_INSTANCES;

/** Every instance name, in the order the atlas writes them. */
// SAFETY: The keys of the literal FACE_INSTANCES are, by construction, FaceName.
export const FACE_NAMES = Object.keys(FACE_INSTANCES) as FaceName[];
