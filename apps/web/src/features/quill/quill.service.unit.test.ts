import { expect, it } from "@effect/vitest";
import { Deferred, Effect, Fiber } from "effect";
import { IDBFactory } from "fake-indexeddb";

import { QuillError } from "./quill";
import { indexedDbStorage } from "./quill.indexed-db";
import { makeQuill } from "./quill.service";
import { memoryStorage } from "./quill.test-storage";

it.effect(
  "keeps Markdown Documents separate and gives duplicate names a visible suffix",
  () =>
    Effect.gen(function* () {
      const q = makeQuill(memoryStorage());
      const folder = yield* q.create("folder", "Notes", null);
      const first = yield* q.create("document", "Draft.md", folder.id);
      yield* q.open(first.id);
      yield* q.edit("# First\n\nKeep this text.");
      yield* q.save();
      const second = yield* q.create("document", "Draft.md", folder.id);
      expect(second.name).toBe("Draft (2).md");
      yield* q.open(second.id);
      expect((yield* q.view()).document?.source).toBe("");
      yield* q.open(first.id);
      expect((yield* q.view()).document?.source).toBe(
        "# First\n\nKeep this text."
      );
    })
);

it.effect(
  "retains dirty text after a save failure and refuses a stale tab save",
  () =>
    Effect.gen(function* () {
      const storage = memoryStorage();
      const first = makeQuill(storage);
      const second = makeQuill(storage);
      const item = yield* first.create("document", "Draft.md", null);
      yield* first.open(item.id);
      yield* second.open(item.id);
      yield* first.edit("Committed in tab one");
      yield* first.save();
      yield* second.edit("Keep tab two text");
      expect((yield* Effect.result(second.save()))._tag).toBe("Failure");
      expect((yield* second.view()).document?.source).toBe("Keep tab two text");
      expect((yield* second.view()).save).toBe("conflict");
      const third = makeQuill(storage);
      yield* third.open(item.id);
      expect((yield* third.view()).document?.source).toBe(
        "Committed in tab one"
      );
      yield* third.edit("Not saved yet");
      storage.failNext("storage");
      yield* Effect.result(third.save());
      expect((yield* third.view()).save).toBe("failed");
      expect((yield* third.view()).document?.source).toBe("Not saved yet");
      yield* third.save();
      expect((yield* third.view()).save).toBe("saved");
    })
);

it.effect(
  "refuses folder cycles and restores a trashed folder with its documents",
  () =>
    Effect.gen(function* () {
      const q = makeQuill(memoryStorage());
      const parent = yield* q.create("folder", "Notes", null);
      const child = yield* q.create("folder", "Work", parent.id);
      const doc = yield* q.create("document", "Draft.md", child.id);
      expect((yield* Effect.result(q.move(parent.id, child.id)))._tag).toBe(
        "Failure"
      );
      yield* q.rename(doc.id, "Plan.md");
      yield* q.trash(parent.id);
      expect(
        (yield* q.view()).entries
          .filter((entry) => entry.trash)
          .map((entry) => entry.name)
          .toSorted()
      ).toEqual(["Notes", "Plan.md", "Work"]);
      yield* q.restore(parent.id);
      expect(
        (yield* q.view()).entries.find((entry) => entry.id === doc.id)
      ).toMatchObject({ parent: child.id, trash: null, name: "Plan.md" });
      yield* q.trash(parent.id);
      expect((yield* Effect.result(q.remove(parent.id, false)))._tag).toBe(
        "Failure"
      );
      yield* q.remove(parent.id, true);
      expect((yield* q.view()).entries).toEqual([]);
    })
);

