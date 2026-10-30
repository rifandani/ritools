import { describe, expect, it } from "vitest";

import { PALETTE } from "@/core/libs/brand/svg";

import { buildBrandWordmark } from "./og.wordmark";

const paths = (svg: string) => svg.match(/<path/gu) ?? [];

describe("buildBrandWordmark", () => {
  it("sets the name at its seam", () => {
    const mark = buildBrandWordmark("red");

    expect(paths(mark.content)).toHaveLength(8);
    expect(mark.width).toBeGreaterThan(0);
    expect(mark.height).toBeGreaterThan(0);
  });

  it("prints the slash in the brand red on paper", () => {
    expect(buildBrandWordmark("paper").content).toContain(
      `fill="${PALETTE.red}"`
    );
  });

  it("prints the slash in ink on the red field, where red would vanish", () => {
    const mark = buildBrandWordmark("red");

    expect(mark.content).not.toContain(`fill="${PALETTE.red}"`);
    expect(mark.content).toContain(`fill="${PALETTE.ink}"`);
    expect(mark.content).toContain(`fill="${PALETTE.paper}"`);
  });

  it("is the same mark every time", () => {
    expect(buildBrandWordmark("red").content).toBe(
      buildBrandWordmark("red").content
    );
  });
});
