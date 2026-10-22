/**
 * Writes the Ritools icon set and the glyph atlas from code.
 *
 * The atlas letters are outlines taken from the self-hosted fonts, and every
 * raster this script writes carries the line that says where it came from.
 *
 * The logo is not written here. `public/logo.png` is a supplied file, and the
 * icon set is cut from it: the script may replace the icons, never the logo it
 * reads. The SVG favicon carries the 512 cut as a data URI, so it follows the
 * logo too. The Open Graph cards are not here either: `GET /api/og` draws them on
 * request, from the same cut and the atlas this script writes.
 *
 * Usage: bun scripts/generate-brand-assets.ts
 */

import { spawnSync } from "node:child_process";
import { readFile, readdir, stat, writeFile } from "node:fs/promises";
import path from "node:path";

import { RANSOM_GEOMETRY } from "@/core/libs/ransom-cut";
import { embedProvenance } from "@/features/og/og.png";

import { generateGlyphAtlas } from "./brand/glyph-atlas";

const APP_DIR = path.resolve(import.meta.dirname, "..");
const PUBLIC_DIR = path.join(APP_DIR, "public");

/** The logo the icon set is cut from. It is supplied, and read only. */
const LOGO = "logo.png";

/** The SVG favicon, which carries the 512 cut instead of a second drawing. */
const FAVICON_SVG = "favicon.svg";

/** The line that rides in every icon this script stamps. */
const ORIGIN =
  "The Ritools icon set, cut by @vite-pwa/assets-generator from public/logo.png, the supplied Ritools logo. Stamped by apps/web/scripts/generate-brand-assets.ts.";

/**
 * Checks that the stylesheet still agrees with the ransom geometry.
 *
 * The cut is written down twice: once in the stylesheet the app renders with,
 * and once in the module the Open Graph card reads. If the two drift apart, the
 * wordmark in the card stops being the wordmark in the navbar.
 */
const checkStylesheet = async () => {
  const [css, component] = await Promise.all([
    readFile(path.join(APP_DIR, "src/core/styles/globals.css"), "utf-8"),
    readFile(path.join(APP_DIR, "src/core/components/ui/ransom.tsx"), "utf-8"),
  ]);
  const { padding, gap, wordGap, tilt, slash, slashRun, faceSize } =
    RANSOM_GEOMETRY;

  const expected: [string, string][] = [
    [`padding: ${padding.top}em ${padding.inline}em ${padding.bottom}em`, css],
    [`gap: ${gap}em`, css],
    [`--angle-tilt: ${tilt}deg`, css],
    [`--angle-slash: ${slash}deg`, css],
    [`--slash-run: ${slashRun}`, css],
    ...Object.values(faceSize).map((size): [string, string] => [
      `font-size: ${size}em`,
      css,
    ]),
    [`gap-x-[${wordGap}em]`, component],
  ];

  const missing: string[] = [];
  for (const [needle, haystack] of expected) {
    if (!haystack.includes(needle)) {
      missing.push(needle);
    }
  }

  if (missing.length > 0) {
    throw new Error(
      `The ransom geometry and the stylesheet disagree: ${missing.join(", ")}`
    );
  }
};

/** Fails early when the logo the icon set comes from is not on disk. */
const checkLogo = async () => {
  try {
    await stat(path.join(PUBLIC_DIR, LOGO));
  } catch {
    throw new Error(
      `The logo is missing: public/${LOGO}. The icon set is cut from it, and this script does not draw it.`
    );
  }
};

// 1. The cut the card reads must still be the cut the navbar prints.
await checkStylesheet();

// 2. The glyph atlas the Open Graph card prints from.
const atlas = await generateGlyphAtlas();
console.log(
  `Glyph atlas: ${atlas.characters} letters in ${atlas.file} (${Math.round(atlas.size / 1024)} kB)`
);

// 3. The icon set, cut from the supplied logo by the generator the manifest
//    already reads. The logo itself is never written.
await checkLogo();

const generator = spawnSync("./node_modules/.bin/pwa-assets-generator", [], {
  cwd: APP_DIR,
  stdio: "inherit",
});
if (generator.status !== 0) {
  throw new Error(
    `The PWA asset generator failed with code ${generator.status ?? "none"}.`
  );
}

// 4. The provenance of every raster the generator wrote. The logo and the
//    manifest screenshots are not the generator's to stamp.
const own = new Set([LOGO, "screenshot-wide.png", "screenshot-narrow.png"]);
const inPublic = await readdir(PUBLIC_DIR);
const icons = inPublic.filter(
  (file) => file.endsWith(".png") && !own.has(file)
);
await Promise.all(
  icons.map(async (file) => {
    const at = path.join(PUBLIC_DIR, file);
    const data = await readFile(at);
    await writeFile(at, embedProvenance(data, ORIGIN));
  })
);

// 5. The SVG favicon carries the 512 cut, so a tab gets the same transparent
//    mark the manifest installs. It is a data URI, not a second drawing.
const cut = await readFile(path.join(PUBLIC_DIR, "pwa-512x512.png"));
await writeFile(
  path.join(PUBLIC_DIR, FAVICON_SVG),
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><image width="512" height="512" href="data:image/png;base64,${cut.toString("base64")}"/></svg>\n`
);
