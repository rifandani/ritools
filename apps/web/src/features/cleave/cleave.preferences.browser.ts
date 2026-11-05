import { Effect } from "effect";

import { readControls } from "./cleave.controls";
import type { Controls } from "./cleave.controls";

const CONTROL_KEY = "cleave-controls-v1";

export const loadControls = Effect.sync(() => {
  try {
    return readControls(
      localStorage.getItem(CONTROL_KEY),
      matchMedia("(max-width: 767px)").matches
    );
  } catch {
    return readControls(null, matchMedia("(max-width: 767px)").matches);
  }
});
export const saveControls = (controls: Controls) =>
  Effect.sync(() => {
    try {
      localStorage.setItem(CONTROL_KEY, JSON.stringify(controls));
    } catch {
      /* Storage can be refused. The controls still work in memory. */
    }
  });
