import { Context, Effect, Layer, Schema, Semaphore } from "effect";

import { MAX_SEGMENT_LENGTH, safeZipSegments } from "@/core/libs/files";
import { loadLibrary } from "@/core/libs/library-load";

import * as T from "./quill";
import type { FigureRenderer } from "./quill.render";
import { emptyBody } from "./quill.storage";
import type { Resources, Storage } from "./quill.storage";

const defaults: Resources = {
  id: () => crypto.randomUUID(),
  now: () => Date.now(),
  preferences: () => ({ selected: null, mode: "visual" }),
  remember: () => {
    /* A test or non-browser service has no preferences to persist. */
  },
  persist: () => Effect.succeed(false),
};
interface Session {
  body: T.Body;
  saved: string;
  state: T.SaveState;
  undo: string[];
  redo: string[];
}
const invalid = () => new T.QuillError({ reason: "invalid" });
const unavailable = () => new T.QuillError({ reason: "offline" });
const resourceFailure = () => new T.QuillError({ reason: "resource" });
const unreadableFailure = () => new T.QuillError({ reason: "unreadable" });
const uniqueName = (
  entries: readonly T.Entry[],
  entry: Pick<T.Entry, "name" | "parent" | "kind">,
  exclude?: string
) => {
  const dot = entry.kind === "document" ? entry.name.lastIndexOf(".") : -1;
  const stem = dot > 0 ? entry.name.slice(0, dot) : entry.name;
  const extension = dot > 0 ? entry.name.slice(dot) : "";
  let { name } = entry;
  let suffix = 2;
  while (
    entries.some(
      (item) =>
        item.id !== exclude &&
        !item.trash &&
        item.parent === entry.parent &&
        item.name.toLowerCase() === name.toLowerCase()
    )
  ) {
    const tail = ` (${suffix})`;
    name = `${stem.slice(0, Math.max(1, MAX_SEGMENT_LENGTH - extension.length - tail.length))}${tail}${extension}`;
    suffix += 1;
  }
  return name;
};
const validName = (name: string) =>
  name.trim() === name &&
  name.length > 0 &&
  name.toLowerCase() !== ".quill" &&
  safeZipSegments(name).length === 1 &&
  safeZipSegments(name)[0] === name &&
  !/[\\/:*?"<>|]/u.test(name);
const subtree = (entries: readonly T.Entry[], id: string) => {
  const found = new Set([id]);
  let size = 0;
  while (size !== found.size) {
    ({ size } = found);
    for (const item of entries) {
      if (item.parent && found.has(item.parent)) {
        found.add(item.id);
      }
    }
  }
  return entries.filter((item) => found.has(item.id));
};

export const makeQuill = (
  storage: Storage,
  resources: Resources = defaults,
  figure?: FigureRenderer
) => {
  const sessions = new Map<string, Session>();
  const writes = Semaphore.makeUnsafe(1);
  let selected: string | null = null;
  let mode: T.Mode = "visual";
  let persistence: boolean | null = null;
  let unreadable = 0;
  const active = () => (selected ? sessions.get(selected) : undefined);
  const list = Effect.fn("Quill.list")(function* () {
    const rows = yield* storage.list();
    const entries: T.Entry[] = [];
    unreadable = 0;
    for (const row of rows) {
      const decoded = Schema.decodeUnknownExit(T.Entry)(row);
      if (decoded._tag === "Success" && validName(decoded.value.name)) {
        entries.push(decoded.value);
      } else {
        unreadable += 1;
      }
    }
    return entries;
  });
  const read = Effect.fn("Quill.read")(function* (id: string) {
    return yield* Schema.decodeUnknownEffect(T.Body)(
      yield* storage.read(id)
    ).pipe(Effect.mapError(unreadableFailure));
  });
  const remember = () => resources.remember(selected, mode);
  const saveById = Effect.fn("Quill.saveById")(function* (id: string | null) {
    const session = id ? sessions.get(id) : undefined;
    if (!session || session.state === "saved") {
      return;
    }
    const { body } = session;
    const entry = (yield* list()).find(
      (item) => item.id === body.id && !item.trash
    );
    if (!entry) {
      return yield* invalid();
    }
    const next = { ...body, revision: body.revision + 1 };
    session.state = "saving";
    yield* storage
      .commit({
        expected: [{ id: entry.id, revision: body.revision }],
        entries: [{ ...entry, revision: next.revision }],
        bodies: [next],
        remove: [],
      })
      .pipe(
        Effect.tapError((error) =>
          Effect.sync(() => {
            session.state = error.reason === "conflict" ? "conflict" : "failed";
          })
        )
      );
    session.saved = body.source;
    session.body = { ...session.body, revision: next.revision };
    session.state = session.body.source === body.source ? "saved" : "dirty";
  }, writes.withPermit);
  const save = Effect.fn("Quill.save")(() => saveById(selected));
  const flush = Effect.fn("Quill.flush")(function* () {
    for (const [id, session] of sessions) {
      if (session.state !== "saved") {
        do {
          yield* saveById(id);
        } while (session.state === "dirty");
      }
    }
  });
  const inspect = Effect.fn("Quill.inspect")(function* (source: string) {
    const adapter = yield* Effect.tryPromise({
      try: () => loadLibrary("Tiptap", () => import("./quill.markdown")),
      catch: unavailable,
    });
    return yield* adapter.inspect(source);
  });
  const open = Effect.fn("Quill.open")(function* (id: string) {
    if (id === selected) {
      return;
    }
    yield* flush();
    const entry = (yield* list()).find(
      (item) => item.id === id && !item.trash && item.kind === "document"
    );
    if (!entry) {
      return yield* invalid();
    }
    if (!sessions.has(id)) {
      const body = yield* read(id);
      sessions.set(id, {
        body,
        saved: body.source,
        state: "saved",
        undo: [],
        redo: [],
      });
    }
    const session = sessions.get(id);
    if (!session) {
      return yield* invalid();
    }
    const result = yield* Effect.result(inspect(session.body.source));
    yield* flush();
    selected = id;
    if (result._tag === "Failure") {
      mode = "source";
      remember();
      return yield* result.failure;
    }
    if (!result.success.safe && mode === "visual") {
      mode = "source";
    }
    remember();
  });
  const create = Effect.fn("Quill.create")(function* (
    kind: T.Entry["kind"],
    name: string,
    parent: string | null,
    body?: T.Body
  ) {
    if (!validName(name)) {
      return yield* invalid();
    }
    const entries = yield* list();
    if (
      parent &&
      !entries.some(
        (item) => item.id === parent && item.kind === "folder" && !item.trash
      )
    ) {
      return yield* invalid();
    }
    const entry: T.Entry = {
      version: 1,
      id: resources.id(),
      parent,
      name: uniqueName(entries, { name, parent, kind }),
      kind,
      revision: 0,
      trash: null,
    };
    const next = body
      ? { ...body, id: entry.id, revision: 0 }
      : emptyBody(entry);
    yield* storage.commit({
      expected: [{ id: entry.id, revision: null }],
      entries: [entry],
      bodies: kind === "document" ? [next] : [],
      remove: [],
    });
    return entry;
  });
  const change = Effect.fn("Quill.change")(function* (
    id: string,
    update: (entry: T.Entry, entries: readonly T.Entry[]) => T.Entry
  ) {
    yield* flush();
    const entries = yield* list();
    const entry = entries.find((item) => item.id === id && !item.trash);
    if (!entry) {
      return yield* invalid();
    }
    const cached = sessions.get(id);
    if (cached && cached.body.revision !== entry.revision) {
      cached.state = "conflict";
      return yield* new T.QuillError({ reason: "conflict" });
    }
    const next = update(entry, entries);
    const body = entry.kind === "document" ? yield* read(id) : null;
    yield* storage.commit({
      expected: [{ id, revision: entry.revision }],
      entries: [next],
      bodies: body ? [{ ...body, revision: next.revision }] : [],
      remove: [],
    });
    const session = sessions.get(id);
    if (session) {
      session.body = { ...session.body, revision: next.revision };
    }
  });
  const rename = Effect.fn("Quill.rename")(function* (
    id: string,
    name: string
  ) {
    if (!validName(name)) {
      return yield* invalid();
    }
    yield* change(id, (entry, entries) => ({
      ...entry,
      name: uniqueName(entries, { ...entry, name }, id),
      revision: entry.revision + 1,
    }));
  });
  const move = Effect.fn("Quill.move")(function* (
    id: string,
    parent: string | null
  ) {
    const entries = yield* list();
    if (
      parent &&
      (!entries.some(
        (item) => item.id === parent && item.kind === "folder" && !item.trash
      ) ||
        subtree(entries, id).some((item) => item.id === parent))
    ) {
      return yield* invalid();
    }
    yield* change(id, (entry, current) => ({
      ...entry,
      parent,
      name: uniqueName(current, { ...entry, parent }, id),
      revision: entry.revision + 1,
    }));
  });
  const trash = Effect.fn("Quill.trash")(function* (id: string) {
    yield* flush();
    const entries = yield* list();
    if (!entries.some((item) => item.id === id && !item.trash)) {
      return yield* invalid();
    }
    const removed = subtree(entries, id).filter((entry) => !entry.trash);
    yield* storage.commit({
      expected: removed.map((entry) => ({
        id: entry.id,
        revision: entry.revision,
      })),
      entries: removed.map((entry) => ({ ...entry, trash: id })),
      bodies: [],
      remove: [],
    });
    if (removed.some((entry) => entry.id === selected)) {
      selected = null;
      remember();
    }
  });
  const restore = Effect.fn("Quill.restore")(function* (id: string) {
    const entries = yield* list();
    const root = entries.find((entry) => entry.id === id && entry.trash === id);
    if (!root) {
      return yield* invalid();
    }
    const parent = entries.some(
      (entry) => entry.id === root.parent && !entry.trash
    )
      ? root.parent
      : null;
    const restored: T.Entry[] = [];
    for (const entry of entries) {
      if (entry.trash === id) {
        restored.push(
          entry.id === id
            ? {
                ...entry,
                parent,
                name: uniqueName(entries, { ...entry, parent }),
                trash: null,
              }
            : { ...entry, trash: null }
        );
      }
    }
    yield* storage.commit({
      expected: restored.map((entry) => ({
        id: entry.id,
        revision: entry.revision,
      })),
      entries: restored,
      bodies: [],
      remove: [],
    });
  });
  const remove = Effect.fn("Quill.remove")(function* (
    id: string,
    confirmed: boolean
  ) {
    const entries = yield* list();
    if (
      !confirmed ||
      !entries.some((entry) => entry.id === id && entry.trash === id)
    ) {
      return yield* invalid();
    }
    const removed = subtree(entries, id);
    yield* storage.commit({
      expected: removed.map((entry) => ({
        id: entry.id,
        revision: entry.revision,
      })),
      entries: [],
      bodies: [],
      remove: removed.map((entry) => entry.id),
    });
    for (const entry of removed) {
      sessions.delete(entry.id);
    }
  });
  const restoreAll = Effect.fn("Quill.restoreAll")(function* () {
    const entries = yield* list();
    const trashed = entries.filter((entry) => entry.trash);
    if (!trashed.length) {
      return;
    }
    const folders = new Set(
      entries.flatMap((entry) => (entry.kind === "folder" ? [entry.id] : []))
    );
    const available = entries.filter((entry) => !entry.trash);
    const restored: T.Entry[] = [];
    for (const entry of trashed) {
      const parent =
        entry.parent && folders.has(entry.parent) ? entry.parent : null;
      const next = {
        ...entry,
        parent,
        name: uniqueName(available, { ...entry, parent }),
        trash: null,
      };
      restored.push(next);
      available.push(next);
    }
    yield* storage.commit({
      expected: trashed.map((entry) => ({
        id: entry.id,
        revision: entry.revision,
      })),
      entries: restored,
      bodies: [],
      remove: [],
    });
  });
  const removeAll = Effect.fn("Quill.removeAll")(function* (
    confirmed: boolean
  ) {
    if (!confirmed) {
      return yield* invalid();
    }
    const removed = (yield* list()).filter((entry) => entry.trash);
    if (!removed.length) {
      return;
    }
    yield* storage.commit({
      expected: removed.map((entry) => ({
        id: entry.id,
        revision: entry.revision,
      })),
      entries: [],
      bodies: [],
      remove: removed.map((entry) => entry.id),
    });
    for (const entry of removed) {
      sessions.delete(entry.id);
    }
  });
  const edit = Effect.fn("Quill.edit")(
    (source: string, id: string | null = selected) =>
      Effect.sync(() => {
        const session = id ? sessions.get(id) : undefined;
        if (!session || source === session.body.source) {
          return;
        }
        session.undo.push(session.body.source);
        session.redo = [];
        session.body = { ...session.body, source };
        session.state = source === session.saved ? "saved" : "dirty";
      })
  );
  const history = Effect.fn("Quill.history")((direction: "undo" | "redo") =>
    Effect.sync(() => {
      const session = active();
      if (!session) {
        return;
      }
      const source = session[direction].pop();
      if (source === undefined) {
        return;
      }
      session[direction === "undo" ? "redo" : "undo"].push(session.body.source);
      session.body = { ...session.body, source };
      session.state = source === session.saved ? "saved" : "dirty";
    })
  );
  const view = Effect.fn("Quill.view")(function* (): Effect.fn.Return<
    T.View,
    T.QuillError
  > {
    const entries = yield* list();
    const session = active();
    const entry = entries.find((item) => item.id === selected);
    return {
      entries,
      document:
        session && entry
          ? {
              ...session.body,
              name: entry.name,
              compatibility: yield* inspect(session.body.source).pipe(
                Effect.catch(() =>
                  Effect.succeed<T.Compatibility>({
                    safe: false,
                    affected: [session.body.source],
                    converted: null,
                  })
                )
              ),
            }
          : null,
      save:
        session?.state === "saved" &&
        [...sessions.values()].some((other) => other.state !== "saved")
          ? "dirty"
          : (session?.state ?? "saved"),
      mode,
      canUndo: !!session?.undo.length,
      canRedo: !!session?.redo.length,
      persistence,
      unreadable,
    };
  });
  const initialize = Effect.fn("Quill.initialize")(function* () {
    const preferences = resources.preferences();
    ({ mode } = preferences);
    yield* list();
    persistence = yield* resources
      .persist()
      .pipe(Effect.catch(() => Effect.succeed(false)));
    if (
      preferences.selected &&
      (yield* list()).some(
        (entry) => entry.id === preferences.selected && !entry.trash
      )
    ) {
      yield* open(preferences.selected);
    }
    return yield* view();
  });
  const importFiles = Effect.fn("Quill.importFiles")(function* (
    files: readonly T.FileInput[],
    parent: string | null
  ) {
    const documents: T.Entry[] = [];
    const failures: { path: string; reason: T.QuillError["reason"] }[] = [];
    const folders = new Map<string, string>();
    for (const file of files) {
      const result = yield* Effect.result(
        Effect.gen(function* () {
          const segments = safeZipSegments(file.path);
          if (
            segments.join("/") !== file.path ||
            !segments.every(validName) ||
            !/\.(?:md|markdown)$/iu.test(file.path)
          ) {
            return yield* invalid();
          }
          const source = yield* Effect.try({
            try: () =>
              new TextDecoder("utf-8", { fatal: true }).decode(file.bytes),
            catch: unreadableFailure,
          });
          let destination = parent;
          for (let index = 0; index < segments.length - 1; index += 1) {
            const path = segments.slice(0, index + 1).join("/");
            const existing = folders.get(path);
            if (existing) {
              destination = existing;
            } else {
              const folder = yield* create(
                "folder",
                segments[index] ?? "",
                destination
              );
              folders.set(path, folder.id);
              destination = folder.id;
            }
          }
          const name = segments.at(-1) ?? "";
          const body = {
            ...emptyBody(
              {
                version: 1,
                id: "import",
                parent: null,
                name,
                kind: "document",
                revision: 0,
                trash: null,
              },
              source
            ),
            original: [...file.bytes],
            originalSource: source,
          };
          return yield* create("document", name, destination, body);
        })
      );
      if (result._tag === "Success") {
        documents.push(result.success);
      } else {
        failures.push({ path: file.path, reason: result.failure.reason });
      }
    }
    return { documents, failures };
  });
  const planConversion = Effect.fn("Quill.planConversion")(function* () {
    const session = active();
    if (!session) {
      return yield* invalid();
    }
    return {
      id: session.body.id,
      source: session.body.source,
      ...(yield* inspect(session.body.source)),
    };
  });
  const convert = Effect.fn("Quill.convert")(function* (
    plan: T.Compatibility & { readonly id: string; readonly source: string },
    accepted: boolean
  ) {
    const session = active();
    if (
      !accepted ||
      !session ||
      session.body.id !== plan.id ||
      session.body.source !== plan.source ||
      !plan.converted
    ) {
      return yield* new T.QuillError({ reason: "conversion" });
    }
    const checked = yield* inspect(plan.source);
    if (
      checked.converted !== plan.converted ||
      !(yield* inspect(plan.converted)).safe
    ) {
      return yield* new T.QuillError({ reason: "conversion" });
    }
    const previous = session.body;
    session.body = {
      ...previous,
      source: plan.converted,
      copies: [
        ...previous.copies,
        { source: previous.source, at: resources.now() },
      ],
    };
    session.state = "dirty";
    // Save the recovery copy and converted text together before enabling visual edits.
    const result = yield* Effect.result(save());
    if (result._tag === "Failure") {
      const latest = session.body.source;
      session.body = {
        ...previous,
        source: latest === plan.converted ? previous.source : latest,
      };
      session.state = "failed";
      return yield* result.failure;
    }
    if (session.body.source !== plan.converted) {
      mode = "source";
      remember();
      return yield* new T.QuillError({ reason: "conversion" });
    }
    session.undo = [];
    session.redo = [];
    mode = "visual";
    remember();
  });
  const recovery = Effect.fn("Quill.recovery")(function* (
    kind: "original" | number
  ): Effect.fn.Return<T.Output, T.QuillError> {
    const session = active();
    if (!session) {
      return yield* invalid();
    }
    const name =
      (yield* list()).find((entry) => entry.id === session.body.id)?.name ??
      "document.md";
    const bytes =
      kind === "original"
        ? session.body.original && Uint8Array.from(session.body.original)
        : session.body.copies[kind] &&
          new TextEncoder().encode(session.body.copies[kind].source);
    if (!bytes) {
      return yield* invalid();
    }
    return { name, bytes, mime: "text/markdown;charset=utf-8" };
  });
  const exportDocument = Effect.fn("Quill.exportDocument")(function* () {
    const session = active();
    if (!session) {
      return yield* invalid();
    }
    const body = yield* Effect.try({
      try: () => structuredClone(session.body),
      catch: resourceFailure,
    });
    const name =
      (yield* list()).find((entry) => entry.id === body.id)?.name ??
      "document.md";
    return {
      name: /\.(?:md|markdown)$/iu.test(name) ? name : `${name}.md`,
      bytes:
        body.source === body.originalSource && body.original
          ? Uint8Array.from(body.original)
          : new TextEncoder().encode(body.source),
      mime: "text/markdown;charset=utf-8",
    };
  });
  const archive = Effect.fn("Quill.archive")(function* (
    folder: string | null,
    backup: boolean
  ) {
    if (backup && folder) {
      return yield* invalid();
    }
    const drafts = yield* Effect.try({
      try: () =>
        new Map(
          [...sessions].map(([id, session]) => [
            id,
            structuredClone(session.body),
          ])
        ),
      catch: resourceFailure,
    });
    const entries = yield* list();
    if (unreadable) {
      return yield* new T.QuillError({ reason: "unreadable" });
    }
    const scope = folder ? subtree(entries, folder) : entries;
    const included = backup ? scope : scope.filter((entry) => !entry.trash);
    const stored = yield* Schema.decodeUnknownEffect(Schema.Array(T.Body))(
      yield* storage.snapshot(included)
    ).pipe(Effect.mapError(unreadableFailure));
    const bodies = stored.map((body) => {
      const draft = drafts.get(body.id);
      if (!draft) {
        return body;
      }
      const copies =
        draft.revision !== body.revision && draft.source !== body.source
          ? [...draft.copies, { source: body.source, at: resources.now() }]
          : draft.copies;
      return { ...draft, revision: body.revision, copies };
    });
    const writer = yield* Effect.tryPromise({
      try: () => loadLibrary("fflate", () => import("./quill.archive")),
      catch: unavailable,
    });
    return yield* writer.writeArchive(included, bodies, backup);
  });
  const restoreBackup = Effect.fn("Quill.restoreBackup")(function* (
    bytes: Uint8Array
  ) {
    const reader = yield* Effect.tryPromise({
      try: () => loadLibrary("fflate", () => import("./quill.archive")),
      catch: unavailable,
    });
    const records = yield* reader.readBackup(bytes);
    const current = yield* list();
    const root: T.Entry = {
      version: 1,
      id: resources.id(),
      name: uniqueName(current, {
        name: "Restored Library",
        kind: "folder",
        parent: null,
      }),
      kind: "folder",
      parent: null,
      revision: 0,
      trash: null,
    };
    const ids = new Map(records.map(({ entry }) => [entry.id, resources.id()]));
    const entries: T.Entry[] = [root];
    const bodies: T.Body[] = [];
    for (const { entry, body } of records) {
      const id = ids.get(entry.id);
      if (!id) {
        return yield* invalid();
      }
      const parent = entry.parent
        ? (ids.get(entry.parent) ?? root.id)
        : root.id;
      const next = {
        ...entry,
        id,
        parent,
        revision: 0,
        trash: entry.trash ? (ids.get(entry.trash) ?? null) : null,
      };
      entries.push(next);
      if (body) {
        bodies.push({ ...body, id, revision: 0 });
      }
    }
    yield* storage.commit({
      expected: entries.map((entry) => ({ id: entry.id, revision: null })),
      entries,
      bodies,
      remove: [],
    });
    return root;
  });
  const followLink = Effect.fn("Quill.followLink")(function* (href: string) {
    const entries = yield* list();
    const entry = entries.find((item) => item.id === selected);
    if (!entry || /^(?:[a-z]+:|\/)/iu.test(href)) {
      return yield* invalid();
    }
    const byId = new Map(entries.map((item) => [item.id, item]));
    const pathOf = (item: T.Entry): string[] => {
      const parts = [item.name];
      let { parent } = item;
      const seen = new Set<string>();
      while (parent && !seen.has(parent)) {
        seen.add(parent);
        const folder = byId.get(parent);
        if (!folder) {
          break;
        }
        parts.unshift(folder.name);
        ({ parent } = folder);
      }
      return parts;
    };
    const path = pathOf(entry).slice(0, -1);
    const decoded = yield* Effect.try({
      try: () => decodeURIComponent(href.split(/[?#]/u)[0] ?? ""),
      catch: invalid,
    });
    for (const part of decoded.split("/")) {
      if (part === "..") {
        path.pop();
      } else if (part && part !== ".") {
        path.push(part);
      }
    }
    const target = entries.find(
      (item) =>
        item.kind === "document" &&
        !item.trash &&
        pathOf(item).join("/") === path.join("/")
    );
    if (!target) {
      return yield* invalid();
    }
    yield* open(target.id);
  });
  const render = Effect.fn("Quill.render")(function* (source: string) {
    const adapter = yield* Effect.tryPromise({
      try: () => loadLibrary("Tiptap", () => import("./quill.markdown")),
      catch: unavailable,
    });
    const model = adapter.preview(source);
    const renderer = yield* Effect.tryPromise({
      try: () =>
        loadLibrary("Markdown renderer", () => import("./quill.render")),
      catch: unavailable,
    });
    return yield* renderer.prepareRender(model, figure);
  });
  return {
    initialize,
    close: Effect.fn("Quill.close")(function* () {
      yield* flush();
      selected = null;
      remember();
    }),
    flush,
    create,
    open,
    save,
    edit,
    history,
    view,
    rename,
    move,
    trash,
    restore,
    remove,
    restoreAll,
    removeAll,
    followLink,
    render,
    saveAsNew: Effect.fn("Quill.saveAsNew")(function* () {
      const session = active();
      const entry = (yield* list()).find((item) => item.id === selected);
      if (!session || !entry) {
        return yield* invalid();
      }
      const copy = yield* create(
        "document",
        entry.name,
        entry.parent,
        session.body
      );
      const body = yield* read(copy.id);
      sessions.set(copy.id, {
        body,
        saved: body.source,
        state: "saved",
        undo: [],
        redo: [],
      });
      // The local text is committed under a new ID. Reopening the original must
      // read its current stored text instead of an old cached revision.
      sessions.delete(entry.id);
      selected = copy.id;
      remember();
    }),
    archive,
    restoreBackup,
    importFiles,
    planConversion,
    convert,
    recovery,
    exportDocument,
    setMode: Effect.fn("Quill.setMode")(function* (next: T.Mode) {
      const session = active();
      const source = session?.body.source;
      if (
        next === "visual" &&
        session &&
        (!(yield* inspect(source ?? "")).safe ||
          session.body.source !== source ||
          active() !== session)
      ) {
        return yield* new T.QuillError({ reason: "conversion" });
      }
      mode = next;
      remember();
    }),
    duplicate: Effect.fn("Quill.duplicate")(function* (id: string) {
      const entry = (yield* list()).find(
        (item) => item.id === id && item.kind === "document" && !item.trash
      );
      if (!entry) {
        return yield* invalid();
      }
      return yield* create(
        "document",
        entry.name,
        entry.parent,
        sessions.get(id)?.body ?? (yield* read(id))
      );
    }),
    recover: storage.recover,
  };
};
export class Quill extends Context.Service<
  Quill,
  ReturnType<typeof makeQuill>
>()("@ritools/web/Quill") {}
export const quillLayer = (storage: Storage, resources?: Resources) =>
  Layer.sync(Quill, () => makeQuill(storage, resources));
