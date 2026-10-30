import { describe, expect, it } from "vitest";

import { sidebarOpenFromCookie } from "@/core/components/shell/sidebar-state";

describe("sidebarOpenFromCookie", () => {
  it("opens the rail when no cookie is set", () => {
    expect(sidebarOpenFromCookie()).toBe(true);
  });

  it("opens the rail for any value except the picker's false", () => {
    expect(sidebarOpenFromCookie("true")).toBe(true);
    expect(sidebarOpenFromCookie("")).toBe(true);
  });

  it("folds the rail only for false", () => {
    expect(sidebarOpenFromCookie("false")).toBe(false);
  });
});
