import { expect, it } from "@effect/vitest";
import { Effect } from "effect";

import * as T from "./tabular";
import { parseFile } from "./tabular.format";
import {
  boundsOf,
  columnName,
  engineFailure,
  parsePaste,
  quotedTsv,
  stockSample,
} from "./tabular.ui";

it.effect(
  "round-trips quoted clipboard text without losing whitespace, empty cells, or long IDs",
  () =>
    Effect.gen(function* () {
      const values = [
        ["00001", "  text  ", "1234567890123456789012345", ""],
        ["a\tb", 'a"b', "first\nsecond", ""],
      ];
      expect(yield* parsePaste(quotedTsv(values))).toEqual(values);
    })
);

it.effect("rejects malformed and ragged paste before any engine edit", () =>
  Effect.gen(function* () {
    for (const text of ['"unclosed', "a\tb\nc", 'plain"quote']) {
      const result = yield* Effect.result(parsePaste(text));
      expect(result._tag).toBe("Failure");
    }
  })
);

it("uses geometric bounds and supports wide column addresses", () => {
  expect(
    boundsOf({
      anchor: { row: 10, column: 999 },
      extent: { row: 1, column: 0 },
    })
  ).toEqual({ rowStart: 1, rowEnd: 10, columnStart: 0, columnEnd: 999 });
  expect(columnName(0)).toBe("A");
  expect(columnName(26)).toBe("AA");
  expect(columnName(999)).toBe("ALL");
});

it.effect(
  "decodes typed Atom rejections without printing parser or file content",
  () =>
    Effect.gen(function* () {
      const expectedFailure = new T.InvalidPaste({
        requestId: T.RequestId.make("ui-test"),
        operation: "paste",
        sessionId: null,
        reason: "bounds",
      });
      expect(engineFailure(expectedFailure)).toBe(expectedFailure);
      const rejected = yield* Effect.promise(async () => {
        try {
          await Effect.runPromise(Effect.fail(expectedFailure));
        } catch (error) {
          return error;
        }
        return null;
      });
      expect(engineFailure(rejected)).toEqual(expectedFailure);
      expect(engineFailure(new Error("private cell content"))).toBeNull();
    })
);

it("ships a text sample through the real parser, with leading zeros and multiline values", () => {
  const file = parseFile(stockSample(), T.defaultParseOptions, {
    requestId: T.RequestId.make("sample"),
    operation: "test",
    sessionId: null,
  });
  expect(file.sheets[0]?.rows[1]?.[0]?.value).toEqual({
    _tag: "Text",
    text: "00104",
  });
});
