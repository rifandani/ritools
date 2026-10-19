import { describe, expect, it } from "vitest";

import { resolveColorMode } from "@/features/color-mode/color-mode";

describe("resolveColorMode", () => {
  it("follows the system preference in auto mode", () => {
    expect(resolveColorMode("auto", true)).toBe("dark");
    expect(resolveColorMode("auto", false)).toBe("light");
  });

  it("uses a picked mode over the system preference", () => {
    expect(resolveColorMode("light", true)).toBe("light");
    expect(resolveColorMode("dark", false)).toBe("dark");
  });
});
