import type { ComponentProps } from "react";
import type { Toaster, ToastClassnames } from "sonner";

import type { ColorMode } from "@/features/color-mode/color-mode";

type ToasterProps = ComponentProps<typeof Toaster>;

/**
 * A toast is a printed note, like the `Note` family: white stock or carbon
 * raised, a 2px rule, square corners, no shadow and no blur. A status tone
 * arrives as its wash and its wash ink, never as a fill hue alone.
 */
const toastClassNames: ToastClassnames = {
  toast:
    "pointer-events-auto relative flex w-full! items-start gap-x-3 border-2 border-rule bg-overlay p-3 text-overlay-fg sm:p-4",
  content: "min-w-0 flex-1",
  title: "text-sm/5 font-bold tracking-[0.05em] uppercase [font-stretch:87.5%]",
  description: "mt-1 text-sm/6",
  // The default Sonner glyphs are round. The words carry the state instead.
  icon: "hidden",
  closeButton:
    "bracket absolute end-1 top-1 grid size-8 shrink-0 cursor-pointer place-content-center border-2 border-transparent text-muted-fg outline-hidden hover:border-current hover:text-fg focus-visible:border-current focus-visible:text-fg",
  actionButton:
    "mark mt-2 inline-flex min-h-9 cursor-pointer items-center border-2 border-primary px-3 text-xs font-bold tracking-[0.05em] text-primary-ink uppercase outline-hidden [font-stretch:87.5%]",
  cancelButton:
    "mark mt-2 inline-flex min-h-9 cursor-pointer items-center border-2 border-input px-3 text-xs font-bold tracking-[0.05em] uppercase outline-hidden [font-stretch:87.5%]",
  error: "border-danger-subtle-fg bg-danger-subtle text-danger-subtle-fg",
  success: "border-success-subtle-fg bg-success-subtle text-success-subtle-fg",
  warning: "border-warning-subtle-fg bg-warning-subtle text-warning-subtle-fg",
  info: "border-rule bg-info-subtle text-info-subtle-fg",
  loading: "border-rule bg-overlay text-overlay-fg",
  default: "border-rule bg-overlay text-overlay-fg",
};

const toasterDefaults = {
  // Sonner's phone rule sets `width: 100%` but keeps the desktop
  // `--offset-right`, so a 390px viewport puts the right edge at 406px. The
  // forced utilities cap the width at the viewport and restore a 16px inset.
  className:
    "toaster group max-sm:right-4! max-sm:left-4! max-sm:w-[min(var(--width),calc(100vw-2rem))]! max-sm:p-0!",
  duration: 3000,
  // A note at the top edge clears the sticky Squeeze Actions bar, which is the
  // primary action on the one Tool that runs a Batch.
  position: "top-center",
  offset: { top: 76 },
  mobileOffset: { top: 72 },
  toastOptions: {
    classNames: toastClassNames,
    unstyled: true,
  },
} satisfies ToasterProps;

/** Props of the app's one `Toaster`. In `auto` mode, the system picks the toast theme. */
export const toasterProps = (colorMode: ColorMode): ToasterProps => ({
  ...toasterDefaults,
  theme: colorMode === "auto" ? "system" : colorMode,
});
