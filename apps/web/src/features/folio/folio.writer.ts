/* oxlint-disable eslint/max-classes-per-file, anti-slop/no-unknown-parameters, typescript/no-non-null-assertion, anti-slop/require-safety-comment-for-type-assertion, eslint/custom-error-definition, complexity, eslint/no-array-for-each, eslint/prefer-named-capture-group, unicorn/no-array-reverse, react-doctor/js-set-map-lookups, anti-slop/no-conditional-empty-object-spread, react-doctor/js-combine-iterations -- pdf-lib page and form structures are checked by the boundary before each low-level access; the adapter keeps the library types private. */
import type { PDFField, PDFFont, PDFObject } from "pdf-lib";
import {
  EncryptedPDFError,
  degrees,
  PDFArray,
  PDFCheckBox,
  PDFDict,
  PDFDocument,
  PDFDropdown,
  PDFHexString,
  PDFName,
  PDFOptionList,
  PDFPage,
  PDFRadioGroup,
  PDFRef,
  PDFString,
  PDFTextField,
  StandardFonts,
} from "pdf-lib";
import * as pdfLib from "pdf-lib";
import type PDFObjectCopierType from "pdf-lib/es/core/PDFObjectCopier";

import type {
  Angle,
  Annotation,
  Box,
  FormField,
  FormValue,
  Page,
  PageId,
  Reason,
} from "./folio";

export type WriterErrorCode =
  | "invalid-pdf"
  | "no-pages"
  | "read-only"
  | "read-only-field"
  | "unsupported-form"
  | "unsupported-glyph"
  | "unsupported-preservation"
  | "source-rejected"
  | "unknown-page"
  | "unknown-field"
  | "unknown-annotation"
  | "invalid-selection"
  | "last-page"
  | "write-failed";

export class WriterError extends Error {
  readonly code: WriterErrorCode;
  readonly reason: Reason | null;

  constructor(code: WriterErrorCode, reason: Reason | null = null) {
    super(code);
    this.name = "FolioWriterError";
    this.code = code;
    this.reason = reason;
  }
}

// SAFETY: `pdf-lib` re-exports its core namespace at runtime, but the published
// declaration entry omits `PDFObjectCopier`. Take the copy from the same module
// instance as every other pdf-lib import so its `instanceof` checks match.
const { PDFObjectCopier } = pdfLib as typeof pdfLib & {
  readonly PDFObjectCopier: typeof PDFObjectCopierType;
};

const N = PDFName.of;
const lookup = (doc: PDFDocument, value: PDFObject) =>
  doc.context.lookup(value);
const values = (array: PDFArray | undefined): PDFObject[] =>
  array ? array.asArray() : [];

export const loadWriter = async (bytes: Uint8Array): Promise<PDFDocument> => {
  try {
    return await PDFDocument.load(bytes, {
      updateMetadata: false,
      throwOnInvalidObject: true,
    });
  } catch (error) {
    if (error instanceof EncryptedPDFError) {
      throw new WriterError("read-only", "encrypted");
    }
    throw new WriterError("invalid-pdf");
  }
};

export const saveWriter = (doc: PDFDocument): Promise<Uint8Array> =>
  doc.save({
    useObjectStreams: true,
    updateFieldAppearances: false,
    addDefaultPage: false,
  });

const isName = (value: PDFObject | undefined, name: string) =>
  value instanceof PDFName && value.asString() === name;

const isArray = (value: PDFObject | undefined): value is PDFArray =>
  value instanceof PDFArray;

const textOf = (value: PDFObject | undefined): string | null => {
  if (value instanceof PDFHexString || value instanceof PDFString) {
    return value.decodeText();
  }
  return null;
};

const numberArray = (value: PDFObject | undefined): number[] => {
  if (!isArray(value)) {
    return [];
  }
  return values(value).flatMap((item) =>
    item instanceof PDFName ? [] : [Number(item.toString())]
  );
};