it.effect(
  "restores all Trash in one transaction, keeps nested parents, and resolves name conflicts",
  () =>
    Effect.gen(function* () {
      const factory = new IDBFactory();
      const q = makeQuill(indexedDbStorage(() => factory));
      yield* q.restoreAll();
      const folder = yield* q.create("folder", "Notes", null);
      const child = yield* q.create("document", "Draft.md", folder.id);
      yield* q.open(child.id);
      yield* q.edit("Keep the nested source");
      yield* q.trash(child.id);
      yield* q.trash(folder.id);
      const first = yield* q.create("document", "Draft.md", null);
      yield* q.trash(first.id);
      const second = yield* q.create("document", "Draft.md", null);
      yield* q.trash(second.id);
      const active = yield* q.create("document", "Draft.md", null);
      yield* q.restoreAll();
      const { entries } = yield* q.view();
      expect(entries.every((entry) => entry.trash === null)).toBe(true);
      expect(entries.find((entry) => entry.id === child.id)).toMatchObject({
        parent: folder.id,
        name: "Draft.md",
      });
      expect(
        entries
          .filter((entry) => entry.parent === null)
          .map((entry) => entry.name)
          .toSorted()
      ).toEqual(["Draft (2).md", "Draft (3).md", "Draft.md", "Notes"]);
      expect(entries.find((entry) => entry.id === active.id)?.name).toBe(
        "Draft.md"
      );
      const reopened = makeQuill(indexedDbStorage(() => factory));
      yield* reopened.open(child.id);
      expect((yield* reopened.view()).document?.source).toBe(
        "Keep the nested source"
      );
    })
);

it.effect(
  "keeps all Trash after a failed bulk restore and restores a missing parent at the root",
  () =>
    Effect.gen(function* () {
      const storage = memoryStorage();
      const q = makeQuill(storage);
      const folder = yield* q.create("folder", "Notes", null);
      const child = yield* q.create("document", "Draft.md", folder.id);
      yield* q.trash(child.id);
      // Keep an orphaned Trash entry to check recovery from a missing parent.
      yield* storage.commit({
        expected: [],
        entries: [],
        bodies: [],
        remove: [folder.id],
      });
      const before = (yield* q.view()).entries;
      storage.failNext("storage");
      expect((yield* Effect.result(q.restoreAll()))._tag).toBe("Failure");
      expect((yield* q.view()).entries).toEqual(before);
      yield* q.restoreAll();
      expect((yield* q.view()).entries).toEqual([
        { ...child, parent: null, trash: null },
      ]);
    })
);

it.effect(
  "requires confirmation to empty Trash and keeps active documents and bodies",
  () =>
    Effect.gen(function* () {
      const storage = memoryStorage();
      const q = makeQuill(storage);
      const folder = yield* q.create("folder", "Notes", null);
      const child = yield* q.create("document", "Nested.md", folder.id);
      const other = yield* q.create("document", "Other.md", null);
      const active = yield* q.create("document", "Keep.md", null);
      yield* q.open(active.id);
      yield* q.edit("Keep the active source");
      yield* q.trash(folder.id);
      yield* q.trash(other.id);
      const before = (yield* q.view()).entries;
      expect((yield* Effect.result(q.removeAll(false)))._tag).toBe("Failure");
      expect((yield* q.view()).entries).toEqual(before);
      storage.failNext("storage");
      expect((yield* Effect.result(q.removeAll(true)))._tag).toBe("Failure");
      expect((yield* q.view()).entries).toEqual(before);
      yield* q.removeAll(true);
      expect((yield* q.view()).entries.map((entry) => entry.id)).toEqual([
        active.id,
      ]);
      expect(yield* storage.read(child.id)).toBeUndefined();
      expect(yield* storage.read(other.id)).toBeUndefined();
      const reopened = makeQuill(storage);
      yield* reopened.open(active.id);
      expect((yield* reopened.view()).document?.source).toBe(
        "Keep the active source"
      );
      yield* q.removeAll(true);
    })
);

