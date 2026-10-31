import { Schema } from "effect";

import type {
  FolioFlattenActiveName,
  FolioFlattenRefusal,
} from "./folio.flatten";

/** The check a saved copy failed. The copy is discarded. */
export type FolioFlattenCheck =
  | "interactive"
  | "open"
  | "pages"
  | "render"
  | "text";

/** Why a run stopped without a copy. */
export type FolioFlattenFailure =
  | "busy"
  | "copy"
  | "engine"
  | "stopped"
  | "unreadable"
  | "verify"
  | "write";

/** What one finished copy holds. */
export interface FolioFlattenStats {
  readonly inputBytes: number;
  readonly outputBytes: number;
  readonly pages: number;
}

export interface FolioFlattenRequest {
  /** A plain copy of the pages in scope, with the edits of the open file. */
  readonly bytes: ArrayBuffer;
  readonly id: string;
  /** How many pages the copy must hold. */
  readonly pages: number;
  readonly type: "flatten";
}

export type FolioFlattenReply =
  | {
      readonly done: number;
      readonly id: string;
      readonly total: number;
      readonly type: "progress";
    }
  | {
      readonly bytes: ArrayBuffer;
      readonly id: string;
      readonly stats: FolioFlattenStats;
      readonly type: "done";
    }
  | {
      readonly id: string;
      readonly reason: FolioFlattenRefusal;
      readonly type: "refused";
    }
  | {
      readonly check: FolioFlattenCheck | null;
      readonly id: string;
      readonly message: string;
      /** The interactive names a failed copy still held. */
      readonly names: readonly FolioFlattenActiveName[];
      readonly reason: FolioFlattenFailure;
      readonly type: "failed";
    };

const FolioFlattenRequestSchema = Schema.Struct({
  bytes: Schema.instanceOf(ArrayBuffer),
  id: Schema.String,
  pages: Schema.Number.check(Schema.isInt(), Schema.isGreaterThan(0)),
  type: Schema.Literals(["flatten"]),
});

/**
 * The Worker boundary. A message that does not match the run protocol is not
 * answered at all, so a stray post from another script cannot start a job.
 */
export const isFolioFlattenRequest = (
  value: unknown
): value is FolioFlattenRequest => Schema.is(FolioFlattenRequestSchema)(value);
