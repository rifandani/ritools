/* oxlint-disable anti-slop/no-unknown-parameters -- the boundary test feeds the listener the payloads a hostile sender could post */
/**
 * The Worker's message boundary.
 *
 * Chrome reports `event.origin` as an empty string for a message delivered to a
 * DedicatedWorker, while `self.location.origin` is the page origin. An origin
 * check in this listener therefore rejects every request, and the first
 * compression hangs on Working forever with no codec request ever made. These
 * cases drive the real listener, so that regression goes red here.
 */
import { setTimeout as delay } from "node:timers/promises";

import { beforeAll, beforeEach, describe, expect, it } from "vitest";

type MessageListener = (event: {
  readonly data: unknown;
  readonly origin: string;
}) => void;

const replies: unknown[] = [];
const listeners: MessageListener[] = [];

/** The smallest stand-in for the DedicatedWorker global the module expects. */
const scope = {
  addEventListener: (type: string, listener: MessageListener): void => {
    if (type === "message") {
      listeners.push(listener);
    }
  },
  location: { origin: "http://localhost:4000" },
  postMessage: (message: unknown): void => {
    replies.push(message);
  },
};

/** A reply is an object with a `kind`: `opened`, `encoded`, or `failed`. */
const isReply = (value: unknown): value is { readonly kind: string } =>
  typeof value === "object" && value !== null && "kind" in value;

const replyKinds = (): string[] => replies.filter(isReply).map((r) => r.kind);

const dispatch = (data: unknown, origin = ""): void => {
  for (const listener of listeners) {
    listener({ data, origin });
  }
};

beforeAll(async () => {
  Object.assign(globalThis, { self: scope });
  await import("@/features/squeeze/squeeze.worker");
});

beforeEach(() => {
  replies.length = 0;
});

describe("the codec Worker message boundary", () => {
  it("handles a request that arrives with an empty origin", async () => {
    // An `open` of one byte reaches `createImageBitmap`, which Node lacks, so
    // the Worker answers with a rejection: any answer proves it was handled.
    dispatch({
      bytes: new ArrayBuffer(1),
      format: "png",
      kind: "open",
      maxHeight: 0,
      maxWidth: 0,
      preserveExif: false,
    });
    await expect
      .poll(() => replyKinds(), { timeout: 2000 })
      .toEqual(["failed"]);
  });

  it("ignores a message that names no request", async () => {
    dispatch({ kind: "not-a-request" });
    await delay(50);
    expect(replies).toHaveLength(0);
  });

  it("ignores a message that is not an object", async () => {
    dispatch("open");
    await delay(50);
    expect(replies).toHaveLength(0);
  });
});
