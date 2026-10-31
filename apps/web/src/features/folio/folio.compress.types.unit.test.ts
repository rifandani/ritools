import { describe, expect, it } from "vitest";

import { isFolioCompressRequest } from "./folio.compress.types";

const id = "run-1";

describe("isFolioCompressRequest", () => {
  it("accepts a known preset", () => {
    expect(
      isFolioCompressRequest({
        bytes: new ArrayBuffer(8),
        id,
        preset: "balanced",
        type: "compress",
      })
    ).toBe(true);
  });

  it("rejects an unknown preset", () => {
    expect(
      isFolioCompressRequest({
        bytes: new ArrayBuffer(8),
        id,
        preset: "extreme",
        type: "compress",
      })
    ).toBe(false);
  });

  it("rejects a request without bytes or an id", () => {
    expect(
      isFolioCompressRequest({ id, preset: "light", type: "compress" })
    ).toBe(false);
    expect(
      isFolioCompressRequest({
        bytes: new ArrayBuffer(8),
        preset: "light",
        type: "compress",
      })
    ).toBe(false);
  });

  it("rejects an unknown shape", () => {
    expect(isFolioCompressRequest(null)).toBe(false);
    expect(isFolioCompressRequest("compress")).toBe(false);
    expect(isFolioCompressRequest({ id, type: "stop" })).toBe(false);
  });
});
