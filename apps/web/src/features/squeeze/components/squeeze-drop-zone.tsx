"use client";

import { cn } from "cn";
import { useCallback, useEffect, useRef, useState } from "react";

import { Button } from "@/core/components/ui/button";
import { useTranslation } from "@/features/i18n/use-translation";
import type { DroppedFile } from "@/features/squeeze/squeeze";

/** The types Squeeze reads. The picker filters; the drop path reports instead. */
const ACCEPT =
  "image/jpeg,image/png,image/webp,image/avif,image/gif,image/bmp,.jpg,.jpeg,.png,.webp,.avif,.gif,.bmp";

/** The File System Entry API, which the DOM lib does not declare. */
interface DroppedEntry {
  readonly isDirectory: boolean;
  readonly isFile: boolean;
  readonly fullPath?: string;
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

/** The folder a path names: everything before the last slash, root included. */
const folderOf = (path: string): string | null => {
  const clean = path.replace(/^\/+/u, "");
  const slash = clean.lastIndexOf("/");
  return slash <= 0 ? null : clean.slice(0, slash);
};

const folderOfFile = (file: File & { webkitRelativePath?: string }) =>
  folderOf(file.webkitRelativePath ?? "");

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
const collect = async (
  entry: DroppedEntry,
  into: DroppedFile[]
): Promise<void> => {
  if (entry.isFile) {
    // oxlint-disable-next-line promise/avoid-new -- the Entry API is callback-only
    const file = await new Promise<File>((resolve, reject) => {
      entry.file(resolve, reject);
    });
    into.push({ file, folderPath: folderOf(entry.fullPath ?? "") });
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
const filesOf = async (
  transfer: DataTransfer
): Promise<readonly DroppedFile[]> => {
  const entries = [...transfer.items].map((item) => entryOf(item));
  if (entries.every((entry) => entry === null)) {
    return [...transfer.files].map((file) => ({
      file,
      folderPath: folderOfFile(file),
    }));
  }
  const files: DroppedFile[] = [];
  await Promise.all(
    entries.map((entry) => (entry === null ? undefined : collect(entry, files)))
  );
  return files.length > 0
    ? files
    : [...transfer.files].map((file) => ({
        file,
        folderPath: folderOfFile(file),
      }));
};

interface DropZoneProps {
  readonly onFiles: (files: readonly DroppedFile[]) => void;
  readonly onWatchToggle: () => void;
  readonly showWatchReason: boolean;
  readonly watchSupported: boolean;
  readonly watching: boolean;
}

/**
 * Where images enter the Tool: a drop, a folder drop, a pick, a folder pick, a
 * paste, or a watched folder. The zone is not drag-only: **Choose files** is a
 * button, and it is the keyboard path into the same Batch.
 */
export const SqueezeDropZone = ({
  onFiles,
  onWatchToggle,
  showWatchReason,
  watchSupported,
  watching,
}: DropZoneProps) => {
  const { t } = useTranslation();
  const inputRef = useRef<HTMLInputElement>(null);
  const folderRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  // The directory attribute is not in React's input types, and it must be set
  // on the element rather than cast into the JSX props.
  useEffect(() => {
    folderRef.current?.setAttribute("webkitdirectory", "");
    folderRef.current?.setAttribute("directory", "");
  }, []);

  const take = useCallback(
    (list: FileList | null) => {
      if (list !== null && list.length > 0) {
        onFiles(
          [...list].map((file) => ({
            file,
            folderPath: folderOfFile(file),
          }))
        );
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
      className={cn(
        "bracket-inside border-input relative flex flex-col items-center justify-center gap-y-2 border-2 px-4 py-8 text-center",
        "transition-[background-color,border-color,color] duration-90 ease-out",
        dragging && "border-fg bg-fg text-bg [--muted-fg:var(--bg)]"
      )}
      onDragEnd={() => {
        setDragging(false);
      }}
      onDragEnter={(event) => {
        event.preventDefault();
        setDragging(true);
      }}
      onDragLeave={(event) => {
        // A move between the zone's own children must not clear the print.
        // Only leaving the zone does.
        const next = event.relatedTarget;
        if (!(next instanceof Node) || !event.currentTarget.contains(next)) {
          setDragging(false);
        }
      }}
      onDragOver={(event) => {
        event.preventDefault();
      }}
      onDrop={handleDrop}
    >
      <p className="font-display text-xl font-black uppercase [font-stretch:75%]">
        {t("squeezeDropTitle")}
      </p>
      <p className="text-muted-fg text-xs leading-4">{t("squeezeDropHint")}</p>

      <div className="mt-2 flex flex-wrap items-center justify-center gap-2">
        <Button
          id="squeeze-choose-files"
          intent="primary"
          onPress={() => {
            inputRef.current?.click();
          }}
          size="md"
        >
          {t("squeezeChooseFiles")}
        </Button>
        <Button
          intent="outline"
          onPress={() => {
            folderRef.current?.click();
          }}
          size="md"
        >
          {t("squeezeChooseFolder")}
        </Button>
        {/* The directory picker is Chromium-only: where it is absent the mark
            is disabled and prints its reason. Never a broken button. */}
        <Button
          aria-describedby={
            showWatchReason ? "squeeze-watch-reason" : undefined
          }
          intent="plain"
          isDisabled={!watchSupported}
          onPress={onWatchToggle}
          size="md"
        >
          {watching ? t("squeezeWatchStop") : t("squeezeWatchStart")}
        </Button>
      </div>

      {showWatchReason ? (
        <p
          className="text-muted-fg text-xs leading-4"
          id="squeeze-watch-reason"
        >
          {t("squeezeWatchUnsupported")}
        </p>
      ) : null}

      <input
        accept={ACCEPT}
        aria-hidden="true"
        className="sr-only"
        id="squeeze-files"
        multiple
        onChange={(event) => {
          take(event.target.files);
          event.target.value = "";
        }}
        ref={inputRef}
        tabIndex={-1}
        type="file"
      />
      {/* `webkitdirectory` is not in the DOM types; the effect sets it. */}
      <input
        aria-hidden="true"
        className="sr-only"
        id="squeeze-folder"
        multiple
        onChange={(event) => {
          take(event.target.files);
          event.target.value = "";
        }}
        ref={folderRef}
        tabIndex={-1}
        type="file"
      />
    </div>
  );
};
