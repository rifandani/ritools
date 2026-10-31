import { describe, expect, it } from "vitest";

import type { FolioTextRefusal } from "./folio.text.types";
import {
  FOLIO_TEXT_REFUSAL_KEY,
  forgetFolioTextEncrypted,
  isFolioTextEncrypted,
  markFolioTextEncrypted,
  pageRectOf,
} from "./folio.text.ui";

describe("pageRectOf", () => {
  it("flips the lower-left PDF box into the page's upper-left frame", () => {
    expect(
      pageRectOf([100, 700, 250, 720], {
        bottom: 0,
        left: 0,
        right: 595,
        top: 842,
      })
    ).toEqual({ height: 20, width: 150, x: 100, y: 122 });
  });

  it("subtracts a crop box that starts away from the page origin", () => {
    expect(
      pageRectOf([20, 40, 60, 80], {
        bottom: 10,
        left: 5,
        right: 595,
        top: 800,
      })
    ).toEqual({ height: 40, width: 40, x: 15, y: 720 });
  });
});

describe("FOLIO_TEXT_REFUSAL_KEY", () => {
  it("names a message for every engine refusal", () => {
    const reasons: readonly FolioTextRefusal[] = [
      "artwork",
      "glyph-coverage",
      "invisible",
      "no-text-object",
      "overflow",
      "permission",
      "signed",
      "verify-failed",
      "xfa",
    ];

    for (const reason of reasons) {
      expect(FOLIO_TEXT_REFUSAL_KEY[reason]).toMatch(/^folioTextRefused/u);
    }
  });

  it("keeps the specific reasons apart", () => {
    expect(FOLIO_TEXT_REFUSAL_KEY["glyph-coverage"]).toBe(
      "folioTextRefusedGlyph"
    );
    expect(FOLIO_TEXT_REFUSAL_KEY.overflow).toBe("folioTextRefusedOverflow");
    expect(FOLIO_TEXT_REFUSAL_KEY.invisible).toBe("folioTextRefusedInvisible");
    expect(FOLIO_TEXT_REFUSAL_KEY.permission).toBe(
      "folioTextRefusedPermission"
    );
  });
});

describe("the encrypted tab registry", () => {
  it("remembers a tab until it is forgotten", () => {
    expect(isFolioTextEncrypted("locked")).toBe(false);

    markFolioTextEncrypted("locked");
    expect(isFolioTextEncrypted("locked")).toBe(true);

    forgetFolioTextEncrypted("locked");
    expect(isFolioTextEncrypted("locked")).toBe(false);
  });
});
