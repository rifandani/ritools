import { describe, expect, it } from "vitest";

import { isFolioRepairRequest } from "./folio.repair.types";

describe("isFolioRepairRequest", () => {
  it("accepts a repair request with bytes and an id", () => {
    expect(
      isFolioRepairRequest({
        bytes: new ArrayBuffer(8),
        id: "run-1",
        type: "repair",
      })
    ).toBe(true);
  });

  it("rejects a request without bytes or an id", () => {
    expect(isFolioRepairRequest({ id: "run-1", type: "repair" })).toBe(false);
    expect(
      isFolioRepairRequest({ bytes: new ArrayBuffer(8), type: "repair" })
    ).toBe(false);
  });

  it("rejects an unknown shape", () => {
    expect(isFolioRepairRequest(null)).toBe(false);
    expect(
      isFolioRepairRequest({
        bytes: new ArrayBuffer(8),
        id: "run-1",
        type: "compress",
      })
    ).toBe(false);
  });
});
