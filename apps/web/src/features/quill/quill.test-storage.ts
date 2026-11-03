import { Effect } from "effect";

import { QuillError } from "./quill";
import type { Body, Entry } from "./quill";
import type { Storage } from "./quill.storage";

export const memoryStorage = () => {
  const entries = new Map<string, Entry>();
  const bodies = new Map<string, Body>();
  let failure: QuillError | null = null;
  const storage: Storage = {
    list: () => Effect.sync(() => [...entries.values()]),
    snapshot: (expected) =>
      Effect.gen(function* () {
        if (
          expected.some(
            (entry) => entries.get(entry.id)?.revision !== entry.revision
          )
        ) {
          return yield* new QuillError({ reason: "conflict" });
        }
        return expected.flatMap((entry) =>
          entry.kind === "document"
            ? [structuredClone(bodies.get(entry.id))]
            : []
        );
      }),
    read: (id) => Effect.sync(() => bodies.get(id)),
    commit: (change) =>
      Effect.gen(function* () {
        if (failure) {
          const next = failure;
          failure = null;
          return yield* next;
        }
        for (const guard of change.expected) {
          if ((entries.get(guard.id)?.revision ?? null) !== guard.revision) {
            return yield* new QuillError({ reason: "conflict" });
          }
        }
        for (const id of change.remove) {
          entries.delete(id);
          bodies.delete(id);
        }
        for (const entry of change.entries) {
          entries.set(entry.id, structuredClone(entry));
        }
        for (const body of change.bodies) {
          bodies.set(body.id, structuredClone(body));
        }
      }),
    recover: () =>
      Effect.sync(() =>
        new TextEncoder().encode(
          JSON.stringify({
            entries: [...entries.values()],
            bodies: [...bodies.values()],
          })
        )
      ),
  };
  return Object.assign(storage, {
    failNext: (reason: QuillError["reason"]) => {
      failure = new QuillError({ reason });
    },
  });
};
