import { Cause, Effect } from "effect";
import { describe, expect, it } from "vitest";

import * as F from "./folio";
import {
  movePages,
  pageSize,
  runLocal,
  uiFailure,
  parsePages,
  transformBox,
  transformPoint,
} from "./folio.ui";

const pages = Array.from({ length: 6 }, (_, index): F.Page => ({
  id: F.PageId.make(`page:${index + 1}`),
  index,
  label: String(index + 1),
  mediaBox: { x: 10, y: 20, width: 300, height: 500 },
  cropBox: { x: 10, y: 20, width: 300, height: 500 },
  rotation: 0,
  userUnit: 1,
}));
const ids = pages.map((page) => page.id);
const selected = [
  F.PageId.make("page:2"),
  F.PageId.make("page:3"),
  F.PageId.make("page:5"),
];
describe("Folio UI geometry and page scope", () => {
  it("moves each selected block once and retains its internal order", () => {
    expect(movePages(ids, selected, "up")).toEqual([
      "page:2",
      "page:3",
      "page:1",
      "page:5",
      "page:4",
      "page:6",
    ]);
    expect(movePages(ids, selected, "down")).toEqual([
      "page:1",
      "page:4",
      "page:2",
      "page:3",
      "page:6",
      "page:5",
    ]);
  });
  it("resolves ranges in source order without repeated pages", () => {
    expect(parsePages("5,2-3,2", pages)).toEqual([
      "page:2",
      "page:3",
      "page:5",
    ]);
    expect(parsePages("1-7", pages)).toBeNull();
    expect(parsePages("3-1", pages)).toBeNull();
    expect(parsePages("", pages)).toBeNull();
    expect(parsePages("one", pages)).toBeNull();
    expect(parsePages("0", pages)).toBeNull();
    expect(parsePages("1", pages)).toEqual(["page:1"]);
  });
  it("maps cropped and rotated source boxes into the CSS surface", () => {
    const matrix: F.Matrix = [0, 2, 2, 0, 40, -20];
    expect(
      transformBox(matrix, { x: 10, y: 20, width: 30, height: 40 })
    ).toEqual({ x: 80, y: 0, width: 80, height: 60 });
    const original: F.Point = [37, 91];
    expect(F.viewportToPage(matrix, transformPoint(matrix, original))).toEqual(
      original
    );
  });
});

it("uses visible crop dimensions, rotation, and UserUnit for zoom", () => {
  const page = pages.at(0);
  if (!page) {
    throw new Error("Missing fixture page");
  }
  expect(pageSize(page)).toEqual({ width: 300, height: 500 });
  expect(pageSize({ ...page, rotation: 90, userUnit: 2 })).toEqual({
    width: 1000,
    height: 600,
  });
});
it("keeps typed failures and hides untrusted defects at the UI boundary", () => {
  const failure = F.FolioFailure.make({
    requestId: F.RequestId.make("test"),
    code: "last-page",
  });
  expect(uiFailure(failure)).toBe(failure);
  expect(uiFailure(Cause.fail(failure))).toBe(failure);
  for (const error of [
    Cause.die(new Error("private contents")),
    Cause.fail("private contents"),
    null,
  ]) {
    const shown = uiFailure(error);
    expect(shown.code).toBe("worker-lost");
    expect(shown.sessionAlive).toBe(false);
    expect(shown.detail).toBeUndefined();
  }
});
it("runs the imperative UI bridge without losing typed failures", async () => {
  expect(await runLocal(Effect.succeed(17))).toBe(17);
  await expect(runLocal(Effect.fail("typed failure"))).rejects.toBeDefined();
});
