/* oxlint-disable anti-slop/no-shape-in-symbol-names -- Tests use the fixed public export contract. */
import { expect, it } from "@effect/vitest";
import { Effect, Layer } from "effect";
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
      expect(registry.get(atoms.viewport)).toBeNull();
      expect(registry.get(atoms.view)).toBeNull();
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
