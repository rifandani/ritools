/// <reference lib="webworker" />
/* oxlint-disable unicorn/require-post-message-target-origin -- Dedicated Worker messages have no target origin. */
import { Schema } from "effect";

import { libraryWorkerReady } from "@/core/libs/library-load";

import { CleaveSession } from "./cleave.session";

const Request = Schema.Struct({
  type: Schema.Literal("compare"),
  before: Schema.String,
  after: Schema.String,
  beforeName: Schema.optional(Schema.String),
  afterName: Schema.optional(Schema.String),
});
self.addEventListener("message", (event: MessageEvent<unknown>) => {
  if (!Schema.is(Request)(event.data)) {
    return;
  }
  try {
    self.postMessage({
      type: "result",
      diff: CleaveSession.compare(event.data).view.diff,
    });
  } catch {
    self.postMessage({ type: "error" });
  }
});
libraryWorkerReady();
