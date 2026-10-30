import { useAtomSet } from "@effect/atom-react";
import { useRef } from "react";
import { flushSync } from "react-dom";
import { HiMoon, HiSun } from "react-icons/hi2";

import { Button } from "@/core/components/ui/button";
import type { AppliedColorMode } from "@/features/color-mode/color-mode";
import { colorModeAtom } from "@/features/color-mode/color-mode.atoms";
import { useTranslation } from "@/features/i18n/use-translation";

/** Kept in step with the sweep rules in globals.css. */
const SWEEP_DURATION_MS = 500;

/**
 * Radius of the smallest circle centred on (x, y) that still covers the
 * viewport, so the sweep always finishes on a fully repainted page.
 */
const coverRadius = (x: number, y: number) =>
  Math.hypot(
    Math.max(x, window.innerWidth - x),
    Math.max(y, window.innerHeight - y)
  );

const prefersReducedMotion = () =>
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/** The palette on `<html>`, written by `ColorModeSync` and the inline script. */
const appliedColorMode = (): AppliedColorMode =>
  document.documentElement.classList.contains("dark") ? "dark" : "light";

const nextColorMode = (): AppliedColorMode =>
  appliedColorMode() === "dark" ? "light" : "dark";

/**
 * Two-state theme switch. The first paint has no picked mode, so both icons
 * ship and the `dark` class on `<html>` picks one — that keeps the markup
 * identical on server and client instead of forcing a mount guard.
 *
 * A press runs through the View Transitions API: the incoming theme is
 * revealed by a circle growing out of the button, so the new palette reads as
 * something the user poured onto the page from the control they pressed.
 *
 * React's `<ViewTransition>` component only fires for navigations, Suspense
 * reveals and `useDeferredValue`, while the color mode is a class on `<html>`
 * written by `ColorModeSync`. So the browser API is driven directly and the
 * write is flushed, otherwise the browser snapshots the DOM before the class
 * has moved.
 * @see https://developer.mozilla.org/docs/Web/API/View_Transition_API
 */
export interface ThemeToggleProps {
  readonly className?: string;
}

export const ThemeToggle = ({ className }: ThemeToggleProps) => {
  const { t } = useTranslation();
  const setColorMode = useAtomSet(colorModeAtom);
  const ref = useRef<HTMLButtonElement>(null);

  const sweep = async (button: HTMLButtonElement, mode: AppliedColorMode) => {
    const { top, left, width, height } = button.getBoundingClientRect();
    const x = left + width / 2;
    const y = top + height / 2;
    const radius = coverRadius(x, y);

    const transition = document.startViewTransition(() => {
      flushSync(() => setColorMode(mode));
    });

    try {
      await transition.ready;
    } catch {
      // A skipped transition rejects `ready`. The theme has already changed, so
      // there is nothing left to animate.
      return;
    }

    document.documentElement.animate(
      {
        clipPath: [
          `circle(0px at ${x}px ${y}px)`,
          `circle(${radius}px at ${x}px ${y}px)`,
        ],
      },
      {
        duration: SWEEP_DURATION_MS,
        easing: "ease-in-out",
        pseudoElement: "::view-transition-new(root)",
      }
    );
  };

  const toggleColorMode = () => {
    const mode = nextColorMode();
    const button = ref.current;

    // No support, no button geometry, or a user who asked for stillness: the
    // theme still changes, it just changes at once.
    if (!(button && document.startViewTransition) || prefersReducedMotion()) {
      setColorMode(mode);
      return;
    }

    void sweep(button, mode);
  };

  return (
    <Button
      ref={ref}
      intent="outline"
      size="sq-md"
      aria-label={t("toggleTheme")}
      className={className}
      onPress={toggleColorMode}
    >
      <HiSun aria-hidden="true" data-slot="icon" className="dark:hidden" />
      <HiMoon
        aria-hidden="true"
        data-slot="icon"
        className="hidden dark:block"
      />
    </Button>
  );
};
