import { zipSync } from "fflate";

import { safeZipSegments, uniqueZipPath } from "@/core/libs/files";

import { folioCopyFileName } from "./folio.document-name";

/** The most pages one page-image export may hold. */
export const FOLIO_EXTRACT_MAX_PAGES = 100;

/** The pixel ceiling for one page-image export, across every page. */
export const FOLIO_EXTRACT_MAX_PIXELS = 80_000_000;

/** The pixel ceiling for one rendered page. */
export const FOLIO_EXTRACT_MAX_PAGE_PIXELS = 20_000_000;

/** The width of a standard page image, in pixels. */
export const FOLIO_EXTRACT_STANDARD_WIDTH = 1440;

/** The scale of a page image at twice the page's own width. */
export const FOLIO_EXTRACT_DOUBLE_SCALE = 2;

/** The text estimate for one page. */
export const FOLIO_EXTRACT_TEXT_BYTES_PER_PAGE = 2048;

/** The link estimate for one page. */
export const FOLIO_EXTRACT_LINK_BYTES_PER_PAGE = 256;

/** The page aspect ratio an image estimate assumes. */
export const FOLIO_EXTRACT_PAGE_ASPECT = 1.35;

/** The bytes per pixel a PNG estimate assumes. */
export const FOLIO_EXTRACT_PNG_BYTES_PER_PIXEL = 0.3;

/** The bytes per pixel a WebP estimate assumes. */
export const FOLIO_EXTRACT_WEBP_BYTES_PER_PIXEL = 0.12;

/** The width a 2x estimate assumes for one page. */
export const FOLIO_EXTRACT_DOUBLE_ESTIMATE_WIDTH = 1200;

/** The four independent exports. */
export type FolioExtractOutput = "attachments" | "links" | "pages" | "text";

/** The text output format. */
export type FolioExtractTextFormat = "json" | "txt";

/** The link output format. */
export type FolioExtractLinkFormat = "csv" | "json";

/** The page-image output format. */
export type FolioExtractImageFormat = "png" | "webp";

/** The page-image width choice. */
export type FolioExtractWidth = "double" | "standard";

/** The page scope. */
export type FolioExtractScope = "all" | "selected";

/** One page's text: `null` when the page has no searchable text. */
export interface FolioExtractPageText {
  readonly page: number;
  readonly text: string | null;
}

/** A link target, flattened to what a CSV or JSON reader needs. */
export interface FolioExtractLinkTarget {
  readonly detail: string;
  readonly kind:
    | "goto"
    | "goto-remote"
    | "javascript"
    | "launch"
    | "named"
    | "unsupported"
    | "uri";
  readonly page?: number | null;
  readonly uri?: string;
  readonly name?: string;
  readonly file?: string;
  readonly path?: string;
}

/** One link annotation, as the export writes it. */
export interface FolioExtractLink {
  readonly page: number;
  readonly rect: readonly [number, number, number, number];
  readonly subtype: "link";
  readonly target: FolioExtractLinkTarget;
}

/** A target as the engine reads it. Only the fields an export uses. */
export interface FolioExtractRawLinkTarget {
  readonly kind: string;
  readonly uri?: string;
  readonly name?: string;
  readonly file?: string;
  readonly path?: string;
  readonly destination?: {
    readonly page?: { readonly objectNumber?: number };
  };
}

/** One attachment, with its declared type and bytes. */
export interface FolioExtractAttachment {
  readonly bytes: Uint8Array;
  readonly mimeType: string | null;
  readonly name: string;
}

/** One file inside the Extract result. */
export interface FolioExtractArchiveFile {
  readonly bytes: Uint8Array;
  readonly path: string;
  /** Already-compressed bytes are stored, never deflated again. */
  readonly stored: boolean;
}

const pageDigits = (pageCount: number): number =>
  Math.max(3, String(Math.max(1, pageCount)).length);

