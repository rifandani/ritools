import { Schema } from "effect";

import type { FolioLostStructure, FolioRepairPath } from "./folio.repair";
import type {
  FolioRepairAttempt,
  FolioRepairFailure,
  FolioRepairProgress,
  FolioRepairRefusal,
} from "./folio.repair.engine";

export interface FolioRepairRequest {
  readonly bytes: ArrayBuffer;
  readonly id: string;
  readonly type: "repair";
}

export type FolioRepairReply =
  | ({ readonly id: string; readonly type: "progress" } & FolioRepairProgress)
  | {
      readonly attempts: readonly FolioRepairAttempt[];
      readonly bytes: ArrayBuffer;
      readonly damaged: boolean;
      readonly id: string;
      readonly lost: readonly FolioLostStructure[];
      readonly pages: number;
      readonly path: FolioRepairPath;
      readonly type: "repaired";
    }
  | {
      readonly id: string;
      readonly reason: FolioRepairRefusal;
      readonly type: "refused";
    }
  | {
      readonly attempts: readonly FolioRepairAttempt[];
      readonly id: string;
      readonly reason: FolioRepairFailure;
      readonly type: "failed";
    }
  | {
      readonly id: string;
      readonly message: string;
      readonly type: "error";
    };

const FolioRepairRequestSchema = Schema.Struct({
  bytes: Schema.instanceOf(ArrayBuffer),
  id: Schema.String,
  type: Schema.Literals(["repair"]),
});

/**
 * The Worker boundary. A message that does not match the run protocol is not
 * answered at all, so a stray post from another script cannot start a job.
 */
export const isFolioRepairRequest = (
  value: unknown
): value is FolioRepairRequest => Schema.is(FolioRepairRequestSchema)(value);
