import { describe, expect, it } from "vitest";

import {
  OG_CACHE_CONTROL,
  OG_SIZE,
  ogEtagOf,
  ogImagePath,
  parseOgRequest,
} from "./og.params";

const url = (query = "") => `https://ritools.test/api/og${query}`;

describe("parseOgRequest", () => {
  it("asks for the site card when the request names no Tool", () => {
    expect(parseOgRequest(url())).toEqual({ kind: "site" });
  });

  it("asks for the card of a Tool the catalog knows", () => {
    expect(parseOgRequest(url("?tool=squeeze"))).toEqual({
      kind: "tool",
      path: "/squeeze",
    });
    expect(parseOgRequest(url("?tool=qraft"))).toEqual({
      kind: "tool",
      path: "/qraft",
    });
  });

  it("falls back to the site card for a Tool the catalog does not know", () => {
    expect(parseOgRequest(url("?tool=unknown"))).toEqual({ kind: "site" });
  });

  it("falls back to the site card for an empty Tool", () => {
    expect(parseOgRequest(url("?tool="))).toEqual({ kind: "site" });
  });
});

describe("ogImagePath", () => {
  it("names the site card", () => {
    expect(ogImagePath()).toBe("/api/og");
    expect(ogImagePath({ kind: "site" })).toBe("/api/og");
  });

  it("names the card of a Tool by its slug", () => {
    expect(ogImagePath({ kind: "tool", path: "/squeeze" })).toBe(
      "/api/og?tool=squeeze"
    );
    expect(ogImagePath({ kind: "tool", path: "/qraft" })).toBe(
      "/api/og?tool=qraft"
    );
  });

  it("reads back as the card it names", () => {
    expect(parseOgRequest(url("?tool=squeeze"))).toEqual({
      kind: "tool",
      path: "/squeeze",
    });
  });
});

describe("ogEtagOf", () => {
  it("is stable for one drawing", () => {
    expect(ogEtagOf("<svg/>")).toBe(ogEtagOf("<svg/>"));
  });

  it("changes when the drawing changes", () => {
    expect(ogEtagOf("<svg/>")).not.toBe(ogEtagOf("<svg />"));
  });

  it("is a quoted tag, so a header can carry it as it is", () => {
    expect(ogEtagOf("<svg/>")).toMatch(/^"[\da-z]+"$/u);
  });
});

describe("the card constants", () => {
  it("keeps the size the feeds crop least", () => {
    expect(OG_SIZE).toEqual({ height: 630, width: 1200 });
  });

  it("lets a feed hold a card for a day and reap it for a week", () => {
    expect(OG_CACHE_CONTROL).toContain("s-maxage=86400");
    expect(OG_CACHE_CONTROL).toContain("stale-while-revalidate=604800");
  });
});
