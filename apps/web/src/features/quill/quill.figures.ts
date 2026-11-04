import { Effect, Schema } from "effect";

import "katex/dist/katex.min.css";
/* oxlint-disable promise/avoid-new, unicorn/require-post-message-target-origin -- Dedicated Worker messages use callbacks and have no targetOrigin argument. */
import { loadLibrary, startLibraryWorker } from "@/core/libs/library-load";

import { QuillError } from "./quill";

export interface Figure {
  readonly kind: "math" | "mermaid";
  readonly source: string;
  readonly url: string | null;
  readonly error: boolean;
}
const failed = (kind: Figure["kind"], source: string): Figure => ({
  kind,
  source,
  url: null,
  error: true,
});
const diagram = (source: string): Promise<string> =>
  new Promise((resolve, reject) => {
    const worker = startLibraryWorker(
      "Pele",
      () =>
        new Worker(new URL("quill.diagram.worker.ts", import.meta.url), {
          type: "module",
        })
    );
    const id = crypto.randomUUID();
    const Ready = Schema.Struct({ ready: Schema.Literal(true) });
    const Reply = Schema.Struct({
      id: Schema.String,
      svg: Schema.optionalKey(Schema.String),
      error: Schema.optionalKey(Schema.Boolean),
    });
    let timeout = setTimeout(() => {
      worker.terminate();
      reject(
        navigator.onLine
          ? new Error("Diagram unavailable")
          : new QuillError({ reason: "offline" })
      );
    }, 20_000);
    const stop = () => {
      clearTimeout(timeout);
      worker.terminate();
    };
    worker.addEventListener("message", (event: MessageEvent<unknown>) => {
      if (Schema.is(Ready)(event.data)) {
        clearTimeout(timeout);
        timeout = setTimeout(() => {
          worker.terminate();
          reject(new Error("Diagram timeout"));
        }, 4000);
        worker.postMessage({ version: 1, operation: "render", id, source });
        return;
      }
      const reply = Schema.decodeUnknownExit(Reply)(event.data);
      if (reply._tag === "Failure" || reply.value.id !== id) {
        return;
      }
      stop();
      if (reply.value.svg) {
        resolve(reply.value.svg);
      } else {
        reject(new Error("Diagram failed"));
      }
    });
    worker.addEventListener("error", () => {
      stop();
      reject(
        navigator.onLine
          ? new Error("Diagram unavailable")
          : new QuillError({ reason: "offline" })
      );
    });
  });
const svgPng = async (svg: string) => {
  const image = new Image();
  const url = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  image.src = url;
  await image.decode();
  const scale = Math.min(
    2,
    1600 / Math.max(1, image.naturalWidth),
    2000 / Math.max(1, image.naturalHeight)
  );
  const width = Math.max(1, Math.round(image.naturalWidth * scale));
  const height = Math.max(1, Math.round(image.naturalHeight * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Canvas unavailable");
  }
  ctx.fillStyle = "white";
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(image, 0, 0, width, height);
  return canvas.toDataURL("image/png");
};
export const renderFigure = (
  kind: Figure["kind"],
  source: string,
  display: boolean
): Effect.Effect<Figure, QuillError> =>
  Effect.gen(function* () {
    if (source.length > 30_000) {
      return failed(kind, source);
    }
    if (kind === "mermaid") {
      return yield* Effect.tryPromise({
        try: async () => ({
          url: await svgPng(await diagram(source)),
          kind,
          source,
          error: false,
        }),
        catch: (cause) =>
          Schema.is(QuillError)(cause)
            ? cause
            : new QuillError({ reason: "export" }),
      }).pipe(
        Effect.catch((error) =>
          error.reason === "offline"
            ? Effect.fail(error)
            : Effect.succeed(failed(kind, source))
        )
      );
    }
    const katex = yield* Effect.tryPromise({
      try: () => loadLibrary("KaTeX", () => import("katex")),
      catch: () => new QuillError({ reason: "offline" }),
    });
    let html: string;
    try {
      html = katex.default.renderToString(source, {
        displayMode: display,
        trust: false,
        throwOnError: true,
        strict: "error",
        maxExpand: 1000,
        output: "html",
      });
    } catch {
      return failed(kind, source);
    }
    const raster = yield* Effect.tryPromise({
      try: () => loadLibrary("html-to-image", () => import("html-to-image")),
      catch: () => new QuillError({ reason: "offline" }),
    });
    return yield* Effect.tryPromise({
      try: async () => {
        const host = document.createElement("div");
        host.style.cssText =
          "position:fixed;left:-10000px;top:0;display:inline-block;max-width:800px;padding:12px;background:white;color:black;font-size:20px";
        // KaTeX owns this markup, with trust disabled. User HTML never reaches it.
        host.innerHTML = html;
        document.body.append(host);
        try {
          await document.fonts.ready;
          const url = await raster.toPng(host, {
            pixelRatio: 2,
            style: { position: "static", left: "auto", top: "auto" },
            backgroundColor: "white",
          });
          return { kind, source, url, error: false };
        } finally {
          host.remove();
        }
      },
      catch: () => new QuillError({ reason: "export" }),
    }).pipe(Effect.catch(() => Effect.succeed(failed(kind, source))));
  });
