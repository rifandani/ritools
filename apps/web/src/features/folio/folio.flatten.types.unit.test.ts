import { describe, expect, it } from "vitest";

import { isFolioFlattenRequest } from "./folio.flatten.types";

const id = "run-1";

describe("isFolioFlattenRequest", () => {
  it("accepts a copy with its page count", () => {
    expect(
      isFolioFlattenRequest({
        bytes: new ArrayBuffer(8),
        id,
        pages: 2,
        type: "flatten",
      })
    ).toBe(true);
  });

  it("rejects a request without bytes, an id, or pages", () => {
    expect(isFolioFlattenRequest({ id, pages: 1, type: "flatten" })).toBe(
      false
    );
    expect(
      isFolioFlattenRequest({
        bytes: new ArrayBuffer(8),
        pages: 1,
        type: "flatten",
      })
    ).toBe(false);
    expect(
      isFolioFlattenRequest({ bytes: new ArrayBuffer(8), id, type: "flatten" })
    ).toBe(false);
  });

  it("rejects a page count that is not a positive whole number", () => {
    for (const pages of [0, -1, 1.5]) {
      expect(
        isFolioFlattenRequest({
          bytes: new ArrayBuffer(8),
          id,
          pages,
          type: "flatten",
        })
      ).toBe(false);
    }
  });

  it("rejects an unknown shape", () => {
    expect(isFolioFlattenRequest(null)).toBe(false);
    expect(isFolioFlattenRequest("flatten")).toBe(false);
    expect(
      isFolioFlattenRequest({
        bytes: new ArrayBuffer(8),
        id,
        pages: 1,
        type: "compress",
      })
    ).toBe(false);
  });
});
