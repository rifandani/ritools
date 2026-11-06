import { describe, expect, it } from "vitest";

import { reorderTabs } from "./quill.tabs";

describe("reorderTabs", () => {
  const ids = ["a", "b", "c", "d"];

  it("moves a tab to either side of another tab in both directions", () => {
    expect(reorderTabs(ids, "a", { id: "c", side: "before" })).toEqual([
      "b",
      "a",
      "c",
      "d",
    ]);
    expect(reorderTabs(ids, "a", { id: "d", side: "after" })).toEqual([
      "b",
      "c",
      "d",
      "a",
    ]);
    expect(reorderTabs(ids, "d", { id: "a", side: "before" })).toEqual([
      "d",
      "a",
      "b",
      "c",
    ]);
    expect(reorderTabs(ids, "d", { id: "b", side: "after" })).toEqual([
      "a",
      "b",
      "d",
      "c",
    ]);
    expect(ids).toEqual(["a", "b", "c", "d"]);
  });

  it("keeps the order for unchanged or stale drop targets", () => {
    expect(reorderTabs(ids, "a", { id: "a", side: "after" })).toBe(ids);
    expect(reorderTabs(ids, "a", { id: "b", side: "before" })).toBe(ids);
    expect(reorderTabs(ids, "b", { id: "a", side: "after" })).toBe(ids);
    expect(reorderTabs(ids, "missing", { id: "b", side: "after" })).toBe(ids);
    expect(reorderTabs(ids, "b", { id: "missing", side: "before" })).toBe(ids);
    expect(reorderTabs([], "a", { id: "b", side: "before" })).toEqual([]);
  });
});
