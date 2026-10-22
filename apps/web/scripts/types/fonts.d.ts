/**
 * Types for `opentype.js`, which ships no types of its own.
 * `woff2-encoder` ships its own.
 */

declare module "opentype.js" {
  export type PathCommand =
    | { type: "M"; x: number; y: number }
    | { type: "L"; x: number; y: number }
    | { type: "Q"; x1: number; y1: number; x: number; y: number }
    | {
        type: "C";
        x1: number;
        y1: number;
        x2: number;
        y2: number;
        x: number;
        y: number;
      }
    | { type: "Z" };

  export interface Path {
    readonly commands: PathCommand[];
  }

  /** The smallest box that holds a path, in font units with y up. */
  export interface BoundingBox {
    x1: number;
    y1: number;
    x2: number;
    y2: number;
  }

  export interface Glyph {
    advanceWidth: number;
    readonly path: Path;
    getBoundingBox: () => BoundingBox;
  }

  export interface Font {
    readonly unitsPerEm: number;
    /** The ascender of the `hhea` table, in font units. */
    readonly ascender: number;
    /** The descender of the `hhea` table, in font units. Negative. */
    readonly descender: number;
    readonly tables: {
      readonly os2: {
        /** The cap height of the `OS/2` table, in font units. */
        readonly sCapHeight: number;
      };
    };
    charToGlyph: (char: string) => Glyph;
  }

  export function parse(buffer: ArrayBuffer): Font;
}
