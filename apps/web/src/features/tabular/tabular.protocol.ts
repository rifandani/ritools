import { Schema } from "effect";
import type { Effect } from "effect";

import * as T from "./tabular";

/** Transport schemas are separate from parser and grid types. */
export const operations = {
  prepareOpen: {
    input: Schema.Struct({
      source: T.Source,
      options: T.ParseOptions,
      job: T.Job,
    }),
    output: T.Candidate,
  },
  prepareReparse: {
    input: Schema.Struct({
      guard: T.Guard,
      options: T.ParseOptions,
      job: T.Job,
    }),
    output: T.Candidate,
  },
  acceptOpen: { input: T.AcceptOpen, output: T.Session },
  discardCandidate: {
    input: Schema.Struct({ candidateId: T.CandidateId, ...T.Job.fields }),
    output: Schema.Void,
  },
  summary: {
    input: Schema.Struct({ sessionId: T.SessionId, ...T.Job.fields }),
    output: T.Session,
  },
  setView: { input: T.ViewRequest, output: T.View },
  readViewport: { input: T.ViewportRequest, output: T.Viewport },
  locate: { input: T.LocateRequest, output: T.Location },
  warnings: { input: T.WarningQuery, output: T.WarningPage },
  edit: { input: T.EditRequest, output: T.Change },
  history: { input: T.HistoryRequest, output: T.Change },
  planExport: { input: T.ExportRequest, output: T.ExportPlan },
  exportBytes: { input: T.ExportCommit, output: T.ExportBytes },
  splitBytes: { input: T.SplitRequest, output: T.SplitBytes },
  cancel: { input: T.Cancel, output: Schema.Void },
  close: {
    input: Schema.Struct({ sessionId: T.SessionId }),
    output: Schema.Void,
  },
} as const;
export type Operation = keyof typeof operations;
export type Input<K extends Operation> =
  (typeof operations)[K]["input"]["Type"];
export type Output<K extends Operation> =
  (typeof operations)[K]["output"]["Type"];
export type Api = {
  readonly [K in Operation]: (
    input: Input<K>
  ) => Effect.Effect<Output<K>, T.EngineError>;
};
export const Request = Schema.Union([
  Schema.Struct({
    version: Schema.Literal(1),
    requestId: T.RequestId,
    operation: Schema.Literal("prepareOpen"),
    payload: operations.prepareOpen.input,
  }),
  Schema.Struct({
    version: Schema.Literal(1),
    requestId: T.RequestId,
    operation: Schema.Literal("prepareReparse"),
    payload: operations.prepareReparse.input,
  }),
  Schema.Struct({
    version: Schema.Literal(1),
    requestId: T.RequestId,
    operation: Schema.Literal("acceptOpen"),
    payload: operations.acceptOpen.input,
  }),
  Schema.Struct({
    version: Schema.Literal(1),
    requestId: T.RequestId,
    operation: Schema.Literal("discardCandidate"),
    payload: operations.discardCandidate.input,
  }),
  Schema.Struct({
    version: Schema.Literal(1),
    requestId: T.RequestId,
    operation: Schema.Literal("summary"),
    payload: operations.summary.input,
  }),
  Schema.Struct({
    version: Schema.Literal(1),
    requestId: T.RequestId,
    operation: Schema.Literal("setView"),
    payload: operations.setView.input,
  }),
  Schema.Struct({
    version: Schema.Literal(1),
    requestId: T.RequestId,
    operation: Schema.Literal("readViewport"),
    payload: operations.readViewport.input,
  }),
  Schema.Struct({
    version: Schema.Literal(1),
    requestId: T.RequestId,
    operation: Schema.Literal("locate"),
    payload: operations.locate.input,
  }),
  Schema.Struct({
    version: Schema.Literal(1),
    requestId: T.RequestId,
    operation: Schema.Literal("warnings"),
    payload: operations.warnings.input,
  }),
  Schema.Struct({
    version: Schema.Literal(1),
    requestId: T.RequestId,
    operation: Schema.Literal("edit"),
    payload: operations.edit.input,
  }),
  Schema.Struct({
    version: Schema.Literal(1),
    requestId: T.RequestId,
    operation: Schema.Literal("history"),
    payload: operations.history.input,
  }),
  Schema.Struct({
    version: Schema.Literal(1),
    requestId: T.RequestId,
    operation: Schema.Literal("planExport"),
    payload: operations.planExport.input,
  }),
  Schema.Struct({
    version: Schema.Literal(1),
    requestId: T.RequestId,
    operation: Schema.Literal("exportBytes"),
    payload: operations.exportBytes.input,
  }),
  Schema.Struct({
    version: Schema.Literal(1),
    requestId: T.RequestId,
    operation: Schema.Literal("splitBytes"),
    payload: operations.splitBytes.input,
  }),
  Schema.Struct({
    version: Schema.Literal(1),
    requestId: T.RequestId,
    operation: Schema.Literal("cancel"),
    payload: operations.cancel.input,
  }),
  Schema.Struct({
    version: Schema.Literal(1),
    requestId: T.RequestId,
    operation: Schema.Literal("close"),
    payload: operations.close.input,
  }),
]);
export type Request = typeof Request.Type;
export const Reply = Schema.TaggedUnion({
  Success: {
    version: Schema.Literal(1),
    requestId: T.RequestId,
    payload: Schema.Unknown,
  },
  Failure: {
    version: Schema.Literal(1),
    requestId: T.RequestId,
    payload: T.EngineError,
  },
  Progress: {
    version: Schema.Literal(1),
    requestId: T.RequestId,
    payload: T.Progress,
  },
});
export type Reply = typeof Reply.Type;
