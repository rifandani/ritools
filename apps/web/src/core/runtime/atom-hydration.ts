import { Schema } from "effect";
import type { AtomRegistry } from "effect/reactivity";
import { Hydration } from "effect/reactivity";

/**
 * Dehydrated atoms as plain JSON. `Atom.serializable` already encodes each value
 * with its schema; this schema checks that and gives TanStack Start a type it
 * can prove serializable.
 */
const DehydratedAtoms = Schema.Array(
  Schema.Struct({
    "~effect/reactivity/Hydration/DehydratedAtom": Schema.Literal(true),
    dehydratedAt: Schema.Number,
    key: Schema.String,
    value: Schema.Json,
  })
);
type DehydratedAtoms = typeof DehydratedAtoms.Type;

/**
 * The resolved `Atom.serializable` atoms of a registry. An atom that is still
 * loading is left out and loads again in the browser.
 */
export const dehydrateAtoms = (
  registry: AtomRegistry.AtomRegistry
): DehydratedAtoms =>
  Schema.decodeUnknownSync(DehydratedAtoms)(Hydration.dehydrate(registry));

/** Preloads dehydrated atom values into a registry before the atoms are read. */
export const hydrateAtoms = (
  registry: AtomRegistry.AtomRegistry,
  atoms: DehydratedAtoms
) => {
  Hydration.hydrate(registry, atoms);
};
