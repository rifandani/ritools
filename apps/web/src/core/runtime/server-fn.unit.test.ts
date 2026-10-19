import { describe, expect, it } from "@effect/vitest";
import { Cause, Effect, Exit, Schema } from "effect";

import { makeServerFnContract, ServerFnError } from "@/core/runtime/server-fn";

class OutOfStock extends Schema.TaggedError<OutOfStock>()("OutOfStock", {
  sku: Schema.String,
}) {}

const contract = makeServerFnContract({
  failure: OutOfStock,
  success: Schema.Struct({ count: Schema.Int }),
});

/** What a server function hands back to the browser. */
const overTheWire = (exit: Exit.Exit<{ count: number }, OutOfStock>) => () =>
  Promise.resolve(contract.encodeExit(exit));

describe("makeServerFnContract", () => {
  it.effect("delivers the success value", () =>
    Effect.gen(function* () {
      const value = yield* contract.call(
        overTheWire(Exit.succeed({ count: 3 }))
      );

      expect(value).toEqual({ count: 3 });
    })
  );

  it.effect("delivers a typed failure as the same tagged error", () =>
    Effect.gen(function* () {
      const error = yield* contract
        .call(overTheWire(Exit.fail(new OutOfStock({ sku: "card-7" }))))
        .pipe(Effect.flip);

      expect(error).toEqual(new OutOfStock({ sku: "card-7" }));
    })
  );

  it.effect("hides the details of a server defect", () =>
    Effect.gen(function* () {
      const exit = yield* contract
        .call(overTheWire(Exit.die(new Error("db password is hunter2"))))
        .pipe(Effect.exit);

      const defect = Exit.isFailure(exit) ? Cause.squash(exit.cause) : null;
      expect(defect).toEqual(new Error("Internal server error"));
    })
  );

  it.effect("fails with ServerFnError when the request does not complete", () =>
    Effect.gen(function* () {
      const error = yield* contract
        .call(() => Promise.reject(new TypeError("Failed to fetch")))
        .pipe(Effect.flip);

      expect(error).toBeInstanceOf(ServerFnError);
    })
  );

  it.effect("fails with ServerFnError when the response does not decode", () =>
    Effect.gen(function* () {
      const error = yield* contract
        .call(() => Promise.resolve('{"_tag":"Nonsense"}'))
        .pipe(Effect.flip);

      expect(error).toBeInstanceOf(ServerFnError);
    })
  );
});
