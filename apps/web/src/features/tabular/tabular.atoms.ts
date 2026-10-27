import { Effect, Layer, Stream } from "effect";
import { Atom } from "effect/reactivity";

import type * as T from "./tabular";
import { TabularEngine } from "./tabular.service";
import { tabularWorkerFactoryLayer } from "./tabular.worker-client";

/** Make once per route. Mount `runtime` for that route lifetime and call close
 * before navigation. The runtime finalizer terminates Workers on route disposal.
 * No keepAlive, serialization, or storage of data.
 */
export const makeTabularAtoms = (
  layer = TabularEngine.layer.pipe(Layer.provide(tabularWorkerFactoryLayer))
) => {
  const runtime = Atom.runtime(layer).pipe(Atom.setIdleTTL(0));
  let newestView: T.RequestId | null = null;
  let newestViewport: T.RequestId | null = null;
  const session = Atom.make<T.Session | null>(null);
  const candidate = Atom.make<T.Candidate | null>(null);
  const activeSheet = Atom.make<T.SheetId | null>(null);
  const view = Atom.make<T.View | null>(null);
  const viewport = Atom.make<T.Viewport | null>(null);
  const plan = Atom.make<T.ExportPlan | null>(null);
  const progress = Atom.make<T.Progress | null>(null);
  const failure = Atom.make<T.EngineError | null>(null);
  const accept = runtime.fn(
    Effect.fn("Tabular.Atoms.accept")(function* (input: T.AcceptOpen, get) {
      const engine = yield* TabularEngine;
      const opened = yield* engine.acceptOpen(input);
      get.set(session, opened);
      get.set(candidate, null);
      get.set(activeSheet, opened.sheets[0]?.sheetId ?? null);
      get.set(view, null);
      get.set(viewport, null);
      get.set(plan, null);
      return opened;
    })
  );
  const prepare = runtime.fn(
    Effect.fn("Tabular.Atoms.prepare")(function* (
      input: {
        readonly source: T.Source;
        readonly options: T.ParseOptions;
        readonly job: T.Job;
      },
      get
    ) {
      const engine = yield* TabularEngine;
      const prepared = yield* engine.prepareOpen(
        input.source,
        input.options,
        input.job
      );
      get.set(candidate, prepared);
      return prepared;
    })
  );
  const updateView = runtime.fn(
    Effect.fn("Tabular.Atoms.view")(function* (input: T.ViewRequest, get) {
      newestView = input.requestId;
      const engine = yield* TabularEngine;
      const next = yield* engine.setView(input);
      const current = get(session);
      if (
        current?.sessionId === next.sessionId &&
        current.revision === next.revision &&
        get(activeSheet) === next.sheetId &&
        newestView === input.requestId
      ) {
        get.set(view, next);
        get.set(viewport, null);
      }
      return next;
    })
  );
  const read = runtime.fn(
    Effect.fn("Tabular.Atoms.viewport")(function* (
      input: T.ViewportRequest,
      get
    ) {
      const engine = yield* TabularEngine;
      newestViewport = input.requestId;
      const next = yield* engine.readViewport(input);
      const current = get(session);
      if (
        current?.sessionId === next.sessionId &&
        current.revision === next.revision &&
        get(view)?.viewId === next.viewId &&
        newestViewport === input.requestId
      ) {
        get.set(viewport, next);
      }
      return next;
    })
  );
  const change = runtime.fn(
    Effect.fn("Tabular.Atoms.edit")(function* (
      input: T.EditRequest | T.HistoryRequest,
      get
    ) {
      const engine = yield* TabularEngine;
      const next = yield* "edit" in input
        ? engine.edit(input)
        : engine.history(input);
      const current = get(session);
      if (
        current?.sessionId === next.session.sessionId &&
        current.revision <= next.session.revision
      ) {
        get.set(session, next.session);
        get.set(view, null);
        get.set(viewport, null);
        get.set(plan, null);
        if (next.focus) {
          get.set(activeSheet, next.focus.sheetId);
        }
      }
      return next;
    })
  );
  const trackProgress = runtime.fn(
    Effect.fn("Tabular.Atoms.progress")(function* (
      requestId: T.RequestId,
      get
    ) {
      const engine = yield* TabularEngine;
      yield* engine.progress(requestId).pipe(
        Stream.runForEach((next) =>
          Effect.sync(() => {
            if (next.sessionId === (get(session)?.sessionId ?? null)) {
              get.set(progress, next);
            }
          })
        )
      );
    })
  );
  const exportBytes = runtime.fn(
    Effect.fn("Tabular.Atoms.exportBytes")(function* (input: T.ExportCommit) {
      const engine = yield* TabularEngine;
      return yield* engine.exportBytes(input);
    })
  );
  const cancel = runtime.fn(
    Effect.fn("Tabular.Atoms.cancel")(function* (input: T.Cancel) {
      const engine = yield* TabularEngine;
      return yield* engine.cancel(input);
    })
  );
  const planExport = runtime.fn(
    Effect.fn("Tabular.Atoms.planExport")(function* (
      input: T.ExportRequest,
      get
    ) {
      const engine = yield* TabularEngine;
      const next = yield* engine.planExport(input);
      const current = get(session);
      if (
        current?.sessionId === next.sessionId &&
        current.revision === next.revision
      ) {
        get.set(plan, next);
      }
      return next;
    })
  );
  const close = runtime.fn(
    Effect.fn("Tabular.Atoms.close")(function* (id: T.SessionId, get) {
      const engine = yield* TabularEngine;
      yield* engine.close(id);
      if (get(session)?.sessionId === id) {
        get.set(session, null);
        get.set(candidate, null);
        get.set(activeSheet, null);
        get.set(view, null);
        get.set(viewport, null);
        get.set(plan, null);
        get.set(progress, null);
        get.set(failure, null);
      }
    })
  );
  const inspect = runtime.fn(
    Effect.fn("Tabular.Atoms.inspect")(function* (input: T.ViewportRequest) {
      return yield* (yield* TabularEngine).readViewport(input);
    })
  );
  const inspectView = runtime.fn(
    Effect.fn("Tabular.Atoms.inspectView")(function* (input: T.ViewRequest) {
      return yield* (yield* TabularEngine).setView(input);
    })
  );
  const locate = runtime.fn(
    Effect.fn("Tabular.Atoms.locate")(function* (input: T.LocateRequest) {
      return yield* (yield* TabularEngine).locate(input);
    })
  );
  const warnings = runtime.fn(
    Effect.fn("Tabular.Atoms.warnings")(function* (input: T.WarningQuery) {
      return yield* (yield* TabularEngine).warnings(input);
    })
  );
  const discardCandidate = runtime.fn(
    Effect.fn("Tabular.Atoms.discardCandidate")(function* (
      input: {
        readonly candidateId: T.CandidateId;
        readonly requestId: T.RequestId;
      },
      get
    ) {
      yield* (yield* TabularEngine).discardCandidate(input.candidateId, input);
      get.set(candidate, null);
    })
  );
  const reparse = runtime.fn(
    Effect.fn("Tabular.Atoms.reparse")(function* (
      input: {
        readonly guard: T.Guard;
        readonly options: T.ParseOptions;
        readonly job: T.Job;
      },
      get
    ) {
      const next = yield* (yield* TabularEngine).prepareReparse(
        input.guard,
        input.options,
        input.job
      );
      get.set(candidate, next);
      return next;
    })
  );
  const busy = Atom.make((get) =>
    [
      get(prepare),
      get(accept),
      get(updateView),
      get(read),
      get(change),
      get(planExport),
      get(exportBytes),
    ].some((result) => result.waiting)
  );
  return {
    runtime,
    session,
    candidate,
    activeSheet,
    view,
    viewport,
    plan,
    progress,
    trackProgress,
    busy,
    failure,
    prepare,
    accept,
    updateView,
    read,
    change,
    planExport,
    exportBytes,
    cancel,
    close,
    inspect,
    inspectView,
    locate,
    warnings,
    reparse,
    discardCandidate,
  };
};
