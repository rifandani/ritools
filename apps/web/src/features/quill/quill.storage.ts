import type { Effect } from "effect";

import type { Body, Entry, Mode, Mutation, QuillError } from "./quill";

export interface Storage {
  readonly list: () => Effect.Effect<readonly unknown[], QuillError>;
  readonly snapshot: (
    entries: readonly Entry[]
  ) => Effect.Effect<readonly unknown[], QuillError>;
  readonly read: (id: string) => Effect.Effect<unknown, QuillError>;
  readonly commit: (mutation: Mutation) => Effect.Effect<void, QuillError>;
  readonly recover: () => Effect.Effect<Uint8Array, QuillError>;
}
export interface Resources {
  readonly id: () => string;
  readonly now: () => number;
  readonly preferences: () => {
    readonly selected: string | null;
    readonly mode: Mode;
  };
  readonly remember: (selected: string | null, mode: Mode) => void;
  readonly persist: () => Effect.Effect<boolean, QuillError>;
}
export const emptyBody = (entry: Entry, source = ""): Body => ({
  version: 1,
  id: entry.id,
  source,
  revision: entry.revision,
  original: null,
  originalSource: null,
  copies: [],
});