/** Walk the complete indirect object graph and name every protected structure. */
export const inspectWriter = (doc: PDFDocument): Reason[] => {
  const reasons = new Set<Reason>();
  const visited = new Set<PDFObject>();
  const walk = (value: PDFObject | undefined) => {
    if (!value || visited.has(value)) {
      return;
    }
    visited.add(value);
    if (value instanceof PDFArray) {
      for (const item of value.asArray()) {
        walk(lookup(doc, item));
      }
      return;
    }
    if (value instanceof PDFRef) {
      walk(lookup(doc, value));
      return;
    }
    if (!(value instanceof PDFDict)) {
      return;
    }
    const type = value.get(N("Type"))?.toString();
    const subtype = value.get(N("Subtype"))?.toString();
    const fieldType = value.get(N("FT"))?.toString();
    if (type === "/Sig" || fieldType === "/Sig" || value.has(N("ByteRange"))) {
      reasons.add("signed");
    }
    if (value.has(N("XFA"))) {
      reasons.add("xfa");
    }
    if (
      value.has(N("AA")) ||
      value.has(N("JS")) ||
      value.has(N("CO")) ||
      [
        "/JavaScript",
        "/Launch",
        "/SubmitForm",
        "/ImportData",
        "/GoToR",
        "/Rendition",
        "/RichMediaExecute",
        "/Sound",
        "/Movie",
      ].includes(value.get(N("S"))?.toString() ?? "")
    ) {
      reasons.add("active-content");
    }
    if (value.has(N("StructTreeRoot")) || value.has(N("StructParents"))) {
      reasons.add("tags");
    }
    if (value.has(N("OCProperties")) || type === "/OCG") {
      reasons.add("layers");
    }
    if (
      type === "/Filespec" ||
      (value.has(N("Names")) && value.has(N("EmbeddedFiles")))
    ) {
      reasons.add("attachments");
    }
    if (
      type === "/Annot" &&
      subtype !== undefined &&
      ![
        "/Text",
        "/Highlight",
        "/Ink",
        "/FreeText",
        "/Link",
        "/Widget",
        "/Popup",
      ].includes(subtype)
    ) {
      reasons.add("unsupported-annotation");
    }
    for (const [, item] of value.entries()) {
      walk(lookup(doc, item));
    }
  };
  for (const [, value] of doc.context.enumerateIndirectObjects()) {
    walk(value);
  }
  if (doc.catalog.has(N("Perms"))) {
    reasons.add("permission-restricted");
  }
  const acro = doc.catalog.lookupMaybe(N("AcroForm"), PDFDict);
  if (acro?.has(N("XFA"))) {
    reasons.add("xfa");
  }
  return [...reasons];
};

const CATALOG_KEYS = new Set([
  "Type",
  "Pages",
  "Metadata",
  "ViewerPreferences",
  "Lang",
  "PageLayout",
  "PageMode",
  "AcroForm",
  "Outlines",
  "Names",
  "PageLabels",
  "Perms",
  "StructTreeRoot",
  "MarkInfo",
  "OCProperties",
  "OutputIntents",
  "PieceInfo",
  "Legal",
  "Collection",
  "NeedsRendering",
  "DSS",
  "Extensions",
  "Version",
  "OpenAction",
  "Threads",
  "SpiderInfo",
]);

const PAGE_KEYS = new Set([
  "Type",
  "Parent",
  "MediaBox",
  "CropBox",
  "BleedBox",
  "TrimBox",
  "ArtBox",
  "Rotate",
  "UserUnit",
  "Contents",
  "Resources",
  "Annots",
  "Metadata",
  "Group",
  "Tabs",
  "StructParents",
  "LastModified",
  "PieceInfo",
]);

/** Fail closed on catalog, page-tree, and page dictionaries outside the v1 boundary. */
export const inspectStructure = (doc: PDFDocument): Reason[] => {
  const reasons = new Set<Reason>();
  const { catalog } = doc;
  if (!isName(catalog.get(N("Type")), "/Catalog")) {
    reasons.add("unknown-structure");
  }
  for (const [key] of catalog.entries()) {
    if (!CATALOG_KEYS.has(key.asString().slice(1))) {
      reasons.add("unknown-structure");
    }
  }
  const seen = new Set<PDFDict>();
  const walk = (dict: PDFDict, depth: number) => {
    if (seen.has(dict) || depth > 64) {
      reasons.add("unknown-structure");
      return;
    }
    seen.add(dict);
    const type = dict.get(N("Type"))?.toString();
    if (type === "/Pages") {
      for (const [key] of dict.entries()) {
        if (
          ![
            "Type",
            "Parent",
            "Kids",
            "Count",
            "Resources",
            "MediaBox",
            "CropBox",
            "Rotate",
            "UserUnit",
          ].includes(key.asString().slice(1))
        ) {
          reasons.add("unknown-structure");
        }
      }
      const kids = dict.lookupMaybe(N("Kids"), PDFArray);
      for (const kid of values(kids)) {
        const child = lookup(doc, kid);
        if (child instanceof PDFDict) {
          walk(child, depth + 1);
        } else {
          reasons.add("unknown-structure");
        }
      }
      return;
    }
    if (type === "/Page") {
      for (const [key] of dict.entries()) {
        if (!PAGE_KEYS.has(key.asString().slice(1))) {
          reasons.add("unknown-structure");
        }
      }
    }
  };
  const root = catalog.lookupMaybe(N("Pages"), PDFDict);
  if (root) {
    walk(root, 0);
  }
  const acro = catalog.lookupMaybe(N("AcroForm"), PDFDict);
  if (acro) {
    for (const [key] of acro.entries()) {
      if (
        ![
          "Fields",
          "DR",
          "DA",
          "NeedAppearances",
          "SigFlags",
          "XFA",
          "CO",
        ].includes(key.asString().slice(1))
      ) {
        reasons.add("unknown-structure");
      }
    }
  }
  return [...reasons];
};

