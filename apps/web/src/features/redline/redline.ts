import { Schema } from "effect";

export class RedlineError extends Schema.TaggedError<RedlineError>()(
  "RedlineError",
  {
    reason: Schema.Literals(["file", "markers", "compare"]),
  }
) {}

const markerOf = (line: string) => {
  const match = /^(?<token><{7,}|\|{7,}|={7,}|>{7,})(?<label>\s.*)?$/u.exec(
    line
  );
  const token = match?.groups?.token;
  const marker = token?.charAt(0);
  if (marker === "=" && match?.groups?.label) {
    return null;
  }
  return marker;
};

/** Marker grammar is checked only when the other text is empty. */
export const checkMarkers = (text: string) => {
  let state: "context" | "current" | "base" | "incoming" = "context";
  let conflicts = 0;
  let seen = false;
  for (const line of text.replaceAll("\r\n", "\n").split("\n")) {
    const marker = markerOf(line);
    if (!marker) {
      continue;
    }
    seen = true;
    if (marker === "<" && state === "context") {
      state = "current";
    } else if (marker === "|" && state === "current") {
      state = "base";
    } else if (marker === "=" && (state === "current" || state === "base")) {
      state = "incoming";
    } else if (marker === ">" && state === "incoming") {
      state = "context";
      conflicts += 1;
    } else {
      return { status: "broken" as const, conflicts: 0 };
    }
  }
  return {
    status:
      state === "context"
        ? seen
          ? ("complete" as const)
          : ("none" as const)
        : ("broken" as const),
    conflicts: state === "context" ? conflicts : 0,
  };
};

export const importText = (bytes: Uint8Array) => {
  try {
    const text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    // NUL and non-text control bytes indicate binary data, even in otherwise valid UTF-8.
    if (
      [...text].some((char) => {
        const code = char.codePointAt(0) ?? 0;
        return code < 32 && code !== 9 && code !== 10 && code !== 13;
      })
    ) {
      throw new Error("binary");
    }
    return text;
  } catch {
    throw new RedlineError({ reason: "file" });
  }
};

export const LANGUAGES = [
  "text",
  "javascript",
  "typescript",
  "jsx",
  "tsx",
  "json",
  "html",
  "css",
  "markdown",
  "python",
  "rust",
  "go",
  "java",
  "c",
  "cpp",
  "yaml",
  "toml",
  "bash",
  "sql",
  "xml",
] as const;
export type Language = (typeof LANGUAGES)[number];
const extensions = new Map<string, Language>([
  ["txt", "text"],
  ["js", "javascript"],
  ["mjs", "javascript"],
  ["ts", "typescript"],
  ["jsx", "jsx"],
  ["tsx", "tsx"],
  ["json", "json"],
  ["html", "html"],
  ["css", "css"],
  ["md", "markdown"],
  ["py", "python"],
  ["rs", "rust"],
  ["go", "go"],
  ["java", "java"],
  ["c", "c"],
  ["h", "c"],
  ["cpp", "cpp"],
  ["yaml", "yaml"],
  ["yml", "yaml"],
  ["toml", "toml"],
  ["sh", "bash"],
  ["sql", "sql"],
  ["xml", "xml"],
]);
export const languageFromName = (name?: string): Language =>
  extensions.get(name?.split(".").at(-1)?.toLowerCase() ?? "") ?? "text";
export const downloadName = (name?: string) => {
  if (!name) {
    return "redline-resolved.txt";
  }
  const safe = name.split(/[\\/]/u).at(-1) ?? "redline";
  const dot = safe.lastIndexOf(".");
  return dot > 0
    ? `${safe.slice(0, dot)}-resolved${safe.slice(dot)}`
    : `${safe}-resolved.txt`;
};
export const isLargeText = (text: string) =>
  new TextEncoder().encode(text).byteLength > 5_000_000;

export const inputMode = (before: string, after: string) => {
  if (before !== "" && after !== "") {
    return "compare";
  }
  const { status } = checkMarkers(before || after);
  return status === "none"
    ? "compare"
    : status === "broken"
      ? "broken"
      : "marked";
};

export interface Texts {
  readonly before: string;
  readonly after: string;
  readonly beforeName?: string;
  readonly afterName?: string;
}
export const swapTexts = (texts: Texts): Texts => ({
  before: texts.after,
  after: texts.before,
  beforeName: texts.afterName,
  afterName: texts.beforeName,
});
