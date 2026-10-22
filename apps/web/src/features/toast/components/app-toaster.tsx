import { useAtomValue } from "@effect/atom-react";
import { Toaster } from "sonner";

import { useTranslation } from "@/features/i18n/use-translation";
import { toasterPropsAtom } from "@/features/toast/toast.atoms";

/** The app's one `Toaster`. Call sonner's `toast()` from anywhere to show one. */
export const AppToaster = () => {
  const props = useAtomValue(toasterPropsAtom);
  const { t } = useTranslation();

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