it.effect(
  "keeps the Import Original and current source through a protected visual conversion",
  () =>
    Effect.gen(function* () {
      const q = makeQuill(memoryStorage());
      const bytes = Uint8Array.from([
        239,
        187,
        191,
        ...new TextEncoder().encode(
          "---\r\ntitle: Private\r\n---\r\n# Notes\r\n"
        ),
      ]);
      const imported = yield* q.importFiles(
        [
          { path: "Work/notes.md", bytes },
          { path: "bad.md", bytes: Uint8Array.of(255) },
        ],
        null
      );
      expect(imported.failures).toEqual([
        { path: "bad.md", reason: "unreadable" },
      ]);
      const [doc] = imported.documents;
      if (!doc) {
        throw new Error("Expected the valid import");
      }
      yield* q.open(doc.id);
      expect((yield* q.view()).mode).toBe("source");
      expect((yield* q.exportDocument()).bytes).toEqual(bytes);
      yield* q.edit("---\ntitle: Changed\n---\n# Notes\n");
      expect((yield* Effect.result(q.setMode("visual")))._tag).toBe("Failure");
      const plan = yield* q.planConversion();
      expect(plan.affected.join("\n")).toContain("title: Changed");
      yield* q.convert(plan, true);
      expect(
        (yield* q.view()).document?.copies.map((copy) => copy.source)
      ).toEqual(["---\ntitle: Changed\n---\n# Notes\n"]);
      expect((yield* q.recovery("original")).bytes).toEqual(bytes);
    })
);

it.effect(
  "round-trips a Library Backup into new IDs without replacing existing work",
  () =>
    Effect.gen(function* () {
      const q = makeQuill(memoryStorage());
      const folder = yield* q.create("folder", "Notes", null);
      yield* q.create("folder", "Empty", folder.id);
      const imported = yield* q.importFiles(
        [
          {
            path: "first.md",
            bytes: new TextEncoder().encode("# Original\r\n"),
          },
        ],
        folder.id
      );
      const [doc] = imported.documents;
      if (!doc) {
        throw new Error("Expected document");
      }
      yield* q.open(doc.id);
      yield* q.edit("# Pending edit");
      const backup = yield* q.archive(null, true);
      const root = yield* q.restoreBackup(backup.bytes);
      const view = yield* q.view();
      expect(
        view.entries
          .filter((entry) => entry.parent === root.id)
          .map((entry) => entry.name)
      ).toEqual(["Notes"]);
      const restored = view.entries.find(
        (entry) => entry.name === "first.md" && entry.id !== doc.id
      );
      if (!restored) {
        throw new Error("Expected restored document");
      }
      yield* q.open(restored.id);
      expect((yield* q.view()).document?.source).toBe("# Pending edit");
      expect(
        new TextDecoder().decode((yield* q.recovery("original")).bytes)
      ).toBe("# Original\r\n");
      yield* q.open(doc.id);
      expect((yield* q.view()).document?.source).toBe("# Pending edit");
      const before = (yield* q.view()).entries;
      yield* Effect.result(q.restoreBackup(Uint8Array.of(1, 2, 3)));
      expect((yield* q.view()).entries).toEqual(before);
    })
);

it.effect(
  "reports Saved only after commit and retains edits made during the write",
  () =>
    Effect.gen(function* () {
      const storage = memoryStorage();
      const started = yield* Deferred.make<boolean>();
      const release = yield* Deferred.make<boolean>();
      let delayed = false;
      const q = makeQuill({
        ...storage,
        commit: (mutation) =>
          delayed
            ? Effect.gen(function* () {
                yield* Deferred.succeed(started, true);
                yield* Deferred.await(release);
                yield* storage.commit(mutation);
              })
            : storage.commit(mutation),
      });
      const entry = yield* q.create("document", "Notes.md", null);
      yield* q.open(entry.id);
      yield* q.edit("First edit");
      delayed = true;
      const saving = yield* q.save().pipe(Effect.forkScoped);
      yield* Deferred.await(started);
      expect((yield* q.view()).save).toBe("saving");
      yield* q.edit("New text during commit");
      yield* Deferred.succeed(release, true);
      yield* Fiber.join(saving);
      expect((yield* q.view()).save).toBe("dirty");
      expect((yield* q.view()).document?.source).toBe("New text during commit");
      delayed = false;
      yield* q.save();
      const reopened = makeQuill(storage);
      yield* reopened.open(entry.id);
      expect((yield* reopened.view()).document?.source).toBe(
        "New text during commit"
      );
    })
);

