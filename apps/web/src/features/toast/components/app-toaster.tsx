import { useAtomValue } from "@effect/atom-react";
import { useEffect, useEffectEvent } from "react";
import { toast, Toaster } from "sonner";

import {
  reportLibraryLoadFailure,
  subscribeLibraryFailures,
} from "@/core/libs/library-load";
import { useTranslation } from "@/features/i18n/use-translation";
import { toasterPropsAtom } from "@/features/toast/toast.atoms";

/** The app's one `Toaster`. Call sonner's `toast()` from anywhere to show one. */
export const AppToaster = () => {
  const props = useAtomValue(toasterPropsAtom);
  const { t } = useTranslation();

  const showFailure = useEffectEvent(({ library }: { library: string }) => {
    toast.error(t("libraryLoadFailed", { library }), {
      id: `library-load:${library}`,
      action: { label: t("reload"), onClick: () => window.location.reload() },
    });
  });
  // oxlint-disable-next-line react-doctor/effect-needs-cleanup -- Every queued timer is tracked and cleared by the effect cleanup below.
  useEffect(() => {
    const unsubscribe = subscribeLibraryFailures(showFailure);
    const timers = new Set<ReturnType<typeof setTimeout>>();
    const preloadError = (event: Event) => {
      // SAFETY: Vite dispatches this event with its rejected import as `payload`.
      const failure = event as Event & { payload: unknown };
      // Let named application boundaries handle the same rejection first.
      const timer = setTimeout(() => {
        timers.delete(timer);
        reportLibraryLoadFailure("Tool code", failure.payload);
      }, 0);
      timers.add(timer);
    };
    window.addEventListener("vite:preloadError", preloadError);
    return () => {
      unsubscribe();
      window.removeEventListener("vite:preloadError", preloadError);
      for (const timer of timers) {
        clearTimeout(timer);
      }
    };
  }, []);

  return (
    <Toaster
      {...props}
      toastOptions={{
        ...props.toastOptions,
        closeButtonAriaLabel: t("close"),
      }}
    />
  );
};
