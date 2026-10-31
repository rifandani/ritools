import { describe, expect, it } from "vitest";

import { isFolioOcrRequest } from "./folio.ocr.types";

const id = "run-1";

describe("isFolioOcrRequest", () => {
  it("accepts a start request with a known language", () => {
    expect(
      isFolioOcrRequest({
        bytes: new ArrayBuffer(8),
        id,
        languages: ["eng", "ind"],
        type: "start",
      })
    ).toBe(true);
  });

  it("rejects a start request with an unknown language", () => {
    expect(
      isFolioOcrRequest({
        bytes: new ArrayBuffer(8),
        id,
        languages: ["fra"],
        type: "start",
      })
    ).toBe(false);
  });

  it("accepts a page request with its size", () => {
    expect(
      isFolioOcrRequest({
        height: 100,
        id,
        image: new ArrayBuffer(8),
        pageIndex: 0,
        type: "page",
        width: 100,
      })
    ).toBe(true);
  });

  it("rejects a page request without its size", () => {
    expect(
      isFolioOcrRequest({
        id,
        image: new ArrayBuffer(8),
        pageIndex: 0,
        type: "page",
      })
    ).toBe(false);
  });

  it("accepts finish and cancel", () => {
    expect(isFolioOcrRequest({ id, type: "finish" })).toBe(true);
    expect(isFolioOcrRequest({ id, type: "cancel" })).toBe(true);
  });

  it("rejects an unknown shape", () => {
    expect(isFolioOcrRequest(null)).toBe(false);
    expect(isFolioOcrRequest("start")).toBe(false);
    expect(isFolioOcrRequest({ type: "start" })).toBe(false);
    expect(isFolioOcrRequest({ id, type: "write" })).toBe(false);
  });
});