it.effect(
  "uses IndexedDB transactions to refuse conflicting writes and survives a new service",
  () =>
    Effect.gen(function* () {
      const factory = new IDBFactory();
      const one = makeQuill(indexedDbStorage(() => factory));
      const two = makeQuill(indexedDbStorage(() => factory));
      const entry = yield* one.create("document", "Notes.md", null);
      yield* one.open(entry.id);
      yield* two.open(entry.id);
      yield* one.edit("First tab");
      yield* one.save();
      yield* two.edit("Other text");
      yield* Effect.result(two.save());
      expect((yield* two.view()).save).toBe("conflict");
      yield* two.saveAsNew();
      const view = yield* two.view();
      expect(view.document?.name).toBe("Notes (2).md");
      expect(view.save).toBe("saved");
      const reopened = makeQuill(indexedDbStorage(() => factory));
      yield* reopened.open(entry.id);
      expect((yield* reopened.view()).document?.source).toBe("First tab");
    })
);

it.effect("keeps readable records when another stored record is invalid", () =>
  Effect.gen(function* () {
    const storage = memoryStorage();
    const first = makeQuill(storage);
    const item = yield* first.create("document", "Notes.md", null);
    const q = makeQuill({
      ...storage,
      list: () =>
        storage
          .list()
          .pipe(Effect.map((rows) => [...rows, { version: 99, name: "bad" }])),
    });
    yield* q.open(item.id);
    expect((yield* q.view()).unreadable).toBe(1);
    expect((yield* q.view()).document?.name).toBe("Notes.md");
  })
);

it.effect(
  "refuses unsafe Library Backups before any saved record changes",
  () =>
    Effect.gen(function* () {
      const { zipSync, strToU8, unzipSync } = yield* Effect.promise(
        () => import("fflate")
      );
      const q = makeQuill(memoryStorage());
      const folder = yield* q.create("folder", "Keep", null);
      yield* q.create("document", "Notes.md", folder.id);
      const backup = yield* q.archive(null, true);
      const before = (yield* q.view()).entries;
      const valid = unzipSync(backup.bytes);
      const badArchives = [
        zipSync({ ...valid, "../outside.md": strToU8("unsafe") }),
        zipSync({ ...valid, "/absolute.md": strToU8("unsafe") }),
        zipSync({ ...valid, "Keep/notes.md": strToU8("duplicate case") }),
        zipSync({
          ...valid,
          ".quill/manifest.json": strToU8('{"version":99,"records":[]}'),
        }),
        zipSync({ ...valid, ".quill/extra.json": strToU8("{}") }),
      ];
      for (const bytes of badArchives) {
        expect((yield* Effect.result(q.restoreBackup(bytes)))._tag).toBe(
          "Failure"
        );
        expect((yield* q.view()).entries).toEqual(before);
      }
    })
);

it.effect(
  "keeps the same Library snapshot while text changes during backup",
  () =>
    Effect.gen(function* () {
      const storage = memoryStorage();
      const started = yield* Deferred.make<boolean>();
      const release = yield* Deferred.make<boolean>();
      const q = makeQuill({
        ...storage,
        snapshot: (entries) =>
          Effect.gen(function* () {
            const result = yield* storage.snapshot(entries);
            yield* Deferred.succeed(started, true);
            yield* Deferred.await(release);
            return result;
          }),
      });
      const item = yield* q.create("document", "Notes.md", null);
      yield* q.open(item.id);
      yield* q.edit("Snapshot text");
      const archiving = yield* q.archive(null, true).pipe(Effect.forkScoped);
      yield* Deferred.await(started);
      yield* q.edit("Later text");
      yield* Deferred.succeed(release, true);
      const backup = yield* Fiber.join(archiving);
      const { strFromU8, unzipSync } = yield* Effect.promise(
        () => import("fflate")
      );
      expect(
        strFromU8(unzipSync(backup.bytes)["Notes.md"] ?? new Uint8Array())
      ).toBe("Snapshot text");
      expect((yield* q.view()).document?.source).toBe("Later text");
    })
);

