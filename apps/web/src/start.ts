import { createCsrfMiddleware, createStart } from "@tanstack/react-start";

export const startInstance = createStart(() => ({
  // Full-document SSR unless a route opts out with its own `ssr` option.
  defaultSsr: true,
  requestMiddleware: [
    // Server functions are same-origin RPC endpoints: reject cross-site calls.
    createCsrfMiddleware({
      filter: (ctx) => ctx.handlerType === "serverFn",
    }),
  ],
}));
