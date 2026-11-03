import type { Entry } from "./quill";

export interface TreeDrop {
  readonly key: string;
  readonly position: "on" | "before" | "after";
}

/**
 * Where a new Library entry sits in the tree.
 * `anchor` is the row that was used. A new child of a folder (`parent` equals
 * `anchor`) is placed first under that folder. A sibling is placed directly
 * after the anchor. No anchor appends the entry.
 */
export interface TreePlacement {
  readonly id: string;
  readonly anchor: string | null;
  readonly parent: string | null;
}

const sameOrder = (left: readonly string[], right: readonly string[]) =>
  left.length === right.length &&
  left.every((id, index) => id === right[index]);

/**
 * Keeps a saved row order, drops missing ids, and appends ids that are new.
 * A placement puts one new id under or after its anchor.
 */
export const orderWith = (
  ids: readonly string[],
  previous: readonly string[],
  placement?: TreePlacement
): readonly string[] => {
  const known = new Set(ids);
  const next = previous.filter((id) => known.has(id));
  const seen = new Set(next);
  for (const id of ids) {
    if (!seen.has(id) && id !== placement?.id) {
      next.push(id);
      seen.add(id);
    }
  }
  if (!placement || !known.has(placement.id)) {
    return sameOrder(next, previous) ? previous : next;
  }
  const without = next.filter((id) => id !== placement.id);
  if (placement.anchor && placement.parent === placement.anchor) {
    const placed = [placement.id, ...without];
    return sameOrder(placed, previous) ? previous : placed;
  }
  const index = placement.anchor ? without.indexOf(placement.anchor) : -1;
  const placed =
    index < 0
      ? [...without, placement.id]
      : [
          ...without.slice(0, index + 1),
          placement.id,
          ...without.slice(index + 1),
        ];
  return sameOrder(placed, previous) ? previous : placed;
};

/**
 * Finds the folder that receives dragged Library entries.
 * A drop on a folder moves into that folder. A drop between rows moves into
 * the parent of the row. Returns `null` for the root and `undefined` when the
 * drop is not a move: an unknown target, a drop on a document, a folder into
 * itself or its descendants, or entries that are already in that folder.
 */
export const dropParent = (
  entries: readonly Entry[],
  ids: ReadonlySet<string>,
  drop: TreeDrop
): string | null | undefined => {
  const byId = new Map(
    entries.flatMap((entry) => (entry.trash ? [] : [[entry.id, entry]]))
  );
  const target = byId.get(drop.key);
  if (!target || !ids.size) {
    return undefined;
  }
  if (drop.position === "on" && target.kind !== "folder") {
    return undefined;
  }
  const parent = drop.position === "on" ? target.id : target.parent;
  const visited = new Set<string>();
  for (
    let cursor = parent;
    cursor !== null && !visited.has(cursor);
    cursor = byId.get(cursor)?.parent ?? null
  ) {
    if (ids.has(cursor)) {
      return undefined;
    }
    visited.add(cursor);
  }
  return [...ids].every((id) => byId.get(id)?.parent === parent)
    ? undefined
    : parent;
};
