import { describe, expect, it } from "@effect/vitest";
import { server } from "@test/msw";
import { Effect, Layer } from "effect";
import { FetchHttpClient } from "effect/http";
import { http, HttpResponse } from "msw";

import { ApiError } from "@/core/http/api-error";
import { CdnClient } from "@/features/cdn/cdn.service";

const fileUrl = "https://cdn.example.com/a.png";

const getFile = Effect.gen(function* () {
  const cdn = yield* CdnClient;
  return yield* cdn.getFile(fileUrl);
}).pipe(
  Effect.provide(CdnClient.layer.pipe(Layer.provide(FetchHttpClient.layer)))
);

describe("CdnClient.getFile", () => {
  it.effect("returns the file as a typed blob, with its headers", () =>
    Effect.gen(function* () {
      // No request assertion: `url` is the only input, and the handler matching
      // on it *is* the assertion. A wrong URL matches no handler, which
      // `onUnhandledRequest: "error"` turns into a failure.
      server.use(
        http.get(fileUrl, () =>
          HttpResponse.text("img", { headers: { "content-type": "image/png" } })
        )
      );

      const file = yield* getFile;

      expect(yield* Effect.promise(() => file.blob.text())).toBe("img");
      expect(file.blob.type).toBe("image/png");
      expect(file.headers["content-type"]).toBe("image/png");
    })
  );

  it.effect("fails with an ApiError on a 404", () =>
    Effect.gen(function* () {
      server.use(
        http.get(fileUrl, () => new HttpResponse(null, { status: 404 }))
      );

      const error = yield* getFile.pipe(Effect.flip);

      expect(error).toBeInstanceOf(ApiError);
      expect(error).toMatchObject({ status: 404 });
    })
  );
});
