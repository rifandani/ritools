/* oxlint-disable anti-slop/no-unknown-parameters, anti-slop/no-shape-in-symbol-names, anti-slop/no-chained-type-assertions, anti-slop/require-safety-comment-for-type-assertion -- This test exercises unknown Worker input and the fixed export protocol. */
import { expect, it } from "@effect/vitest";
import { Effect, Fiber, Layer, Schema, Stream } from "effect";

import * as T from "./tabular";
import { TabularController } from "./tabular.controller";
import { parseFile, writeOutput } from "./tabular.format";
import { candidate, TabularModel } from "./tabular.model";
import { operations, Request } from "./tabular.protocol";
import { TabularEngine, TabularWorkerFactory } from "./tabular.service";

interface FakeOptions {
  readonly offline?: boolean;
  readonly throwOnCreate?: boolean;
  readonly throwOnSend?: boolean;
}

const makeFake = (options: FakeOptions = {}) => {
  const sent: {
    readonly requestId: T.RequestId;
    readonly operation: string;
    readonly payload: unknown;
  }[] = [];
  let handlers: {
    readonly message: (value: unknown) => void;
    readonly error: () => void;
  } | null = null;
  const port = {
    send: (raw: unknown) => {
      if (options.throwOnSend) {
        throw new Error("send failed");
      }
      sent.push(
        raw as {
          readonly requestId: T.RequestId;
          readonly operation: string;
          readonly payload: unknown;
        }
      );
    },
    subscribe: (next: {
      readonly message: (value: unknown) => void;
      readonly error: () => void;
    }) => {
      handlers = next;
    },
    terminate: () => {
      /* The fake port has no process. */
    },
  };
  const layer = Layer.succeed(TabularWorkerFactory, {
    offline: () => options.offline ?? false,
    load: () => Promise.resolve(),
    create: () => {
      if (options.throwOnCreate) {
        throw new Error("create failed");
      }
      return port;
    },
  });
  return {
    layer,
    sent,
    reply: (value: unknown) => handlers?.message(value),
    fail: () => handlers?.error(),
  };
};
const engineLayer = (fake: ReturnType<typeof makeFake>) =>
  TabularEngine.layer.pipe(Layer.provide(fake.layer));
const reply = (tag: string, requestId: T.RequestId, payload?: unknown) => ({
  version: 1,
  requestId,
  _tag: tag,
  payload,
});
const progress = (requestId: T.RequestId, phase: T.Progress["phase"]) => ({
  requestId,
  sessionId: null,
  phase,
  completed: 1,
  total: 2,
  unit: "rows" as const,
  cancellable: true,
});
const settle = Effect.andThen(
  Effect.yieldNow,
  Effect.andThen(Effect.yieldNow, Effect.yieldNow)
);
const failedReply = (id: T.RequestId) =>
  Schema.encodeSync(T.EngineError)(
    new T.EngineFailed({
      requestId: id,
      operation: "service",
      sessionId: null,
      phase: "reading",
    })
  );
const exercise = <A>(
  fake: ReturnType<typeof makeFake>,
  id: T.RequestId,
  effect: Effect.Effect<A, T.EngineError>
) =>
  Effect.gen(function* () {
    const fiber = yield* effect.pipe(Effect.forkChild);
    yield* settle;
    fake.reply(reply("Progress", id, progress(id, "reading")));
    fake.reply(reply("Failure", id, failedReply(id)));
    const error = yield* Fiber.join(fiber).pipe(Effect.flip);
    expect(error._tag).toBe("EngineFailed");
  });
const file = parseFile(
  {
    name: "service.csv",
    bytes: new TextEncoder().encode("a,b\n1,2"),
    size: 7,
  },
  T.defaultParseOptions,
  { requestId: T.RequestId.make("file"), operation: "test", sessionId: null }
);
const preview = candidate(file, T.CandidateId.make("service-candidate"));

