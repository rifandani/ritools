/* oxlint-disable anti-slop/no-unknown-parameters -- Tests decode raw wire payloads at the same boundary as Workers. */
/* oxlint-disable anti-slop/no-shape-in-symbol-names -- Tests use the fixed public export field. */
import { expect, it } from "@effect/vitest";
import { Deferred, Effect, Fiber, Schema } from "effect";

import * as T from "./tabular";
import { TabularController } from "./tabular.controller";
import { parseFile, writeOutput } from "./tabular.format";
import { Request as RequestSchema } from "./tabular.protocol";
import type { Request } from "./tabular.protocol";

const source = (text: string): T.Source => {
  const bytes = new TextEncoder().encode(text);
  return { name: "test.csv", bytes, size: bytes.length };
};
const real = {
  parse: (s: T.Source, o: T.ParseOptions, c: Parameters<typeof parseFile>[2]) =>
    Promise.resolve(parseFile(s, o, c)),
  write: (
    job: Parameters<typeof writeOutput>[0],
    c: Parameters<typeof writeOutput>[1]
  ) => Promise.resolve(writeOutput(job, c)),
};
const request = (
  id: string,
  operation: Request["operation"],
  payload: unknown
) => ({ version: 1, requestId: T.RequestId.make(id), operation, payload });

const call = (
  engine: TabularController,
  id: string,
  operation: Request["operation"],
  payload: unknown
) =>
  engine.run(
    Schema.decodeUnknownSync(RequestSchema)(request(id, operation, payload))
  );
const open = (engine: TabularController, id = "open") =>
  Effect.gen(function* () {
    const c = yield* call(engine, id, "prepareOpen", {
      source: source("a,b\n1,2\n3,4"),
      options: T.defaultParseOptions,
      job: { requestId: id },
    }).pipe(Effect.flatMap(Schema.decodeUnknownEffect(T.Candidate)));
    return yield* call(engine, `${id}-accept`, "acceptOpen", {
      candidateId: c.candidateId,
      replace: null,
      acknowledgeValuesOnly: false,
      requestId: `${id}-accept`,
    }).pipe(Effect.flatMap(Schema.decodeUnknownEffect(T.Session)));
  });
