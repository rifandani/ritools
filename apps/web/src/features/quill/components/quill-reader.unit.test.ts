import type { JSONContent } from "@tiptap/core";
import { createElement, Fragment } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it, vi } from "vitest";

import type { Figure } from "../quill.figures";

vi.mock("@/features/i18n/use-translation", () => ({
  useTranslation: () => ({ locale: "en-US", t: (key: string) => key }),
}));

const { renderQuillNode } = await import("./quill-reader");
const { figureKey } = await import("../quill.render");

it("renders the supported Markdown node types as inert HTML", () => {
  const follow = vi.fn();
  const blockedHref = ["java", "script:alert(1)"].join("");
  const model: JSONContent = {
    type: "doc",
    content: [
      {
        type: "alignedBlock",
        attrs: { align: "center", rtl: true },
        content: [
          {
            type: "heading",
            attrs: { level: 2 },
            content: [{ type: "text", text: "Heading" }],
          },
        ],
      },
      {
        type: "paragraph",
        content: [
          {
            type: "text",
            text: "Marked",
            marks: [
              { type: "bold" },
              { type: "italic" },
              { type: "strike" },
              { type: "code" },
              { type: "link", attrs: { href: "https://example.org" } },
            ],
          },
          {
            type: "text",
            text: "Local",
            marks: [{ type: "link", attrs: { href: "guide.md" } }],
          },
          {
            type: "text",
            text: "Blocked",
            marks: [{ type: "link", attrs: { href: blockedHref } }],
          },
        ],
      },
      { type: "bulletList", content: [{ type: "listItem", content: [] }] },
      {
        type: "orderedList",
        attrs: { start: 3 },
        content: [{ type: "listItem", content: [] }],
      },
      {
        type: "taskList",
        content: [
          {
            type: "taskItem",
            attrs: { checked: true },
            content: [
              { type: "paragraph", content: [{ type: "text", text: "Done" }] },
            ],
          },
        ],
      },
      { type: "blockquote", content: [{ type: "paragraph", content: [] }] },
      { type: "hardBreak" },
      { type: "horizontalRule" },
      {
        type: "codeBlock",
        attrs: { language: "js" },
        content: [{ type: "text", text: "const answer = 42;" }],
      },
      {
        type: "table",
        content: [
          {
            type: "tableRow",
            content: [
              {
                type: "tableHeader",
                content: [{ type: "text", text: "Name" }],
              },
              { type: "tableCell", content: [{ type: "text", text: "Value" }] },
            ],
          },
        ],
      },
      { type: "image", attrs: { alt: "diagram", src: "diagram.png" } },
      { type: "unknown", content: [{ type: "text", text: "Fallback" }] },
    ],
  };
  const figures = new Map<string, Figure>([
    [
      figureKey("math", "x"),
      { kind: "math", source: "x", url: null, error: true },
    ],
    [
      figureKey("mermaid", "graph TD"),
      { kind: "mermaid", source: "graph TD", url: "/figure.svg", error: false },
    ],
  ]);
  model.content?.push(
    { type: "inlineMath", attrs: { latex: "x" } },
    { type: "blockMath", attrs: { latex: "x" } },
    {
      type: "codeBlock",
      attrs: { language: "mermaid" },
      content: [{ type: "text", text: "graph TD" }],
    }
  );

  const markup = renderToStaticMarkup(
    createElement(
      Fragment,
      null,
      renderQuillNode(model, "root", figures, (key) => key, follow)
    )
  );

  expect(markup).toContain('dir="rtl"');
  expect(markup).toContain('id="heading"');
  expect(markup).toContain(
    'tabindex="-1" data-quill-heading="true">Heading</h2>'
  );
  expect(markup).toContain('href="https://example.org"');
  expect(markup).toContain("<button");
  expect(markup).not.toContain(blockedHref);
  expect(markup).toContain('type="checkbox"');
  expect(markup).toContain('start="3"');
  expect(markup).toContain("<table>");
  expect(markup).toContain("quillImageReference");
  expect(markup).toContain("quillRenderFailed");
  expect(markup).toContain('src="/figure.svg"');
  expect(markup).toContain("Fallback");
});
