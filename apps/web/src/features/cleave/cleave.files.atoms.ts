import { Effect, Semaphore } from "effect";
import { Atom } from "effect/reactivity";

import {
  closeComparison,
  emptyFiles,
  newComparison,
  reorderComparisons,
} from "./cleave.files";
import type { ComparisonFile, ComparisonPosition, Files } from "./cleave.files";
import { indexedDbFiles } from "./cleave.indexed-db";
import type { FileStorage } from "./cleave.indexed-db";

export type FileCommand =
  | { readonly type: "load" | "add" | "retry" }
  | { readonly type: "select" | "close"; readonly id: string }
  | {
      readonly type: "reorder";
      readonly id: string;
      readonly target: ComparisonPosition;
    }
  | { readonly type: "edit"; readonly file: ComparisonFile };

export const makeFileAtoms = (
  storage: FileStorage = indexedDbFiles(),
  id: () => string = () => crypto.randomUUID()
) => {
  const files = Atom.make(emptyFiles).pipe(Atom.keepAlive);
  const ready = Atom.make(false).pipe(Atom.keepAlive);
  const failure = Atom.make<"read" | "write" | null>(null).pipe(Atom.keepAlive);
  const saving = Atom.make(false).pipe(Atom.keepAlive);
  const queue = Semaphore.makeUnsafe(1);
  let saved: Files = emptyFiles;
  let pending = 0;
  const command = Atom.fn<FileCommand>()(
    (input, get) =>
      Effect.gen(function* () {
        pending += 1;
        get.set(saving, true);
        yield* Effect.gen(function* () {
          if (input.type === "load" && get(ready)) {
            return;
          }
          if (!get(ready)) {
            const loaded = yield* Effect.result(storage.load());
            if (loaded._tag === "Failure") {
              get.set(failure, "read");
              return;
            }
            saved = loaded.success;
            get.set(files, saved);
            get.set(ready, true);
            if (
              saved.entries.length ||
              saved.nextNumber > 1 ||
              input.type !== "load"
            ) {
              get.set(failure, null);
              return;
            }
          }
          const current = get(files);
          let next = current;
          switch (input.type) {
            case "load":
            case "add": {
              const file = newComparison(id(), current.nextNumber);
              next = {
                entries: [...current.entries, file],
                selected: file.id,
                nextNumber: current.nextNumber + 1,
              };
              break;
            }
            case "select": {
              if (current.entries.some((entry) => entry.id === input.id)) {
                next = { ...current, selected: input.id };
              }
              break;
            }
            case "close": {
              next = closeComparison(current, input.id);
              break;
            }
            case "reorder": {
              next = reorderComparisons(current, input.id, input.target);
              break;
            }
            case "edit": {
              next = {
                ...current,
                entries: current.entries.map((entry) =>
                  entry.id === input.file.id ? input.file : entry
                ),
              };
              break;
            }
            default: {
              break;
            }
          }
          get.set(files, next);
          const result = yield* Effect.result(storage.save(saved, next));
          if (result._tag === "Failure") {
            get.set(failure, "write");
          } else {
            saved = next;
            get.set(failure, null);
          }
        }).pipe(
          queue.withPermit,
          Effect.ensuring(
            Effect.sync(() => {
              pending -= 1;
              get.set(saving, pending > 0);
            })
          )
        );
      }),
    { concurrent: true }
  ).pipe(Atom.keepAlive);
  return { files, ready, failure, saving, command };
};

export const fileAtoms = makeFileAtoms();
