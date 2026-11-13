/* oxlint-disable promise/avoid-new, unicorn/prefer-add-event-listener -- IndexedDB is a callback-only API; each transaction owns its handlers. */
import {
  EMPTY_SESSION,
  isSessionRecord,
  isTabRecord,
  orderOf,
  SOURCE_FILE,
  assetFileName,
} from "@/features/easel/easel.persist";
import type { SessionRecord, TabRecord } from "@/features/easel/easel.persist";

/**
 * The IndexedDB side of the saved File Tabs. The database has three stores:
 * `tabs` (one `TabRecord` each), `files` (the original image and each added
 * picture, keyed by File Tab and name), and `session` (the order and the
 * active File Tab). One `commit` is one transaction, so a File Tab never has
 * a record without its files.
 */

export interface TabFile {
  readonly blob: Blob;
  readonly name: string;
}

export interface TabWrite {
  readonly files: readonly TabFile[];
  readonly record: TabRecord;
}

export interface Commit {
  readonly put: readonly TabWrite[];
  /** The ids of the File Tabs to delete, with their files. */
  readonly remove: readonly string[];
  readonly session: SessionRecord | null;
}

export interface SavedTab {
  readonly assets: ReadonlyMap<string, Blob>;
  readonly record: TabRecord;
  readonly source: Blob;
}

export interface SavedSession {
  readonly active: string | null;
  /** The File Tabs in the saved order. */
  readonly tabs: readonly SavedTab[];
}

export interface EaselStorage {
  readonly commit: (commit: Commit) => Promise<void>;
  readonly load: () => Promise<SavedSession>;
}

interface FileRow {
  readonly blob: Blob;
  readonly name: string;
  readonly tabId: string;
}

const isFileRow = (value: unknown): value is FileRow =>
  typeof value === "object" &&
  value !== null &&
  "blob" in value &&
  value.blob instanceof Blob &&
  "name" in value &&
  typeof value.name === "string" &&
  "tabId" in value &&
  typeof value.tabId === "string";

const request = <A>(source: IDBRequest<A>): Promise<A> =>
  new Promise((resolve, reject) => {
    source.onsuccess = () => {
      resolve(source.result);
    };
    source.onerror = () => {
      reject(source.error);
    };
  });

export const indexedDbEaselStorage = (
  factory: () => IDBFactory = () => indexedDB,
  name = "ritools-easel"
): EaselStorage => {
  let database: Promise<IDBDatabase> | null = null;
  const open = () => {
    database ??= new Promise<IDBDatabase>((resolve, reject) => {
      const opening = factory().open(name, 1);
      opening.onupgradeneeded = () => {
        opening.result.createObjectStore("tabs", { keyPath: "id" });
        opening.result
          .createObjectStore("files", { keyPath: ["tabId", "name"] })
          .createIndex("byTab", "tabId");
        opening.result.createObjectStore("session");
      };
      opening.onerror = () => {
        database = null;
        reject(opening.error);
      };
      opening.onsuccess = () => {
        const db = opening.result;
        db.onversionchange = () => {
          db.close();
          database = null;
        };
        resolve(db);
      };
    });
    return database;
  };

  const transact = async <A>(
    mode: IDBTransactionMode,
    run: (tx: IDBTransaction) => Promise<A>
  ): Promise<A> => {
    const db = await open();
    const tx = db.transaction(["tabs", "files", "session"], mode);
    // A transaction ends by completing or by aborting. A failed request
    // aborts it, so `onabort` also reports the failures of requests.
    const ended = new Promise<Error | null>((resolve) => {
      tx.oncomplete = () => {
        resolve(null);
      };
      tx.onabort = () => {
        resolve(tx.error ?? new Error("the transaction was aborted"));
      };
    });
    let value: A;
    try {
      value = await run(tx);
    } catch (error) {
      database = null;
      try {
        tx.abort();
      } catch {
        /* The transaction has already finished. */
      }
      throw error;
    }
    const failure = await ended;
    if (failure !== null) {
      database = null;
      throw failure;
    }
    return value;
  };

  return {
    commit: ({ put, remove, session }) =>
      transact("readwrite", (tx) => {
        const tabs = tx.objectStore("tabs");
        const files = tx.objectStore("files");
        for (const { files: written, record } of put) {
          tabs.put(record);
          for (const file of written) {
            files.put({ blob: file.blob, name: file.name, tabId: record.id });
          }
        }
        for (const id of remove) {
          tabs.delete(id);
          const cursor = files.index("byTab").openKeyCursor(id);
          cursor.onsuccess = () => {
            const found = cursor.result;
            if (found !== null) {
              files.delete(found.primaryKey);
              found.continue();
            }
          };
        }
        if (session !== null) {
          tx.objectStore("session").put(session, "current");
        }
        return Promise.resolve();
      }),
    load: () =>
      transact("readonly", async (tx) => {
        const [records, rows, session] = await Promise.all([
          request<unknown[]>(tx.objectStore("tabs").getAll()),
          request<unknown[]>(tx.objectStore("files").getAll()),
          request<unknown>(tx.objectStore("session").get("current")),
        ]);
        const saved = isSessionRecord(session) ? session : EMPTY_SESSION;
        // The keys come from stored data, so the lookups use Maps.
        const filesOf = new Map<string, Map<string, Blob>>();
        for (const row of rows) {
          if (isFileRow(row)) {
            const group = filesOf.get(row.tabId) ?? new Map<string, Blob>();
            group.set(row.name, row.blob);
            filesOf.set(row.tabId, group);
          }
        }
        const byId = new Map<string, SavedTab>();
        for (const value of records) {
          if (!isTabRecord(value)) {
            continue;
          }
          const group = filesOf.get(value.id);
          const source = group?.get(SOURCE_FILE);
          if (group === undefined || source === undefined) {
            continue;
          }
          const assets = new Map<string, Blob>();
          for (const assetId of value.assetIds) {
            const blob = group.get(assetFileName(assetId));
            if (blob !== undefined) {
              assets.set(assetId, blob);
            }
          }
          byId.set(value.id, { assets, record: value, source });
        }
        return {
          active: saved.active,
          tabs: orderOf([...byId.keys()], saved).flatMap(
            (id) => byId.get(id) ?? []
          ),
        };
      }),
  };
};

let shared: EaselStorage | null = null;

/** The one storage of the page. It opens the database on first use. */
export const easelStorage = (): EaselStorage => {
  shared ??= indexedDbEaselStorage();
  return shared;
};
