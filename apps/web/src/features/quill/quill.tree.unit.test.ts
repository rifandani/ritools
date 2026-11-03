import { describe, expect, it } from "vitest";

import type { Entry } from "./quill";
import { dropParent, orderWith } from "./quill.tree";

const entry = (
  id: string,
  kind: Entry["kind"],
  parent: string | null = null,
  trash: string | null = null
): Entry => ({
  version: 1,
  id,
  parent,
  name: id,
  kind,
  revision: 0,
  trash,
});
const entries = [
  entry("abc", "folder"),
  entry("doc", "document", "abc"),
  entry("inner", "folder", "abc"),
  entry("deep", "document", "inner"),
  entry("loose", "document"),
  entry("other", "folder"),
  entry("gone", "folder", null, "gone"),
];

describe("dropParent", () => {
  it("moves an entry into the folder it is dropped on", () => {
    expect(
      dropParent(entries, new Set(["loose"]), { key: "abc", position: "on" })
    ).toBe("abc");
  });
  it("moves an entry into the parent of the row it is dropped next to", () => {
    expect(
      dropParent(entries, new Set(["loose"]), {
        key: "deep",
        position: "after",
      })
    ).toBe("inner");
    expect(
      dropParent(entries, new Set(["doc"]), {
        key: "loose",
        position: "before",
      })
    ).toBeNull();
  });
  it("rejects a drop on a document", () => {
    expect(
      dropParent(entries, new Set(["loose"]), { key: "doc", position: "on" })
    ).toBeUndefined();
  });
  it("rejects a drop that does not change the folder", () => {
    expect(
      dropParent(entries, new Set(["doc"]), { key: "abc", position: "on" })
    ).toBeUndefined();
    expect(
      dropParent(entries, new Set(["loose"]), {
        key: "other",
        position: "after",
      })
    ).toBeUndefined();
  });
  it("rejects a folder dropped into itself or its descendants", () => {
    expect(
      dropParent(entries, new Set(["abc"]), { key: "abc", position: "on" })
    ).toBeUndefined();
    expect(
      dropParent(entries, new Set(["abc"]), { key: "inner", position: "on" })
    ).toBeUndefined();
    expect(
      dropParent(entries, new Set(["abc"]), {
        key: "deep",
        position: "before",
      })
    ).toBeUndefined();
  });
  it("rejects a drop on a missing or trashed entry", () => {
    expect(
      dropParent(entries, new Set(["loose"]), { key: "gone", position: "on" })
    ).toBeUndefined();
    expect(
      dropParent(entries, new Set(["loose"]), { key: "none", position: "on" })
    ).toBeUndefined();
  });
});

describe("orderWith", () => {
  it("keeps the saved order and appends new ids", () => {
    expect(orderWith(["b", "a", "c"], ["a", "b"])).toEqual(["a", "b", "c"]);
  });
  it("drops ids that are gone", () => {
    expect(orderWith(["a"], ["a", "b"])).toEqual(["a"]);
  });
  it("places a sibling directly after the anchor", () => {
    expect(
      orderWith(["a", "b", "new"], ["a", "b"], {
        id: "new",
        anchor: "a",
        parent: null,
      })
    ).toEqual(["a", "new", "b"]);
  });
  it("places a new child first under its folder", () => {
    expect(
      orderWith(["folder", "old", "new"], ["folder", "old"], {
        id: "new",
        anchor: "folder",
        parent: "folder",
      })
    ).toEqual(["new", "folder", "old"]);
  });
  it("appends when the anchor is missing", () => {
    expect(
      orderWith(["a", "new"], ["a"], {
        id: "new",
        anchor: null,
        parent: null,
      })
    ).toEqual(["a", "new"]);
  });
  it("keeps the same array when the order does not change", () => {
    const previous = ["a", "new", "b"];
    expect(
      orderWith(["a", "b", "new"], previous, {
        id: "new",
        anchor: "a",
        parent: null,
      })
    ).toBe(previous);
  });
});
