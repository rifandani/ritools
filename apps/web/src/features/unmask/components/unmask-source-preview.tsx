"use client";

import { useEffect, useRef, useState } from "react";

import { useTranslation } from "@/features/i18n/use-translation";
import { ROW_STATE_KEY } from "@/features/unmask/unmask";
import type { UnmaskItem } from "@/features/unmask/use-unmask";

interface SourcePreviewProps {
  readonly item: UnmaskItem;
}

/** The input image on the plate before a Cutout exists. */
export const UnmaskSourcePreview = ({ item }: SourcePreviewProps) => {
  const { t } = useTranslation();
  const image = useRef<HTMLImageElement>(null);
  const [failedFile, setFailedFile] = useState<File | null>(null);
  const failed = failedFile === item.file;

  useEffect(() => {
    const element = image.current;
    if (element === null) {
      return;
    }
    let url: string;
    try {
      url = URL.createObjectURL(item.file);
    } catch {
      return;
    }
    element.src = url;
    return () => {
      element.removeAttribute("src");
      URL.revokeObjectURL(url);
    };
  }, [item.file]);

  const title =
    item.preview === null ? t("unmaskCanvasEmpty") : t("unmaskReading");
  const status = t(ROW_STATE_KEY[item.state]);

  if (failed) {
    return (
      <div className="border-input flex min-h-64 flex-col items-center justify-center border-2 px-4 py-10 text-center">
        <p className="font-display text-2xl font-black uppercase [font-stretch:75%]">
          {title}
        </p>
        <p className="text-muted-fg mt-2 text-sm">{status}</p>
      </div>
    );
  }

  return (
    <figure className="border-rule bg-card relative overflow-hidden border-2">
      <img
        alt={t("unmaskOriginal")}
        className="mx-auto block max-h-[70vh] w-auto max-w-full object-contain"
        decoding="async"
        onError={() => {
          setFailedFile(item.file);
        }}
        ref={image}
      />
      <span className="bg-bg/90 pointer-events-none absolute top-2 left-2 px-1.5 text-xs font-bold uppercase">
        {t("unmaskOriginal")}
      </span>
    </figure>
  );
};
