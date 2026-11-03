/**
 * The Tool Catalog: the Tools that exist today, in the order the home page
 * shows them.
 *
 * `promiseKey` and `factKeys` are Translation Key literals, so the page that
 * renders them stays type-checked against the Message Catalog.
 */
/**
 * The rail groups a Tool sits in: `tool` holds the Tools that make files,
 * `editor` holds the Tools that open and change a document.
 */
export type ToolGroup = "tool" | "editor";

/**
 * The groups in the order they show. The open rail and the docked group menus
 * both read this list, so their groups always match.
 */
export const TOOL_GROUPS = [
  { group: "tool", labelKey: "toolCatalog" },
  { group: "editor", labelKey: "toolGroupEditor" },
] as const;

export const TOOLS = [
  {
    name: "Squeeze",
    group: "tool",
    path: "/squeeze",
    promiseKey: "squeezeTagline",
    factKeys: ["homeFactFormats", "homeFactOutputs", "homeFactModes"],
  },
  {
    name: "Expose",
    group: "tool",
    path: "/expose",
    promiseKey: "exposePromise",
    factKeys: ["exposeFactFormats", "exposeFactGroups", "exposeFactLocal"],
  },
  {
    name: "Qraft",
    group: "tool",
    path: "/qraft",
    promiseKey: "qraftPromise",
    factKeys: ["qraftFactFormats", "qraftFactStyle", "qraftFactLocal"],
  },
  {
    name: "Unmask",
    group: "tool",
    path: "/unmask",
    promiseKey: "unmaskPromise",
    factKeys: ["unmaskFactFormats", "unmaskFactModel", "unmaskFactLocal"],
  },
  {
    name: "Tabular",
    group: "editor",
    path: "/tabular",
    promiseKey: "tabularPromise",
    factKeys: ["tabularFactInput", "tabularFactOutput", "tabularFactLocal"],
  },
  {
    name: "Folio",
    group: "editor",
    path: "/folio",
    promiseKey: "folioPromise",
    factKeys: ["folioFactInput", "folioFactEdit", "folioFactOutput"],
  },
  {
    name: "Quill",
    group: "editor",
    path: "/quill",
    promiseKey: "quillPromise",
    factKeys: ["quillFactInput", "quillFactOutput", "quillFactLocal"],
  },
] as const;

/** The Tool that owns a path, if any. A Tool owns every route under it. */
export const toolAtPath = (pathname: string) =>
  TOOLS.find(
    (tool) => pathname === tool.path || pathname.startsWith(`${tool.path}/`)
  );
