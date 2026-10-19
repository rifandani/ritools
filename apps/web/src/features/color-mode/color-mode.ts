import { Schema } from "effect";

/** Color mode the user can pick - `auto` follows the OS preference. */
export const ColorMode = Schema.Literals(["auto", "light", "dark"]);
export type ColorMode = typeof ColorMode.Type;

/** A color mode with `auto` resolved: the class on `<html>`. */
export type AppliedColorMode = Exclude<ColorMode, "auto">;

/** Key the picked color mode is persisted under in `localStorage`, as JSON. */
export const COLOR_MODE_STORAGE_KEY = "app-color-mode";

/** The media query of a system that prefers dark. */
export const PREFERS_DARK = "(prefers-color-scheme: dark)";

/** In `auto` mode, the applied mode is the mode that the system prefers. */
export const resolveColorMode = (
  mode: ColorMode,
  prefersDark: boolean
): AppliedColorMode => {
  if (mode !== "auto") {
    return mode;
  }
  return prefersDark ? "dark" : "light";
};
