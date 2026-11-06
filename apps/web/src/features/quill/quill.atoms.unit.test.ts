import { expect, it } from "@effect/vitest";
import { Deferred, Effect, Layer } from "effect";
import { AtomRegistry } from "effect/reactivity";

import { QuillError } from "./quill";
import { makeQuillAtoms } from "./quill.atoms";
import type { Command } from "./quill.atoms";
import { makeQuill, Quill } from "./quill.service";
import { memoryStorage } from "./quill.test-storage";

it.live(
  "keeps the Library view and downloads in step with application commands",
  () =>
    Effect.gen(function* () {
      const storage = memoryStorage();
      const service = makeQuill(storage);
      const atoms = makeQuillAtoms(Layer.succeed(Quill, service));
      const registry = AtomRegistry.make();
      const unmount = registry.mount(atoms.runtime);
      const command = (input: Command) =>
        Effect.gen(function* () {
          registry.set(atoms.command, input);
          return yield* AtomRegistry.getResult(registry, atoms.command, {
            suspendOnWaiting: true,
          });
        });
      yield* command({ type: "initialize" });
      expect(registry.get(atoms.busy)).toBe(false);
      yield* command({
        type: "create",
        kind: "folder",
        name: "Notes",
        parent: null,
      });
      const folder = registry.get(atoms.view).entries[0]?.id ?? "";
      yield* command({
        type: "create",
        kind: "document",
        name: "A.md",
        parent: folder,
      });
      const first = registry.get(atoms.view).document?.id ?? "";
      yield* command({ type: "edit", id: first, source: "# A\n\nFirst text" });
      yield* command({ type: "edit", id: first, source: "# A\n\nSecond text" });
      yield* command({ type: "history", direction: "undo" });
      expect(registry.get(atoms.view).document?.source).toContain("First text");
      yield* command({ type: "history", direction: "redo" });
      yield* command({ type: "mode", mode: "source" });
      storage.failNext("storage");
      expect(yield* command({ type: "save" })).toBe(false);
      expect(registry.get(atoms.failure)).toBe("storage");
      expect(registry.get(atoms.view).save).toBe("failed");
      yield* command({ type: "save" });
      yield* command({ type: "rename", id: first, name: "Renamed.md" });
      yield* command({ type: "move", id: first, parent: null });
      yield* command({ type: "duplicate", id: first });
      const duplicate = registry.get(atoms.view).document?.id ?? "";
      expect(duplicate).not.toBe(first);
      yield* command({ type: "trash", id: duplicate });
      yield* command({ type: "restore", id: duplicate });
      yield* command({ type: "open", id: duplicate });
      yield* command({ type: "save-copy" });
      yield* command({ type: "trash", id: duplicate });
      yield* command({ type: "remove", id: duplicate, confirmed: true });
      yield* command({ type: "trash", id: first });
      yield* command({ type: "restore-all" });
      expect(
        registry.get(atoms.view).entries.every((entry) => !entry.trash)
      ).toBe(true);
      yield* command({ type: "trash", id: first });
      expect(yield* command({ type: "remove-all", confirmed: false })).toBe(
        false
      );
      expect(
        registry.get(atoms.view).entries.some((entry) => entry.id === first)
      ).toBe(true);
      yield* command({ type: "restore-all" });
      yield* command({
        type: "create",
        kind: "document",
        name: "Remove.md",
        parent: null,
      });
      const removed = registry.get(atoms.view).document?.id ?? "";
      yield* command({ type: "trash", id: removed });
      yield* command({ type: "remove-all", confirmed: true });
      expect(
        registry.get(atoms.view).entries.some((entry) => entry.id === removed)
      ).toBe(false);
      yield* command({ type: "open", id: first });
      yield* command({ type: "follow", href: "Renamed.md" });
      expect(registry.get(atoms.navigation)).toMatchObject({
        id: first,
        fragment: null,
      });
      yield* command({ type: "follow", href: "#heading" });
      expect(registry.get(atoms.navigation)).toEqual({
        id: first,
        fragment: "heading",
        sequence: 2,
      });
      yield* command({ type: "follow", href: "missing.md" });
      expect(registry.get(atoms.navigation)).toBeNull();
      expect(registry.get(atoms.linkFailure)).toEqual({
        href: "missing.md",
        reason: "missing",
      });
      expect(registry.get(atoms.view).document).toMatchObject({ id: first });
      yield* command({ type: "refresh" });
      expect(registry.get(atoms.linkFailure)).toBeNull();
      registry.set(atoms.output, { markdown: true });
      expect(
        (yield* AtomRegistry.getResult(registry, atoms.output, {
          suspendOnWaiting: true,
        }))?.name
      ).toBe("Renamed.md");
      registry.set(atoms.output, { archive: true, folder: null, backup: true });
      const backup = yield* AtomRegistry.getResult(registry, atoms.output, {
        suspendOnWaiting: true,
      });
      if (!backup) {
        throw new Error("Expected a backup");
      }
      yield* command({
        type: "restore-backup",
        file: new File([new Uint8Array(backup.bytes)], "backup.zip"),
      });
      expect(
        registry
          .get(atoms.view)
          .entries.some((entry) => entry.name.startsWith("Restored"))
      ).toBe(true);
      registry.set(atoms.output, { raw: true });
      expect(
        (yield* AtomRegistry.getResult(registry, atoms.output, {
          suspendOnWaiting: true,
        }))?.mime
      ).toBe("application/json");
      yield* command({
        type: "import",
        parent: null,
        files: [
          new File(["<!-- protected -->"], "import.md"),
          new File(["bad"], "bad.txt"),
        ],
      });
      expect(registry.get(atoms.imports)).toEqual([
        { path: "bad.txt", reason: "invalid" },
      ]);
      const importedId = registry.get(atoms.view).document?.id ?? "";
      class UnreadableFile extends File {
        override arrayBuffer(): Promise<ArrayBuffer> {
          return Promise.reject(new Error(`Read refused: ${this.name}`));
        }
      }
      yield* command({
        type: "import",
        parent: null,
        files: [new UnreadableFile([], "unreadable.md")],
      });
      expect(registry.get(atoms.imports)).toEqual([
        { path: "unreadable.md", reason: "unreadable" },
      ]);
      yield* command({
        type: "restore-backup",
        file: new UnreadableFile([], "unreadable.zip"),
      });
      expect(registry.get(atoms.failure)).toBe("unreadable");
      yield* command({ type: "open", id: importedId });
      registry.set(atoms.output, { recovery: "original" });
      expect(
        (yield* AtomRegistry.getResult(registry, atoms.output, {
          suspendOnWaiting: true,
        }))?.bytes.length
      ).toBeGreaterThan(0);
      registry.set(atoms.conversion, null);
      const plan = yield* AtomRegistry.getResult(registry, atoms.conversion, {
        suspendOnWaiting: true,
      });
      if (!plan) {
        throw new Error("Expected a conversion preview");
      }
      yield* command({ type: "convert", plan });
      registry.set(atoms.output, { recovery: 0 });
      expect(
        (yield* AtomRegistry.getResult(registry, atoms.output, {
          suspendOnWaiting: true,
        }))?.bytes.length
      ).toBeGreaterThan(0);
      registry.set(atoms.rendered, "# Readable");
      expect(
        (yield* AtomRegistry.getResult(registry, atoms.rendered, {
          suspendOnWaiting: true,
        }))?.model.type
      ).toBe("doc");
      yield* command({
        type: "edit",
        id: first,
        source: "Late text from another editor",
      });
      yield* command({ type: "save" });
      unmount();
      registry.dispose();
    })
);

