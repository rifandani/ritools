/* oxlint-disable anti-slop/require-safety-comment-for-type-assertion, anti-slop/no-chained-type-assertions, anti-slop/no-unknown-parameters, anti-slop/no-conditional-empty-object-spread, typescript/no-non-null-assertion, eslint/no-await-in-loop, eslint/require-await, unicorn/no-array-reverse, unicorn/no-array-sort, unicorn/no-await-expression-member, unicorn/relative-url-style -- Tests use the branded contract fixture, run real async fixtures, and assert after explicit guards. */
import { expect, it } from "@effect/vitest";
import { Effect, Layer, Stream } from "effect";
import { AtomRegistry } from "effect/reactivity";

import * as F from "./folio";
import { makeFolioAtoms } from "./folio.atoms";
import { FolioEngine } from "./folio.service";

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

const rendered = (bitmap: ImageBitmap | null) => ({
  rendered: {
    _tag: "Rendered" as const,
    request: "render" as F.RequestId,
    session: "session:1" as F.SessionId,
    revision: 0 as F.Revision,
    page: "page:1" as F.PageId,
    width: 10,
    height: 10,
    transform: [1, 0, 0, 1, 0, 0] as const,
    bitmapToken: "bitmap:1" as F.AnnotationId,
  },
  bitmap,
});