it.effect(
  "protects unsupported syntax, permits supported math, and resolves Library links",
  () =>
    Effect.gen(function* () {
      const q = makeQuill(memoryStorage());
      const folder = yield* q.create("folder", "Work", null);
      const first = yield* q.create("document", "First.md", folder.id);
      const second = yield* q.create("document", "Second.md", folder.id);
      yield* q.open(first.id);
      yield* q.setMode("source");
      for (const source of [
        "---\ntitle: Value\n---\n# Notes",
        "<!-- comment -->",
        "<script>alert(1)</script>",
        "<Component value={1} />",
        ":::custom\nkeep\n:::",
      ]) {
        yield* q.edit(source);
        expect((yield* q.view()).document?.compatibility.safe).toBe(false);
        expect((yield* Effect.result(q.setMode("visual")))._tag).toBe(
          "Failure"
        );
      }
      yield* q.edit(
        "# Notes\n\nInline $x^2$ and display:\n\n$$\n\\frac{a}{b}\n$$\n"
      );
      yield* q.setMode("visual");
      expect((yield* q.view()).mode).toBe("visual");
      yield* q.followLink("Second.md");
      expect((yield* q.view()).document?.id).toBe(second.id);
    })
);

it.effect(
  "offers raw recovery after a newer storage version refuses to open",
  () =>
    Effect.gen(function* () {
      const factory = new IDBFactory();
      const first = makeQuill(indexedDbStorage(() => factory, "migration"));
      yield* first.create("document", "Keep.md", null);
      yield* Effect.callback<boolean>((resume) => {
        const upgrade = factory.open("migration", 2);
        upgrade.addEventListener("success", () => {
          upgrade.result.close();
          resume(Effect.succeed(true));
        });
        upgrade.addEventListener("error", () =>
          resume(Effect.die("Fixture upgrade failed"))
        );
      });
      const q = makeQuill(indexedDbStorage(() => factory, "migration"));
      expect((yield* Effect.result(q.initialize()))._tag).toBe("Failure");
      const recovery = yield* q.recover();
      expect(new TextDecoder().decode(recovery)).toContain("Keep.md");
    })
);

it.effect(
  "a stale rename cannot authorize an overwrite of another tab's text",
  () =>
    Effect.gen(function* () {
      const storage = memoryStorage();
      const a = makeQuill(storage);
      const b = makeQuill(storage);
      const entry = yield* a.create("document", "Notes.md", null);
      yield* a.open(entry.id);
      yield* b.open(entry.id);
      yield* b.edit("New text from tab B");
      yield* b.flush();
      expect(
        (yield* Effect.result(a.rename(entry.id, "Renamed.md")))._tag
      ).toBe("Failure");
      yield* a.edit("Tab A keeps its text");
      expect((yield* Effect.result(a.flush()))._tag).toBe("Failure");
      const reader = makeQuill(storage);
      yield* reader.open(entry.id);
      expect((yield* reader.view()).document?.source).toBe(
        "New text from tab B"
      );
    })
);

it.effect("flushes text entered while the next document is loading", () =>
  Effect.gen(function* () {
    const storage = memoryStorage();
    const entered = yield* Deferred.make<boolean>();
    const release = yield* Deferred.make<boolean>();
    let delayed = false;
    const q = makeQuill({
      ...storage,
      read: (id) =>
        delayed
          ? Effect.gen(function* () {
              yield* Deferred.succeed(entered, true);
              yield* Deferred.await(release);
              return yield* storage.read(id);
            })
          : storage.read(id),
    });
    const a = yield* q.create("document", "A.md", null);
    const b = yield* q.create("document", "B.md", null);
    yield* q.open(a.id);
    delayed = true;
    const opening = yield* q.open(b.id).pipe(Effect.forkScoped);
    yield* Deferred.await(entered);
    yield* q.edit("Text entered during the load", a.id);
    yield* Deferred.succeed(release, true);
    yield* Fiber.join(opening);
    const reader = makeQuill(storage);
    yield* reader.open(a.id);
    expect((yield* reader.view()).document?.source).toBe(
      "Text entered during the load"
    );
    yield* q.edit("Late event from the old editor", a.id);
    yield* q.flush();
    expect((yield* q.view()).document?.id).toBe(b.id);
    expect((yield* q.view()).document?.source).toBe("");
    const again = makeQuill(storage);
    yield* again.open(a.id);
    expect((yield* again.view()).document?.source).toBe(
      "Late event from the old editor"
    );
  })
);