export const orderBlockers = (doc: PDFDocument): Reason[] => {
  const reasons = new Set<Reason>();
  if (
    doc.catalog.has(N("Outlines")) ||
    doc.catalog.has(N("Names")) ||
    doc.catalog.has(N("PageLabels"))
  ) {
    reasons.add("unsupported-preservation");
  }
  for (const page of doc.getPages()) {
    const annots = page.node.Annots();
    for (const ref of values(annots)) {
      const annot = lookup(doc, ref);
      if (!(annot instanceof PDFDict)) {
        continue;
      }
      if (annot.get(N("Subtype"))?.toString() !== "/Link") {
        continue;
      }
      if (annot.has(N("Dest"))) {
        reasons.add("unsupported-preservation");
      }
      const action = annot.lookupMaybe(N("A"), PDFDict);
      if (action && isName(action.get(N("S")), "/GoTo")) {
        reasons.add("unsupported-preservation");
      }
    }
  }
  return [...reasons];
};

export const hasInheritedFormResources = (doc: PDFDocument): boolean => {
  const acro = doc.catalog.lookupMaybe(N("AcroForm"), PDFDict);
  return acro?.has(N("DR")) === true || acro?.has(N("DA")) === true;
};

export const hasInternalLinks = (doc: PDFDocument): boolean =>
  doc.getPages().some((page) => {
    for (const ref of values(page.node.Annots())) {
      const annot = lookup(doc, ref);
      if (!(annot instanceof PDFDict)) {
        continue;
      }
      if (annot.get(N("Subtype"))?.toString() !== "/Link") {
        continue;
      }
      const action = annot.lookupMaybe(N("A"), PDFDict);
      if (
        annot.has(N("Dest")) ||
        (action && isName(action.get(N("S")), "/GoTo"))
      ) {
        return true;
      }
    }
    return false;
  });

const boxOfPage = (page: PDFPage) => {
  const box = page.getCropBox();
  return {
    x: box.x,
    y: box.y,
    width: Math.max(box.width, 0.01),
    height: Math.max(box.height, 0.01),
  };
};

const mediaBoxOfPage = (page: PDFPage) => {
  const box = page.getMediaBox();
  return {
    x: box.x,
    y: box.y,
    width: Math.max(box.width, 0.01),
    height: Math.max(box.height, 0.01),
  };
};

export const readWriterPages = (
  doc: PDFDocument,
  ids: readonly PageId[]
): Page[] =>
  doc.getPages().map((page, index) => {
    const rotation = ((page.getRotation().angle % 360) + 360) % 360;
    const raw = page.node.get(N("UserUnit"));
    const userUnit =
      raw === undefined ? 1 : Math.max(Number(raw.toString()) || 1, 0.01);
    return {
      id: ids[index]!,
      index,
      label: String(index + 1),
      mediaBox: mediaBoxOfPage(page),
      cropBox: boxOfPage(page),
      rotation: ([0, 90, 180, 270].includes(rotation) ? rotation : 0) as Angle,
      userUnit,
    };
  });

/** Add `/NM` to every supported source annotation so its identity survives saves. */
export const tagAnnotations = (doc: PDFDocument): void => {
  doc.getPages().forEach((page, pageIndex) => {
    values(page.node.Annots()).forEach((ref, annotIndex) => {
      const annot = lookup(doc, ref);
      if (!(annot instanceof PDFDict)) {
        return;
      }
      const subtype = annot.get(N("Subtype"))?.toString();
      if (
        !["/Text", "/Highlight", "/Ink", "/FreeText"].includes(subtype ?? "")
      ) {
        return;
      }
      if (annot.has(N("NM"))) {
        return;
      }
      annot.set(
        N("NM"),
        PDFHexString.fromText(`annotation:${pageIndex}:${annotIndex}`)
      );
    });
  });
};

