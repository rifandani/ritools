"use client";

import { cn } from "cn";
import type { DragEvent, RefObject } from "react";

import { Button } from "@/core/components/ui/button";
import { Loader } from "@/core/components/ui/loader";
import { useTranslation } from "@/features/i18n/use-translation";

/** Where images enter Easel: a drop, a pick, a paste, or the Sample Image. */
export const EaselDropZone = ({
  dragging,
  dropProps,
  inputRef,
  isOpening,
  onSample,
}: {
  readonly dragging: boolean;
  readonly dropProps: {
    readonly onDragEnd: () => void;
    readonly onDragEnter: (event: DragEvent<HTMLElement>) => void;
    readonly onDragLeave: (event: DragEvent<HTMLElement>) => void;
    readonly onDragOver: (event: DragEvent<HTMLElement>) => void;
    readonly onDrop: (event: DragEvent<HTMLElement>) => Promise<void>;
  };
  readonly inputRef: RefObject<HTMLInputElement | null>;
  readonly isOpening: boolean;
  readonly onSample: () => void;
}) => {
  const { t } = useTranslation();
  return (
    <section aria-labelledby="easel-empty-title" className="flex flex-col">
      <div
        className={cn(
          "bracket-inside border-input relative flex min-h-52 flex-col items-center justify-center gap-y-3 border-2 px-4 py-8 text-center",
          "transition-[background-color,border-color,color] duration-90 ease-out",
          dragging && "border-fg bg-fg text-bg [--muted-fg:var(--bg)]"
        )}
        {...dropProps}
      >
        <div className="flex flex-col gap-y-3">
          <p
            className="font-display text-xl leading-6 font-black uppercase [font-stretch:75%]"
            id="easel-empty-title"
          >
            {t("easelDrop")}
          </p>
          <p className="text-muted-fg mx-auto max-w-prose text-xs/5">
            {t("easelEmptyBody")}
          </p>
          <p className="text-muted-fg text-xs/5">{t("easelFormatLine")}</p>
        </div>
        <div className="mt-2 flex flex-wrap items-center justify-center gap-2">
          <Button
            id="easel-choose-files"
            intent="primary"
            isDisabled={isOpening}
            onPress={() => {
              inputRef.current?.click();
            }}
            size="md"
          >
            {isOpening ? <Loader aria-label={t("easelOpening")} /> : null}
            {t("easelChoose")}
          </Button>
          <Button
            id="easel-sample"
            intent="plain"
            isDisabled={isOpening}
            onPress={onSample}
            size="md"
          >
            {t("easelSample")}
          </Button>
        </div>
      </div>
    </section>
  );
};
