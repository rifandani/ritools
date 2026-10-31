import { describe, expect, it } from "vitest";

import { isFolioTextRequest } from "./folio.text.types";

const bytes = new ArrayBuffer(4);
const edit = {
  expected: "Your name",
  next: "Ihr Name",
  objectIndex: 2,
  pageIndex: 0,
};

describe("Wording Edit request guard", () => {
  it("accepts a list request", () => {
    expect(
      isFolioTextRequest({ bytes, id: "a", pageIndex: 0, type: "list" })
    ).toBe(true);
  });

  it("accepts a rewrite request", () => {
    expect(isFolioTextRequest({ bytes, edit, id: "a", type: "rewrite" })).toBe(
      true
    );
  });

  it("accepts a measure request", () => {
    expect(isFolioTextRequest({ bytes, edit, id: "a", type: "measure" })).toBe(
      true
    );
  });

  it("rejects a value that is not an object", () => {
    expect(isFolioTextRequest(null)).toBe(false);
    expect(isFolioTextRequest("list")).toBe(false);
    expect(isFolioTextRequest(7)).toBe(false);
  });

  it("rejects a missing message id", () => {
    expect(isFolioTextRequest({ bytes, pageIndex: 0, type: "list" })).toBe(
      false
    );
    expect(isFolioTextRequest({ bytes, id: 7, type: "list" })).toBe(false);
  });

  it("rejects bytes that are not an ArrayBuffer", () => {
    expect(
      isFolioTextRequest({
        bytes: new Uint8Array(4),
        id: "a",
        pageIndex: 0,
        type: "list",
      })
    ).toBe(false);
    expect(isFolioTextRequest({ id: "a", pageIndex: 0, type: "list" })).toBe(
      false
    );
  });

  it("rejects an unknown request type", () => {
    expect(
      isFolioTextRequest({ bytes, id: "a", pageIndex: 0, type: "remove" })
    ).toBe(false);
  });

  it("rejects a list index that is not a non-negative integer", () => {
    expect(
      isFolioTextRequest({ bytes, id: "a", pageIndex: -1, type: "list" })
    ).toBe(false);
    expect(
      isFolioTextRequest({ bytes, id: "a", pageIndex: 1.5, type: "list" })
    ).toBe(false);
    expect(
      isFolioTextRequest({ bytes, id: "a", pageIndex: "0", type: "list" })
    ).toBe(false);
  });

  it("rejects a rewrite without a valid edit", () => {
    expect(isFolioTextRequest({ bytes, id: "a", type: "rewrite" })).toBe(false);
    expect(
      isFolioTextRequest({ bytes, edit: null, id: "a", type: "rewrite" })
    ).toBe(false);
  });

  it("rejects a measure without a valid edit", () => {
    expect(isFolioTextRequest({ bytes, id: "a", type: "measure" })).toBe(false);
    expect(
      isFolioTextRequest({ bytes, edit: null, id: "a", type: "measure" })
    ).toBe(false);
  });

  it("requires every edit field", () => {
    expect(
      isFolioTextRequest({
        bytes,
        edit: { ...edit, pageIndex: -1 },
        id: "a",
        type: "rewrite",
      })
    ).toBe(false);
    expect(
      isFolioTextRequest({
        bytes,
        edit: { ...edit, objectIndex: 0.5 },
        id: "a",
        type: "rewrite",
      })
    ).toBe(false);
    expect(
      isFolioTextRequest({
        bytes,
        edit: { ...edit, expected: 7 },
        id: "a",
        type: "rewrite",
      })
    ).toBe(false);
    expect(
      isFolioTextRequest({
        bytes,
        edit: { ...edit, next: null },
        id: "a",
        type: "rewrite",
      })
    ).toBe(false);
  });
});