/** The stable page stem: `page-001`, and wider when the document is wider. */
export const folioExtractPageStem = (
  index: number,
  pageCount: number
): string => `page-${String(index + 1).padStart(pageDigits(pageCount), "0")}`;

/** The stable path of one page's text file. */
export const folioExtractTextPath = (
  index: number,
  pageCount: number
): string => `text/${folioExtractPageStem(index, pageCount)}.txt`;

/** The stable path of the JSON text file. */
export const folioExtractTextJsonPath = "text/pages.json";

/** The stable path of one page image. */
export const folioExtractPagesPath = (
  index: number,
  pageCount: number,
  format: FolioExtractImageFormat
): string => `pages/${folioExtractPageStem(index, pageCount)}.${format}`;

/** The stable path of the links file. */
export const folioExtractLinksPath = (format: FolioExtractLinkFormat): string =>
  `links/links.${format}`;

/** The text file as JSON. A page with no text says so, never `""`. */
export const folioExtractTextPagesJson = (
  pages: readonly FolioExtractPageText[]
): string =>
  JSON.stringify(
    {
      pages: pages.map((page) => ({
        hasText: page.text !== null,
        page: page.page,
        text: page.text,
      })),
    },
    null,
    2
  );

/** How many files the text output writes. */
export const folioExtractTextFileCount = (
  pages: readonly FolioExtractPageText[],
  format: FolioExtractTextFormat
): number =>
  format === "json" ? 1 : pages.filter((page) => page.text !== null).length;

