import { describe, expect, it, vi } from "vitest";

import {
  buildSeoHead,
  buildSeoMeta,
  buildStructuredData,
  ldParams,
  resolveOgImage,
} from "./seo";

vi.mock("@/core/config/env", () => ({
  APP_CONFIG: {
    url: "https://web.test",
  },
}));

vi.mock("@/core/constants/global", () => ({
  APP_NAME: "Test App",
}));

/** `content` of the tag with this `name` or `property`. */
const contentOf = (meta: ReturnType<typeof buildSeoMeta>, key: string) =>
  meta.find((tag) => tag?.name === key || tag?.property === key)?.content;

describe("resolveOgImage", () => {
  it("defaults to the packaged og image", () => {
    expect(resolveOgImage()).toBe("https://web.test/og.png");
  });

  it("absolutizes a relative path against the app origin", () => {
    expect(resolveOgImage("/custom.png")).toBe("https://web.test/custom.png");
  });

  it("leaves an already absolute url alone", () => {
    expect(resolveOgImage("https://cdn.test/x.png")).toBe(
      "https://cdn.test/x.png"
    );
  });
});

describe("ldParams", () => {
  it("carries the app identity used by both schema.org nodes", () => {
    expect(ldParams).toEqual({
      author: { name: "Tri Rizeki Rifandani", url: "https://web.test" },
      inLanguage: ["en-US", "id-ID"],
      name: "Test App",
      url: "https://web.test",
    });
  });
});

describe("buildSeoMeta", () => {
  it("brands the title and mirrors it across og and twitter tags", () => {
    const meta = buildSeoMeta({
      description: "Welcome",
      path: "/cards",
      title: "Home",
    });

    expect(meta).toContainEqual({ title: "Home | Test App" });
    expect(contentOf(meta, "description")).toBe("Welcome");
    expect(contentOf(meta, "apple-mobile-web-app-title")).toBe(
      "Home | Test App"
    );
    expect(contentOf(meta, "og:title")).toBe("Home | Test App");
    expect(contentOf(meta, "og:description")).toBe("Welcome");
    expect(contentOf(meta, "og:url")).toBe("https://web.test/cards");
    expect(contentOf(meta, "og:image")).toBe("https://web.test/og.png");
    expect(contentOf(meta, "twitter:title")).toBe("Home | Test App");
    expect(contentOf(meta, "twitter:image")).toBe("https://web.test/og.png");
  });

  it("falls back to the app name, template description, and origin", () => {
    const meta = buildSeoMeta();

    expect(meta).toContainEqual({ title: "Test App" });
    expect(contentOf(meta, "description")).toBe(
      "a browser-based MMO collectible/trading-card strategy game"
    );
    expect(contentOf(meta, "og:url")).toBe("https://web.test/");
  });

  it("absolutizes a caller-supplied image path", () => {
    const meta = buildSeoMeta({ image: "/post.png", title: "Post" });

    expect(contentOf(meta, "og:image")).toBe("https://web.test/post.png");
    expect(contentOf(meta, "twitter:image")).toBe("https://web.test/post.png");
  });

  it("emits each name/property once, so a child route can override it", () => {
    const keys = buildSeoMeta({ title: "Home" })
      .map((tag) => tag?.name ?? tag?.property)
      .filter(Boolean);

    expect(new Set(keys).size).toBe(keys.length);
  });
});

describe("buildStructuredData", () => {
  it("describes the site and the page in one JSON-LD graph", () => {
    expect(
      buildStructuredData({
        description: "Welcome",
        path: "/",
        title: "Home",
      })
    ).toEqual({
      "@context": "https://schema.org",
      "@graph": [
        { ...ldParams, "@type": "WebSite", description: "Welcome" },
        {
          ...ldParams,
          "@type": "WebPage",
          description: "Welcome",
          name: "Home | Test App",
          url: "https://web.test/",
        },
      ],
    });
  });
});

describe("buildSeoHead", () => {
  it("pairs the page meta with one JSON-LD script of the same page", () => {
    const input = { description: "Welcome", title: "Home" };
    const head = buildSeoHead(input);

    expect(head.meta).toEqual(buildSeoMeta(input));
    expect(head.scripts).toHaveLength(1);
    expect(head.scripts[0]?.type).toBe("application/ld+json");
    expect(JSON.parse(head.scripts[0]?.children ?? "")).toEqual(
      buildStructuredData(input)
    );
  });

  it("escapes `<` so data cannot close the script element", () => {
    const { scripts } = buildSeoHead({ title: "</script><b>x" });

    expect(scripts[0]?.children).not.toContain("<");
    expect(JSON.parse(scripts[0]?.children ?? "")["@graph"][1].name).toBe(
      "</script><b>x | Test App"
    );
  });
});
