import type { JSONContent } from "@tiptap/core";
import { expect, it } from "vitest";

import type { Entry } from "./quill";
import {
  headingIds,
  isDocumentLink,
  isExternalLink,
  resolveDocumentLink,
} from "./quill.links";

const entry = (
  id: string,
  name: string,
  parent: string | null = null,
  kind: Entry["kind"] = "document"
): Entry => ({
  version: 1,
  id,
  name,
  parent,
  kind,
  revision: 0,
  trash: null,
});
const entries = [
  entry("a", "a.md"),
  entry("b", "b.md"),
  entry("notes", "notes", null, "folder"),
  entry("nested-a", "a.md", "notes"),
  entry("nested-b", "b.md", "notes"),
  entry("deep", "deep", "notes", "folder"),
  entry("deep-a", "a.md", "deep"),
  entry("guides", "guides", null, "folder"),
  entry("guide-b", "b.md", "guides"),
  entry("special", "café #100%.markdown"),
  entry("literal-percent", "%20.md"),
  entry("duplicate", "b (2).md"),
];

it.each([
  ["a", "b.md", "b", null],
  ["a", "./b.md", "b", null],
  ["a", "notes/b.md", "nested-b", null],
  ["nested-a", "b.md", "nested-b", null],
  ["nested-a", "../b.md", "b", null],
  ["deep-a", "../../guides/b.md", "guide-b", null],
  ["deep-a", "/b.md", "b", null],
  ["nested-a", "../guides/b.md", "guide-b", null],
  ["a", "b.md?view=read#installation", "b", "installation"],
  ["a", "#installation", "a", "installation"],
  ["a", "#caf%C3%A9", "a", "café"],
  ["a", "#heading?text", "a", "heading?text"],
  ["a", "", "a", null],
  ["a", "#", "a", ""],
  ["a", "?view=read", "a", null],
  ["a", "caf%C3%A9%20%23100%25.markdown", "special", null],
  ["a", "%2520.md", "literal-percent", null],
  ["a", "b%20(2).md", "duplicate", null],
] as const)(
  "resolves %s -> %s within the Library",
  (selected, href, id, fragment) => {
    expect(resolveDocumentLink(entries, selected, href)).toEqual({
      target: { id, fragment },
    });
  }
);

it.each([
  ["../b.md", "outside-root"],
  ["notes/../../b.md", "outside-root"],
  ["/%2e%2e/b.md", "outside-root"],
  ["B.md", "missing"],
  ["b", "missing"],
  ["missing.md", "missing"],
  ["notes", "folder"],
  ["notes/", "folder"],
  ["b.md/", "invalid"],
  ["%xx", "invalid"],
  ["b.md#%xx", "invalid"],
  ["notes%2fb.md", "invalid"],
  ["notes%5cb.md", "invalid"],
  ["%00.md", "invalid"],
  ["b.md#%00", "invalid"],
  ["b.md\n", "invalid"],
  ["https://example.org", "invalid"],
  ["file:///b.md", "invalid"],
  ["custom+scheme:b.md", "invalid"],
  ["//example.org/b.md", "invalid"],
] as const)("refuses %s with a specific reason", (href, reason) => {
  expect(resolveDocumentLink(entries, "a", href)).toEqual({ reason });
});

it("refuses missing, trashed, cyclic, and orphaned Library entries", () => {
  expect(resolveDocumentLink(entries, null, "b.md")).toEqual({
    reason: "invalid",
  });
  expect(resolveDocumentLink(entries, "notes", "b.md")).toEqual({
    reason: "invalid",
  });
  expect(resolveDocumentLink(entries, "missing", "b.md")).toEqual({
    reason: "invalid",
  });
  const trashed = entries.map((item) =>
    item.id === "notes" ? { ...item, trash: "now" } : item
  );
  expect(resolveDocumentLink(trashed, "a", "notes/b.md")).toEqual({
    reason: "missing",
  });
  expect(resolveDocumentLink(trashed, "nested-a", "../b.md")).toEqual({
    reason: "invalid",
  });
  const invalid = [
    entry("orphan", "orphan.md", "absent"),
    entry("cycle", "cycle", "cycle", "folder"),
    entry("child", "child.md", "cycle"),
    entry("bad-parent", "bad.md", "b"),
    { ...entry("trash", "trash.md"), trash: "now" },
  ];
  expect(
    resolveDocumentLink([...invalid, ...entries], "a", "b.md").target?.id
  ).toBe("b");
  for (const href of ["orphan.md", "cycle/child.md", "bad.md", "trash.md"]) {
    expect(resolveDocumentLink([...entries, ...invalid], "a", href)).toEqual({
      reason: "missing",
    });
  }
});

it("classifies external and internal destinations without accepting other URI schemes", () => {
  expect(isExternalLink("HTTPS://example.org")).toBe(true);
  expect(isExternalLink("mailto:person@example.org")).toBe(true);
  expect(isExternalLink("b.md")).toBe(false);
  expect(isDocumentLink("/b.md")).toBe(true);
  expect(isDocumentLink("#heading")).toBe(true);
  expect(isDocumentLink("custom+scheme:target")).toBe(false);
  expect(isDocumentLink("//example.org")).toBe(false);
});

const heading = (text: string): JSONContent => ({
  type: "heading",
  content: [{ type: "text", text }],
});
it("allocates heading fragments from text with Unicode and duplicate collisions", () => {
  const nodes = [
    heading(" Installation "),
    heading("Installation-1"),
    heading("Installation"),
    heading("Installation"),
    heading("?!"),
    heading(""),
    heading("Café & 文件_标题"),
    {
      type: "heading",
      content: [
        { type: "text", text: "Code", marks: [{ type: "code" }] },
        { type: "hardBreak" },
        { type: "image", attrs: { alt: "Diagram" } },
        { type: "text", text: " " },
        { type: "inlineMath", attrs: { latex: "x^2" } },
        { type: "unknown", content: [{ type: "text", text: " end" }] },
      ],
    },
  ];
  const ids = headingIds({
    type: "doc",
    content: [{ type: "alignedBlock", content: nodes }],
  });
  expect(nodes.map((node) => ids.get(node))).toEqual([
    "installation",
    "installation-1",
    "installation-2",
    "installation-3",
    "section",
    "section-1",
    "café-文件_标题",
    "code-diagram-x2-end",
  ]);
  expect(headingIds({ type: "doc" }).size).toBe(0);
});
