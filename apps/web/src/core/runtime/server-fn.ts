import { Effect, Exit, Option, Schema } from "effect";

/**
 * A server function call that did not give a readable result: the request did
 * not complete, or the response does not match the contract.
 */
export class ServerFnError extends Schema.TaggedError<ServerFnError>()(
  "ServerFnError",
  { cause: Schema.Defect() }
) {}

/** Replaces every defect and interruption, so server internals stay on the server. */
const internalServerError = Exit.die(new Error("Internal server error"));
const redactDefects = <A, E>(exit: Exit.Exit<A, E>): Exit.Exit<A, E> =>
  Exit.isSuccess(exit)
    ? exit
    : Option.match(Exit.findErrorOption(exit), {
        onNone: () => internalServerError,
        onSome: (error) => Exit.fail(error),
      });

/**
 * The wire format of one server function. The server encodes the `Exit` of its
 * Effect to JSON; the client decodes it back into an Effect, so a typed failure
 * on the server is the same typed failure in the browser.
 *
 * The transport stays TanStack Start's `createServerFn`: its handler calls
 * `runServerFn(contract, effect)`, and the client wraps the call in `call(...)`.
 */
export const makeServerFnContract = <
  Success extends Schema.Codec<unknown, unknown>,
  Failure extends Schema.Codec<unknown, unknown>,
>(options: {
  readonly success: Success;
  readonly failure: Failure;
}) => {
  // A JSON string on the wire: TanStack Start can always serialize it, and
  // nothing but this codec reads it.
  const codec = Schema.fromJsonString(
    Schema.toCodecJson(
      Schema.Exit(options.success, options.failure, Schema.Defect())
    )
  );
  const encode = Schema.encodeSync(codec);
  const decode = Schema.decodeUnknownEffect(codec);
  return {
    /** Server side: the JSON string a server function handler returns. */
    encodeExit: (exit: Exit.Exit<Success["Type"], Failure["Type"]>) =>
      encode(redactDefects(exit)),
    /** Client side: runs the server function and gives back its Effect. */
    call: (
      send: () => Promise<string>
    ): Effect.Effect<Success["Type"], Failure["Type"] | ServerFnError> =>
      Effect.tryPromise({
        catch: (cause) => new ServerFnError({ cause }),
        try: send,
      }).pipe(
        Effect.flatMap((wire) =>
          decode(wire).pipe(
            Effect.mapError((cause) => new ServerFnError({ cause }))
          )
        ),
        Effect.flatten
      ),
  };
};
