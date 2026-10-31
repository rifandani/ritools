import { unzipSync } from "fflate";
import { describe, expect, it } from "vitest";

import {
  FOLIO_EXTRACT_DOUBLE_SCALE,
  FOLIO_EXTRACT_LINK_BYTES_PER_PAGE,
  FOLIO_EXTRACT_MAX_PAGES,
  FOLIO_EXTRACT_PAGE_ASPECT,
  FOLIO_EXTRACT_PNG_BYTES_PER_PIXEL,
  FOLIO_EXTRACT_STANDARD_WIDTH,
  FOLIO_EXTRACT_TEXT_BYTES_PER_PAGE,
  FOLIO_EXTRACT_WEBP_BYTES_PER_PIXEL,
  folioExtractAttachmentManifest,
  folioExtractAttachmentManifestPath,
  folioExtractAttachmentPaths,
  folioExtractCsvCell,
  folioExtractEstimateBytes,
  folioExtractFormatSize,
  folioExtractImageRequest,
  folioExtractLinksCsv,
  folioExtractLinksJson,
  folioExtractLinksPath,
  folioExtractLinkTarget,
  folioExtractMegapixels,
  folioExtractPagesPath,
  folioExtractPageStem,
  folioExtractSingleName,
  folioExtractTextFileCount,
  folioExtractTextJsonPath,
  folioExtractTextPagesJson,
  folioExtractTextPath,
  folioExtractWithinPageCap,
  folioExtractZip,
  folioExtractZipName,
} from "./folio.extract";
import type {
  FolioExtractArchiveFile,
  FolioExtractLink,
} from "./folio.extract";

const encode = (value: string) => new TextEncoder().encode(value);

describe("stable page names", () => {
  it("pads a short document to three digits", () => {
    expect(folioExtractPageStem(0, 10)).toBe("page-001");
    expect(folioExtractPageStem(9, 10)).toBe("page-010");
  });

  it("grows past three digits with the document", () => {
    expect(folioExtractPageStem(999, 1000)).toBe("page-1000");
  });

  it("treats a page count of zero as one page", () => {
    expect(folioExtractPageStem(0, 0)).toBe("page-001");
  });

  it("names text, image, and link entries", () => {
    expect(folioExtractTextPath(0, 10)).toBe("text/page-001.txt");
    expect(folioExtractPagesPath(1, 10, "png")).toBe("pages/page-002.png");
    expect(folioExtractPagesPath(1, 10, "webp")).toBe("pages/page-002.webp");
    expect(folioExtractTextJsonPath).toBe("text/pages.json");
    expect(folioExtractLinksPath("csv")).toBe("links/links.csv");
    expect(folioExtractLinksPath("json")).toBe("links/links.json");
  });
});

describe("text export", () => {
  it("writes the page order and says which pages have no text", () => {
    const json = folioExtractTextPagesJson([
      { page: 1, text: "First" },
      { page: 2, text: null },
    ]);
    expect(JSON.parse(json)).toEqual({
      pages: [
        { hasText: true, page: 1, text: "First" },
        { hasText: false, page: 2, text: null },
      ],
    });
  });

  it("counts one JSON file or one file per text page", () => {
    const pages = [
      { page: 1, text: "First" },
      { page: 2, text: null },
    ];
    expect(folioExtractTextFileCount(pages, "json")).toBe(1);
    expect(folioExtractTextFileCount(pages, "txt")).toBe(1);
    expect(folioExtractTextFileCount([{ page: 1, text: null }], "txt")).toBe(0);
  });
});

const links: readonly FolioExtractLink[] = [
  {
    page: 1,
    rect: [10, 20, 110, 40],
    subtype: "link",
    target: { detail: "https://example.com/a,b", kind: "uri" },
  },
  {
    page: 2,
    rect: [0, 0, 5, 5],
    subtype: "link",
    target: { detail: "2", kind: "goto", page: 2 },
  },
];

describe("link export", () => {
  it("quotes a CSV cell only when it needs it", () => {
    expect(folioExtractCsvCell("plain")).toBe("plain");
    expect(folioExtractCsvCell("a,b")).toBe('"a,b"');
    expect(folioExtractCsvCell('a"b')).toBe('"a""b"');
    expect(folioExtractCsvCell("a\nb")).toBe('"a\nb"');
  });

  it("writes the page, rect, subtype, and target to CSV", () => {
    const csv = folioExtractLinksCsv(links);
    const rows = csv.split("\n");
    expect(rows[0]).toBe("page,subtype,x1,y1,x2,y2,target,detail");
    expect(rows[1]).toBe('1,link,10,20,110,40,uri,"https://example.com/a,b"');
    expect(rows[2]).toBe("2,link,0,0,5,5,goto,2");
  });

  it("writes a header and no rows when the document has no link", () => {
    expect(folioExtractLinksCsv([])).toBe(
      "page,subtype,x1,y1,x2,y2,target,detail"
    );
  });

  it("writes the same links to JSON", () => {
    expect(JSON.parse(folioExtractLinksJson(links))).toEqual({ links });
  });
});

