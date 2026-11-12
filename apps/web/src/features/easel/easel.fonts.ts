/**
 * The fonts of Easel text: a bundled set of open-license fonts, a font file
 * the user loads, and (in Chromium) a font on the device.
 *
 * A font name can come from a user file or from the device, so every lookup
 * goes through a `Map`, never through a keyed object.
 */

const BUNDLED_FONT_IDS = [
  "archivo",
  "inter",
  "playfair",
  "roboto-slab",
  "jetbrains-mono",
  "caveat",
  "bebas-neue",
] as const;
export type BundledFontId = (typeof BUNDLED_FONT_IDS)[number];

export interface FontChoice {
  /** The CSS family name the canvas uses. */
  readonly family: string;
  /** The name the user sees. */
  readonly label: string;
  readonly source: "bundled" | "device" | "file";
}

const BUNDLED: readonly (FontChoice & { readonly id: BundledFontId })[] = [
  { family: "Archivo", id: "archivo", label: "Archivo", source: "bundled" },
  { family: "Inter Variable", id: "inter", label: "Inter", source: "bundled" },
  {
    family: "Playfair Display Variable",
    id: "playfair",
    label: "Playfair Display",
    source: "bundled",
  },
  {
    family: "Roboto Slab Variable",
    id: "roboto-slab",
    label: "Roboto Slab",
    source: "bundled",
  },
  {
    family: "JetBrains Mono Variable",
    id: "jetbrains-mono",
    label: "JetBrains Mono",
    source: "bundled",
  },
  {
    family: "Caveat Variable",
    id: "caveat",
    label: "Caveat",
    source: "bundled",
  },
  {
    family: "Bebas Neue",
    id: "bebas-neue",
    label: "Bebas Neue",
    source: "bundled",
  },
];

export const BUNDLED_FONTS: readonly FontChoice[] = BUNDLED;

/** The font of new text. It is the app's own face, so it needs no load. */
export const DEFAULT_FONT = "Archivo";

const ID_BY_FAMILY = new Map(BUNDLED.map((font) => [font.family, font.id]));

/** The bundled font with a family name, or `null`. */
export const bundledFontIdOf = (family: string): BundledFontId | null =>
  ID_BY_FAMILY.get(family) ?? null;

export const FONT_FILE_ACCEPT = ".ttf,.otf,.woff2,font/ttf,font/otf,font/woff2";

/** Whether a file name is a font file Easel can load. */
export const isFontFileName = (name: string): boolean =>
  /\.(?:ttf|otf|woff2)$/iu.test(name);

/**
 * A safe CSS family name for a font that is not bundled. It keeps letters,
 * digits, spaces, and hyphens, so the name cannot break out of a CSS string.
 */
export const safeFamilyOf = (name: string): string => {
  const cleaned = name
    .replace(/\.(?:ttf|otf|woff2)$/iu, "")
    .replaceAll(/[^\p{L}\p{N} -]+/gu, " ")
    .replaceAll(/\s+/gu, " ")
    .trim()
    .slice(0, 60);
  return cleaned.length === 0 ? "Custom font" : cleaned;
};

/**
 * The font list: the bundled fonts, then the user's fonts in the order they
 * came. A user font with the family of an earlier font is left out.
 */
export const fontChoicesOf = (
  extra: readonly FontChoice[]
): readonly FontChoice[] => {
  const byFamily = new Map<string, FontChoice>(
    BUNDLED.map((font) => [font.family, font])
  );
  for (const font of extra) {
    if (!byFamily.has(font.family)) {
      byFamily.set(font.family, font);
    }
  }
  return [...byFamily.values()];
};

/** The unique device font families, sorted, as font choices. */
export const deviceFontChoicesOf = (
  families: readonly string[]
): readonly FontChoice[] =>
  // The canvas finds a device font by its exact name, so a name that is not
  // safe in a CSS string is left out.
  [...new Set(families.filter((family) => safeFamilyOf(family) === family))]
    .toSorted((left, right) => left.localeCompare(right))
    .map((family) => ({ family, label: family, source: "device" as const }));
