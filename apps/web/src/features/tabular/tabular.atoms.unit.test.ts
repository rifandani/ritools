/* oxlint-disable anti-slop/no-shape-in-symbol-names -- Tests use the fixed public export contract. */
import { expect, it } from "@effect/vitest";
import { Effect, Layer, Stream } from "effect";
import { AtomRegistry } from "effect/reactivity";

import * as T from "./tabular";
import { makeTabularAtoms } from "./tabular.atoms";
import { parseFile, writeOutput } from "./tabular.format";
import { TabularModel, candidate } from "./tabular.model";
import { TabularEngine } from "./tabular.service";

it.live(
  "keeps bounded route state, invalidates views after edits, and clears user data on close",
  () =>
    Effect.gen(function* () {
      const bytes = new TextEncoder().encode("a,b\none,1\ntwo,2");
      const source = { name: "route.csv", size: bytes.length, bytes };
      const ctx = {
        requestId: T.RequestId.make("route"),
        operation: "test",
        sessionId: null,
      };
      const file = parseFile(source, T.defaultParseOptions, ctx);
      const id = T.CandidateId.make("route-candidate");
      const model = new TabularModel(file, id);
      const layer = Layer.mock(TabularEngine, {
        prepareOpen: () => Effect.succeed(candidate(file, id)),
        acceptOpen: () => Effect.succeed(model.summary()),
        setView: (input) =>
          Effect.promise(() =>
            model.setView(input, ctx, () => Promise.resolve())
          ),
        readViewport: (input) => Effect.sync(() => model.viewport(input, ctx)),
        edit: (input) => Effect.sync(() => model.edit(input, ctx)),
        history: (input) => Effect.sync(() => model.history(input, ctx)),
        planExport: (input) => Effect.sync(() => model.planExport(input, ctx)),
        exportBytes: (input) =>
          Effect.sync(() => {
            const output = model.exportJob(input, ctx);
            return {
              sessionId: model.sessionId,
              revision: model.revision,
              planId: input.planId,
              filename: output.filename,
              mime: output.mime,
              bytes: writeOutput(output.job, ctx),
              writtenRows: output.plan.sheets.reduce((n, s) => n + s.rows, 0),
              writtenSheets: output.plan.sheets.length,
              warnings: output.plan.warnings,
            };
          }),
        cancel: () => Effect.void,
        close: () => Effect.void,
      });
      const atoms = makeTabularAtoms(layer);
      const registry = AtomRegistry.make();
      const unmount = registry.mount(atoms.runtime);
      const job = { requestId: T.RequestId.make("prepare") };
      registry.set(atoms.prepare, {
        source,
        options: T.defaultParseOptions,
        job,
      });
      yield* AtomRegistry.getResult(registry, atoms.prepare);
      expect(registry.get(atoms.candidate)?.sourceName).toBe("route.csv");
      registry.set(atoms.accept, {
        requestId: T.RequestId.make("accept"),
        candidateId: id,
        replace: null,
        acknowledgeValuesOnly: false,
      });
      const session = yield* AtomRegistry.getResult(registry, atoms.accept);
      const [sheet] = session.sheets;
      if (!sheet) {
        throw new Error("Missing Sheet");
      }
      const guard = () => ({
        sessionId: model.sessionId,
        expectedRevision: model.revision,
        requestId: T.RequestId.make(`request-${model.revision}`),
      });
      registry.set(atoms.updateView, {
        ...guard(),
        sheetId: sheet.sheetId,
        search: "",
        sort: null,
      });
      const view = yield* AtomRegistry.getResult(registry, atoms.updateView);
      registry.set(atoms.read, {
        ...guard(),
        viewId: view.viewId,
        rowStart: 0,
        rowCount: 2,
        columnStart: 0,
        columnCount: 2,
      });
      const viewport = yield* AtomRegistry.getResult(registry, atoms.read);
      expect(registry.get(atoms.viewport)?.rows).toHaveLength(2);
      const [row] = viewport.rows;
      const [column] = viewport.columns;
      if (!row || !column) {
        throw new Error("Missing cell");
      }
      registry.set(atoms.change, {
        ...guard(),
        edit: {
          _tag: "SetCell",
          address: {
            sheetId: sheet.sheetId,
            rowId: row.rowId,
            columnId: column.columnId,
          },
          text: "changed",
        },
      });
      yield* AtomRegistry.getResult(registry, atoms.change);
      expect(registry.get(atoms.session)?.history.dirty).toBe(true);
      // The grid keeps the old View and Viewport on screen until the next
      // View arrives, so a commit does not unmount or skeleton the grid.
      expect(registry.get(atoms.viewport)).not.toBeNull();
      expect(registry.get(atoms.view)).not.toBeNull();
      registry.set(atoms.planExport, {
        ...guard(),
        options: {
          format: "json",
          scope: { _tag: "WholeSheet", sheetId: sheet.sheetId },
          delimiter: ",",
          newline: "lf",
          bom: false,
          textPolicy: "exact",
          jsonShape: "auto",
        },
      });
      const plan = yield* AtomRegistry.getResult(registry, atoms.planExport);
      expect(registry.get(atoms.plan)?.planId).toBe(plan.planId);
      registry.set(atoms.exportBytes, {
        ...guard(),
        planId: plan.planId,
        acknowledgeValuesOnly: false,
      });
      const output = yield* AtomRegistry.getResult(registry, atoms.exportBytes);
      expect(JSON.parse(new TextDecoder().decode(output.bytes))[0].a).toBe(
        "changed"
      );
      registry.set(atoms.change, { ...guard(), direction: "undo" });
      yield* AtomRegistry.getResult(registry, atoms.change);
      expect(registry.get(atoms.session)?.history.dirty).toBe(false);
      registry.set(atoms.cancel, { requestId: T.RequestId.make("unused") });
      yield* AtomRegistry.getResult(registry, atoms.cancel);
      registry.set(atoms.close, session.sessionId);
      yield* AtomRegistry.getResult(registry, atoms.close);
      expect(registry.get(atoms.session)).toBeNull();
      expect(registry.get(atoms.plan)).toBeNull();
      expect(registry.get(atoms.activeSheet)).toBeNull();
      unmount();
      registry.dispose();
    })
);