export const readWriterAnnotations = (
  doc: PDFDocument,
  pageIndex: number,
  pageId: PageId
): Annotation[] => {
  const page = doc.getPage(pageIndex);
  const result: Annotation[] = [];
  values(page.node.Annots()).forEach((ref, annotIndex) => {
    const annot = lookup(doc, ref);
    if (!(annot instanceof PDFDict)) {
      return;
    }
    const subtype = annot.get(N("Subtype"))?.toString();
    const contents = textOf(annot.get(N("Contents"))) ?? "";
    const id = (textOf(annot.get(N("NM"))) ??
      `annotation:${pageIndex}:${annotIndex}`) as Annotation["id"];
    const rect = numberArray(annot.get(N("Rect")));
    const [rx = 0, ry = 0, rx2 = rx + 20, ry2 = ry + 20] = rect;
    const box: Box = {
      x: Math.min(rx, rx2),
      y: Math.min(ry, ry2),
      width: Math.max(Math.abs(rx2 - rx), 0.01),
      height: Math.max(Math.abs(ry2 - ry), 0.01),
    };
    const rawColor = numberArray(annot.get(N("C")));
    const alpha = Number(annot.get(N("CA"))?.toString() ?? "1");
    const color: [number, number, number, number] = [
      Math.round((rawColor[0] ?? 1) * 255),
      Math.round((rawColor[1] ?? 0.85) * 255),
      Math.round((rawColor[2] ?? 0) * 255),
      Math.round(Math.max(0, Math.min(1, alpha)) * 255),
    ];
    if (subtype === "/Text") {
      result.push({
        _tag: "Note",
        id,
        page: pageId,
        position: [box.x + box.width / 2, box.y + box.height / 2],
        contents,
      });
    } else if (subtype === "/Highlight") {
      const numbers = numberArray(annot.get(N("QuadPoints")));
      const quads: [
        [number, number],
        [number, number],
        [number, number],
        [number, number],
      ][] = [];
      for (let index = 0; index + 7 < numbers.length; index += 8) {
        quads.push([
          [numbers[index]!, numbers[index + 1]!],
          [numbers[index + 2]!, numbers[index + 3]!],
          [numbers[index + 4]!, numbers[index + 5]!],
          [numbers[index + 6]!, numbers[index + 7]!],
        ]);
      }
      if (quads.length === 0) {
        quads.push([
          [box.x, box.y + box.height],
          [box.x + box.width, box.y + box.height],
          [box.x, box.y],
          [box.x + box.width, box.y],
        ]);
      }
      result.push({
        _tag: "Highlight",
        id,
        page: pageId,
        quads,
        color,
        contents,
      });
    } else if (subtype === "/Ink") {
      const inkList = annot.lookupMaybe(N("InkList"), PDFArray);
      const strokes: [number, number][][] = [];
      for (const stroke of values(inkList)) {
        const valuesArray = lookup(doc, stroke);
        const numbers = numberArray(
          valuesArray instanceof PDFArray ? valuesArray : undefined
        );
        const points: [number, number][] = [];
        for (let index = 0; index + 1 < numbers.length; index += 2) {
          points.push([numbers[index]!, numbers[index + 1]!]);
        }
        if (points.length > 1) {
          strokes.push(points);
        }
      }
      const width = Number(
        annot.lookupMaybe(N("BS"), PDFDict)?.get(N("W"))?.toString() ?? "2"
      );
      result.push({
        _tag: "Ink",
        id,
        page: pageId,
        strokes,
        width: Number.isFinite(width) && width > 0 ? width : 2,
        color,
        contents,
      });
    } else if (subtype === "/FreeText") {
      const da = textOf(annot.get(N("DA"))) ?? "";
      const size = Number(/(\d+(?:\.\d+)?)\s+Tf/u.exec(da)?.[1] ?? "12");
      result.push({
        _tag: "AddedText",
        id,
        page: pageId,
        box,
        text: contents,
        fontSize: Number.isFinite(size) && size > 0 ? size : 12,
        color,
      });
    }
  });
  return result;
};

const fontCache = new WeakMap<PDFDocument, PDFFont>();

const fontFor = async (doc: PDFDocument): Promise<PDFFont> => {
  const cached = fontCache.get(doc);
  if (cached) {
    return cached;
  }
  const font = await doc.embedFont(StandardFonts.Helvetica);
  fontCache.set(doc, font);
  return font;
};

const encodeLine = (font: PDFFont, text: string): string => {
  try {
    return font.encodeText(text).toString();
  } catch {
    throw new WriterError("unsupported-glyph", "unsupported-glyph");
  }
};

const wrapText = (font: PDFFont, text: string, width: number, size: number) => {
  const lines: string[] = [];
  for (const paragraph of text.split("\n")) {
    let line = "";
    for (const word of paragraph.split(/(\s+)/u)) {
      const candidate = line + word;
      let measured = 0;
      try {
        measured = font.widthOfTextAtSize(candidate, size);
      } catch {
        throw new WriterError("unsupported-glyph", "unsupported-glyph");
      }
      if (measured > width && line.length > 0) {
        lines.push(line);
        line = word.trimStart();
      } else {
        line = candidate;
      }
    }
    lines.push(line);
  }
  return lines.length > 0 ? lines : [""];
};

const colorCommand = (color: readonly [number, number, number, number]) =>
  `${color[0] / 255} ${color[1] / 255} ${color[2] / 255} rg`;

const appearance = (
  doc: PDFDocument,
  width: number,
  height: number,
  content: string,
  resources?: PDFDict
): PDFRef => {
  const stream = doc.context.flateStream(content, {
    Type: "XObject",
    Subtype: "Form",
    BBox: [0, 0, width, height],
    ...(resources ? { Resources: resources } : {}),
  });
  return doc.context.register(stream);
};

