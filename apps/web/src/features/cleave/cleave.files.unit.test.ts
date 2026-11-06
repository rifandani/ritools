import { expect, it } from "@effect/vitest";
import { Effect } from "effect";
import { AtomRegistry } from "effect/reactivity";
import { IDBFactory } from "fake-indexeddb";

import {
  CleaveStorageError,
  closeComparison,
  emptyFiles,
  newComparison,
} from "./cleave.files";
import type { Files } from "./cleave.files";
import { makeFileAtoms } from "./cleave.files.atoms";
import type { FileCommand } from "./cleave.files.atoms";
import { indexedDbFiles } from "./cleave.indexed-db";

it.effect(
  "saves text, names, active tab, language, and choices; deletes only the closed file",
  () =>
    Effect.gen(function* () {
      const factory = new IDBFactory();
      const storage = indexedDbFiles(() => factory);
      expect(yield* storage.load()).toEqual(emptyFiles);
      const first = {
        ...newComparison("first", 1),
        texts: {
          before: "old\r\n",
          after: "new\r\n",
          beforeName: "old.ts",
          afterName: "new.ts",
        },
        compared: true,
        resolving: true,
        language: "typescript",
        choices: [{ id: 0, choice: "both" as const }],
      };
      const second = newComparison("second", 2);
      const files: Files = {
        entries: [first, second],
        selected: "first",
        nextNumber: 3,
      };
      yield* storage.save(emptyFiles, files);
      expect(yield* indexedDbFiles(() => factory).load()).toEqual(files);
      const closed = closeComparison(files, "first");
      yield* storage.save(files, closed);
      expect(yield* storage.load()).toEqual({
        entries: [second],
        selected: "second",
        nextNumber: 3,
      });
      const empty = closeComparison(closed, "second");
      yield* storage.save(closed, empty);
      expect(yield* storage.load()).toEqual({ ...emptyFiles, nextNumber: 3 });
    })
);

it("selects a neighbor when the active file closes and keeps selection when another closes", () => {
  const entries = [
    newComparison("a", 1),
    newComparison("b", 2),
    newComparison("c", 3),
  ];
  const files = { entries, selected: "b", nextNumber: 4 };
  expect(closeComparison(files, "a").selected).toBe("b");
  expect(closeComparison(files, "b").selected).toBe("c");
  expect(closeComparison({ ...files, selected: "c" }, "c").selected).toBe("b");
  expect(closeComparison(files, "missing")).toBe(files);
});

it.effect(
  "reports unavailable storage without returning an empty saved collection",
  () =>
    Effect.gen(function* () {
      const storage = indexedDbFiles(() => {
        throw new Error("Storage refused");
      });
      expect((yield* Effect.result(storage.load()))._tag).toBe("Failure");
      expect(
        (yield* Effect.result(storage.save(emptyFiles, emptyFiles)))._tag
      ).toBe("Failure");
    })
);

it.live(
  "keeps failed writes in memory, retries them, and cannot revive a closed file",
  () =>
    Effect.gen(function* () {
      let persisted: Files = emptyFiles;
      let fail = false;
      const atoms = makeFileAtoms(
        {
          load: () => Effect.succeed(persisted),
          save: (_, next) =>
            fail
              ? Effect.fail(new CleaveStorageError({ reason: "write" }))
              : Effect.sync(() => {
                  persisted = next;
                }),
        },
        () => "first"
      );
      const registry = AtomRegistry.make();
      const unmount = registry.mount(atoms.command);
      const command = (input: FileCommand) =>
        Effect.gen(function* () {
          registry.set(atoms.command, input);
          yield* AtomRegistry.getResult(registry, atoms.command, {
            suspendOnWaiting: true,
          });
        });
      yield* command({ type: "load" });
      const [first] = registry.get(atoms.files).entries;
      if (!first) {
        throw new Error("Expected a comparison");
      }
      fail = true;
      const edited = {
        ...first,
        texts: { before: "private text", after: "new" },
      };
      yield* command({ type: "edit", file: edited });
      expect(registry.get(atoms.files).entries[0]?.texts.before).toBe(
        "private text"
      );
      expect(persisted.entries[0]?.texts.before).toBe("");
      expect(registry.get(atoms.failure)).toBe("write");
      fail = false;
      yield* command({ type: "retry" });
      expect(persisted.entries[0]?.texts.before).toBe("private text");
      expect(registry.get(atoms.failure)).toBeNull();
      yield* command({ type: "close", id: first.id });
      yield* command({ type: "edit", file: edited });
      expect(persisted.entries).toEqual([]);
      expect(registry.get(atoms.files).selected).toBeNull();
      unmount();
      registry.dispose();
    })
);
