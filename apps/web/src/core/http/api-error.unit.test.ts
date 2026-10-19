import { describe, expect, it } from "@effect/vitest";
import { MOCK_API_BASE_URL, server } from "@test/msw";
import { Effect, Option } from "effect";
import {
  FetchHttpClient,
  HttpClient,
  HttpClientRequest,
  HttpClientResponse,
} from "effect/http";
import { http, HttpResponse } from "msw";

import { ApiError, failOnErrorStatus } from "@/core/http/api-error";

const url = `${MOCK_API_BASE_URL}/things`;

const getThings = HttpClient.get(url).pipe(
  Effect.flatMap(failOnErrorStatus),
  Effect.provide(FetchHttpClient.layer)
);

describe("failOnErrorStatus", () => {
  it.effect("passes a 2xx response through", () =>
    Effect.gen(function* () {
      server.use(http.get(url, () => HttpResponse.json({ id: 1 })));

      const response = yield* getThings;

      expect(yield* response.json).toEqual({ id: 1 });
    })
  );

  it.effect("reads the Error Envelope of a failed response", () =>
    Effect.gen(function* () {
      server.use(
        http.get(url, () =>
          HttpResponse.json({ message: "Invalid credentials" }, { status: 401 })
        )
      );

      const error = yield* getThings.pipe(Effect.flip);

      expect(error).toEqual(
        new ApiError({
          envelope: Option.some({ message: "Invalid credentials" }),
          status: 401,
          text: Option.none(),
        })
      );
    })
  );

  it.effect("keeps a plain-text error body", () =>
    Effect.gen(function* () {
      server.use(
        http.get(url, () =>
          HttpResponse.text("Service unavailable", { status: 503 })
        )
      );

      const error = yield* getThings.pipe(Effect.flip);

      expect(error).toEqual(
        new ApiError({
          envelope: Option.none(),
          status: 503,
          text: Option.some("Service unavailable"),
        })
      );
    })
  );

  it.effect("keeps a JSON body that is not an Error Envelope as text", () =>
    Effect.gen(function* () {
      server.use(
        http.get(url, () =>
          HttpResponse.json({ detail: "nope" }, { status: 400 })
        )
      );

      const error = yield* getThings.pipe(Effect.flip);

      expect(error).toEqual(
        new ApiError({
          envelope: Option.none(),
          status: 400,
          text: Option.some('{"detail":"nope"}'),
        })
      );
    })
  );

  it.effect("keeps the status when the error body cannot be read", () =>
    Effect.gen(function* () {
      // Module boundary, not MSW: MSW buffers bodies, so a stream that breaks
      // mid-read never reaches the client through it (ADR-0002).
      const brokenBody = new ReadableStream({
        start: (controller) => controller.error(new Error("connection reset")),
      });
      const response = HttpClientResponse.fromWeb(
        HttpClientRequest.get(url),
        new Response(brokenBody, { status: 502 })
      );

      const error = yield* failOnErrorStatus(response).pipe(Effect.flip);

      expect(error).toEqual(
        new ApiError({
          envelope: Option.none(),
          status: 502,
          text: Option.none(),
        })
      );
    })
  );

  it.effect("has neither when the error body is empty", () =>
    Effect.gen(function* () {
      server.use(http.get(url, () => new HttpResponse(null, { status: 500 })));

      const error = yield* getThings.pipe(Effect.flip);

      expect(error).toEqual(
        new ApiError({
          envelope: Option.none(),
          status: 500,
          text: Option.none(),
        })
      );
    })
  );
});
