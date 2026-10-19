import { describe, expect, it } from "@effect/vitest";
import { Effect } from "effect";
import { AtomRegistry } from "effect/reactivity";
import { vi } from "vitest";

import { ServerFnError } from "@/core/runtime/server-fn";
import { localeAtom, selectLocaleAtom } from "@/features/i18n/locale.atoms";

const persistLocale = vi.hoisted(() => vi.fn());

// A unit test cannot run a TanStack server function, so the transport is
// replaced at its module boundary.
vi.mock("@/features/i18n/locale.functions", () => ({ persistLocale }));

const pickLocale = (registry: AtomRegistry.AtomRegistry, locale: "id-id") =>
  Effect.gen(function* () {
    registry.set(selectLocaleAtom, locale);
    yield* AtomRegistry.getResult(registry, selectLocaleAtom);
  });

describe("selectLocaleAtom", () => {
  it.live("switches the UI Locale and persists it", () =>
    Effect.gen(function* () {
      persistLocale.mockReturnValue(Effect.succeed("id-id"));
      const registry = AtomRegistry.make();

      yield* pickLocale(registry, "id-id");

      expect(registry.get(localeAtom)).toBe("id-id");
      expect(persistLocale).toHaveBeenCalledWith("id-id");
    })
  );

  it.live("keeps the picked Locale when persisting it fails", () =>
    Effect.gen(function* () {
      persistLocale.mockReturnValue(
        Effect.fail(new ServerFnError({ cause: new Error("offline") }))
      );
      const registry = AtomRegistry.make();

      yield* pickLocale(registry, "id-id");

      expect(registry.get(localeAtom)).toBe("id-id");
    })
  );
});
