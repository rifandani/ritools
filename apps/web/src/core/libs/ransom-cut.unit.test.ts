import { describe, expect, it } from "vitest";

import { cutWords, RANSOM_GEOMETRY } from "./ransom-cut";

describe("cutWords", () => {
  it("cuts the same text the same way, every time", () => {
    const first = cutWords("Ritools", "red");
    const second = cutWords("Ritools", "red");

    expect(second).toEqual(first);
  });

  it("never puts two letters of a word on the same chip color or face", () => {
    for (const word of cutWords("Ritools", "red")) {
      for (const [index, letter] of word.entries()) {
        const next = word[index + 1];
        if (!next) {
          continue;
        }
        expect(next.chip).not.toBe(letter.chip);
        expect(next.face).not.toBe(letter.face);
      }
    }
  });

  it("keeps the chip of a letter off the ground it would vanish on", () => {
    for (const word of cutWords("Ritools", "red")) {
      for (const letter of word) {
        expect(letter.chip).not.toBe("red");
      }
    }

    for (const word of cutWords("Ritools", "paper")) {
      expect(word.flat().some((letter) => letter.chip === "red")).toBe(true);
    }
  });

  it("cuts at most a third of the letters, and never a narrow one", () => {
    for (const word of cutWords("Ritools", "paper")) {
      for (const letter of word) {
        if (letter.snip) {
          expect("IiJjLlTtFfRr1!.,'").not.toContain(letter.char);
        }
      }
    }
  });

  it("keeps every letter of the word, in reading order", () => {
    const [word] = cutWords("Ritools", "red");

    expect(word?.map((letter) => letter.char.toUpperCase()).join("")).toBe(
      "RITOOLS"
    );
  });
});

describe("RANSOM_GEOMETRY", () => {
  it("holds the chip measurements the stylesheet and the script share", () => {
    expect(RANSOM_GEOMETRY.faceSize).toEqual({
      anton: 1.06,
      abril: 1.02,
      slab: 0.9,
      grot: 0.86,
    });
    expect(RANSOM_GEOMETRY.padding).toEqual({
      top: 0.04,
      inline: 0.11,
      bottom: 0.02,
    });
    expect(RANSOM_GEOMETRY.gap).toBe(0.06);
    expect(RANSOM_GEOMETRY.wordGap).toBe(0.28);
    expect(RANSOM_GEOMETRY.tilt).toBe(4);
    expect(RANSOM_GEOMETRY.slash).toBe(16);
  });
});

describe("cutWords variety", () => {
  it("uses every tilt and both snip sides across several notes", () => {
    const tilts = new Set<number>();
    const snips = new Set<string | undefined>();
    for (const text of [
      "Ritools",
      "Squeeze",
      "paper red",
      "ZXCVBNM",
      "the quick brown fox jumps",
    ]) {
      for (const word of cutWords(text, "paper")) {
        for (const letter of word) {
          tilts.add(letter.tilt);
          snips.add(letter.snip);
        }
      }
    }

    expect([...tilts].toSorted()).toEqual([-1, 0, 1]);
    expect(snips).toContain("l");
    expect(snips).toContain("r");
    expect(snips).toContain(undefined);
  });
});

describe("cutWords pinned draws", () => {
  it("pins the draw for a name whose first cut reads poorly", () => {
    expect(cutWords("Tabular", "paper")).toEqual(
      cutWords("Tabular", "paper", 973)
    );
  });

  it("keeps the pinned name in full caps, so it does not read as a typo", () => {
    const [word] = cutWords("Tabular", "paper");

    expect(word?.map((letter) => letter.char).join("")).toBe("TABULAR");
  });

  it("lets a caller ask for the first draw", () => {
    expect(cutWords("Tabular", "paper", 0)).not.toEqual(
      cutWords("Tabular", "paper")
    );
  });

  it("keeps a named draw stable", () => {
    expect(cutWords("Tabular", "paper", 973)).toEqual(
      cutWords("Tabular", "paper", 973)
    );
  });
});
