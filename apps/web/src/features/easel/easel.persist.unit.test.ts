import { describe, expect, it } from "vitest";

import {
  exportedOf,
  fontsOfStack,
  isSessionRecord,
  isTabRecord,
  orderOf,
  recordOf,
} from "@/features/easel/easel.persist";
import type { PersistableTab } from "@/features/easel/easel.persist";
import {
  applyChange,
  EMPTY_STACK,
  ORIGINAL,
} from "@/features/easel/easel.stack";
import type { TextLayer } from "@/features/easel/easel.stack";

const BLACK = { a: 255, b: 0, g: 0, r: 0 };

const textLayer = (id: string, font: string): TextLayer => ({
  align: "left",
  bold: false,
  box: null,
  color: BLACK,
  font,
  hidden: false,
  id,
  italic: false,
  kind: "text",
  locked: false,
  opacity: 1,
  outline: null,
  rotation: 0,
  size: 40,
  strike: false,
  text: "Hello",
  underline: false,
  width: 300,
  x: 0,
  y: 0,
});

const tabOf = (overrides: Partial<PersistableTab> = {}): PersistableTab => ({
  byteSize: 1024,
  exported: ORIGINAL,
  format: "png",
  id: "tab-1",
  name: "photo.png",
  quality: 85,
  source: { height: 300, width: 400 },
  stack: EMPTY_STACK,
  ...overrides,
});

/** What IndexedDB gives back: a copy with no shared objects. */
const cloned = <A>(value: A): A => structuredClone(value);

describe("recordOf", () => {
  it("marks a File Tab with an unexported edit as dirty", () => {
    const edited = applyChange(EMPTY_STACK, {
      _tag: "Rotate",
      direction: "right",
    });
    expect(recordOf(tabOf({ stack: edited }), []).dirty).toBe(true);
    expect(recordOf(tabOf(), []).dirty).toBe(false);
    expect(
      recordOf(tabOf({ exported: edited.present, stack: edited }), []).dirty
    ).toBe(false);
  });

  it("is a record that this build opens after a storage round trip", () => {
    const edited = applyChange(
      EMPTY_STACK,
      { _tag: "AddLayer", layer: textLayer("text-1", "Inter") },
      null
    );
    const record = cloned(recordOf(tabOf({ stack: edited }), ["asset-1"]));
    expect(isTabRecord(record)).toBe(true);
    expect(record.stack.present.layers).toHaveLength(1);
    expect(record.stack.past).toHaveLength(1);
  });
});

describe("exportedOf", () => {
  it("keeps a clean File Tab clean after a restore", () => {
    const edited = applyChange(EMPTY_STACK, {
      _tag: "Rotate",
      direction: "left",
    });
    const record = cloned(
      recordOf(tabOf({ exported: edited.present, stack: edited }), [])
    );
    expect(exportedOf(record)).toBe(record.stack.present);
  });

  it("keeps an unexported edit dirty after a restore", () => {
    const edited = applyChange(EMPTY_STACK, {
      _tag: "Rotate",
      direction: "left",
    });
    const record = cloned(recordOf(tabOf({ stack: edited }), []));
    expect(exportedOf(record)).not.toBe(record.stack.present);
  });
});

const validRecord = () => cloned(recordOf(tabOf(), []));

describe("isTabRecord", () => {
  const valid = validRecord;

  it("refuses a record of another version", () => {
    expect(isTabRecord({ ...valid(), version: 2 })).toBe(false);
  });

  it.each([
    ["an empty id", { id: "" }],
    ["an unknown format", { format: "tiff" }],
    ["a quality out of range", { quality: 500 }],
    ["a source with no width", { source: { height: 3, width: 0 } }],
    ["a quality of 0", { quality: 0 }],
    ["asset ids that are not text", { assetIds: [1] }],
    ["a stack that is not an object", { stack: null }],
  ])("refuses a record with %s", (_label, patch) => {
    expect(isTabRecord({ ...valid(), ...patch })).toBe(false);
  });

  it("refuses an Edit State with a layer of an unknown kind", () => {
    const record = valid();
    const broken = {
      ...record.stack.present,
      layers: [{ id: "x", kind: "sticker" }],
    };
    expect(
      isTabRecord({ ...record, stack: { ...record.stack, present: broken } })
    ).toBe(false);
  });

  it("refuses a value that is not an object", () => {
    expect(isTabRecord(null)).toBe(false);
    expect(isTabRecord("tab")).toBe(false);
  });
});

describe("isSessionRecord and orderOf", () => {
  it("checks the session shape", () => {
    expect(isSessionRecord({ active: null, order: ["a"] })).toBe(true);
    expect(isSessionRecord({ active: 1, order: [] })).toBe(false);
    expect(isSessionRecord({ active: null, order: [1] })).toBe(false);
  });

  it("puts the saved order first and appends the records it does not name", () => {
    expect(
      orderOf(["a", "b", "c"], { active: null, order: ["c", "a", "gone", "c"] })
    ).toEqual(["c", "a", "b"]);
  });
});

describe("fontsOfStack", () => {
  it("lists each font of every state once, so an undo finds its font", () => {
    let stack = applyChange(
      EMPTY_STACK,
      { _tag: "AddLayer", layer: textLayer("text-1", "Inter") },
      null
    );
    stack = applyChange(
      stack,
      { _tag: "AddLayer", layer: textLayer("text-2", "Caveat") },
      null
    );
    stack = applyChange(stack, { _tag: "RemoveLayer", id: "text-1" }, null);
    expect(new Set(fontsOfStack(stack))).toEqual(new Set(["Inter", "Caveat"]));
    expect(fontsOfStack(EMPTY_STACK)).toEqual([]);
  });
});
