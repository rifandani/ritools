import type { DroppedFile } from "@/core/libs/files";

/* oxlint-disable anti-slop/no-unknown-parameters, anti-slop/no-runtime-typeof, anti-slop/no-reflect-get -- browser file-system failures can be DOM errors or plain records */
const errorNameOf = (error: unknown): string =>
  typeof error === "object" && error !== null && "name" in error
    ? String(Reflect.get(error, "name"))
    : "";

export const classifyWatchFailure = (error: unknown): "cancelled" | "denied" =>
  errorNameOf(error) === "AbortError" ? "cancelled" : "denied";

export const isWatchPermissionError = (error: unknown): boolean =>
  errorNameOf(error) === "NotAllowedError" ||
  errorNameOf(error) === "SecurityError";
/* oxlint-enable anti-slop/no-unknown-parameters, anti-slop/no-runtime-typeof, anti-slop/no-reflect-get */

/** The Chromium directory picker, which the DOM lib does not declare. */
export interface DirectoryPicker {
  readonly showDirectoryPicker?: (options?: {
    readonly mode?: "read" | "readwrite";
  }) => Promise<WatchedDirectory>;
}

interface WatchedDirectory {
  readonly entries: () => AsyncIterableIterator<[string, WatchedHandle]>;
  readonly name: string;
}

interface WatchedHandle {
  readonly kind: "file" | "directory";
  readonly name: string;
  readonly getFile?: () => Promise<File>;
  readonly entries?: () => AsyncIterableIterator<[string, WatchedHandle]>;
}

const readWatchedFile = async (
  handle: WatchedHandle,
  path: string
): Promise<DroppedFile | null> => {
  if (handle.kind !== "file" || handle.getFile === undefined) {
    return null;
  }
  try {
    const file = await handle.getFile();
    return { file, folderPath: path };
  } catch (error) {
    // A file that left the folder is not a new file. A revoked permission is,
    // and it stops the whole watcher.
    if (isWatchPermissionError(error)) {
      throw error;
    }
    return null;
  }
};

const walkWatchedDirectory = async (
  handle: WatchedHandle,
  path: string,
  walk: (
    entries: AsyncIterableIterator<[string, WatchedHandle]>,
    path: string
  ) => Promise<void>
): Promise<void> => {
  if (handle.kind !== "directory" || handle.entries === undefined) {
    return;
  }
  try {
    await walk(handle.entries(), `${path}/${handle.name}`);
  } catch (error) {
    if (isWatchPermissionError(error)) {
      throw error;
    }
  }
};

/** Every file under one watched directory, with the root's name first. */
export const collectWatched = async (
  directory: WatchedDirectory
): Promise<readonly DroppedFile[]> => {
  const files: DroppedFile[] = [];
  const walk = async (
    entries: AsyncIterableIterator<[string, WatchedHandle]>,
    path: string
  ): Promise<void> => {
    for await (const [, handle] of entries) {
      const file = await readWatchedFile(handle, path);
      if (file !== null) {
        files.push(file);
        continue;
      }
      await walkWatchedDirectory(handle, path, walk);
    }
  };
  await walk(directory.entries(), directory.name);
  return files;
};
