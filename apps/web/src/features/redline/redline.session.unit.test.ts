import { describe, expect, it } from "vitest";

import { RedlineSession } from "./redline.session";

describe("Redline Session", () => {
  it("resolves a removal-only text and swaps its file names and counts", () => {
    const session = RedlineSession.compare({
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
    const session = RedlineSession.compare({
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
        const session = RedlineSession.compare({ before, after });
        for (const id of order) {
          session.choose(id, choice);
        }
        expect(session.view.resolved).toBe(expected[choice]);
      }
    }
  );

  it("keeps CRLF only when both inputs use only CRLF, and resets all choices", () => {
    const session = RedlineSession.compare({
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
    const mixed = RedlineSession.compare({
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
      const session = RedlineSession.compare({ before, after });
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
      const session = RedlineSession.compare({ before, after });
      session.chooseAll("both");
      expect(session.view.resolved).toBe(expected);
    }
  );
  it("keeps mixed choices in any order and ignores a settled Conflict", () => {
    const session = RedlineSession.compare({
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
        const session = RedlineSession.compare({ before, after });
        session.chooseAll(choice);
        expect(session.view.resolved).toBe(expected);
      }
    }
  );
});