it.effect(
  "renders the full supported document profile and keeps failed figure source",
  () =>
    Effect.gen(function* () {
      const q = makeQuill(memoryStorage(), undefined, (kind, source) =>
        Effect.succeed({
          kind,
          source,
          url: null,
          error: source.includes("invalid"),
        })
      );
      const entry = yield* q.create("document", "Profile.md", null);
      yield* q.open(entry.id);
      const source =
        "# Profile\n\n## Second heading\n\nText with **bold**, *italic*, ~~removed~~, `inline`, [external](https://example.org), and [local](next.md).\n\n> A quotation\n\n3. Third\n4. Fourth\n\n- Bullet one\n- Bullet two\n\n- [x] Done\n- [ ] Next\n\n---\n\n| Name | Value |\n| --- | --- |\n| A | B |\n\n![reference](local.png)\n\nInline ![inline](local.png) with a hard break.  \nNext line.\n\n> - Nested quotation list\n\n```\n\n```\n\nInline $x$ and $x$ and $invalid$.\n\n$$\ny^2\n$$\n\n```mermaid\ngraph TD\n A --> B\n```\n\n```mermaid\ninvalid\n```\n\n```unknown\ncode text\n```\n";
      yield* q.edit(source);
      const render = yield* q.render(source);
      expect(render.figures.size).toBe(5);
      expect(
        [...render.figures.values()]
          .filter((figure) => figure.error)
          .map((figure) => `${figure.kind}: ${figure.source}`)
      ).toEqual(["math: invalid", "mermaid: invalid"]);
      const protectedRender = yield* q.render("<!-- retained -->");
      expect(protectedRender.model.content?.[0]?.type).toBe("codeBlock");
    }),
  30_000
);

it.effect("restores preferences and keeps history local to each document", () =>
  Effect.gen(function* () {
    const storage = memoryStorage();
    const creator = makeQuill(storage);
    const entry = yield* creator.create("document", "Remembered", null);
    const remembered: string[] = [];
    const q = makeQuill(storage, {
      id: () => crypto.randomUUID(),
      now: () => 123,
      preferences: () => ({ selected: entry.id, mode: "read" }),
      remember: (id, mode) => remembered.push(`${id}:${mode}`),
      persist: () => Effect.fail(new QuillError({ reason: "storage" })),
    });
    const initialized = yield* q.initialize();
    expect(initialized.document?.id).toBe(entry.id);
    expect(initialized.mode).toBe("read");
    expect(initialized.persistence).toBe(false);
    yield* q.edit("One");
    yield* q.edit("One");
    yield* q.edit("Two");
    yield* q.history("undo");
    expect((yield* q.view()).document?.source).toBe("One");
    yield* q.history("undo");
    yield* q.history("undo");
    expect((yield* q.view()).document?.source).toBe("");
    yield* q.history("redo");
    yield* q.history("redo");
    yield* q.history("redo");
    expect((yield* q.view()).document?.source).toBe("Two");
    yield* q.setMode("source");
    expect(remembered.at(-1)).toContain(":source");
    const duplicate = yield* q.duplicate(entry.id);
    yield* q.open(duplicate.id);
    expect((yield* q.view()).canUndo).toBe(false);
    expect((yield* q.view()).document?.source).toBe("Two");
    yield* q.trash(duplicate.id);
    yield* q.history("undo");
    yield* q.edit("No document");
    yield* q.flush();
    expect((yield* q.view()).document).toBeNull();
    const reloaded = makeQuill(storage);
    const clone = yield* reloaded.duplicate(entry.id);
    yield* reloaded.open(clone.id);
    expect((yield* reloaded.view()).document?.source).toBe("Two");
  })
);

