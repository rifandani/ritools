import { describe, expect, it } from "@effect/vitest";
import { Option } from "effect";
import { AtomRegistry } from "effect/reactivity";
import { beforeEach } from "vitest";

import type { BatchItem, ItemResult } from "@/features/squeeze/squeeze";
import { DEFAULT_SETTINGS, ItemOutcome } from "@/features/squeeze/squeeze";
import {
  batchAtom,
  resultsAtom,
  runningAtom,
  settingsAtom,
} from "@/features/squeeze/squeeze.atoms";

const itemOf = (size: number): BatchItem => ({
  format: Option.some("jpeg"),
  id: "a",
  name: "a.jpg",
  size,
  source: new Blob([new ArrayBuffer(size)]),
  targetBytes: null,
});

const resultOf = (outcome: ItemOutcome): ItemResult => ({
  id: "a",
  key: "key",
  outcome,
});

describe("Squeeze atoms", () => {
  let registry: AtomRegistry.AtomRegistry;

  beforeEach(() => {
    registry = AtomRegistry.make();
  });

  it("starts with an empty Batch, the default settings, and no run", () => {
    expect(registry.get(batchAtom).size).toBe(0);
    expect(registry.get(resultsAtom).size).toBe(0);
    expect(registry.get(runningAtom)).toBe(false);
    expect(registry.get(settingsAtom)).toEqual(DEFAULT_SETTINGS);
  });

  it("keeps the Batch and its results, keyed by id", () => {
    registry.set(batchAtom, new Map([["a", itemOf(1000)]]));
    registry.set(
      resultsAtom,
      new Map([
        [
          "a",
          resultOf(
            ItemOutcome.Compressed({
              attempts: 2,
              bytes: new ArrayBuffer(100),
              height: 1,
              reducedColors: false,
              resized: false,
              size: 100,
              width: 1,
            })
          ),
        ],
      ])
    );

    expect(registry.get(batchAtom).get("a")?.size).toBe(1000);
    expect(registry.get(resultsAtom).get("a")?.outcome._tag).toBe("Compressed");
  });

  it("takes new settings", () => {
    registry.set(settingsAtom, {
      ...DEFAULT_SETTINGS,
      mode: "quality",
      quality: 40,
    });

    expect(registry.get(settingsAtom).quality).toBe(40);
    expect(registry.get(settingsAtom).mode).toBe("quality");
  });
});