describe("link targets", () => {
  const pageNumbers = new Map([
    [5, 2],
    [9, 3],
  ]);

  it("reads a URI", () => {
    expect(
      folioExtractLinkTarget(
        { kind: "uri", uri: "https://example.com" },
        pageNumbers
      )
    ).toEqual({
      detail: "https://example.com",
      kind: "uri",
      uri: "https://example.com",
    });
    expect(folioExtractLinkTarget({ kind: "uri" }, pageNumbers)).toEqual({
      detail: "",
      kind: "uri",
      uri: "",
    });
  });

  it("resolves a local destination to its displayed page", () => {
    expect(
      folioExtractLinkTarget(
        { destination: { page: { objectNumber: 5 } }, kind: "goto" },
        pageNumbers
      )
    ).toEqual({ detail: "2", kind: "goto", page: 2 });
  });

  it("leaves a destination page unknown when it cannot be resolved", () => {
    expect(
      folioExtractLinkTarget(
        { destination: { page: { objectNumber: 7 } }, kind: "goto" },
        pageNumbers
      )
    ).toEqual({ detail: "", kind: "goto", page: null });
    expect(folioExtractLinkTarget({ kind: "goto" }, pageNumbers)).toEqual({
      detail: "",
      kind: "goto",
      page: null,
    });
    expect(
      folioExtractLinkTarget(
        { destination: { page: {} }, kind: "goto" },
        pageNumbers
      )
    ).toEqual({ detail: "", kind: "goto", page: null });
  });

  it("reads a named action", () => {
    expect(
      folioExtractLinkTarget({ kind: "named", name: "NextPage" }, pageNumbers)
    ).toEqual({ detail: "NextPage", kind: "named", name: "NextPage" });
    expect(folioExtractLinkTarget({ kind: "named" }, pageNumbers)).toEqual({
      detail: "",
      kind: "named",
      name: "",
    });
  });

  it("reads a remote file", () => {
    expect(
      folioExtractLinkTarget(
        { file: "other.pdf", kind: "goto-remote" },
        pageNumbers
      )
    ).toEqual({
      detail: "other.pdf",
      file: "other.pdf",
      kind: "goto-remote",
    });
    expect(
      folioExtractLinkTarget({ kind: "goto-remote" }, pageNumbers)
    ).toEqual({ detail: "", file: "", kind: "goto-remote" });
  });

  it("reads a launch action", () => {
    expect(
      folioExtractLinkTarget({ kind: "launch", path: "/bin/true" }, pageNumbers)
    ).toEqual({ detail: "/bin/true", kind: "launch", path: "/bin/true" });
    expect(folioExtractLinkTarget({ kind: "launch" }, pageNumbers)).toEqual({
      detail: "",
      kind: "launch",
      path: "",
    });
  });

  it("names JavaScript and unknown targets without running them", () => {
    expect(folioExtractLinkTarget({ kind: "javascript" }, pageNumbers)).toEqual(
      {
        detail: "",
        kind: "javascript",
      }
    );
    expect(folioExtractLinkTarget({ kind: "other" }, pageNumbers)).toEqual({
      detail: "",
      kind: "unsupported",
    });
  });
});

describe("attachment entries", () => {
  it("keeps a simple name", () => {
    expect(folioExtractAttachmentPaths(["generated.txt"])).toEqual([
      "attachments/generated.txt",
    ]);
  });

  it("keeps a folder and drops a hostile path", () => {
    expect(folioExtractAttachmentPaths(["../a/file.txt", "..", ""])).toEqual([
      "attachments/a/file.txt",
      "attachments/attachment",
      "attachments/attachment-2",
    ]);
  });

  it("numbers a repeated name", () => {
    expect(
      folioExtractAttachmentPaths(["notes.txt", "notes.txt", "notes.txt"])
    ).toEqual([
      "attachments/notes.txt",
      "attachments/notes-2.txt",
      "attachments/notes-3.txt",
    ]);
  });

  it("keeps only the last extension", () => {
    expect(folioExtractAttachmentPaths(["archive.tar.gz"])).toEqual([
      "attachments/archive.tar.gz",
    ]);
    expect(folioExtractAttachmentPaths(["trailing."])).toEqual([
      "attachments/trailing.",
    ]);
    expect(folioExtractAttachmentPaths([".hidden"])).toEqual([
      "attachments/.hidden",
    ]);
  });

  it("finds a manifest path that no attachment uses", () => {
    expect(folioExtractAttachmentManifestPath([])).toBe(
      "attachments/manifest.json"
    );
    expect(
      folioExtractAttachmentManifestPath(["attachments/manifest.json"])
    ).toBe("attachments/manifest-2.json");
  });

  it("lists every attachment's name, type, path, and length", () => {
    const manifest = JSON.parse(
      folioExtractAttachmentManifest(
        [
          {
            bytes: encode("hello"),
            mimeType: "text/plain",
            name: "notes.txt",
          },
          { bytes: encode(""), mimeType: null, name: "empty" },
        ],
        ["attachments/notes.txt", "attachments/empty"]
      )
    );
    expect(manifest).toEqual({
      attachments: [
        {
          bytes: 5,
          mimeType: "text/plain",
          name: "notes.txt",
          path: "attachments/notes.txt",
        },
        {
          bytes: 0,
          mimeType: null,
          name: "empty",
          path: "attachments/empty",
        },
      ],
    });
    const missing = JSON.parse(
      folioExtractAttachmentManifest(
        [{ bytes: encode("x"), mimeType: null, name: "x" }],
        []
      )
    );
    expect(missing.attachments[0].path).toBe("");
  });
});

