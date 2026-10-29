/* oxlint-disable unicorn/no-array-sort, anti-slop/require-safety-comment-for-type-assertion -- Tests use the branded contract fixture, run real async fixtures, and assert after explicit guards. */
import { Schema } from "effect";
import { describe, expect, it } from "vitest";

import * as F from "./folio";

const invalid = [
  null,
  {},
  {
    _tag: "Commit",
    request: "x",
    session: "s",
    baseRevision: -1,
    commandId: "c",
    command: { _tag: "DeletePages", pages: [] },
  },
  { _tag: "Cancel", request: 4, target: "x" },
  { _tag: "ReadViewport" },
];

describe("folio wire schemas", () => {
  it("rejects malformed requests and invalid geometry", () => {
    for (const value of invalid) {
      expect(Schema.decodeUnknownExit(F.Request)(value)._tag).toBe("Failure");
    }
    expect(
      Schema.decodeUnknownExit(F.Page)({
        id: "p",
        index: 0,
        label: "1",
        mediaBox: { x: 0, y: 0, width: 0, height: 1 },
        cropBox: { x: 0, y: 0, width: 1, height: 1 },
        rotation: 45,
        userUnit: 1,
      })._tag
    ).toBe("Failure");
  });

  it("decodes every request tag and keeps library handles out of the payload", () => {
    const cancel = Schema.decodeUnknownSync(F.Request)({
      _tag: "Cancel",
      request: "r",
      target: "old",
    });
    expect(cancel._tag).toBe("Cancel");
    const opened = Schema.decodeUnknownSync(F.WireRequest)({
      protocol: 1,
      payload: {
        _tag: "Open",
        request: "r",
        bytes: new Uint8Array([1, 2]),
        name: "test.pdf",
      },
    });
    expect(opened.payload._tag).toBe("Open");
    expect(JSON.stringify(opened)).not.toContain("PDFDocument");
    expect(
      Schema.decodeUnknownExit(F.WireRequest)({ protocol: 2, payload: cancel })
        ._tag
    ).toBe("Failure");
  });

  it("maps every error code to a usable retry action", () => {
    for (const code of Schema.decodeUnknownSync(Schema.Array(F.FolioErrorCode))(
      [
        "invalid-request",
        "invalid-pdf",
        "no-pages",
        "password-required",
        "wrong-password",
        "source-rejected",
        "read-only",
        "read-only-field",
        "unsupported-form",
        "unsupported-glyph",
        "unsupported-preservation",
        "invalid-selection",
        "last-page",
        "unknown-page",
        "unknown-field",
        "unknown-annotation",
        "stale-session",
        "stale-revision",
        "stale-plan",
        "cancelled",
        "offline-asset-missing",
        "resource-limit",
        "write-failed",
        "verification-failed",
        "worker-lost",
        "session-lost",
      ]
    )) {
      expect(F.defaultRetry(code)).toMatch(
        /same-operation|choose-file|connect|reopen|none/u
      );
      const failure = F.FolioFailure.make({
        requestId: F.RequestId.make("r"),
        code,
      });
      expect(failure.code).toBe(code);
    }
  });

  it("handles empty history limits and degenerate geometry", () => {
    expect(F.historyFits(0, 0)).toBe(true);
    expect(F.historyFits(F.HISTORY_MAX_ENTRIES, 0)).toBe(false);
    expect(F.historyFits(0, F.HISTORY_MAX_BYTES + 1)).toBe(false);
    expect(F.fitPageScale(0, 0, 100, 100)).toBe(1);
    expect(F.viewportToPage([0, 0, 0, 0, 0, 0], [3, 4])).toEqual([3, 4]);
    expect(F.exportFilename("a\u0000b", { _tag: "Full" })).toBe(
      "a-b-edited.pdf"
    );
    expect(
      F.FolioFailure.make({
        requestId: F.RequestId.make("r"),
        code: "invalid-pdf",
        detail: "why",
      }).detail
    ).toBe("why");
  });

  it("matches a case mapping and rejects a length-changing fold safely", () => {
    const runs: F.TextRun[] = [
      {
        text: "İstanbul",
        transform: [1, 0, 0, 1, 0, 0],
        width: 30,
        height: 10,
        direction: "ltr",
        hasEol: false,
      },
    ];
    const boxes = [{ x: 0, y: 0, width: 30, height: 10 }];
    expect(
      F.findLiteralMatches("page:1" as F.PageId, runs, boxes, "İstanbul")
    ).toHaveLength(1);
    expect(
      F.findLiteralMatches("page:1" as F.PageId, runs, boxes, "istanbul")
    ).toHaveLength(0);
    expect(
      F.findLiteralMatches("page:1" as F.PageId, runs, [], "stan")
    ).toHaveLength(1);
  });

  it("computes fit scales and an invertible viewport transform", () => {
    expect(F.fitWidthScale(200, 100)).toBe(0.5);
    expect(F.fitPageScale(200, 100, 100, 100)).toBe(0.5);
    expect(F.fitWidthScale(0, 100)).toBe(1);
    const matrix: F.Matrix = [2, 0, 0, 2, 10, 20];
    const point = F.viewportToPage(matrix, [30, 40]);
    expect(point[0]).toBeCloseTo(10);
    expect(point[1]).toBeCloseTo(10);
  });
});
