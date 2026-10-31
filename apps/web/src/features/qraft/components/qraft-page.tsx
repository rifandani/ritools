"use client";

import { Container } from "@/core/components/ui/container";
import { Ransom } from "@/core/components/ui/ransom";
import { useTranslation } from "@/features/i18n/use-translation";

import { useQraft } from "../use-qraft";
import { QraftBatch } from "./qraft-batch";
import { QraftCode } from "./qraft-code";
import { QraftExplainer } from "./qraft-explainer";
import { QraftPayload } from "./qraft-payload";
import { QraftPreview } from "./qraft-preview";
import { QraftStyle } from "./qraft-style";

/**
 * Qraft: a local code desk.
 *
 * The default QR is in the server HTML, because the core renders it without a
 * DOM. Every other Code Family loads on the client when the user asks for it.
 */
export const QraftPage = () => {
  const { t } = useTranslation();
  const controller = useQraft();

  return (
    <Container className="flex flex-col py-10 sm:py-14">
      <header className="flex flex-col gap-4">
        <Ransom as="h1" className="text-[clamp(3.5rem,9vw,6.5rem)]" fit>
          Qraft
        </Ransom>
        <p className="text-fg max-w-[56ch] text-[clamp(1.25rem,1.5vw,1.5rem)] leading-[1.35] font-medium text-pretty">
          {t("qraftPromise")}
        </p>
        <p className="text-muted-fg max-w-[68ch] text-base/6">
          {t("qraftIntro")}
        </p>
      </header>

      <div className="border-rule mt-8 border-t-[3px] sm:mt-10" />

      <div className="mt-6 grid min-w-0 gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(22rem,30rem)]">
        <div className="order-2 flex min-w-0 flex-col gap-8 lg:order-1">
          <QraftPayload controller={controller} />
          <QraftCode controller={controller} />
          <QraftStyle controller={controller} />
        </div>
        <div className="order-1 min-w-0 self-start lg:sticky lg:top-4 lg:order-2">
          <QraftPreview controller={controller} />
        </div>
      </div>

      <div className="border-rule mt-12 border-t-[3px] pt-8">
        <QraftBatch controller={controller} />
      </div>

      <QraftExplainer />
    </Container>
  );
};
