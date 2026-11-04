import { Cause, Exit, Option, Schema } from "effect";
import type { JsonSchema } from "effect";

/**
 * Agent Actions: the named operations a Tool offers to a Browser Agent through
 * WebMCP (ADR-0034, ADR-0035).
 *
 * This module is the pure half. It turns an Effect Schema into the JSON Schema
 * that WebMCP publishes, decodes the arguments with the same Schema, and holds
 * the error contract and the paging that every Tool shares. The browser half,
 * which registers the definitions, is `@/core/hooks/use-agent-actions`.
 */

/* -------------------------------------------------------------------------- */
/* Error contract                                                              */
/* -------------------------------------------------------------------------- */

/**
 * The fixed error codes. A Tool can also use a word from its glossary (for
 * example `rejected` or `too-large`) as a code.
 */
type AgentFailureCode =
  | "busy"
  | "cancelled"
  | "declined"
  | "empty-batch"
  | "invalid-input"
  | "invalid-settings"
  | "not-applicable"
  | "unknown-id";

/** A word the Tool shows, as a code, for example `rejected` or `too-large`. */
type GlossaryCode = string;

/** An error in the input or the state. `execute` throws only on a bug. */
const AgentFailure = Schema.Struct({
  ok: Schema.Literal(false),
  code: Schema.String.annotate({
    description:
      "What went wrong: busy, cancelled, declined, empty-batch, invalid-input, invalid-settings, not-applicable, unknown-id, or a word the Tool shows.",
  }),
  message: Schema.String.annotate({ description: "What is wrong." }),
  hint: Schema.String.annotate({ description: "How to correct it." }),
});
export type AgentFailure = typeof AgentFailure.Type;

export const agentFailure = (
  code: AgentFailureCode | GlossaryCode,
  message: string,
  hint: string
): AgentFailure => ({ code, hint, message, ok: false });

export const isAgentFailure = (value: unknown): value is AgentFailure =>
  Schema.is(AgentFailure)(value);

/* -------------------------------------------------------------------------- */
/* JSON Schema                                                                 */
/* -------------------------------------------------------------------------- */

/**
 * The JSON Schema WebMCP publishes for a Schema. Named definitions go under
 * `$defs`, and the root is always an object, because MCP needs an object root
 * for both the input and the output.
 */
export const jsonSchemaOf = (schema: Schema.Top): JsonSchema.JsonSchema => {
  const document = Schema.toJsonSchemaDocument(schema);
  const root = { ...document.schema };
  if (Object.keys(document.definitions).length > 0) {
    root.$defs = document.definitions;
  }
  return root.type === undefined ? { type: "object", ...root } : root;
};

/* -------------------------------------------------------------------------- */
/* Definitions                                                                 */
/* -------------------------------------------------------------------------- */

/** WebMCP annotations. Ritools never sets `consequentialHint`. */
interface AgentAnnotations {
  readonly readOnlyHint?: boolean;
  readonly untrustedContentHint?: boolean;
}

/**
 * What a handler gets. `controller` reads the latest controller of the Tool,
 * so a handler that awaits a run reads the state after the run, not before.
 * `settled` waits for the page to render the last change.
 */
export interface AgentContext<C> {
  readonly controller: () => C;
  readonly settled: () => Promise<void>;
}

/** One Agent Action, ready for `registerTool`. Static: it reads no React state. */
export interface AgentActionDefinition<C> {
  readonly annotations?: AgentAnnotations;
  readonly description: string;
  /* oxlint-disable anti-slop/no-unknown-parameters, anti-slop/no-unknown-returns -- WebMCP hands over JSON that `execute` decodes with the input Schema, and takes back the JSON it encodes. */
  readonly execute: (
    context: AgentContext<C>,
    args: unknown,
    signal: AbortSignal
  ) => Promise<unknown>;
  /* oxlint-enable anti-slop/no-unknown-parameters, anti-slop/no-unknown-returns */
  readonly inputSchema: JsonSchema.JsonSchema;
  readonly name: string;
  readonly outputSchema: JsonSchema.JsonSchema;
}

type MaybePromise<A> = A | Promise<A>;

/**
 * Builds an Agent Action from its Schemas and its handler. `execute` decodes
 * the arguments with the input Schema; an unknown field or a wrong type
 * returns `invalid-input` and the handler does not run.
 */