const factory = Layer.succeed(TabularWorkerFactory, {
  offline: () => false,
  load: () => Promise.resolve(),
  create: () => {
    // oxlint-disable-next-line unicorn/consistent-function-scoping -- The subscribed handler belongs to this port instance.
    let receive: (value: unknown) => void = () => {
      /* Before subscription. */
    };
    const engine = new TabularController(
      {
        parse: (s, o, c) => Promise.resolve(parseFile(s, o, c)),
        write: (j, c) =>
          Promise.resolve({ bytes: writeOutput(j, c), pages: 0 }),
      },
      () => Promise.resolve()
    );
    return {
      subscribe: (handlers: { message: (v: unknown) => void }) => {
        receive = handlers.message;
      },
      terminate: () => {
        /* Test port has no process. */
      },
      send: (raw: unknown) => {
        const request = Schema.decodeUnknownSync(Request)(raw);
        Effect.runFork(
          engine.run(request).pipe(
            Effect.match({
              onSuccess: (payload) =>
                receive(
                  structuredClone({
                    version: 1,
                    requestId: request.requestId,
                    _tag: "Success",
                    payload: Schema.encodeUnknownSync(
                      operations[request.operation].output
                    )(payload),
                  })
                ),
              onFailure: (error) =>
                receive(
                  structuredClone({
                    version: 1,
                    requestId: request.requestId,
                    _tag: "Failure",
                    payload: Schema.encodeSync(T.EngineError)(error),
                  })
                ),
            })
          )
        );
      },
    };
  },
});
it.effect(
  "transports named failures and errors inside blocked plans through structured clone",
  () =>
    Effect.gen(function* () {
      const engine = yield* TabularEngine;
      const bad = yield* engine
        .prepareOpen(
          { name: "bad.xlsx", size: 3, bytes: new Uint8Array([1, 2, 3]) },
          T.defaultParseOptions,
          { requestId: T.RequestId.make("bad") }
        )
        .pipe(Effect.flip);
      expect(bad._tag).toBe("CorruptFile");
      const bytes = new TextEncoder().encode("a\nvalue");
      const c = yield* engine.prepareOpen(
        { name: "test.csv", size: bytes.length, bytes },
        T.defaultParseOptions,
        { requestId: T.RequestId.make("prepare") }
      );
      const s = yield* engine.acceptOpen({
        candidateId: c.candidateId,
        replace: null,
        acknowledgeValuesOnly: false,
        requestId: T.RequestId.make("accept"),
      });
      const [sheet] = s.sheets;
      if (!sheet) {
        throw new Error("Missing Sheet");
      }
      yield* engine.edit({
        sessionId: s.sessionId,
        expectedRevision: 0,
        requestId: T.RequestId.make("insert"),
        edit: {
          _tag: "InsertRows",
          sheetId: sheet.sheetId,
          before: null,
          count: 65_536,
        },
      });
      const p = yield* engine.planExport({
        sessionId: s.sessionId,
        expectedRevision: 1,
        requestId: T.RequestId.make("plan"),
        options: {
          format: "xls",
          scope: { _tag: "WholeSheet", sheetId: sheet.sheetId },
          delimiter: ",",
          newline: "crlf",
          bom: false,
          textPolicy: "exact",
          jsonShape: "auto",
          pdf: null,
          locale: "en-US",
        },
      });
      expect(p.blockedBy[0]?._tag).toBe("FormatLimit");
      const failure = yield* engine
        .exportBytes({
          sessionId: s.sessionId,
          expectedRevision: 1,
          requestId: T.RequestId.make("export"),
          planId: p.planId,
          acknowledgeValuesOnly: true,
        })
        .pipe(Effect.flip);
      expect(failure._tag).toBe("FormatLimit");
    }).pipe(Effect.provide(TabularEngine.layer.pipe(Layer.provide(factory))))
);

it.effect("ends progress when a first-load engine asset is unavailable", () =>
  Effect.gen(function* () {
    const engine = yield* TabularEngine;
    const requestId = T.RequestId.make("offline-load");
    const error = yield* engine
      .prepareOpen(
        { name: "empty.csv", size: 0, bytes: new Uint8Array() },
        T.defaultParseOptions,
        { requestId }
      )
      .pipe(Effect.flip);
    expect(error._tag).toBe("EngineOffline");
    const updates = yield* Stream.runCollect(engine.progress(requestId));
    expect(updates).toEqual([]);
  }).pipe(
    Effect.provide(
      TabularEngine.layer.pipe(
        Layer.provide(
          Layer.succeed(TabularWorkerFactory, {
            load: () => Promise.reject(new Error("Offline asset")),
            offline: () => true,
            create: () => {
              throw new Error("A missing engine must not start a Worker");
            },
          })
        )
      )
    )
  )
);

