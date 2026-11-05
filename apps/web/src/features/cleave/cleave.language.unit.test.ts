import { describe, expect, it } from "vitest";

import { detectLanguage } from "./cleave.language";

const typed = `export function createSpanFromToken(token: ThemedToken) {
  const element = document.createElement('div');
  return element;
}`;

describe("Cleave language detection", () => {
  it.each([
    ["typescript", typed],
    ["typescript", "const count: number = 1;"],
    ["typescript", "interface User { name: string; }"],
    ["javascript", "const count = 1;"],
    ["javascript", "export function double(value) { return value * 2; }"],
    ["javascript", 'const text = "interface User { name: string; } <div>";'],
    [
      "javascript",
      "const count = 1; // interface User { name: string; } <div>",
    ],
    ["jsx", "export const View = () => <div>Hello</div>;"],
    ["tsx", "export const View = (props: Props) => <div>{props.name}</div>;"],
    ["json", '{"name":"example","active":true}'],
    ["html", "<!DOCTYPE html>\n<html><body><h1>Hello</h1></body></html>"],
    ["xml", '<?xml version="1.0"?><root><item>Hello</item></root>'],
    ["css", ".example { color: red; display: flex; }"],
    ["markdown", "# Heading\n\n[Example](https://example.com)\n\n**Hello**"],
    ["python", "def double(value):\n    return value * 2\n"],
    ["rust", 'fn main() { let mut count = 1; println!("{}", count); }'],
    ["go", 'package main\nimport "fmt"\nfunc main() { fmt.Println("Hello") }'],
    [
      "java",
      'public class Main { public static void main(String[] args) { System.out.println("Hello"); } }',
    ],
    ["c", '#include <stdio.h>\nint main(void) { printf("Hello"); return 0; }'],
    [
      "cpp",
      '#include <iostream>\nint main() { std::cout << "Hello"; return 0; }',
    ],
    ["yaml", "name: example\nitems:\n  - one\n  - two\n"],
    ["toml", '[package]\nname = "example"\nversion = "1.0.0"\n'],
    ["bash", '#!/bin/bash\nfor file in *.txt; do\n  echo "$file"\ndone'],
    ["sql", "SELECT id, name FROM users WHERE active = true;"],
  ])("detects %s from pasted text", (language, text) => {
    expect(detectLanguage({ before: text, after: "" })).toBe(language);
    expect(detectLanguage({ before: "", after: text })).toBe(language);
  });

  it.each([
    "",
    " \n\t ",
    "same\nold\n",
    "This is a plain text document. The user can read it and change it.",
    "Please select a name from the list and return to the main page.",
    "Language: TypeScript\nThe function returns a number.",
  ])("keeps uncertain text as plain text: %j", (text) => {
    expect(detectLanguage({ before: text, after: text })).toBe("text");
  });

  it("uses either input and checks the language again for each submission", () => {
    expect(detectLanguage({ before: typed, after: "" })).toBe("typescript");
    expect(detectLanguage({ before: "", after: typed })).toBe("typescript");
    expect(detectLanguage({ before: "old", after: "new" })).toBe("text");
  });

  it("keeps recognized file extensions ahead of content detection", () => {
    expect(
      detectLanguage({ before: typed, after: typed, afterName: "notes.txt" })
    ).toBe("text");
    expect(
      detectLanguage({ before: typed, after: typed, afterName: "input.js" })
    ).toBe("javascript");
    expect(
      detectLanguage({
        before: "a",
        after: "b",
        beforeName: "input.TS",
        afterName: "unknown.bin",
      })
    ).toBe("typescript");
    expect(
      detectLanguage({
        before: "a",
        after: "b",
        beforeName: "input.ts",
        afterName: "input.py",
      })
    ).toBe("python");
    expect(
      detectLanguage({ before: typed, after: typed, afterName: "unknown.bin" })
    ).toBe("typescript");
  });

  it("detects the code inside Marked Text", () => {
    expect(
      detectLanguage({
        before: `<<<<<<< HEAD\n${typed}\n=======\n${typed.replace("'div'", "'span'")}\n>>>>>>> branch`,
        after: "",
      })
    ).toBe("typescript");
  });
});
