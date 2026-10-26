import { expect, it } from "@effect/vitest";
import { Schema } from "effect";

import * as T from "./tabular";
import { parseFile } from "./tabular.format";
import { packFile, unpackFile, PackedFile } from "./tabular.format-protocol";

it("packs text cells without source bytes and restores exact types and provenance", () => {
  const bytes = new TextEncoder().encode("a,b\n001,  x  ");
  const source = { name: "test.csv", size: bytes.length, bytes };
  const ctx = {
    requestId: T.RequestId.make("pack"),
    sessionId: null,
    operation: "test",
  };
  const parsed = parseFile(source, T.defaultParseOptions, ctx);
  const packed = Schema.decodeUnknownSync(PackedFile)(
    structuredClone(packFile(parsed))
  );
  expect(packed.sheets[0]?.rows[1]).toEqual(["001", "  x  "]);
  expect(Object.hasOwn(packed, "source")).toBe(false);
  expect(unpackFile(packed, source)).toEqual(parsed);
  const workbook = {
    ...parsed,
    format: "xlsx" as const,
    sheets: parsed.sheets.map((s) => ({
      ...s,
      rows: [
        [
          {
            value: { _tag: "Number" as const, value: 42 },
            origin: "stored-formula" as const,
          },
          { value: { _tag: "Blank" as const }, origin: "workbook" as const },
        ],
      ],
    })),
  };
  expect(
    unpackFile(Schema.decodeUnknownSync(PackedFile)(packFile(workbook)), source)
  ).toEqual(workbook);
});
