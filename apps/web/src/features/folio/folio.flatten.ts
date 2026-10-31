const documentStem = (name: string): string => {
  const trimmed = name.trim();
  const stem = trimmed.toLowerCase().endsWith(".pdf")
    ? trimmed.slice(0, -4)
    : trimmed;
  return stem || "document";
};

/** The name of the flattened copy. It never matches the open file's name. */
export const folioFlattenName = (name: string): string =>
  `${documentStem(name)}-flat.pdf`;

/** The page scope of a flattened copy. */
export type FolioFlattenScope = "all" | "selected";

/** The page indexes the copy holds, in page order. */
export const folioFlattenPages = (
  scope: FolioFlattenScope,
  pageCount: number,
  selected: ReadonlySet<number>
): readonly number[] =>
  scope === "all"
    ? Array.from({ length: pageCount }, (_, index) => index)
    : [...selected]
        .filter((index) => index >= 0 && index < pageCount)
        .toSorted((left, right) => left - right);

/** Why a file stays read only and gets no flattened copy. */
export type FolioFlattenRefusal =
  | "encrypted"
  | "layers"
  | "restricted"
  | "signed";

/**
 * The reason to refuse a copy, or null. A signed file stays read only because
 * the copy drops its signature; an encrypted or download-restricted file
 * forbids a copy without its protection.
 */
export const folioFlattenRefusal = (facts: {
  readonly canDownload: boolean;
  readonly encrypted: boolean;
  readonly signed: boolean;
}): FolioFlattenRefusal | null => {
  if (facts.encrypted) {
    return "encrypted";
  }
  if (facts.signed) {
    return "signed";
  }
  return facts.canDownload ? null : "restricted";
};

/**
 * The PDF names a flattened copy must not hold: form fields, annotations,
 * actions and scripts, attachments, outlines, structure tags, and media.
 */
const FOLIO_FLATTEN_ACTIVE_NAMES = [
  "AcroForm",
  "XFA",
  "Widget",
  "Annots",
  "OpenAction",
  "JavaScript",
  "JS",
  "EmbeddedFiles",
  "AF",
  "AA",
  "Outlines",
  "StructTreeRoot",
  "URI",
  "Launch",
  "RichMedia",
  "Movie",
  "Sound",
  "Screen",
  "FileAttachment",
] as const;

export type FolioFlattenActiveName =
  (typeof FOLIO_FLATTEN_ACTIVE_NAMES)[number];

/** A name ends at PDF white space, a delimiter, or the end of the file. */
const NAME_END = String.raw`(?=[\0\t\n\f\r ()<>\[\]{}/%]|$)`;

const namePattern = (name: string) => new RegExp(`/${name}${NAME_END}`, "u");

const ACTIVE_PATTERNS = FOLIO_FLATTEN_ACTIVE_NAMES.map(
  (name) => [name, namePattern(name)] as const
);

/**
 * The interactive names left in a saved copy, in list order. PDFium writes a
 * new document without object streams, so every dictionary key is plain
 * text in the file; page content streams stay compressed.
 */
export const folioFlattenActiveNames = (
  bytes: Uint8Array
): readonly FolioFlattenActiveName[] => {
  const text = new TextDecoder("latin1").decode(bytes);
  const found: FolioFlattenActiveName[] = [];
  for (const [name, pattern] of ACTIVE_PATTERNS) {
    if (pattern.test(text)) {
      found.push(name);
    }
  }
  return found;
};

const LAYER_PATTERNS = [namePattern("OCG"), namePattern("OCMD")];

/**
 * Whether the pages use optional content. A copy of the pages leaves the
 * document's layer settings behind, so a hidden layer would show in the copy.
 */
export const folioFlattenHasLayers = (bytes: Uint8Array): boolean => {
  const text = new TextDecoder("latin1").decode(bytes);
  return LAYER_PATTERNS.some((pattern) => pattern.test(text));
};

const WHITE_SPACE = /\s/u;

/**
 * Whether every character of the source page text is still on the copied
 * page, in the same order. The copy can hold more text, because form values
 * and annotation text become page content. White space is not compared: the
 * text reader adds or drops it at line breaks.
 */
export const folioFlattenKeepsText = (
  source: string,
  copy: string
): boolean => {
  const target = [...copy].filter((char) => !WHITE_SPACE.test(char));
  let at = 0;
  for (const char of source) {
    if (WHITE_SPACE.test(char)) {
      continue;
    }
    while (at < target.length && target[at] !== char) {
      at += 1;
    }
    if (at === target.length) {
      return false;
    }
    at += 1;
  }
  return true;
};

/** A gray level darker than this is ink. */
const INK_LEVEL = 160;

/** A gray level at or above this is paper. */
const PAPER_LEVEL = 224;

/** The part of a page's ink that a copy may lose to edge smoothing. */
export const FOLIO_FLATTEN_MAX_LOST_INK = 0.01;

/**
 * The part of the source page's ink that is paper in the copy, from 0 to 1.
 * Both pages are gray levels at the same size. A flattened copy only adds
 * paint (form values, annotation appearances), so ink that goes white means
 * content was lost. Pages of a different size lose all their ink.
 */
export const folioFlattenLostInk = (
  source: Uint8Array,
  copy: Uint8Array
): number => {
  let ink = 0;
  let lost = 0;
  for (const [index, level] of source.entries()) {
    if (level >= INK_LEVEL) {
      continue;
    }
    ink += 1;
    if (source.length !== copy.length || (copy[index] ?? 0) >= PAPER_LEVEL) {
      lost += 1;
    }
  }
  return ink === 0 ? 0 : lost / ink;
};