const annotationAppearance = async (
  doc: PDFDocument,
  annotation: Annotation
): Promise<{ width: number; height: number; ref: PDFRef } | null> => {
  if (annotation._tag === "Note") {
    return null;
  }
  if (annotation._tag === "Highlight") {
    const points = annotation.quads.flat();
    const minX = Math.min(...points.map(([x]) => x));
    const minY = Math.min(...points.map(([, y]) => y));
    const width = Math.max(...points.map(([x]) => x)) - minX + 0.01;
    const height = Math.max(...points.map(([, y]) => y)) - minY + 0.01;
    const alpha = annotation.color[3] / 255;
    const paths = annotation.quads
      .map((quad) => {
        const relative = quad.map(([x, y]) => [x - minX, y - minY]);
        return `${colorCommand(annotation.color)} ${relative
          .map(([x, y], index) => `${x} ${y} ${index === 0 ? "m" : "l"}`)
          .join(" ")} h f`;
      })
      .join(" ");
    const resources = doc.context.obj({
      ExtGState: { GS0: { Type: "ExtGState", ca: alpha, CA: alpha } },
    });
    return {
      width,
      height,
      ref: appearance(doc, width, height, `/GS0 gs ${paths}`, resources),
    };
  }
  if (annotation._tag === "Ink") {
    const points = annotation.strokes.flat();
    const xs = points.map(([x]) => x);
    const ys = points.map(([, y]) => y);
    const minX = Math.min(...xs, 0);
    const minY = Math.min(...ys, 0);
    const width = Math.max(...xs, minX + 1) - minX + 0.01;
    const height = Math.max(...ys, minY + 1) - minY + 0.01;
    const path = annotation.strokes
      .map(
        (stroke) =>
          `${colorCommand(annotation.color)} ${annotation.width} w ${stroke
            .map(
              ([x, y], index) =>
                `${x - minX} ${y - minY} ${index === 0 ? "m" : "l"}`
            )
            .join(" ")} S`
      )
      .join(" ");
    return { width, height, ref: appearance(doc, width, height, path) };
  }
  const font = await fontFor(doc);
  const padding = 2;
  const lines = wrapText(
    font,
    annotation.text,
    Math.max(annotation.box.width - padding * 2, 1),
    annotation.fontSize
  );
  const leading = annotation.fontSize * 1.2;
  const parts = [colorCommand(annotation.color)];
  lines.forEach((line, index) => {
    const y = Math.max(
      annotation.box.height - padding - annotation.fontSize - index * leading,
      padding
    );
    parts.push(
      `BT /F1 ${annotation.fontSize} Tf ${padding} ${y} Td ${encodeLine(font, line)} Tj ET`
    );
  });
  const resources = doc.context.obj({ Font: { F1: font.ref } });
  return {
    width: annotation.box.width,
    height: annotation.box.height,
    ref: appearance(
      doc,
      annotation.box.width,
      annotation.box.height,
      parts.join(" "),
      resources
    ),
  };
};

const rectOf = (annotation: Annotation): [number, number, number, number] => {
  if (annotation._tag === "Note") {
    const [x, y] = annotation.position;
    return [x - 10, y - 10, x + 10, y + 10];
  }
  if (annotation._tag === "AddedText") {
    const { x, y, width, height } = annotation.box;
    return [x, y, x + width, y + height];
  }
  if (annotation._tag === "Ink") {
    const points = annotation.strokes.flat();
    const xs = points.map(([x]) => x);
    const ys = points.map(([, y]) => y);
    const minX = Math.min(...xs);
    const minY = Math.min(...ys);
    return [minX, minY, Math.max(...xs), Math.max(...ys)];
  }
  const points = annotation.quads.flat();
  const xs = points.map(([x]) => x);
  const ys = points.map(([, y]) => y);
  return [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)];
};

const annotationDict = async (
  doc: PDFDocument,
  page: PDFPage,
  annotation: Annotation
): Promise<PDFDict> => {
  const [x1, y1, x2, y2] = rectOf(annotation);
  if (![x1, y1, x2, y2].every(Number.isFinite) || x2 <= x1 || y2 <= y1) {
    throw new WriterError("invalid-pdf");
  }
  const dict = doc.context.obj({
    Type: "Annot",
    Subtype:
      annotation._tag === "Note"
        ? "Text"
        : annotation._tag === "Highlight"
          ? "Highlight"
          : annotation._tag === "Ink"
            ? "Ink"
            : "FreeText",
    Rect: [x1, y1, x2, y2],
    NM: PDFHexString.fromText(annotation.id),
    P: page.ref,
    F: 4,
  });
  if (annotation._tag === "Note") {
    dict.set(N("Name"), N("Comment"));
    dict.set(N("Contents"), PDFHexString.fromText(annotation.contents));
    dict.set(N("C"), doc.context.obj([1, 0.85, 0]));
  } else if (annotation._tag === "Highlight") {
    const flat = annotation.quads.flatMap((quad) => quad.flat());
    dict.set(N("QuadPoints"), doc.context.obj(flat));
    dict.set(N("Contents"), PDFHexString.fromText(annotation.contents));
    dict.set(
      N("C"),
      doc.context.obj(annotation.color.slice(0, 3).map((c) => c / 255))
    );
    dict.set(N("CA"), doc.context.obj(annotation.color[3] / 255));
  } else if (annotation._tag === "Ink") {
    dict.set(
      N("InkList"),
      doc.context.obj(annotation.strokes.map((stroke) => stroke.flat()))
    );
    dict.set(N("Contents"), PDFHexString.fromText(annotation.contents));
    dict.set(
      N("C"),
      doc.context.obj(annotation.color.slice(0, 3).map((c) => c / 255))
    );
    dict.set(N("BS"), doc.context.obj({ W: annotation.width }));
  } else {
    dict.set(N("Contents"), PDFHexString.fromText(annotation.text));
    dict.set(N("DA"), PDFString.of(`/Helv ${annotation.fontSize} Tf 0 0 0 rg`));
    dict.set(
      N("C"),
      doc.context.obj(annotation.color.slice(0, 3).map((c) => c / 255))
    );
    dict.set(N("Q"), doc.context.obj(0));
  }
  const appearanceStream = await annotationAppearance(doc, annotation);
  if (appearanceStream) {
    dict.set(N("AP"), doc.context.obj({ N: appearanceStream.ref }));
  }
  return dict;
};

