/* oxlint-disable anti-slop/require-safety-comment-for-type-assertion, anti-slop/no-chained-type-assertions, anti-slop/no-unknown-parameters, anti-slop/no-conditional-empty-object-spread, typescript/no-non-null-assertion, eslint/no-await-in-loop, eslint/require-await, unicorn/no-array-reverse, unicorn/no-array-sort, unicorn/no-await-expression-member, unicorn/relative-url-style, eslint/no-promise-executor-return, eslint/accessor-pairs, promise/avoid-new -- Tests use the branded contract fixture, run real async fixtures, and assert after explicit guards. */
import { expect, it } from "@effect/vitest";
import { Effect, Exit, Fiber, Layer, Schema } from "effect";

import * as F from "./folio";
import { FolioEngine, FolioWorkerFactory } from "./folio.service";
import type { FolioWorkerPort } from "./folio.service";

const snapshot = (
  revision = 0,
  downloaded: F.Revision | null = null
): F.Snapshot => ({
  session: "session:1" as F.SessionId,
  revision: revision as F.Revision,
  pages: [],
  facts: {
    pageCount: 1,
    encrypted: false,
    signed: false,
    hasText: true,
    hasForms: false,
    hasOutline: false,
    hasPageLabels: false,
    hasInternalLinks: false,
    hasMetadata: false,
    hasAttachments: false,
    hasTags: false,
    hasLayers: false,
    readOnlyReasons: [],
    permissions: {
      copy: true,
      annotate: true,
      fillForms: true,
      changePages: true,
      extract: true,
      download: true,
    },
  },
  history: F.emptyHistory(),
  downloadedRevision: downloaded,
});

const makeHarness = () => {
  let handlers: Parameters<FolioWorkerPort["subscribe"]>[0] | null = null;
  let onSend: ((request: Extract<Request, { _tag: string }>) => void) | null =
    null;
  let terminated = 0;
  let loaded = 0;
  const sent: unknown[] = [];
  const port: FolioWorkerPort = {
    send: (request) => {
      sent.push(request);
      queueMicrotask(() => onSend?.((request as { payload: Request }).payload));
    },
    subscribe: (next) => {
      handlers = next;
    },
    terminate: () => {
      terminated += 1;
    },
  };
  const layer = Layer.succeed(FolioWorkerFactory, {
    load: async () => {
      loaded += 1;
    },
    offline: () => false,
    create: () => port,
  });
  const reply = (payload: F.Response, bitmap?: unknown) =>
    handlers?.message({
      protocol: 1,
      payload: Schema.encodeUnknownSync(F.Response)(payload),
      ...(bitmap ? { bitmap } : {}),
    });
  return {
    layer,
    reply,
    emit: (payload: F.Response) => reply(payload),
    sent,
    get terminated() {
      return terminated;
    },
    get loaded() {
      return loaded;
    },
    set onSend(fn: typeof onSend) {
      onSend = fn;
    },
    error: () => handlers?.error(),
  };
};

type Request = F.Request;

it.live("routes open, progress, rejection, and worker loss", () => {
  const harness = makeHarness();
  return Effect.gen(function* () {
    const service = yield* FolioEngine;
    harness.onSend = (request) => {
      const target = request as Extract<Request, { request: F.RequestId }>;
      if (target._tag === "Open") {
        harness.reply({
          _tag: "Opened",
          request: target.request,
          snapshot: snapshot(),
        });
      }
    };
    const opened = yield* service.open({
      request: F.RequestId.make("open"),
      bytes: Uint8Array.from([1, 2, 3]),
      name: "test.pdf",
    });
    expect(opened.snapshot.session).toBe("session:1");
    expect(harness.loaded).toBe(1);

    harness.onSend = (request) => {
      const target = request as Extract<Request, { request: F.RequestId }>;
      harness.reply({
        _tag: "Progress",
        request: target.request,
        phase: "reading",
        completed: 1,
        total: 2,
      });
      harness.reply({
        _tag: "Opened",
        request: target.request,
        snapshot: snapshot(),
      });
    };
    harness.emit({
      _tag: "Progress",
      request: F.RequestId.make("progress"),
      phase: "reading",
      completed: 1,
      total: 2,
    });

    harness.onSend = (request) => {
      const target = request as Extract<Request, { request: F.RequestId }>;
      harness.reply({
        _tag: "Rejected",
        request: target.request,
        code: "wrong-password",
        reason: null,
        preservedRevision: null,
        sessionAlive: true,
        retry: "same-operation",
      });
    };
    const rejected = yield* service
      .open({
        request: F.RequestId.make("reject"),
        bytes: Uint8Array.from([1]),
      })
      .pipe(Effect.exit);
    expect(Exit.isFailure(rejected)).toBe(true);
    if (Exit.isFailure(rejected)) {
      expect(rejected.cause.reasons[0]).toMatchObject({
        _tag: "Fail",
        error: { code: "wrong-password" },
      });
    }

    harness.onSend = null;
    const pending = yield* service
      .open({
        request: F.RequestId.make("lost"),
        bytes: Uint8Array.from([1]),
      })
      .pipe(Effect.forkChild);
    yield* Effect.promise(
      () => new Promise((resolve) => setTimeout(resolve, 10))
    );
    harness.error();
    const lost = yield* Fiber.join(pending).pipe(Effect.exit);
    expect(Exit.isFailure(lost)).toBe(true);
    if (Exit.isFailure(lost)) {
      expect(lost.cause.reasons[0]).toMatchObject({
        _tag: "Fail",
        error: { code: "worker-lost" },
      });
    }
    expect(harness.terminated).toBe(1);
  }).pipe(Effect.provide(FolioEngine.layer.pipe(Layer.provide(harness.layer))));
});

