/* oxlint-disable unicorn/require-post-message-target-origin, promise/prefer-await-to-then, promise/avoid-new, anti-slop/require-safety-comment-for-type-assertion, anti-slop/no-unknown-parameters, eslint/prefer-destructuring, anti-slop/no-runtime-typeof, anti-slop/no-conditional-empty-object-spread -- A dedicated Worker validates unknown message shapes before dispatch. */
/// <reference lib="webworker" />
import { Schema } from "effect";

import type { Request, Response } from "./folio";
import { Response as FolioResponse, WireRequest } from "./folio";
import type { ProgressPhase } from "./folio.engine";
import { FolioEngine } from "./folio.engine";
import { readerAssets } from "./folio.worker-assets";

declare const self: DedicatedWorkerGlobalScope;

const engine = new FolioEngine({ assets: readerAssets });
const cancelled = new Set<string>();
const active = new Map<string, AbortController>();
let queue: Promise<void> = Promise.resolve();

const requestIdOf = (value: unknown): string | null => {
  if (typeof value !== "object" || value === null) {
    return null;
  }
  const { payload } = value as { payload?: unknown };
  if (typeof payload !== "object" || payload === null) {
    return null;
  }
  const { request } = payload as { request?: unknown };
  return typeof request === "string" && request.length > 0 ? request : null;
};

const send = (payload: Response, bitmap?: ImageBitmap) => {
  const encoded = Schema.encodeUnknownSync(FolioResponse)(payload);
  const transfer: Transferable[] = [];
  if (bitmap) {
    transfer.push(bitmap);
  }
  if (payload._tag === "Written") {
    transfer.push(payload.bytes.buffer as ArrayBuffer);
  }
  self.postMessage(
    { protocol: 1, payload: encoded, ...(bitmap ? { bitmap } : {}) },
    transfer
  );
};

const sendRejected = (
  request: string,
  code: "invalid-request" | "cancelled"
) => {
  send({
    _tag: "Rejected",
    request: request as never,
    code,
    reason: null,
    preservedRevision: null,
    sessionAlive: true,
    retry: "none",
  });
};

const progressFor = (request: Request) => {
  const session = "session" in request ? request.session : undefined;
  return (phase: ProgressPhase, completed = 0, total: number | null = null) => {
    send({
      _tag: "Progress",
      request: request.request,
      ...(session ? { session } : {}),
      phase,
      completed,
      total,
    });
  };
};

const run = async (request: Request) => {
  if (cancelled.delete(request.request)) {
    sendRejected(request.request, "cancelled");
    return;
  }
  const controller = new AbortController();
  active.set(request.request, controller);
  try {
    const reply = await engine.handle(
      request,
      progressFor(request),
      controller.signal
    );
    if (
      controller.signal.aborted &&
      (reply.payload._tag === "Rendered" || reply.payload._tag === "Written")
    ) {
      // A committed `Changed` revision is delivered: hiding it would leave the
      // host behind the session. Bitmaps and download bytes have no state, so
      // a cancelled read publishes neither.
      reply.bitmap?.close();
      sendRejected(request.request, "cancelled");
      return;
    }
    send(reply.payload, reply.bitmap);
  } finally {
    active.delete(request.request);
  }
};

self.addEventListener("message", (event: MessageEvent<unknown>) => {
  const decoded = Schema.decodeUnknownExit(WireRequest)(event.data);
  if (decoded._tag === "Failure") {
    const request = requestIdOf(event.data);
    if (request) {
      sendRejected(request, "invalid-request");
    }
    return;
  }
  const request = decoded.value.payload;
  if (request._tag === "Cancel") {
    cancelled.add(request.target);
    active.get(request.target)?.abort();
    send({
      _tag: "Cancelled",
      request: request.request,
      target: request.target,
    });
    return;
  }
  queue = queue.then(
    () => run(request),
    () => run(request)
  );
});

self.addEventListener("unhandledrejection", (event) => {
  event.preventDefault();
  const request = [...active.keys()][0];
  if (request) {
    sendRejected(request, "invalid-request");
  }
});
