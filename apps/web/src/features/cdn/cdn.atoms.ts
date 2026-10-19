import { Atom } from "effect/reactivity";

import { appRuntime } from "@/core/runtime/client";
import { CdnClient } from "@/features/cdn/cdn.service";

/**
 * One CDN file per URL. Components read it with `useAtomValue` and get an
 * `AsyncResult`; `toCdnFile` from `@/core/utils/dom` turns the blob into a `File`.
 */
export const cdnFileAtom = Atom.family((url: string) =>
  appRuntime.atom(CdnClient.use((cdn) => cdn.getFile(url)))
);