it.effect(
  "loads the asset, forwards worker progress, and records the session id",
  () => {
    const fake = makeFake();
    return Effect.gen(function* () {
      const engine = yield* TabularEngine;
      const requestId = T.RequestId.make("transport-prepare");
      const progressFiber = yield* Stream.runCollect(
        engine.progress(requestId)
      ).pipe(Effect.forkChild);
      yield* settle;
      const pending = yield* engine
        .prepareOpen(
          { name: "service.csv", size: 7, bytes: file.source.bytes },
          T.defaultParseOptions,
          { requestId }
        )
        .pipe(Effect.forkChild);
      yield* settle;
      expect(fake.sent[0]?.operation).toBe("prepareOpen");
      fake.reply(reply("Progress", requestId, progress(requestId, "reading")));
      fake.reply(reply("Success", requestId, preview));
      const prepared = yield* Fiber.join(pending);
      expect(prepared.candidateId).toBe(preview.candidateId);
      const updates = [...(yield* Fiber.join(progressFiber))];
      expect(updates.map((p) => p.phase)).toContain("loading-engine");
      expect(updates.some((p) => p.phase === "reading")).toBe(true);
    }).pipe(Effect.provide(engineLayer(fake)));
  }
);

it.effect("rejects malformed payloads and duplicate request ids", () => {
  const fake = makeFake();
  return Effect.gen(function* () {
    const engine = yield* TabularEngine;
    const bad = yield* engine
      .prepareOpen(
        {
          name: "bad.csv",
          size: -1,
          bytes: new Uint8Array(),
        } as unknown as T.Source,
        T.defaultParseOptions,
        { requestId: T.RequestId.make("bad") }
      )
      .pipe(Effect.flip);
    expect(bad._tag).toBe("InvalidRequest");
    const requestId = T.RequestId.make("duplicate");
    const first = yield* engine
      .prepareOpen(
        { name: "service.csv", size: 7, bytes: file.source.bytes },
        T.defaultParseOptions,
        { requestId }
      )
      .pipe(Effect.forkChild);
    yield* settle;
    const second = yield* engine
      .prepareOpen(
        { name: "service.csv", size: 7, bytes: file.source.bytes },
        T.defaultParseOptions,
        { requestId }
      )
      .pipe(Effect.flip);
    expect(second._tag).toBe("InvalidRequest");
    fake.reply(reply("Success", requestId, preview));
    expect((yield* Fiber.join(first)).candidateId).toBe(preview.candidateId);
    expect(fake.sent.filter((r) => r.operation === "prepareOpen")).toHaveLength(
      1
    );
  }).pipe(Effect.provide(engineLayer(fake)));
});

it.effect("turns bad replies and worker errors into engine failures", () => {
  const fake = makeFake();
  return Effect.gen(function* () {
    const engine = yield* TabularEngine;
    const request = (id: string) =>
      engine
        .prepareOpen(
          { name: "service.csv", size: 7, bytes: file.source.bytes },
          T.defaultParseOptions,
          { requestId: T.RequestId.make(id) }
        )
        .pipe(Effect.forkChild);
    const badId = T.RequestId.make("bad-reply");
    const bad = yield* request("bad-reply");
    yield* settle;
    fake.reply(reply("Success", badId, { nope: true }));
    expect((yield* Fiber.join(bad).pipe(Effect.flip))._tag).toBe(
      "EngineFailed"
    );

    const failureId = T.RequestId.make("failure-reply");
    const failure = yield* request("failure-reply");
    yield* settle;
    fake.reply(
      reply(
        "Failure",
        failureId,
        Schema.encodeSync(T.EngineError)(
          new T.EngineFailed({
            requestId: failureId,
            operation: "prepareOpen",
            sessionId: null,
            phase: "reading",
          })
        )
      )
    );
    expect((yield* Fiber.join(failure).pipe(Effect.flip))._tag).toBe(
      "EngineFailed"
    );

    const garbageId = T.RequestId.make("garbage-reply");
    const garbage = yield* request("garbage-reply");
    yield* settle;
    fake.reply({ version: 1, requestId: garbageId, _tag: "Success" });
    expect((yield* Fiber.join(garbage).pipe(Effect.flip))._tag).toBe(
      "EngineFailed"
    );

    const error = yield* request("worker-error");
    yield* settle;
    fake.fail();
    expect((yield* Fiber.join(error).pipe(Effect.flip))._tag).toBe(
      "EngineFailed"
    );
    // A late message from the stopped generation must be ignored.
    const lateId = T.RequestId.make("worker-error");
    fake.reply(reply("Progress", lateId, progress(lateId, "reading")));
  }).pipe(Effect.provide(engineLayer(fake)));
});

it.effect("reports a missing Worker as an engine failure", () => {
  const fake = makeFake({ throwOnCreate: true });
  return Effect.gen(function* () {
    const engine = yield* TabularEngine;
    const error = yield* engine
      .prepareOpen(
        { name: "service.csv", size: 7, bytes: file.source.bytes },
        T.defaultParseOptions,
        { requestId: T.RequestId.make("create") }
      )
      .pipe(Effect.flip);
    expect(error._tag).toBe("EngineFailed");
  }).pipe(Effect.provide(engineLayer(fake)));
});

