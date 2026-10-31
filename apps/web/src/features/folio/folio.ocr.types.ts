import { Schema } from "effect";

import type { FolioOcrLanguage, FolioOcrWord } from "./folio.ocr";

export type FolioOcrFailure =
  | "encrypted"
  | "signed"
  | "engine"
  | "write"
  | "protocol";

export type FolioOcrRequest =
  | {
      readonly type: "start";
      readonly id: string;
      readonly bytes: ArrayBuffer;
      readonly languages: readonly FolioOcrLanguage[];
    }
  | {
      readonly type: "page";
      readonly id: string;
      readonly pageIndex: number;
      /** The page image size, in pixels. */
      readonly width: number;
      readonly height: number;
      /** A PNG of the page as the viewer shows it. */
      readonly image: ArrayBuffer;
    }
  | { readonly type: "finish"; readonly id: string }
  | { readonly type: "cancel"; readonly id: string };

export type FolioOcrReply =
  | {
      readonly type: "ready";
      readonly id: string;
      readonly pageCount: number;
    }
  | {
      readonly type: "page";
      readonly id: string;
      readonly pageIndex: number;
      readonly confidence: number;
      readonly skipped: number;
      readonly words: readonly FolioOcrWord[];
    }
  | {
      readonly type: "page-failed";
      readonly id: string;
      readonly pageIndex: number;
      readonly message: string;
    }
  | {
      readonly type: "done";
      readonly id: string;
      readonly skipped: number;
      readonly bytes: ArrayBuffer;
    }
  | {
      readonly type: "failed";
      readonly id: string;
      readonly reason: FolioOcrFailure;
      readonly message: string;
    };

const FolioOcrRequestSchema = Schema.Union([
  Schema.Struct({
    bytes: Schema.instanceOf(ArrayBuffer),
    id: Schema.String,
    languages: Schema.Array(Schema.Literals(["eng", "ind"])),
    type: Schema.Literals(["start"]),
  }),
  Schema.Struct({
    height: Schema.Number,
    id: Schema.String,
    image: Schema.instanceOf(ArrayBuffer),
    pageIndex: Schema.Number,
    type: Schema.Literals(["page"]),
    width: Schema.Number,
  }),
  Schema.Struct({
    id: Schema.String,
    type: Schema.Literals(["finish"]),
  }),
  Schema.Struct({
    id: Schema.String,
    type: Schema.Literals(["cancel"]),
  }),
]);

/**
 * The Worker boundary. A message that does not match the run protocol is not
 * answered at all, so a stray post from another script cannot start a job.
 */
export const isFolioOcrRequest = (value: unknown): value is FolioOcrRequest =>
  Schema.is(FolioOcrRequestSchema)(value);