it.effect(
  "keeps one atomic history entry when a request is retransmitted",
  () =>
    Effect.gen(function* () {
      const engine = new TabularController(real, async () => {});
      const s = yield* open(engine);
      const [sheet] = s.sheets;
      if (!sheet) {
        throw new Error("Missing");
      }
      const payload = {
        sessionId: s.sessionId,
        expectedRevision: 0,
        requestId: "edit",
        edit: {
          _tag: "InsertRows",
          sheetId: sheet.sheetId,
          before: null,
          count: 1,
        },
      };
      const a = yield* call(engine, "edit", "edit", payload);
      const b = yield* call(engine, "edit", "edit", payload);
      expect(a).toEqual(b);
      const current = yield* call(engine, "summary", "summary", {
        sessionId: s.sessionId,
        requestId: "summary",
      }).pipe(Effect.flatMap(Schema.decodeUnknownEffect(T.Session)));
      expect(current.history.undoCount).toBe(1);
      expect(current.revision).toBe(1);
    })
);
it.effect(
  "retains the accepted session on failed replacement and requires discard",
  () =>
    Effect.gen(function* () {
      const engine = new TabularController(real, async () => {});
      const s = yield* open(engine);
      const [sheet] = s.sheets;
      if (!sheet) {
        throw new Error("Missing");
      }
      yield* call(engine, "edit", "edit", {
        sessionId: s.sessionId,
        expectedRevision: 0,
        requestId: "edit",
        edit: {
          _tag: "InsertRows",
          sheetId: sheet.sheetId,
          before: null,
          count: 1,
        },
      });
      const p = yield* call(engine, "replacement", "prepareOpen", {
        source: source("new\nfile"),
        options: T.defaultParseOptions,
        job: { requestId: "replacement" },
      }).pipe(Effect.flatMap(Schema.decodeUnknownEffect(T.Candidate)));
      const failure = yield* call(engine, "accept-replacement", "acceptOpen", {
        candidateId: p.candidateId,
        replace: {
          sessionId: s.sessionId,
          expectedRevision: 1,
          discardEdits: false,
        },
        acknowledgeValuesOnly: false,
        requestId: "accept-replacement",
      }).pipe(Effect.flip);
      expect(failure._tag).toBe("DiscardRequired");
      const current = yield* call(engine, "summary", "summary", {
        sessionId: s.sessionId,
        requestId: "summary",
      }).pipe(Effect.flatMap(Schema.decodeUnknownEffect(T.Session)));
      expect(current.revision).toBe(1);
      expect(current.history.dirty).toBe(true);
    })
);
it.effect(
  "cancels candidate jobs and never replaces the accepted session",
  () =>
    Effect.gen(function* () {
      const entered = yield* Deferred.make<null>();
      const release = yield* Deferred.make<null>();
      const engine = new TabularController(
        {
          ...real,
          parse: async (s, o, c, signal) => {
            if (c.requestId === "slow") {
              await Effect.runPromise(Deferred.succeed(entered, null));
              await Effect.runPromise(Deferred.await(release));
              if (signal.aborted) {
                throw new T.Cancelled({ ...c, phase: "reading" });
              }
            }
            return parseFile(s, o, c);
          },
        },
        async () => {}
      );
      const s = yield* open(engine);
      const fiber = yield* call(engine, "slow", "prepareOpen", {
        source: source("new\nfile"),
        options: T.defaultParseOptions,
        job: { requestId: "slow" },
      }).pipe(Effect.forkChild);
      yield* Deferred.await(entered);
      yield* call(engine, "cancel", "cancel", { requestId: "slow" });
      yield* Deferred.succeed(release, null);
      const error = yield* Fiber.join(fiber).pipe(Effect.flip);
      expect(error._tag).toBe("Cancelled");
      const current = yield* call(engine, "summary", "summary", {
        sessionId: s.sessionId,
        requestId: "summary",
      }).pipe(Effect.flatMap(Schema.decodeUnknownEffect(T.Session)));
      expect(current.sessionId).toBe(s.sessionId);
    })
);
it.effect("supersedes a slow view and rejects stale export plans", () =>
  Effect.gen(function* () {
    const engine = new TabularController(real, async () => {});
    const s = yield* open(engine);
    const [sheet] = s.sheets;
    if (!sheet) {
      throw new Error("Missing");
    }
    const options: T.ExportOptions = {
      format: "csv",
      scope: { _tag: "WholeSheet", sheetId: sheet.sheetId },
      delimiter: ",",
      newline: "crlf",
      bom: false,
      textPolicy: "exact",
      jsonShape: "auto",
    };
    const plan = yield* call(engine, "plan", "planExport", {
      sessionId: s.sessionId,
      expectedRevision: 0,
      requestId: "plan",
      options,
    }).pipe(Effect.flatMap(Schema.decodeUnknownEffect(T.ExportPlan)));
    yield* call(engine, "edit", "edit", {
      sessionId: s.sessionId,
      expectedRevision: 0,
      requestId: "edit",
      edit: {
        _tag: "InsertRows",
        sheetId: sheet.sheetId,
        before: null,
        count: 1,
      },
    });
    const error = yield* call(engine, "export", "exportBytes", {
      sessionId: s.sessionId,
      expectedRevision: 1,
      requestId: "export",
      planId: plan.planId,
      acknowledgeValuesOnly: true,
    }).pipe(Effect.flip);
    expect(error._tag).toBe("StaleExportPlan");
  })
);

