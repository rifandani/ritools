/* oxlint-disable eslint/complexity -- Each writer handles the complete supported Markdown node union. */
/* oxlint-disable anti-slop/no-runtime-typeof -- JSONContent attributes are SDK values; the writers narrow each attribute before using it. */
import type { JSONContent } from "@tiptap/core";
import { Effect } from "effect";
import type { Content, ContentText as Text } from "pdfmake/interfaces";

import { QuillError } from "./quill";
import type { Format, Output } from "./quill";
import { browserAssets } from "./quill.export.browser";
import type { Figure } from "./quill.figures";
import { parse } from "./quill.markdown";

export interface FontFaces {
  readonly normal: Uint8Array;
  readonly bold: Uint8Array;
  readonly italics: Uint8Array;
  readonly bolditalics: Uint8Array;
}
export interface ExportAssets {
  readonly fonts?: () => Effect.Effect<FontFaces, QuillError>;
  readonly font: () => Effect.Effect<Uint8Array, QuillError>;
  readonly figure: (
    kind: "math" | "mermaid",
    source: string,
    display: boolean
  ) => Effect.Effect<Figure, QuillError>;
}

const base64 = (bytes: Uint8Array) => {
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCodePoint(byte);
  }
  return btoa(binary);
};
// Only code block text reaches this visitor; prose is written by inline().
const childrenOf = (node: JSONContent): readonly JSONContent[] =>
  node.content ?? [];
const textOf = (node: JSONContent): string =>
  node.text ?? childrenOf(node).map(textOf).join("");
const safeLink = (href: string) => /^(?:https?:|mailto:)/iu.test(href);
const numberAttr = (node: JSONContent, key: string, fallback: number) =>
  typeof node.attrs?.[key] === "number" ? node.attrs[key] : fallback;
const stringAttr = (node: JSONContent, key: string) =>
  typeof node.attrs?.[key] === "string" ? node.attrs[key] : "";
const outputName = (name: string, format: string) =>
  `${name.replace(/\.(?:md|markdown)$/iu, "")}.${format}`;
