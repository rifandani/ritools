"use client";

import { Button } from "@/core/components/ui/button";
import { Note } from "@/core/components/ui/note";
import type { OversizedImage } from "@/features/easel/use-easel";
import { useTranslation } from "@/features/i18n/use-translation";

/**
 * The messages above the editor: a Rejected file, the File Tab limit, an
 * image that is larger than the GPU limit, and a browser with no WebGL2.
 */
export const EaselNotes = ({
  onOversized,
  oversized,
  rejected,
  sampleFailed,
  tabLimit,
  tabLimitHit,
  unsupported,
}: {
  readonly onOversized: (id: string, accept: boolean) => void;
  readonly oversized: readonly OversizedImage[];
  readonly rejected: readonly string[];
  readonly sampleFailed: boolean;
  readonly tabLimit: number;
  readonly tabLimitHit: boolean;
  readonly unsupported: boolean;
}) => {
  const { t } = useTranslation();
  if (
    !unsupported &&
    !sampleFailed &&
    !tabLimitHit &&
    rejected.length === 0 &&
    oversized.length === 0
  ) {
    return null;
  }
  return (
    <div className="flex flex-col gap-y-2" data-easel-notes="">
      {unsupported ? (
        <Note data-easel-note="unsupported" intent="danger" role="alert">
          {t("easelUnsupported")}
        </Note>
      ) : null}
      {sampleFailed ? (
        <Note data-easel-note="sample-failed" intent="danger" role="alert">
          {t("easelSampleFailed")}
        </Note>
      ) : null}
      {tabLimitHit ? (
        <Note data-easel-note="tab-limit" intent="info">
          {t("easelTabLimit", { count: String(tabLimit) })}
        </Note>
      ) : null}
      {rejected.map((name) => (
        <Note
          data-easel-note="rejected"
          intent="danger"
          key={name}
          role="alert"
        >
          <span className="font-bold">{t("easelRejected")}</span>{" "}
          {t("easelRejectedBody", { name })}
        </Note>
      ))}
      {oversized.map((image) => (
        <Note data-easel-note="oversized" intent="warning" key={image.id}>
          <p>
            {t("easelOversized", {
              fittedHeight: String(image.fitted.height),
              fittedWidth: String(image.fitted.width),
              height: String(image.size.height),
              name: image.name,
              width: String(image.size.width),
            })}
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            <Button
              intent="primary"
              onPress={() => {
                onOversized(image.id, true);
              }}
              size="sm"
            >
              {t("easelOversizedAccept")}
            </Button>
            <Button
              intent="plain"
              onPress={() => {
                onOversized(image.id, false);
              }}
              size="sm"
            >
              {t("cancel")}
            </Button>
          </div>
        </Note>
      ))}
    </div>
  );
};
