import { Effect } from "effect";
import { Atom } from "effect/reactivity";

import { readControls } from "./redline.controls";
import type { Controls } from "./redline.controls";
import { loadControls, saveControls } from "./redline.preferences.browser";

/** Wiring only: preference validation lives in the tested Controls module. */
const serverControls = readControls(null, false);

export const controlsAtom = Atom.writable<Controls, Controls>(
  () => Effect.runSync(loadControls),
  (context, controls) => {
    context.setSelf(controls);
    Effect.runSync(saveControls(controls));
  }
).pipe(Atom.withServerValue(() => serverControls));
