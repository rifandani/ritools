import { describe, expect, it } from "@effect/vitest";
import { Option } from "effect";
import { Atom, AtomRegistry } from "effect/reactivity";
import { beforeEach } from "vitest";

import type { BatchItem, ItemResult } from "@/features/squeeze/squeeze";
import { DEFAULT_SETTINGS } from "@/features/squeeze/squeeze";
import {
  batchAtom,
  resultsAtom,
  runningAtom,
  settingsAtom,
  workingAtom,
} from "@/features/squeeze/squeeze.atoms";

const itemOf = (size: number): BatchItem => ({
  folderPath: null,
  format: Option.some("jpeg"),
  id: "a",
  lastModified: 1,
  name: "a.jpg",
  size,
  source: new Blob([new ArrayBuffer(size)]),
  targetBytes: null,
});

const resultOf = (): ItemResult => ({
  id: "a",
  key: "key",
  outcome: {
    files: [],
    inputBytes: 1000,
    kind: "already-fits",
    notes: [],
    outputBytes: 1000,
    parts: [],
    problem: null,
    raisedTargetBytes: null,
    smallestStep: null,
    underTargetCount: 1,
    writtenCount: 0,
  },
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

  it("serves an empty working set on the server", () => {
    expect(Atom.getServerValue(workingAtom, registry)).toEqual(new Set());
  });

  it("keeps the Batch and its results, keyed by id", () => {
    registry.set(batchAtom, new Map([["a", itemOf(1000)]]));
    registry.set(resultsAtom, new Map([["a", resultOf()]]));

    expect(registry.get(batchAtom).get("a")?.size).toBe(1000);
    expect(registry.get(resultsAtom).get("a")?.outcome.kind).toBe(
      "already-fits"
    );
  });

  it("takes new settings", () => {
    registry.set(settingsAtom, {
      ...DEFAULT_SETTINGS,
      quality: 40,
      sizeMode: "fixed-quality",
    });

    expect(registry.get(settingsAtom).quality).toBe(40);
    expect(registry.get(settingsAtom).sizeMode).toBe("fixed-quality");
  });
});
