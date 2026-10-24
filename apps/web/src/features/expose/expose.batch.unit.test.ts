import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import type { CleanResult } from "@/features/expose/expose";
import { groupsForPreset } from "@/features/expose/expose";
import {
  activeItemOf,
  batchSummaryOf,
  canStartItem,
  cleanableItem,
  exposeZipPlan,
  failureStateOf,
  incomingExposeItems,
  resultStateOf,
  selectionKeyOf,
  staleItem,
  storeCleanResult,
} from "@/features/expose/expose.batch";
import type { ExposeItem } from "@/features/expose/expose.batch";
import { readImage } from "@/features/expose/expose.reader";

const bytes = new Uint8Array(
  readFileSync(new URL("fixtures/metadata.jpg", import.meta.url))
);
const report = readImage({ bytes, name: "photo.jpg", type: "image/jpeg" });
const clean: CleanResult = {
  engine: { name: "test", version: "1" },
  file: { bytes, name: "photo-clean.jpg", type: "image/jpeg" },
  kept: [],
  removed: [],
  warnings: [],
  verification: {
    c2pa: { beforeBytes: 0, afterBytes: 0 },
    display: { group: "display", before: 1, after: 1 },
    kept: [],
    payload: { beforeHash: "a", afterHash: "a", unchanged: true },
    read: report,
    selected: [{ group: "authorship", before: 1, after: 0 }],
  },
};
const itemWith = (overrides: Partial<ExposeItem> = {}): ExposeItem => ({
  id: "a",
  folderPath: null,
  source: {
    bytes: new Blob([bytes]),
    name: "photo.jpg",
    type: "image/jpeg",
    lastModified: 1,
  },
  reading: false,
  error: null,
  report,
  result: null,
  resultKey: null,
  state: "ready",
  ...overrides,
});

it("uses Squeeze identity across folders and counts folder non-images", () => {
  const file = new File([bytes], "photo.jpg", {
    type: "image/jpeg",
    lastModified: 1,
  });
  const next = incomingExposeItems(
    [itemWith()],
    [
      { file, folderPath: "second" },
      { file: new File(["text"], "note.txt"), folderPath: "second" },
      { file: new File(["text"], "loose.txt"), folderPath: null },
      {
        file: new File([bytes], "photo.jpg", { lastModified: 2 }),
        folderPath: "second",
      },
    ],
    () => "new"
  );
  expect(next.duplicates).toBe(1);
  expect(next.skipped).toBe(1);
  expect(next.accepted.map((item) => item.source.name)).toEqual([
    "loose.txt",
    "photo.jpg",
  ]);
  expect(next.accepted[1]?.folderPath).toBe("second");
});

it("keeps a result as a Blob and marks it stale only when the resolved selection changes", async () => {
  const stored = storeCleanResult(clean);
  expect(stored.file.bytes).toBeInstanceOf(Blob);
  expect(new Uint8Array(await stored.file.bytes.arrayBuffer())).toEqual(bytes);
  const key = selectionKeyOf("personal", []);
  const item = itemWith({ result: stored, resultKey: key, state: "cleaned" });
  expect(
    staleItem(item, selectionKeyOf("custom", groupsForPreset("personal"))).state
  ).toBe("cleaned");
  const stale = staleItem(item, selectionKeyOf("everything", []));
  expect(stale.state).toBe("stale");
  expect(stale.result).toBe(stored);
  expect(staleItem(stale, key).state).toBe("cleaned");
});

it("a preset change lets a blocked format be tried again", () => {
  expect(staleItem(itemWith({ state: "not-supported" }), "new").state).toBe(
    "ready"
  );
});

it("only queues Ready, Stale, and Failed rows with a report", () => {
  for (const state of ["ready", "stale", "failed"] as const) {
    expect(cleanableItem(itemWith({ state }))).toBe(true);
  }
  for (const state of [
    "cleaning",
    "cleaned",
    "incomplete",
    "not-supported",
    "too-large",
    "rejected",
  ] as const) {
    expect(cleanableItem(itemWith({ state }))).toBe(false);
  }
  expect(cleanableItem(itemWith({ reading: true }))).toBe(false);
  expect(cleanableItem(itemWith({ report: null }))).toBe(false);
});

it("keeps the single-file desk and permits a stale file to be cleaned from it", () => {
  const item = itemWith();
  expect(activeItemOf([item], null)).toBe(item);
  expect(activeItemOf([item, itemWith({ id: "b" })], null)).toBeUndefined();
  expect(activeItemOf([item, itemWith({ id: "b" })], "a")).toBe(item);
  expect(
    canStartItem(
      itemWith({ result: storeCleanResult(clean), state: "stale" }),
      groupsForPreset("everything"),
      false
    )
  ).toBe(true);
});

it("sums the shared selection across all readable files", () => {
  const one = batchSummaryOf([itemWith()], ["authorship"]);
  const two = batchSummaryOf(
    [itemWith(), itemWith({ id: "b" }), itemWith({ report: null })],
    ["authorship"]
  );
  expect(two.fields).toBe(one.fields * 2);
  expect(two.keptFields).toBe(one.keptFields * 2);
});

it("separates remaining selected fields and changed pixels from Cleaned", () => {
  expect(resultStateOf(clean)).toBe("cleaned");
  expect(
    resultStateOf({
      ...clean,
      verification: {
        ...clean.verification,
        selected: [{ group: "authorship", before: 2, after: 1 }],
      },
    })
  ).toBe("incomplete");
  expect(
    resultStateOf({
      ...clean,
      verification: {
        ...clean.verification,
        payload: { ...clean.verification.payload, unchanged: false },
      },
    })
  ).toBe("incomplete");
});

it("maps read, engine, format, and memory failures to the named states", () => {
  expect(failureStateOf("engine-failed", true)).toBe("rejected");
  expect(failureStateOf("clean-not-supported")).toBe("not-supported");
  expect(failureStateOf("engine-unavailable")).toBe("failed");
  expect(failureStateOf("too-large", true)).toBe("too-large");
});

describe("ZIP plan", () => {
  it("preserves safe folders, resolves nested collisions, and counts excluded states", () => {
    const ready = itemWith({
      state: "cleaned",
      result: storeCleanResult(clean),
    });
    const plan = exposeZipPlan([
      { ...ready, folderPath: "photos/../trip" },
      { ...ready, id: "b", folderPath: "photos/trip" },
      {
        ...ready,
        id: "c",
        folderPath: "photos/trip",
        result: storeCleanResult({
          ...clean,
          file: { ...clean.file, name: "photo-clean-2.jpg" },
        }),
      },
      itemWith({ id: "bad", state: "failed" }),
      itemWith({
        id: "stale",
        state: "stale",
        result: storeCleanResult(clean),
      }),
    ]);
    expect(plan.entries.map((entry) => entry.name)).toEqual([
      "photos/trip/photo-clean.jpg",
      "photos/trip/photo-clean-2.jpg",
      "photos/trip/photo-clean-2-2.jpg",
    ]);
    expect(plan.leftOut).toBe(2);
    expect(plan.entries.every((entry) => entry.input instanceof Blob)).toBe(
      true
    );
  });
  it("keeps the file extension of a long name", () => {
    const result = storeCleanResult({
      ...clean,
      file: { ...clean.file, name: `${"x".repeat(300)}-clean.jpg` },
    });
    expect(
      exposeZipPlan([itemWith({ state: "cleaned", result })]).entries[0]?.name
    ).toMatch(/\.jpg$/u);
  });
});
