import { Option, Schema } from "effect";
import { describe, expect, it } from "vitest";

import { ApiError } from "@/core/http/api-error";
import { toErrorMessage } from "@/core/utils/error";

const apiError = ({
  envelope,
  status = 401,
  text,
}: {
  envelope?: string;
  status?: number;
  text?: string;
}) =>
  new ApiError({
    envelope: Option.map(Option.fromUndefinedOr(envelope), (message) => ({
      message,
    })),
    status,
    text: Option.fromUndefinedOr(text),
  });

describe("toErrorMessage", () => {
  it("reads the Error Envelope", () => {
    expect(toErrorMessage(apiError({ envelope: "Invalid credentials" }))).toBe(
      "Invalid credentials"
    );
  });

  it("reads an error body that is plain text", () => {
    expect(
      toErrorMessage(apiError({ status: 503, text: "Service unavailable" }))
    ).toBe("Service unavailable");
  });

  it("names the status when the error body is empty", () => {
    expect(toErrorMessage(apiError({ status: 500 }))).toBe(
      "Request failed with status code 500"
    );
  });

  it("does not leak schema detail when the response shape is wrong", () => {
    // A SchemaError means the server sent something we cannot read. That is not
    // actionable by the person using the app, and naming the offending field
    // leaks our internals into a toast.
    const error = Schema.decodeUnknownResult(
      Schema.Struct({ email: Schema.String })
    )({ email: 1 });
    const cause = error._tag === "Failure" ? error.failure : null;

    const message = toErrorMessage(cause);

    expect(message).not.toContain("email");
    expect(message).toBe("Something went wrong. Please try again.");
  });

  it("reads any other Error's message", () => {
    expect(toErrorMessage(new Error("Request timed out"))).toBe(
      "Request timed out"
    );
  });

  it("falls back when something that is not an Error is thrown", () => {
    expect(toErrorMessage("boom")).toBe(
      "Something went wrong. Please try again."
    );
  });
});
