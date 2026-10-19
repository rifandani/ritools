import { Schema } from "effect";
import { Atom, AtomRegistry } from "effect/reactivity";
import { describe, expect, it } from "vitest";

import { dehydrateAtoms, hydrateAtoms } from "@/core/runtime/atom-hydration";

const pickedDeckAtom = Atom.make("starter").pipe(
  Atom.serializable({ key: "pickedDeck", schema: Schema.String })
);
const localOnlyAtom = Atom.make(0);

describe("dehydrateAtoms / hydrateAtoms", () => {
  it("carries serializable atom values from the server registry to the browser registry", () => {
    const server = AtomRegistry.make();
    server.mount(pickedDeckAtom);
    server.set(pickedDeckAtom, "dragons");

    // The router serializes the dehydrated state into the streamed HTML: only
    // what survives JSON reaches the browser.
    const html = JSON.stringify(dehydrateAtoms(server));
    const wire = JSON.parse(html);
    const browser = AtomRegistry.make();
    hydrateAtoms(browser, wire);

    expect(browser.get(pickedDeckAtom)).toBe("dragons");
  });

  it("leaves atoms that are not serializable out", () => {
    const server = AtomRegistry.make();
    server.mount(localOnlyAtom);
    server.set(localOnlyAtom, 7);

    expect(dehydrateAtoms(server)).toEqual([]);
  });
});
