import { AtomRegistry } from "effect/reactivity";
import { describe, expect, it } from "vitest";

import { DEFAULT_SETTINGS } from "@/features/cinch/cinch";
import {
  batchAtom,
  resultsAtom,
  settingsAtom,
  workingAtom,
} from "@/features/cinch/cinch.atoms";

describe("Cinch atoms", () => {
  it("start with the default settings and empty maps", () => {
    const registry = AtomRegistry.make();

    expect(registry.get(settingsAtom)).toEqual(DEFAULT_SETTINGS);
    expect(registry.get(batchAtom).size).toBe(0);
    expect(registry.get(resultsAtom).size).toBe(0);
    expect(registry.get(workingAtom).size).toBe(0);
  });

  it("hold a new value once it is set", () => {
    const registry = AtomRegistry.make();
    const next = { ...DEFAULT_SETTINGS, preset: "strong" as const };

    registry.set(settingsAtom, next);
    registry.set(workingAtom, new Map([["a", 0.5]]));

    expect(registry.get(settingsAtom)).toBe(next);
    expect(registry.get(workingAtom).get("a")).toBe(0.5);
  });
});
