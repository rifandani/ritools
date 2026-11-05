import { describe, expect, it } from "vitest";

import { MarkedProgress } from "./cleave.marked";

const text =
  "<<<<<<< HEAD\na\n=======\nb\n>>>>>>> branch\nsame\n<<<<<<< HEAD\nc\n=======\nd\n>>>>>>> branch\n";
describe("Marked Text progress", () => {
  it("keeps export unavailable until every native resolved-file event arrives, in any order", () => {
    const session = new MarkedProgress(text);
    expect(session.ids).toEqual([0, 1]);
    expect(session.view).toEqual({ remaining: 2, chosen: 0, resolved: null });
    session.receive(
      1,
      "<<<<<<< HEAD\na\n=======\nb\n>>>>>>> branch\nsame\nd\n"
    );
    expect(session.view).toEqual({ remaining: 1, chosen: 1, resolved: null });
    session.receive(0, "a\nb\nsame\nd\n");
    expect(session.view).toEqual({
      remaining: 0,
      chosen: 2,
      resolved: "a\nb\nsame\nd\n",
    });
    session.receive(0, "stale callback");
    expect(session.view.resolved).toBe("a\nb\nsame\nd\n");
    expect(session.reset().view).toEqual({
      remaining: 2,
      chosen: 0,
      resolved: null,
    });
  });
  it("refuses broken Marked Text", () => {
    expect(() => new MarkedProgress("<<<<<<< unfinished")).toThrow();
  });
});
