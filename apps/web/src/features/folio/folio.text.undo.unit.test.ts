import { describe, expect, it, vi } from "vitest";

import { FOLIO_TEXT_UNDO_BYTES, FolioTextUndoStore } from "./folio.text.undo";
import type { FolioTextClosable } from "./folio.text.undo";

const bytesOf = (size: number, fill = 0): Uint8Array =>
  new Uint8Array(size).fill(fill);

const closable = () => {
  let listener: ((event: { readonly documentId: string }) => void) | null =
    null;
  const onClosed = vi.fn(
    (next: (event: { readonly documentId: string }) => void) => {
      listener = next;
      return () => {
        listener = null;
      };
    }
  );
  const documents: FolioTextClosable = { onClosed };
  return {
    close: (documentId: string) => listener?.({ documentId }),
    documents,
    onClosed,
  };
};

describe("FolioTextUndoStore", () => {
  it("gives the most recent snapshot back and drops it", () => {
    const store = new FolioTextUndoStore();

    store.remember("tab", bytesOf(2, 1));
    store.remember("tab", bytesOf(3, 2));

    expect(store.count("tab")).toBe(2);
    expect([...(store.take("tab") ?? [])]).toEqual([2, 2, 2]);
    expect(store.count("tab")).toBe(1);
    expect([...(store.take("tab") ?? [])]).toEqual([1, 1]);
    expect(store.take("tab")).toBeNull();
  });

  it("keeps the stacks of two tabs apart", () => {
    const store = new FolioTextUndoStore();

    store.remember("first", bytesOf(1, 7));
    store.remember("second", bytesOf(1, 9));

    expect([...(store.take("second") ?? [])]).toEqual([9]);
    expect(store.count("first")).toBe(1);
    expect(store.count("second")).toBe(0);
  });

  it("drops the oldest snapshot past the cap", () => {
    const store = new FolioTextUndoStore(10);

    store.remember("tab", bytesOf(4, 1));
    store.remember("tab", bytesOf(4, 2));
    store.remember("tab", bytesOf(4, 3));

    expect(store.count("tab")).toBe(2);
    expect([...(store.take("tab") ?? [])]).toEqual([3, 3, 3, 3]);
    expect([...(store.take("tab") ?? [])]).toEqual([2, 2, 2, 2]);
  });

  it("drops the whole stack when one snapshot is larger than the cap", () => {
    const store = new FolioTextUndoStore(4);

    store.remember("tab", bytesOf(5));

    expect(store.count("tab")).toBe(0);
    expect(store.take("tab")).toBeNull();
  });

  it("carries a tab's stack to the id that replaced it", () => {
    const store = new FolioTextUndoStore();

    store.remember("old", bytesOf(1, 5));
    store.remember("other", bytesOf(1, 6));
    store.move("old", "new");

    expect(store.count("old")).toBe(0);
    expect(store.count("new")).toBe(1);
    expect(store.count("other")).toBe(1);
    expect([...(store.take("new") ?? [])]).toEqual([5]);
  });

  it("drops the snapshots of a closed tab, and only that tab", () => {
    const store = new FolioTextUndoStore();

    store.remember("closed", bytesOf(1));
    store.remember("open", bytesOf(1));

    store.clear("closed");

    expect(store.count("closed")).toBe(0);
    expect(store.count("open")).toBe(1);
  });

  it("watches a capability once and forgets a tab when it closes", () => {
    const store = new FolioTextUndoStore();
    const { close, documents, onClosed } = closable();

    store.watch(documents);
    store.watch(documents)();
    store.remember("tab", bytesOf(1));

    expect(onClosed).toHaveBeenCalledTimes(1);

    close("tab");

    expect(store.count("tab")).toBe(0);
  });

  it("starts at the published cap", () => {
    expect(FOLIO_TEXT_UNDO_BYTES).toBe(64 * 1024 * 1024);
  });
});
