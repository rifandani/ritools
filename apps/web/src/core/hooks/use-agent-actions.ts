import type { WebMCP } from "@mcp-b/global";
import { useEffect, useLayoutEffect, useRef } from "react";

import type {
  AgentActionDefinition,
  AgentContext,
} from "@/core/libs/agent-action";

/**
 * The WebMCP glue (ADR-0035). It is the only module that touches
 * `document.modelContext`, so a change in the WebMCP API touches one file.
 *
 * - The native API wins. The polyfill never loads on top of it.
 * - Without the native API, `@mcp-b/global` loads by dynamic import. Its
 *   transport accepts only this page's origin, and its iframe transport is off.
 * - Without either, nothing happens and the Tool works as before.
 */

/** How long `settled` waits for a render that may never come. */
const SETTLE_TIMEOUT_MS = 100;

let contextPromise: Promise<WebMCP.ModelContext | null> | null = null;

const installPolyfill = async (): Promise<WebMCP.ModelContext | null> => {
  // The polyfill initializes on import unless told not to, with a transport
  // that accepts every origin. It must wait for our options.
  window.__webModelContextOptions = { autoInitialize: false };
  const { initializeWebModelContext } = await import("@mcp-b/global");
  initializeWebModelContext({
    transport: {
      iframeServer: false,
      tabServer: { allowedOrigins: [window.location.origin] },
    },
  });
  return document.modelContext ?? null;
};

/** The page's `document.modelContext`: native, polyfilled, or `null`. */
const loadModelContext = (): Promise<WebMCP.ModelContext | null> => {
  contextPromise ??= (async () => {
    if (document.modelContext !== undefined) {
      return document.modelContext;
    }
    if (!window.isSecureContext) {
      return null;
    }
    try {
      return await installPolyfill();
    } catch {
      // A polyfill that cannot load leaves the Tools as they are.
      return null;
    }
  })();
  return contextPromise;
};

/**
 * Registrations run one set at a time. A route that unmounts aborts its set
 * before the next route registers, so a name never collides with itself.
 */
let registrations: Promise<void> = Promise.resolve();

/** The name a `toolcancel` event carries, if any. */
const cancelledName = (event: Event): string | null => {
  // oxlint-disable-next-line anti-slop/no-reflect-get -- `toolName` is a WebMCP field that the DOM `Event` type does not declare.
  const name: unknown = Reflect.get(event, "toolName");
  // oxlint-disable-next-line anti-slop/no-runtime-typeof -- the event comes from the browser or the polyfill, and this is its parse.
  return typeof name === "string" ? name : null;
};

const registerAll = async <C>(options: {
  readonly actions: readonly AgentActionDefinition<C>[];
  readonly context: AgentContext<C>;
  readonly modelContext: WebMCP.ModelContext;
  readonly signal: AbortSignal;
}) => {
  const { actions, context, modelContext, signal } = options;
  const calls = new Map<string, Set<AbortController>>();

  // A cancelled call stops its run, as the Tool's own Stop control does.
  modelContext.addEventListener(
    "toolcancel",
    (event) => {
      const name = cancelledName(event);
      for (const call of name === null ? [] : (calls.get(name) ?? [])) {
        call.abort();
      }
    },
    { signal }
  );

  const all = new AbortController();
  signal.addEventListener("abort", () => all.abort(), { once: true });

  const settledRegistrations = await Promise.allSettled(
    // An async callback turns a synchronous throw into a rejection, so the
    // rollback below sees it too.
    actions.map(async (action) => {
      const registration: WebMCP.ModelContextTool & {
        readonly outputSchema: object;
      } = {
        description: action.description,
        execute: async (args, executeOptions) => {
          const call = new AbortController();
          const running = calls.get(action.name) ?? new Set();
          running.add(call);
          calls.set(action.name, running);
          try {
            return await action.execute(
              context,
              args,
              AbortSignal.any([
                call.signal,
                ...(executeOptions?.signal === undefined
                  ? []
                  : [executeOptions.signal]),
              ])
            );
          } finally {
            running.delete(call);
          }
        },
        inputSchema: action.inputSchema,
        name: action.name,
        outputSchema: action.outputSchema,
      };
      return await modelContext.registerTool(
        action.annotations === undefined
          ? registration
          : { ...registration, annotations: action.annotations },
        { signal: all.signal }
      );
    })
  );

  // An agent gets the full set or none: one failure rolls back the rest.
  if (settledRegistrations.some((result) => result.status === "rejected")) {
    all.abort();
  }
};

/**
 * Registers a Tool's Agent Actions while the component is mounted, and
 * unregisters them on unmount. `actions` must be a static list; each handler
 * reads `controller` through a ref, so the registration does not change when
 * the Tool's state does.
 */
export const useAgentActions = <C>(
  actions: readonly AgentActionDefinition<C>[],
  controller: C
) => {
  const latest = useRef(controller);
  const waiting = useRef<(() => void)[]>([]);

  // Every commit gives handlers the newest controller and wakes `settled`.
  useLayoutEffect(() => {
    latest.current = controller;
    const resolvers = waiting.current;
    waiting.current = [];
    for (const resolve of resolvers) {
      resolve();
    }
  });

  useEffect(() => {
    const abort = new AbortController();
    const context: AgentContext<C> = {
      controller: () => latest.current,
      settled: async () => {
        const { promise, resolve } = Promise.withResolvers<null>();
        const wake = () => {
          resolve(null);
        };
        waiting.current.push(wake);
        setTimeout(wake, SETTLE_TIMEOUT_MS);
        await promise;
      },
    };
    const previous = registrations;
    registrations = (async () => {
      await previous;
      try {
        const modelContext = await loadModelContext();
        if (modelContext === null || abort.signal.aborted) {
          return;
        }
        await registerAll({
          actions,
          context,
          modelContext,
          signal: abort.signal,
        });
      } catch {
        // A set that fails to register leaves its Tool as it is; it must not
        // stop the next route from registering.
      }
    })();
    return () => {
      abort.abort();
    };
  }, [actions]);
};
