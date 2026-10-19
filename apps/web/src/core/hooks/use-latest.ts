import { useLayoutEffect, useRef } from "react";

/**
 * A Hook that returns the latest value, effectively avoiding the closure problem.
 *
 * The ref is written in a layout effect (not during render) so the hook stays
 * render-pure: readers in effects, event handlers and timers still observe the
 * value committed for the current render.
 */
// fallow-ignore-next-line unused-export -- other hooks import this; those hooks are not app entry points yet
export const useLatest = <T>(value: T) => {
  const ref = useRef(value);
  useLayoutEffect(() => {
    ref.current = value;
  }, [value]);
  return ref;
};
