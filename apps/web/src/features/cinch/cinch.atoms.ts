import { Atom } from "effect/reactivity";

import { DEFAULT_SETTINGS } from "@/features/cinch/cinch";
import type {
  BatchItem,
  CinchSettings,
  ItemResult,
} from "@/features/cinch/cinch";

/**
 * The state of one Cinch page. It is all in memory: a Batch does not survive
 * a reload, and no video ever leaves the device.
 */

/** The settings the whole Batch runs under. */
export const settingsAtom = Atom.make<CinchSettings>(DEFAULT_SETTINGS);

/** The Batch, keyed by id. A `Map` keeps the order the user gave. */
export const batchAtom = Atom.make<ReadonlyMap<string, BatchItem>>(new Map());

/** The result of each video, keyed by its Batch Item id. */
export const resultsAtom = Atom.make<ReadonlyMap<string, ItemResult>>(
  new Map()
);

/**
 * How far each video in the current run is, from 0 to 1, keyed by id.
 * Several videos encode at once. An id leaves the map when its video ends.
 */
export const workingAtom = Atom.make<ReadonlyMap<string, number>>(new Map());
