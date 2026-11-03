/* oxlint-disable eslint/complexity, eslint/default-case -- The command switch exhaustively dispatches the application operation union. */
import { Effect, Semaphore } from "effect";
import { Atom } from "effect/reactivity";

import * as T from "./quill";
import { browserResources, indexedDbStorage } from "./quill.indexed-db";
import { Quill, quillLayer } from "./quill.service";

const emptyView: T.View = {
  entries: [],
  document: null,
  save: "saved",
  mode: "source",
  canUndo: false,
  canRedo: false,
  persistence: null,
  unreadable: 0,
};
export type Command =
  | { readonly type: "initialize" | "refresh" | "save" | "save-copy" | "close" }
  | {
      readonly type: "create";
      readonly kind: T.Entry["kind"];
      readonly name: string;
      readonly parent: string | null;
    }
  | {
      readonly type: "open" | "trash" | "restore" | "duplicate";
      readonly id: string;
    }
  | { readonly type: "follow"; readonly href: string }
  | { readonly type: "restore-all" }
  | { readonly type: "remove-all"; readonly confirmed: boolean }
  | {
      readonly type: "remove";
      readonly id: string;
      readonly confirmed: boolean;
    }
  | { readonly type: "rename"; readonly id: string; readonly name: string }
  | {
      readonly type: "move";
      readonly id: string;
      readonly parent: string | null;
    }
  | { readonly type: "edit"; readonly source: string; readonly id: string }
  | { readonly type: "mode"; readonly mode: T.Mode }
  | { readonly type: "history"; readonly direction: "undo" | "redo" }
  | {
      readonly type: "import";
      readonly files: readonly File[];
      readonly parent: string | null;
    }
  | { readonly type: "restore-backup"; readonly file: File }
  | {
      readonly type: "convert";
      readonly plan: T.Compatibility & {
        readonly id: string;
        readonly source: string;
      };
    };
