import { describe, expect, it } from "@effect/vitest";
import { Effect, Option } from "effect";

import { makeRequestSnapshot } from "@/core/runtime/server-request";

describe("makeRequestSnapshot", () => {
  it.effect("reads the cookies and headers it was made from", () =>
    Effect.gen(function* () {
      const { service } = makeRequestSnapshot({
        cookies: { "app-locale": "id-id" },
        headers: new Headers({ "Accept-Language": "en-US" }),
      });

      expect(yield* service.getCookie("app-locale")).toEqual(
        Option.some("id-id")
      );
      expect(yield* service.getCookie("missing")).toEqual(Option.none());
      expect(yield* service.getHeader("accept-language")).toEqual(
        Option.some("en-US")
      );
      expect(yield* service.getHeader("x-missing")).toEqual(Option.none());
    })
  );

  it.effect("collects cookie writes, in order, for the handler to apply", () =>
    Effect.gen(function* () {
      const { cookieWrites, service } = makeRequestSnapshot({
        cookies: {},
        headers: new Headers(),
      });

      yield* service.setCookie("a", "1", { path: "/" });
      yield* service.setCookie("b", "2", { httpOnly: true });

      expect(cookieWrites).toEqual([
        { name: "a", options: { path: "/" }, value: "1" },
        { name: "b", options: { httpOnly: true }, value: "2" },
      ]);
    })
  );
});
