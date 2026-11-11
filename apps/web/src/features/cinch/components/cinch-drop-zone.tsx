"use client";

import { cn } from "cn";
import { useRef } from "react";

import { Button } from "@/core/components/ui/button";
import { useFileDrop } from "@/core/hooks/use-file-drop";
import { droppedFilesOf } from "@/core/libs/files";
import type { DroppedFile } from "@/core/libs/files";
import { ACCEPT } from "@/features/cinch/cinch";
import { useTranslation } from "@/features/i18n/use-translation";

/**
 * Where videos enter Cinch: a drop, a folder drop, a pick, a folder pick, or a
 * paste. **Choose videos** is a button, and it is the keyboard path into the
 * same Batch.
 */
export const CinchDropZone = ({
  onFiles,
}: {
  readonly onFiles: (files: readonly DroppedFile[]) => void;
}) => {
  const { t } = useTranslation();
  const inputRef = useRef<HTMLInputElement>(null);
  const { dragging, dropProps, folderRef } = useFileDrop(onFiles, {
    paste: true,
  });

  return (
    <div
      className={cn(
        "bracket-inside border-input relative flex flex-col items-center justify-center gap-y-2 border-2 px-4 py-8 text-center",
        "transition-[background-color,border-color,color] duration-90 ease-out",
        dragging && "border-fg bg-fg text-bg [--muted-fg:var(--bg)]"
      )}
      {...dropProps}
    >
      <p className="font-display text-xl font-black uppercase [font-stretch:75%]">
        {t("cinchDropTitle")}
      </p>
      <p className="text-muted-fg text-xs leading-4">{t("cinchDropHint")}</p>

      <div className="mt-2 flex flex-wrap items-center justify-center gap-2">
        <Button
          id="cinch-choose-files"
          intent="primary"
          onPress={() => {
            inputRef.current?.click();
          }}
          size="md"
        >
          {t("cinchChooseFiles")}
        </Button>
        <Button
          intent="outline"
          onPress={() => {
            folderRef.current?.click();
          }}
          size="md"
        >
          {t("cinchChooseFolder")}
        </Button>
      </div>

      <input
        accept={ACCEPT}
        aria-hidden="true"
        className="sr-only"
        id="cinch-files"
        multiple
        onChange={(event) => {
          onFiles(droppedFilesOf(event.target.files));
          event.target.value = "";
        }}
        ref={inputRef}
        tabIndex={-1}
        type="file"
      />
      {/* `webkitdirectory` is not in the DOM types; the hook sets it. */}
      <input
        aria-hidden="true"
        className="sr-only"
        id="cinch-folder"
        multiple
        onChange={(event) => {
          onFiles(droppedFilesOf(event.target.files));
          event.target.value = "";
        }}
        ref={folderRef}
        tabIndex={-1}
        type="file"
      />
    </div>
  );
};
