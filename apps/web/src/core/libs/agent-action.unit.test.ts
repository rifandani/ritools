import { Schema } from "effect";
import { describe, expect, it } from "vitest";

import {
  agentFailure,
  defineAgentAction,
  isAgentFailure,
  jsonSchemaOf,
  oneAtATime,
  PageFields,
  pageOf,
  totalsOf,
  emptyBatchFailure,
  emptyBatchNote,
  ItemIds,
  unknownIdFailure,
  unknownIdsFailure,
} from "@/core/libs/agent-action";

interface Counter {
  value: number;
}

const counterOf = (value: number) => {
  const counter: Counter = { value };
  return {
    context: {
      controller: () => counter,
      settled: () => Promise.resolve(),
    },
    counter,
  };
};

const addAction = defineAgentAction<
  Counter,
  { amount: number },
  { ok: true; value: number }
>({
  description: "Adds an amount to the counter.",
  input: Schema.Struct({
    amount: Schema.Int.annotate({ description: "The amount to add." }),
  }),
  name: "counter_add",
  output: Schema.Struct({ ok: Schema.Literal(true), value: Schema.Number }),
  run: ({ controller }, input) => {
    const counter = controller();
    if (input.amount < 0) {
      return agentFailure(
        "invalid-settings",
        "The amount is negative.",
        "Send an amount of 0 or more."
      );
    }
    counter.value += input.amount;
    return { ok: true, value: counter.value };
  },
});

const { signal } = new AbortController();

describe("defineAgentAction", () => {
  it("decodes the arguments, runs, and returns the encoded result", async () => {
    const { context, counter } = counterOf(1);
    await expect(
      addAction.execute(context, { amount: 2 }, signal)
    ).resolves.toEqual({ ok: true, value: 3 });
    expect(counter.value).toBe(3);
  });

  it("returns invalid-input for arguments the Schema rejects, and runs nothing", async () => {
    const { context, counter } = counterOf(1);
    const result = await addAction.execute(context, { amount: "2" }, signal);
    expect(result).toMatchObject({ code: "invalid-input", ok: false });
    expect(isAgentFailure(result)).toBe(true);
    expect(counter.value).toBe(1);
  });

  it("rejects an unknown argument, so a misspelled field is not ignored", async () => {
    const { context } = counterOf(1);
    const result = await addAction.execute(
      context,
      { amount: 1, amuont: 2 },
      signal
    );
    expect(result).toMatchObject({ code: "invalid-input", ok: false });
    if (!isAgentFailure(result)) {
      throw new Error("expected a failure");
    }
    expect(result.message).toContain("amuont");
    expect(result.hint).toContain("counter_add");
  });

  it("treats missing arguments as an empty object", async () => {
    const noInput = defineAgentAction<Counter, object, { ok: true }>({
      description: "Reads nothing.",
      input: Schema.Struct({}),
      name: "counter_noop",
      output: Schema.Struct({ ok: Schema.Literal(true) }),
      run: () => ({ ok: true }),
    });
    const { context } = counterOf(0);
    await expect(noInput.execute(context, undefined, signal)).resolves.toEqual({
      ok: true,
    });
  });

  it("passes a failure from the handler through unchanged", async () => {
    const { context } = counterOf(1);
    await expect(
      addAction.execute(context, { amount: -1 }, signal)
    ).resolves.toEqual({
      code: "invalid-settings",
      hint: "Send an amount of 0 or more.",
      message: "The amount is negative.",
      ok: false,
    });
  });

  it("publishes an object input schema and an output schema that admits a failure", () => {
    expect(addAction.inputSchema).toMatchObject({
      properties: { amount: { description: "The amount to add." } },
      required: ["amount"],
      type: "object",
    });
    expect(addAction.outputSchema).toMatchObject({ type: "object" });
    expect(JSON.stringify(addAction.outputSchema)).toContain("hint");
  });
});

