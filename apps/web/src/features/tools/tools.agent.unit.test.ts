import { describe, expect, it, vi } from "vitest";

import { TOOLS } from "@/features/tools/tools";
import {
  openToolAction,
  SHELL_AGENT_ACTIONS,
} from "@/features/tools/tools.agent";
import type { ShellAgentController } from "@/features/tools/tools.agent";

const contextOf = (controller: ShellAgentController) => ({
  controller: () => controller,
  settled: () => Promise.resolve(),
});

const { signal } = new AbortController();

describe("open_tool", () => {
  it("lists only the four Tools that have Agent Actions", () => {
    expect(SHELL_AGENT_ACTIONS.map((action) => action.name)).toEqual([
      "open_tool",
    ]);
    expect(JSON.stringify(openToolAction.inputSchema)).toContain('"squeeze"');
    for (const tool of ["squeeze", "expose", "qraft", "unmask"]) {
      expect(JSON.stringify(openToolAction.inputSchema)).toContain(`"${tool}"`);
    }
    for (const tool of ["tabular", "folio", "quill", "redline"]) {
      expect(JSON.stringify(openToolAction.inputSchema)).not.toContain(
        `"${tool}"`
      );
    }
  });

  it("opens only routes that the Tool Catalog lists", () => {
    expect(TOOLS.map((tool) => tool.path)).toEqual(
      expect.arrayContaining(["/squeeze", "/expose", "/qraft", "/unmask"])
    );
  });

  it("navigates to the Tool and returns its path", async () => {
    const navigate = vi.fn(() => Promise.resolve());
    const result = await openToolAction.execute(
      contextOf({ navigate, pathname: "/" }),
      { tool: "unmask" },
      signal
    );
    expect(navigate).toHaveBeenCalledWith("/unmask");
    expect(result).toEqual({
      alreadyOpen: false,
      ok: true,
      path: "/unmask",
      tool: "unmask",
    });
  });

  it("does not navigate when the Tool is already open", async () => {
    const navigate = vi.fn(() => Promise.resolve());
    const result = await openToolAction.execute(
      contextOf({ navigate, pathname: "/qraft" }),
      { tool: "qraft" },
      signal
    );
    expect(navigate).not.toHaveBeenCalled();
    expect(result).toMatchObject({ alreadyOpen: true, ok: true });
  });

  it("refuses a Tool without Agent Actions", async () => {
    const navigate = vi.fn(() => Promise.resolve());
    const result = await openToolAction.execute(
      contextOf({ navigate, pathname: "/" }),
      { tool: "tabular" },
      signal
    );
    expect(navigate).not.toHaveBeenCalled();
    expect(result).toMatchObject({ code: "invalid-input", ok: false });
  });
});