it.live(
  "forwards inspection, location, warnings, discard, and reparse to the engine",
  () =>
    Effect.gen(function* () {
      const bytes = new TextEncoder().encode("a,b\none,1");
      const source = { name: "inspect.csv", size: bytes.length, bytes };
      const ctx = {
        requestId: T.RequestId.make("inspect"),
        operation: "test",
        sessionId: null,
      };
      const file = parseFile(source, T.defaultParseOptions, ctx);
      const id = T.CandidateId.make("inspect-candidate");
      const model = new TabularModel(file, id);
      const summary = model.summary();
      const [sheet] = summary.sheets;
      if (!sheet) {
        throw new Error("Missing Sheet");
      }
      const guard = {
        sessionId: summary.sessionId,
        expectedRevision: summary.revision,
      };
      const view = yield* Effect.promise(() =>
        model.setView(
          {
            ...guard,
            requestId: T.RequestId.make("inspect-view"),
            sheetId: sheet.sheetId,
            search: "",
            sort: null,
          },
          ctx,
          () => Promise.resolve()
        )
      );
      const viewport = model.viewport(
        {
          ...guard,
          requestId: T.RequestId.make("inspect-read"),
          viewId: view.viewId,
          rowStart: 0,
          rowCount: 1,
          columnStart: 0,
          columnCount: 1,
        },
        ctx
      );
      const [row] = viewport.rows;
      const [column] = viewport.columns;
      if (!row || !column) {
        throw new Error("Missing cell");
      }
      const discarded: T.CandidateId[] = [];
      const progress = {
        requestId: T.RequestId.make("inspect-progress"),
        sessionId: T.SessionId.make("other-session"),
        phase: "reading" as const,
        completed: 1,
        total: 2,
        unit: "rows" as const,
        cancellable: true,
      };
      const layer = Layer.mock(TabularEngine, {
        prepareOpen: () => Effect.succeed(candidate(file, id)),
        prepareReparse: () => Effect.succeed(candidate(file, id)),
        setView: () => Effect.succeed(view),
        readViewport: () => Effect.succeed(viewport),
        locate: () => Effect.succeed({ rowIndex: 0, columnIndex: 1 }),
        warnings: () =>
          Effect.succeed({ items: [], total: 0, nextOffset: null }),
        discardCandidate: (candidateId) =>
          Effect.sync(() => {
            discarded.push(candidateId);
          }),
        progress: () => Stream.make(progress),
      });
      const atoms = makeTabularAtoms(layer);
      const registry = AtomRegistry.make();
      const unmount = registry.mount(atoms.runtime);

      registry.set(atoms.trackProgress, T.RequestId.make("inspect-progress"));
      yield* AtomRegistry.getResult(registry, atoms.trackProgress);
      expect(registry.get(atoms.progress)).toBeNull();

      registry.set(atoms.prepare, {
        source,
        options: T.defaultParseOptions,
        job: { requestId: T.RequestId.make("inspect-prepare") },
      });
      yield* AtomRegistry.getResult(registry, atoms.prepare);
      expect(registry.get(atoms.candidate)?.candidateId).toBe(id);

      registry.set(atoms.inspectView, {
        ...guard,
        requestId: T.RequestId.make("inspect-view-call"),
        sheetId: sheet.sheetId,
        search: "",
        sort: null,
      });
      expect(
        yield* AtomRegistry.getResult(registry, atoms.inspectView)
      ).toEqual(view);

      registry.set(atoms.inspect, {
        ...guard,
        requestId: T.RequestId.make("inspect-read-call"),
        viewId: view.viewId,
        rowStart: 0,
        rowCount: 1,
        columnStart: 0,
        columnCount: 1,
      });
      expect(yield* AtomRegistry.getResult(registry, atoms.inspect)).toEqual(
        viewport
      );

      registry.set(atoms.locate, {
        ...guard,
        requestId: T.RequestId.make("inspect-locate"),
        viewId: view.viewId,
        address: {
          sheetId: sheet.sheetId,
          rowId: row.rowId,
          columnId: column.columnId,
        },
      });
      expect(yield* AtomRegistry.getResult(registry, atoms.locate)).toEqual({
        rowIndex: 0,
        columnIndex: 1,
      });

      registry.set(atoms.warnings, {
        ...guard,
        requestId: T.RequestId.make("inspect-warnings"),
        code: null,
        sheetId: null,
        offset: 0,
        limit: 10,
      });
      expect(yield* AtomRegistry.getResult(registry, atoms.warnings)).toEqual({
        items: [],
        total: 0,
        nextOffset: null,
      });

      registry.set(atoms.reparse, {
        guard,
        options: T.defaultParseOptions,
        job: { requestId: T.RequestId.make("inspect-reparse") },
      });
      yield* AtomRegistry.getResult(registry, atoms.reparse);
      expect(registry.get(atoms.candidate)?.candidateId).toBe(id);

      registry.set(atoms.discardCandidate, {
        candidateId: id,
        requestId: T.RequestId.make("inspect-discard"),
      });
      yield* AtomRegistry.getResult(registry, atoms.discardCandidate);
      expect(discarded).toEqual([id]);
      expect(registry.get(atoms.candidate)).toBeNull();

      unmount();
      registry.dispose();
    })
);

