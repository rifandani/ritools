import { expect, it } from "@effect/vitest";
import { Effect } from "effect";
import { afterEach, vi } from "vitest";

import * as T from "./tabular";
import { parseFile } from "./tabular.format";
import {
  boundsOf,
  columnName,
  displayValue,
  engineFailure,
  parsePaste,
  quotedTsv,
  readLocalFile,
  stockSample,
  writeClipboard,
  writeClipboardWhenReady,
} from "./tabular.ui";

afterEach(() => {
  vi.unstubAllGlobals();
});

class Item {
  readonly parts: Record<string, Promise<Blob>>;
  constructor(parts: Record<string, Promise<Blob>>) {
    this.parts = parts;
  }
}

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

it("formats every cell value for display", () => {
  expect(displayValue({ _tag: "Text", text: " 001 " })).toBe(" 001 ");
  expect(displayValue({ _tag: "Number", value: 3.5 })).toBe("3.5");
  expect(displayValue({ _tag: "Boolean", value: true })).toBe("TRUE");
  expect(displayValue({ _tag: "Boolean", value: false })).toBe("FALSE");
  expect(
    displayValue({
      _tag: "Unresolved",
      reason: "missing-formula-result",
      display: "#N/A",
    })
  ).toBe("#N/A");
  expect(displayValue({ _tag: "Blank" })).toBe("");
});

it.effect(
  "reads a local file, or reports a corrupt source without detail",
  () =>
    Effect.gen(function* () {
      const file = new File(["a,b\n1,2"], "table.csv", { type: "text/csv" });
      const source = yield* readLocalFile(file);
      expect(source.name).toBe("table.csv");
      expect(source.size).toBe(file.size);
      expect(new TextDecoder().decode(source.bytes)).toBe("a,b\n1,2");

      const denied = Object.assign(new File([], "private.csv"), {
        arrayBuffer: () => Promise.reject(new Error("private detail")),
      });
      const result = yield* Effect.result(readLocalFile(denied));
      expect(result._tag).toBe("Failure");
      if (result._tag === "Failure") {
        expect(result.failure).toBeInstanceOf(T.CorruptFile);
        expect(result.failure.requestId.length).toBeGreaterThan(0);
      }
    })
);

it.effect("writes clipboard text, or reports a denied permission", () =>
  Effect.gen(function* () {
    const writeText = vi.fn(() => Promise.resolve());
    vi.stubGlobal("navigator", { clipboard: { writeText } });
    yield* writeClipboard("a\tb");
    expect(writeText).toHaveBeenCalledWith("a\tb");

    vi.stubGlobal("navigator", {
      clipboard: {
        writeText: () => Promise.reject(new Error("private detail")),
      },
    });
    const result = yield* Effect.result(writeClipboard("private cell"));
    expect(result._tag).toBe("Failure");
    if (result._tag === "Failure") {
      expect(result.failure).toBe("clipboard-denied");
    }
    expect(JSON.stringify(result)).not.toContain("private cell");
  })
);

it.effect("copies pending range text through a promised ClipboardItem", () =>
  Effect.gen(function* () {
    let copied = "";
    vi.stubGlobal("ClipboardItem", Item);
    vi.stubGlobal("navigator", {
      clipboard: {
        write: async (items: Item[]) => {
          const part = items[0]?.parts["text/plain"];
          if (part) {
            const blob = await part;
            copied = await blob.text();
          }
        },
      },
    });
    const written = yield* writeClipboardWhenReady(
      Promise.resolve("a\tb\nc\td")
    );
    expect(written).toBe(true);
    expect(copied).toBe("a\tb\nc\td");
  })
);

it.effect("writes settled text when the browser has no ClipboardItem", () =>
  Effect.gen(function* () {
    const writeText = vi.fn(() => Promise.resolve());
    vi.stubGlobal("ClipboardItem", null);
    vi.stubGlobal("navigator", { clipboard: { writeText } });
    const written = yield* writeClipboardWhenReady(Promise.resolve("a\tb"));
    expect(written).toBe(true);
    expect(writeText).toHaveBeenCalledWith("a\tb");
  })
);

it.effect("writes nothing when the range read fails", () =>
  Effect.gen(function* () {
    const writeText = vi.fn(() => Promise.resolve());
    vi.stubGlobal("ClipboardItem", null);
    vi.stubGlobal("navigator", { clipboard: { writeText } });
    const written = yield* writeClipboardWhenReady(Promise.resolve(null));
    expect(written).toBe(false);
    expect(writeText).not.toHaveBeenCalled();
  })
);

it.effect("falls back to writeText when a promised item is refused", () =>
  Effect.gen(function* () {
    const writeText = vi.fn(() => Promise.resolve());
    vi.stubGlobal("ClipboardItem", Item);
    vi.stubGlobal("navigator", {
      clipboard: {
        write: () => Promise.reject(new Error("refused")),
        writeText,
      },
    });
    const written = yield* writeClipboardWhenReady(Promise.resolve("a\tb"));
    expect(written).toBe(true);
    expect(writeText).toHaveBeenCalledWith("a\tb");
  })
);

it.effect("reports a denied clipboard without printing the text", () =>
  Effect.gen(function* () {
    vi.stubGlobal("ClipboardItem", null);
    vi.stubGlobal("navigator", {
      clipboard: {
        writeText: () => Promise.reject(new Error("private detail")),
      },
    });
    const result = yield* Effect.result(
      writeClipboardWhenReady(Promise.resolve("private cell"))
    );
    expect(result._tag).toBe("Failure");
    if (result._tag === "Failure") {
      expect(result.failure).toBe("clipboard-denied");
    }
    expect(JSON.stringify(result)).not.toContain("private cell");
  })
);

it("unwraps an engine error from Atom cause reasons only", () => {
  const failure = new T.InvalidPaste({
    requestId: T.RequestId.make("cause-test"),
    operation: "paste",
    sessionId: null,
    reason: "syntax",
  });
  expect(engineFailure({ cause: { reasons: [{ error: failure }] } })).toBe(
    failure
  );
  expect(engineFailure({ cause: { reasons: [{}] } })).toBeNull();
  expect(engineFailure({ cause: { reasons: "private detail" } })).toBeNull();
  expect(engineFailure({ cause: {} })).toBeNull();
});

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
