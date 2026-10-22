import { Atom } from "effect/reactivity";

import type {
  BatchItem,
  ItemResult,
  SqueezeSettings,
} from "@/features/squeeze/squeeze";
import { DEFAULT_SETTINGS } from "@/features/squeeze/squeeze";

/**
 * The state of one Squeeze page. It is all in memory: a Batch does not survive
 * a reload, and no image ever leaves the device.
 */

/** The settings the whole Batch runs under. */
export const settingsAtom = Atom.make<SqueezeSettings>(DEFAULT_SETTINGS);

/** The Batch, keyed by id. A `Map` keeps the order the user gave. */
export const batchAtom = Atom.make<ReadonlyMap<string, BatchItem>>(new Map());

/** The result of each image, keyed by its Batch Item id. */
export const resultsAtom = Atom.make<ReadonlyMap<string, ItemResult>>(
  new Map()
);

/** Whether a run is in flight. */
export const runningAtom = Atom.make(false);

/** No row is working. One frozen value, so hydration has a cached snapshot. */
const NO_WORKING: ReadonlySet<string> = new Set<string>();

/** The rows a run is working on right now. A row outside this set is queued. */
export const workingAtom = Atom.make<ReadonlySet<string>>(NO_WORKING).pipe(
  Atom.withServerValue(() => NO_WORKING)
);