it.live(
  "drops results from older sessions and tracks progress for the open session",
  () =>
    Effect.gen(function* () {
      const bytes = new TextEncoder().encode("a,b\none,1");
      const source = { name: "progress.csv", size: bytes.length, bytes };
      const ctx = {
        requestId: T.RequestId.make("progress"),
        operation: "test",
        sessionId: null,
      };
      const file = parseFile(source, T.defaultParseOptions, ctx);
      const id = T.CandidateId.make("progress-candidate");
      const model = new TabularModel(file, id);
      const current = model.summary();
      const [sheet] = current.sheets;
      if (!sheet) {
        throw new Error("Missing Sheet");
      }
      const other = T.SessionId.make("other-session");
      const empty = { ...current, sheets: [] };
      const otherSession = { ...current, sessionId: other };
      const view = yield* Effect.promise(() =>
        model.setView(
          {
            sessionId: current.sessionId,
            expectedRevision: 0,
            requestId: T.RequestId.make("view"),
            sheetId: sheet.sheetId,
            search: "",
            sort: null,
          },
          ctx,
          () => Promise.resolve()
        )
      );
      const viewport = model.viewport(
        {
          sessionId: current.sessionId,
          expectedRevision: 0,
          requestId: T.RequestId.make("viewport"),
          viewId: view.viewId,
          rowStart: 0,
          rowCount: 1,
          columnStart: 0,
          columnCount: 1,
        },
        ctx
      );
      const plan = model.planExport(
        {
          sessionId: current.sessionId,
          expectedRevision: 0,
          requestId: T.RequestId.make("plan"),
          options: {
            format: "csv",
            scope: { _tag: "WholeSheet", sheetId: sheet.sheetId },
            delimiter: ",",
            newline: "lf",
            bom: false,
            textPolicy: "exact",
            jsonShape: "auto",
          },
        },
        ctx
      );
      const progress = {
        requestId: T.RequestId.make("progress"),
        sessionId: current.sessionId,
        phase: "reading" as const,
        completed: 1,
        total: 2,
        unit: "rows" as const,
        cancellable: true,
      };
      const layer = Layer.mock(TabularEngine, {
        acceptOpen: () => Effect.succeed(empty),
        prepareOpen: () => Effect.succeed(candidate(file, id)),
        setView: () => Effect.succeed({ ...view, sessionId: other }),
        readViewport: () => Effect.succeed({ ...viewport, sessionId: other }),
        edit: () =>
          Effect.succeed({
            session: current,
            editId: null,
            affectedSheets: [],
            focus: null,
          }),
        history: () =>
          Effect.succeed({
            session: otherSession,
            editId: null,
            affectedSheets: [],
            focus: null,
          }),
        planExport: () => Effect.succeed({ ...plan, revision: 99 }),
        progress: () =>
          Stream.make({ ...progress, sessionId: other }, progress),
        close: () => Effect.void,
      });
      const atoms = makeTabularAtoms(layer);
      const registry = AtomRegistry.make();
      const unmount = registry.mount(atoms.runtime);
      registry.set(atoms.accept, {
        requestId: T.RequestId.make("accept"),
        candidateId: id,
        replace: null,
        acknowledgeValuesOnly: false,
      });
      yield* AtomRegistry.getResult(registry, atoms.accept);
      expect(registry.get(atoms.activeSheet)).toBeNull();

      const guard = {
        sessionId: current.sessionId,
        expectedRevision: 0,
      };
      registry.set(atoms.updateView, {
        ...guard,
        requestId: T.RequestId.make("stale-view"),
        sheetId: sheet.sheetId,
        search: "",
        sort: null,
      });
      yield* AtomRegistry.getResult(registry, atoms.updateView);
      expect(registry.get(atoms.view)).toBeNull();

      registry.set(atoms.read, {
        ...guard,
        requestId: T.RequestId.make("stale-read"),
        viewId: view.viewId,
        rowStart: 0,
        rowCount: 1,
        columnStart: 0,
        columnCount: 1,
      });
      yield* AtomRegistry.getResult(registry, atoms.read);
      expect(registry.get(atoms.viewport)).toBeNull();

      registry.set(atoms.change, {
        ...guard,
        requestId: T.RequestId.make("change"),
        edit: {
          _tag: "SetCell",
          address: {
            sheetId: sheet.sheetId,
            rowId: viewport.rows[0]?.rowId ?? T.RowId.make("missing"),
            columnId:
              viewport.columns[0]?.columnId ?? T.ColumnId.make("missing"),
          },
          text: "changed",
        },
      });
      yield* AtomRegistry.getResult(registry, atoms.change);
      registry.set(atoms.change, {
        ...guard,
        requestId: T.RequestId.make("stale-history"),
        direction: "undo",
      });
      yield* AtomRegistry.getResult(registry, atoms.change);
      expect(registry.get(atoms.session)?.sessionId).toBe(current.sessionId);

      registry.set(atoms.planExport, {
        ...guard,
        requestId: T.RequestId.make("stale-plan"),
        options: {
          format: "csv",
          scope: { _tag: "WholeSheet", sheetId: sheet.sheetId },
          delimiter: ",",
          newline: "lf",
          bom: false,
          textPolicy: "exact",
          jsonShape: "auto",
        },
      });
      yield* AtomRegistry.getResult(registry, atoms.planExport);
      expect(registry.get(atoms.plan)).toBeNull();

      registry.set(atoms.close, other);
      yield* AtomRegistry.getResult(registry, atoms.close);
      expect(registry.get(atoms.session)?.sessionId).toBe(current.sessionId);

      registry.set(atoms.trackProgress, T.RequestId.make("progress"));
      yield* AtomRegistry.getResult(registry, atoms.trackProgress);
      expect(registry.get(atoms.progress)?.sessionId).toBe(current.sessionId);
      expect(registry.get(atoms.busy)).toBe(false);
      unmount();
      registry.dispose();
    })
);
