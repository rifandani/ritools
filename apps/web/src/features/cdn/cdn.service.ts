import { Context, Effect, Layer, Schedule } from "effect";
import { HttpClient } from "effect/http";
import type { HttpClientError } from "effect/http";

import { failOnErrorStatus } from "@/core/http/api-error";
import type { ApiError } from "@/core/http/api-error";

interface CdnFile {
  /** The body, typed with the response's `content-type`. */
  readonly blob: Blob;
  readonly headers: Readonly<Record<string, string>>;
}

export class CdnClient extends Context.Service<
  CdnClient,
  {
    readonly getFile: (
      url: string
    ) => Effect.Effect<CdnFile, ApiError | HttpClientError.HttpClientError>;
  }
>()("@heynbord/web/CdnClient") {
  static readonly layer = Layer.effect(
    CdnClient,
    Effect.gen(function* () {
      const client = (yield* HttpClient.HttpClient).pipe(
        // A GET of a static file is idempotent: retry network errors and 5xx.
        HttpClient.retryTransient({
          schedule: Schedule.exponential("100 millis"),
          times: 2,
        })
      );

      const getFile = Effect.fn("CdnClient.getFile")(function* (url: string) {
        const response = yield* client
          .get(url)
          .pipe(Effect.flatMap(failOnErrorStatus));
        const buffer = yield* response.arrayBuffer;
        return {
          blob: new Blob([buffer], { type: response.headers["content-type"] }),
          headers: response.headers,
        } satisfies CdnFile;
      });

      return CdnClient.of({ getFile });
    })
  );
}