it.effect(
  "refuses invalid Library actions and keeps conversion source after a failed write",
  () =>
    Effect.gen(function* () {
      const storage = memoryStorage();
      const q = makeQuill(storage);
      const invalidOperations: readonly Effect.Effect<unknown, QuillError>[] = [
        q.open("missing"),
        q.rename("missing", "Valid"),
        q.rename("missing", "../bad"),
        q.move("missing", "missing"),
        q.trash("missing"),
        q.restore("missing"),
        q.remove("missing", true),
        q.duplicate("missing"),
        q.saveAsNew(),
        q.recovery("original"),
        q.planConversion(),
        q.exportDocument(),
        q.followLink("a.md"),
        q.archive("missing", true),
        q.create("document", "../bad", null),
        q.create("document", "valid", "missing"),
      ];
      for (const operation of invalidOperations) {
        expect((yield* Effect.result(operation))._tag).toBe("Failure");
      }
      const doc = yield* q.create("document", "Draft", null);
      yield* q.open(doc.id);
      expect((yield* Effect.result(q.recovery("original")))._tag).toBe(
        "Failure"
      );
      expect((yield* Effect.result(q.recovery(99)))._tag).toBe("Failure");
      yield* q.edit("<!-- protected -->");
      const plan = yield* q.planConversion();
      expect((yield* Effect.result(q.convert(plan, false)))._tag).toBe(
        "Failure"
      );
      expect(
        (yield* Effect.result(
          q.convert({ ...plan, converted: "changed" }, true)
        ))._tag
      ).toBe("Failure");
      storage.failNext("storage");
      expect((yield* Effect.result(q.convert(plan, true)))._tag).toBe(
        "Failure"
      );
      expect((yield* q.view()).document?.source).toBe(plan.source);
      expect((yield* q.view()).document?.copies).toEqual([]);
      yield* q.convert(plan, true);
      expect((yield* q.recovery(0)).bytes).toEqual(
        new TextEncoder().encode(plan.source)
      );
      yield* q.edit("changed again");
      expect((yield* Effect.result(q.convert(plan, true)))._tag).toBe(
        "Failure"
      );
      expect((yield* q.exportDocument()).name).toBe("Draft.md");
      for (const href of [
        "https://example.org",
        "/absolute.md",
        "%xx",
        "missing.md",
      ]) {
        expect((yield* Effect.result(q.followLink(href)))._tag).toBe("Failure");
      }
      const folder = yield* q.create("folder", "Folder", null);
      yield* q.move(doc.id, folder.id);
      yield* q.rename(doc.id, "Draft.md");
      const target = yield* q.create("document", "Next.md", folder.id);
      yield* q.followLink("./Next.md#heading");
      expect((yield* q.view()).document?.id).toBe(target.id);
      yield* q.followLink("../Folder/Draft.md");
      expect((yield* q.view()).document?.id).toBe(doc.id);
      yield* q.trash(doc.id);
      yield* q.remove(doc.id, true);
      expect((yield* q.view()).document).toBeNull();
    })
);

it.effect(
  "keeps readable documents when another body is invalid and can still export raw storage",
  () =>
    Effect.gen(function* () {
      const storage = memoryStorage();
      const creator = makeQuill(storage);
      const good = yield* creator.create("document", "Good.md", null);
      const bad = yield* creator.create("document", "Bad.md", null);
      const q = makeQuill({
        ...storage,
        read: (id) =>
          id === bad.id ? Effect.succeed({ version: 99 }) : storage.read(id),
      });
      expect((yield* Effect.result(q.open(bad.id)))._tag).toBe("Failure");
      yield* q.open(good.id);
      yield* q.save();
      expect((yield* q.view()).document?.id).toBe(good.id);
      const recovered = JSON.parse(
        new TextDecoder().decode(yield* q.recover())
      );
      expect(recovered.entries).toHaveLength(2);
      const report = yield* q.importFiles(
        [
          { path: "Batch/A.md", bytes: new TextEncoder().encode("A") },
          { path: "Batch/B.md", bytes: new TextEncoder().encode("B") },
          { path: "../bad.md", bytes: new Uint8Array() },
        ],
        null
      );
      expect(report.documents).toHaveLength(2);
      expect(report.failures).toEqual([
        { path: "../bad.md", reason: "invalid" },
      ]);
      expect(
        (yield* q.view()).entries.filter((entry) => entry.name === "Batch")
      ).toHaveLength(1);
    })
);

