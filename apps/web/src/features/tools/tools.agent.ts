import { Schema } from "effect";

import { defineAgentAction } from "@/core/libs/agent-action";

/**
 * The app shell's Agent Action: `open_tool`, on every page. It lists only the
 * Tools that offer Agent Actions, so an agent never lands on a page where it
 * can do nothing.
 */

/** The Tools with Agent Actions, by the name an agent sends. */
const AgentTool = Schema.Literals(["squeeze", "expose", "qraft", "unmask"]);
type AgentTool = typeof AgentTool.Type;

/** The route of each Tool. A unit test checks each one against the Tool Catalog. */
const pathOf = (tool: AgentTool): string => `/${tool}`;

export interface ShellAgentController {
  readonly navigate: (path: string) => Promise<void>;
  readonly pathname: string;
}

export const openToolAction = defineAgentAction({
  description:
    "Opens a Ritools Tool in this tab: squeeze (compress images to a target size), expose (read and remove image metadata), qraft (make QR codes and barcodes), or unmask (remove an image background). After it resolves, list the Agent Actions again: each Tool adds its own.",
  input: Schema.Struct({
    tool: AgentTool.annotate({ description: "The Tool to open." }),
  }),
  name: "open_tool",
  output: Schema.Struct({
    ok: Schema.Literal(true),
    tool: AgentTool,
    path: Schema.String,
    alreadyOpen: Schema.Boolean.annotate({
      description: "Whether the Tool was already open.",
    }),
  }),
  run: async (
    { controller }: { controller: () => ShellAgentController },
    input
  ) => {
    const shell = controller();
    const path = pathOf(input.tool);
    const alreadyOpen = shell.pathname === path;
    if (!alreadyOpen) {
      await shell.navigate(path);
    }
    return { alreadyOpen, ok: true as const, path, tool: input.tool };
  },
});

export const SHELL_AGENT_ACTIONS = [openToolAction];
