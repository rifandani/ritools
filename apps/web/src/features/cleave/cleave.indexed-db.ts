/* oxlint-disable promise/avoid-new, unicorn/prefer-add-event-listener -- IndexedDB uses transaction callbacks. */
import { Effect, Schema } from "effect";

import { CleaveStorageError, ComparisonFile, emptyFiles } from "./cleave.files";
import type { Files } from "./cleave.files";

const Preferences = Schema.Struct({
  selected: Schema.NullOr(Schema.String),
  order: Schema.Array(Schema.String),
  nextNumber: Schema.Int.check(Schema.isGreaterThan(0)),
});
export interface FileStorage {
  readonly load: () => Effect.Effect<Files, CleaveStorageError>;
  readonly save: (
    previous: Files,
    next: Files
  ) => Effect.Effect<void, CleaveStorageError>;
}

export const indexedDbFiles = (
  factory: () => IDBFactory = () => indexedDB,
  name = "ritools-cleave"
): FileStorage => {
  let database: Promise<IDBDatabase> | null = null;
  const open = () => {
    database ??= new Promise<IDBDatabase>((resolve, reject) => {
      const request = factory().open(name, 1);
      request.onupgradeneeded = () => {
        request.result.createObjectStore("files", { keyPath: "id" });
        request.result.createObjectStore("preferences");
      };
      request.onerror = () => {
        database = null;
        reject(request.error);
      };
      request.onblocked = () => {
        database = null;
        reject(new Error("Database blocked"));
      };
      request.onsuccess = () => {
        const db = request.result;
        db.onversionchange = () => {
          db.close();
          database = null;
        };
        resolve(db);
      };
    });
    return database;
  };
  const transact = <A>(
    mode: IDBTransactionMode,
    run: (tx: IDBTransaction, done: (value: A) => void) => void
  ) =>
    Effect.tryPromise({
      try: async () => {
        const db = await open();
        return new Promise<A>((resolve, reject) => {
          const tx = db.transaction(["files", "preferences"], mode);
          let value: A;
          tx.oncomplete = () => resolve(value);
          tx.onabort = () => reject(tx.error);
          tx.onerror = () => reject(tx.error);
          try {
            run(tx, (next) => {
              value = next;
            });
          } catch (error) {
            tx.abort();
            reject(error);
          }
        });
      },
      catch: () => {
        database = null;
        return new CleaveStorageError({
          reason: mode === "readonly" ? "read" : "write",
        });
      },
    });
  return {
    load: () =>
      transact<Files>("readonly", (tx, done) => {
        const records = tx.objectStore("files").getAll();
        const preferences = tx.objectStore("preferences").get("current");
        preferences.onsuccess = () => {
          try {
            const entries = Schema.decodeUnknownSync(
              Schema.Array(ComparisonFile)
            )(records.result);
            if (!entries.length && preferences.result === undefined) {
              done(emptyFiles);
              return;
            }
            const saved = Schema.decodeUnknownSync(Preferences)(
              preferences.result
            );
            const byId = new Map(entries.map((entry) => [entry.id, entry]));
            if (
              saved.order.length !== entries.length ||
              new Set(saved.order).size !== entries.length ||
              saved.order.some((id) => !byId.has(id))
            ) {
              tx.abort();
              return;
            }
            const ordered = saved.order.flatMap((id) => byId.get(id) ?? []);
            done({
              entries: ordered,
              selected: byId.has(saved.selected ?? "")
                ? saved.selected
                : (ordered[0]?.id ?? null),
              nextNumber: Math.max(
                saved.nextNumber,
                ...entries.map((entry) => entry.number + 1)
              ),
            });
          } catch {
            tx.abort();
          }
        };
      }),
    save: (previous, next) =>
      // oxlint-disable-next-line typescript/no-invalid-void-type -- A committed transaction has no payload.
      transact<void>("readwrite", (tx, done) => {
        const files = tx.objectStore("files");
        const old = new Map(previous.entries.map((entry) => [entry.id, entry]));
        const ids = new Set(next.entries.map((entry) => entry.id));
        for (const entry of next.entries) {
          if (old.get(entry.id) !== entry) {
            files.put(entry);
          }
        }
        for (const entry of previous.entries) {
          if (!ids.has(entry.id)) {
            files.delete(entry.id);
          }
        }
        tx.objectStore("preferences").put(
          {
            selected: next.selected,
            order: [...ids],
            nextNumber: next.nextNumber,
          },
          "current"
        );
        done();
      }),
  };
};
