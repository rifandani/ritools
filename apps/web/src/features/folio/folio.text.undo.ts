/**
 * The bytes before each applied Wording Edit, so a tab can step back after an
 * edit the viewer's own history does not cover. A snapshot is a whole file, so
 * the stack is capped; the oldest goes first, and a file larger than the cap
 * keeps no snapshot at all.
 */
export const FOLIO_TEXT_UNDO_BYTES = 64 * 1024 * 1024;

interface Snapshot {
  bytes: Uint8Array;
  documentId: string;
}

/** The one capability member the stack needs: a tab closed. */
export interface FolioTextClosable {
  readonly onClosed: (
    listener: (event: { readonly documentId: string }) => void
  ) => () => void;
}

/**
 * The stack for one session. It is keyed by the document's tab id, because an
 * applied edit opens a new document and closes the old one; `move` carries the
 * stack across that swap, and closing a tab drops its snapshots.
 */
export class FolioTextUndoStore {
  #entries: Snapshot[] = [];
  readonly #limit: number;
  readonly #watched = new WeakSet<FolioTextClosable>();

  constructor(limit: number = FOLIO_TEXT_UNDO_BYTES) {
    // A negative cap would ask the stack to drop past empty.
    this.#limit = Math.max(0, limit);
  }

  /** Drop a tab's snapshots when it closes. Safe to call once per viewer. */
  watch(documents: FolioTextClosable): () => void {
    if (this.#watched.has(documents)) {
      // The session owns the one subscription; a panel unmount keeps it.
      return () => {
        /* already watched */
      };
    }
    this.#watched.add(documents);
    return documents.onClosed(({ documentId }) => {
      this.clear(documentId);
    });
  }

  /** Keep the bytes from before an edit, dropping the oldest past the cap. */
  remember(documentId: string, bytes: Uint8Array) {
    this.#entries.push({ bytes, documentId });
    while (this.#total() > this.#limit) {
      this.#entries.shift();
    }
  }

  /** The most recent snapshot for a tab, removed from the stack. */
  take(documentId: string): Uint8Array | null {
    const entry = this.#entries.findLast(
      (candidate) => candidate.documentId === documentId
    );
    if (!entry) {
      return null;
    }
    this.#entries = this.#entries.filter((candidate) => candidate !== entry);
    return entry.bytes;
  }

  /** Carry a tab's snapshots to the document id that replaced it. */
  move(from: string, to: string) {
    for (const entry of this.#entries) {
      if (entry.documentId === from) {
        entry.documentId = to;
      }
    }
  }

  count(documentId: string): number {
    let total = 0;
    for (const entry of this.#entries) {
      if (entry.documentId === documentId) {
        total += 1;
      }
    }
    return total;
  }

  clear(documentId: string) {
    this.#entries = this.#entries.filter(
      (entry) => entry.documentId !== documentId
    );
  }

  #total(): number {
    let total = 0;
    for (const entry of this.#entries) {
      total += entry.bytes.byteLength;
    }
    return total;
  }
}

/** The session's stack. It outlives the panel, so closing and reopening keeps it. */
export const folioTextUndo = new FolioTextUndoStore();
