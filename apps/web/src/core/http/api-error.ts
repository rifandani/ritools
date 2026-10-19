import { Effect, Option, Schema } from "effect";
import type { HttpClientResponse } from "effect/http";

/** The `{ message }` body the API returns on most failed requests. */
const ErrorEnvelope = Schema.Struct({ message: Schema.String });

const decodeErrorEnvelope = Schema.decodeUnknownOption(
  Schema.fromJsonString(ErrorEnvelope)
);

/**
 * A response with a non-2xx status. The Error Envelope is optional: some
 * failures carry one, some carry plain text, some carry nothing.
 */
export class ApiError extends Schema.TaggedError<ApiError>()("ApiError", {
  envelope: Schema.Option(ErrorEnvelope),
  status: Schema.Number,
  /** The raw body, when it is not empty and not an Error Envelope. */
  text: Schema.Option(Schema.String),
}) {}

/**
 * Passes a 2xx response through and fails any other status with an `ApiError`.
 * Reading the error body is best effort: a body that cannot be read counts as
 * empty, so the status is never lost.
 */
export const failOnErrorStatus = Effect.fnUntraced(function* (
  response: HttpClientResponse.HttpClientResponse
) {
  if (response.status >= 200 && response.status < 300) {
    return response;
  }
  const body = yield* response.text.pipe(
    Effect.catch(() => Effect.succeed(""))
  );
  const envelope = decodeErrorEnvelope(body);
  return yield* new ApiError({
    envelope,
    status: response.status,
    text:
      Option.isNone(envelope) && body !== ""
        ? Option.some(body)
        : Option.none(),
  });
});
