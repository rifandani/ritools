import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/features/i18n/use-translation", () => ({
  useTranslation: () => ({
    locale: "en-US",
    t: (key: string) => key,
  }),
}));

const { QuillExplainer } =
  await import("@/features/quill/components/quill-explainer");

const render = () => renderToStaticMarkup(createElement(QuillExplainer));

describe("QuillExplainer markup", () => {
  it("prints the title, the comparison and its sources, the limits, the FAQ, and the disclaimer", () => {
    const markup = render();
    for (const key of [
      "quillExplainerTitleLead",
      "quillExplainerTitleAccent",
      "quillExplainerTitleBridge",
      "quillExplainerTitleTail",
      "quillExplainerLede",
      "quillExplainerIntro",
      "quillCompareHeading",
      "quillColHackmd",
      "quillColNotion",
      "quillColTypora",
      "quillCompareChecked",
      "quillHonestyTitle",
      "quillHonestyBody",
      "quillFaqHeading",
      "quillFaqWhereQuestion",
      "quillDisclaimerHeading",
      "quillDisclaimer",
    ]) {
      expect(markup).toContain(key);
    }
    expect(markup).toContain('href="https://hackmd.io/pricing"');
    expect(markup).toContain('href="https://www.notion.com/pricing"');
    expect(markup).toContain('href="https://store.typora.io/"');
  });
});
