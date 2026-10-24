"use client";

import { cn } from "cn";
import { useCallback, useRef, useState } from "react";

import { Button } from "@/core/components/ui/button";
import type { SampleName } from "@/features/expose/use-expose";
import { useTranslation } from "@/features/i18n/use-translation";

/** The types the picker filters. The engine sniffs the bytes, not the name. */
const ACCEPT =
  "image/jpeg,image/png,image/webp,image/avif,image/gif,image/tiff,.jpg,.jpeg,.jpe,.jfif,.png,.webp,.avif,.gif,.tif,.tiff,.heic,.heif,.hif,.jxl";

interface ExposeEmptyProps {
  readonly onFile: (file: File) => void;
  readonly onSample: (sample: SampleName) => void;
}

/**
 * The empty desk: one drop zone, a pick action, and the two Sample Images.
 *
 * The zone is not drag-only. **Choose a file** is a button, so the keyboard
 * reaches the same place a drop does, and the hint describes the button. The
 * two Sample Image actions sit on the same row, to its right.
 */
export const ExposeEmpty = ({ onFile, onSample }: ExposeEmptyProps) => {
  const { t } = useTranslation();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const take = useCallback(
    (list: FileList | null) => {
      const file = list?.item(0);
      if (file !== null && file !== undefined) {
        onFile(file);
      }
    },
    [onFile]
  );

  return (
    <section
      aria-labelledby="expose-empty-title"
      className="flex flex-col gap-6"
    >
      <div
        className={cn(
          "bracket border-input relative flex min-h-52 flex-col items-center justify-center gap-y-3 border-2 px-6 py-10 text-center",
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
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          take(event.dataTransfer.files);
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
        <div className="mt-2 flex flex-wrap items-center justify-center gap-2">
          <Button
            aria-describedby="expose-drop-hint"
            intent="primary"
            onPress={() => {
              inputRef.current?.click();
            }}
            size="md"
          >
            {t("exposeChooseFile")}
          </Button>
          <Button intent="outline" onPress={() => onSample("camera")} size="md">
            {t("exposeSampleCamera")}
          </Button>
          <Button intent="outline" onPress={() => onSample("ai")} size="md">
            {t("exposeSampleAi")}
          </Button>
        </div>
        <input
          accept={ACCEPT}
          aria-hidden="true"
          className="sr-only"
          id="expose-file"
          onChange={(event) => {
            take(event.target.files);
            event.target.value = "";
          }}
          ref={inputRef}
          tabIndex={-1}
          type="file"
        />
      </div>
    </section>
  );
};
