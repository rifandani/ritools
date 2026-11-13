"use client";

import { useSyncExternalStore } from "react";

import { Container } from "@/core/components/ui/container";
import { EaselExplainer } from "@/features/easel/components/easel-explainer";
import { EaselStateGallery } from "@/features/easel/components/easel-state-gallery";
import { EaselWorkspace } from "@/features/easel/components/easel-workspace";
import { useEasel } from "@/features/easel/use-easel";
import { useTranslation } from "@/features/i18n/use-translation";

let showStates: boolean | null = null;

const noopSubscribe = () => () => {
  // No external store changes after hydration.
};
const readClient = (): boolean => {
  showStates ??=
    import.meta.env.DEV &&
    new URLSearchParams(window.location.search).get("states") === "1";
  return showStates;
};
const readServer = (): boolean => false;

/** One session holds the File Tabs and the editor of the active one. */
export const EaselPage = () => {
  const { t } = useTranslation();
  const controller = useEasel();
  const states = useSyncExternalStore(noopSubscribe, readClient, readServer);

  if (states) {
    return (
      <Container className="flex max-w-none min-w-0 flex-col py-8 sm:py-10">
        <EaselStateGallery />
      </Container>
    );
  }

  return (
    <Container className="flex max-w-none min-w-0 flex-col gap-y-10 py-8 sm:py-10">
      <h1 className="sr-only">{t("easelName")}</h1>
      <EaselWorkspace controller={controller} />
      <output aria-live="polite" className="sr-only">
        {controller.announcement}
      </output>
      <EaselExplainer />
    </Container>
  );
};
