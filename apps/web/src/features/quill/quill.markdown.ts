import { Extension } from "@tiptap/core";
import type { JSONContent } from "@tiptap/core";
import { MarkdownManager } from "@tiptap/markdown";
import { Effect } from "effect";

import type { Compatibility } from "./quill";
import { alignmentOpening } from "./quill.alignment";
import { extensions } from "./quill.extensions";

const sourceBlock = (source: string, language = "markdown"): JSONContent => ({
  type: "codeBlock",
  attrs: { language },
  content: source ? [{ type: "text", text: source }] : [],
});
const manager = new MarkdownManager({
  extensions: extensions(),
  markedOptions: { gfm: true },
});

// Keep HTML as source before Tiptap can pass it to the browser's DOM parser.
const literalHtmlBlock = Extension.create({
  name: "literalHtmlBlock",
  markdownTokenName: "html",
  parseMarkdown: (token) => sourceBlock(token.raw ?? ""),
});
const literalHtmlInline = Extension.create({
  name: "literalHtmlInline",
  markdownTokenName: "literalHtmlInline",
  markdownTokenizer: {
    name: "literalHtmlInline",
    level: "inline",
    start: "<",
    tokenize: (source) => {
      const raw = manager.instance.Lexer.rules.inline.gfm.tag.exec(source)?.[0];
      return raw ? { type: "literalHtmlInline", raw } : undefined;
    },
  },
  parseMarkdown: (token) => ({
    type: "text",
    text: token.raw,
    marks: [{ type: "code" }],
  }),
});
manager.registerExtension(literalHtmlBlock);
manager.registerExtension(literalHtmlInline);
// Loaded on demand by the Quill service through Effect.tryPromise.
export const parse = (source: string) => manager.parse(source);
// Reading does not need a safe serialization round trip. Never save this model.
// Loaded on demand by the Quill service through Effect.tryPromise.
export const preview = (source: string): JSONContent => {
  try {
    const text = source.replace(/^\uFEFF/u, "");
    const frontmatter =
      /^---\r?\n(?:[\s\S]*?\r?\n)?(?:---|\.\.\.)(?:\r?\n|$)/u.exec(text)?.[0];
    const model = parse(text.slice(frontmatter?.length ?? 0));
    return frontmatter
      ? {
          ...model,
          content: [sourceBlock(frontmatter, "yaml"), ...(model.content ?? [])],
        }
      : model;
  } catch {
    return { type: "doc", content: [sourceBlock(source)] };
  }
};
const serialize = (model: JSONContent) => manager.serialize(model);
const semantic = (node: JSONContent): string =>
  JSON.stringify({
    type: node.type,
    text: node.text,
    attrs: Object.fromEntries(
      Object.entries(node.attrs ?? {})
        .filter(([, value]) => value !== null && value !== undefined)
        .toSorted(([a], [b]) => a.localeCompare(b))
    ),
    marks: (node.marks ?? []).map((mark) => semantic(mark)).toSorted(),
    content: (node.content ?? []).flatMap((child) =>
      child.type === "paragraph" && !child.content?.length
        ? []
        : [semantic(child)]
    ),
  });
