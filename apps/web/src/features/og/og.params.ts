/**
 * What the Open Graph card shows, and the URL that asks for it.
 *
 * The card names a Tool, or the site. It never carries the words of a Tool:
 * the endpoint reads the name and the promise from the catalog, so a shared
 * link cannot print copy the site does not ship.
 */

import { Schema } from "effect";

import { OG_PATH } from "@/core/constants/global";
import { TOOLS } from "@/features/tools/tools";

/** The card size the major feeds crop least: 1.91:1. */
export const OG_SIZE = { height: 630, width: 1200 } as const;

/**
 * A card changes only when the catalog changes, never per request, so a feed
 * may hold it for a day and reap it for a week.
 */
export const OG_CACHE_CONTROL =
  "public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800";

/** The path of one Tool, as the Tool Catalog writes it. */
export type ToolPath = (typeof TOOLS)[number]["path"];

/**
 * What a card shows. A Tool card names only its path: the route reads the rest
 * from the catalog. The site card has no parameters.
 */
export type OgCard = { kind: "site" } | { kind: "tool"; path: ToolPath };

/** The query `parseOgRequest` reads back. */
const OgQuery = Schema.Struct({ tool: Schema.optional(Schema.String) });

const isToolPath = (value: string): value is ToolPath =>
  TOOLS.some((tool) => tool.path === value);

/** The card of a request that names no Tool. */
const SITE_CARD: OgCard = { kind: "site" };

/** The card a request asks for. A Tool the catalog does not know is the site. */
export const parseOgRequest = (url: string): OgCard => {
  const query = Schema.decodeUnknownSync(OgQuery)({
    tool: new URL(url).searchParams.get("tool") ?? undefined,
  });
  const path = query.tool ? `/${query.tool}` : "";
  return isToolPath(path) ? { kind: "tool", path } : SITE_CARD;
};

/** The `/api/og` URL for a card. `parseOgRequest` reads it back. */
export const ogImagePath = (card: OgCard = SITE_CARD) =>
  card.kind === "site" ? OG_PATH : `${OG_PATH}?tool=${card.path.slice(1)}`;

/**
 * A stable tag for one drawing.
 *
 * The card is a pure function of the catalog, so a tag over the drawing itself
 * is the cache key: change the copy and the feed's next request gets the new
 * card, with no version number to remember.
 */
export const ogEtagOf = (drawing: string) => {
  let hash = 5381;
  for (const char of drawing) {
    hash = (hash * 33 + (char.codePointAt(0) ?? 0)) % 4_294_967_296;
  }
  return `"${hash.toString(36)}"`;
};