describe("the archive", () => {
  it("keeps the given order and stores binary entries", () => {
    const files: readonly FolioExtractArchiveFile[] = [
      { bytes: encode("one"), path: "text/page-001.txt", stored: false },
      { bytes: encode("two"), path: "text/page-002.txt", stored: false },
      { bytes: encode("png"), path: "pages/page-001.png", stored: true },
    ];
    const archive = folioExtractZip(files);
    const entries = unzipSync(archive);
    expect(Object.keys(entries)).toEqual([
      "text/page-001.txt",
      "text/page-002.txt",
      "pages/page-001.png",
    ]);
    expect(new TextDecoder().decode(entries["text/page-001.txt"])).toBe("one");
    expect(new TextDecoder().decode(entries["pages/page-001.png"])).toBe("png");
  });

  it("names the archive and a single output", () => {
    expect(folioExtractZipName("Report.PDF")).toBe("Report-extract.zip");
    expect(folioExtractZipName("  ")).toBe("document-extract.zip");
    expect(folioExtractSingleName("Report.PDF", "links/links.csv")).toBe(
      "Report-links.csv"
    );
    expect(folioExtractSingleName("Report.PDF", "text/page-001.txt")).toBe(
      "Report-page-001.txt"
    );
    expect(
      folioExtractSingleName("Report.PDF", "attachments/folder/notes.txt")
    ).toBe("notes.txt");
    expect(folioExtractSingleName("Report.PDF", "")).toBe("Report-extract");
  });
});

describe("sizes and caps", () => {
  it("reads a byte count in the chosen Locale", () => {
    expect(folioExtractFormatSize(0, "en-US")).toBe("0 B");
    expect(folioExtractFormatSize(999, "en-US")).toBe("999 B");
    expect(folioExtractFormatSize(1000, "en-US")).toBe("1 KB");
    expect(folioExtractFormatSize(1500, "en-US")).toBe("1.5 KB");
    expect(folioExtractFormatSize(1_500_000, "en-US")).toBe("1.5 MB");
    expect(folioExtractFormatSize(1_500_000_000, "en-US")).toBe("1.5 GB");
    expect(folioExtractFormatSize(-4, "en-US")).toBe("0 B");
  });

  it("estimates each output", () => {
    expect(folioExtractEstimateBytes("text", 4, 1440, "png")).toBe(
      4 * FOLIO_EXTRACT_TEXT_BYTES_PER_PAGE
    );
    expect(folioExtractEstimateBytes("links", 4, 1440, "png")).toBe(
      4 * FOLIO_EXTRACT_LINK_BYTES_PER_PAGE
    );
    expect(folioExtractEstimateBytes("attachments", 4, 1440, "png")).toBe(0);
    const pixels =
      2 *
      FOLIO_EXTRACT_STANDARD_WIDTH *
      FOLIO_EXTRACT_STANDARD_WIDTH *
      FOLIO_EXTRACT_PAGE_ASPECT;
    expect(folioExtractEstimateBytes("pages", 2, 1440, "png")).toBe(
      Math.round(pixels * FOLIO_EXTRACT_PNG_BYTES_PER_PIXEL)
    );
    expect(folioExtractEstimateBytes("pages", 2, 1440, "webp")).toBe(
      Math.round(pixels * FOLIO_EXTRACT_WEBP_BYTES_PER_PIXEL)
    );
    expect(folioExtractEstimateBytes("text", -2, 1440, "png")).toBe(0);
  });

  it("builds the standard and double render requests", () => {
    expect(folioExtractImageRequest("standard")).toEqual({
      width: FOLIO_EXTRACT_STANDARD_WIDTH,
    });
    expect(folioExtractImageRequest("double")).toEqual({
      scale: FOLIO_EXTRACT_DOUBLE_SCALE,
    });
  });

  it("refuses an empty or oversized page selection", () => {
    expect(folioExtractWithinPageCap(0)).toBe(false);
    expect(folioExtractWithinPageCap(1)).toBe(true);
    expect(folioExtractWithinPageCap(FOLIO_EXTRACT_MAX_PAGES)).toBe(true);
    expect(folioExtractWithinPageCap(FOLIO_EXTRACT_MAX_PAGES + 1)).toBe(false);
  });

  it("rounds a pixel count to megapixels", () => {
    expect(folioExtractMegapixels(80_000_000)).toBe(80);
    expect(folioExtractMegapixels(2_680_000)).toBe(3);
  });
});
