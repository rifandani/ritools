import { Schema } from "effect";

import type { FolioCompressPreset } from "./folio.compress";

/** Why a Compress run stopped without a smaller copy. */
export type FolioCompressFailure =
  | "encrypted"
  | "signed"
  | "unreadable"
  | "engine"
  | "write"
  | "verify"
  | "stopped"
  | "busy";

/** Why a PDF is skipped before any rewrite. */
export type FolioCompressSkipReason = "encrypted" | "restricted" | "signed";

/** What one run did, in bytes and images. */
export interface FolioCompressStats {
  readonly inputBytes: number;
  readonly outputBytes: number;
  readonly pages: number;
  /** Images whose JPEG stream was replaced by a smaller one. */
  readonly images: number;
  /** Images that stayed as they were, because the copy was not smaller. */
  readonly kept: number;
}

export interface FolioCompressRequest {
  readonly bytes: ArrayBuffer;
  readonly id: string;
  readonly preset: FolioCompressPreset;
  readonly type: "compress";
}

export type FolioCompressReply =
  | {
      readonly done: number;
      readonly id: string;
      readonly total: number;
      readonly type: "progress";
    }
  | {
      readonly bytes: ArrayBuffer;
      readonly id: string;
      readonly stats: FolioCompressStats;
      readonly type: "done";
    }
  | {
      readonly id: string;
      readonly stats: FolioCompressStats;
      readonly type: "unchanged";
    }
  | {
      readonly id: string;
      readonly reason: FolioCompressSkipReason;
      readonly stats: FolioCompressStats;
      readonly type: "skipped";
    }
  | {
      readonly id: string;
      readonly message: string;
      readonly reason: FolioCompressFailure;
      readonly type: "failed";
    };

const FolioCompressRequestSchema = Schema.Struct({
  bytes: Schema.instanceOf(ArrayBuffer),
  id: Schema.String,
  preset: Schema.Literals(["balanced", "light", "strong"]),
  type: Schema.Literals(["compress"]),
});

/**
 * The Worker boundary. A message that does not match the run protocol is not
 * answered at all, so a stray post from another script cannot start a job.
 */
export const isFolioCompressRequest = (
  value: unknown
): value is FolioCompressRequest =>
  Schema.is(FolioCompressRequestSchema)(value);