it.effect(
  "keeps the stored competing revision as recovery in a backup of local pending text",
  () =>
    Effect.gen(function* () {
      const storage = memoryStorage();
      const a = makeQuill(storage);
      const b = makeQuill(storage);
      const doc = yield* a.create("document", "Conflict.md", null);
      yield* a.open(doc.id);
      yield* b.open(doc.id);
      yield* a.edit("Local pending text");
      yield* b.edit("Stored competing text");
      yield* b.flush();
      const backup = yield* a.archive(null, true);
      const restored = makeQuill(memoryStorage());
      yield* restored.restoreBackup(backup.bytes);
      const entry = (yield* restored.view()).entries.find(
        (item) => item.kind === "document"
      );
      if (!entry) {
        throw new Error("Expected restored document");
      }
      yield* restored.open(entry.id);
      expect((yield* restored.view()).document?.source).toBe(
        "Local pending text"
      );
      expect((yield* restored.view()).document?.copies[0]?.source).toBe(
        "Stored competing text"
      );
    })
);

it.effect("keeps text typed during a failed conversion write", () =>
  Effect.gen(function* () {
    const storage = memoryStorage();
    const entered = yield* Deferred.make<boolean>();
    const release = yield* Deferred.make<boolean>();
    let delay = false;
    const q = makeQuill({
      ...storage,
      commit: (change) =>
        delay
          ? Effect.gen(function* () {
              yield* Deferred.succeed(entered, true);
              yield* Deferred.await(release);
              return yield* new QuillError({ reason: "storage" });
            })
          : storage.commit(change),
    });
    const doc = yield* q.create("document", "Protected.md", null);
    yield* q.open(doc.id);
    yield* q.edit("<!-- protected -->");
    const plan = yield* q.planConversion();
    delay = true;
    const converting = yield* Effect.result(q.convert(plan, true)).pipe(
      Effect.forkScoped
    );
    yield* Deferred.await(entered);
    yield* q.edit("New source typed during the write");
    yield* Deferred.succeed(release, true);
    expect((yield* Fiber.join(converting))._tag).toBe("Failure");
    expect((yield* q.view()).document?.source).toBe(
      "New source typed during the write"
    );
    expect((yield* q.view()).document?.copies).toEqual([]);
    delay = false;
    yield* q.flush();
    const reader = makeQuill(storage);
    yield* reader.open(doc.id);
    expect((yield* reader.view()).document?.source).toBe(
      "New source typed during the write"
    );
  })
);

it.effect(
  "saves the active document before closing it and keeps the Library entry",
  () =>
    Effect.gen(function* () {
      const q = makeQuill(memoryStorage());
      const doc = yield* q.create("document", "Keep.md", null);
      yield* q.open(doc.id);
      yield* q.edit("Keep these unsaved words");
      yield* q.close();
      expect((yield* q.view()).document).toBeNull();
      expect((yield* q.view()).entries.map((entry) => entry.id)).toContain(
        doc.id
      );
      yield* q.open(doc.id);
      expect((yield* q.view()).document?.source).toBe(
        "Keep these unsaved words"
      );
      expect((yield* q.view()).save).toBe("saved");
    })
);

it.effect("keeps the active document open when saving before close fails", () =>
  Effect.gen(function* () {
    const storage = memoryStorage();
    const q = makeQuill(storage);
    const doc = yield* q.create("document", "Keep.md", null);
    yield* q.open(doc.id);
    yield* q.edit("Still here");
    storage.failNext("storage");
    expect((yield* Effect.result(q.close()))._tag).toBe("Failure");
    expect((yield* q.view()).document?.source).toBe("Still here");
  })
);
