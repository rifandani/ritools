"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { Button } from "@/core/components/ui/button";
import { useTranslation } from "@/features/i18n/use-translation";

/** The types Squeeze reads. The picker filters; the drop path reports instead. */
const ACCEPT =
  "image/jpeg,image/png,image/webp,image/avif,.jpg,.jpeg,.png,.webp,.avif";

/** The File System Entry API, which the DOM lib does not declare. */
interface DroppedEntry {
  readonly isDirectory: boolean;
  readonly isFile: boolean;
  readonly createReader: () => EntryReader;
  readonly file: (onFile: (file: File) => void, onError?: () => void) => void;
}

interface EntryReader {
  readonly readEntries: (
    onEntries: (entries: readonly DroppedEntry[]) => void,
    onError?: () => void
  ) => void;
}

interface EntryAccessor {
  readonly webkitGetAsEntry?: () => DroppedEntry | null;
}

const entryOf = (item: DataTransferItem): DroppedEntry | null => {
  // SAFETY: Chrome, Firefox and Safari all add `webkitGetAsEntry` to
  // DataTransferItem; the DOM lib simply does not declare it.
  const accessor = item as Partial<EntryAccessor>;
  return accessor.webkitGetAsEntry?.() ?? null;
};

const readBatch = (reader: EntryReader): Promise<readonly DroppedEntry[]> =>
  // oxlint-disable-next-line promise/avoid-new -- the Entry API is callback-only
  new Promise((resolve) => {
    reader.readEntries(
      (entries) => {
        resolve(entries);
      },
      () => {
        resolve([]);
      }
    );
  });

/** Every file under one dropped entry, following directories. */
const collect = async (entry: DroppedEntry, into: File[]): Promise<void> => {
  if (entry.isFile) {
    into.push(
      // oxlint-disable-next-line promise/avoid-new -- the Entry API is callback-only
      await new Promise<File>((resolve, reject) => {
        entry.file(resolve, reject);
      })
    );
    return;
  }
  if (!entry.isDirectory) {
    return;
  }
  const reader = entry.createReader();
  let batch = await readBatch(reader);
  while (batch.length > 0) {
    // oxlint-disable-next-line no-await-in-loop -- readEntries is a cursor: the next batch exists only after this one is read
    await Promise.all(batch.map((child) => collect(child, into)));
    // oxlint-disable-next-line no-await-in-loop -- see above
    batch = await readBatch(reader);
  }
};

/** The files a drop carries, including the files inside a dropped folder. */
const filesOf = async (transfer: DataTransfer): Promise<readonly File[]> => {
  const entries = [...transfer.items].map((item) => entryOf(item));
  if (entries.every((entry) => entry === null)) {
    // No File System entry to walk: a plain list of files, or a browser that
    // does not expose the entry API.
    return [...transfer.files];
  }
  const files: File[] = [];
  await Promise.all(
    entries.map((entry) => (entry === null ? undefined : collect(entry, files)))
  );
  return files.length > 0 ? files : [...transfer.files];
};

interface DropZoneProps {
  readonly onFiles: (files: readonly File[]) => void;
}

/** Where images enter the Tool: a drop, a folder drop, a pick, or a paste. */
export const SqueezeDropZone = ({ onFiles }: DropZoneProps) => {
  const { t } = useTranslation();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const take = useCallback(
    (list: FileList | null) => {
      if (list !== null && list.length > 0) {
        onFiles([...list]);
      }
    },
    [onFiles]
  );

  useEffect(() => {
    const onPaste = (event: ClipboardEvent) => {
      const list = event.clipboardData?.files;
      if (list !== undefined && list.length > 0) {
        event.preventDefault();
        take(list);
      }
    };
    window.addEventListener("paste", onPaste);
    return () => {
      window.removeEventListener("paste", onPaste);
    };
  }, [take]);

  const handleDrop = async (event: React.DragEvent) => {
    event.preventDefault();
    setDragging(false);
    onFiles(await filesOf(event.dataTransfer));
  };

  return (
    <div
      className={`relative flex flex-col items-center justify-center gap-y-3 rounded-xl border border-dashed p-8 text-center transition-colors ${
        dragging ? "border-primary bg-primary/10 border-solid" : "border-border"
      }`}
      onDragEnter={(event) => {
        event.preventDefault();
        setDragging(true);
      }}
      onDragLeave={(event) => {
        // `dragleave` also fires for a move between the zone's own children.
        if (event.currentTarget === event.target) {
          setDragging(false);
        }
      }}
      onDragOver={(event) => {
        event.preventDefault();
      }}
      onDrop={handleDrop}
    >
      <p className="font-medium">{t("squeezeDropTitle")}</p>
      <p className="text-muted-fg text-sm">{t("squeezeDropHint")}</p>
      <Button
        intent="secondary"
        onPress={() => {
          inputRef.current?.click();
        }}
        size="sm"
      >
        {t("squeezeChooseFiles")}
      </Button>
      <input
        accept={ACCEPT}
        className="sr-only"
        multiple
        onChange={(event) => {
          take(event.target.files);
          event.target.value = "";
        }}
        ref={inputRef}
        type="file"
      />
    </div>
  );
};
