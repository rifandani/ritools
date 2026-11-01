"use client";

import { cn } from "cn";
import { useCallback, useEffect, useRef, useState } from "react";
import { HiArrowUpTray, HiFolderOpen, HiSparkles } from "react-icons/hi2";

import { Button } from "@/core/components/ui/button";
import { Note } from "@/core/components/ui/note";
import { filesOf, folderOfFile } from "@/core/libs/files";
import { useTranslation } from "@/features/i18n/use-translation";
import { ACCEPTED_MIME } from "@/features/unmask/unmask";

interface DropZoneProps {
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
  onFiles,
  onSample,
  sampleFailed,
}: DropZoneProps) => {
  const { t } = useTranslation();
  const inputRef = useRef<HTMLInputElement>(null);
  const folderRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

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

  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault();
    setDragging(false);
    void (async () => {
      const files = await filesOf(event.dataTransfer);
      onFiles(files);
    })();
  };

  return (
    <section
      aria-labelledby="unmask-empty-title"
      className="flex flex-col gap-y-3"
    >
      <div
        className={cn(
          "bracket-inside border-input relative flex min-h-52 flex-col items-center justify-center gap-y-3 border-2 px-4 py-8 text-center",
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
        onDrop={handleDrop}
      >
        <p
          className="font-display text-[clamp(1.75rem,4vw,2.5rem)] leading-none font-black uppercase [font-stretch:75%]"
          id="unmask-empty-title"
        >
          {t("unmaskDrop")}
        </p>
        <p className="text-muted-fg text-sm/6">{t("unmaskEmptyBody")}</p>

        <div className="mt-2 flex flex-wrap items-center justify-center gap-2">
          <Button
            id="unmask-choose-files"
            intent="primary"
            onPress={() => {
              inputRef.current?.click();
            }}
            size="md"
          >
            <HiArrowUpTray aria-hidden="true" />
            {t("unmaskChoose")}
          </Button>
          <Button
            intent="outline"
            onPress={() => {
              folderRef.current?.click();
            }}
            size="md"
          >
            <HiFolderOpen aria-hidden="true" />
            {t("unmaskChooseFolder")}
          </Button>
          <Button intent="plain" onPress={onSample} size="md">
            <HiSparkles aria-hidden="true" />
            {t("unmaskSample")}
          </Button>
        </div>

        <p className="text-muted-fg max-w-[52ch] text-xs leading-4 text-pretty">
          {t("unmaskDropHint")}
        </p>
        <p className="text-muted-fg max-w-[52ch] text-xs leading-4 text-pretty">
          {t("unmaskFolderHint")}
        </p>
        <p className="text-muted-fg text-xs leading-4">
          {t("unmaskSampleNote")}
        </p>

        <input
          accept={ACCEPTED_MIME}
          aria-label={t("unmaskChoose")}
          className="sr-only"
          id="unmask-files"
          multiple
          onChange={(event) => {
            take(event.target.files);
            event.target.value = "";
          }}
          ref={inputRef}
          type="file"
        />
        <input
          aria-label={t("unmaskChooseFolder")}
          className="sr-only"
          id="unmask-folder"
          multiple
          onChange={(event) => {
            take(event.target.files);
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
