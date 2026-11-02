"use client";

import { useSyncExternalStore } from "react";

import { Container } from "@/core/components/ui/container";
import { useTranslation } from "@/features/i18n/use-translation";
import { UnmaskExplainer } from "@/features/unmask/components/unmask-explainer";
import { UnmaskStateGallery } from "@/features/unmask/components/unmask-state-gallery";
import { UnmaskWorkspace } from "@/features/unmask/components/unmask-workspace";
import { useUnmask } from "@/features/unmask/use-unmask";

interface PageFlags {
  readonly ready: boolean;
  readonly showStates: boolean;
}

const SERVER_FLAGS: PageFlags = { ready: false, showStates: false };
let clientFlags: PageFlags | null = null;

const noopSubscribe = () => () => {
  // No external store changes after hydration.
};
const readClientFlags = (): PageFlags => {
  clientFlags ??= {
    ready: true,
    showStates:
      import.meta.env.DEV &&
      new URLSearchParams(window.location.search).get("states") === "1",
  };
  return clientFlags;
};
const readServerFlags = (): PageFlags => SERVER_FLAGS;

/** One session holds the shared settings, image list, and open editor. */
export const UnmaskPage = () => {
  const { t } = useTranslation();
  const controller = useUnmask();
  const { ready, showStates } = useSyncExternalStore(
    noopSubscribe,
    readClientFlags,
    readServerFlags
  );

  if (showStates && ready) {
    return (
      <Container className="flex max-w-none min-w-0 flex-col py-8 sm:py-10">
        <UnmaskStateGallery />
      </Container>
    );
  }

  return (
    <Container className="flex max-w-none min-w-0 flex-col gap-y-10 py-8 sm:py-10">
      <h1 className="sr-only">{t("unmaskName")}</h1>

      <UnmaskWorkspace controller={controller} />

      <output aria-live="polite" className="sr-only">
        {controller.announcement}
      </output>
      <UnmaskExplainer />
    </Container>
  );
};
