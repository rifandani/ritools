/* eslint-disable eslint/no-await-in-loop -- the interpreter lifecycle test uses serial requests */
/* eslint-disable unicorn/consistent-function-scoping -- the fetch stub belongs to the engine-load test */
import { beforeEach, expect, it, vi } from "vitest";

import { ExposeError } from "@/features/expose/expose";
import {
  createMetadataEngine,
  engineFailure,
  fatalEngineFailure,
} from "@/features/expose/expose.engine";

const { parse, reset } = vi.hoisted(() => ({ parse: vi.fn(), reset: vi.fn() }));
vi.mock("@colorhythm/exiftool-wasm", () => ({
  parseMetadata: parse,
  writeMetadata: vi.fn(),
  dispose: reset,
}));
const input = { bytes: new Uint8Array([1]), name: "source.jpg", type: "" };
const progress = () => {};
beforeEach(() => {
  parse.mockReset();
  reset.mockReset();
});
it("uses display values with fixed numeric tags before all", async () => {
  parse.mockResolvedValue({
    success: true,
    data: JSON.stringify([
      { "GPS:GPSLatitude": 40.736435, "ExifIFD:ExposureTime": "1/80" },
    ]),
  });
  const fetch = () => Promise.resolve(new Response());
  const engine = createMetadataEngine(() => Promise.resolve(fetch));
  const tags = await engine.read(input, progress);
  expect(tags.get("GPS:GPSLatitude")).toBe(40.736435);
  expect(tags.get("ExifIFD:ExposureTime")).toBe("1/80");
  expect(parse.mock.calls[0]?.[1].args.indexOf("-GPSLatitude#")).toBeLessThan(
    parse.mock.calls[0]?.[1].args.indexOf("-all")
  );
});
it("extracts one byte-exact binary tag", async () => {
  const bytes = new Uint8Array([0xff, 0, 0xfe]);
  parse.mockResolvedValue({ success: true, data: bytes });
  expect(
    await createMetadataEngine().extract(input, "ThumbnailImage", progress)
  ).toBe(bytes);
  expect(parse.mock.calls[0]?.[1]).toMatchObject({
    binary: true,
    args: ["-b", "-ThumbnailImage", "-m", "-q"],
  });
});
it.each([
  "null",
  "[]",
  "[null]",
  "[[]]",
  '[{"ExifTool:Error":"bad file"}]',
  '[{"ExifTool:Warning":"Truncated file"}]',
  "not JSON",
])("rejects an invalid engine record: %s", async (data) => {
  parse.mockResolvedValue({ success: true, data });
  await expect(
    createMetadataEngine().read(input, progress)
  ).rejects.toBeInstanceOf(ExposeError);
});
it("maps a package failure for both operations", async () => {
  parse.mockResolvedValue({ success: false, error: "offline fetch failed" });
  const engine = createMetadataEngine();
  await expect(engine.read(input, progress)).rejects.toMatchObject({
    code: "engine-unavailable",
  });
  await expect(
    engine.extract(input, "ThumbnailImage", progress)
  ).rejects.toMatchObject({ code: "engine-unavailable" });
});
it("preserves named failures and detects fatal interpreter errors", () => {
  const error = new ExposeError({ code: "cancelled", detail: "cancelled" });
  expect(engineFailure(error)).toBe(error);
  expect(engineFailure(new RangeError("out of memory")).code).toBe("too-large");
  expect(engineFailure("unexpected").code).toBe("engine-failed");
  expect(fatalEngineFailure("Failed to reset Perl interpreter")).toBe(true);
  expect(fatalEngineFailure("ordinary missing tag")).toBe(false);
});

it("resets a failed interpreter once for a Node engine call", async () => {
  parse.mockRejectedValueOnce(new RangeError("offset is out of bounds"));
  parse.mockResolvedValueOnce({
    success: true,
    data: '[{"File:FileType":"JPEG"}]',
  });
  const result = await createMetadataEngine().read(input, progress);
  expect(result.get("File:FileType")).toBe("JPEG");
  expect(reset).toHaveBeenCalledTimes(1);
});

it("bounds interpreter lifetime while keeping the engine port", async () => {
  parse.mockResolvedValue({
    success: true,
    data: '[{"File:FileType":"JPEG"}]',
  });
  const engine = createMetadataEngine();
  for (let i = 0; i < 33; i += 1) {
    await engine.read(input, progress);
  }
  expect(reset).toHaveBeenCalledTimes(1);
});
