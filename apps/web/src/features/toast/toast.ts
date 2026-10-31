import type { ComponentProps } from "react";
import type { Toaster, ToastClassnames } from "sonner";

import type { ColorMode } from "@/features/color-mode/color-mode";

type ToasterProps = ComponentProps<typeof Toaster>;

/**
 * A toast is a printed note, like the `Note` family: white stock or carbon
 * raised, a 2px rule, square corners, no shadow and no blur. The words lead:
 * a title, an optional description, and an action on its own row. A status
 * tone arrives as its wash and its wash ink, never as a fill hue alone.
 */
const toastClassNames: ToastClassnames = {
  toast:
    "pointer-events-auto relative grid w-full! grid-cols-[minmax(0,1fr)_auto] items-start gap-y-2 border-2 border-rule bg-overlay p-3 text-overlay-fg has-[>[data-close-button]]:gap-x-3 sm:p-4",
  content: "col-start-1 row-start-1 min-w-0",
  title: "text-sm/5 font-bold tracking-[0.05em] uppercase [font-stretch:87.5%]",
  description: "mt-1 text-sm/6 text-pretty",
  // The default Sonner glyphs are round. The words carry the state instead.
  icon: "hidden",
  // An inner 32px mark in the note's top-right corner. It sits in the grid,
  // not on top of the words, so a long title never runs under it. The `!`
  // weights keep Sonner's dark theme from painting a black chip behind it.
  closeButton:
    "bracket relative col-start-2 row-start-1 grid size-8 shrink-0 cursor-pointer place-content-center border-2 border-transparent! bg-transparent! text-muted-fg! outline-hidden hover:border-current! hover:text-fg! focus-visible:text-fg! active:bg-fg! active:text-bg!",
  // Sonner's action and cancel are plain buttons, so they take the mark
  // states through native pseudo-classes instead of React Aria data.
  actionButton:
    "mark bracket relative col-start-1 row-start-2 inline-flex min-h-9 cursor-pointer items-center justify-self-start px-3 text-xs font-bold tracking-[0.05em] uppercase outline-hidden [font-stretch:87.5%] [--mark-fill:var(--primary)] [--mark-hover-line:var(--primary)] [--mark-ink:var(--primary-ink)] [--mark-line:var(--primary)] [--mark-on-fill:var(--primary-fg)] [--mark-weight:3px] hover:bg-wash-red hover:shadow-[inset_0_0_0_2px_var(--primary)] focus-visible:bg-wash-red active:translate-y-px active:bg-primary active:text-primary-fg active:shadow-none sm:min-h-8",
  cancelButton:
    "mark bracket relative col-start-2 row-start-2 inline-flex min-h-9 cursor-pointer items-center justify-self-end px-3 text-xs font-bold tracking-[0.05em] uppercase outline-hidden [font-stretch:87.5%] [--mark-fill:var(--fg)] [--mark-hover-line:var(--fg)] [--mark-line:var(--input)] [--mark-on-fill:var(--bg)] hover:shadow-[inset_0_0_0_2px_var(--fg)] focus-visible:shadow-[inset_0_0_0_2px_var(--fg)] active:translate-y-px active:bg-fg active:text-bg active:shadow-none sm:min-h-8",
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
  // Sonner sets a system font on the toaster, and its phone rule sets
  // `width: 100%` but keeps the desktop `--offset-right`, so a 390px viewport
  // puts the right edge at 406px. The forced utilities keep the brand face and
  // cap the width at the viewport with a 16px inset. Sonner's own CSS pins the
  // toaster above every overlay. An open menu, a popover, or a dialog is the
  // active layer, so the ambient note sits under them instead of covering a
  // menu head.
  className:
    "toaster group z-40! font-sans! max-sm:right-4! max-sm:left-4! max-sm:w-[calc(100vw-2rem)]! max-sm:p-0!",
  duration: 3000,
  // Printed notes never overlap. Sonner's collapsed stack shrinks the older
  // notes to the front note's height, so two notes of different heights bleed
  // through each other. Every note keeps its whole frame instead.
  expand: true,
  // The note prints in the bottom-right corner, 16px inside the viewport, and
  // stacks upward, so the newest note stays closest to the thumb.
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