const CSV_SPECIAL = /[",\r\n]/u;

/** One CSV cell, quoted only when it must be. */
export const folioExtractCsvCell = (value: string): string =>
  CSV_SPECIAL.test(value) ? `"${value.replaceAll('"', '""')}"` : value;

/** The links as CSV, in the order they were read. */
export const folioExtractLinksCsv = (
  links: readonly FolioExtractLink[]
): string => {
  const header = "page,subtype,x1,y1,x2,y2,target,detail";
  const rows = links.map((link) =>
    [
      String(link.page),
      link.subtype,
      ...link.rect.map(String),
      link.target.kind,
      link.target.detail,
    ]
      .map((value) => folioExtractCsvCell(value))
      .join(",")
  );
  return [header, ...rows].join("\n");
};

/** The links as JSON, in the order they were read. */
export const folioExtractLinksJson = (
  links: readonly FolioExtractLink[]
): string => JSON.stringify({ links }, null, 2);

/**
 * Flatten an engine link target. A `goto` target becomes the displayed page
 * number when the caller knows it, or `null` when it does not.
 */
export const folioExtractLinkTarget = (
  target: FolioExtractRawLinkTarget,
  pageNumbers: ReadonlyMap<number, number>
): FolioExtractLinkTarget => {
  switch (target.kind) {
    case "uri": {
      const uri = target.uri ?? "";
      return { detail: uri, kind: "uri", uri };
    }
    case "goto": {
      const objectNumber = target.destination?.page?.objectNumber;
      const page =
        objectNumber === undefined
          ? null
          : (pageNumbers.get(objectNumber) ?? null);
      return {
        detail: page === null ? "" : String(page),
        kind: "goto",
        page,
      };
    }
    case "named": {
      const name = target.name ?? "";
      return { detail: name, kind: "named", name };
    }
    case "goto-remote": {
      const file = target.file ?? "";
      return { detail: file, file, kind: "goto-remote" };
    }
    case "launch": {
      const path = target.path ?? "";
      return { detail: path, kind: "launch", path };
    }
    case "javascript": {
      return { detail: "", kind: "javascript" };
    }
    default: {
      return { detail: "", kind: "unsupported" };
    }
  }
};

/**
 * The paths of the attachments in one archive. A name that climbs out of the
 * archive loses its hostile segments, and a repeat gets a number so no entry
 * overwrites another.
 */
export const folioExtractAttachmentPaths = (
  names: readonly string[]
): readonly string[] => {
  const taken = new Set<string>();
  return names.map((name) => {
    const segments = safeZipSegments(name);
    const leaf = segments.at(-1) ?? "attachment";
    const dot = leaf.lastIndexOf(".");
    const hasExtension = dot > 0 && dot < leaf.length - 1;
    const stem = hasExtension ? leaf.slice(0, dot) : leaf;
    const extension = hasExtension ? leaf.slice(dot) : "";
    return uniqueZipPath(
      ["attachments", ...segments.slice(0, -1)],
      stem,
      extension,
      taken
    );
  });
};

/** A path for the attachment manifest that no attachment uses. */
export const folioExtractAttachmentManifestPath = (
  paths: readonly string[]
): string => {
  const taken = new Set(paths.map((path) => path.toLowerCase()));
  return uniqueZipPath(["attachments"], "manifest", ".json", taken);
};

/** The attachment names, declared types, paths, and byte lengths. */
export const folioExtractAttachmentManifest = (
  attachments: readonly FolioExtractAttachment[],
  paths: readonly string[]
): string =>
  JSON.stringify(
    {
      attachments: attachments.map((attachment, index) => ({
        bytes: attachment.bytes.byteLength,
        mimeType: attachment.mimeType,
        name: attachment.name,
        path: paths[index] ?? "",
      })),
    },
    null,
    2
  );

/** Build the archive. Its entries keep the order they are given. */
export const folioExtractZip = (
  files: readonly FolioExtractArchiveFile[]
): Uint8Array =>
  zipSync(
    Object.fromEntries(
      files.map((file) => [
        file.path,
        [file.bytes, { level: file.stored ? 0 : 6 }],
      ])
    )
  );

/** The ZIP name for one document. */
export const folioExtractZipName = (name: string): string =>
  folioCopyFileName(name, "-extract.zip");

/** The name of a single-file result. */
export const folioExtractSingleName = (name: string, path: string): string => {
  const leaf = path.split("/").findLast(Boolean) ?? "extract";
  return path.startsWith("attachments/")
    ? leaf
    : folioCopyFileName(name, `-${leaf}`);
};

/** A size a person reads, in the given Locale. */
export { formatBytes as folioExtractFormatSize } from "@/core/utils/file-size";

/** The approximate bytes one output writes. Attachments are summed for real. */
export const folioExtractEstimateBytes = (
  output: FolioExtractOutput,
  pages: number,
  imageWidth: number,
  imageFormat: FolioExtractImageFormat
): number => {
  const count = Math.max(0, pages);
  switch (output) {
    case "text": {
      return count * FOLIO_EXTRACT_TEXT_BYTES_PER_PAGE;
    }
    case "links": {
      return count * FOLIO_EXTRACT_LINK_BYTES_PER_PAGE;
    }
    case "pages": {
      const pixels =
        count * imageWidth * imageWidth * FOLIO_EXTRACT_PAGE_ASPECT;
      return Math.round(
        pixels *
          (imageFormat === "png"
            ? FOLIO_EXTRACT_PNG_BYTES_PER_PIXEL
            : FOLIO_EXTRACT_WEBP_BYTES_PER_PIXEL)
      );
    }
    default: {
      return 0;
    }
  }
};

/** The render request for a width choice. */
export const folioExtractImageRequest = (
  width: FolioExtractWidth
): { readonly width: number } | { readonly scale: number } =>
  width === "standard"
    ? { width: FOLIO_EXTRACT_STANDARD_WIDTH }
    : { scale: FOLIO_EXTRACT_DOUBLE_SCALE };

/** Whether a page count is inside the page-image cap. */
export const folioExtractWithinPageCap = (pages: number): boolean =>
  pages > 0 && pages <= FOLIO_EXTRACT_MAX_PAGES;

/** A megapixel count for a person to read. */
export const folioExtractMegapixels = (pixels: number): number =>
  Math.round(pixels / 1_000_000);
