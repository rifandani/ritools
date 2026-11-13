/* oxlint-disable promise/prefer-await-to-then -- the font stylesheets load as one group. */
import { loadLibrary } from "@/core/libs/library-load";
import {
  bundledFontIdOf,
  deviceFontChoicesOf,
  safeFamilyOf,
} from "@/features/easel/easel.fonts";
import type { BundledFontId, FontChoice } from "@/features/easel/easel.fonts";

/**
 * The browser side of the fonts. A bundled font loads on first use
 * (ADR-0036): its stylesheet is a dynamic import, and the service worker
 * caches the font file after that.
 */

const STYLES: Readonly<Record<BundledFontId, () => Promise<void>>> = {
  // Archivo is the app's own face. The page already has it.
  archivo: () => Promise.resolve(),
  "bebas-neue": async () => {
    await import("@fontsource/bebas-neue/latin-400.css");
  },
  caveat: async () => {
    await import("@fontsource-variable/caveat/wght.css");
  },
  inter: async () => {
    await Promise.all([
      import("@fontsource-variable/inter/wght.css"),
      import("@fontsource-variable/inter/wght-italic.css"),
    ]);
  },
  "jetbrains-mono": async () => {
    await Promise.all([
      import("@fontsource-variable/jetbrains-mono/wght.css"),
      import("@fontsource-variable/jetbrains-mono/wght-italic.css"),
    ]);
  },
  playfair: async () => {
    await Promise.all([
      import("@fontsource-variable/playfair-display/wght.css"),
      import("@fontsource-variable/playfair-display/wght-italic.css"),
    ]);
  },
  "roboto-slab": async () => {
    await import("@fontsource-variable/roboto-slab/wght.css");
  },
};

const loaded = new Map<string, Promise<void>>();

const loadFaces = async (family: string): Promise<void> => {
  const id = bundledFontIdOf(family);
  const library = `${family} font`;
  if (id !== null) {
    await loadLibrary(library, STYLES[id]);
  }
  // The canvas draws with a face only after the browser has its file. The
  // stylesheet can load while the font file is blocked, so this load is also
  // a library load for a bundled font.
  const loadFiles = () =>
    Promise.all(
      ["400", "700", "italic 400", "italic 700"].map((style) =>
        document.fonts.load(`${style} 32px "${family}"`)
      )
    );
  await (id === null ? loadFiles() : loadLibrary(library, loadFiles));
};

/**
 * Makes one font ready for the canvas. It resolves also when the font does
 * not load: the text then uses the fallback face, and the shared toast tells
 * the user, for the stylesheet and for the font file.
 */
export const ensureFont = (family: string): Promise<void> => {
  const existing = loaded.get(family);
  if (existing !== undefined) {
    return existing;
  }
  const pending = loadFaces(family).catch(() => {
    loaded.delete(family);
  });
  loaded.set(family, pending);
  return pending;
};

/** Registers a user's TTF, OTF, or WOFF2 file and returns its font choice. */
export const registerFontFile = async (file: File): Promise<FontChoice> => {
  const family = safeFamilyOf(file.name);
  const face = new FontFace(family, await file.arrayBuffer());
  await face.load();
  document.fonts.add(face);
  loaded.set(family, Promise.resolve());
  return { family, label: family, source: "file" };
};

interface LocalFontData {
  readonly family: string;
}

/** Whether the browser has the Local Font Access API. */
export const canQueryDeviceFonts = (): boolean =>
  "queryLocalFonts" in globalThis;

/**
 * The fonts on the device. The browser shows its permission prompt. A refusal
 * gives an empty list.
 */
export const queryDeviceFonts = async (): Promise<readonly FontChoice[]> => {
  // SAFETY: `queryLocalFonts` is a Chromium API that the DOM lib does not declare.
  const query = (
    globalThis as { queryLocalFonts?: () => Promise<readonly LocalFontData[]> }
  ).queryLocalFonts;
  if (query === undefined) {
    return [];
  }
  try {
    const fonts = await query();
    return deviceFontChoicesOf(fonts.map((font) => font.family));
  } catch {
    return [];
  }
};
