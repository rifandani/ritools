import { Atom, AtomRegistry } from "effect/reactivity";
import { describe, expect, it } from "vitest";

import { colorModeAtom } from "@/features/color-mode/color-mode.atoms";
import { toasterPropsAtom } from "@/features/toast/toast.atoms";

describe("toasterPropsAtom", () => {
  it("lets the system pick the toast theme in auto mode", () => {
    expect(AtomRegistry.make().get(toasterPropsAtom).theme).toBe("system");
  });

  it("follows the picked color mode", () => {
    const registry = AtomRegistry.make();
    const unmount = registry.mount(toasterPropsAtom);

    registry.set(colorModeAtom, "dark");

    expect(registry.get(toasterPropsAtom).theme).toBe("dark");
    unmount();
  });

  it("lets the system pick on the server, which cannot read the color mode", () => {
    expect(
      Atom.getServerValue(toasterPropsAtom, AtomRegistry.make()).theme
    ).toBe("system");
  });
});