const findAnnotation = (
  doc: PDFDocument,
  page: PDFPage,
  id: string
): { dict: PDFDict; ref: PDFRef } | null => {
  for (const ref of values(page.node.Annots())) {
    const dict = lookup(doc, ref);
    if (dict instanceof PDFDict && textOf(dict.get(N("NM"))) === id) {
      return {
        dict,
        ref: ref instanceof PDFRef ? ref : doc.context.register(dict),
      };
    }
  }
  return null;
};

export const createWriterAnnotation = async (
  doc: PDFDocument,
  page: PDFPage,
  annotation: Annotation
): Promise<void> => {
  if (findAnnotation(doc, page, annotation.id)) {
    throw new WriterError("unknown-annotation");
  }
  const dict = await annotationDict(doc, page, annotation);
  page.node.addAnnot(doc.context.register(dict));
};

export const updateWriterAnnotation = async (
  doc: PDFDocument,
  page: PDFPage,
  annotation: Annotation
): Promise<void> => {
  const found = findAnnotation(doc, page, annotation.id);
  if (!found) {
    throw new WriterError("unknown-annotation");
  }
  page.node.removeAnnot(found.ref);
  const dict = await annotationDict(doc, page, annotation);
  page.node.addAnnot(doc.context.register(dict));
};

export const deleteWriterAnnotation = (
  doc: PDFDocument,
  page: PDFPage,
  id: string
): void => {
  const found = findAnnotation(doc, page, id);
  if (!found) {
    throw new WriterError("unknown-annotation");
  }
  page.node.removeAnnot(found.ref);
};

const pageRefIndex = (doc: PDFDocument): Map<PDFRef, number> => {
  const map = new Map<PDFRef, number>();
  doc.getPages().forEach((page, index) => map.set(page.ref, index));
  return map;
};

const optionList = (field: PDFField): { id: string; label: string }[] => {
  const raw = field.acroField.dict.lookupMaybe(N("Opt"), PDFArray);
  const parsed: { id: string; label: string }[] = [];
  for (const item of values(raw)) {
    const value = lookup(field.doc, item);
    if (value instanceof PDFArray) {
      const id = textOf(value.get(0)) ?? "";
      const label = textOf(value.get(1)) ?? id;
      if (id.length > 0) {
        parsed.push({ id, label });
      }
    } else {
      const label = textOf(value) ?? "";
      if (label.length > 0) {
        parsed.push({ id: label, label });
      }
    }
  }
  return parsed;
};

const fieldValue = (field: PDFField): FormValue | null => {
  if (field instanceof PDFTextField) {
    return { _tag: "Text", value: field.getText() ?? "" };
  }
  if (field instanceof PDFCheckBox) {
    return { _tag: "Check", checked: field.isChecked() };
  }
  if (field instanceof PDFRadioGroup) {
    return { _tag: "Radio", option: field.getSelected() ?? null };
  }
  if (field instanceof PDFDropdown) {
    return { _tag: "Choice", selected: field.getSelected() };
  }
  if (field instanceof PDFOptionList) {
    return { _tag: "Choice", selected: field.getSelected() };
  }
  return null;
};

