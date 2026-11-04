/* oxlint-disable eslint/no-await-in-loop, promise/avoid-new, anti-slop/no-runtime-typeof, anti-slop/no-reflect-get -- The test posts raw transport messages in order and reads the raw replies, as a foreign frame would. */
import type { Page } from "@playwright/test";

import {
  agentActionNames,
  callAgentAction,
  waitForAgentAction,
} from "./_agent";
import { expect, test } from "./_base";

/**
 * Sends one MCP request over the polyfill's tab transport, as a window message
 * from `origin`, and returns the replies the page posts back within a moment.
 * The message carries `source: window`, as a same-window agent does, so only
 * the origin decides.
 */
const sendMcp = (page: Page, origin: string, payloads: readonly unknown[]) =>
  page.evaluate(
    async ([from, messages]) => {
      const replies: unknown[] = [];
      const listen = (event: MessageEvent) => {
        const data: unknown = event.data;
        if (
          typeof data === "object" &&
          data !== null &&
          Reflect.get(data, "direction") === "server-to-client"
        ) {
          replies.push(Reflect.get(data, "payload"));
        }
      };
      window.addEventListener("message", listen);
      for (const payload of messages) {
        window.dispatchEvent(
          new MessageEvent("message", {
            data: {
              channel: "mcp-default",
              direction: "client-to-server",
              payload,
              type: "mcp",
            },
            origin: from,
            source: window,
          })
        );
        await new Promise((resolve) => {
          setTimeout(resolve, 300);
        });
      }
      window.removeEventListener("message", listen);
      return replies;
    },
    [origin, payloads] as const
  );

const handshake = [
  {
    id: 1,
    jsonrpc: "2.0",
    method: "initialize",
    params: {
      capabilities: {},
      clientInfo: { name: "e2e", version: "1.0.0" },
      protocolVersion: "2025-06-18",
    },
  },
  { jsonrpc: "2.0", method: "notifications/initialized" },
];

const setAvif = {
  id: 2,
  jsonrpc: "2.0",
  method: "tools/call",
  params: {
    arguments: { outputFormat: "avif" },
    name: "squeeze_set_settings",
  },
};

test("open_tool lists only the four Tools and navigates", async ({ page }) => {
  await page.goto("/");
  await waitForAgentAction(page, "open_tool");
  expect(await agentActionNames(page)).toEqual(["open_tool"]);

  expect(
    await callAgentAction(page, "open_tool", { tool: "tabular" })
  ).toMatchObject({ code: "invalid-input", ok: false });

  expect(await callAgentAction(page, "open_tool", { tool: "qraft" })).toEqual({
    alreadyOpen: false,
    ok: true,
    path: "/qraft",
    tool: "qraft",
  });
  await expect(page).toHaveURL(/\/qraft$/u);
  await waitForAgentAction(page, "qraft_get_state");
});

test("a message from another origin cannot call an Agent Action", async ({
  page,
}) => {
  await page.goto("/squeeze");
  await waitForAgentAction(page, "squeeze_set_settings");

  const foreign = await sendMcp(page, "https://evil.example", [
    ...handshake,
    setAvif,
  ]);
  expect(foreign).toEqual([]);
  expect(await callAgentAction(page, "squeeze_get_state")).toMatchObject({
    settings: { outputFormat: "jpeg" },
  });

  // The same messages from the page's own origin reach the Agent Action.
  const { origin } = new URL(page.url());
  const own = await sendMcp(page, origin, [...handshake, setAvif]);
  expect(JSON.stringify(own)).toContain('\\"outputFormat\\":\\"avif\\"');
  expect(await callAgentAction(page, "squeeze_get_state")).toMatchObject({
    settings: { outputFormat: "avif" },
  });
});
