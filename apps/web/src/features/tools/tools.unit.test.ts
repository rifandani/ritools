import { describe, expect, it } from "vitest";

import { toolAtPath, TOOLS } from "@/features/tools/tools";

describe("TOOLS", () => {
  it("gives every Tool Entry a unique path on the site", () => {
    const paths = TOOLS.map((tool) => tool.path);

    expect(new Set(paths).size).toBe(paths.length);
    for (const path of paths) {
      expect(path.startsWith("/")).toBe(true);
    }
  });

  it("lists Squeeze, the first Tool, and Qraft, the fifth", () => {
    expect(TOOLS.map((tool) => tool.name)).toContain("Squeeze");
    expect(TOOLS.map((tool) => tool.name)).toContain("Qraft");
    expect(TOOLS.at(-1)?.path).toBe("/qraft");
  });
});

describe("toolAtPath", () => {
  it("finds the Tool that owns a path and every path under it", () => {
    expect(toolAtPath("/squeeze")?.name).toBe("Squeeze");
    expect(toolAtPath("/squeeze/batch")?.name).toBe("Squeeze");
    expect(toolAtPath("/qraft")?.name).toBe("Qraft");
    expect(toolAtPath("/qraft/batch")?.name).toBe("Qraft");
  });

  it("does not match a path that only shares a prefix", () => {
    expect(toolAtPath("/squeeze-other")).toBeUndefined();
  });

  it("has no Tool for the Catalog", () => {
    expect(toolAtPath("/")).toBeUndefined();
  });
});
