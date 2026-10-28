/* oxlint-disable anti-slop/no-unknown-parameters, anti-slop/no-chained-type-assertions, anti-slop/require-safety-comment-for-type-assertion -- Tests decode raw wire payloads and forge one request beyond the protocol union. */
/* oxlint-disable anti-slop/no-shape-in-symbol-names -- Tests use the fixed public export field. */
import { readFileSync } from "node:fs";

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
  ) => Promise.resolve({ bytes: writeOutput(job, c), pages: 0 }),
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
const open = (engine: TabularController, id = "open", text = "a,b\n1,2\n3,4") =>
  Effect.gen(function* () {
    const c = yield* call(engine, id, "prepareOpen", {
      source: source(text),
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
      pdf: null,
      locale: "en-US",
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

it.effect("writes CSV parts with the header repeated", () =>
  Effect.gen(function* () {
    const engine = new TabularController(real, async () => {});
    const s = yield* open(engine);
    const [sheet] = s.sheets;
    if (!sheet) {
      throw new Error("Missing");
    }
    const result = yield* call(engine, "split", "splitBytes", {
      sessionId: s.sessionId,
      expectedRevision: 0,
      requestId: "split",
      acknowledgeValuesOnly: false,
      options: {
        sheetId: sheet.sheetId,
        rowsPerPart: 1,
        delimiter: ",",
        newline: "lf",
        bom: false,
        locale: "en-US",
      },
    }).pipe(Effect.flatMap(Schema.decodeUnknownEffect(T.SplitBytes)));
    expect(result.parts.map((part) => part.filename)).toEqual([
      "test-part-1-of-2.csv",
      "test-part-2-of-2.csv",
    ]);
    expect(result.writtenRows).toBe(2);
    expect(result.zipName).toBe("test-split.zip");
    expect(
      result.parts.map((part) => new TextDecoder().decode(part.bytes))
    ).toEqual(["a,b\n1,2\n", "a,b\n3,4\n"]);
  })
);

it.effect("merges the Parts of a Split back into the same table", () =>
  Effect.gen(function* () {
    const engine = new TabularController(real, async () => {});
    const s = yield* open(engine);
    const [sheet] = s.sheets;
    if (!sheet) {
      throw new Error("Missing");
    }
    const split = yield* call(engine, "split", "splitBytes", {
      sessionId: s.sessionId,
      expectedRevision: 0,
      requestId: "split",
      acknowledgeValuesOnly: false,
      options: {
        sheetId: sheet.sheetId,
        rowsPerPart: 1,
        delimiter: ",",
        newline: "lf",
        bom: false,
        locale: "en-US",
      },
    }).pipe(Effect.flatMap(Schema.decodeUnknownEffect(T.SplitBytes)));
    const reports: T.MergeSourceReport[] = [];
    for (const [index, part] of split.parts.entries()) {
      const report = yield* call(
        engine,
        `merge-source-${index}`,
        "mergeSource",
        {
          source: {
            _tag: "File",
            source: {
              name: part.filename,
              size: part.bytes.byteLength,
              bytes: part.bytes,
            },
          },
          requestId: `merge-source-${index}`,
        }
      ).pipe(Effect.flatMap(Schema.decodeUnknownEffect(T.MergeSourceReport)));
      reports.push(report);
    }
    const plan = yield* call(engine, "merge-plan", "planMerge", {
      sourceIds: reports.map((report) => report.sourceId),
      options: {
        header: true,
        delimiter: ",",
        newline: "lf",
        bom: false,
        locale: "en-US",
      },
      requestId: "merge-plan",
    }).pipe(Effect.flatMap(Schema.decodeUnknownEffect(T.MergePlan)));
    expect(plan.columns).toEqual(["a", "b"]);
    expect(plan.totalRows).toBe(2);
    expect(plan.filename).toBe("test-merged.csv");
    const merged = yield* call(engine, "merge", "mergeBytes", {
      planId: plan.planId,
      requestId: "merge",
    }).pipe(Effect.flatMap(Schema.decodeUnknownEffect(T.MergeBytes)));
    expect(new TextDecoder().decode(merged.bytes)).toBe("a,b\n1,2\n3,4\n");
    expect(merged.writtenRows).toBe(2);
    expect(merged.writtenColumns).toBe(2);
  })
);

it.effect("reads the open Sheet as a Merge Source", () =>
  Effect.gen(function* () {
    const engine = new TabularController(real, async () => {});
    const s = yield* open(engine);
    const [sheet] = s.sheets;
    if (!sheet) {
      throw new Error("Missing");
    }
    const report = yield* call(engine, "merge-source", "mergeSource", {
      source: {
        _tag: "Session",
        sessionId: s.sessionId,
        sheetId: sheet.sheetId,
      },
      requestId: "merge-source",
    }).pipe(Effect.flatMap(Schema.decodeUnknownEffect(T.MergeSourceReport)));
    expect(report.origin).toBe("session");
    expect(report.name).toBe("test.csv");
    const plan = yield* call(engine, "merge-plan", "planMerge", {
      sourceIds: [report.sourceId],
      options: {
        header: true,
        delimiter: ",",
        newline: "lf",
        bom: false,
        locale: "en-US",
      },
      requestId: "merge-plan",
    }).pipe(Effect.flatMap(Schema.decodeUnknownEffect(T.MergePlan)));
    expect(plan.totalRows).toBe(2);
    const merged = yield* call(engine, "merge", "mergeBytes", {
      planId: plan.planId,
      requestId: "merge",
    }).pipe(Effect.flatMap(Schema.decodeUnknownEffect(T.MergeBytes)));
    expect(new TextDecoder().decode(merged.bytes)).toBe("a,b\n1,2\n3,4\n");
    yield* call(engine, "close-merge", "closeMerge", {
      requestId: "close-merge",
    });
    const missing = yield* call(engine, "merge-again", "mergeBytes", {
      planId: plan.planId,
      requestId: "merge-again",
    }).pipe(Effect.flip);
    expect(missing._tag).toBe("InvalidRequest");
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
          pdf: null,
          locale: "en-US",
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
  "loads PDF metrics for a plan and returns the written page count",
  () =>
    Effect.gen(function* () {
      const engine = new TabularController(
        {
          ...real,
          write: () =>
            Promise.resolve({ bytes: new Uint8Array([1, 2, 3]), pages: 2 }),
        },
        () => Promise.resolve(),
        () => {
          /* No progress subscriber. */
        },
        () =>
          Promise.resolve({
            unitsPerEm: 1000,
            glyphs: new Map<number, number>(),
            fallbackAdvance: 500,
          })
      );
      const s = yield* open(engine);
      const [sheet] = s.sheets;
      if (!sheet) {
        throw new Error("Missing");
      }
      const plan = yield* call(engine, "pdf-plan", "planExport", {
        sessionId: s.sessionId,
        expectedRevision: 0,
        requestId: "pdf-plan",
        options: {
          format: "pdf",
          scope: { _tag: "WholeSheet", sheetId: sheet.sheetId },
          delimiter: ",",
          newline: "lf",
          bom: false,
          textPolicy: "exact",
          jsonShape: "auto",
          pdf: { page: "a4", orientation: "portrait" },
          locale: "en-US",
        },
      }).pipe(Effect.flatMap(Schema.decodeUnknownEffect(T.ExportPlan)));
      expect(plan.estimatedPages).not.toBeNull();
      const output = yield* call(engine, "pdf-write", "exportBytes", {
        sessionId: s.sessionId,
        expectedRevision: 0,
        requestId: "pdf-write",
        planId: plan.planId,
        acknowledgeValuesOnly: true,
      }).pipe(Effect.flatMap(Schema.decodeUnknownEffect(T.ExportBytes)));
      expect(output.writtenPages).toBe(2);
      expect(output.mime).toBe("application/pdf");
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
            return { bytes: writeOutput(job, c), pages: 0 };
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
          pdf: null,
          locale: "en-US",
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

it.effect("serves every read request and rejects stale or unknown state", () =>
  Effect.gen(function* () {
    const engine = new TabularController(real, async () => {});
    const s = yield* open(engine);
    const [sheet] = s.sheets;
    if (!sheet) {
      throw new Error("Missing Sheet");
    }
    const guard = { sessionId: s.sessionId, expectedRevision: 0 };
    const discarded = yield* call(engine, "discard", "discardCandidate", {
      candidateId: T.CandidateId.make("missing"),
      requestId: "discard",
    });
    expect(discarded).toBeUndefined();

    const view = yield* call(engine, "view", "setView", {
      ...guard,
      requestId: "view",
      sheetId: sheet.sheetId,
      search: "",
      sort: null,
    }).pipe(Effect.flatMap(Schema.decodeUnknownEffect(T.View)));
    const viewport = yield* call(engine, "viewport", "readViewport", {
      ...guard,
      requestId: "viewport",
      viewId: view.viewId,
      rowStart: 0,
      rowCount: 10,
      columnStart: 0,
      columnCount: 10,
    }).pipe(Effect.flatMap(Schema.decodeUnknownEffect(T.Viewport)));
    const [row] = viewport.rows;
    const [column] = viewport.columns;
    if (!row || !column) {
      throw new Error("Missing cell");
    }
    const location = yield* call(engine, "locate", "locate", {
      ...guard,
      requestId: "locate",
      viewId: view.viewId,
      address: {
        sheetId: sheet.sheetId,
        rowId: row.rowId,
        columnId: column.columnId,
      },
    }).pipe(Effect.flatMap(Schema.decodeUnknownEffect(T.Location)));
    expect(location).toEqual({ rowIndex: 0, columnIndex: 0 });
    const warnings = yield* call(engine, "warnings", "warnings", {
      ...guard,
      requestId: "warnings",
      code: null,
      sheetId: null,
      offset: 0,
      limit: 10,
    }).pipe(Effect.flatMap(Schema.decodeUnknownEffect(T.WarningPage)));
    expect(warnings.total).toBe(0);

    const missing = yield* call(engine, "summary", "summary", {
      sessionId: T.SessionId.make("other-session"),
      requestId: "summary",
    }).pipe(Effect.flip);
    expect(missing._tag).toBe("StaleSession");

    yield* call(engine, "edit", "edit", {
      ...guard,
      requestId: "edit",
      edit: {
        _tag: "InsertRows",
        sheetId: sheet.sheetId,
        before: null,
        count: 1,
      },
    });
    const history = yield* call(engine, "history", "history", {
      sessionId: s.sessionId,
      expectedRevision: 1,
      requestId: "history",
      direction: "undo",
    }).pipe(Effect.flatMap(Schema.decodeUnknownEffect(T.Change)));
    expect(history.focus?.reason).toBe("history");

    const empty = new TabularController(real, async () => {});
    const noModel = yield* call(empty, "empty-summary", "summary", {
      sessionId: s.sessionId,
      requestId: "empty-summary",
    }).pipe(Effect.flip);
    expect(noModel._tag).toBe("StaleSession");
    const unknown = yield* call(empty, "unknown", "acceptOpen", {
      candidateId: T.CandidateId.make("missing"),
      replace: null,
      acknowledgeValuesOnly: false,
      requestId: "unknown",
    }).pipe(Effect.flip);
    expect(unknown._tag).toBe("InvalidRequest");
    const prepared = yield* call(empty, "empty-prepare", "prepareOpen", {
      source: source("new\nfile"),
      options: T.defaultParseOptions,
      job: { requestId: "empty-prepare" },
    }).pipe(Effect.flatMap(Schema.decodeUnknownEffect(T.Candidate)));
    const replaceMissing = yield* call(empty, "replace", "acceptOpen", {
      candidateId: prepared.candidateId,
      replace: {
        sessionId: s.sessionId,
        expectedRevision: 0,
        discardEdits: true,
      },
      acknowledgeValuesOnly: false,
      requestId: "replace",
    }).pipe(Effect.flip);
    expect(replaceMissing._tag).toBe("StaleSession");

    const next = yield* call(engine, "next", "prepareOpen", {
      source: source("next\nfile"),
      options: T.defaultParseOptions,
      job: { requestId: "next" },
    }).pipe(Effect.flatMap(Schema.decodeUnknownEffect(T.Candidate)));
    const noReplace = yield* call(engine, "no-replace", "acceptOpen", {
      candidateId: next.candidateId,
      replace: null,
      acknowledgeValuesOnly: false,
      requestId: "no-replace",
    }).pipe(Effect.flip);
    expect(noReplace._tag).toBe("StaleSession");

    const bytes = new Uint8Array(
      readFileSync("docs/proofs/tabular/samples/values-lab.xlsx")
    );
    const xlsx = new TabularController(real, async () => {});
    const workbook = yield* call(xlsx, "xlsx", "prepareOpen", {
      source: { name: "values.xlsx", bytes, size: bytes.length },
      options: T.defaultParseOptions,
      job: { requestId: "xlsx" },
    }).pipe(Effect.flatMap(Schema.decodeUnknownEffect(T.Candidate)));
    const acknowledgement = yield* call(xlsx, "xlsx-accept", "acceptOpen", {
      candidateId: workbook.candidateId,
      replace: null,
      acknowledgeValuesOnly: false,
      requestId: "xlsx-accept",
    }).pipe(Effect.flip);
    expect(acknowledgement._tag).toBe("InvalidRequest");
  })
);

it.effect("aborts a request cancelled before and during a checkpoint", () =>
  Effect.gen(function* () {
    // oxlint-disable-next-line eslint/prefer-const -- The parser needs the controller it belongs to.
    let engine!: TabularController;
    let abortBefore = false;
    engine = new TabularController(
      {
        ...real,
        parse: async (src, o, c) => {
          if (abortBefore) {
            abortBefore = false;
            await Effect.runPromise(
              engine.run(
                Schema.decodeUnknownSync(RequestSchema)(
                  request("pre-cancel", "cancel", {
                    requestId: c.requestId,
                  })
                )
              )
            );
          }
          return parseFile(src, o, c);
        },
      },
      () => Promise.resolve()
    );
    abortBefore = true;
    const early = yield* call(engine, "pre-open", "prepareOpen", {
      source: source("a\nb"),
      options: T.defaultParseOptions,
      job: { requestId: "pre-open" },
    }).pipe(Effect.flip);
    expect(early._tag).toBe("Cancelled");

    // oxlint-disable-next-line eslint/prefer-const -- The yield hook needs the controller it belongs to.
    let during!: TabularController;
    during = new TabularController(real, async () => {
      await Effect.runPromise(
        during.run(
          Schema.decodeUnknownSync(RequestSchema)(
            request("during-cancel", "cancel", { requestId: "during-edit" })
          )
        )
      );
    });
    const s = yield* open(during);
    const [sheet] = s.sheets;
    if (!sheet) {
      throw new Error("Missing Sheet");
    }
    const late = yield* call(during, "during-edit", "edit", {
      sessionId: s.sessionId,
      expectedRevision: 0,
      requestId: "during-edit",
      edit: {
        _tag: "InsertRows",
        sheetId: sheet.sheetId,
        before: null,
        count: 1,
      },
    }).pipe(Effect.flip);
    expect(late._tag).toBe("Cancelled");
  })
);

it.effect("supersedes slow prepare and reparse owners", () =>
  Effect.gen(function* () {
    const entered = yield* Deferred.make<null>();
    const release = yield* Deferred.make<null>();
    const reparseEntered = yield* Deferred.make<null>();
    const reparseRelease = yield* Deferred.make<null>();
    const engine = new TabularController(
      {
        ...real,
        parse: async (s, o, c) => {
          if (c.requestId === "slow-prepare") {
            await Effect.runPromise(Deferred.succeed(entered, null));
            await Effect.runPromise(Deferred.await(release));
          }
          if (c.requestId === "slow-reparse") {
            await Effect.runPromise(Deferred.succeed(reparseEntered, null));
            await Effect.runPromise(Deferred.await(reparseRelease));
          }
          return parseFile(s, o, c);
        },
      },
      async () => {}
    );
    const slow = yield* call(engine, "slow-prepare", "prepareOpen", {
      source: source("slow\nfile"),
      options: T.defaultParseOptions,
      job: { requestId: "slow-prepare" },
    }).pipe(Effect.forkChild);
    yield* Deferred.await(entered);
    yield* call(engine, "fast-prepare", "prepareOpen", {
      source: source("fast\nfile"),
      options: T.defaultParseOptions,
      job: { requestId: "fast-prepare" },
    });
    yield* Deferred.succeed(release, null);
    const superseded = yield* Fiber.join(slow).pipe(Effect.flip);
    expect(superseded._tag).toBe("Cancelled");

    const s = yield* open(engine, "reparse-open");
    const slowReparse = yield* call(engine, "slow-reparse", "prepareReparse", {
      guard: { sessionId: s.sessionId, expectedRevision: 0 },
      options: T.defaultParseOptions,
      job: { requestId: "slow-reparse" },
    }).pipe(Effect.forkChild);
    yield* Deferred.await(reparseEntered);
    yield* call(engine, "fast-reparse", "prepareReparse", {
      guard: { sessionId: s.sessionId, expectedRevision: 0 },
      options: T.defaultParseOptions,
      job: { requestId: "fast-reparse" },
    });
    yield* Deferred.succeed(reparseRelease, null);
    const stale = yield* Fiber.join(slowReparse).pipe(Effect.flip);
    expect(stale._tag).toBe("Cancelled");
  })
);

it.effect("supersedes a slow view for the same Sheet", () =>
  Effect.gen(function* () {
    const entered = yield* Deferred.make<null>();
    const release = yield* Deferred.make<null>();
    let hold = false;
    const engine = new TabularController(real, async () => {
      if (hold) {
        hold = false;
        await Effect.runPromise(Deferred.succeed(entered, null));
        await Effect.runPromise(Deferred.await(release));
      }
    });
    const s = yield* open(engine);
    const [sheet] = s.sheets;
    if (!sheet) {
      throw new Error("Missing Sheet");
    }
    hold = true;
    const first = yield* call(engine, "view-one", "setView", {
      sessionId: s.sessionId,
      expectedRevision: 0,
      requestId: "view-one",
      sheetId: sheet.sheetId,
      search: "",
      sort: null,
    }).pipe(Effect.forkChild);
    yield* Deferred.await(entered);
    yield* call(engine, "view-two", "setView", {
      sessionId: s.sessionId,
      expectedRevision: 0,
      requestId: "view-two",
      sheetId: sheet.sheetId,
      search: "",
      sort: null,
    });
    yield* Deferred.succeed(release, null);
    const superseded = yield* Fiber.join(first).pipe(Effect.flip);
    expect(superseded._tag).toBe("Cancelled");
  })
);

it.effect(
  "rejects prepare options, unknown Sheet overrides, and shares in-flight work",
  () =>
    Effect.gen(function* () {
      const engine = new TabularController(real, async () => {});
      const headers = yield* call(engine, "headers", "prepareOpen", {
        source: source("a\nb"),
        options: {
          ...T.defaultParseOptions,
          sheetHeaders: [{ sheetId: T.SheetId.make("missing"), header: false }],
        },
        job: { requestId: "headers" },
      }).pipe(Effect.flip);
      expect(headers._tag).toBe("InvalidRequest");
      const s = yield* open(engine);
      const [sheet] = s.sheets;
      if (!sheet) {
        throw new Error("Missing Sheet");
      }
      const unknown = yield* call(engine, "reparse-unknown", "prepareReparse", {
        guard: { sessionId: s.sessionId, expectedRevision: 0 },
        options: {
          ...T.defaultParseOptions,
          sheetHeaders: [{ sheetId: T.SheetId.make("missing"), header: false }],
        },
        job: { requestId: "reparse-unknown" },
      }).pipe(Effect.flip);
      expect(unknown._tag).toBe("MissingIdentity");
      const reparse = yield* call(engine, "reparse", "prepareReparse", {
        guard: { sessionId: s.sessionId, expectedRevision: 0 },
        options: T.defaultParseOptions,
        job: { requestId: "reparse" },
      }).pipe(Effect.flatMap(Schema.decodeUnknownEffect(T.Candidate)));
      expect(reparse.sheets[0]?.header).toBe(true);

      const entered = yield* Deferred.make<null>();
      const release = yield* Deferred.make<null>();
      const slow = new TabularController(
        {
          ...real,
          parse: async (src, o, c) => {
            await Effect.runPromise(Deferred.succeed(entered, null));
            await Effect.runPromise(Deferred.await(release));
            return parseFile(src, o, c);
          },
        },
        () => Promise.resolve()
      );
      const one = yield* call(slow, "shared", "prepareOpen", {
        source: source("shared\nfile"),
        options: T.defaultParseOptions,
        job: { requestId: "shared" },
      }).pipe(Effect.forkChild);
      yield* Deferred.await(entered);
      const two = yield* call(slow, "shared", "prepareOpen", {
        source: source("shared\nfile"),
        options: T.defaultParseOptions,
        job: { requestId: "shared" },
      }).pipe(Effect.forkChild);
      yield* Deferred.succeed(release, null);
      const a = yield* Fiber.join(one).pipe(
        Effect.flatMap(Schema.decodeUnknownEffect(T.Candidate))
      );
      const b = yield* Fiber.join(two).pipe(
        Effect.flatMap(Schema.decodeUnknownEffect(T.Candidate))
      );
      expect(a.candidateId).toBe(b.candidateId);
    })
);

it.effect(
  "classifies thrown errors, closes pending jobs, and ignores forged requests",
  () =>
    Effect.gen(function* () {
      const engine = new TabularController(
        {
          ...real,
          parse: (src, o, c) => {
            if (c.requestId === "range") {
              return Promise.reject(new RangeError("too large"));
            }
            if (c.requestId === "generic") {
              return Promise.reject(new Error("unexpected"));
            }
            return Promise.resolve(parseFile(src, o, c));
          },
        },
        async () => {}
      );
      const range = yield* call(engine, "range", "prepareOpen", {
        source: source("a\nb"),
        options: T.defaultParseOptions,
        job: { requestId: "range" },
      }).pipe(Effect.flip);
      expect(range._tag).toBe("MemoryLimit");
      const generic = yield* call(engine, "generic", "prepareOpen", {
        source: source("a\nb"),
        options: T.defaultParseOptions,
        job: { requestId: "generic" },
      }).pipe(Effect.flip);
      expect(generic._tag).toBe("EngineFailed");

      const entered = yield* Deferred.make<null>();
      const release = yield* Deferred.make<null>();
      const closing = new TabularController(
        {
          ...real,
          parse: async (s, o, c) => {
            if (c.requestId === "slow-close") {
              await Effect.runPromise(Deferred.succeed(entered, null));
              await Effect.runPromise(Deferred.await(release));
            }
            return parseFile(s, o, c);
          },
        },
        async () => {}
      );
      const s = yield* open(closing);
      const slow = yield* call(closing, "slow-close", "prepareOpen", {
        source: source("slow\nfile"),
        options: T.defaultParseOptions,
        job: { requestId: "slow-close" },
      }).pipe(Effect.forkChild);
      yield* Deferred.await(entered);
      yield* call(closing, "closing", "close", { sessionId: s.sessionId });
      yield* Deferred.succeed(release, null);
      const cancelled = yield* Fiber.join(slow).pipe(Effect.flip);
      expect(cancelled._tag).toBe("Cancelled");
      const after = yield* call(closing, "after", "summary", {
        sessionId: s.sessionId,
        requestId: "after",
      }).pipe(Effect.flip);
      expect(after._tag).toBe("StaleSession");
      yield* call(closing, "closing-again", "close", {
        sessionId: s.sessionId,
      });

      const forged = {
        version: 1,
        requestId: T.RequestId.make("forged"),
        operation: "forged",
        payload: {},
      } as unknown as Request;
      expect(yield* engine.run(forged)).toBe(forged);
    })
);
it.effect("counts and applies a Dedupe through one wire request pair", () =>
  Effect.gen(function* () {
    const engine = new TabularController(real, async () => {});
    const s = yield* open(engine, "dedupe", "a\n1\n1\n2\n1\n");
    const [sheet] = s.sheets;
    if (!sheet) {
      throw new Error("Missing");
    }
    const preview = yield* call(engine, "dedupe-preview", "previewDedupe", {
      sessionId: s.sessionId,
      expectedRevision: s.revision,
      requestId: "dedupe-preview",
      options: { sheetId: sheet.sheetId, columnIds: null },
    }).pipe(Effect.flatMap(Schema.decodeUnknownEffect(T.DedupePreview)));
    expect(preview).toEqual({
      sessionId: s.sessionId,
      revision: s.revision,
      sheetId: sheet.sheetId,
      columnIds: null,
      rows: 4,
      duplicates: 2,
      remaining: 2,
    });
    const change = yield* call(engine, "dedupe-edit", "edit", {
      sessionId: s.sessionId,
      expectedRevision: s.revision,
      requestId: "dedupe-edit",
      edit: { _tag: "Dedupe", sheetId: sheet.sheetId, columnIds: null },
    }).pipe(Effect.flatMap(Schema.decodeUnknownEffect(T.Change)));
    expect(change.session.sheets[0]?.rowCount).toBe(2);
    expect(change.session.history.nextUndo?.kind).toBe("dedupe");
    expect(change.editId).not.toBeNull();
  })
);
