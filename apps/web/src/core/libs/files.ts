export interface DroppedFile {
  readonly file: File;
  readonly folderPath: string | null;
}

/** What makes two drops the same file: name, byte size, and last-modified. */
export const fingerprintOf = (file: {
  readonly lastModified: number;
  readonly name: string;
  readonly size: number;
}): string => `${file.name}:${file.size}:${file.lastModified}`;

/** One path segment, with control characters removed and a hard length cap. */
const MAX_SEGMENT_LENGTH = 64;

/** The longest file name a browser and a ZIP reader accept. */
export const MAX_FILE_NAME_LENGTH = 100;

/** A path segment without control characters, which a ZIP reader rejects. */
const stripControl = (value: string): string =>
  [...value]
    .filter((character) => {
      const code = character.codePointAt(0) ?? 0;
      return code > 0x1f && code !== 0x7f;
    })
    .join("");

/**
 * The safe segments of a path inside a ZIP. A ZIP entry may not climb out of its
 * root, so the segments `..` and `.` and the separators are dropped or
 * normalised. An empty or hostile path contributes no segment.
 */
export const safeZipSegments = (path: string): readonly string[] =>
  path
    .replaceAll("\\", "/")
    .split("/")
    .map((segment) => stripControl(segment).slice(0, MAX_SEGMENT_LENGTH))
    .filter((segment) => segment !== "" && segment !== "." && segment !== "..");

/**
 * A file name a browser and a ZIP reader accept. A name over the cap keeps its
 * extension, because the format matters to the reader and the tail does not.
 */
export const clampFileName = (
  name: string,
  maxLength = MAX_FILE_NAME_LENGTH
): string => {
  if (name.length <= maxLength) {
    return name;
  }
  const dot = name.lastIndexOf(".");
  const extension = dot > 0 ? name.slice(dot) : "";
  const stem = dot > 0 ? name.slice(0, dot) : name;
  const room = Math.max(1, maxLength - extension.length);
  return `${stem.slice(0, room)}${extension}`;
};

export const download = (blob: Blob, name: string): void => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.download = name;
  link.href = url;
  // A detached link and an immediate revoke cancel the download in some
  // browsers. Keep the link in the document until the browser has read it.
  link.style.display = "none";
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => {
    URL.revokeObjectURL(url);
  }, 0);
};

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

export const folderOfFile = (file: File & { webkitRelativePath?: string }) =>
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
export const filesOf = async (
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

/** Claim a path, including collision suffixes, so no ZIP entry overwrites another. */
export const uniqueZipPath = (
  folder: readonly string[],
  stem: string,
  extension: string,
  taken: Set<string>
): string => {
  let path = [...folder, `${stem}${extension}`].join("/");
  let suffix = 2;
  while (taken.has(path.toLowerCase())) {
    path = [...folder, `${stem}-${suffix}${extension}`].join("/");
    suffix += 1;
  }
  taken.add(path.toLowerCase());
  return path;
};
