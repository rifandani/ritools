"use client";

import { useEffect, useMemo, useRef } from "react";

import { useTranslation } from "@/features/i18n/use-translation";
import type { OutputFile } from "@/features/squeeze/squeeze";
import { formatBytes, MIME_TYPE } from "@/features/squeeze/squeeze";

/** One still, with the size in its caption. The object URL lives with the still. */
const Plate = ({
  blob,
  label,
}: {
  readonly blob: Blob;
  readonly label: string;
}) => {
  const image = useRef<HTMLImageElement>(null);

  useEffect(() => {
    const element = image.current;
    if (element === null) {
      return;
    }
    let url: string;
    try {
      url = URL.createObjectURL(blob);
    } catch {
      return;
    }
    element.src = url;
    return () => {
      element.removeAttribute("src");
      URL.revokeObjectURL(url);
    };
  }, [blob]);

  return (
    <figure className="flex min-w-0 flex-col gap-y-1">
      <figcaption className="text-xs font-bold tracking-[0.06em] uppercase [font-stretch:87.5%]">
        {label}
      </figcaption>
      <img
        alt={label}
        className="border-rule bg-muted aspect-video w-full border-2 object-contain"
        decoding="async"
        ref={image}
      />
    </figure>
  );
};

/**
 * Before and after, side by side. Multi writes one after plate per format.
 */
export const SqueezePreview = ({
  input,
  outputs,
}: {
  readonly input: Blob;
  readonly outputs: readonly OutputFile[];
}) => {
  const { t, locale } = useTranslation();
  const plates = useMemo(
    () =>
      outputs.map((file) => ({
        blob: new Blob([file.bytes], { type: MIME_TYPE[file.format] }),
        format: file.format,
        key: file.format,
        size: file.size,
      })),
    [outputs]
  );
  const named = plates.length > 1;

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <Plate
        blob={input}
        label={t("squeezePreviewBefore", {
          size: formatBytes(input.size, locale),
        })}
      />
      {plates.map((plate) => (
        <Plate
          blob={plate.blob}
          key={plate.key}
          label={
            named
              ? t("squeezePreviewAfterNamed", {
                  format: plate.format.toUpperCase(),
                  size: formatBytes(plate.size, locale),
                })
              : t("squeezePreviewAfter", {
                  size: formatBytes(plate.size, locale),
                })
          }
        />
      ))}
    </div>
  );
};
