import { readFile } from "node:fs/promises";
import path from "node:path";

import { describe, expect, it } from "vitest";

import {
  folioFlattenFlagsRefusal,
  folioFlattenHasLayers,
  folioFlattenInteractiveNames,
  folioFlattenKeepsText,
  folioFlattenLostInk,
  folioFlattenName,
  folioFlattenPages,
  folioFlattenRefusal,
  folioFlattenSelectedIndexes,
} from "./folio.flatten";

describe("folioFlattenName", () => {
  it("adds -flat to the stem of the open file", () => {
    expect(folioFlattenName("contract.pdf")).toBe("contract-flat.pdf");
  });

  it("keeps a name that has no PDF extension", () => {
    expect(folioFlattenName("ticket")).toBe("ticket-flat.pdf");
    expect(folioFlattenName("SCAN.PDF")).toBe("SCAN-flat.pdf");
  });

  it("names an unnamed file", () => {
    expect(folioFlattenName("  ")).toBe("document-flat.pdf");
  });

  it("keeps a long name under the file name cap and its extension", () => {
    const name = folioFlattenName(`${"a".repeat(140)}.pdf`);
    expect(name.length).toBe(100);
    expect(name.endsWith("-flat.pdf")).toBe(true);
  });
});

describe("folioFlattenPages", () => {
  it("takes every page in order for the whole document", () => {
    expect(folioFlattenPages("all", 4, new Set([2]))).toEqual([0, 1, 2, 3]);
  });

  it("takes the selected pages in page order", () => {
    expect(folioFlattenPages("selected", 5, new Set([3, 0, 2]))).toEqual([
      0, 2, 3,
    ]);
  });

  it("drops a selected page that the document no longer has", () => {
    expect(folioFlattenPages("selected", 2, new Set([1, 4]))).toEqual([1]);
  });
});

describe("folioFlattenSelectedIndexes", () => {
  it("takes the reader's pages in order and drops a page the document lost", () => {
    expect(folioFlattenSelectedIndexes([2, -1, 4, 0], 3)).toEqual([0, 2]);
  });

  it("keeps no page when the reader selected none", () => {
    expect(folioFlattenSelectedIndexes([], 3)).toEqual([]);
  });
});

describe("folioFlattenRefusal", () => {
  const open = { canDownload: true, encrypted: false, signed: false };

  it("allows an open file with a download right", () => {
    expect(folioFlattenRefusal(open)).toBeNull();
  });

  it("names the reason for each read-only file", () => {
    expect(folioFlattenRefusal({ ...open, encrypted: true })).toBe("encrypted");
    expect(folioFlattenRefusal({ ...open, signed: true })).toBe("signed");
    expect(folioFlattenRefusal({ ...open, canDownload: false })).toBe(
      "restricted"
    );
  });

  it("names encryption first, then the signature", () => {
    expect(
      folioFlattenRefusal({ canDownload: false, encrypted: true, signed: true })
    ).toBe("encrypted");
    expect(
      folioFlattenRefusal({
        canDownload: false,
        encrypted: false,
        signed: true,
      })
    ).toBe("signed");
  });
});

describe("folioFlattenFlagsRefusal", () => {
  const open = { encrypted: false, restricted: false, signed: false };

  it("allows flags that forbid nothing", () => {
    expect(folioFlattenFlagsRefusal(open)).toBeNull();
  });

  it("names the same reasons for the panel's flags", () => {
    expect(folioFlattenFlagsRefusal({ ...open, encrypted: true })).toBe(
      "encrypted"
    );
    expect(folioFlattenFlagsRefusal({ ...open, signed: true })).toBe("signed");
    expect(folioFlattenFlagsRefusal({ ...open, restricted: true })).toBe(
      "restricted"
    );
  });

  it("names encryption first, then the signature, then the restriction", () => {
    expect(
      folioFlattenFlagsRefusal({
        encrypted: true,
        restricted: true,
        signed: true,
      })
    ).toBe("encrypted");
    expect(
      folioFlattenFlagsRefusal({
        encrypted: false,
        restricted: true,
        signed: true,
      })
    ).toBe("signed");
  });
});

const pdf = (body: string) => new TextEncoder().encode(`%PDF-1.7\n${body}`);

