import { describe, expect, it } from "vitest";

import { TOOL_GROUPS, toolAtPath, TOOLS } from "@/features/tools/tools";

describe("TOOL_GROUPS", () => {
  it("shows the Tool group, then the Editor group, then the Relay group", () => {
    expect(TOOL_GROUPS.map((entry) => entry.group)).toEqual([
      "tool",
      "editor",
      "relay",
    ]);
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

  it("lists ten pages, with Cinch after Unmask and Snag last", () => {
    const names = TOOLS.map((tool) => tool.name);
    expect(names).toContain("Squeeze");
    expect(names).toContain("Qraft");
    expect(names.indexOf("Cinch")).toBe(names.indexOf("Unmask") + 1);
    expect(TOOLS).toHaveLength(10);
    expect(TOOLS.at(-1)?.path).toBe("/snag");
  });

  it("groups Tabular, Folio, Quill, and Cleave as the Editors", () => {
    const editors = TOOLS.filter((tool) => tool.group === "editor");

    expect(editors.map((tool) => tool.name)).toEqual([
      "Tabular",
      "Folio",
      "Quill",
      "Cleave",
    ]);
    expect(TOOLS.filter((tool) => tool.group === "tool")).toHaveLength(5);
  });

  it("groups Snag alone as the Relay, because its request leaves the device", () => {
    const relays = TOOLS.filter((tool) => tool.group === "relay");

    expect(relays.map((tool) => tool.name)).toEqual(["Snag"]);
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
