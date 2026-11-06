/* oxlint-disable promise/avoid-new -- Fake IndexedDB reports completion through DOM events. */
import { expect, it } from "@effect/vitest";
import { Effect } from "effect";
import { AtomRegistry } from "effect/reactivity";
import { IDBFactory } from "fake-indexeddb";

import {
  CleaveStorageError,
  closeComparison,
  emptyFiles,
  fileLanguage,
  newComparison,
  reorderComparisons,
} from "./cleave.files";
import type { ComparisonFile, Files } from "./cleave.files";
import { makeFileAtoms } from "./cleave.files.atoms";
import type { FileCommand } from "./cleave.files.atoms";
import { indexedDbFiles } from "./cleave.indexed-db";

interface StoredPreferences {
  readonly selected: string;
  readonly order: readonly string[] | null;
  readonly nextNumber: number;
}

const seedPreferences = (name: string, preference: StoredPreferences) =>
  Effect.gen(function* () {
    const factory = new IDBFactory();
    const storage = indexedDbFiles(() => factory, name);
    const file = newComparison("first", 1);
    yield* storage.save(emptyFiles, {
      entries: [file],
      selected: "first",
      nextNumber: 2,
    });
    yield* Effect.promise(
      () =>
        new Promise<void>((resolve, reject) => {
          const request = factory.open(name, 1);
          request.addEventListener("error", () => reject(request.error), {
            once: true,
          });
          request.addEventListener(
            "success",
            () => {
              const tx = request.result.transaction("preferences", "readwrite");
              tx.addEventListener("complete", () => resolve(), { once: true });
              tx.addEventListener("error", () => reject(tx.error), {
                once: true,
              });
              tx.objectStore("preferences").put(preference, "current");
            },
            { once: true }
          );
        })
    );
    return storage;
  });

const openDatabase = (factory: IDBFactory, name: string, version: number) =>
  Effect.promise(
    () =>
      new Promise<IDBDatabase>((resolve, reject) => {
        const request = factory.open(name, version);
        request.addEventListener("error", () => reject(request.error), {
          once: true,
        });
        request.addEventListener("success", () => resolve(request.result), {
          once: true,
        });
      })
  );

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

it("normalizes comparison languages", () => {
  const file = newComparison("first", 1);
  expect(fileLanguage(file)).toBe("auto");
  expect(fileLanguage({ ...file, language: "typescript" })).toBe("typescript");
  expect(fileLanguage({ ...file, language: "unknown-language" })).toBe("auto");
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

it.effect("reopens storage after a database version change", () =>
  Effect.gen(function* () {
    const factory = new IDBFactory();
    const storage = indexedDbFiles(() => factory, "version-change");

    expect(yield* storage.load()).toEqual(emptyFiles);
    yield* openDatabase(factory, "version-change", 2);
    expect((yield* Effect.result(storage.load()))._tag).toBe("Failure");
  })
);

it.live("retries a failed read and skips a repeated load after readiness", () =>
  Effect.gen(function* () {
    let failRead = true;
    let saveCount = 0;
    const atoms = makeFileAtoms(
      {
        load: () =>
          failRead
            ? Effect.fail(new CleaveStorageError({ reason: "read" }))
            : Effect.succeed(emptyFiles),
        save: () =>
          Effect.sync(() => {
            saveCount += 1;
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
    expect(registry.get(atoms.failure)).toBe("read");
    expect(registry.get(atoms.ready)).toBe(false);

    failRead = false;
    yield* command({ type: "load" });
    expect(registry.get(atoms.ready)).toBe(true);
    expect(registry.get(atoms.files).entries).toHaveLength(1);
    expect(saveCount).toBe(1);

    yield* command({ type: "load" });
    expect(saveCount).toBe(1);
    yield* command({ type: "select", id: "missing" });
    expect(registry.get(atoms.files).selected).toBe("first");
    yield* command({ type: "select", id: "first" });
    expect(registry.get(atoms.files).selected).toBe("first");

    unmount();
    registry.dispose();
  })
);

it.live("uses a generated ID when no ID function is provided", () =>
  Effect.gen(function* () {
    const atoms = makeFileAtoms(indexedDbFiles(() => new IDBFactory()));
    const registry = AtomRegistry.make();
    const unmount = registry.mount(atoms.command);
    registry.set(atoms.command, { type: "load" });
    yield* AtomRegistry.getResult(registry, atoms.command, {
      suspendOnWaiting: true,
    });
    expect(registry.get(atoms.files).entries[0]?.id).toMatch(
      /^[0-9a-f-]{36}$/u
    );
    unmount();
    registry.dispose();
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

it.live(
  "persists reordered comparisons without changing their content or selection",
  () =>
    Effect.gen(function* () {
      const factory = new IDBFactory();
      const storage = indexedDbFiles(() => factory);
      const first = {
        ...newComparison("first", 1),
        texts: { before: "private draft", after: "new" },
      };
      const second = newComparison("second", 2);
      const third = newComparison("third", 3);
      const initial: Files = {
        entries: [first, second, third],
        selected: "second",
        nextNumber: 4,
      };
      yield* storage.save(emptyFiles, initial);
      const atoms = makeFileAtoms(storage);
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
      yield* command({
        type: "reorder",
        id: "first",
        target: { id: "third", side: "after" },
      });
      expect(yield* indexedDbFiles(() => factory).load()).toEqual({
        ...initial,
        entries: [second, third, first],
      });
      yield* command({
        type: "reorder",
        id: "first",
        target: { id: "second", side: "before" },
      });
      expect(yield* storage.load()).toEqual(initial);
      unmount();
      registry.dispose();
    })
);

it("ignores missing targets, self drops, and moves to the same position", () => {
  const files: Files = {
    entries: [newComparison("a", 1), newComparison("b", 2)],
    selected: "a",
    nextNumber: 3,
  };
  expect(reorderComparisons(files, "missing", { id: "b", side: "after" })).toBe(
    files
  );
  expect(
    reorderComparisons(files, "a", { id: "missing", side: "before" })
  ).toBe(files);
  expect(reorderComparisons(files, "a", { id: "a", side: "after" })).toBe(
    files
  );
  expect(reorderComparisons(files, "a", { id: "b", side: "before" })).toBe(
    files
  );
  expect(reorderComparisons(files, "b", { id: "a", side: "after" })).toBe(
    files
  );
});

it.effect("rejects invalid saved orders and malformed saved preferences", () =>
  Effect.gen(function* () {
    const invalidOrder = yield* seedPreferences("invalid-order", {
      selected: "first",
      order: ["missing"],
      nextNumber: 2,
    });
    expect((yield* Effect.result(invalidOrder.load()))._tag).toBe("Failure");

    const invalidPreferences = yield* seedPreferences("invalid-preferences", {
      selected: "first",
      order: null,
      nextNumber: 2,
    });
    expect((yield* Effect.result(invalidPreferences.load()))._tag).toBe(
      "Failure"
    );

    const factory = new IDBFactory();
    const storage = indexedDbFiles(() => factory, "sync-write-failure");
    const invalidEntries: ComparisonFile[] = [];
    Object.defineProperty(invalidEntries, "map", {
      value: () => {
        throw new Error("Invalid entries");
      },
    });
    const invalidFiles: Files = { ...emptyFiles, entries: invalidEntries };
    expect(
      (yield* Effect.result(storage.save(emptyFiles, invalidFiles)))._tag
    ).toBe("Failure");
  })
);