describe("folioFlattenInteractiveNames", () => {
  it("finds nothing in a copy with page content only", () => {
    expect(
      folioFlattenInteractiveNames(
        pdf("1 0 obj\n<</Type /Catalog /Pages 2 0 R>>\nendobj")
      )
    ).toEqual([]);
  });

  it("names each interactive entry that is left, once, in list order", () => {
    expect(
      folioFlattenInteractiveNames(
        pdf(
          "<</Type/Catalog/AcroForm 3 0 R/OpenAction<</S/JavaScript>>/Names<</EmbeddedFiles 4 0 R>>>>\n<</Annots[5 0 R]/AA<<>>>>\n<</Subtype /Widget>><</Annots[]>>"
        )
      )
    ).toEqual([
      "AcroForm",
      "Widget",
      "Annots",
      "OpenAction",
      "JavaScript",
      "EmbeddedFiles",
      "AA",
    ]);
  });

  it("does not match a longer name that starts the same way", () => {
    expect(
      folioFlattenInteractiveNames(pdf("<</AAPL 1 /Annotsx 2 /JSON 3>>"))
    ).toEqual([]);
  });

  it("finds files associated with the document", () => {
    expect(
      folioFlattenInteractiveNames(pdf("<</Type/Catalog/AF[6 0 R]>>"))
    ).toEqual(["AF"]);
  });

  it("finds outlines, structure tags, links, and media", () => {
    expect(
      folioFlattenInteractiveNames(
        pdf(
          "<</Outlines 2 0 R/StructTreeRoot 3 0 R>>(x)<</S/URI/URI(a)>>/RichMedia%c\n/Launch"
        )
      )
    ).toEqual(["Outlines", "StructTreeRoot", "URI", "Launch", "RichMedia"]);
  });
});

describe("folioFlattenHasLayers", () => {
  it("finds a layer that the pages use", () => {
    expect(folioFlattenHasLayers(pdf("<</Type /OCG /Name (Notes)>>"))).toBe(
      true
    );
    expect(folioFlattenHasLayers(pdf("<</Type/OCMD/OCGs[4 0 R]>>"))).toBe(true);
  });

  it("finds no layer in a copy without optional content", () => {
    expect(folioFlattenHasLayers(pdf("<</Type /Page /OCGx 1>>"))).toBe(false);
  });

  it("finds the layer in the layers fixture", async () => {
    const bytes = new Uint8Array(
      await readFile(path.join(import.meta.dirname, "fixtures", "layers.pdf"))
    );
    expect(folioFlattenHasLayers(bytes)).toBe(true);
  });
});

describe("folioFlattenKeepsText", () => {
  it("keeps text when the copy adds painted form values", () => {
    expect(
      folioFlattenKeepsText(
        "All simple field types",
        "All simple field types\r\ndraft alpha\r\none"
      )
    ).toBe(true);
  });

  it("ignores white space that the text reader adds or drops", () => {
    expect(
      folioFlattenKeepsText("Your name\r\nI review", "Your nameI\nreview")
    ).toBe(true);
  });

  it("keeps a page with no text", () => {
    expect(folioFlattenKeepsText("", "")).toBe(true);
  });

  it("finds lost text", () => {
    expect(folioFlattenKeepsText("Page alpha", "Page")).toBe(false);
  });

  it("finds text in the wrong order", () => {
    expect(folioFlattenKeepsText("Page 1 Page 2", "Page 2 Page 1")).toBe(false);
  });
});

describe("folioFlattenLostInk", () => {
  const white = 255;
  const black = 0;

  it("loses nothing when the copy draws the same page", () => {
    const page = Uint8Array.of(black, white, black, white);
    expect(folioFlattenLostInk(page, page)).toBe(0);
  });

  it("loses nothing when the copy paints more, such as a form value", () => {
    expect(
      folioFlattenLostInk(
        Uint8Array.of(black, white, white, white),
        Uint8Array.of(black, black, black, white)
      )
    ).toBe(0);
  });

  it("gives the part of the source ink that went white", () => {
    expect(
      folioFlattenLostInk(
        Uint8Array.of(black, black, black, black),
        Uint8Array.of(black, white, white, black)
      )
    ).toBe(0.5);
  });

  it("does not count a mark that only went lighter", () => {
    expect(
      folioFlattenLostInk(Uint8Array.of(black, 100), Uint8Array.of(150, 200))
    ).toBe(0);
  });

  it("loses nothing on a blank page", () => {
    expect(
      folioFlattenLostInk(
        Uint8Array.of(white, white),
        Uint8Array.of(white, white)
      )
    ).toBe(0);
  });

  it("counts every source mark as lost when the sizes differ", () => {
    expect(
      folioFlattenLostInk(Uint8Array.of(black, white), Uint8Array.of(black))
    ).toBe(1);
  });
});
