import { Atom, AtomRegistry } from "effect/reactivity";
import { afterEach, describe, expect, it, vi } from "vitest";

import { COLOR_MODE_STORAGE_KEY } from "@/features/color-mode/color-mode";
import {
  appliedColorModeAtom,
  colorModeAtom,
} from "@/features/color-mode/color-mode.atoms";

/** A `prefers-color-scheme: dark` query whose answer the test controls. */
const stubSystemPreference = (prefersDark: boolean) => {
  const listeners = new Set<() => void>();
  const media = {
    addEventListener: (_type: "change", listener: () => void) => {
      listeners.add(listener);
    },
    matches: prefersDark,
    removeEventListener: (_type: "change", listener: () => void) => {
      listeners.delete(listener);
    },
  };
  vi.stubGlobal("matchMedia", () => media);
  return {
    listenerCount: () => listeners.size,
    change: (next: boolean) => {
      media.matches = next;
      for (const listener of listeners) {
        listener();
      }
    },
  };
};

describe("appliedColorModeAtom", () => {
  afterEach(() => {
    // Only this stub: `vi.unstubAllGlobals()` would also drop the
    // `localStorage` stub that `vitest.setup.ts` installs for every file.
    Reflect.deleteProperty(globalThis, "matchMedia");
  });

  it("follows the system preference while in auto mode", () => {
    const system = stubSystemPreference(false);
    const registry = AtomRegistry.make();
    const applied: string[] = [];
    registry.subscribe(appliedColorModeAtom, (mode) => applied.push(mode), {
      immediate: true,
    });

    system.change(true);

    expect(applied).toEqual(["light", "dark"]);
  });

  it("stops listening to the system when its registry is disposed", () => {
    const system = stubSystemPreference(false);
    const registry = AtomRegistry.make();
    registry.mount(appliedColorModeAtom);

    registry.dispose();

    expect(system.listenerCount()).toBe(0);
  });

  it("renders light on the server, which has no system preference", () => {
    expect(Atom.getServerValue(appliedColorModeAtom, AtomRegistry.make())).toBe(
      "light"
    );
  });

  it("uses the picked mode", () => {
    stubSystemPreference(true);
    const registry = AtomRegistry.make();
    registry.mount(appliedColorModeAtom);

    registry.set(colorModeAtom, "light");

    expect(registry.get(appliedColorModeAtom)).toBe("light");
  });
});

describe("colorModeAtom", () => {
  it("is auto on the server, which has no localStorage", () => {
    expect(Atom.getServerValue(colorModeAtom, AtomRegistry.make())).toBe(
      "auto"
    );
  });

  it("is auto when nothing is stored", () => {
    expect(AtomRegistry.make().get(colorModeAtom)).toBe("auto");
  });

  it("persists the picked mode for the next visit", () => {
    const registry = AtomRegistry.make();
    const unmount = registry.mount(colorModeAtom);

    registry.set(colorModeAtom, "dark");
    unmount();

    expect(AtomRegistry.make().get(colorModeAtom)).toBe("dark");
  });

  it("reads a stored value that is not a color mode as auto", () => {
    localStorage.setItem(COLOR_MODE_STORAGE_KEY, "sepia");

    expect(AtomRegistry.make().get(colorModeAtom)).toBe("auto");
  });
});
