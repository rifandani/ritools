/* oxlint-disable typescript/no-non-null-assertion, unicorn/no-invalid-void-type -- The atoms check the session revision before the non-null read. */
import type { Layer } from "effect";
import { Effect, Stream } from "effect";
import { Atom } from "effect/reactivity";

import * as F from "./folio";
import type { FolioFailure, Request, Response } from "./folio";
import { FolioEngine } from "./folio.service";
import type { RenderedOutput } from "./folio.service";

type Reply<K extends Response["_tag"]> = Extract<Response, { _tag: K }>;
type SearchInput = Omit<
  Extract<Request, { _tag: "Search" }>,
  "_tag" | "request" | "session" | "revision"
>;

/** Make once per route. Mount `runtime` for that route lifetime and call close
 * before navigation. The runtime finalizer terminates the Worker on disposal.
 * No keepAlive, serialization, or storage of user data.
 */
export const makeFolioAtoms = (
  layer: Layer.Layer<FolioEngine, never, never>
) => {
  const runtime = Atom.runtime(layer).pipe(Atom.setIdleTTL(0));
  let serial = 0;
  const request = () => F.RequestId.make(`request-${(serial += 1)}`);
  const snapshot = Atom.make<F.Snapshot | null>(null);
  const plan = Atom.make<F.ExportPlan | null>(null);
  const progress = Atom.make<Reply<"Progress"> | null>(null);
  const failure = Atom.make<FolioFailure | null>(null);
  const lastRendered = Atom.make<RenderedOutput | null>(null);
  const closeRendered = (get: {
    readonly set: (
      atom: typeof lastRendered,
      value: RenderedOutput | null
    ) => void;
    readonly once: (atom: typeof lastRendered) => RenderedOutput | null;
  }) => {
    // Read without a dependency. Reading and then writing this atom inside an
    // effectful atom would invalidate the running effect and loop.
    get.once(lastRendered)?.bitmap?.close();
    get.set(lastRendered, null);
  };

  const open = runtime.fn(
    Effect.fn("Folio.Atoms.open")(function* (
      input: {
        readonly bytes: Uint8Array;
        readonly name?: string;
        readonly password?: string;
      },
      get
    ) {
      closeRendered(get);
      const opened = yield* (yield* FolioEngine).open({
        request: request(),
        ...input,
      });
      get.set(snapshot, opened.snapshot);
      get.set(plan, null);
      get.set(failure, null);
      return opened;
    })
  );
  const inspectSource = runtime.fn(
    Effect.fn("Folio.Atoms.inspectSource")(function* (bytes: Uint8Array, get) {
      const current = get(snapshot);
      if (!current) {
        return yield* Effect.fail(
          F.FolioFailure.make({
            requestId: request(),
            code: "session-lost",
            sessionAlive: false,
          })
        );
      }
      return yield* (yield* FolioEngine).inspectSource({
        _tag: "InspectSource",
        request: request(),
        session: current.session,
        revision: current.revision,
        bytes,
      });
    })
  );
  const releaseSource = runtime.fn(
    Effect.fn("Folio.Atoms.releaseSource")(function* (
      input: { readonly source: F.SourceId },
      get
    ) {
      const current = get(snapshot);
      if (!current) {
        return;
      }
      yield* (yield* FolioEngine).releaseSource({
        _tag: "ReleaseSource",
        request: request(),
        session: current.session,
        revision: current.revision,
        source: input.source,
      });
    })
  );
  const render = runtime.fn(
    Effect.fn("Folio.Atoms.render")(function* (viewport: F.Viewport, get) {
      const current = get(snapshot);
      if (!current) {
        return yield* Effect.fail(
          F.FolioFailure.make({
            requestId: request(),
            code: "session-lost",
            sessionAlive: false,
          })
        );
      }
      const rendered = yield* (yield* FolioEngine).readViewport({
        _tag: "ReadViewport",
        request: request(),
        session: current.session,
        revision: current.revision,
        viewport,
      });
      if (
        get(snapshot)?.session === current.session &&
        get(snapshot)?.revision === current.revision
      ) {
        closeRendered(get);
        get.set(lastRendered, rendered);
      } else {
        rendered.bitmap?.close();
      }
      return rendered;
    })
  );
  const thumbnail = runtime.fn(
    Effect.fn("Folio.Atoms.thumbnail")(function* (
      input: { readonly page: F.PageId; readonly maxWidth: number },
      get
    ) {
      const current = get(snapshot);
      if (!current) {
        return yield* Effect.fail(
          F.FolioFailure.make({
            requestId: request(),
            code: "session-lost",
            sessionAlive: false,
          })
        );
      }
      const rendered = yield* (yield* FolioEngine).readThumbnail({
        _tag: "ReadThumbnail",
        request: request(),
        session: current.session,
        revision: current.revision,
        page: input.page,
        maxWidth: input.maxWidth,
      });
      if (
        get(snapshot)?.session !== current.session ||
        get(snapshot)?.revision !== current.revision
      ) {
        rendered.bitmap?.close();
      }
      return rendered;
    })
  );
  const read = runtime.fn(
    Effect.fn("Folio.Atoms.read")(function* (
      input: {
        readonly tag:
          | "ReadText"
          | "ReadOutline"
          | "ReadForms"
          | "ReadAnnotations";
        readonly page: F.PageId | null;
      },
      get
    ) {
      const { tag, page } = input;
      const current = get(snapshot);
      if (!current) {
        return yield* Effect.fail(
          F.FolioFailure.make({
            requestId: request(),
            code: "session-lost",
            sessionAlive: false,
          })
        );
      }
      const engine = yield* FolioEngine;
      const base = {
        request: request(),
        session: current.session,
        revision: current.revision,
      };
      if (tag === "ReadText") {
        return yield* engine.readText({ _tag: tag, ...base, page: page! });
      }
      if (tag === "ReadAnnotations") {
        return yield* engine.readAnnotations({
          _tag: tag,
          ...base,
          page: page!,
        });
      }
      if (tag === "ReadForms") {
        return yield* engine.readForms({ _tag: tag, ...base });
      }
      return yield* engine.readOutline({ _tag: tag, ...base });
    })
  );
  const search = runtime.fn(
    Effect.fn("Folio.Atoms.search")(function* (input: SearchInput, get) {
      const current = get(snapshot);
      if (!current) {
        return yield* Effect.fail(
          F.FolioFailure.make({
            requestId: request(),
            code: "session-lost",
            sessionAlive: false,
          })
        );
      }
      return yield* (yield* FolioEngine).search({
        _tag: "Search",
        request: request(),
        session: current.session,
        revision: current.revision,
        ...input,
      });
    })
  );
  type CommitInput =
    | F.Command
    | { readonly command: F.Command; readonly commandId?: string };
  const commit = runtime.fn(
    Effect.fn("Folio.Atoms.commit")(function* (input: CommitInput, get) {
      const command = "_tag" in input ? input : input.command;
      const commandId =
        "_tag" in input
          ? `command-${(serial += 1)}`
          : (input.commandId ?? `command-${(serial += 1)}`);
      const current = get(snapshot);
      if (!current) {
        return yield* Effect.fail(
          F.FolioFailure.make({
            requestId: request(),
            code: "session-lost",
            sessionAlive: false,
          })
        );
      }
      const changed = yield* (yield* FolioEngine).commit({
        _tag: "Commit",
        request: request(),
        session: current.session,
        baseRevision: current.revision,
        commandId,
        command,
      });
      if (
        get(snapshot)?.session === changed.snapshot.session &&
        get(snapshot)!.revision <= changed.snapshot.revision
      ) {
        get.set(snapshot, changed.snapshot);
        get.set(plan, null);
      }
      return changed;
    })
  );
  const history = runtime.fn(
    Effect.fn("Folio.Atoms.history")(function* (
      direction: "undo" | "redo",
      get
    ) {
      const current = get(snapshot);
      if (!current) {
        return yield* Effect.fail(
          F.FolioFailure.make({
            requestId: request(),
            code: "session-lost",
            sessionAlive: false,
          })
        );
      }
      const input = {
        request: request(),
        session: current.session,
        baseRevision: current.revision,
      };
      const engine = yield* FolioEngine;
      const changed =
        direction === "undo"
          ? yield* engine.undo({ _tag: "Undo", ...input })
          : yield* engine.redo({ _tag: "Redo", ...input });
      // The engine serializes history and accepts only the current session, so
      // an accepted Changed result is safe to project.
      get.set(snapshot, changed.snapshot);
      get.set(plan, null);
      return changed;
    })
  );
  const planExport = runtime.fn(
    Effect.fn("Folio.Atoms.planExport")(function* (scope: F.ExportScope, get) {
      const current = get(snapshot);
      if (!current) {
        return yield* Effect.fail(
          F.FolioFailure.make({
            requestId: request(),
            code: "session-lost",
            sessionAlive: false,
          })
        );
      }
      const planned = yield* (yield* FolioEngine).planExport({
        _tag: "PlanExport",
        request: request(),
        session: current.session,
        revision: current.revision,
        scope,
      });
      if (
        get(snapshot)?.session === planned.plan.session &&
        get(snapshot)?.revision === planned.plan.revision
      ) {
        get.set(plan, planned.plan);
      }
      return planned;
    })
  );
  const write = runtime.fn(
    Effect.fn("Folio.Atoms.write")(function* (planId: F.PlanId, get) {
      const current = get(snapshot);
      if (!current) {
        return yield* Effect.fail(
          F.FolioFailure.make({
            requestId: request(),
            code: "session-lost",
            sessionAlive: false,
          })
        );
      }
      return yield* (yield* FolioEngine).write({
        _tag: "Write",
        request: request(),
        session: current.session,
        revision: current.revision,
        plan: planId,
      });
    })
  );
  const acknowledgeDownload = runtime.fn(
    Effect.fn("Folio.Atoms.acknowledgeDownload")(function* (
      planId: F.PlanId,
      get
    ) {
      const current = get(snapshot);
      if (!current) {
        return;
      }
      const acknowledged = yield* (yield* FolioEngine).acknowledgeDownload({
        _tag: "AcknowledgeDownload",
        request: request(),
        session: current.session,
        revision: current.revision,
        plan: planId,
      });
      if (get(snapshot)?.session === acknowledged.snapshot.session) {
        get.set(snapshot, acknowledged.snapshot);
      }
      return acknowledged;
    })
  );
  const trackProgress = runtime.fn(
    Effect.fn("Folio.Atoms.trackProgress")(function* (
      requestId: F.RequestId,
      get
    ) {
      yield* (yield* FolioEngine).progress(requestId).pipe(
        Stream.runForEach((next) =>
          Effect.sync(() => {
            if (next.session === (get(snapshot)?.session ?? undefined)) {
              get.set(progress, next);
            }
          })
        )
      );
    })
  );
  const cancel = runtime.fn(
    Effect.fn("Folio.Atoms.cancel")(function* (target: F.RequestId) {
      yield* (yield* FolioEngine).cancel({
        _tag: "Cancel",
        request: request(),
        target,
      });
    })
  );
  const close = runtime.fn(
    Effect.fn("Folio.Atoms.close")(function* (_input: void, get) {
      const current = get(snapshot);
      if (current) {
        yield* (yield* FolioEngine).close({
          request: request(),
          session: current.session,
        });
      }
      closeRendered(get);
      get.set(snapshot, null);
      get.set(plan, null);
      get.set(progress, null);
      get.set(failure, null);
    })
  );
  const busy = Atom.make((get) =>
    [
      get(open),
      get(inspectSource),
      get(releaseSource),
      get(render),
      get(thumbnail),
      get(read),
      get(search),
      get(commit),
      get(history),
      get(planExport),
      get(write),
      get(acknowledgeDownload),
      get(close),
    ].some((result) => result.waiting)
  );
  return {
    runtime,
    snapshot,
    plan,
    progress,
    failure,
    lastRendered,
    busy,
    open,
    inspectSource,
    releaseSource,
    render,
    thumbnail,
    read,
    search,
    commit,
    history,
    planExport,
    write,
    acknowledgeDownload,
    trackProgress,
    cancel,
    close,
  };
};
