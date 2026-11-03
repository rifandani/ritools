/* oxlint-disable unicorn/no-await-expression-member, anti-slop/no-unsafe-dictionary-type, anti-slop/no-runtime-typeof, anti-slop/no-reflect-get, anti-slop/require-safety-comment-for-type-assertion -- An Agent Action takes and returns JSON; the helpers read it in the page as an agent does. */
import { expect } from "@playwright/test";
import type { Page } from "@playwright/test";

/**
 * A Browser Agent's view of the page: the Agent Actions on
 * `document.modelContext`. Playwright's Chromium has no native WebMCP, so the
 * page loads the same-origin polyfill (ADR-0035), and these helpers call the
 * same API an agent calls.
 */

/** The names of the registered Agent Actions. */
export const agentActionNames = (page: Page): Promise<string[]> =>
  page.evaluate(async () => {
    const context = document.modelContext;
    if (context === undefined) {
      return [];
    }
    return (await context.getTools()).map((tool) => tool.name);
  });

/**
 * Waits until an Agent Action is registered. The polyfill loads by dynamic
 * import after hydration, so the first registration can take a moment.
 */
export const waitForAgentAction = async (page: Page, name: string) => {
  await expect
    .poll(async () => (await agentActionNames(page)).includes(name), {
      timeout: 15_000,
    })
    .toBe(true);
};

/** The schemas an Agent Action publishes. */
export const agentActionSchema = (page: Page, name: string) =>
  page.evaluate(async (wanted) => {
    const tools = (await document.modelContext?.getTools()) ?? [];
    const tool = tools.find((entry) => entry.name === wanted);
    return {
      annotations: tool?.annotations ?? null,
      inputSchema: tool?.inputSchema ?? null,
    };
  }, name);

/**
 * Calls an Agent Action and returns its result object. `executeTool` returns
 * JSON text; the polyfill wraps a plain result as `structuredContent`.
 */
export const callAgentAction = (
  page: Page,
  name: string,
  args: Record<string, unknown> = {}
): Promise<Record<string, unknown>> =>
  page.evaluate(
    async ([wanted, input]) => {
      const context = document.modelContext;
      if (context === undefined) {
        throw new Error("document.modelContext is missing");
      }
      const tool = (await context.getTools()).find(
        (entry) => entry.name === wanted
      );
      if (tool === undefined) {
        throw new Error(`no Agent Action ${wanted}`);
      }
      const parsed: unknown = JSON.parse(
        await context.executeTool(tool, input)
      );
      if (typeof parsed !== "object" || parsed === null) {
        throw new Error("the result is not an object");
      }
      const structured: unknown = Reflect.get(parsed, "structuredContent");
      return (structured ?? parsed) as Record<string, unknown>;
    },
    [name, args] as const
  );
