import { Effect } from "effect";

import * as F from "./folio";

export const readFile = Effect.fn("Folio.UI.readFile")((file: File) =>
  Effect.tryPromise({
    try: async () => new Uint8Array(await file.arrayBuffer()),
    catch: () =>
      F.FolioFailure.make({
        requestId: F.RequestId.make("file"),
        code: "invalid-pdf",
      }),
  })
);

export const sampleFile = Effect.fn("Folio.UI.sample")(function* () {
  return yield* Effect.tryPromise({
    try: async () => {
      const response = await fetch("/folio/sample.pdf", {
        cache: "force-cache",
      });
      if (!response.ok) {
        throw new Error("sample");
      }
      return new File([await response.arrayBuffer()], "folio-sample.pdf", {
        type: "application/pdf",
      });
    },
    catch: () =>
      F.FolioFailure.make({
        requestId: F.RequestId.make("sample"),
        code: "offline-asset-missing",
      }),
  });
});

export const createDownload = Effect.fn("Folio.UI.download")(
  (bytes: Uint8Array, filename: string) =>
    Effect.sync(() => {
      const url = URL.createObjectURL(
        new Blob([new Uint8Array(bytes)], { type: "application/pdf" })
      );
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.append(link);
      link.click();
      link.remove();
      // Give the browser time to consume the URL, then release it. The route also
      // revokes it on replacement/unmount.
      return url;
    })
);

export const focusElement = (id: string) =>
  requestAnimationFrame(() =>
    document.querySelector<HTMLElement>(`#${CSS.escape(id)}`)?.focus()
  );