it.live("drives open, render, commit, export, and close from one runtime", () =>
  Effect.gen(function* () {
    const closed: number[] = [];
    const bitmap = (id: number) =>
      ({
        close: () => closed.push(id),
      }) as unknown as ImageBitmap;
    const plan: F.ExportPlan = {
      request: "plan" as F.RequestId,
      session: "session:1" as F.SessionId,
      revision: 0 as F.Revision,
      id: "plan:1" as F.PlanId,
      scope: { _tag: "Full" },
      pages: [],
      filename: "test-edited.pdf",
      blockers: [],
      warnings: [],
      expiresAfterRevision: 0 as F.Revision,
    };
    const layer = Layer.mock(FolioEngine, {
      open: () =>
        Effect.succeed({
          _tag: "Opened",
          request: "open" as F.RequestId,
          snapshot: snapshot(),
        }),
      readViewport: () => Effect.succeed(rendered(bitmap(1))),
      readThumbnail: () => Effect.succeed(rendered(bitmap(2))),
      commit: () =>
        Effect.succeed({
          _tag: "Changed",
          request: "commit" as F.RequestId,
          change: "change:1" as F.ChangeId,
          snapshot: snapshot(1),
          invalidatedPages: [],
          invalidateOutline: false,
          invalidateForms: false,
        }),
      undo: () =>
        Effect.succeed({
          _tag: "Changed",
          request: "undo" as F.RequestId,
          change: "change:2" as F.ChangeId,
          snapshot: snapshot(2),
          invalidatedPages: [],
          invalidateOutline: false,
          invalidateForms: false,
        }),
      redo: () =>
        Effect.succeed({
          _tag: "Changed",
          request: "redo" as F.RequestId,
          change: "change:3" as F.ChangeId,
          snapshot: snapshot(3),
          invalidatedPages: [],
          invalidateOutline: false,
          invalidateForms: false,
        }),
      planExport: () =>
        Effect.succeed({
          _tag: "ExportPlanned",
          request: "plan" as F.RequestId,
          plan,
        }),
      write: () =>
        Effect.succeed({
          _tag: "Written",
          request: "write" as F.RequestId,
          session: "session:1" as F.SessionId,
          revision: 1 as F.Revision,
          plan: "plan:1" as F.PlanId,
          bytes: Uint8Array.from([37, 80, 68, 70]),
          mime: "application/pdf",
          sha256: "a".repeat(64),
          writtenPages: 1,
        }),
      acknowledgeDownload: () =>
        Effect.succeed({
          _tag: "Acknowledged",
          request: "ack" as F.RequestId,
          session: "session:1" as F.SessionId,
          revision: 1 as F.Revision,
          plan: "plan:1" as F.PlanId,
          snapshot: snapshot(1, 1 as F.Revision),
        }),
      inspectSource: () =>
        Effect.succeed({
          _tag: "SourceInspected",
          request: "source" as F.RequestId,
          session: "session:1" as F.SessionId,
          revision: 0 as F.Revision,
          source: "source:1" as F.SourceId,
          pages: [],
          facts: snapshot().facts,
          namespace: "source-1",
          blockers: [],
        }),
      releaseSource: () =>
        Effect.succeed({
          _tag: "SourceReleased",
          request: "release" as F.RequestId,
          session: "session:1" as F.SessionId,
          revision: 0 as F.Revision,
          source: "source:1" as F.SourceId,
        }),
      readText: () =>
        Effect.succeed({
          _tag: "TextRead",
          request: "text" as F.RequestId,
          session: "session:1" as F.SessionId,
          revision: 0 as F.Revision,
          page: "page:1" as F.PageId,
          runs: [],
          language: null,
          tagged: false,
        }),
      readOutline: () =>
        Effect.succeed({
          _tag: "OutlineRead",
          request: "outline" as F.RequestId,
          session: "session:1" as F.SessionId,
          revision: 0 as F.Revision,
          items: [],
        }),
      readAnnotations: () =>
        Effect.succeed({
          _tag: "AnnotationsRead",
          request: "annotations" as F.RequestId,
          session: "session:1" as F.SessionId,
          revision: 0 as F.Revision,
          page: "page:1" as F.PageId,
          annotations: [],
        }),
      readForms: () =>
        Effect.succeed({
          _tag: "FormsRead",
          request: "forms" as F.RequestId,
          session: "session:1" as F.SessionId,
          revision: 0 as F.Revision,
          fields: [],
        }),
      search: () =>
        Effect.succeed({
          _tag: "SearchRead",
          request: "search" as F.RequestId,
          session: "session:1" as F.SessionId,
          revision: 0 as F.Revision,
          query: "q",
          matches: [],
          totalKnown: 0,
          complete: true,
          current: null,
        }),
      progress: () =>
        Stream.make({
          _tag: "Progress" as const,
          request: "request" as F.RequestId,
          session: "session:1" as F.SessionId,
          phase: "reading" as const,
          completed: 1,
          total: null,
        }),
      cancel: () => Effect.void,
      close: () => Effect.void,
    });
    const atoms = makeFolioAtoms(layer);
    const registry = AtomRegistry.make();
    const unmount = registry.mount(atoms.runtime);
    registry.set(atoms.open, { bytes: Uint8Array.from([1]), name: "test.pdf" });
    yield* AtomRegistry.getResult(registry, atoms.open);
    expect(registry.get(atoms.snapshot)?.session).toBe("session:1");

    registry.set(atoms.render, {
      page: "page:1" as F.PageId,
      clip: { x: 0, y: 0, width: 10, height: 10 },
      scale: 1,
      devicePixelRatio: 1,
      rotation: 0,
    });
    yield* AtomRegistry.getResult(registry, atoms.render);
    expect(registry.get(atoms.lastRendered)?.bitmap).not.toBeNull();
    registry.set(atoms.render, {
      page: "page:1" as F.PageId,
      clip: { x: 0, y: 0, width: 10, height: 10 },
      scale: 2,
      devicePixelRatio: 1,
      rotation: 0,
    });
    yield* AtomRegistry.getResult(registry, atoms.render);
    expect(closed).toEqual([1]);

    registry.set(atoms.planExport, { _tag: "Full" });
    yield* AtomRegistry.getResult(registry, atoms.planExport);
    expect(registry.get(atoms.plan)?.filename).toBe("test-edited.pdf");

    registry.set(atoms.commit, {
      _tag: "RotatePages",
      pages: ["page:1" as F.PageId],
      clockwise: 90,
    });
    yield* AtomRegistry.getResult(registry, atoms.commit);
    expect(registry.get(atoms.snapshot)?.revision).toBe(1);
    expect(registry.get(atoms.plan)).toBeNull();

    registry.set(atoms.history, "undo");
    yield* AtomRegistry.getResult(registry, atoms.history);
    expect(registry.get(atoms.snapshot)?.revision).toBe(2);
    registry.set(atoms.history, "redo");
    yield* AtomRegistry.getResult(registry, atoms.history);
    expect(registry.get(atoms.snapshot)?.revision).toBe(3);

    registry.set(atoms.write, "plan:1" as F.PlanId);
    const written = yield* AtomRegistry.getResult(registry, atoms.write);
    expect(written.bytes.byteLength).toBe(4);
    registry.set(atoms.acknowledgeDownload, "plan:1" as F.PlanId);
    yield* AtomRegistry.getResult(registry, atoms.acknowledgeDownload);
    expect(registry.get(atoms.snapshot)?.downloadedRevision).toBe(1);

    registry.set(atoms.read, { tag: "ReadForms", page: null });
    yield* AtomRegistry.getResult(registry, atoms.read);
    registry.set(atoms.read, {
      tag: "ReadAnnotations",
      page: "page:1" as F.PageId,
    });
    yield* AtomRegistry.getResult(registry, atoms.read);
    registry.set(atoms.read, { tag: "ReadText", page: "page:1" as F.PageId });
    yield* AtomRegistry.getResult(registry, atoms.read);
    registry.set(atoms.read, { tag: "ReadOutline", page: null });
    yield* AtomRegistry.getResult(registry, atoms.read);
    registry.set(atoms.search, {
      query: "q",
      cursor: null,
      direction: "next",
      maxMatches: 1,
    });
    yield* AtomRegistry.getResult(registry, atoms.search);
    registry.set(atoms.thumbnail, {
      page: "page:1" as F.PageId,
      maxWidth: 10,
    });
    const thumb = yield* AtomRegistry.getResult(registry, atoms.thumbnail);
    expect(thumb.bitmap).not.toBeNull();

    registry.set(atoms.inspectSource, Uint8Array.from([1]));
    yield* AtomRegistry.getResult(registry, atoms.inspectSource);
    registry.set(atoms.releaseSource, { source: "source:1" as F.SourceId });
    yield* AtomRegistry.getResult(registry, atoms.releaseSource);
    registry.set(atoms.trackProgress, "request-1" as F.RequestId);
    yield* AtomRegistry.getResult(registry, atoms.trackProgress);
    expect(registry.get(atoms.progress)?.phase).toBe("reading");
    registry.set(atoms.cancel, "request-1" as F.RequestId);
    yield* AtomRegistry.getResult(registry, atoms.cancel);
    expect(registry.get(atoms.busy)).toBe(false);

    registry.set(atoms.close, undefined);
    yield* AtomRegistry.getResult(registry, atoms.close);
    expect(registry.get(atoms.snapshot)).toBeNull();
    expect(registry.get(atoms.lastRendered)).toBeNull();
    expect(closed).toContain(1);
    unmount();
    registry.dispose();
  })
);

