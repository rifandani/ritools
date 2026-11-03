/* oxlint-disable promise/avoid-new, unicorn/prefer-add-event-listener -- IndexedDB is a callback-only adapter; each transaction owns its handlers. */
/* oxlint-disable eslint/complexity -- Transaction validation covers revision, parent, cycle, and name constraints atomically. */
import { Effect, Schema } from "effect";

import { Body, Entry, QuillError } from "./quill";
import type { Mutation } from "./quill";
import type { Resources, Storage } from "./quill.storage";

const storageError = (reason: QuillError["reason"]) =>
  new QuillError({ reason });
// A transaction resolves only from oncomplete, including readonly transactions.
const transact = <A>(
  db: IDBDatabase,
  mode: IDBTransactionMode,
  run: (
    tx: IDBTransaction,
    complete: (value: A) => void,
    refuse: (failure: QuillError) => void
  ) => void
) =>
  new Promise<A>((resolve, reject) => {
    const tx = db.transaction(["entries", "bodies"], mode);
    let value: A;
    let failure: QuillError | null = null;
    tx.oncomplete = () => resolve(value);
    tx.onabort = () =>
      reject(
        failure ??
          storageError(
            tx.error?.name === "QuotaExceededError" ? "resource" : "storage"
          )
      );
    tx.onerror = () => {
      failure ??= storageError(
        tx.error?.name === "QuotaExceededError" ? "resource" : "storage"
      );
    };
    try {
      run(
        tx,
        (next) => {
          value = next;
        },
        (next) => {
          failure = next;
          tx.abort();
        }
      );
    } catch {
      failure = storageError("storage");
      tx.abort();
    }
  });
const validate = (rows: readonly unknown[], mutation: Mutation) => {
  const catalog = new Map<string, Entry>();
  for (const raw of rows) {
    const result = Schema.decodeUnknownExit(Entry)(raw);
    if (result._tag === "Success") {
      catalog.set(result.value.id, result.value);
    }
  }
  for (const guard of mutation.expected) {
    if ((catalog.get(guard.id)?.revision ?? null) !== guard.revision) {
      throw storageError("conflict");
    }
  }
  for (const id of mutation.remove) {
    catalog.delete(id);
  }
  for (const entry of mutation.entries) {
    catalog.set(entry.id, entry);
  }
  for (const entry of mutation.entries) {
    if (entry.trash) {
      continue;
    }
    if (
      entry.parent &&
      (catalog.get(entry.parent)?.kind !== "folder" ||
        catalog.get(entry.parent)?.trash)
    ) {
      throw storageError("conflict");
    }
    const visited = new Set([entry.id]);
    let { parent } = entry;
    while (parent) {
      if (visited.has(parent)) {
        throw storageError("invalid");
      }
      visited.add(parent);
      parent = catalog.get(parent)?.parent ?? null;
    }
    if (
      [...catalog.values()].some(
        (other) =>
          other.id !== entry.id &&
          !other.trash &&
          other.parent === entry.parent &&
          other.name.toLowerCase() === entry.name.toLowerCase()
      )
    ) {
      throw storageError("conflict");
    }
  }
};

const io = <A>(operation: () => Promise<A>) =>
  Effect.tryPromise({
    try: operation,
    catch: (cause) =>
      Schema.is(QuillError)(cause) ? cause : storageError("storage"),
  });
