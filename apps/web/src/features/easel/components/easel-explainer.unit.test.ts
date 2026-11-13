import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/features/i18n/use-translation", () => ({
  useTranslation: () => ({
    locale: "en-US",
    t: (key: string) => key,
  }),
}));

const { EaselExplainer } =
  await import("@/features/easel/components/easel-explainer");

const render = () => renderToStaticMarkup(createElement(EaselExplainer));

describe("EaselExplainer markup", () => {
  it("prints the comparison above the limits, then the questions and the disclaimer", () => {
    const markup = render();
    const comparison = markup.indexOf("easelCompareHeading");
    const limits = markup.indexOf("easelHonestyTitle");
    const questions = markup.indexOf("easelFaqHeading");
    const disclaimer = markup.indexOf("easelDisclaimerHeading");

    expect(comparison).toBeGreaterThan(-1);
    expect(comparison).toBeLessThan(limits);
    expect(limits).toBeLessThan(questions);
    expect(questions).toBeLessThan(disclaimer);

    for (const key of [
      "easelColPhotopea",
      "easelColPixlr",
      "easelColFotor",
      "easelColEasel",
      "easelRowCrop",
      "easelRowRedact",
      "easelCompareChecked",
      "easelCompareDisclaimer",
    ]) {
      expect(markup).toContain(key);
    }
    expect(markup).toContain('href="https://www.photopea.com/"');
    expect(markup).toContain('href="https://pixlr.com/editor/"');
    expect(markup).toContain('href="https://www.fotor.com/"');
  });
});
