import { Schema } from "effect";

import { canonicalLanguage } from "./cleave.languages";
import type { Language } from "./cleave.languages";

export { LANGUAGES } from "./cleave.languages";
export type { Language } from "./cleave.languages";

export class CleaveError extends Schema.TaggedError<CleaveError>()(
  "CleaveError",
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
    throw new CleaveError({ reason: "file" });
  }
};

const filenames = new Map<string, Language>([
  ["dockerfile", "dockerfile"],
  ["containerfile", "dockerfile"],
  ["makefile", "makefile"],
  ["gnumakefile", "makefile"],
  ["cmakelists.txt", "cmake"],
  ["justfile", "just"],
  ["gemfile", "ruby"],
  ["rakefile", "ruby"],
]);
const compoundExtensions = new Map<string, Language>([
  [".blade.php", "blade"],
  [".component.html", "angular-html"],
]);
export const languageFromName = (name?: string): Language => {
  const basename = name?.split(/[\\/]/u).at(-1)?.toLowerCase() ?? "";
  const filename = filenames.get(basename);
  if (filename) {
    return filename;
  }
  for (const [extension, language] of compoundExtensions) {
    if (basename.endsWith(extension)) {
      return language;
    }
  }
  return canonicalLanguage(basename.split(".").at(-1) ?? "") ?? "text";
};
export const downloadName = (name?: string) => {
  if (!name) {
    return "cleave-resolved.txt";
  }
  const safe = name.split(/[\\/]/u).at(-1) ?? "cleave";
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