it.effect(
  "keeps committed edits after a format Worker fails during export",
  () =>
    Effect.gen(function* () {
      const engine = new TabularController(
        {
          ...real,
          write: (_job, c) =>
            Promise.reject(new T.EngineFailed({ ...c, phase: "writing" })),
        },
        () => Promise.resolve()
      );
      const s = yield* open(engine);
      const [sheet] = s.sheets;
      if (!sheet) {
        throw new Error("Missing");
      }
      yield* call(engine, "change", "edit", {
        sessionId: s.sessionId,
        expectedRevision: 0,
        requestId: "change",
        edit: {
          _tag: "InsertRows",
          sheetId: sheet.sheetId,
          before: null,
          count: 1,
        },
      });
      const p = yield* call(engine, "plan-failed", "planExport", {
        sessionId: s.sessionId,
        expectedRevision: 1,
        requestId: "plan-failed",
        options: {
          format: "xlsx",
          scope: { _tag: "WholeWorkbook" },
          delimiter: ",",
          newline: "crlf",
          bom: false,
          textPolicy: "exact",
          jsonShape: "auto",
        },
      }).pipe(Effect.flatMap(Schema.decodeUnknownEffect(T.ExportPlan)));
      const error = yield* call(engine, "write-failed", "exportBytes", {
        sessionId: s.sessionId,
        expectedRevision: 1,
        requestId: "write-failed",
        planId: p.planId,
        acknowledgeValuesOnly: true,
      }).pipe(Effect.flip);
      expect(error._tag).toBe("EngineFailed");
      const current = yield* call(engine, "current", "summary", {
        sessionId: s.sessionId,
        requestId: "current",
      }).pipe(Effect.flatMap(Schema.decodeUnknownEffect(T.Session)));
      expect(current.history.dirty).toBe(true);
      expect(current.revision).toBe(1);
    })
);
it.effect(
  "reparses retained bytes with Sheet header overrides and checks stale replacement guards",
  () =>
    Effect.gen(function* () {
      const engine = new TabularController(real, () => Promise.resolve());
      const s = yield* open(engine);
      const [sheet] = s.sheets;
      if (!sheet) {
        throw new Error("Missing");
      }
      const p = yield* call(engine, "reparse", "prepareReparse", {
        guard: { sessionId: s.sessionId, expectedRevision: 0 },
        options: {
          ...T.defaultParseOptions,
          sheetHeaders: [{ sheetId: sheet.sheetId, header: false }],
        },
        job: { requestId: "reparse" },
      }).pipe(Effect.flatMap(Schema.decodeUnknownEffect(T.Candidate)));
      expect(p.sheets[0]?.header).toBe(false);
      const stale = yield* call(engine, "stale", "acceptOpen", {
        candidateId: p.candidateId,
        replace: {
          sessionId: s.sessionId,
          expectedRevision: 1,
          discardEdits: true,
        },
        acknowledgeValuesOnly: false,
        requestId: "stale",
      }).pipe(Effect.flip);
      expect(stale._tag).toBe("RevisionConflict");
      const next = yield* call(engine, "reparse-accept", "acceptOpen", {
        candidateId: p.candidateId,
        replace: {
          sessionId: s.sessionId,
          expectedRevision: 0,
          discardEdits: true,
        },
        acknowledgeValuesOnly: false,
        requestId: "reparse-accept",
      }).pipe(Effect.flatMap(Schema.decodeUnknownEffect(T.Session)));
      expect(next.sessionId).not.toBe(s.sessionId);
      expect(next.sheets[0]?.rowCount).toBe(3);
      expect(next.history.dirty).toBe(false);
    })
);

it.effect(
  "drops an export result after another session replaces its source",
  () =>
    Effect.gen(function* () {
      const entered = yield* Deferred.make<null>();
      const release = yield* Deferred.make<null>();
      const engine = new TabularController(
        {
          ...real,
          write: async (job, c) => {
            await Effect.runPromise(Deferred.succeed(entered, null));
            await Effect.runPromise(Deferred.await(release));
            return writeOutput(job, c);
          },
        },
        () => Promise.resolve()
      );
      const s = yield* open(engine);
      const [sheet] = s.sheets;
      if (!sheet) {
        throw new Error("Missing Sheet");
      }
      const plan = yield* call(engine, "old-plan", "planExport", {
        sessionId: s.sessionId,
        expectedRevision: 0,
        requestId: "old-plan",
        options: {
          format: "csv",
          scope: { _tag: "WholeSheet", sheetId: sheet.sheetId },
          delimiter: ",",
          newline: "crlf",
          bom: false,
          textPolicy: "exact",
          jsonShape: "auto",
        },
      }).pipe(Effect.flatMap(Schema.decodeUnknownEffect(T.ExportPlan)));
      const writing = yield* call(engine, "old-write", "exportBytes", {
        sessionId: s.sessionId,
        expectedRevision: 0,
        requestId: "old-write",
        planId: plan.planId,
        acknowledgeValuesOnly: false,
      }).pipe(Effect.forkChild);
      yield* Deferred.await(entered);
      const candidate = yield* call(engine, "new-source", "prepareOpen", {
        source: source("new\nfile"),
        options: T.defaultParseOptions,
        job: { requestId: "new-source" },
      }).pipe(Effect.flatMap(Schema.decodeUnknownEffect(T.Candidate)));
      const next = yield* call(engine, "new-accept", "acceptOpen", {
        candidateId: candidate.candidateId,
        replace: {
          sessionId: s.sessionId,
          expectedRevision: 0,
          discardEdits: true,
        },
        requestId: "new-accept",
        acknowledgeValuesOnly: false,
      }).pipe(Effect.flatMap(Schema.decodeUnknownEffect(T.Session)));
      yield* Deferred.succeed(release, null);
      const error = yield* Fiber.join(writing).pipe(Effect.flip);
      expect(error._tag).toBe("StaleSession");
      const current = yield* call(engine, "new-summary", "summary", {
        sessionId: next.sessionId,
        requestId: "new-summary",
      }).pipe(Effect.flatMap(Schema.decodeUnknownEffect(T.Session)));
      expect(current.sessionId).toBe(next.sessionId);
      expect(current.revision).toBe(0);
    })
);