it.live(
  "shows failures without returning an empty export as a completed download",
  () =>
    Effect.gen(function* () {
      const storage = memoryStorage();
      const failure = new QuillError({ reason: "unreadable" });
      const service = makeQuill(storage);
      const atoms = makeQuillAtoms(
        Layer.succeed(Quill, {
          ...service,
          view: () => Effect.fail(failure),
          render: () => Effect.fail(failure),
        })
      );
      const registry = AtomRegistry.make();
      const unmount = registry.mount(atoms.runtime);
      registry.set(atoms.command, { type: "initialize" });
      yield* AtomRegistry.getResult(registry, atoms.command, {
        suspendOnWaiting: true,
      });
      expect(registry.get(atoms.failure)).toBe("unreadable");
      registry.set(atoms.output, { markdown: true });
      expect(
        yield* AtomRegistry.getResult(registry, atoms.output, {
          suspendOnWaiting: true,
        })
      ).toBeNull();
      registry.set(atoms.conversion, null);
      expect(
        yield* AtomRegistry.getResult(registry, atoms.conversion, {
          suspendOnWaiting: true,
        })
      ).toBeNull();
      registry.set(atoms.rendered, "source");
      expect(
        yield* AtomRegistry.getResult(registry, atoms.rendered, {
          suspendOnWaiting: true,
        })
      ).toBeNull();
      expect(registry.get(atoms.busy)).toBe(false);
      unmount();
      registry.dispose();
    })
);

it.live(
  "runs non-edit commands one at a time and stays busy until the last one ends",
  () =>
    Effect.gen(function* () {
      const service = makeQuill(memoryStorage());
      const gate = yield* Deferred.make<boolean>();
      const order: string[] = [];
      const atoms = makeQuillAtoms(
        Layer.succeed(Quill, {
          ...service,
          close: () =>
            Deferred.await(gate).pipe(
              Effect.andThen(Effect.sync(() => order.push("close"))),
              Effect.andThen(service.close())
            ),
          followLink: (href: string) =>
            Effect.sync(() => order.push(href)).pipe(
              Effect.andThen(service.followLink(href))
            ),
        })
      );
      const registry = AtomRegistry.make();
      const unmount = registry.mount(atoms.runtime);
      const releaseCommand = registry.mount(atoms.command);
      const releaseBusy = registry.mount(atoms.busy);
      registry.set(atoms.command, { type: "initialize" });
      yield* AtomRegistry.getResult(registry, atoms.command, {
        suspendOnWaiting: true,
      });
      registry.set(atoms.command, { type: "close" });
      registry.set(atoms.command, { type: "follow", href: "#next" });
      yield* Effect.yieldNow;
      expect(order).toEqual([]);
      expect(registry.get(atoms.busy)).toBe(true);
      yield* Deferred.succeed(gate, true);
      while (registry.get(atoms.busy)) {
        yield* Effect.sleep("5 millis");
      }
      expect(order).toEqual(["close", "#next"]);
      expect(registry.get(atoms.busy)).toBe(false);
      releaseBusy();
      releaseCommand();
      unmount();
      registry.dispose();
    })
);
