/**
 * The Tool Catalog: the Tools that exist today, in the order the home page
 * shows them.
 *
 * `promiseKey` and `factKeys` are Translation Key literals, so the page that
 * renders them stays type-checked against the Message Catalog.
 */
export const TOOLS = [
  {
    name: "Squeeze",
    path: "/squeeze",
    promiseKey: "squeezeTagline",
    factKeys: ["homeFactFormats", "homeFactOutputs", "homeFactModes"],
  },
  {
    name: "Expose",
    path: "/expose",
    promiseKey: "exposePromise",
    factKeys: ["exposeFactFormats", "exposeFactGroups", "exposeFactLocal"],
  },
  {
    name: "Tabular",
    path: "/tabular",
    promiseKey: "tabularPromise",
    factKeys: ["tabularFactInput", "tabularFactOutput", "tabularFactLocal"],
  },
  {
    name: "Folio",
    path: "/folio",
    promiseKey: "folioPromise",
    factKeys: ["folioFactInput", "folioFactEdit", "folioFactOutput"],
  },
] as const;