export const readWriterForms = (
  doc: PDFDocument,
  pageIds: readonly PageId[]
): FormField[] => {
  if (!doc.catalog.has(N("AcroForm"))) {
    return [];
  }
  const form = doc.getForm();
  const refs = pageRefIndex(doc);
  const fields: FormField[] = [];
  for (const field of form.getFields()) {
    const value = fieldValue(field);
    if (!value) {
      continue;
    }
    const kind =
      field instanceof PDFTextField
        ? "text"
        : field instanceof PDFCheckBox
          ? "checkbox"
          : field instanceof PDFRadioGroup
            ? "radio"
            : field instanceof PDFDropdown
              ? "combo"
              : "list";
    const widgets = field.acroField.getWidgets().flatMap((widget) => {
      const pageIndex = widget.P() ? refs.get(widget.P()!) : undefined;
      if (pageIndex === undefined) {
        return [];
      }
      const page = doc.getPage(pageIndex);
      const rect = widget.getRectangle();
      const rotation = ((page.getRotation().angle % 360) + 360) % 360;
      return [
        {
          page: pageIds[pageIndex]!,
          box: {
            x: Math.min(rect.x, rect.x + rect.width),
            y: Math.min(rect.y, rect.y + rect.height),
            width: Math.max(Math.abs(rect.width), 0.01),
            height: Math.max(Math.abs(rect.height), 0.01),
          },
          rotation: ([0, 90, 180, 270].includes(rotation)
            ? rotation
            : 0) as Angle,
        },
      ];
    });
    const options =
      field instanceof PDFRadioGroup
        ? field.getOptions().map((id) => ({ id, label: id }))
        : field instanceof PDFDropdown || field instanceof PDFOptionList
          ? optionList(field)
          : [];
    const name = field.getName();
    const label = textOf(field.acroField.dict.get(N("TU"))) ?? name;
    const maxLength =
      field instanceof PDFTextField ? field.getMaxLength() : undefined;
    fields.push({
      id: `field:${name}` as FormField["id"],
      name,
      label,
      kind,
      value,
      widgets,
      readOnly: field.isReadOnly(),
      required: field.isRequired(),
      multiple:
        (field instanceof PDFDropdown || field instanceof PDFOptionList) &&
        field.isMultiselect(),
      editableCombo: field instanceof PDFDropdown && field.isEditable(),
      maxLength: maxLength ?? null,
      options,
      unsupportedReasons: [],
    });
  }
  return fields;
};

export const setWriterFormValue = async (
  doc: PDFDocument,
  fieldName: string,
  value: FormValue
): Promise<void> => {
  const form = doc.getForm();
  const field = form.getFieldMaybe(fieldName);
  if (!field) {
    throw new WriterError("unknown-field");
  }
  if (field.isReadOnly()) {
    throw new WriterError("read-only-field");
  }
  if (field instanceof PDFTextField && value._tag === "Text") {
    const max = field.getMaxLength();
    if (max !== undefined && value.value.length > max) {
      throw new WriterError("unsupported-form");
    }
    try {
      field.setText(value.value);
    } catch {
      throw new WriterError("unsupported-glyph", "unsupported-glyph");
    }
  } else if (field instanceof PDFCheckBox && value._tag === "Check") {
    if (value.checked) {
      field.check();
    } else {
      field.uncheck();
    }
  } else if (field instanceof PDFRadioGroup && value._tag === "Radio") {
    if (value.option === null) {
      field.clear();
    } else if (field.getOptions().includes(value.option)) {
      field.select(value.option);
    } else {
      throw new WriterError("unsupported-form");
    }
  } else if (
    (field instanceof PDFDropdown || field instanceof PDFOptionList) &&
    value._tag === "Choice"
  ) {
    const options = field.getOptions();
    if (
      optionList(field).some((option) => option.id !== option.label) ||
      value.selected.some((item) => !options.includes(item))
    ) {
      // pdf-lib writes the selected display text into `/V`. When a source
      // separates the export value from the label, fail closed instead of
      // saving the wrong identity.
      throw new WriterError("unsupported-form");
    }
    const unique = [...new Set(value.selected)];
    if (!field.isMultiselect() && unique.length > 1) {
      throw new WriterError("unsupported-form");
    }
    field.select(unique);
  } else {
    throw new WriterError("unsupported-form");
  }
  const font = await fontFor(doc);
  try {
    field.defaultUpdateAppearances(font);
  } catch {
    throw new WriterError("unsupported-glyph", "unsupported-glyph");
  }
  form.markFieldAsClean(field.ref);
};

const pageFor = (
  doc: PDFDocument,
  ids: readonly PageId[],
  id: PageId
): PDFPage => {
  const index = ids.indexOf(id);
  if (index === -1) {
    throw new WriterError("unknown-page");
  }
  return doc.getPage(index);
};

export const rotateWriterPages = (
  doc: PDFDocument,
  ids: readonly PageId[],
  pages: readonly PageId[],
  clockwise: 90 | 180 | 270
): void => {
  for (const id of pages) {
    const page = pageFor(doc, ids, id);
    page.setRotation(
      degrees((((page.getRotation().angle + clockwise) % 360) + 360) % 360)
    );
  }
};

export const reorderWriterPages = (
  doc: PDFDocument,
  order: readonly PageId[],
  ids: readonly PageId[]
): void => {
  const pages = new Map<PageId, PDFPage>();
  ids.forEach((id, index) => pages.set(id, doc.getPage(index)));
  for (let index = ids.length - 1; index >= 0; index -= 1) {
    doc.removePage(index);
  }
  for (const id of order) {
    const page = pages.get(id);
    if (!page) {
      throw new WriterError("unknown-page");
    }
    doc.addPage(page);
  }
};

const removePage = (doc: PDFDocument, index: number): void => {
  const page = doc.getPage(index);
  if (doc.catalog.has(N("AcroForm"))) {
    const onPage = new Set(
      values(page.node.Annots()).map((ref) => lookup(doc, ref))
    );
    for (const field of doc.getForm().getFields()) {
      const widgets = field.acroField.getWidgets();
      const matched = widgets.flatMap((widget, widgetIndex) =>
        onPage.has(widget.dict) ? [widgetIndex] : []
      );
      if (matched.length === widgets.length && matched.length > 0) {
        doc.getForm().removeField(field);
      } else {
        for (const widgetIndex of matched.reverse()) {
          field.acroField.removeWidget(widgetIndex);
        }
      }
    }
  }
  doc.removePage(index);
};

