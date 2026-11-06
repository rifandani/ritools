export interface TabPosition {
  readonly id: string;
  readonly side: "before" | "after";
}

export const reorderTabs = (
  ids: readonly string[],
  moving: string,
  target: TabPosition
): readonly string[] => {
  const movingIndex = ids.indexOf(moving);
  if (moving === target.id || movingIndex === -1 || !ids.includes(target.id)) {
    return ids;
  }
  const remaining = ids.filter((id) => id !== moving);
  const index =
    remaining.indexOf(target.id) + (target.side === "after" ? 1 : 0);
  return index === movingIndex
    ? ids
    : [...remaining.slice(0, index), moving, ...remaining.slice(index)];
};
