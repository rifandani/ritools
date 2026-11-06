import type { SessionId } from "./tabular";

export interface TabPosition {
  readonly id: SessionId;
  readonly side: "before" | "after";
}

export const reorderTabs = <A extends { readonly id: SessionId }>(
  tabs: readonly A[],
  moving: SessionId,
  target: TabPosition
): readonly A[] => {
  const entry = tabs.find((tab) => tab.id === moving);
  if (
    !entry ||
    moving === target.id ||
    !tabs.some((tab) => tab.id === target.id)
  ) {
    return tabs;
  }
  const remaining = tabs.filter((tab) => tab.id !== moving);
  const index =
    remaining.findIndex((tab) => tab.id === target.id) +
    (target.side === "after" ? 1 : 0);
  return [...remaining.slice(0, index), entry, ...remaining.slice(index)];
};