const exportFailure = () => new QuillError({ reason: "export" });
const writeDocx = (
  model: JSONContent,
  title: string,
  figures: ReadonlyMap<JSONContent, Figure>,
  paper: "A4" | "LETTER"
) =>
  Effect.tryPromise({
    try: async () => {
      const D = await import("docx");
      type Inline =
        | InstanceType<typeof D.TextRun>
        | InstanceType<typeof D.ExternalHyperlink>
        | InstanceType<typeof D.ImageRun>;
      const figureRun = (figure: Figure): Inline =>
        figure.error || !figure.png
          ? new D.TextRun({
              text: `[${figure.kind}: ${figure.source}]`,
              font: "Courier New",
            })
          : new D.ImageRun({
              type: "png",
              data: figure.png,
              transformation: {
                width:
                  figure.width *
                  Math.min(1, 560 / figure.width, 700 / figure.height),
                height:
                  figure.height *
                  Math.min(1, 560 / figure.width, 700 / figure.height),
              },
              altText: {
                title: figure.kind,
                description: figure.source,
                name: figure.kind,
              },
            });
      // oxlint-disable-next-line unicorn/consistent-function-scoping -- This recursive visitor uses the frozen export figure index.
      const inline = (nodes: readonly JSONContent[]): Inline[] =>
        nodes.flatMap((node): Inline[] => {
          const figure = figures.get(node);
          if (figure) {
            return [figureRun(figure)];
          }
          if (node.type === "image") {
            return [
              new D.TextRun({
                text: `![${stringAttr(node, "alt")}](${stringAttr(node, "src")})`,
              }),
            ];
          }
          if (node.type === "hardBreak") {
            return [new D.TextRun({ break: 1 })];
          }
          if (node.type !== "text") {
            return inline(childrenOf(node));
          }
          const run = new D.TextRun({
            text: node.text ?? "",
            bold: node.marks?.some((mark) => mark.type === "bold"),
            italics: node.marks?.some((mark) => mark.type === "italic"),
            strike: node.marks?.some((mark) => mark.type === "strike"),
            font: node.marks?.some((mark) => mark.type === "code")
              ? "Courier New"
              : undefined,
          });
          const href = node.marks?.find((mark) => mark.type === "link")?.attrs
            ?.href;
          return [
            typeof href === "string" && safeLink(href)
              ? new D.ExternalHyperlink({ children: [run], link: href })
              : run,
          ];
        });
      const listReferences = new Map<JSONContent, string>();
      const collectLists = (node: JSONContent) => {
        if (node.type === "orderedList") {
          listReferences.set(node, `list-${listReferences.size}`);
        }
        for (const child of childrenOf(node)) {
          collectLists(child);
        }
      };
      collectLists(model);
      const blocks = (
        nodes: readonly JSONContent[],
        depth = 0,
        list: "bullet" | "ordered" | "task" | null = null,
        reference = "",
        quote = false
      ): (InstanceType<typeof D.Paragraph> | InstanceType<typeof D.Table>)[] =>
        nodes.flatMap((node) => {
          const figure = figures.get(node);
          if (figure) {
            return [
              new D.Paragraph({
                children: [figureRun(figure)],
                spacing: { after: 180 },
              }),
              new D.Paragraph({
                text: `${figure.kind}: ${figure.source}`,
                style: "Caption",
              }),
            ];
          }
          if (
            ["bulletList", "orderedList", "taskList"].includes(node.type ?? "")
          ) {
            return blocks(
              childrenOf(node),
              depth,
              node.type === "orderedList"
                ? "ordered"
                : node.type === "taskList"
                  ? "task"
                  : "bullet",
              listReferences.get(node) ?? "",
              quote
            );
          }
          if (["listItem", "taskItem"].includes(node.type ?? "")) {
            const [first, ...rest] = childrenOf(node);
            return [
              new D.Paragraph({
                children: [
                  ...(list === "task"
                    ? [
                        new D.TextRun({
                          text: node.attrs?.checked ? "[x] " : "[ ] ",
                        }),
                      ]
                    : []),
                  ...inline(first?.content ?? []),
                ],
                ...(list === "ordered"
                  ? { numbering: { reference, level: Math.min(8, depth) } }
                  : list === "bullet"
                    ? { bullet: { level: Math.min(8, depth) } }
                    : {}),
                indent: quote ? { left: 540 } : undefined,
              }),
              ...blocks(rest, depth + 1, null, "", quote),
            ];
          }
          if (node.type === "image") {
            return [new D.Paragraph({ children: inline([node]) })];
          }
          if (node.type === "blockquote") {
            return blocks(childrenOf(node), depth, null, "", true);
          }
          if (node.type === "table") {
            return [
              new D.Table({
                width: { size: 100, type: D.WidthType.PERCENTAGE },
                rows: childrenOf(node).map(
                  (row) =>
                    new D.TableRow({
                      tableHeader: row.content?.every(
                        (cell) => cell.type === "tableHeader"
                      ),
                      children: childrenOf(row).map(
                        (cell) =>
                          new D.TableCell({
                            children: blocks(childrenOf(cell)),
                          })
                      ),
                    })
                ),
              }),
            ];
          }
          if (node.type === "codeBlock") {
            return [
              new D.Paragraph({
                text: stringAttr(node, "language") || "code",
                style: "Caption",
              }),
              ...textOf(node)
                .split("\n")
                .map(
                  (line) =>
                    new D.Paragraph({
                      children: [
                        new D.TextRun({
                          text: line || " ",
                          font: "Courier New",
                          size: 18,
                        }),
                      ],
                      spacing: { after: 0 },
                    })
                ),
            ];
          }
          if (node.type === "horizontalRule") {
            return [
              new D.Paragraph({
                border: {
                  bottom: {
                    style: D.BorderStyle.SINGLE,
                    size: 6,
                    color: "777777",
                  },
                },
              }),
            ];
          }
          const heading = [
            D.HeadingLevel.HEADING_1,
            D.HeadingLevel.HEADING_2,
            D.HeadingLevel.HEADING_3,
            D.HeadingLevel.HEADING_4,
            D.HeadingLevel.HEADING_5,
            D.HeadingLevel.HEADING_6,
          ][numberAttr(node, "level", 1) - 1];
          return [
            new D.Paragraph({
              children: inline(childrenOf(node)),
              heading: node.type === "heading" ? heading : undefined,
              indent: quote ? { left: 540 } : undefined,
              spacing: { after: 160 },
            }),
          ];
        });
      const document = new D.Document({
        title,
        creator: "Quill",
        numbering: {
          config: [...listReferences].map(([node, reference]) => ({
            reference,
            levels: Array.from({ length: 9 }, (_, level) => ({
              level,
              start: numberAttr(node, "start", 1),
              format: D.LevelFormat.DECIMAL,
              text: `%${level + 1}.`,
              alignment: D.AlignmentType.START,
            })),
          })),
        },
        sections: [
          {
            properties: {
              page: {
                size:
                  paper === "LETTER"
                    ? { width: 12_240, height: 15_840 }
                    : { width: 11_906, height: 16_838 },
                margin: { top: 900, bottom: 900, left: 900, right: 900 },
              },
            },
            footers: {
              default: new D.Footer({
                children: [
                  new D.Paragraph({
                    alignment: D.AlignmentType.CENTER,
                    children: [
                      new D.TextRun({ children: [D.PageNumber.CURRENT] }),
                    ],
                  }),
                ],
              }),
            },
            children: blocks(childrenOf(model)),
          },
        ],
      });
      return new Uint8Array(await D.Packer.toArrayBuffer(document));
    },
    catch: exportFailure,
  });
