/* oxlint-disable anti-slop/no-unknown-parameters -- The UI boundary narrows atom promise rejections to the public FolioFailure. */
import { Cause, Effect, Exit } from "effect";

import * as F from "./folio";

export type Reply<K extends F.Response["_tag"]> = Extract<
  F.Response,
  { _tag: K }
>;
export type Tool = "select" | "Highlight" | "Note" | "Ink" | "AddedText";
export type Panel = "pages" | "outline" | "annotations" | "forms" | null;

export const reasonKeys = {
  signed: "folioSignedReason",
  encrypted: "folioEncryptedReason",
  "permission-restricted": "folioPermissionReason",
  xfa: "folioXfaReason",
  "scripted-form": "folioScriptReason",
  "active-content": "folioActiveContentReason",
  tags: "folioTagsReason",
  layers: "folioLayersReason",
  attachments: "folioAttachmentsReason",
  "unsupported-annotation": "folioUnsupportedAnnotationReason",
  "unknown-structure": "folioUnknownReason",
  "unsupported-preservation": "folioUnsupportedPreservationReason",
  "no-pages": "folioNoPages",
  "unsupported-glyph": "folioUnsupportedGlyph",
} as const satisfies Record<F.Reason, string>;

export const errorKeys = {
  "invalid-request": "folioStaleRevision",
  "invalid-pdf": "folioInvalidPdf",
  "no-pages": "folioNoPages",
  "password-required": "folioPassword",
  "wrong-password": "folioWrongPassword",
  "source-rejected": "folioSourceFailed",
  "read-only": "folioPermissionReason",
  "read-only-field": "folioReadOnlyField",
  "unsupported-form": "folioUnsupportedForm",
  "unsupported-glyph": "folioUnsupportedGlyph",
  "unsupported-preservation": "folioUnsupportedPreservationReason",
  "invalid-selection": "folioNoSelection",
  "last-page": "folioLastPage",
  "unknown-page": "folioStaleRevision",
  "unknown-field": "folioStaleRevision",
  "unknown-annotation": "folioStaleRevision",
  "stale-session": "folioSessionLost",
  "stale-revision": "folioStaleRevision",
  "stale-plan": "folioStalePlan",
  cancelled: "folioCancelled",
  "offline-asset-missing": "folioOfflineMissing",
  "resource-limit": "folioMemory",
  "write-failed": "folioWriteFailed",
  "verification-failed": "folioVerifyFailed",
  "worker-lost": "folioSessionLost",
  "session-lost": "folioSessionLost",
} as const satisfies Record<F.FolioErrorCode, string>;

// Atom promises reject with an Effect cause. Read only the typed failure,
// never a parser message or a user-supplied PDF string.
export const uiFailure = (error: unknown): F.FolioFailure => {
  if (error instanceof F.FolioFailure) {
    return error;
  }
  if (Cause.isCause(error)) {
    const found = Cause.findErrorOption(error);
    if (found._tag === "Some" && found.value instanceof F.FolioFailure) {
      return found.value;
    }
  }
  return F.FolioFailure.make({
    requestId: F.RequestId.make("ui"),
    code: "worker-lost",
    sessionAlive: false,
  });
};

export const runLocal = async <A, E>(
  effect: Effect.Effect<A, E>,
  signal?: AbortSignal
) => {
  const exit = await Effect.runPromiseExit(effect, { signal });
  if (Exit.isFailure(exit)) {
    throw exit.cause;
  }
  return exit.value;
};

export const pageSize = (page: F.Page) => {
  const rotated = page.rotation === 90 || page.rotation === 270;
  return {
    width: (rotated ? page.cropBox.height : page.cropBox.width) * page.userUnit,
    height:
      (rotated ? page.cropBox.width : page.cropBox.height) * page.userUnit,
  };
};

export const transformPoint = (
  [a, b, c, d, e, f]: F.Matrix,
  [x, y]: F.Point
): F.Point => [a * x + c * y + e, b * x + d * y + f];
export const transformBox = (matrix: F.Matrix, box: F.Box) => {
  const points = [
    [box.x, box.y],
    [box.x + box.width, box.y],
    [box.x, box.y + box.height],
    [box.x + box.width, box.y + box.height],
  ].map(([x = 0, y = 0]) => transformPoint(matrix, [x, y]));
  const x = Math.min(...points.map((p) => p[0]));
  const y = Math.min(...points.map((p) => p[1]));
  return {
    x,
    y,
    width: Math.max(...points.map((p) => p[0])) - x,
    height: Math.max(...points.map((p) => p[1])) - y,
  };
};

/** Move each selected contiguous block one place; preserve relative order. */
export const movePages = (
  order: readonly F.PageId[],
  selected: readonly F.PageId[],
  direction: "up" | "down"
): F.PageId[] => {
  const result = [...order];
  const set = new Set(selected);
  if (direction === "up") {
    for (let i = 1; i < result.length; i += 1) {
      const id = result[i];
      const previous = result[i - 1];
      if (id && previous && set.has(id) && !set.has(previous)) {
        result.splice(i - 1, 2, id, previous);
      }
    }
  } else {
    for (let i = result.length - 2; i >= 0; i -= 1) {
      const id = result[i];
      const next = result[i + 1];
      if (id && next && set.has(id) && !set.has(next)) {
        result.splice(i, 2, next, id);
      }
    }
  }
  return result;
};

/** Ranges always resolve in source order, without duplicates. */
export const parsePages = (
  input: string,
  pages: readonly F.Page[]
): readonly F.PageId[] | null => {
  const chosen = new Set<number>();
  for (const part of input.split(",")) {
    const match = /^\s*(?<start>\d+)\s*(?:-\s*(?<end>\d+)\s*)?$/u.exec(part);
    if (!match) {
      return null;
    }
    const start = Number(match[1]);
    const end = Number(match[2] ?? match[1]);
    if (start < 1 || end < start || end > pages.length) {
      return null;
    }
    for (let i = start; i <= end; i += 1) {
      chosen.add(i - 1);
    }
  }
  return pages.flatMap((page, i) => (chosen.has(i) ? [page.id] : []));
};