const supportedTokens = new Set([
  "alignedBlock",
  "paragraph",
  "heading",
  "list",
  "list_item",
  "taskList",
  "taskItem",
  "checkbox",
  "blockquote",
  "code",
  "table",
  "hr",
  "space",
  "text",
  "escape",
  "strong",
  "em",
  "del",
  "link",
  "image",
  "br",
  "codespan",
  "inlineMath",
  "blockMath",
]);
type Token = ReturnType<typeof manager.instance.lexer>[number];
const tokenValues = (tokens: readonly Token[]): unknown[] =>
  tokens.flatMap((token): unknown[] => {
    if (token.type === "space") {
      return [];
    }
    if (token.type === "alignedBlock") {
      return [
        {
          type: token.type,
          align: token.align,
          rtl: token.rtl,
          content: tokenValues(token.tokens ?? []),
        },
      ];
    }
    if (token.type === "list" || token.type === "taskList") {
      return [
        {
          type: "list",
          ordered: token.ordered,
          start: token.ordered ? token.start : null,
          items: token.items.map(
            (item: {
              task?: boolean;
              checked?: boolean;
              tokens: readonly Token[];
            }) => ({
              task: item.task ?? false,
              checked: item.checked ?? false,
              content: tokenValues(item.tokens),
            })
          ),
        },
      ];
    }
    if (token.type === "table") {
      return [
        {
          type: "table",
          align: token.align,
          header: token.header.map((cell: { tokens: readonly Token[] }) =>
            tokenValues(cell.tokens)
          ),
          rows: token.rows.map((row: readonly { tokens: readonly Token[] }[]) =>
            row.map((cell) => tokenValues(cell.tokens))
          ),
        },
      ];
    }
    if (token.type === "code") {
      return [{ type: "code", language: token.lang ?? "", value: token.text }];
    }
    if (token.type === "inlineMath" || token.type === "blockMath") {
      return [{ type: token.type, value: token.latex }];
    }
    return [
      {
        type: token.type,
        depth: "depth" in token ? token.depth : null,
        href: "href" in token ? token.href : null,
        title: "title" in token ? (token.title ?? null) : null,
        content:
          "tokens" in token && token.tokens
            ? tokenValues(token.tokens)
            : "text" in token
              ? token.text
              : null,
      },
    ];
  });
// Loaded on demand by the Quill service through Effect.tryPromise.
export const inspect = (source: string) =>
  Effect.sync((): Compatibility => {
    try {
      const affected: string[] = [];
      const plain = source
        .replaceAll(
          /^(?<fence>`{3,}|~{3,})[^\n]*\n[\s\S]*?^\k<fence>[^\n]*$/gmu,
          ""
        )
        .replaceAll(/`[^`\n]*`/gu, "")
        .replaceAll(/\$\$[\s\S]*?\$\$|\$[^$\n]*\$/gu, "");
      if (/^---\r?\n/u.test(source)) {
        affected.push(
          source
            .split(/\r?\n/u)
            .slice(
              0,
              source
                .split(/\r?\n/u)
                .findIndex(
                  (line, index) => index > 0 && /^(?:---|\.\.\.)$/u.test(line)
                ) + 1
            )
            .join("\n") || source
        );
      }
      if (
        /<[!/?A-Za-z]|\{[^}]*\}|^\s*\[\^[^\]]+\]:|^\s*:::/mu.test(
          plain
            .split("\n")
            .filter(
              (line) =>
                !alignmentOpening.test(line.replace(/\r$/u, "")) &&
                line.trim() !== "</div>"
            )
            .join("\n")
        )
      ) {
        affected.push(plain);
      }
      const tokens = manager.instance.lexer(source);
      const visit = (items: readonly (typeof tokens)[number][]) => {
        for (const token of items) {
          if (!supportedTokens.has(token.type)) {
            affected.push(token.raw);
          }
          if ("tokens" in token && token.tokens) {
            visit(token.tokens);
          }
          if (token.type === "list" || token.type === "taskList") {
            for (const item of token.items) {
              visit(item.tokens);
            }
          }
          if (token.type === "table") {
            for (const cell of [...token.header, ...token.rows.flat()]) {
              visit(cell.tokens);
            }
          }
        }
      };
      visit(tokens);
      if (affected.length) {
        const fence = "`".repeat(
          Math.max(
            3,
            ...[...source.matchAll(/`+/gu)].map((match) => match[0].length + 1)
          )
        );
        return {
          safe: false,
          affected: [...new Set(affected)],
          converted: `${fence}markdown\n${source}\n${fence}\n`,
        };
      }
      const model = parse(source);
      const converted = serialize(model);
      if (
        semantic(model) !== semantic(parse(converted)) ||
        JSON.stringify(tokenValues(tokens)) !==
          JSON.stringify(tokenValues(manager.instance.lexer(converted)))
      ) {
        return { safe: false, affected: [source], converted: null };
      }
      return { safe: true, affected: [], converted };
    } catch {
      return { safe: false, affected: [source], converted: null };
    }
  });