export const indexedDbStorage = (
  factory: () => IDBFactory = () => indexedDB,
  name = "ritools-quill"
): Storage => {
  let database: Promise<IDBDatabase> | null = null;
  const open = () => {
    database ??= new Promise<IDBDatabase>((resolve, reject) => {
      let request: IDBOpenDBRequest;
      try {
        request = factory().open(name, 1);
      } catch {
        reject(storageError("storage"));
        return;
      }
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains("entries")) {
          db.createObjectStore("entries", { keyPath: "id" });
        }
        if (!db.objectStoreNames.contains("bodies")) {
          db.createObjectStore("bodies", { keyPath: "id" });
        }
      };
      request.onblocked = () => {
        database = null;
        reject(storageError("migration"));
      };
      request.onerror = () => {
        database = null;
        reject(
          storageError(
            request.error?.name === "VersionError" ? "migration" : "storage"
          )
        );
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
  return {
    list: () =>
      io(async () =>
        transact<readonly unknown[]>(await open(), "readonly", (tx, done) => {
          const request = tx.objectStore("entries").getAll();
          request.onsuccess = () => done(request.result);
        })
      ),
    snapshot: (expected) =>
      io(async () =>
        transact<readonly unknown[]>(
          await open(),
          "readonly",
          (tx, done, refuse) => {
            const request = tx.objectStore("entries").getAll();
            request.onsuccess = () => {
              try {
                validate(request.result, {
                  expected: expected.map((entry) => ({
                    id: entry.id,
                    revision: entry.revision,
                  })),
                  entries: [],
                  bodies: [],
                  remove: [],
                });
              } catch {
                refuse(storageError("conflict"));
                return;
              }
              const records: unknown[] = [];
              const documents = expected.filter(
                (entry) => entry.kind === "document"
              );
              if (!documents.length) {
                done(records);
                return;
              }
              for (const entry of documents) {
                const body = tx.objectStore("bodies").get(entry.id);
                body.onsuccess = () => {
                  records.push(body.result);
                  if (records.length === documents.length) {
                    done(records);
                  }
                };
              }
            };
          }
        )
      ),
    read: (id) =>
      io(async () =>
        transact<unknown>(await open(), "readonly", (tx, done) => {
          const request = tx.objectStore("bodies").get(id);
          request.onsuccess = () => done(request.result);
        })
      ),
    commit: (mutation) =>
      io(async () =>
        // oxlint-disable-next-line typescript/no-invalid-void-type -- A committed write has no payload.
        transact<void>(await open(), "readwrite", (tx, done, refuse) => {
          const entries = tx.objectStore("entries");
          const bodies = tx.objectStore("bodies");
          const request = entries.getAll();
          request.onsuccess = () => {
            try {
              validate(request.result, mutation);
              for (const entry of mutation.entries) {
                if (!Schema.is(Entry)(entry)) {
                  throw storageError("invalid");
                }
                entries.put(entry);
              }
              for (const body of mutation.bodies) {
                if (!Schema.is(Body)(body)) {
                  throw storageError("invalid");
                }
                bodies.put(body);
              }
              for (const id of mutation.remove) {
                entries.delete(id);
                bodies.delete(id);
              }
              done();
            } catch (error) {
              refuse(
                Schema.is(QuillError)(error) ? error : storageError("storage")
              );
            }
          };
        })
      ),
    recover: () =>
      io(
        () =>
          new Promise<Uint8Array>((resolve, reject) => {
            // Open the existing version without attempting a migration. Recovery can
            // still read a Library created by a newer app version.
            const request = factory().open(name);
            request.onupgradeneeded = () => {
              request.transaction?.abort();
            };
            request.onerror = () => reject(storageError("storage"));
            request.onsuccess = () => {
              const db = request.result;
              const names = [...db.objectStoreNames];
              const records = new Map<string, unknown[]>();
              if (!names.length) {
                db.close();
                reject(storageError("unreadable"));
                return;
              }
              const tx = db.transaction(names, "readonly");
              for (const store of names) {
                const readAll = tx.objectStore(store).getAll();
                readAll.onsuccess = () => records.set(store, readAll.result);
              }
              tx.oncomplete = () => {
                db.close();
                resolve(
                  new TextEncoder().encode(
                    JSON.stringify({
                      version: db.version,
                      stores: Object.fromEntries(records),
                    })
                  )
                );
              };
              tx.onabort = () => {
                db.close();
                reject(storageError("storage"));
              };
            };
          })
      ),
  };
};
const Preferences = Schema.Struct({
  selected: Schema.NullOr(Schema.String),
  mode: Schema.Literals(["visual", "source", "split", "read"]),
});
export const browserResources: Resources = {
  id: () => crypto.randomUUID(),
  now: () => Date.now(),
  preferences: () => {
    try {
      const preferences = Schema.decodeUnknownSync(Preferences)(
        JSON.parse(localStorage.getItem("quill-preferences-v1") ?? "null")
      );
      return preferences;
    } catch {
      return { selected: null, mode: "source" };
    }
  },
  remember: (selected, mode) => {
    try {
      localStorage.setItem(
        "quill-preferences-v1",
        JSON.stringify({ selected, mode })
      );
    } catch {
      /* Preferences are optional. Documents still use IndexedDB. */
    }
  },
  persist: () =>
    Effect.tryPromise({
      try: () =>
        navigator.storage?.persist
          ? navigator.storage.persist()
          : Promise.resolve(false),
      catch: () => storageError("storage"),
    }),
};
