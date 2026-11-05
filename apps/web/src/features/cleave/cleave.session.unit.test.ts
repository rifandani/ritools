import { describe, expect, it } from "vitest";

import { CleaveSession } from "./cleave.session";

const changesLeft = ({ view }: CleaveSession) => ({
  removals: view.removals,
  additions: view.additions,
  removedCharacters: view.statistics.before.changedCharacters,
  addedCharacters: view.statistics.after.changedCharacters,
});

describe("Cleave Session", () => {
  it("counts characters in changed lines and clears them through Resolve", () => {
    const session = CleaveSession.compare({
      before: "same\r\nold 😀\r\n",
      after: "same\nnew\nextra\n",
    });
    const expected = {
      before: {
        lines: 2,
        changedLines: 1,
        characters: 9,
        changedCharacters: 5,
      },
      after: {
        lines: 3,
        changedLines: 2,
        characters: 12,
        changedCharacters: 8,
      },
    };
    expect(session.statistics).toEqual(expected);
    session.chooseAll("both");
    expect(session.statistics).toEqual({
      before: {
        lines: 2,
        changedLines: 0,
        characters: 9,
        changedCharacters: 0,
      },
      after: {
        lines: 3,
        changedLines: 0,
        characters: 12,
        changedCharacters: 0,
      },
    });
    session.reset();
    expect(session.statistics).toEqual(expected);
    expect(session.swap().statistics).toEqual({
      before: expected.after,
      after: expected.before,
    });
  });

  it.each(["before", "after", "both"] as const)(
    "counts only the Changes left after each %s choice, in any order",
    (choice) => {
      const before = "a\nremoved\nsame\nold one\nold two\n";
      const after = "a\nsame\nnew one\n";
      const first = {
        removals: 1,
        additions: 0,
        removedCharacters: 7,
        addedCharacters: 0,
      };
      const second = {
        removals: 2,
        additions: 1,
        removedCharacters: 14,
        addedCharacters: 7,
      };
      const none = {
        removals: 0,
        additions: 0,
        removedCharacters: 0,
        addedCharacters: 0,
      };
      for (const [id, expected] of [
        [0, second],
        [1, first],
      ] as const) {
        const session = CleaveSession.compare({ before, after });
        session.choose(id, choice);
        expect(changesLeft(session)).toEqual(expected);
        session.choose(1 - id, choice);
        expect(changesLeft(session)).toEqual(none);
      }
    }
  );

  it("restores the change counts on reset and ignores a settled Conflict", () => {
    const session = CleaveSession.compare({
      before: "old one\nsame\nold two\n",
      after: "new one\nsame\nnew two\n",
    });
    session.choose(0, "after");
    session.choose(0, "before");
    expect(session.view).toMatchObject({ removals: 1, additions: 1 });
    session.reset();
    expect(session.view).toMatchObject({ removals: 2, additions: 2 });
  });

  it("counts blank lines, empty sides, and unchanged characters", () => {
    expect(
      CleaveSession.compare({ before: "", after: "\n😀\n" }).statistics
    ).toEqual({
      before: {
        lines: 0,
        changedLines: 0,
        characters: 0,
        changedCharacters: 0,
      },
      after: { lines: 2, changedLines: 2, characters: 1, changedCharacters: 1 },
    });
    expect(
      CleaveSession.compare({ before: "same", after: "same" }).statistics.before
    ).toEqual({
      lines: 1,
      changedLines: 0,
      characters: 4,
      changedCharacters: 0,
    });
  });

  it.each([
    [
      "keeps each Removal before the Additions of its Change",
      "same\nold 😀\n",
      "same\nnew\nextra\n",
      "same\nold 😀\nnew\nextra\n",
      4,
      17,
    ],
    [
      "keeps unchanged lines outside the collapsed context",
      "a\nb\nc\nd\ne\nf\ng\nh\ni\nj\nk\n",
      "a\nb\nc\nd\ne\nf\ng\nh\ni\nj\nK\n",
      "a\nb\nc\nd\ne\nf\ng\nh\ni\nj\nk\nK\n",
      12,
      12,
    ],
    [
      "separates lines at a missing EOF newline",
      "a\nold",
      "a\nnew",
      "a\nold\nnew",
      3,
      7,
    ],
    ["keeps a Removal at the start", "a\nb\n", "b\n", "a\nb\n", 2, 2],
    ["keeps a Removal at the end", "a\nb\n", "a\n", "a\nb\n", 2, 2],
    ["keeps a Removal in the middle", "a\nb\nc\n", "a\nc\n", "a\nb\nc\n", 3, 3],
    ["accepts an empty After Text", "a\nb\n", "", "a\nb\n", 2, 2],
    ["accepts an empty Before Text", "", "x\n", "x\n", 1, 1],
    ["accepts equal texts", "same", "same", "same", 1, 4],
    ["accepts two empty texts", "", "", "", 0, 0],
    [
      "restores CRLF",
      "a\r\nold\r\n",
      "a\r\nnew\r\n",
      "a\r\nold\r\nnew\r\n",
      3,
      7,
    ],
  ])(
    "builds the Stacked Text: %s",
    (_, before, after, text, lines, characters) => {
      expect(CleaveSession.compare({ before, after }).stacked).toEqual({
        text,
        lines,
        characters,
      });
    }
  );

  it("keeps the Stacked Text tied to the input texts through Resolve", () => {
    const session = CleaveSession.compare({
      before: "same\nold\n",
      after: "same\nnew\n",
    });
    const expected = { text: "same\nold\nnew\n", lines: 3, characters: 10 };
    session.chooseAll("after");
    expect(session.stacked).toEqual(expected);
    session.reset();
    expect(session.stacked).toEqual(expected);
    expect(session.swap().stacked.text).toBe("same\nnew\nold\n");
  });

  it("resolves a removal-only text and swaps its file names and counts", () => {
    const session = CleaveSession.compare({
      before: "first\nsecond\n",
      after: "",
      beforeName: "before.md",
      afterName: "after.md",
    });
    expect(session.view).toMatchObject({
      removals: 2,
      additions: 0,
      remaining: 1,
      beforeLines: 2,
      afterLines: 0,
    });
    session.chooseAll("before");
    expect(session.view.resolved).toBe("first\nsecond\n");
    const swapped = session.swap();
    expect(swapped.texts).toEqual({
      before: "",
      after: "first\nsecond\n",
      beforeName: "after.md",
      afterName: "before.md",
    });
    expect(swapped.view).toMatchObject({ removals: 0, additions: 2 });
  });
  it("counts Changes and keeps Resolved Text unavailable until every Conflict is settled", () => {
    const session = CleaveSession.compare({
      before: "one\nold\nend\n",
      after: "one\nnew\nend\n",
    });
    expect(session.view).toMatchObject({
      removals: 1,
      additions: 1,
      beforeLines: 3,
      afterLines: 3,
      remaining: 1,
      resolved: null,
    });
    session.choose(0, "after");
    expect(session.view).toMatchObject({
      removals: 0,
      additions: 0,
      remaining: 0,
      resolved: "one\nnew\nend\n",
    });
  });
  it.each(["before", "after", "both"] as const)(
    "keeps exact marker-like text for %s in every Conflict order",
    (choice) => {
      const before =
        "=======\nold one\n<<<<<<< literal\nsame\nold two\n>>>>>>> literal\nend old";
      const after =
        "=======\nnew one\n<<<<<<< literal\nsame\nnew two\n>>>>>>> literal\nend new";
      const expected = {
        before,
        after,
        both: "=======\nold one\nnew one\n<<<<<<< literal\nsame\nold two\nnew two\n>>>>>>> literal\nend old\nend new",
      };
      for (const order of [
        [0, 1, 2],
        [2, 1, 0],
        [1, 0, 2],
      ]) {
        const session = CleaveSession.compare({ before, after });
        for (const id of order) {
          session.choose(id, choice);
        }
        expect(session.view.resolved).toBe(expected[choice]);
      }
    }
  );

  it("keeps CRLF only when both inputs use only CRLF, and resets all choices", () => {
    const session = CleaveSession.compare({
      before: "a\r\nb\r\n",
      after: "a\r\nc\r\n",
    });
    session.chooseAll("both");
    expect(session.view.resolved).toBe("a\r\nb\r\nc\r\n");
    session.reset();
    expect(session.view).toMatchObject({
      remaining: 1,
      chosen: 0,
      resolved: null,
    });
    session.chooseAll("before");
    expect(session.view.resolved).toBe("a\r\nb\r\n");
    const swapped = session.swap();
    expect(swapped.texts).toMatchObject({
      before: "a\r\nc\r\n",
      after: "a\r\nb\r\n",
    });
    const mixed = CleaveSession.compare({
      before: "a\r\nb\r\n",
      after: "a\nc\n",
    });
    mixed.chooseAll("both");
    expect(mixed.view.resolved).toBe("a\nb\nc\n");
  });

  it.each([
    ["", "", 0],
    ["a\r\n", "a\n", 1],
    ["a", "a", 1],
  ])(
    "treats matching line endings as equal (%j, %j)",
    (before, after, count) => {
      const session = CleaveSession.compare({ before, after });
      expect(session.view).toMatchObject({
        remaining: 0,
        additions: 0,
        removals: 0,
        beforeLines: count,
        afterLines: count,
      });
    }
  );

  it.each([
    ["", "new", "new"],
    ["old", "", "old"],
    ["old", "new", "old\nnew"],
    ["old", "new\n", "old\nnew\n"],
    ["old\n", "new", "old\nnew"],
    ["=======", "<<<<<<<", "=======\n<<<<<<<"],
  ])(
    "keeps separate lines for Accept both (%j, %j)",
    (before, after, expected) => {
      const session = CleaveSession.compare({ before, after });
      session.chooseAll("both");
      expect(session.view.resolved).toBe(expected);
    }
  );
  it("keeps mixed choices in any order and ignores a settled Conflict", () => {
    const session = CleaveSession.compare({
      before: "a\nsame\nb\ncontext\nc",
      after: "x\nsame\ny\ncontext\nz",
    });
    session.choose(2, "before");
    session.choose(0, "both");
    session.choose(0, "after");
    expect(session.view.resolved).toBeNull();
    session.choose(1, "after");
    expect(session.view.resolved).toBe("a\nx\nsame\ny\ncontext\nc");
    expect(session.view.chosen).toBe(3);
  });

  it.each([
    ["=======\n", "changed\n", "=======\nchanged\n"],
    ["<<<<<<< literal\n", "changed\n", "<<<<<<< literal\nchanged\n"],
    [">>>>>>> literal\n", "changed\n", ">>>>>>> literal\nchanged\n"],
    ["changed\n", "=======\n", "changed\n=======\n"],
    ["changed\n", "<<<<<<< literal\n", "changed\n<<<<<<< literal\n"],
    ["changed\n", ">>>>>>> literal\n", "changed\n>>>>>>> literal\n"],
    ["same\n=======\nold", "same\n=======\nnew", "same\n=======\nold\nnew"],
    [
      "same\nold\n<<<<<<< literal",
      "same\nnew\n<<<<<<< literal",
      "same\nold\nnew\n<<<<<<< literal",
    ],
  ])(
    "preserves literal marker lines in Changes (%j, %j)",
    (before, after, both) => {
      for (const [choice, expected] of [
        ["before", before],
        ["after", after],
        ["both", both],
      ] as const) {
        const session = CleaveSession.compare({ before, after });
        session.chooseAll(choice);
        expect(session.view.resolved).toBe(expected);
      }
    }
  );
});
