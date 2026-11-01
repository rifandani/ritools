import { useEffect, useRef, useState } from "react";

import { droppedFilesOf, filesOf } from "@/core/libs/files";
import type { DroppedFile } from "@/core/libs/files";

interface FileDropOptions {
  /** Listen for pasted files. The drop zone opts in; a compact picker may not. */
  readonly paste?: boolean;
}

/** The shared drop, pick, paste, and Folder Path behavior of a file zone. */
export const useFileDrop = (
  onFiles: (files: readonly DroppedFile[]) => void,
  options: FileDropOptions = {}
) => {
  const { paste = false } = options;
  const folderRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  // The directory attributes are not in React's input types. Set them on the
  // element rather than cast them into the JSX props.
  useEffect(() => {
    folderRef.current?.setAttribute("webkitdirectory", "");
    folderRef.current?.setAttribute("directory", "");
  }, []);

  useEffect(() => {
    if (!paste) {
      return;
    }
    const onPaste = (event: ClipboardEvent) => {
      const list = event.clipboardData?.files;
      if (list !== undefined && list.length > 0) {
        event.preventDefault();
        onFiles(droppedFilesOf(list));
      }
    };
    window.addEventListener("paste", onPaste);
    return () => {
      window.removeEventListener("paste", onPaste);
    };
  }, [onFiles, paste]);

  const dropProps = {
    onDragEnd: () => {
      setDragging(false);
    },
    onDragEnter: (event: React.DragEvent<HTMLElement>) => {
      event.preventDefault();
      setDragging(true);
    },
    onDragLeave: (event: React.DragEvent<HTMLElement>) => {
      // A move between the zone's own children must not clear the print. Only
      // leaving the zone does.
      const next = event.relatedTarget;
      if (!(next instanceof Node) || !event.currentTarget.contains(next)) {
        setDragging(false);
      }
    },
    onDragOver: (event: React.DragEvent<HTMLElement>) => {
      event.preventDefault();
    },
    onDrop: async (event: React.DragEvent<HTMLElement>) => {
      event.preventDefault();
      setDragging(false);
      onFiles(await filesOf(event.dataTransfer));
    },
  };

  return { dragging, dropProps, folderRef };
};
