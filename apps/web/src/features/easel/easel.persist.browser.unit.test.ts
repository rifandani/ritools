/* oxlint-disable promise/avoid-new, unicorn/prefer-add-event-listener -- Fake IndexedDB reports completion through DOM events. */
import { IDBFactory } from "fake-indexeddb";
import { describe, expect, it } from "vitest";

import {
  assetFileName,
  recordOf,
  SOURCE_FILE,
} from "@/features/easel/easel.persist";
import { indexedDbEaselStorage } from "@/features/easel/easel.persist.browser";
import type { TabWrite } from "@/features/easel/easel.persist.browser";
import {
  applyChange,
  EMPTY_STACK,
  ORIGINAL,
} from "@/features/easel/easel.stack";

const writeOf = (id: string, assetIds: readonly string[] = []): TabWrite => ({
  files: [
    { blob: new Blob([`source-${id}`]), name: SOURCE_FILE },
    ...assetIds.map((assetId) => ({
      blob: new Blob([`asset-${assetId}`]),
      name: assetFileName(assetId),
    })),
  ],
  record: recordOf(
    {
      byteSize: 10,
      exported: ORIGINAL,
      format: "png",
      id,
      name: `${id}.png`,
      quality: 85,
      source: { height: 30, width: 40 },
      stack: applyChange(EMPTY_STACK, { _tag: "Rotate", direction: "right" }),
    },
    assetIds
  ),
});

const textOf = (blob: Blob): Promise<string> => blob.text();

const fresh = (name = "easel-test") =>
  indexedDbEaselStorage(() => new IDBFactory(), name);

describe("indexedDbEaselStorage", () => {
  it("loads nothing from a new database", async () => {
    const loaded = await fresh().load();
    expect(loaded).toEqual({ active: null, tabs: [] });
  });

  it("loads the File Tabs in the saved order with their files", async () => {
    const storage = fresh();
    await storage.commit({
      put: [writeOf("a", ["pic"]), writeOf("b")],
      remove: [],
      session: { active: "b", order: ["b", "a"] },
    });
    const loaded = await storage.load();
    expect(loaded.active).toBe("b");
    expect(loaded.tabs.map((tab) => tab.record.id)).toEqual(["b", "a"]);
    const [, first] = loaded.tabs;
    expect(first?.record.stack.present.rotate).toBe(1);
    expect(await textOf(first?.source ?? new Blob())).toBe("source-a");
    expect(await textOf(first?.assets.get("pic") ?? new Blob())).toBe(
      "asset-pic"
    );
  });

  it("writes a record again without its files", async () => {
    const storage = fresh();
    await storage.commit({ put: [writeOf("a")], remove: [], session: null });
    const { record } = writeOf("a");
    await storage.commit({
      put: [{ files: [], record: { ...record, name: "new.png" } }],
      remove: [],
      session: null,
    });
    const loaded = await storage.load();
    const [tab] = loaded.tabs;
    expect(tab?.record.name).toBe("new.png");
    expect(await textOf(tab?.source ?? new Blob())).toBe("source-a");
  });

  it("deletes a File Tab with its files, and leaves another one", async () => {
    const storage = fresh();
    await storage.commit({
      put: [writeOf("a", ["pic"]), writeOf("ab")],
      remove: [],
      session: { active: "a", order: ["a", "ab"] },
    });
    await storage.commit({ put: [], remove: ["a"], session: null });
    const loaded = await storage.load();
    expect(loaded.tabs.map((tab) => tab.record.id)).toEqual(["ab"]);
    expect(await textOf(loaded.tabs[0]?.source ?? new Blob())).toBe(
      "source-ab"
    );
  });

  it("skips a record that has no source file, and a damaged record", async () => {
    const factory = new IDBFactory();
    const storage = indexedDbEaselStorage(() => factory, "easel-damaged");
    await storage.commit({
      put: [writeOf("kept")],
      remove: [],
      session: null,
    });
    await new Promise<void>((resolve, reject) => {
      const opening = factory.open("easel-damaged", 1);
      opening.onsuccess = () => {
        const tx = opening.result.transaction("tabs", "readwrite");
        // A record with no files, and a record of the wrong shape.
        tx.objectStore("tabs").put({ ...writeOf("orphan").record });
        tx.objectStore("tabs").put({ id: "broken", version: 1 });
        tx.oncomplete = () => {
          resolve();
        };
        tx.onerror = () => {
          reject(tx.error);
        };
      };
    });
    const loaded = await storage.load();
    expect(loaded.tabs.map((tab) => tab.record.id)).toEqual(["kept"]);
  });
});
