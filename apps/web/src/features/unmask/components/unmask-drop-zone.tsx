"use client";

import { cn } from "cn";
import { useRef } from "react";

import { Button } from "@/core/components/ui/button";
import { Note } from "@/core/components/ui/note";
import { useFileDrop } from "@/core/hooks/use-file-drop";
import { droppedFilesOf } from "@/core/libs/files";
import type { DroppedFile } from "@/core/libs/files";
import { useTranslation } from "@/features/i18n/use-translation";
import { ACCEPTED_MIME } from "@/features/unmask/unmask";

interface DropZoneProps {
  readonly compact: boolean;
  readonly isDisabled: boolean;
  readonly onFiles: (
    files: readonly {
      readonly file: File;
      readonly folderPath: string | null;
    }[]
  ) => void;
  readonly onSample: () => void;
  readonly sampleFailed: boolean;
}

/** Where images enter Unmask: a drop, a folder drop, a pick, or the sample. */
export const UnmaskDropZone = ({
  compact,
  isDisabled,
  onFiles,
  onSample,
  sampleFailed,
}: DropZoneProps) => {
  const { t } = useTranslation();
  const inputRef = useRef<HTMLInputElement>(null);
  const receiveFiles = (files: readonly DroppedFile[]) => {
    if (!isDisabled) {
      onFiles(files);
    }
  };
  const { dragging, dropProps, folderRef } = useFileDrop(receiveFiles, {
    paste: !isDisabled,
  });

  return (
    <section
      aria-labelledby="unmask-empty-title"
      className="flex flex-col gap-y-3"
    >
      <div
        className={cn(
          "bracket-inside border-input relative flex flex-col items-center justify-center gap-y-3 border-2 px-4 text-center",
          compact ? "py-4" : "min-h-52 py-8",
          "transition-[background-color,border-color,color] duration-90 ease-out",
          dragging && "border-fg bg-fg text-bg [--muted-fg:var(--bg)]"
        )}
        {...dropProps}
      >
        <div className="flex flex-col gap-y-3">
          <p
            className="font-display text-xl leading-6 font-black uppercase [font-stretch:75%]"
            id="unmask-empty-title"
          >
            {t("unmaskDrop")}
          </p>
          <p className="text-muted-fg text-xs/5">{t("unmaskEmptyBody")}</p>
        </div>

        <div className="mt-2 flex flex-wrap items-center justify-center gap-2">
          <Button
            id="unmask-choose-files"
            intent="primary"
            isDisabled={isDisabled}
            onPress={() => {
              inputRef.current?.click();
            }}
            size="md"
          >
            {t("unmaskChoose")}
          </Button>
          <Button
            intent="outline"
            isDisabled={isDisabled}
            onPress={() => {
              folderRef.current?.click();
            }}
            size="md"
          >
            {t("unmaskChooseFolder")}
          </Button>
          {compact ? null : (
            <Button
              intent="plain"
              isDisabled={isDisabled}
              onPress={onSample}
              size="md"
            >
              {t("unmaskSample")}
            </Button>
          )}
        </div>

        <input
          accept={ACCEPTED_MIME}
          aria-label={t("unmaskChoose")}
          className="hidden"
          disabled={isDisabled}
          id="unmask-files"
          multiple
          onChange={(event) => {
            onFiles(droppedFilesOf(event.target.files));
            event.target.value = "";
          }}
          ref={inputRef}
          type="file"
        />
        <input
          aria-label={t("unmaskChooseFolder")}
          className="hidden"
          disabled={isDisabled}
          id="unmask-folder"
          multiple
          onChange={(event) => {
            onFiles(droppedFilesOf(event.target.files));
            event.target.value = "";
          }}
          ref={folderRef}
          type="file"
        />
      </div>

      {sampleFailed ? (
        <Note intent="danger">{t("unmaskSampleFailed")}</Note>
      ) : null}
    </section>
  );
};
