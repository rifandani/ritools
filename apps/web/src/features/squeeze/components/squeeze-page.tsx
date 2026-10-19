"use client";

import { Container } from "@/core/components/ui/container";
import { useTranslation } from "@/features/i18n/use-translation";
import { SqueezeBatchList } from "@/features/squeeze/components/squeeze-batch-list";
import { SqueezeDropZone } from "@/features/squeeze/components/squeeze-drop-zone";
import { SqueezeSettingsBar } from "@/features/squeeze/components/squeeze-settings-bar";
import { useSqueeze } from "@/features/squeeze/use-squeeze";

/** Squeeze: the whole Tool. */
export const SqueezePage = () => {
  const { t } = useTranslation();
  const {
    add,
    batch,
    clear,
    downloadAll,
    downloadOne,
    remove,
    results,
    running,
    setSettings,
    setTarget,
    settings,
    summary,
  } = useSqueeze();

  return (
    <Container className="flex flex-col gap-y-8 py-12">
      <header className="flex flex-col gap-y-3">
        <h1 className="text-3xl font-semibold sm:text-4xl">
          {t("squeezeName")}
        </h1>
        <p className="text-muted-fg text-lg">{t("squeezeTagline")}</p>
        <p className="text-muted-fg max-w-3xl text-sm">{t("squeezeIntro")}</p>
        <ul className="text-muted-fg flex flex-wrap gap-x-4 gap-y-1 text-xs">
          <li>{t("squeezeFactLocal")}</li>
          <li>{t("squeezeFactTarget")}</li>
          <li>{t("squeezeFactBulk")}</li>
        </ul>
      </header>

      <div className="flex flex-col gap-y-4">
        <SqueezeDropZone onFiles={add} />
        <SqueezeSettingsBar onChange={setSettings} settings={settings} />
        <SqueezeBatchList
          batch={batch}
          onClear={clear}
          onDownload={downloadOne}
          onDownloadAll={() => {
            void downloadAll();
          }}
          onRemove={remove}
          onTarget={setTarget}
          results={results}
          summary={summary}
          targetBytes={settings.targetBytes}
        />
      </div>

      <output aria-live="polite" className="sr-only">
        {running
          ? t("squeezeProgress", {
              done: summary.done,
              total: summary.total,
            })
          : null}
      </output>

      <section className="border-border text-muted-fg max-w-3xl border-t pt-6 text-sm">
        <p>{t("squeezeNoCap")}</p>
        <p className="mt-2">{t("squeezeAlsoTried")}</p>
      </section>
    </Container>
  );
};
