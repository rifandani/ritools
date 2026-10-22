/**
 * Types for the two build-time font packages. Neither ships its own.
 */

declare module "fontkit" {
  export interface GlyphPath {
    toSVG: (options?: { decimals?: number }) => string;
    scale: (x: number, y: number) => GlyphPath;
    translate: (x: number, y: number) => GlyphPath;
    /** The ink box of the path, in font units. */
    readonly bbox: { minX: number; minY: number; maxX: number; maxY: number };
  }

  export interface Glyph {
    advanceWidth: number;
    path: GlyphPath;
  }

  export interface Font {
    unitsPerEm: number;
    ascent: number;
    descent: number;
    capHeight: number;
    glyphForCodePoint: (codePoint: number) => Glyph;
    getVariation: (settings: Record<string, number>) => Font;
  }

  export function create(buffer: Uint8Array): Font;
}

declare module "wawoff2" {
  export function decompress(buffer: Uint8Array): Promise<Uint8Array>;
}
