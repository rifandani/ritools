import { describe, expect, it } from "vitest";

import { isFolioFlattenRequest } from "./folio.flatten.types";

const id = "run-1";

const flags = { encrypted: false, restricted: false, signed: false };

const request = () => ({
  bytes: new ArrayBuffer(8),
  flags,
  id,
  pages: 2,
  sourceText: ["Page one", "Page two"],
  type: "flatten",
});

describe("isFolioFlattenRequest", () => {
  it("accepts a copy with its page count, flags, and source text", () => {
    expect(isFolioFlattenRequest(request())).toBe(true);
  });

  it("rejects a request without bytes, an id, pages, flags, or source text", () => {
    expect(isFolioFlattenRequest({ ...request(), bytes: undefined })).toBe(
      false
    );
    expect(isFolioFlattenRequest({ ...request(), id: undefined })).toBe(false);
    expect(isFolioFlattenRequest({ ...request(), pages: undefined })).toBe(
      false
    );
    expect(isFolioFlattenRequest({ ...request(), flags: undefined })).toBe(
      false
    );
    expect(isFolioFlattenRequest({ ...request(), sourceText: undefined })).toBe(
      false
    );
  });

  it("rejects a flag that is not a boolean", () => {
    expect(
      isFolioFlattenRequest({
        ...request(),
        flags: { ...flags, encrypted: "no" },
      })
    ).toBe(false);
    expect(
      isFolioFlattenRequest({
        ...request(),
        flags: { ...flags, restricted: 1 },
      })
    ).toBe(false);
    expect(
      isFolioFlattenRequest({
        ...request(),
        flags: { ...flags, signed: null },
      })
    ).toBe(false);
  });

  it("rejects source text that is not a string list", () => {
    expect(
      isFolioFlattenRequest({ ...request(), sourceText: "Page one" })
    ).toBe(false);
    expect(isFolioFlattenRequest({ ...request(), sourceText: [1, 2] })).toBe(
      false
    );
  });

  it("rejects a page count that is not a positive whole number", () => {
    for (const pages of [0, -1, 1.5]) {
      expect(isFolioFlattenRequest({ ...request(), pages })).toBe(false);
    }
  });

  it("rejects an unknown shape", () => {
    expect(isFolioFlattenRequest(null)).toBe(false);
    expect(isFolioFlattenRequest("flatten")).toBe(false);
    expect(isFolioFlattenRequest({ ...request(), type: "compress" })).toBe(
      false
    );
  });
});