it.live("reports a missing session without calling the engine", () => {
  const layer = Layer.mock(FolioEngine, {});
  return Effect.gen(function* () {
    const atoms = makeFolioAtoms(layer);
    const registry = AtomRegistry.make();
    const unmount = registry.mount(atoms.runtime);
    registry.set(atoms.render, {
      page: "page:1" as F.PageId,
      clip: { x: 0, y: 0, width: 10, height: 10 },
      scale: 1,
      devicePixelRatio: 1,
      rotation: 0,
    });
    const renderExit = yield* AtomRegistry.getResult(
      registry,
      atoms.render
    ).pipe(Effect.exit);
    expect(renderExit._tag).toBe("Failure");
    registry.set(atoms.read, { tag: "ReadForms", page: null });
    const readExit = yield* AtomRegistry.getResult(registry, atoms.read).pipe(
      Effect.exit
    );
    expect(readExit._tag).toBe("Failure");
    registry.set(atoms.search, {
      query: "q",
      cursor: null,
      direction: "next",
      maxMatches: 1,
    });
    const searchExit = yield* AtomRegistry.getResult(
      registry,
      atoms.search
    ).pipe(Effect.exit);
    expect(searchExit._tag).toBe("Failure");
    registry.set(atoms.planExport, { _tag: "Full" });
    const planExit = yield* AtomRegistry.getResult(
      registry,
      atoms.planExport
    ).pipe(Effect.exit);
    expect(planExit._tag).toBe("Failure");
    registry.set(atoms.commit, {
      _tag: "RotatePages",
      pages: ["page:1" as F.PageId],
      clockwise: 90,
    });
    expect(
      (yield* AtomRegistry.getResult(registry, atoms.commit).pipe(Effect.exit))
        ._tag
    ).toBe("Failure");
    registry.set(atoms.history, "undo");
    expect(
      (yield* AtomRegistry.getResult(registry, atoms.history).pipe(Effect.exit))
        ._tag
    ).toBe("Failure");
    registry.set(atoms.inspectSource, Uint8Array.from([1]));
    expect(
      (yield* AtomRegistry.getResult(registry, atoms.inspectSource).pipe(
        Effect.exit
      ))._tag
    ).toBe("Failure");
    registry.set(atoms.releaseSource, {
      source: "source:1" as F.SourceId,
    });
    yield* AtomRegistry.getResult(registry, atoms.releaseSource);
    registry.set(atoms.write, "plan:1" as F.PlanId);
    expect(
      (yield* AtomRegistry.getResult(registry, atoms.write).pipe(Effect.exit))
        ._tag
    ).toBe("Failure");
    registry.set(atoms.acknowledgeDownload, "plan:1" as F.PlanId);
    yield* AtomRegistry.getResult(registry, atoms.acknowledgeDownload);
    registry.set(atoms.thumbnail, {
      page: "page:1" as F.PageId,
      maxWidth: 10,
    });
    expect(
      (yield* AtomRegistry.getResult(registry, atoms.thumbnail).pipe(
        Effect.exit
      ))._tag
    ).toBe("Failure");
    registry.set(atoms.close, undefined);
    yield* AtomRegistry.getResult(registry, atoms.close);
    expect(registry.get(atoms.snapshot)).toBeNull();
    unmount();
    registry.dispose();
  });
});

