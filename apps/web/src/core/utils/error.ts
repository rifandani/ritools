import { Option, Schema } from "effect";

import { ApiError } from "@/core/http/api-error";

/**
 * @description Shown when the failure says nothing a person can act on.
 */
const genericErrorMessage = "Something went wrong. Please try again.";

/**
 * @description Derive a message to show a person from any failure.
 *
 * The ladder, in order:
 * 1. the Error Envelope the API returns, when the body carried one;
 * 2. the error body when it is plain text rather than an Error Envelope;
 * 3. for an `ApiError` with an empty body, the status code — developer-facing
 *    but truthful, and strictly better than saying nothing;
 * 4. a generic message for a `SchemaError` (the server sent a shape we cannot
 *    read — naming the offending field leaks our internals);
 * 5. the error's own message;
 * 6. a generic message for anything that is not an `Error` at all.
 *
 * Takes `unknown` on purpose: callers hand it a caught failure, a `Cause`
 * squash or an `AsyncResult` error, and none of them is verified at runtime.
 */
export const toErrorMessage = (error: unknown): string => {
  if (error instanceof ApiError) {
    return Option.match(error.envelope, {
      onNone: () =>
        Option.getOrElse(
          error.text,
          () => `Request failed with status code ${error.status}`
        ),
      onSome: (envelope) => envelope.message,
    });
  }
  // A SchemaError is an `Error`, so it must be answered before the general case.
  if (Schema.isSchemaError(error)) {
    return genericErrorMessage;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return genericErrorMessage;
};