it.effect("reports a send failure as an offline engine when offline", () => {
  const fake = makeFake({ offline: true, throwOnSend: true });
  return Effect.gen(function* () {
    const engine = yield* TabularEngine;
    const error = yield* engine
      .prepareOpen(
        { name: "service.csv", size: 7, bytes: file.source.bytes },
        T.defaultParseOptions,
        { requestId: T.RequestId.make("send") }
      )
      .pipe(Effect.flip);
    expect(error._tag).toBe("EngineOffline");
  }).pipe(Effect.provide(engineLayer(fake)));
});

it.effect(
  "cancels on interruption and closes the worker only for the open session",
  () => {
    const fake = makeFake();
    return Effect.gen(function* () {
      const engine = yield* TabularEngine;
      const session = new TabularModel(file, preview.candidateId).summary();
      const acceptId = T.RequestId.make("accept");
      const accepting = yield* engine
        .acceptOpen({
          requestId: acceptId,
          candidateId: preview.candidateId,
          replace: null,
          acknowledgeValuesOnly: false,
        })
        .pipe(Effect.forkChild);
      yield* settle;
      fake.reply(reply("Success", acceptId, session));
      yield* Fiber.join(accepting);

      const canceling = yield* engine
        .cancel({ requestId: T.RequestId.make("cancelled") })
        .pipe(Effect.forkChild);
      yield* settle;
      const cancelRequest = fake.sent.find((r) => r.operation === "cancel");
      if (!cancelRequest) {
        throw new Error("Missing cancel request");
      }
      fake.reply(reply("Success", cancelRequest.requestId));
      expect(yield* Fiber.join(canceling)).toBeUndefined();

      const slow = yield* engine
        .prepareOpen(
          { name: "service.csv", size: 7, bytes: file.source.bytes },
          T.defaultParseOptions,
          { requestId: T.RequestId.make("slow") }
        )
        .pipe(Effect.forkChild);
      yield* settle;
      yield* Fiber.interrupt(slow);
      expect(fake.sent.at(-1)?.operation).toBe("cancel");

      const closingOther = yield* engine
        .close(T.SessionId.make("other-session"))
        .pipe(Effect.forkChild);
      yield* settle;
      const otherClose = fake.sent.findLast((r) => r.operation === "close");
      if (!otherClose) {
        throw new Error("Missing close request");
      }
      fake.reply(reply("Success", otherClose.requestId));
      yield* Fiber.join(closingOther);

      const closing = yield* engine
        .close(session.sessionId)
        .pipe(Effect.forkChild);
      yield* settle;
      const closeRequest = fake.sent.findLast((r) => r.operation === "close");
      if (!closeRequest) {
        throw new Error("Missing close request");
      }
      fake.reply(reply("Success", closeRequest.requestId));
      yield* Fiber.join(closing);
    }).pipe(Effect.provide(engineLayer(fake)));
  }
);

it.effect("fails pending work as offline and ignores repeated errors", () => {
  const fake = makeFake({ offline: true });
  return Effect.gen(function* () {
    const engine = yield* TabularEngine;
    const requestId = T.RequestId.make("offline-pending");
    const pending = yield* engine
      .prepareOpen(
        { name: "service.csv", size: 7, bytes: file.source.bytes },
        T.defaultParseOptions,
        { requestId }
      )
      .pipe(Effect.forkChild);
    yield* settle;
    fake.fail();
    fake.fail();
    const error = yield* Fiber.join(pending).pipe(Effect.flip);
    expect(error._tag).toBe("EngineOffline");
  }).pipe(Effect.provide(engineLayer(fake)));
});

it.effect("multiplexes progress streams for one request", () => {
  const fake = makeFake();
  return Effect.gen(function* () {
    const engine = yield* TabularEngine;
    const requestId = T.RequestId.make("multi-progress");
    const one = yield* Stream.runCollect(engine.progress(requestId)).pipe(
      Effect.forkChild
    );
    const two = yield* Stream.runCollect(engine.progress(requestId)).pipe(
      Effect.forkChild
    );
    yield* settle;
    const pending = yield* engine
      .prepareOpen(
        { name: "service.csv", size: 7, bytes: file.source.bytes },
        T.defaultParseOptions,
        { requestId }
      )
      .pipe(Effect.forkChild);
    yield* settle;
    fake.reply(reply("Progress", requestId, progress(requestId, "reading")));
    fake.reply(
      reply(
        "Failure",
        requestId,
        Schema.encodeSync(T.EngineError)(
          new T.EngineFailed({
            requestId,
            operation: "prepareOpen",
            sessionId: null,
            phase: "reading",
          })
        )
      )
    );
    yield* Fiber.join(pending).pipe(Effect.flip);
    expect([...(yield* Fiber.join(one))].length).toBeGreaterThan(0);
    expect([...(yield* Fiber.join(two))].length).toBeGreaterThan(0);
  }).pipe(Effect.provide(engineLayer(fake)));
});

