import { LANGUAGES, languageFromName } from "./cleave";
import type { Language, Texts } from "./cleave";

// Type annotations with custom names can receive the same score as JavaScript.
const hasTypes = (text: string) =>
  /\b(?:interface|type|enum)\s+\w+\s*[={<]/u.test(text) ||
  /\b(?:const|let|var)\s+\w+\s*:\s*[\w{[]/u.test(text) ||
  /[,(]\s*\w+\??\s*:\s*\w+[\w\s<>[\]|?,:]*(?=[)=])/u.test(text) ||
  /\)\s*:\s*\w+/u.test(text);

// Require code structure before scoring keywords. Ordinary prose can contain
// words such as "select", "return", and "class" in several grammars.
const script =
  /\b(?:function\s*\w*\s*\(|(?:const|let|var)\s+\w+\s*(?::[^=\n]+)?=|(?:import|export)\s|(?:document|console)\.\w)|=>/u;
const candidates = new Map<string, RegExp>([
  ["javascript", script],
  [
    "typescript",
    new RegExp(
      `${script.source}|\\b(?:interface|type|enum)\\s+\\w+\\s*[={<]`,
      "u"
    ),
  ],
  ["json", /^\s*[[{]/u],
  ["xml", /<[A-Za-z][^<>]*>[\s\S]*<\/[A-Za-z]|<[A-Za-z][^<>]*\/>|^\s*<[!?]/mu],
  ["css", /\{\s*[\w-]+\s*:/u],
  [
    "markdown",
    /^\s{0,3}(?:#{1,6}\s|```)|\[[^\]\n]+\]\([^)]+\)|\*\*[^*]+\*\*/mu,
  ],
  [
    "python",
    /^\s*(?:def\s+\w+\s*\(|(?:from\s+\w+\s+)?import\s+\w+)|\bprint\(/mu,
  ],
  ["rust", /\b(?:fn|impl|trait|mod|use)\s+\w+|\blet\s+mut\b/u],
  ["go", /^\s*package\s+\w+|\bfunc\s+\w+\s*\(/mu],
  [
    "java",
    /\b(?:public|private|protected)\s+(?:static\s+)?(?:class|interface|void)\b/u,
  ],
  ["c", /^\s*#\s*include\s*[<"]|\b(?:int|void)\s+\w+\s*\(/mu],
  [
    "cpp",
    /\bstd::|^\s*#\s*include\s*<iostream>|\b(?:namespace|template)\s*[\w<]/mu,
  ],
  ["yaml", /^\s*[\w-]+:\s*\n|^\s*[\w-]+:[^\n]*\n\s*[\w-]+:/mu],
  ["toml", /^\s*\[\[?[\w.-]+\]\]?\s*$|^\s*[\w.-]+\s*=/mu],
  ["bash", /^#!.*\b(?:ba|z|fi)?sh\b|\$\{?\w+|\b(?:then|fi|done|esac)\b/mu],
  [
    "sql",
    /^\s*(?:SELECT\b[\s\S]+\bFROM\b|INSERT\s+INTO|CREATE\s+TABLE|DELETE\s+FROM|UPDATE\s+\w+\s+SET)\b/imu,
  ],
]);

// Used when WebAssembly is unavailable. The browser uses Highlights tokens.
const stripLiterals = (text: string) =>
  text.replaceAll(
    /\/\/[^\n]*|\/\*[\s\S]*?(?:\*\/|$)|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|`(?:\\.|[^`\\])*`/gu,
    ""
  );

const detectSample = (text: string, sourceCode: (text: string) => string) => {
  // Bound grammar work even for multi-megabyte inputs. Ignore conflict markers.
  const sample = text
    .trimStart()
    .slice(0, 10_000)
    .replaceAll(/^(?:<{7,}|\|{7,}|={7,}|>{7,}).*$/gmu, "");
  let language: string | undefined;
  let relevance = 0;
  // Highlights has no automatic language detector. Rank the existing structural
  // signals, rather than treating syntax colors as a language confidence score.
  for (const [candidate, pattern] of candidates) {
    if (candidate === "c" && candidates.get("cpp")?.test(sample)) {
      continue;
    }
    const score = [...sample.matchAll(new RegExp(pattern, `${pattern.flags}g`))]
      .length;
    if (score > relevance) {
      relevance = score;
      language = candidate;
    }
  }
  if (language === "javascript" || language === "typescript") {
    // Quoted text and comments are not evidence of type annotations or JSX.
    const code = sourceCode(sample);
    const typed = hasTypes(code);
    const jsx = /<[A-Za-z][\w.:-]*(?:\s[^<>]*)?\s*\/?>|<>/u.test(code);
    language = jsx
      ? typed
        ? "tsx"
        : "jsx"
      : typed
        ? "typescript"
        : "javascript";
  } else if (language === "xml") {
    language = /^\s*<\?xml\b/u.test(sample) ? "xml" : "html";
  }
  return { language, relevance };
};

/** File extensions take priority. Pasted text is checked only on submission. */
export const detectLanguage = (
  texts: Texts,
  sourceCode: (text: string) => string = stripLiterals
): Language => {
  for (const name of [texts.afterName, texts.beforeName]) {
    const language = languageFromName(name);
    if (
      language !== "text" ||
      /\.(?:plain|plaintext|text|txt)$/iu.test(name ?? "")
    ) {
      return language;
    }
  }
  const before = detectSample(texts.before, sourceCode);
  const after =
    texts.before === texts.after
      ? before
      : detectSample(texts.after, sourceCode);
  const result = after.relevance >= before.relevance ? after : before;
  return result.relevance >= 1
    ? (LANGUAGES.find((language) => language === result.language) ?? "text")
    : "text";
};
