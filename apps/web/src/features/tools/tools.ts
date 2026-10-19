/**
 * The Tool Catalog: the Tools that exist today, in the order the home page
 * shows them.
 *
 * `promiseKey` is a Translation Key literal, so the page that renders it stays
 * type-checked against the Message Catalog.
 */
export const TOOLS = [
  {
    name: "Squeeze",
    path: "/squeeze",
    promiseKey: "squeezeTagline",
  },
] as const;
