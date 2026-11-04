import { describe, expect, it } from "vitest";

import {
  checkMarkers,
  importText,
  downloadName,
  languageFromName,
  isLargeText,
  inputMode,
} from "./redline";

describe("Redline input", () => {
  it.each([
    ["<<<<<<<< ours\na\n========\nb\n>>>>>>>> theirs", "complete", 1],
    ["<<<<<<< ours\na\n======= label\nb\n>>>>>>> theirs", "broken", 0],
    ["<<<<<<< ours\na\n=======\nb\n>>>>>>> theirs", "complete", 1],
    [
      "<<<<<<< ours\na\n||||||| base\nx\n=======\nb\n>>>>>>> theirs\n<<<<<<< x\nc\n=======\nd\n>>>>>>> y",
      "complete",
      2,
    ],
    ["<<<<<<< ours\na\n=======\nb", "broken", 0],
    ["=======\na\n>>>>>>> theirs", "broken", 0],
    ["<<<<<<< a\n<<<<<<< b\n=======\nx\n>>>>>>> b", "broken", 0],
    ["plain text", "none", 0],
  ])("checks Marked Text %j", (text, status, conflicts) => {
    expect(checkMarkers(text)).toEqual({ status, conflicts });
  });
  it("reads UTF-8 strictly and refuses binary data", () => {
    expect(importText(new TextEncoder().encode("café\r\n"))).toBe("café\r\n");
    expect(() => importText(new Uint8Array([0xc3, 0x28]))).toThrow();
    expect(() => importText(new Uint8Array([65, 0, 66]))).toThrow();
    expect(() => importText(new Uint8Array([0xff, 0xfe, 65, 0]))).toThrow();
    expect(importText(new Uint8Array())).toBe("");
  });
  it("names downloads and selects language from the extension", () => {
    expect(downloadName("report.final.ts")).toBe("report.final-resolved.ts");
    expect(downloadName()).toBe("redline-resolved.txt");
    expect(downloadName("notes")).toBe("notes-resolved.txt");
    expect(languageFromName("APP.TSX")).toBe("tsx");
    expect(languageFromName("unknown.weird")).toBe("text");
    expect(isLargeText("a".repeat(5_000_001))).toBe(true);
  });
  it("reads marker lines as plain text when both sides have text", () => {
    expect(
      inputMode("<<<<<<< HEAD\na\n=======\nb\n>>>>>>> branch", "after")
    ).toBe("compare");
    expect(inputMode("<<<<<<< HEAD\na", "")).toBe("broken");
    expect(inputMode("", "<<<<<<< HEAD\na\n=======\nb\n>>>>>>> branch")).toBe(
      "marked"
    );
    expect(inputMode("plain", "")).toBe("compare");
    expect(isLargeText("é")).toBe(false);
  });
});
