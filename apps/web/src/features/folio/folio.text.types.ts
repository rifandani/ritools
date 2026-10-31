/**
 * The Wording Edit contract: one PDF Text Object, rewritten in its own font,
 * size, and baseline. These shapes cross the Worker boundary, so they carry no
 * engine handles and no DOM types.
 */

/**
 * Why a Wording Edit was refused. Each reason is a stable token: the copy that
 * explains it lives in the UI, not here.
 */
export type FolioTextRefusal =
  /** The page has no object at that index. */
  | "no-text-object"
  /** `FPDF_GetSignatureCount > 0`. */
  | "signed"
  /** The modify-contents bit is clear, or the file needs a password. */
  | "permission"
  /** `FPDF_GetXFAPacketCount > 0`. */
  | "xfa"
  /** The saved object does not extract as typed. */
  | "glyph-coverage"
  /** The object paints no pixels, so the page cannot show the edit. */
  | "invisible"
  /** The new box leaves the line's free width. */
  | "overflow"
  /** Pixels changed outside the edited object. */
  | "artwork"
  /** Any other post-save mismatch. */
  | "verify-failed";

/** One PDF Text Object that the page draws. */
export interface FolioTextObject {
  /** The page object index, the value `rewriteTextObject` takes. */
  readonly index: number;
  /** The object's box in PDF points: left, bottom, right, top. */
  readonly bounds: readonly [number, number, number, number];
  readonly font: string;
  /** The object's text is not painted on the page, as in an OCR layer. */
  readonly invisible: boolean;
  readonly size: number;
  readonly text: string;
}

/** One requested rewrite. */
export interface FolioTextEdit {
  readonly pageIndex: number;
  readonly objectIndex: number;
  /** Guard against a stale listing. */
  readonly expected: string;
  readonly next: string;
}

export type FolioTextRequest =
  | {
      readonly bytes: ArrayBuffer;
      readonly id: string;
      readonly pageIndex: number;
      readonly type: "list";
    }
  | {
      readonly bytes: ArrayBuffer;
      readonly edit: FolioTextEdit;
      readonly id: string;
      readonly type: "measure";
    }
  | {
      readonly bytes: ArrayBuffer;
      readonly edit: FolioTextEdit;
      readonly id: string;
      readonly type: "rewrite";
    };

export type FolioTextReply =
  | {
      readonly id: string;
      readonly objects: readonly FolioTextObject[];
      readonly ok: true;
      readonly tagged: boolean;
      readonly type: "objects";
    }
  | {
      readonly bytes: ArrayBuffer;
      readonly id: string;
      readonly ok: true;
      readonly tagged: boolean;
      readonly type: "rewritten";
    }
  | {
      readonly fits: boolean;
      readonly free: number;
      readonly id: string;
      readonly needed: number;
      readonly ok: true;
      readonly type: "measured";
    }
  | {
      readonly id: string;
      readonly ok: false;
      readonly reason: FolioTextRefusal;
      readonly type: "refused";
    }
  | {
      readonly id: string;
      readonly message: string;
      readonly ok: false;
      readonly type: "failed";
    };

/* oxlint-disable anti-slop/no-unsafe-dictionary-type -- A Worker message is unparsed input; this guard is the parser at that boundary. */
const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;
/* oxlint-enable anti-slop/no-unsafe-dictionary-type */

const isIndex = (value: unknown): value is number =>
  typeof value === "number" && Number.isInteger(value) && value >= 0;

const isEdit = (value: unknown): value is FolioTextEdit =>
  isRecord(value) &&
  isIndex(value["pageIndex"]) &&
  isIndex(value["objectIndex"]) &&
  typeof value["expected"] === "string" &&
  typeof value["next"] === "string";

/**
 * The Worker returns early on anything that is not one known request shape.
 * The message id is required for every shape.
 */
export const isFolioTextRequest = (
  value: unknown
): value is FolioTextRequest => {
  if (!isRecord(value) || typeof value["id"] !== "string") {
    return false;
  }
  if (!(value["bytes"] instanceof ArrayBuffer)) {
    return false;
  }
  switch (value["type"]) {
    case "list": {
      return isIndex(value["pageIndex"]);
    }
    case "measure":
    case "rewrite": {
      return isEdit(value["edit"]);
    }
    default: {
      return false;
    }
  }
};