it.live("closes a render that became stale while it was loading", () => {
  const closed: number[] = [];
  const bitmap = (id: number) =>
    ({ close: () => closed.push(id) }) as unknown as ImageBitmap;
  let registry!: ReturnType<typeof AtomRegistry.make>;
  let atoms!: ReturnType<typeof makeFolioAtoms>;
  const layer = Layer.mock(FolioEngine, {
    readViewport: () =>
      Effect.sync(() => {
        registry.set(atoms.snapshot, snapshot(9));
        return rendered(bitmap(1));
      }),
    readThumbnail: () =>
      Effect.sync(() => {
        registry.set(atoms.snapshot, snapshot(10));
        return rendered(bitmap(2));
      }),
  });
  return Effect.gen(function* () {
    atoms = makeFolioAtoms(layer);
    registry = AtomRegistry.make();
    const unmount = registry.mount(atoms.runtime);
    registry.set(atoms.snapshot, snapshot(0));
    registry.set(atoms.render, {
      page: "page:1" as F.PageId,
      clip: { x: 0, y: 0, width: 10, height: 10 },
      scale: 1,
      devicePixelRatio: 1,
      rotation: 0,
    });
    yield* AtomRegistry.getResult(registry, atoms.render);
    expect(closed).toContain(1);
    registry.set(atoms.thumbnail, {
      page: "page:1" as F.PageId,
      maxWidth: 10,
    });
    yield* AtomRegistry.getResult(registry, atoms.thumbnail);
    expect(closed).toContain(2);
    unmount();
    registry.dispose();
  });
});

it.live("ignores a result for a different session", () => {
  const other = { ...snapshot(7), session: "session:other" as F.SessionId };
  const changed = {
    _tag: "Changed" as const,
    request: "r" as F.RequestId,
    change: "change:other" as F.ChangeId,
    snapshot: other,
    invalidatedPages: [],
    invalidateOutline: false,
    invalidateForms: false,
  };
  const layer = Layer.mock(FolioEngine, {
    commit: () => Effect.succeed(changed),
    undo: () => Effect.succeed(changed),
    redo: () => Effect.succeed(changed),
    acknowledgeDownload: () =>
      Effect.succeed({
        _tag: "Acknowledged",
        request: "ack" as F.RequestId,
        session: "session:other" as F.SessionId,
        revision: 7 as F.Revision,
        plan: "plan:1" as F.PlanId,
        snapshot: other,
      }),
    progress: () =>
      Stream.make({
        _tag: "Progress" as const,
        request: "request" as F.RequestId,
        session: "session:other" as F.SessionId,
        phase: "reading" as const,
        completed: 1,
        total: null,
      }),
  });
  return Effect.gen(function* () {
    const atoms = makeFolioAtoms(layer);
    const registry = AtomRegistry.make();
    const unmount = registry.mount(atoms.runtime);
    registry.set(atoms.snapshot, snapshot(0));
    registry.set(atoms.commit, {
      _tag: "RotatePages",
      pages: ["page:1" as F.PageId],
      clockwise: 90,
    });
    yield* AtomRegistry.getResult(registry, atoms.commit);
    registry.set(atoms.history, "undo");
    yield* AtomRegistry.getResult(registry, atoms.history);
    registry.set(atoms.acknowledgeDownload, "plan:1" as F.PlanId);
    yield* AtomRegistry.getResult(registry, atoms.acknowledgeDownload);
    registry.set(atoms.trackProgress, "request-1" as F.RequestId);
    yield* AtomRegistry.getResult(registry, atoms.trackProgress);
    expect(registry.get(atoms.snapshot)?.session).toBe("session:1");
    expect(registry.get(atoms.progress)).toBeNull();
    unmount();
    registry.dispose();
  });
});
