import { Atom } from "effect/reactivity";

import { storageRuntime } from "@/core/runtime/client";
import type { AppliedColorMode } from "@/features/color-mode/color-mode";
import {
  COLOR_MODE_STORAGE_KEY,
  ColorMode,
  PREFERS_DARK,
  resolveColorMode,
} from "@/features/color-mode/color-mode";

/**
 * The color mode the user picked, persisted in `localStorage`. The server
 * cannot read it, so it renders `auto`; `ColorModeScript` sets the real class
 * before first paint.
 */
export const colorModeAtom = Atom.kvs({
  defaultValue: () => "auto" as const,
  key: COLOR_MODE_STORAGE_KEY,
  runtime: storageRuntime,
  schema: ColorMode,
}).pipe(Atom.withServerValue(() => "auto" as const));

/** Whether the system prefers dark. It follows changes while it is read. */
const prefersDarkAtom = Atom.make((get) => {
  const media = matchMedia(PREFERS_DARK);
  const onChange = () => get.setSelf(media.matches);
  media.addEventListener("change", onChange);
  get.addFinalizer(() => media.removeEventListener("change", onChange));
  return media.matches;
});

/**
 * The class `<html>` carries: the picked mode, with `auto` resolved. The server
 * knows neither the pick nor the system preference, so a server render reads
 * `light`; `ColorModeScript` sets the real class before first paint.
 */
export const appliedColorModeAtom = Atom.make((get) =>
  resolveColorMode(get(colorModeAtom), get(prefersDarkAtom))
).pipe(Atom.withServerValue((): AppliedColorMode => "light"));