export const makeQuillAtoms = (
  layer = quillLayer(indexedDbStorage(), browserResources)
) => {
  const runtime = Atom.runtime(layer).pipe(Atom.keepAlive);
  const view = Atom.make(emptyView).pipe(Atom.keepAlive);
  const failure = Atom.make<T.QuillError["reason"] | null>(null).pipe(
    Atom.keepAlive
  );
  const imports = Atom.make<
    readonly {
      readonly path: string;
      readonly reason: T.QuillError["reason"];
    }[]
  >([]);
  const busy = Atom.make(true);
  // The page shows the busy state only after a delay, so a second press can come
  // before the first command ends. Run these commands one at a time, in press order,
  // and keep `busy` true until the last queued command ends.
  const queue = Semaphore.makeUnsafe(1);
  let pending = 0;
  const queued = <A, E, R>(
    effect: Effect.Effect<A, E, R>,
    get: Atom.FnContext
  ) =>
    Effect.suspend(() => {
      pending += 1;
      get.set(busy, true);
      return effect.pipe(
        queue.withPermit,
        Effect.ensuring(
          Effect.sync(() => {
            pending -= 1;
            if (pending === 0) {
              get.set(busy, false);
            }
          })
        )
      );
    });
  const apply = Effect.fn("Quill.Atoms.apply")(function* (
    input: Command,
    get: Atom.FnContext
  ) {
    const service = yield* Quill;
    let createdId: string | null = null;
    get.set(failure, null);
    if (input.type === "save" && get(view).save !== "saved") {
      get.set(view, { ...get(view), save: "saving" });
    }
    const result = yield* Effect.result(
      Effect.gen(function* () {
        switch (input.type) {
          case "initialize": {
            yield* service.initialize();
            break;
          }
          case "close": {
            yield* service.close();
            break;
          }
          case "refresh": {
            break;
          }
          case "follow": {
            yield* service.followLink(input.href);
            break;
          }
          case "save": {
            yield* service.flush();
            break;
          }
          case "save-copy": {
            yield* service.saveAsNew();
            break;
          }
          case "create": {
            const entry = yield* service.create(
              input.kind,
              input.name,
              input.parent
            );
            createdId = entry.id;
            if (entry.kind === "document") {
              yield* service.open(entry.id);
            }
            break;
          }
          case "open": {
            yield* service.open(input.id);
            break;
          }
          case "edit": {
            const current = get(view);
            if (
              current.document &&
              current.document.id === input.id &&
              current.document.source !== input.source
            ) {
              get.set(view, {
                ...current,
                document: { ...current.document, source: input.source },
                save: "dirty",
              });
            }
            yield* service.edit(input.source, input.id);
            break;
          }
          case "mode": {
            yield* service.setMode(input.mode);
            break;
          }
          case "history": {
            yield* service.history(input.direction);
            break;
          }
          case "rename": {
            yield* service.rename(input.id, input.name);
            break;
          }
          case "move": {
            yield* service.move(input.id, input.parent);
            break;
          }
          case "trash": {
            yield* service.trash(input.id);
            break;
          }
          case "restore": {
            yield* service.restore(input.id);
            break;
          }
          case "remove": {
            yield* service.remove(input.id, input.confirmed);
            break;
          }
          case "restore-all": {
            yield* service.restoreAll();
            break;
          }
          case "remove-all": {
            yield* service.removeAll(input.confirmed);
            break;
          }
          case "duplicate": {
            const entry = yield* service.duplicate(input.id);
            yield* service.open(entry.id);
            break;
          }
          case "import": {
            const files: T.FileInput[] = [];
            const failed: { path: string; reason: T.QuillError["reason"] }[] =
              [];
            for (const file of input.files) {
              const read = yield* Effect.result(
                Effect.tryPromise({
                  try: async () => ({
                    path: file.webkitRelativePath || file.name,
                    bytes: new Uint8Array(await file.arrayBuffer()),
                  }),
                  catch: () => new T.QuillError({ reason: "unreadable" }),
                })
              );
              if (read._tag === "Success") {
                files.push(read.success);
              } else {
                failed.push({ path: file.name, reason: "unreadable" });
              }
            }
            const report = yield* service.importFiles(files, input.parent);
            get.set(imports, [...failed, ...report.failures]);
            if (report.documents[0]) {
              yield* service.open(report.documents[0].id);
            }
            break;
          }
          case "restore-backup": {
            const bytes = yield* Effect.tryPromise({
              try: async () => new Uint8Array(await input.file.arrayBuffer()),
              catch: () => new T.QuillError({ reason: "unreadable" }),
            });
            yield* service.restoreBackup(bytes);
            break;
          }
          case "convert": {
            yield* service.convert(input.plan, true);
            break;
          }
        }
      })
    );
    if (result._tag === "Failure") {
      get.set(failure, result.failure.reason);
    }
    const next = yield* Effect.result(service.view());
    if (next._tag === "Success") {
      get.set(view, next.success);
    } else {
      get.set(failure, next.failure.reason);
    }
    return result._tag === "Success" ? (createdId ?? true) : false;
  });
  const command = runtime.fn(
    Effect.fn("Quill.Atoms.command")(function* (input: Command, get) {
      return yield* input.type === "edit"
        ? apply(input, get)
        : queued(apply(input, get), get);
    }),
    { concurrent: true }
  );
  const output = runtime.fn(
    Effect.fn("Quill.Atoms.output")(function* (
      input:
        | { readonly markdown: true }
        | {
            readonly archive: true;
            readonly folder: string | null;
            readonly backup: boolean;
          }
        | { readonly recovery: "original" | number }
        | { readonly raw: true },
      get
    ) {
      get.set(failure, null);
      const service = yield* Quill;
      const result = yield* queued(
        Effect.result(
          "markdown" in input
            ? service.exportDocument()
            : "archive" in input
              ? service.archive(input.folder, input.backup)
              : "recovery" in input
                ? service.recovery(input.recovery)
                : service.recover().pipe(
                    Effect.map((bytes): T.Output => ({
                      name: "quill-storage-recovery.json",
                      bytes,
                      mime: "application/json",
                    }))
                  )
        ),
        get
      );
      if (result._tag === "Failure") {
        get.set(failure, result.failure.reason);
        return null;
      }
      return result.success;
    }),
    { concurrent: true }
  );
  const conversion = runtime.fn(
    Effect.fn("Quill.Atoms.conversion")(function* (_: null, get) {
      const result = yield* Effect.result((yield* Quill).planConversion());
      if (result._tag === "Failure") {
        get.set(failure, result.failure.reason);
        return null;
      }
      return result.success;
    })
  );
  const rendered = runtime.fn(
    Effect.fn("Quill.Atoms.render")(function* (source: string, get) {
      const result = yield* Effect.result((yield* Quill).render(source));
      if (result._tag === "Failure") {
        get.set(failure, result.failure.reason);
        return null;
      }
      return result.success;
    })
  );
  return {
    runtime,
    view,
    failure,
    imports,
    busy,
    command,
    output,
    conversion,
    rendered,
  };
};
export const quillAtoms = makeQuillAtoms();