it.effect("forwards every service method to the worker", () => {
  const fake = makeFake();
  return Effect.gen(function* () {
    const engine = yield* TabularEngine;
    yield* engine.close(T.SessionId.make("never-opened"));

    const sessionId = T.SessionId.make("service-session");
    const sheetId = T.SheetId.make("service-sheet");
    const viewId = T.ViewId.make("service-view");
    const address = {
      sheetId,
      rowId: T.RowId.make("service-row"),
      columnId: T.ColumnId.make("service-column"),
    };
    const guard = { sessionId, expectedRevision: 0 };
    const reparse = T.RequestId.make("reparse");
    yield* exercise(
      fake,
      reparse,
      engine.prepareReparse(guard, T.defaultParseOptions, {
        requestId: reparse,
      })
    );
    const discard = T.RequestId.make("discard");
    yield* exercise(
      fake,
      discard,
      engine.discardCandidate(T.CandidateId.make("candidate"), {
        requestId: discard,
      })
    );
    const summary = T.RequestId.make("summary");
    yield* exercise(
      fake,
      summary,
      engine.summary(sessionId, { requestId: summary })
    );
    const view = T.RequestId.make("view");
    yield* exercise(
      fake,
      view,
      engine.setView({
        ...guard,
        requestId: view,
        sheetId,
        search: "",
        sort: null,
      })
    );
    const viewport = T.RequestId.make("viewport");
    yield* exercise(
      fake,
      viewport,
      engine.readViewport({
        ...guard,
        requestId: viewport,
        viewId,
        rowStart: 0,
        rowCount: 1,
        columnStart: 0,
        columnCount: 1,
      })
    );
    const locate = T.RequestId.make("locate");
    yield* exercise(
      fake,
      locate,
      engine.locate({ ...guard, requestId: locate, viewId, address })
    );
    const warnings = T.RequestId.make("warnings");
    yield* exercise(
      fake,
      warnings,
      engine.warnings({
        ...guard,
        requestId: warnings,
        code: null,
        sheetId: null,
        offset: 0,
        limit: 1,
      })
    );
    const history = T.RequestId.make("history");
    yield* exercise(
      fake,
      history,
      engine.history({ ...guard, requestId: history, direction: "undo" })
    );
  }).pipe(Effect.provide(engineLayer(fake)));
});

const invalid = (effect: Effect.Effect<unknown, T.EngineError>) =>
  Effect.gen(function* () {
    const error = yield* effect.pipe(Effect.flip);
    expect(error._tag).toBe("InvalidRequest");
  });

it.effect(
  "rejects a malformed payload for split, merge, diff, and dedupe calls",
  () => {
    const fake = makeFake();
    return Effect.gen(function* () {
      const engine = yield* TabularEngine;
      let serial = 0;
      const id = () => T.RequestId.make(`new-op-${(serial += 1)}`);
      yield* invalid(engine.splitBytes({ requestId: id() } as never));
      yield* invalid(engine.mergeSource({ requestId: id() } as never));
      yield* invalid(engine.planMerge({ requestId: id() } as never));
      yield* invalid(engine.mergeBytes({ requestId: id() } as never));
      yield* invalid(engine.diffSource({ requestId: id() } as never));
      yield* invalid(engine.planDiff({ requestId: id() } as never));
      yield* invalid(engine.diffPage({ requestId: id() } as never));
      yield* invalid(engine.diffBytes({ requestId: id() } as never));
      yield* invalid(engine.previewDedupe({ requestId: id() } as never));
      const closeMerge = T.RequestId.make("close-merge");
      yield* exercise(
        fake,
        closeMerge,
        engine.closeMerge({ requestId: closeMerge })
      );
      const closeDiff = T.RequestId.make("close-diff");
      yield* exercise(
        fake,
        closeDiff,
        engine.closeDiff({ requestId: closeDiff })
      );
    }).pipe(Effect.provide(engineLayer(fake)));
  }
);
