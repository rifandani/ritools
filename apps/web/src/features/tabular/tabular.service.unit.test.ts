/* oxlint-disable anti-slop/no-unknown-parameters, anti-slop/no-shape-in-symbol-names -- This test exercises unknown Worker input and the fixed export protocol. */
import { expect, it } from "@effect/vitest";
import { Effect, Layer, Schema, Stream } from "effect";

import * as T from "./tabular";
import { TabularController } from "./tabular.controller";
import { parseFile, writeOutput } from "./tabular.format";
import { operations, Request } from "./tabular.protocol";
import { TabularEngine, TabularWorkerFactory } from "./tabular.service";

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
        write: (j, c) => Promise.resolve(writeOutput(j, c)),
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