const allText = (
  node: JSONContent,
  figures: ReadonlyMap<JSONContent, Figure>
): string =>
  [
    node.text ?? "",
    node.type === "image"
      ? `![${stringAttr(node, "alt")}](${stringAttr(node, "src")})`
      : "",
    figures.get(node)?.source ?? "",
    node.type === "codeBlock" ? stringAttr(node, "language") : "",
    ...childrenOf(node).map((child) => allText(child, figures)),
  ].join("");
const writePdf = (
  model: JSONContent,
  title: string,
  figures: ReadonlyMap<JSONContent, Figure>,
  paper: "A4" | "LETTER",
  assets: ExportAssets
) =>
  Effect.gen(function* () {
    const faces = assets.fonts
      ? yield* assets.fonts()
      : yield* assets.font().pipe(
          Effect.map((font): FontFaces => ({
            normal: font,
            bold: font,
            italics: font,
            bolditalics: font,
          }))
        );
    const { readPdfFont } = yield* Effect.promise(
      () => import("@/features/tabular/tabular.pdf.metrics")
    );
    const coverage = yield* Effect.try({
      try: () => Object.values(faces).map((font) => readPdfFont(font).glyphs),
      catch: exportFailure,
    });
    // Check every source and label before pdfmake can substitute missing glyphs.
    if (
      [...(title + allText(model, figures))].some(
        (char) =>
          !/\s/u.test(char) &&
          coverage.some((glyphs) => !glyphs.has(char.codePointAt(0) ?? 0))
      )
    ) {
      return yield* new QuillError({ reason: "unsupported" });
    }
    return yield* Effect.tryPromise({
      try: async () => {
        const { default: pdfMake } = await import("pdfmake/build/pdfmake");
        pdfMake.addVirtualFileSystem(
          Object.fromEntries(
            Object.entries(faces).map(([style, bytes]) => [
              `quill-${style}.ttf`,
              base64(bytes),
            ])
          )
        );
        pdfMake.addFonts({
          Quill: {
            normal: "quill-normal.ttf",
            bold: "quill-bold.ttf",
            italics: "quill-italics.ttf",
            bolditalics: "quill-bolditalics.ttf",
          },
        });
        // oxlint-disable-next-line unicorn/consistent-function-scoping -- This recursive visitor uses the frozen export figure index.
        const inline = (nodes: readonly JSONContent[]): Content[] =>
          nodes.map((node): Content => {
            const figure = figures.get(node);
            if (figure) {
              return figure.error || !figure.png
                ? { text: `[${figure.kind}: ${figure.source}]`, fontSize: 9 }
                : {
                    image: `data:image/png;base64,${base64(figure.png)}`,
                    fit: node.type === "inlineMath" ? [160, 40] : [480, 600],
                  };
            }
            if (node.type === "image") {
              return {
                text: `![${stringAttr(node, "alt")}](${stringAttr(node, "src")})`,
                italics: true,
              };
            }
            const href = node.marks?.find((mark) => mark.type === "link")?.attrs
              ?.href;
            const run: Text = {
              text: node.type === "hardBreak" ? "\n" : (node.text ?? ""),
              bold: node.marks?.some((mark) => mark.type === "bold"),
              italics: node.marks?.some((mark) => mark.type === "italic"),
              decoration: node.marks?.some((mark) => mark.type === "strike")
                ? "lineThrough"
                : undefined,
            };
            if (typeof href === "string" && safeLink(href)) {
              run.link = href;
            }
            return run;
          });
        const blocks = (nodes: readonly JSONContent[]): Content[] =>
          nodes.map((node): Content => {
            const figure = figures.get(node);
            if (figure) {
              return figure.error || !figure.png
                ? {
                    stack: [
                      { text: `${figure.kind} — source`, bold: true },
                      { text: figure.source, fontSize: 9 },
                    ],
                    margin: [0, 8, 0, 8],
                  }
                : {
                    stack: [
                      {
                        image: `data:image/png;base64,${base64(figure.png)}`,
                        fit: [480, 580],
                      },
                      { text: `${figure.kind}: ${figure.source}`, fontSize: 9 },
                    ],
                    margin: [0, 8, 0, 8],
                  };
            }
            if (node.type === "taskList") {
              return {
                ul: childrenOf(node).map((child) => {
                  const [first, ...rest] = childrenOf(child);
                  return {
                    stack: blocks([
                      {
                        type: "paragraph",
                        content: [
                          {
                            type: "text",
                            text: child.attrs?.checked ? "[x] " : "[ ] ",
                          },
                          ...(first?.content ?? []),
                        ],
                      },
                      ...rest,
                    ]),
                  };
                }),
                margin: [0, 4, 0, 8],
              };
            }
            if (node.type === "bulletList") {
              return {
                ul: childrenOf(node).map((child) => ({
                  stack: blocks(childrenOf(child)),
                })),
                margin: [0, 4, 0, 8],
              };
            }
            if (node.type === "orderedList") {
              return {
                ol: childrenOf(node).map((child) => ({
                  stack: blocks(childrenOf(child)),
                })),
                start: numberAttr(node, "start", 1),
                margin: [0, 4, 0, 8],
              };
            }
            if (node.type === "blockquote") {
              return {
                stack: blocks(childrenOf(node)),
                margin: [16, 6, 0, 8],
              };
            }
            if (node.type === "table") {
              return {
                table: {
                  headerRows: 1,
                  widths: (node.content?.[0]?.content ?? []).map(() => "*"),
                  body: childrenOf(node).map((row) =>
                    childrenOf(row).map((cell) => ({
                      stack: blocks(childrenOf(cell)),
                    }))
                  ),
                },
                margin: [0, 8, 0, 12],
              };
            }
            if (node.type === "codeBlock") {
              return {
                stack: [
                  {
                    text: stringAttr(node, "language") || "code",
                    bold: true,
                    fontSize: 9,
                  },
                  {
                    text: textOf(node),
                    fontSize: 9,
                    preserveLeadingSpaces: true,
                  },
                ],
                margin: [0, 8, 0, 12],
              };
            }
            if (node.type === "horizontalRule") {
              return {
                canvas: [
                  {
                    type: "line",
                    x1: 0,
                    y1: 4,
                    x2: 480,
                    y2: 4,
                    lineWidth: 0.5,
                  },
                ],
                margin: [0, 6, 0, 10],
              };
            }
            const content = inline(childrenOf(node));
            // Inline figures must occupy their own stack item, not disappear in a text run.
            if (childrenOf(node).some((child) => figures.has(child))) {
              return { stack: content, margin: [0, 4, 0, 8] };
            }
            return {
              text: content,
              fontSize:
                node.type === "heading"
                  ? Math.max(12, 26 - numberAttr(node, "level", 1) * 2)
                  : 11,
              bold: node.type === "heading",
              margin: [0, node.type === "heading" ? 12 : 0, 0, 8],
            };
          });
        const pdf = pdfMake.createPdf({
          info: { title, creator: "Quill" },
          pageSize: paper,
          pageMargins: [42, 42, 42, 48],
          defaultStyle: { font: "Quill", fontSize: 11, lineHeight: 1.25 },
          footer: (page, total) => ({
            text: `${page} / ${total}`,
            alignment: "center",
            fontSize: 9,
            margin: [0, 14, 0, 0],
          }),
          content: blocks(childrenOf(model)),
        });
        return new Uint8Array(await pdf.getBuffer());
      },
      catch: exportFailure,
    });
  });
