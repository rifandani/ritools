import { RegistryContext } from "@effect/atom-react";
import { ScriptOnce } from "@tanstack/react-router";
import { use, useEffect } from "react";

import {
  COLOR_MODE_STORAGE_KEY,
  PREFERS_DARK,
} from "@/features/color-mode/color-mode";
import { appliedColorModeAtom } from "@/features/color-mode/color-mode.atoms";

/**
 * The server cannot see the picked color mode (it lives in `localStorage`), so
 * this inline script sets the `<html>` class before first paint. Without it, an
 * SSR page flashes light before hydration in dark mode. The value is JSON, as
 * `colorModeAtom` stores it; an unreadable value counts as `auto`.
 */
export const ColorModeScript = () => (
  <ScriptOnce>
    {`try{var m;try{m=JSON.parse(localStorage.getItem(${JSON.stringify(COLOR_MODE_STORAGE_KEY)}))}catch(e){}var d=m==="dark"||(m!=="light"&&matchMedia(${JSON.stringify(PREFERS_DARK)}).matches);document.documentElement.classList.add(d?"dark":"light")}catch(e){}`}
  </ScriptOnce>
);

/**
 * The only code that sets the color-mode class on `<html>` after hydration. It subscribes
 * to the registry directly, not through a hook: a hook reads the server value
 * (`auto`) while it hydrates and would flash the wrong class for one commit.
 */
export const ColorModeSync = () => {
  const registry = use(RegistryContext);
  useEffect(
    () =>
      registry.subscribe(
        appliedColorModeAtom,
        (mode) => {
          const { classList } = document.documentElement;
          classList.remove(mode === "dark" ? "light" : "dark");
          classList.add(mode);
        },
        { immediate: true }
      ),
    [registry]
  );
  return null;
};
