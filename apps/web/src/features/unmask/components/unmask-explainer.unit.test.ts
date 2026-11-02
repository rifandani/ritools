import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/features/i18n/use-translation", () => ({
  useTranslation: () => ({
    locale: "en-US",
    t: (key: string) => key,
  }),
}));

const { UnmaskExplainer } =
  await import("@/features/unmask/components/unmask-explainer");

const render = () => renderToStaticMarkup(createElement(UnmaskExplainer));

describe("UnmaskExplainer markup", () => {
  it("prints the title, the description, the comparison, the FAQ, and the disclaimer", () => {
    const markup = render();
    expect(markup).toContain("unmaskExplainerTitleLead");
    expect(markup).toContain("unmaskExplainerTitleAccent");
    expect(markup).toContain("unmaskExplainerTitleBridge");
    expect(markup).toContain("unmaskExplainerTitleTail");
    expect(markup).toContain("unmaskExplainerLede");
    expect(markup).toContain("unmaskExplainerIntro");
    expect(markup).toContain("unmaskHonestyTitle");
    expect(markup).toContain("unmaskHonestyBody");
    expect(markup).toContain("unmaskCompareHeading");
    expect(markup).toContain("unmaskFaqHeading");
    expect(markup).toContain("unmaskFaqMatteQuestion");
    expect(markup).toContain("unmaskDisclaimerHeading");
    expect(markup).toContain("unmaskDisclaimer");
  });
});
