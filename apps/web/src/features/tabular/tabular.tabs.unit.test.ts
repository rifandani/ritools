import { expect, it } from "@effect/vitest";

import { SessionId } from "./tabular";
import { reorderTabs } from "./tabular.tabs";

it("reorders sessions before and after another tab", () => {
  const first = { id: SessionId.make("first"), label: "First" };
  const second = { id: SessionId.make("second"), label: "Second" };
  const third = { id: SessionId.make("third"), label: "Third" };
  const tabs = [first, second, third];

  expect(
    reorderTabs(tabs, first.id, { id: third.id, side: "after" }).map(
      ({ label }) => label
    )
  ).toEqual([second.label, third.label, first.label]);
  expect(
    reorderTabs(tabs, third.id, { id: first.id, side: "before" }).map(
      ({ label }) => label
    )
  ).toEqual([third.label, first.label, second.label]);
});

it("keeps tabs unchanged when a drag target is invalid", () => {
  const first = { id: SessionId.make("first"), label: "First" };
  const second = { id: SessionId.make("second"), label: "Second" };
  const tabs = [first, second];
  const missing = SessionId.make("missing");

  expect(reorderTabs(tabs, missing, { id: second.id, side: "after" })).toBe(
    tabs
  );
  expect(reorderTabs(tabs, first.id, { id: missing, side: "before" })).toBe(
    tabs
  );
  expect(reorderTabs(tabs, first.id, { id: first.id, side: "after" })).toBe(
    tabs
  );
});
