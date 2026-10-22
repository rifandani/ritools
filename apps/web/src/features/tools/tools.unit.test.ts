import { describe, expect, it } from "vitest";

import { TOOLS } from "@/features/tools/tools";

describe("TOOLS", () => {
  it("gives every Tool Entry a unique path on the site", () => {
    const paths = TOOLS.map((tool) => tool.path);

    expect(new Set(paths).size).toBe(paths.length);
    for (const path of paths) {
      expect(path.startsWith("/")).toBe(true);
    }
  });

  it("lists Squeeze, the first Tool", () => {
    expect(TOOLS.map((tool) => tool.name)).toContain("Squeeze");
  });
});