it.live(
  "returns rendered bitmaps and closes them on non-render failures",
  () => {
    const harness = makeHarness();
    return Effect.gen(function* () {
      const service = yield* FolioEngine;
      let closed = 0;
      const bitmap = {
        close: () => {
          closed += 1;
        },
      } as unknown as ImageBitmap;
      harness.onSend = (request) => {
        const target = request as Extract<Request, { request: F.RequestId }>;
        harness.reply(
          {
            _tag: "Rendered",
            request: target.request,
            session: F.SessionId.make("session:1"),
            revision: 0 as F.Revision,
            page: "page:1" as F.PageId,
            width: 10,
            height: 10,
            transform: [1, 0, 0, 1, 0, 0],
            bitmapToken: "bitmap:1",
          },
          bitmap
        );
      };
      const rendered = yield* service.readViewport({
        _tag: "ReadViewport",
        request: F.RequestId.make("render"),
        session: F.SessionId.make("session:1"),
        revision: 0 as F.Revision,
        viewport: {
          page: "page:1" as F.PageId,
          clip: { x: 0, y: 0, width: 10, height: 10 },
          scale: 1,
          devicePixelRatio: 1,
          rotation: 0,
        },
      });
      expect(rendered.bitmap).toBe(bitmap);
      expect(rendered.rendered.width).toBe(10);

      harness.onSend = (request) => {
        const target = request as Extract<Request, { request: F.RequestId }>;
        harness.reply(
          {
            _tag: "Rejected",
            request: target.request,
            code: "stale-revision",
            reason: null,
            preservedRevision: 0 as F.Revision,
            sessionAlive: true,
            retry: "same-operation",
          },
          bitmap
        );
      };
      const failed = yield* service
        .readThumbnail({
          _tag: "ReadThumbnail",
          request: F.RequestId.make("thumb"),
          session: F.SessionId.make("session:1"),
          revision: 0 as F.Revision,
          page: "page:1" as F.PageId,
          maxWidth: 10,
        })
        .pipe(Effect.exit);
      expect(Exit.isFailure(failed)).toBe(true);
      expect(closed).toBe(1);
    }).pipe(
      Effect.provide(FolioEngine.layer.pipe(Layer.provide(harness.layer)))
    );
  }
);

it.live(
  "closes the worker after a successful close and forwards writable bytes",
  () => {
    const harness = makeHarness();
    return Effect.gen(function* () {
      const service = yield* FolioEngine;
      harness.onSend = (request) => {
        const target = request as Extract<Request, { request: F.RequestId }>;
        if (target._tag === "Close") {
          harness.reply({
            _tag: "Closed",
            request: target.request,
            session: target.session,
          });
        }
        if (target._tag === "Write") {
          harness.reply({
            _tag: "Written",
            request: target.request,
            session: target.session,
            revision: target.revision,
            plan: target.plan,
            bytes: Uint8Array.from([37, 80, 68, 70]),
            mime: "application/pdf",
            sha256: "a".repeat(64),
            writtenPages: 1,
          });
        }
      };
      const written = yield* service.write({
        _tag: "Write",
        request: F.RequestId.make("write"),
        session: F.SessionId.make("session:1"),
        revision: 0 as F.Revision,
        plan: "plan:1" as F.PlanId,
      });
      expect(written.bytes.byteLength).toBe(4);
      yield* service.close({
        request: F.RequestId.make("close"),
        session: F.SessionId.make("session:1"),
      });
      expect(harness.terminated).toBe(1);
    }).pipe(
      Effect.provide(FolioEngine.layer.pipe(Layer.provide(harness.layer)))
    );
  }
);

