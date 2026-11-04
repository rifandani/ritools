/* oxlint-disable eslint/complexity -- The renderer exhaustively maps the supported Markdown node kinds to inert React elements. */
import { useAtomSet } from "@effect/atom-react";
import { createHighlighter } from "@tanstack/highlight/core";
import { js } from "@tanstack/highlight/languages/js";
import { json } from "@tanstack/highlight/languages/json";
import { python } from "@tanstack/highlight/languages/python";
import { shell } from "@tanstack/highlight/languages/shell";
import { ts } from "@tanstack/highlight/languages/ts";
import type { JSONContent } from "@tiptap/core";
import { Fragment, useEffect, useState } from "react";
import type { ReactNode } from "react";

import { Button } from "@/core/components/ui/button";
import { useTranslation } from "@/features/i18n/use-translation";

import { quillAtoms } from "../quill.atoms";
import { figureKey } from "../quill.render";
import type { RenderedDocument } from "../quill.render";

const highlighter = createHighlighter({
  languages: [js, ts, json, python, shell],
});
const Code = ({
  source,
  language,
}: {
  readonly source: string;
  readonly language: string;
}) => {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);
  return (
    <div className="quill-code">
      <div className="border-rule flex items-center justify-between gap-2 border-b-2 p-2">
        <span className="font-mono text-xs">{language || "code"}</span>
        <Button
          size="xs"
          intent="outline"
          onPress={async () => {
            try {
              await navigator.clipboard.writeText(source);
              setCopied(true);
            } catch {
              setCopied(false);
            }
          }}
        >
          {t(copied ? "quillCopied" : "quillCopy")}
        </Button>
      </div>
      <pre>
        <code>
          {highlighter
            .tokenize(source, { lang: language })
            .tokens.map((token, index) => (
              <span
                className={
                  token.className ? `quill-token-${token.className}` : undefined
                }
                key={index}
              >
                {token.value}
              </span>
            ))}
        </code>
      </pre>
    </div>
  );
};
const QuillReader = ({
  source,
  onFollow,
}: {
  readonly source: string;
  readonly onFollow: (href: string) => void;
}) => {
  const { t } = useTranslation();
  const render = useAtomSet(quillAtoms.rendered, { mode: "promise" });
  const [document, setDocument] = useState<RenderedDocument | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let current = true;
    const load = async () => {
      try {
        const next = await render(source);
        if (current) {
          setDocument(next);
          setFailed(!next);
        }
      } catch {
        if (current) {
          setFailed(true);
        }
      }
    };
    void load();
    return () => {
      current = false;
    };
  }, [source, render]);
  const node = (item: JSONContent, key: string): ReactNode => {
    const children = (item.content ?? []).map((child, index) =>
      node(child, `${key}-${index}`)
    );
    const kind =
      item.type === "inlineMath" || item.type === "blockMath"
        ? "math"
        : item.type === "codeBlock" && item.attrs?.language === "mermaid"
          ? "mermaid"
          : null;
    if (kind) {
      const text =
        kind === "math"
          ? String(item.attrs?.latex ?? "")
          : (item.content ?? []).map((child) => child.text ?? "").join("");
      const figure = document?.figures.get(figureKey(kind, text));
      const image =
        figure?.url && !figure.error ? (
          <img
            alt={`${kind}: ${text}`}
            className="max-h-[36rem] max-w-full object-contain"
            src={figure.url}
          />
        ) : (
          <span className="flex flex-col gap-2">
            <output>{t("quillRenderFailed")}</output>
            <code>{text}</code>
          </span>
        );
      return item.type === "inlineMath" ? (
        <span className="inline-block align-middle" key={key}>
          {image}
        </span>
      ) : (
        <figure key={key}>
          {image}
          <figcaption>
            <code>{text}</code>
          </figcaption>
        </figure>
      );
    }
    if (item.type === "text") {
      let text: ReactNode = item.text ?? "";
      for (const mark of item.marks ?? []) {
        if (mark.type === "bold") {
          text = <strong>{text}</strong>;
        }
        if (mark.type === "italic") {
          text = <em>{text}</em>;
        }
        if (mark.type === "strike") {
          text = <s>{text}</s>;
        }
        if (mark.type === "code") {
          text = <code>{text}</code>;
        }
        if (mark.type === "link") {
          const href = String(mark.attrs?.href ?? "");
          if (/^(?:https?:|mailto:)/iu.test(href)) {
            text = (
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                title={t("quillExternalLink")}
              >
                {text}
              </a>
            );
          } else if (!/^[a-z]+:/iu.test(href)) {
            text = (
              <button
                className="text-primary-ink cursor-pointer underline underline-offset-4"
                onClick={() => onFollow(href)}
                type="button"
              >
                {text}
              </button>
            );
          }
        }
      }
      return <Fragment key={key}>{text}</Fragment>;
    }
    switch (item.type) {
      case "alignedBlock": {
        const align = item.attrs?.align;
        return (
          <div
            key={key}
            dir={item.attrs?.rtl ? "rtl" : undefined}
            style={{
              textAlign:
                align === "left" || align === "center" || align === "right"
                  ? align
                  : undefined,
            }}
          >
            {children}
          </div>
        );
      }
      case "paragraph": {
        return <p key={key}>{children}</p>;
      }
      case "heading": {
        const level = Number(item.attrs?.level ?? 1);
        return level === 1 ? (
          <h1 key={key}>{children}</h1>
        ) : level === 2 ? (
          <h2 key={key}>{children}</h2>
        ) : level === 3 ? (
          <h3 key={key}>{children}</h3>
        ) : (
          <h4 key={key}>{children}</h4>
        );
      }
      case "bulletList": {
        return <ul key={key}>{children}</ul>;
      }
      case "orderedList": {
        return (
          <ol start={Number(item.attrs?.start ?? 1)} key={key}>
            {children}
          </ol>
        );
      }
      case "taskList": {
        return (
          <ul className="quill-tasks" key={key}>
            {children}
          </ul>
        );
      }
      case "taskItem": {
        return (
          <li key={key}>
            <input
              type="checkbox"
              checked={!!item.attrs?.checked}
              readOnly
              aria-label={String(
                (item.content ?? [])
                  .flatMap((child) =>
                    (child.content ?? []).map((part) => part.text ?? "")
                  )
                  .join("")
              )}
            />
            {children}
          </li>
        );
      }
      case "listItem": {
        return <li key={key}>{children}</li>;
      }
      case "blockquote": {
        return <blockquote key={key}>{children}</blockquote>;
      }
      case "hardBreak": {
        return <br key={key} />;
      }
      case "horizontalRule": {
        return <hr key={key} />;
      }
      case "codeBlock": {
        return (
          <Code
            key={key}
            language={String(item.attrs?.language ?? "")}
            source={(item.content ?? [])
              .map((child) => child.text ?? "")
              .join("")}
          />
        );
      }
      case "table": {
        return (
          <div className="overflow-x-auto" key={key}>
            <table>
              <tbody>{children}</tbody>
            </table>
          </div>
        );
      }
      case "tableRow": {
        return <tr key={key}>{children}</tr>;
      }
      case "tableHeader": {
        return <th key={key}>{children}</th>;
      }
      case "tableCell": {
        return <td key={key}>{children}</td>;
      }
      case "image": {
        return (
          <span
            className="border-rule inline-block border-2 border-dashed p-3"
            key={key}
          >
            {t("quillImageReference")}:{" "}
            <code>
              ![{String(item.attrs?.alt ?? "")}]({String(item.attrs?.src ?? "")}
              )
            </code>
          </span>
        );
      }
      default: {
        return <Fragment key={key}>{children}</Fragment>;
      }
    }
  };
  return (
    <article
      aria-label={t("quillRead")}
      className="quill-prose p-4 sm:p-8"
      aria-busy={!document && !failed}
    >
      {document ? (
        node(document.model, "root")
      ) : failed ? (
        <output>{t("quillLoadFailed")}</output>
      ) : null}
    </article>
  );
};

export default QuillReader;