// Loaded on demand by the Quill service through Effect.tryPromise.
// fallow-ignore-next-line unused-export
export const writeDocument = (
  snapshot: { readonly name: string; readonly source: string },
  format: Exclude<Format, "md">,
  paper: "A4" | "LETTER",
  assets: ExportAssets = browserAssets
): Effect.Effect<Output, QuillError> =>
  Effect.gen(function* () {
    const model = parse(snapshot.source);
    const figures = new Map<JSONContent, Figure>();
    const warnings: string[] = [];
    const prepare = Effect.fn("Quill.exportFigures")(function* (
      node: JSONContent
    ): Effect.fn.Return<void, QuillError> {
      if (
        node.type === "inlineMath" ||
        node.type === "blockMath" ||
        (node.type === "codeBlock" &&
          stringAttr(node, "language").toLowerCase() === "mermaid")
      ) {
        const kind = node.type === "codeBlock" ? "mermaid" : "math";
        const source =
          kind === "mermaid" ? textOf(node) : stringAttr(node, "latex");
        const rendered = yield* assets.figure(
          kind,
          source,
          node.type !== "inlineMath"
        );
        figures.set(node, rendered);
        if (rendered.error) {
          warnings.push(`${kind}: ${source}`);
        }
      }
      for (const child of childrenOf(node)) {
        yield* prepare(child);
      }
    });
    yield* prepare(model);
    const write =
      format === "docx"
        ? writeDocx(model, snapshot.name, figures, paper)
        : writePdf(model, snapshot.name, figures, paper, assets);
    const bytes = yield* write;
    return {
      name: outputName(snapshot.name, format),
      bytes,
      mime:
        format === "docx"
          ? "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          : "application/pdf",
      warnings,
    };
  });