it.live("forwards every protocol operation to the session worker", () => {
  const harness = makeHarness();
  const session = F.SessionId.make("session:1");
  const revision = 0 as F.Revision;
  const base = { session, revision };
  const changed = {
    _tag: "Changed" as const,
    request: "r" as F.RequestId,
    change: "change:1" as F.ChangeId,
    snapshot: snapshot(1),
    invalidatedPages: [],
    invalidateOutline: false,
    invalidateForms: false,
  };
  const plan: F.ExportPlan = {
    request: "r" as F.RequestId,
    session,
    revision,
    id: "plan:1" as F.PlanId,
    scope: { _tag: "Full" },
    pages: [],
    filename: "test-edited.pdf",
    blockers: [],
    warnings: [],
    expiresAfterRevision: revision,
  };
  const reply = (payload: F.Response) => harness.reply(payload);
  harness.onSend = (request) => {
    const target = request as Extract<Request, { request: F.RequestId }>;
    const requestId = target.request;
    switch (target._tag) {
      case "InspectSource": {
        reply({
          _tag: "SourceInspected",
          request: requestId,
          session,
          revision,
          source: "source:1" as F.SourceId,
          pages: [],
          facts: snapshot().facts,
          namespace: "source-1",
          blockers: [],
        });
        break;
      }
      case "ReleaseSource": {
        reply({
          _tag: "SourceReleased",
          request: requestId,
          session,
          revision,
          source: target.source,
        });
        break;
      }
      case "ReadText": {
        reply({
          _tag: "TextRead",
          request: requestId,
          session,
          revision,
          page: target.page,
          runs: [],
          language: null,
          tagged: false,
        });
        break;
      }
      case "ReadOutline": {
        reply({
          _tag: "OutlineRead",
          request: requestId,
          session,
          revision,
          items: [],
        });
        break;
      }
      case "ReadAnnotations": {
        reply({
          _tag: "AnnotationsRead",
          request: requestId,
          session,
          revision,
          page: target.page,
          annotations: [],
        });
        break;
      }
      case "ReadForms": {
        reply({
          _tag: "FormsRead",
          request: requestId,
          session,
          revision,
          fields: [],
        });
        break;
      }
      case "Search": {
        reply({
          _tag: "SearchRead",
          request: requestId,
          session,
          revision,
          query: target.query,
          matches: [],
          totalKnown: 0,
          complete: true,
          current: null,
        });
        break;
      }
      case "Commit":
      case "Undo":
      case "Redo": {
        reply({ ...changed, request: requestId });
        break;
      }
      case "PlanExport": {
        reply({ _tag: "ExportPlanned", request: requestId, plan });
        break;
      }
      case "AcknowledgeDownload": {
        reply({
          _tag: "Acknowledged",
          request: requestId,
          session,
          revision,
          plan: target.plan,
          snapshot: snapshot(0, revision),
        });
        break;
      }
      case "Cancel": {
        reply({ _tag: "Cancelled", request: requestId, target: target.target });
        break;
      }
      default: {
        break;
      }
    }
  };
  return Effect.gen(function* () {
    const service = yield* FolioEngine;
    yield* service.inspectSource({
      _tag: "InspectSource",
      request: F.RequestId.make("inspect"),
      ...base,
      bytes: Uint8Array.from([1]),
    });
    yield* service.releaseSource({
      _tag: "ReleaseSource",
      request: F.RequestId.make("release"),
      ...base,
      source: "source:1" as F.SourceId,
    });
    yield* service.readText({
      _tag: "ReadText",
      request: F.RequestId.make("text"),
      ...base,
      page: "page:1" as F.PageId,
    });
    yield* service.readOutline({
      _tag: "ReadOutline",
      request: F.RequestId.make("outline"),
      ...base,
    });
    yield* service.readAnnotations({
      _tag: "ReadAnnotations",
      request: F.RequestId.make("annotations"),
      ...base,
      page: "page:1" as F.PageId,
    });
    yield* service.readForms({
      _tag: "ReadForms",
      request: F.RequestId.make("forms"),
      ...base,
    });
    yield* service.search({
      _tag: "Search",
      request: F.RequestId.make("search"),
      ...base,
      query: "q",
      cursor: null,
      direction: "next",
      maxMatches: 1,
    });
    yield* service.commit({
      _tag: "Commit",
      request: F.RequestId.make("commit"),
      session,
      baseRevision: revision,
      commandId: "command:1",
      command: {
        _tag: "RotatePages",
        pages: ["page:1" as F.PageId],
        clockwise: 90,
      },
    });
    yield* service.undo({
      _tag: "Undo",
      request: F.RequestId.make("undo"),
      ...base,
      baseRevision: revision,
    });
    yield* service.redo({
      _tag: "Redo",
      request: F.RequestId.make("redo"),
      ...base,
      baseRevision: revision,
    });
    yield* service.planExport({
      _tag: "PlanExport",
      request: F.RequestId.make("plan"),
      ...base,
      scope: { _tag: "Full" },
    });
    yield* service.acknowledgeDownload({
      _tag: "AcknowledgeDownload",
      request: F.RequestId.make("ack"),
      ...base,
      plan: "plan:1" as F.PlanId,
    });
    yield* service.cancel({
      _tag: "Cancel",
      request: F.RequestId.make("cancel"),
      target: "target" as F.RequestId,
    });
  }).pipe(Effect.provide(FolioEngine.layer.pipe(Layer.provide(harness.layer))));
});
