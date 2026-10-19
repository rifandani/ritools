import { describe, expect, it } from "@effect/vitest";
import { server } from "@test/msw";
import { Effect } from "effect";
import { AtomRegistry } from "effect/reactivity";
import { http, HttpResponse } from "msw";

import { cdnFileAtom } from "@/features/cdn/cdn.atoms";

const fileUrl = "https://cdn.example.com/cover.png";

describe("cdnFileAtom", () => {
  it.live("loads the file for one URL through the app runtime", () =>
    Effect.gen(function* () {
      server.use(
        http.get(fileUrl, () =>
          HttpResponse.text("cover", {
            headers: { "content-type": "image/png" },
          })
        )
      );
      const registry = AtomRegistry.make();

      const file = yield* AtomRegistry.getResult(
        registry,
        cdnFileAtom(fileUrl)
      );

      expect(yield* Effect.promise(() => file.blob.text())).toBe("cover");
    })
  );

  it("gives the same atom for the same URL", () => {
    expect(cdnFileAtom(fileUrl)).toBe(cdnFileAtom(fileUrl));
  });
});
