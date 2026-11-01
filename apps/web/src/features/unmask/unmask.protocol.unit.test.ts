/* oxlint-disable anti-slop/require-safety-comment-for-type-assertion, anti-slop/no-shape-in-symbol-names, eslint/no-await-in-loop, eslint/no-unused-vars, typescript/array-type, typescript/no-non-null-assertion, unicorn/consistent-function-scoping, unicorn/no-useless-undefined -- tests build typed fixtures and replay steps in order. */
import { Schema } from "effect";
import { describe, expect, it } from "vitest";

import type { Matte, MatteId } from "@/features/unmask/unmask.engine";
import {
  requestIdOf,
  WorkerReply,
  WorkerRequest,
} from "@/features/unmask/unmask.protocol";

const matteId = (value: string): MatteId => value as MatteId;
const matte: Matte = {
  alpha: Uint8Array.from([0, 255]),
  height: 1,
  matteId: matteId("m"),
  width: 2,
};
const image = {
  height: 1,
  rgba: Uint8Array.from([0, 0, 0, 255, 0, 0, 0, 255]),
  width: 2,
};

const decodeRequest = Schema.decodeUnknownSync(WorkerRequest);
const decodeReply = Schema.decodeUnknownSync(WorkerReply);

describe("the Worker request protocol", () => {
  it("decodes each request shape", () => {
    expect(
      decodeRequest({
        _tag: "Remove",
        bytes: Uint8Array.from([1]),
        imageToken: "image-1",
        mime: "image/png",
        name: "a.png",
        previewMaxEdge: 2048,
        requestId: requestIdOf(1),
      })._tag
    ).toBe("Remove");
    expect(
      decodeRequest({
        _tag: "Composite",
        backdrop: { _tag: "Transparent" },
        feather: 0,
        imageToken: "image-1",
        matte,
        requestId: requestIdOf(2),
        source: image,
      })._tag
    ).toBe("Composite");
    expect(
      decodeRequest({
        _tag: "Encode",
        format: "webp",
        image,
        imageToken: "image-1",
        nameStem: "a",
        quality: 85,
        requestId: requestIdOf(3),
      })._tag
    ).toBe("Encode");
    expect(
      decodeRequest({
        _tag: "Cancel",
        imageToken: "image-1",
        requestId: requestIdOf(4),
        target: requestIdOf(3),
      })._tag
    ).toBe("Cancel");
    expect(
      decodeRequest({
        _tag: "Close",
        imageToken: "image-1",
        requestId: requestIdOf(5),
      })._tag
    ).toBe("Close");
  });

  it("rejects an unknown tag and a missing field", () => {
    expect(() => decodeRequest({ _tag: "Nope" })).toThrow();
    expect(() =>
      decodeRequest({
        _tag: "Remove",
        bytes: Uint8Array.from([1]),
        imageToken: "image-1",
        mime: "image/png",
        name: "a.png",
        requestId: requestIdOf(1),
      })
    ).toThrow();
  });

  it("decodes each reply shape", () => {
    expect(
      decodeReply({
        _tag: "Progress",
        event: { _tag: "ModelDownload", loaded: 10, total: 100 },
        requestId: requestIdOf(1),
      })._tag
    ).toBe("Progress");
    expect(
      decodeReply({
        _tag: "Failed",
        error: { _tag: "Cancelled" },
        requestId: requestIdOf(1),
      })._tag
    ).toBe("Failed");
    expect(
      decodeReply({
        _tag: "Closed",
        requestId: requestIdOf(1),
      })._tag
    ).toBe("Closed");
  });

  it("increments opaque request ids", () => {
    expect(requestIdOf(1)).toBe("request-1");
    expect(requestIdOf(2)).not.toBe(requestIdOf(1));
  });
});