describe("cancellation and busy", () => {
  it("runs nothing when the call is cancelled before it starts", async () => {
    const { context, counter } = counterOf(1);
    const abort = new AbortController();
    abort.abort();
    expect(
      await addAction.execute(context, { amount: 2 }, abort.signal)
    ).toMatchObject({ code: "cancelled", ok: false });
    expect(counter.value).toBe(1);
  });

  it("lets one run start at a time, and the next after it ends", async () => {
    const busy = agentFailure("busy", "A run is active.", "Wait.");
    const gate = Promise.withResolvers<null>();
    const run = oneAtATime<Counter, null, { ok: true }>(busy, async () => {
      await gate.promise;
      return { ok: true };
    });
    const { context } = counterOf(0);
    const first = run(context, null, signal);
    expect(await run(context, null, signal)).toBe(busy);
    gate.resolve(null);
    expect(await first).toEqual({ ok: true });
    expect(await run(context, null, signal)).toEqual({ ok: true });
  });

  it("frees the lock when the run throws", async () => {
    const busy = agentFailure("busy", "A run is active.", "Wait.");
    let fail = true;
    const run = oneAtATime<Counter, null, { ok: true }>(busy, async () => {
      await Promise.resolve();
      if (fail) {
        throw new Error("bug");
      }
      return { ok: true };
    });
    const { context } = counterOf(0);
    await expect(run(context, null, signal)).rejects.toThrow("bug");
    fail = false;
    expect(await run(context, null, signal)).toEqual({ ok: true });
  });
});

describe("jsonSchemaOf", () => {
  it("adds an object type to a root without one, and keeps definitions", () => {
    const Named = Schema.Struct({ a: Schema.String }).annotate({
      identifier: "Named",
    });
    const schema = jsonSchemaOf(Schema.Struct({ named: Named }));
    expect(schema.type).toBe("object");
    expect(schema.$defs).toBeDefined();
    expect(jsonSchemaOf(Schema.Union([Named, Named]))).toMatchObject({
      type: "object",
    });
  });
});

describe("paging", () => {
  const rows = Array.from({ length: 120 }, (_, index) => index);

  it("gives 50 rows from the start by default", () => {
    const page = pageOf(rows, {});
    expect(page).toMatchObject({ limit: 50, offset: 0, total: 120 });
    expect(page.rows).toHaveLength(50);
    expect(page.rows[0]).toBe(0);
  });

  it("gives the rows from an offset, up to the limit", () => {
    const page = pageOf(rows, { limit: 30, offset: 100 });
    expect(page.rows).toEqual(rows.slice(100, 120));
    expect(page).toMatchObject({ limit: 30, offset: 100, total: 120 });
  });

  it("caps the limit at 200 in the Schema", () => {
    const decode = Schema.decodeUnknownExit(Schema.Struct(PageFields));
    expect(decode({ limit: 200 })._tag).toBe("Success");
    expect(decode({ limit: 201 })._tag).toBe("Failure");
    expect(decode({ offset: -1 })._tag).toBe("Failure");
  });
});

describe("totalsOf", () => {
  it("counts each state and gives zero for a state with no rows", () => {
    expect(
      totalsOf(["done", "miss", "done"], ["done", "miss", "rejected"])
    ).toEqual({
      done: 2,
      miss: 1,
      rejected: 0,
    });
  });

  it("does not let a row state reach the object prototype", () => {
    const totals = totalsOf(["__proto__"], ["__proto__"]);
    expect(Object.getPrototypeOf(totals)).toBe(Object.prototype);
    expect(Object.entries(totals)).toEqual([["__proto__", 1]]);
  });
});

describe("ids", () => {
  it("names the ids that are not in the Batch, in request order", () => {
    const known = new Set(["a", "b"]);
    const has = (id: string) => known.has(id);
    expect(unknownIdsFailure(["c", "a", "d"], has, "squeeze")).toMatchObject({
      code: "unknown-id",
      message: "No item has the ids c, d.",
    });
    expect(unknownIdsFailure(["a", "b"], has, "squeeze")).toBeNull();
  });

  it("needs at least one id", () => {
    const decode = Schema.decodeUnknownExit(ItemIds);
    expect(decode([])._tag).toBe("Failure");
    expect(decode(["a"])._tag).toBe("Success");
  });

  it("tells the agent to ask the user for files", () => {
    expect(emptyBatchFailure("Ask the user.")).toEqual({
      code: "empty-batch",
      hint: "Ask the user.",
      message: "The Batch is empty.",
      ok: false,
    });
    expect(emptyBatchNote("Ask the user.")).toBe(
      "The Batch is empty. Ask the user."
    );
  });

  it("tells the agent to read the state again", () => {
    expect(unknownIdFailure(["x"], "squeeze")).toEqual({
      code: "unknown-id",
      hint: "Call squeeze_get_state to read the current item ids, then try again.",
      message: "No item has the id x.",
      ok: false,
    });
    expect(unknownIdFailure(["x", "y"], "squeeze").message).toBe(
      "No item has the ids x, y."
    );
  });
});
