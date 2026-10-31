import { describe, expect, it } from "vitest";

import {
  failedCheckOf,
  lostStructuresOf,
  repairedNameOf,
} from "./folio.repair";

describe("the repaired name", () => {
  it("replaces a PDF extension and keeps the stem", () => {
    expect(repairedNameOf("Report.PDF")).toBe("Report-repaired.pdf");
    expect(repairedNameOf("a.b.pdf")).toBe("a.b-repaired.pdf");
  });

  it("falls back to a document name", () => {
    expect(repairedNameOf("  ")).toBe("document-repaired.pdf");
  });

  it("keeps a long name under the file name cap and its extension", () => {
    const name = repairedNameOf(`${"a".repeat(140)}.pdf`);
    expect(name.length).toBe(100);
    expect(name.endsWith("-repaired.pdf")).toBe(true);
  });
});

const page = (sample: string, render = 1) => ({
  annotations: 0,
  chars: sample.length,
  height: 400,
  render,
  sample,
  width: 300,
});

describe("the copy checks", () => {
  const source = [page("Page one", 11), page("Page two", 22)];

  it("passes a copy that matches the source page by page", () => {
    expect(
      failedCheckOf(source, [page("Page one", 11), page("Page two", 22)])
    ).toBeNull();
  });

  it("fails a copy that did not open", () => {
    expect(failedCheckOf(source, null)).toBe("opens");
  });

  it("fails a copy without every page", () => {
    expect(failedCheckOf(source, [])).toBe("pages");
    expect(failedCheckOf(source, [page("Page one", 11)])).toBe("pages");
  });

  it("fails a copy that lost the text of a page", () => {
    expect(failedCheckOf(source, [page("Page one", 11), page("", 22)])).toBe(
      "text"
    );
  });

  it("passes a page that had no text in the source either", () => {
    expect(failedCheckOf([page("", 5)], [page("", 5)])).toBeNull();
  });

  it("fails a copy whose pages are in a different order", () => {
    expect(
      failedCheckOf(source, [page("Page two", 22), page("Page one", 11)])
    ).toBe("order");
  });

  it("fails a copy with a page of a different size", () => {
    expect(
      failedCheckOf(source, [
        { ...page("Page one", 11), width: 612 },
        page("Page two", 22),
      ])
    ).toBe("order");
  });

  it("fails a copy with a page that does not render or renders differently", () => {
    expect(
      failedCheckOf(source, [
        { ...page("Page one"), render: null },
        page("Page two", 22),
      ])
    ).toBe("render");
    expect(
      failedCheckOf(source, [page("Page one", 12), page("Page two", 22)])
    ).toBe("render");
  });
});

describe("the lost structures", () => {
  const structure = {
    attachments: 1,
    forms: true,
    javascript: 2,
    metadata: ["Title=Report"],
    outlines: true,
  };

  it("names nothing when the copy keeps every structure", () => {
    expect(
      lostStructuresOf([page("a")], structure, [page("a")], {
        ...structure,
        metadata: ["Title=Report", "Producer=PDFium"],
      })
    ).toEqual([]);
  });

  it("names each structure the copy dropped, in a fixed order", () => {
    expect(
      lostStructuresOf(
        [{ ...page("a"), annotations: 3 }],
        structure,
        [{ ...page("a"), annotations: 1 }],
        {
          attachments: 0,
          forms: false,
          javascript: 0,
          metadata: ["Producer=PDFium"],
          outlines: false,
        }
      )
    ).toEqual([
      "forms",
      "annotations",
      "outlines",
      "attachments",
      "javascript",
      "metadata",
    ]);
  });
});
