import { Effect } from "effect";
import { Atom } from "effect/reactivity";

import { readControls } from "./cleave.controls";
import type { Controls } from "./cleave.controls";
import { loadControls, saveControls } from "./cleave.preferences.browser";

/** Wiring only: preference validation lives in the tested Controls module. */
const serverControls = readControls(null, false);

export const controlsAtom = Atom.writable<Controls, Controls>(
  () => Effect.runSync(loadControls),
  (context, controls) => {
    context.setSelf(controls);
    Effect.runSync(saveControls(controls));
  }
).pipe(Atom.withServerValue(() => serverControls));
