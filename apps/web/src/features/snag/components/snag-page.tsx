"use client";

import { Container } from "@/core/components/ui/container";
import { useAgentActions } from "@/core/hooks/use-agent-actions";
import { SnagExplainer } from "@/features/snag/components/snag-explainer";
import { SnagLinkForm } from "@/features/snag/components/snag-link-form";
import { SnagVideoCard } from "@/features/snag/components/snag-video-card";
import { SNAG_AGENT_ACTIONS } from "@/features/snag/snag.agent";
import type { SnagAgentController } from "@/features/snag/snag.agent";
import { useSnag } from "@/features/snag/use-snag";

/**
 * Snag: one Video Link per submit, and a list of the videos read in this
 * session, newest first. Nothing survives a reload.
 */
export const SnagPage = () => {
  const controller = useSnag();
  const { cards, t } = controller;

  const agentController: SnagAgentController = {
    cards,
    save: controller.save,
    submit: controller.submit,
  };
  useAgentActions(SNAG_AGENT_ACTIONS, agentController);

  return (
    <Container className="flex max-w-none min-w-0 flex-col gap-y-10 py-8 sm:py-10">
      <h1 className="sr-only">{t("snagName")}</h1>

      <SnagLinkForm controller={controller} />

      {cards.length > 0 && (
        <section
          aria-label={t("snagCardsLabel")}
          className="flex flex-col gap-4"
        >
          {cards.map((card) => (
            <SnagVideoCard card={card} controller={controller} key={card.key} />
          ))}
        </section>
      )}

      <output aria-live="polite" className="sr-only">
        {controller.announcement}
      </output>
      <SnagExplainer />
    </Container>
  );
};
