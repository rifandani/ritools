import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/features/i18n/use-translation", () => ({
  useTranslation: () => ({
    locale: "en-US",
    t: (key: string) => key,
  }),
}));

const { FolioExplainer } =
  await import("@/features/folio/components/folio-explainer");

const render = () => renderToStaticMarkup(createElement(FolioExplainer));

describe("FolioExplainer markup", () => {
  it("prints the comparison, the limits, the FAQ, and the disclaimer", () => {
    const markup = render();
    expect(markup).toContain("folioExplainerTitleLead");
    expect(markup).toContain("folioExplainerTitleAccent");
    expect(markup).toContain("folioCompareHeading");
    expect(markup).toContain("folioColILovePdf");
    expect(markup).toContain("folioColSmallpdf");
    expect(markup).toContain("folioColAdobeAcrobat");
    expect(markup).toContain("folioRowFormDesign");
    expect(markup).toContain("folioRowRedact");
    expect(markup).toContain("folioRowSign");
    expect(markup).toContain("folioRowProtect");
    expect(markup).toContain("folioRowAttachments");
    expect(markup).toContain("folioRowMeasure");
    expect(markup).toContain("folioHonestyTitle");
    expect(markup).toContain("folioHonestyBody");
    expect(markup).toContain("folioFaqHeading");
    expect(markup).toContain("folioFaqDownloadQ");
    expect(markup).toContain("folioDisclaimerHeading");
    expect(markup).toContain("folioCompareDisclaimer");
  });
});
