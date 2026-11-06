import type { JSONContent } from "@tiptap/core";

import type { Entry, LinkFailure, LinkTarget } from "./quill";

export const isExternalLink = (href: string) =>
  /^(?:https?:|mailto:)/iu.test(href);
export const isDocumentLink = (href: string) =>
  !/^[a-z][a-z\d+.-]*:/iu.test(href) && !href.startsWith("//");

type Resolution =
  | { readonly target: LinkTarget; readonly reason?: never }
  | { readonly reason: LinkFailure["reason"]; readonly target?: never };

const linkParts = (href: string) => {
  if (!isDocumentLink(href) || /\p{Cc}/u.test(href)) {
    return null;
  }
  const hash = href.indexOf("#");
  const rawPath =
    (hash === -1 ? href : href.slice(0, hash)).split("?")[0] ?? "";
  try {
    const fragment =
      hash === -1 ? null : decodeURIComponent(href.slice(hash + 1));
    const segments = rawPath.split("/").map((part) => decodeURIComponent(part));
    if (
      segments.some((part) => /[/\\\p{Cc}]/u.test(part)) ||
      (fragment !== null && /\p{Cc}/u.test(fragment))
    ) {
      return null;
    }
    return { rawPath, fragment, segments };
  } catch {
    return null;
  }
};

/** Resolve against current Library names, without filesystem or network access. */
export const resolveDocumentLink = (
  entries: readonly Entry[],
  selected: string | null,
  href: string
): Resolution => {
  const parsed = linkParts(href);
  if (!parsed) {
    return { reason: "invalid" };
  }
  const byId = new Map(entries.map((entry) => [entry.id, entry]));
  const pathOf = (entry: Entry): readonly string[] | null => {
    const path: string[] = [];
    const seen = new Set<string>();
    let current: Entry | undefined = entry;
    while (current) {
      if (current.trash || seen.has(current.id)) {
        return null;
      }
      seen.add(current.id);
      path.unshift(current.name);
      if (current.parent === null) {
        return path;
      }
      current = byId.get(current.parent);
      if (current?.kind !== "folder") {
        return null;
      }
    }
    return null;
  };
  const source = selected ? byId.get(selected) : undefined;
  const sourcePath = source?.kind === "document" ? pathOf(source) : null;
  if (!sourcePath || !source) {
    return { reason: "invalid" };
  }
  const { rawPath, fragment, segments } = parsed;
  if (!rawPath) {
    return { target: { id: source.id, fragment } };
  }
  const path = rawPath.startsWith("/") ? [] : sourcePath.slice(0, -1);
  for (const segment of segments) {
    if (segment === "..") {
      if (!path.length) {
        return { reason: "outside-root" };
      }
      path.pop();
    } else if (segment && segment !== ".") {
      path.push(segment);
    }
  }
  const target = entries.find((entry) => {
    const candidate = pathOf(entry);
    return (
      candidate?.length === path.length &&
      candidate.every((part, index) => part === path[index])
    );
  });
  if (!target) {
    return { reason: "missing" };
  }
  if (target.kind === "folder") {
    return { reason: "folder" };
  }
  if (rawPath.endsWith("/")) {
    return { reason: "invalid" };
  }
  return { target: { id: target.id, fragment } };
};

const headingText = (node: JSONContent): string => {
  if (node.type === "image") {
    return String(node.attrs?.alt ?? "");
  }
  if (node.type === "inlineMath") {
    return String(node.attrs?.latex ?? "");
  }
  if (node.type === "hardBreak") {
    return " ";
  }
  return node.text ?? (node.content ?? []).map(headingText).join("");
};

/** Node identity keeps IDs scoped to one rendered model and one reader. */
export const headingIds = (
  model: JSONContent
): ReadonlyMap<JSONContent, string> => {
  const ids = new Map<JSONContent, string>();
  const used = new Set<string>();
  const visit = (node: JSONContent) => {
    if (node.type === "heading") {
      const stem =
        headingText(node)
          .trim()
          .toLowerCase()
          .replaceAll(/[^\p{L}\p{M}\p{N}\s_-]/gu, "")
          .replaceAll(/\s+/gu, "-") || "section";
      let id = stem;
      let suffix = 1;
      while (used.has(id)) {
        id = `${stem}-${suffix}`;
        suffix += 1;
      }
      used.add(id);
      ids.set(node, id);
    }
    for (const child of node.content ?? []) {
      visit(child);
    }
  };
  visit(model);
  return ids;
};
