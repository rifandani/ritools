/**
 * The ransom cut: the rules that turn a name into cut-out letters on paper
 * chips.
 *
 * This module is pure and free of React, so the same cut runs in two places:
 * the `Ransom` component in the app, and the brand-asset script that writes
 * the SVG wordmark. One text always cuts the same way - the wordmark in the
 * navbar and the wordmark on disk are the same note.
 */

/* eslint-disable eslint/no-bitwise -- The hash and the generator are bit-exact. */
/* eslint-disable unicorn/prefer-math-trunc -- The generator keeps its arithmetic. */
/* eslint-disable unicorn/prefer-code-point -- The hash walks UTF-16 code units. */

export type Face = "anton" | "abril" | "slab" | "grot";
export type Chip = "white" | "stock" | "ink" | "red";
export type Ground = "paper" | "red" | "ink";

/** The four display faces of the ransom set, in draw order. */
const FACES: readonly Face[] = ["anton", "abril", "slab", "grot"];

/** The four chips of the ransom set, in draw order. */
const CHIPS: readonly Chip[] = ["white", "ink", "red", "stock"];

/** Glyphs too narrow to lose a side to a cut. */
const NARROW = new Set("IiJjLlTtFfRr1!.,'");

/** Chips that may be cut: a cut clips the edge a light chip needs on paper. */
const CUTTABLE = new Set<Chip>(["ink", "red"]);

/** The chip that would vanish on each ground. */
const HIDDEN_ON: Record<Ground, Chip | null> = {
  paper: null,
  red: "red",
  ink: "ink",
};

export interface Cut {
  /** The letter, in the case the cut gave it. */
  char: string;
  face: Face;
  chip: Chip;
  /** Rest pose: tilt in units of `--angle-tilt`, lift in em. */
  tilt: -1 | 0 | 1;
  dy: number;
  snip: "l" | "r" | undefined;
  /** Assembly: landing order, and where the chip flies in from. */
  order: number;
  sx: number;
  sy: number;
  sr: -1 | 1;
}

/**
 * The chip geometry of the ransom, in em of the word's own font size. The
 * values mirror `globals.css`; the brand-asset script fails the build when the
 * two drift apart.
 */
export const RANSOM_GEOMETRY = {
  /** Chip padding: top, inline, bottom. */
  padding: { top: 0.04, inline: 0.11, bottom: 0.02 },
  /** Gap between two chips of one word. */
  gap: 0.06,
  /** Gap between two words. */
  wordGap: 0.28,
  /** The tilt of a chip: -4deg, 0, or +4deg. */
  tilt: 4,
  /** The slant of a scissor cut: 16deg. */
  slash: 16,
  /** The run of the slant across one chip height: tan(16deg). */
  slashRun: 0.2867,
  /** The face size of each face, in em of the word. */
  faceSize: {
    anton: 1.06,
    abril: 1.02,
    slab: 0.9,
    grot: 0.86,
  } satisfies Record<Face, number>,
} as const;

/** FNV-1a: a stable hash, so the server and the client cut the same letters. */
const hash = (text: string) => {
  let h = 2_166_136_261;
  for (let i = 0; i < text.length; i += 1) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16_777_619);
  }
  return h >>> 0;
};

/** mulberry32: a small seeded generator. */
const generator = (seed: number) => {
  let a = seed;
  return () => {
    a = (a + 0x6d_2b_79_f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    // eslint-disable-next-line eslint/operator-assignment -- The generator is bit-exact.
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4_294_967_296;
  };
};

const pick = <T>(random: () => number, from: readonly T[], not?: T) => {
  const pool = from.filter((item) => item !== not);
  const choice = pool[Math.floor(random() * pool.length)];
  if (choice === undefined) {
    throw new Error("The pool holds no item to pick.");
  }
  return choice;
};

/** Cuts each word of `text` into chips. The same text always cuts the same way. */
export const cutWords = (text: string, ground: Ground): Cut[][] => {
  const random = generator(hash(text));
  const chips = CHIPS.filter((chip) => chip !== HIDDEN_ON[ground]);
  const words = text.split(/\s+/u).filter(Boolean);
  const total = words.reduce((sum, word) => sum + word.length, 0);
  // Letters land out of reading order, like a note pasted in a hurry.
  const order = Array.from({ length: total }, (_, i) => i);
  for (let i = order.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    const held = order[i] ?? i;
    const other = order[j] ?? j;
    order[i] = other;
    order[j] = held;
  }

  let face: Face | undefined;
  let chip: Chip | undefined;
  let index = 0;
  return words.map((word) =>
    [...word].map((letter, i) => {
      face = pick(random, FACES, face);
      chip = pick(random, chips, chip);
      const lower = i > 0 && random() < 0.28;
      const roll = random();
      const cut: Cut = {
        char: lower ? letter.toLowerCase() : letter.toUpperCase(),
        face,
        chip,
        tilt: roll < 0.36 ? -1 : roll < 0.72 ? 1 : 0,
        dy: Math.round((random() - 0.5) * 10) / 100,
        snip:
          random() < 0.3 && CUTTABLE.has(chip) && !NARROW.has(letter)
            ? random() < 0.5
              ? "l"
              : "r"
            : undefined,
        order: order[index] ?? index,
        sx: Math.round((random() - 0.5) * 180) / 100,
        sy: Math.round((random() - 0.5) * 240) / 100,
        sr: random() < 0.5 ? -1 : 1,
      };
      index += 1;
      return cut;
    })
  );
};
