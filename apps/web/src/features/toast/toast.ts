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
  // The close button is pinned to the top-right corner, so a toast that has one
  // keeps the note text and the action clear of it. `pe-11` is the `size-8`
  // button, its `end-1` inset, and an 8px gap; `sm:pe-12` widens that gap.
  toast:
    "pointer-events-auto relative flex w-full! items-start gap-x-3 border-2 border-rule bg-overlay p-3 text-overlay-fg has-[>[data-close-button]]:pe-11 sm:p-4 sm:has-[>[data-close-button]]:pe-12",
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
  // A status wash is a semi-transparent token, made to sit on a surface. The
  // note is its own surface, so the wash is painted over the base `bg-overlay`.
  // `bg-overlay` alone stays under it, and the note never shows the page through.
  error:
    "border-danger-subtle-fg bg-overlay bg-[linear-gradient(var(--danger-subtle),var(--danger-subtle))] text-danger-subtle-fg",
  success:
    "border-success-subtle-fg bg-overlay bg-[linear-gradient(var(--success-subtle),var(--success-subtle))] text-success-subtle-fg",
  warning:
    "border-warning-subtle-fg bg-overlay bg-[linear-gradient(var(--warning-subtle),var(--warning-subtle))] text-warning-subtle-fg",
  info: "border-rule bg-overlay bg-[linear-gradient(var(--info-subtle),var(--info-subtle))] text-info-subtle-fg",
  loading: "border-rule bg-overlay text-overlay-fg",
  default: "border-rule bg-overlay text-overlay-fg",
};

const toasterDefaults = {
  // Sonner's phone rule sets `width: 100%` but keeps the desktop
  // `--offset-right`, so a 390px viewport puts the right edge at 406px. The
  // forced utilities cap the width at the viewport and restore a 16px inset.
  // Sonner's own CSS pins the toaster above every overlay. An open menu, a
  // popover, or a dialog is the active layer, so the ambient note sits under
  // them instead of covering a menu head.
  className:
    "toaster group z-40! max-sm:right-4! max-sm:left-4! max-sm:w-[min(var(--width),calc(100vw-2rem))]! max-sm:p-0!",
  duration: 3000,
  // Every note sits in the bottom-right corner. The phone rule spans the width,
  // so the inset keeps the same 16px gap on both sides.
  position: "bottom-right",
  offset: { right: 16, bottom: 16 },
  mobileOffset: { left: 16, right: 16, bottom: 16 },
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