export const deleteWriterPages = (
  doc: PDFDocument,
  pages: readonly PageId[],
  ids: readonly PageId[]
): void => {
  for (const id of pages) {
    pageFor(doc, ids, id);
  }
  const surviving = ids
    .filter((id) => !pages.includes(id))
    .map((id) => pageFor(doc, ids, id));
  for (let index = ids.length - 1; index >= 0; index -= 1) {
    removePage(doc, index);
  }
  // `removePage` updates the page tree but leaves pdf-lib's page cache stale.
  // Adding the survivors back invalidates it, so later reads see the truth.
  for (const page of surviving) {
    doc.addPage(page);
  }
};

const readFieldName = (doc: PDFDocument, ref: PDFObject): string | null => {
  const dict = lookup(doc, ref);
  if (!(dict instanceof PDFDict)) {
    return null;
  }
  return textOf(dict.get(N("T")));
};

const sourcePageIndexes = (
  source: PDFDocument,
  pageIds: readonly string[],
  selected: readonly string[]
): number[] => {
  const indexes = selected.map((id) => pageIds.indexOf(id));
  if (
    indexes.length === 0 ||
    new Set(indexes).size !== indexes.length ||
    indexes.some((index) => index < 0 || index >= source.getPageCount())
  ) {
    throw new WriterError("invalid-selection");
  }
  return indexes;
};

export const importWriterPages = async (
  doc: PDFDocument,
  sourceBytes: Uint8Array,
  pageIds: readonly string[],
  selected: readonly string[],
  namespace: string,
  beforeIndex: number | null
): Promise<number> => {
  const source = await loadWriter(sourceBytes);
  const protectedReasons = [
    ...inspectWriter(source),
    ...inspectStructure(source),
    ...orderBlockers(source),
  ];
  if (protectedReasons.length > 0) {
    throw new WriterError(
      "source-rejected",
      protectedReasons[0] ?? "unknown-structure"
    );
  }
  const indexes = sourcePageIndexes(source, pageIds, selected);
  const wanted = indexes.map((index) => source.getPage(index));
  for (let index = source.getPageCount() - 1; index >= 0; index -= 1) {
    if (!indexes.includes(index)) {
      removePage(source, index);
    }
  }
  const acro = source.catalog.lookupMaybe(N("AcroForm"), PDFDict);
  if (acro?.has(N("DR")) || acro?.has(N("DA"))) {
    throw new WriterError("source-rejected", "unsupported-preservation");
  }
  const existing = doc.catalog.has(N("AcroForm"))
    ? doc
        .getForm()
        .getFields()
        .map((field) => field.getName())
    : [];
  const collision = existing.some(
    (name) =>
      name === namespace ||
      name.startsWith(`${namespace}.`) ||
      namespace.startsWith(`${name}.`)
  );
  if (collision) {
    throw new WriterError("source-rejected", "unsupported-preservation");
  }
  const copier = PDFObjectCopier.for(source.context, doc.context);
  const copied: PDFPage[] = [];
  for (const page of wanted) {
    const ref = copier.copy(page.ref);
    const copiedPage = PDFPage.of(
      doc.context.lookup(ref) as never,
      ref as PDFRef,
      doc
    );
    copied.push(copiedPage);
  }
  const insertion = beforeIndex ?? doc.getPageCount();
  copied.forEach((page, offset) => {
    doc.insertPage(insertion + offset, page);
  });
  if (acro) {
    const fields = doc.getForm().acroForm.normalizedEntries().Fields;
    for (const ref of values(acro.lookupMaybe(N("Fields"), PDFArray))) {
      const name = readFieldName(source, ref);
      if (!name) {
        throw new WriterError("source-rejected", "unsupported-preservation");
      }
      const copy = copier.copy(ref);
      const copiedDict = doc.context.lookup(copy);
      if (copiedDict instanceof PDFDict) {
        copiedDict.set(N("T"), PDFHexString.fromText(`${namespace}.${name}`));
      }
      fields.push(copy as PDFRef);
    }
  }
  return copied.length;
};

export const extractWriterBytes = async (
  bytes: Uint8Array,
  ids: readonly PageId[],
  selected: readonly PageId[]
): Promise<Uint8Array> => {
  if (selected.length === 0 || selected.some((id) => !ids.includes(id))) {
    throw new WriterError("invalid-selection");
  }
  const doc = await loadWriter(bytes);
  if (orderBlockers(doc).length > 0) {
    throw new WriterError(
      "unsupported-preservation",
      "unsupported-preservation"
    );
  }
  for (let index = ids.length - 1; index >= 0; index -= 1) {
    if (!selected.includes(ids[index]!)) {
      removePage(doc, index);
    }
  }
  return saveWriter(doc);
};
