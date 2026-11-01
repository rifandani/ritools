"use client";

import { cn } from "cn";
import { useRef } from "react";

import { Button } from "@/core/components/ui/button";
import { useFileDrop } from "@/core/hooks/use-file-drop";
import { droppedFilesOf } from "@/core/libs/files";
import { useTranslation } from "@/features/i18n/use-translation";
import type { DroppedFile } from "@/features/squeeze/squeeze";

/** The types Squeeze reads. The picker filters; the drop path reports instead. */
const ACCEPT =
  "image/jpeg,image/png,image/webp,image/avif,image/gif,image/bmp,.jpg,.jpeg,.png,.webp,.avif,.gif,.bmp";

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
          onFiles(droppedFilesOf(event.target.files));
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