export const defineAgentAction = <C, I, O>(options: {
  readonly annotations?: AgentAnnotations;
  readonly description: string;
  readonly input: Schema.Codec<I, unknown>;
  readonly name: string;
  readonly output: Schema.Codec<O, unknown>;
  readonly run: (
    context: AgentContext<C>,
    input: I,
    signal: AbortSignal
  ) => MaybePromise<O | AgentFailure>;
}): AgentActionDefinition<C> => {
  const decode = Schema.decodeUnknownExit(options.input);
  const encode = Schema.encodeSync(options.output);
  const hint = `Read the inputSchema of ${options.name} and send only its fields, with the types it lists.`;
  const definition: AgentActionDefinition<C> = {
    description: options.description,
    execute: async (context, args, signal) => {
      const decoded = decode(args ?? {}, {
        errors: "all",
        onExcessProperty: "error",
      });
      if (Exit.isFailure(decoded)) {
        const error = Option.getOrUndefined(
          Cause.findErrorOption(decoded.cause)
        );
        return agentFailure(
          "invalid-input",
          error?.message ?? "The arguments do not match the inputSchema.",
          hint
        );
      }
      if (signal.aborted) {
        return agentFailure(
          "cancelled",
          "The call was cancelled before it started. Nothing changed.",
          "Call it again when you want it to run."
        );
      }
      const result = await options.run(context, decoded.value, signal);
      return isAgentFailure(result) ? result : encode(result);
    },
    inputSchema: jsonSchemaOf(options.input),
    name: options.name,
    outputSchema: jsonSchemaOf(Schema.Union([options.output, AgentFailure])),
  };
  return options.annotations === undefined
    ? definition
    : { ...definition, annotations: options.annotations };
};

/**
 * Wraps a `run` handler so one call runs at a time. The page's own `running`
 * flag changes only after a render, so two calls in the same task would both
 * see it false. A call while another one runs gets `busy`.
 */
export const oneAtATime = <C, I, O>(
  busy: AgentFailure,
  run: (
    context: AgentContext<C>,
    input: I,
    signal: AbortSignal
  ) => Promise<O | AgentFailure>
) => {
  let active = false;
  return async (
    context: AgentContext<C>,
    input: I,
    signal: AbortSignal
  ): Promise<O | AgentFailure> => {
    if (active) {
      return busy;
    }
    active = true;
    try {
      return await run(context, input, signal);
    } finally {
      active = false;
    }
  };
};

/* -------------------------------------------------------------------------- */
/* Rows                                                                        */
/* -------------------------------------------------------------------------- */

const DEFAULT_PAGE_LIMIT = 50;
const MAX_PAGE_LIMIT = 200;

/** The paging fields of an input: spread them into a `Schema.Struct`. */
export const PageFields = {
  offset: Schema.optionalKey(
    Schema.Int.check(Schema.isGreaterThanOrEqualTo(0)).annotate({
      description: "The index of the first row to return. Default 0.",
    })
  ),
  limit: Schema.optionalKey(
    Schema.Int.check(
      Schema.isGreaterThanOrEqualTo(1),
      Schema.isLessThanOrEqualTo(MAX_PAGE_LIMIT)
    ).annotate({
      description: `How many rows to return. Default ${DEFAULT_PAGE_LIMIT}, maximum ${MAX_PAGE_LIMIT}.`,
    })
  ),
};

interface PageRequest {
  readonly limit?: number;
  readonly offset?: number;
}

/** One page of rows, as a result carries it. */
export const Page = <S extends Schema.Top>(row: S) =>
  Schema.Struct({
    offset: Schema.Int,
    limit: Schema.Int,
    total: Schema.Int.annotate({ description: "How many rows there are." }),
    rows: Schema.Array(row),
  });

export const pageOf = <T>(rows: readonly T[], request: PageRequest) => {
  const offset = request.offset ?? 0;
  const limit = request.limit ?? DEFAULT_PAGE_LIMIT;
  return {
    limit,
    offset,
    rows: rows.slice(offset, offset + limit),
    total: rows.length,
  };
};

/**
 * The count of each state. Every state in `known` appears, with zero when no
 * row has it. The object is built from entries, so a state cannot reach the
 * prototype.
 */
export const totalsOf = <K extends string>(
  states: readonly K[],
  known: readonly K[]
): Record<K, number> => {
  const counts = new Map<K, number>(known.map((state) => [state, 0]));
  for (const state of states) {
    counts.set(state, (counts.get(state) ?? 0) + 1);
  }
  // SAFETY: `counts` holds every key in `known`, which is every `K` a caller names.
  return Object.fromEntries(counts) as Record<K, number>;
};

/** A non-empty list of item ids, as an input field. */
export const ItemIds = Schema.Array(Schema.String).check(Schema.isMinLength(1));

/** The error for an empty Batch. `hint` says how the user adds files. */
export const emptyBatchFailure = (hint: string): AgentFailure =>
  agentFailure("empty-batch", "The Batch is empty.", hint);

/** The note `get_state` gives for an empty Batch. */
export const emptyBatchNote = (hint: string): string =>
  `The Batch is empty. ${hint}`;

/** The error for ids that left the Batch. The agent reads the state again. */
export const unknownIdFailure = (
  ids: readonly string[],
  tool: string
): AgentFailure =>
  agentFailure(
    "unknown-id",
    `No item has the ${ids.length === 1 ? "id" : "ids"} ${ids.join(", ")}.`,
    `Call ${tool}_get_state to read the current item ids, then try again.`
  );

/**
 * The error for requested ids that are not in the Batch, in request order, or
 * `null` when every id is there.
 */
export const unknownIdsFailure = (
  ids: readonly string[],
  has: (id: string) => boolean,
  tool: string
): AgentFailure | null => {
  const missing = ids.filter((id) => !has(id));
  return missing.length === 0 ? null : unknownIdFailure(missing, tool);
};
