"use client";

import { cn } from "cn";
import { useCallback, useEffect, useRef, useState } from "react";

import { Button } from "@/core/components/ui/button";
import { filesOf, folderOfFile } from "@/core/libs/files";
import type { DroppedFile } from "@/core/libs/files";
import type {
  ExposeController,
  SampleName,
} from "@/features/expose/use-expose";
import { useTranslation } from "@/features/i18n/use-translation";

/** The types the picker filters. The engine sniffs the bytes, not the name. */
const ACCEPT =
  "image/jpeg,image/png,image/webp,image/avif,image/gif,image/tiff,image/dng,image/x-adobe-dng,.dng,.jpg,.jpeg,.jpe,.jfif,.png,.webp,.avif,.gif,.tif,.tiff,.heic,.heif,.hif,.jxl,.pdf,.mp4,.mov,.m4v,.webm,.mkv,.avi,.m4a,.mp3,.wav,.flac,.ogg,.opus,.docx,.xlsx,.pptx";

interface ExposeEmptyProps {
  readonly watch: ExposeController["watch"];
  readonly onFiles: (files: readonly DroppedFile[]) => void;
  readonly compact?: boolean;
  readonly onSample: (sample: SampleName) => void;
}

/**
 * The empty desk: one drop zone, a pick action, and the two Sample Images.
 *
 * The zone is not drag-only. **Choose a file** is a button, so the keyboard
 * reaches the same place a drop does, and the hint describes the button. The
 * two Sample Image actions sit on their own row below the pick actions.
 */
export const ExposeEmpty = ({
  onFiles,
  watch,
  onSample,
  compact = false,
}: ExposeEmptyProps) => {
  const { t } = useTranslation();
  const inputRef = useRef<HTMLInputElement>(null);
  const folderRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    folderRef.current?.setAttribute("webkitdirectory", "");
    folderRef.current?.setAttribute("directory", "");
  }, []);
  const [dragging, setDragging] = useState(false);

  const take = useCallback(
    (list: FileList | null) => {
      if (list !== null && list.length > 0) {
        onFiles(
          [...list].map((file) => ({ file, folderPath: folderOfFile(file) }))
        );
      }
    },
    [onFiles]
  );

  return (
    <section
      aria-labelledby="expose-empty-title"
      className="flex flex-col gap-6"
    >
      <div
        className={cn(
          "bracket border-input relative flex flex-col items-center justify-center gap-y-3 border-2 px-6 text-center",
          compact ? "py-4" : "min-h-52 py-10",
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
          const next = event.relatedTarget;
          if (!(next instanceof Node) || !event.currentTarget.contains(next)) {
            setDragging(false);
          }
        }}
        onDragOver={(event) => {
          event.preventDefault();
        }}
        onDrop={async (event) => {
          event.preventDefault();
          setDragging(false);
          onFiles(await filesOf(event.dataTransfer));
        }}
      >
        <p
          className="font-display text-xl leading-6 font-black uppercase [font-stretch:75%]"
          id="expose-empty-title"
        >
          {t("exposeDrop")}
        </p>
        <p className="text-muted-fg text-xs/5" id="expose-drop-hint">
          {t("exposeDropHint")}
        </p>
        <div className="mt-2 flex flex-col items-center gap-2">
          <div className="flex flex-wrap items-center justify-center gap-2">
            <Button
              aria-describedby="expose-drop-hint"
              id="expose-choose-files"
              intent="primary"
              onPress={() => {
                inputRef.current?.click();
              }}
              size="md"
            >
              {t("exposeChooseFile")}
            </Button>
            <Button
              intent="outline"
              onPress={() => folderRef.current?.click()}
              size="md"
            >
              {t("exposeChooseFolder")}
            </Button>
            <Button
              aria-describedby={
                watch.supported ? undefined : "expose-watch-reason"
              }
              aria-pressed={
                watch.status === "watching" || watch.status === "starting"
              }
              intent="plain"
              isDisabled={!watch.supported}
              onPress={() => {
                if (
                  watch.status === "watching" ||
                  watch.status === "starting"
                ) {
                  watch.stop();
                } else {
                  void watch.start();
                }
              }}
              size="md"
            >
              {t(
                watch.status === "watching" || watch.status === "starting"
                  ? "exposeWatchStop"
                  : "exposeWatchStart"
              )}
            </Button>
          </div>
          {compact ? null : (
            <div className="flex flex-wrap items-center justify-center gap-2">
              <Button
                intent="outline"
                onPress={() => onSample("camera")}
                size="md"
              >
                {t("exposeSampleCamera")}
              </Button>
              <Button intent="outline" onPress={() => onSample("ai")} size="md">
                {t("exposeSampleAi")}
              </Button>
            </div>
          )}
        </div>
        <output
          aria-live="polite"
          className="text-muted-fg text-xs/5"
          id="expose-watch-reason"
        >
          {watch.supported === false
            ? t("exposeWatchUnsupported")
            : watch.status === "denied"
              ? t("exposeWatchDenied")
              : watch.status === "revoked"
                ? t("exposeWatchRevoked")
                : watch.status === "watching"
                  ? t("exposeWatchActive")
                  : ""}
        </output>
        <input
          accept={ACCEPT}
          aria-hidden="true"
          className="sr-only"
          id="expose-file"
          multiple
          onChange={(event) => {
            take(event.target.files);
            event.target.value = "";
          }}
          ref={inputRef}
          tabIndex={-1}
          type="file"
        />
        <input
          aria-hidden="true"
          className="sr-only"
          id="expose-folder"
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
    </section>
  );
};
