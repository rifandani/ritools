import { describe, expect, it } from "vitest";

import { TOOL_GROUPS, toolAtPath, TOOLS } from "@/features/tools/tools";

describe("TOOL_GROUPS", () => {
  it("shows the Tool group, then the Editor group", () => {
    expect(TOOL_GROUPS.map((entry) => entry.group)).toEqual(["tool", "editor"]);
  });

  it("covers every Tool's group, so no Tool goes unlisted", () => {
    const groups = new Set(TOOL_GROUPS.map((entry) => entry.group));

    for (const tool of TOOLS) {
      expect(groups.has(tool.group)).toBe(true);
    }
  });
});

describe("TOOLS", () => {
  it("gives every Tool Entry a unique path on the site", () => {
    const paths = TOOLS.map((tool) => tool.path);

    expect(new Set(paths).size).toBe(paths.length);
    for (const path of paths) {
      expect(path.startsWith("/")).toBe(true);
    }
  });

  it("lists ten pages, with Cinch after Unmask and Easel last", () => {
    const names = TOOLS.map((tool) => tool.name);
    expect(names).toContain("Squeeze");
    expect(names).toContain("Qraft");
    expect(names.indexOf("Cinch")).toBe(names.indexOf("Unmask") + 1);
    expect(TOOLS).toHaveLength(10);
    expect(TOOLS.at(-1)?.path).toBe("/easel");
  });

  it("groups Tabular, Folio, Quill, Cleave, and Easel as the Editors", () => {
    const editors = TOOLS.filter((tool) => tool.group === "editor");

    expect(editors.map((tool) => tool.name)).toEqual([
      "Tabular",
      "Folio",
      "Quill",
      "Cleave",
      "Easel",
    ]);
    expect(TOOLS.filter((tool) => tool.group === "tool")).toHaveLength(5);
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
