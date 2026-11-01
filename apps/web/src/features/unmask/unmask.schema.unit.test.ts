/* oxlint-disable anti-slop/require-safety-comment-for-type-assertion, anti-slop/no-shape-in-symbol-names, eslint/no-await-in-loop, eslint/no-unused-vars, typescript/array-type, typescript/no-non-null-assertion, unicorn/consistent-function-scoping, unicorn/no-useless-undefined -- tests build typed fixtures and replay steps in order. */
import { Schema } from "effect";
import { describe, expect, it } from "vitest";

import {
  Backdrop,
  errorCodeOf,
  Matte,
  RasterImage,
  UnmaskErrorSchema,
} from "@/features/unmask/unmask.schema";

const decodeMatte = Schema.decodeUnknownSync(Matte);
const decodeRaster = Schema.decodeUnknownSync(RasterImage);
const decodeError = Schema.decodeUnknownSync(UnmaskErrorSchema);
const decodeBackdrop = Schema.decodeUnknownSync(Backdrop);

describe("the engine schemas", () => {
  it("accepts a Matte only with a matching alpha length", () => {
    expect(
      decodeMatte({
        alpha: Uint8Array.from([0, 255]),
        height: 1,
        matteId: "m",
        width: 2,
      }).width
    ).toBe(2);
    expect(() =>
      decodeMatte({
        alpha: Uint8Array.from([0]),
        height: 1,
        matteId: "m",
        width: 2,
      })
    ).toThrow();
  });

  it("accepts a RasterImage only with four samples per pixel", () => {
    expect(
      decodeRaster({
        height: 1,
        rgba: Uint8Array.from([0, 0, 0, 255]),
        width: 1,
      }).width
    ).toBe(1);
    expect(() =>
      decodeRaster({ height: 1, rgba: Uint8Array.from([0, 0, 0]), width: 1 })
    ).toThrow();
  });

  it("decodes every named error", () => {
    const errors = [
      { _tag: "UnsupportedFormat", format: "heic" },
      { _tag: "UnreadableFile", reason: "decode" },
      {
        _tag: "TooLarge",
        height: 1,
        neededBytes: 1,
        pixels: 1,
        width: 1,
      },
      { _tag: "ModelUnavailable", reason: "offline" },
      { _tag: "ModelFailed", reason: "inference" },
      { _tag: "Cancelled" },
      { _tag: "EncodeFailed", reason: "jpeg-needs-backdrop" },
      { _tag: "EncodeFailed", reason: "jpeg-transparent" },
      { _tag: "EncodeFailed", reason: "codec" },
      { _tag: "EncodeFailed", reason: "memory" },
    ];
    for (const error of errors) {
      expect(decodeError(error)._tag).toBe(error._tag);
    }
    expect(() => decodeError({ _tag: "Nope" })).toThrow();
  });

  it("decodes the three Backdrops", () => {
    expect(decodeBackdrop({ _tag: "Transparent" })._tag).toBe("Transparent");
    expect(
      decodeBackdrop({
        _tag: "Solid",
        color: { a: 255, b: 255, g: 255, r: 255 },
      })._tag
    ).toBe("Solid");
    expect(decodeBackdrop({ _tag: "Blur", radius: 20 })._tag).toBe("Blur");
  });

  it("names each failure for the copy selector", () => {
    expect(errorCodeOf({ _tag: "UnsupportedFormat", format: "heic" })).toBe(
      "unsupported"
    );
    expect(errorCodeOf({ _tag: "UnreadableFile", reason: "decode" })).toBe(
      "unreadable"
    );
    expect(
      errorCodeOf({
        _tag: "TooLarge",
        height: 1,
        neededBytes: 1,
        pixels: 1,
        width: 1,
      })
    ).toBe("too-large");
    expect(errorCodeOf({ _tag: "ModelUnavailable", reason: "init" })).toBe(
      "model-unavailable"
    );
    expect(errorCodeOf({ _tag: "ModelFailed", reason: "memory" })).toBe(
      "model-failed"
    );
    expect(errorCodeOf({ _tag: "Cancelled" })).toBe("cancelled");
    expect(
      errorCodeOf({ _tag: "EncodeFailed", reason: "jpeg-needs-backdrop" })
    ).toBe("jpeg-needs-backdrop");
    expect(errorCodeOf({ _tag: "EncodeFailed", reason: "codec" })).toBe(
      "encode-failed"
    );
  });
});
