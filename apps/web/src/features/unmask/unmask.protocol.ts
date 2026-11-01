import { Schema } from "effect";

import type { RequestId } from "@/features/unmask/unmask.schema";
import {
  Backdrop,
  EncodedFile,
  Matte,
  RasterImage,
  RemoveProgress,
  RemoveResult,
  RequestId as RequestIdSchema,
  UnmaskErrorSchema,
} from "@/features/unmask/unmask.schema";

/**
 * The Worker protocol.
 *
 * One request shape per message type. Every message carries an incrementing
 * request id; a cancelled request is ignored when its late answer arrives. The
 * protocol carries domain values only: no ORT tensor, session, or model path
 * crosses this boundary.
 */

export const WorkerRequest = Schema.TaggedUnion({
  Remove: {
    requestId: RequestIdSchema,
    imageToken: Schema.String,
    name: Schema.String,
    mime: Schema.String,
    bytes: Schema.Uint8Array,
    previewMaxEdge: Schema.Finite,
  },
  Composite: {
    requestId: RequestIdSchema,
    imageToken: Schema.String,
    source: Schema.optionalKey(RasterImage),
    matte: Matte,
    backdrop: Backdrop,
    feather: Schema.Finite,
  },
  Encode: {
    requestId: RequestIdSchema,
    imageToken: Schema.String,
    image: RasterImage,
    format: EncodedFile.fields.format,
    quality: Schema.Finite,
    nameStem: Schema.String,
    backdrop: Schema.optionalKey(Backdrop),
  },
  Cancel: {
    requestId: RequestIdSchema,
    target: RequestIdSchema,
    imageToken: Schema.String,
  },
  Close: {
    requestId: RequestIdSchema,
    imageToken: Schema.String,
  },
});
export type WorkerRequest = typeof WorkerRequest.Type;

export const WorkerReply = Schema.TaggedUnion({
  Removed: {
    requestId: RequestIdSchema,
    result: RemoveResult,
  },
  Composited: {
    requestId: RequestIdSchema,
    image: RasterImage,
  },
  Encoded: {
    requestId: RequestIdSchema,
    file: EncodedFile,
  },
  Progress: {
    requestId: RequestIdSchema,
    event: RemoveProgress,
  },
  Failed: {
    requestId: RequestIdSchema,
    error: UnmaskErrorSchema,
  },
  Closed: {
    requestId: RequestIdSchema,
  },
});
export type WorkerReply = typeof WorkerReply.Type;

/** The next request id. The counter is per engine lifetime. */
export const requestIdOf = (counter: number): RequestId =>
  // SAFETY: the template always yields a non-empty string; RequestId is opaque.
  `request-${counter}` as RequestId;
