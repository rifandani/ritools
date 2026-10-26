/* eslint-disable eslint/no-bitwise, eslint/no-shadow, eslint/no-await-in-loop, eslint/prefer-destructuring, unicorn/no-new-array, unicorn/prefer-spread, unicorn/relative-url-style, unicorn/no-array-sort, unicorn/prefer-code-point, unicorn/no-useless-undefined, promise/no-promise-in-callback -- tests build binary fixtures and catch thrown values */
/* oxlint-disable anti-slop/require-safety-comment-for-type-assertion, anti-slop/no-unknown-parameters, anti-slop/no-shape-in-symbol-names -- tests narrow data they built or caught */
import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import {
  decodeCbor,
  extractC2paStores,
  scanC2pa,
} from "@/features/expose/expose.c2pa";

const sample = (name: string): Uint8Array =>
  new Uint8Array(
    readFileSync(
      new URL(`../../../public/samples/expose/${name}`, import.meta.url)
    )
  );

const utf8 = (value: string): number[] => [...new TextEncoder().encode(value)];

const box = (type: string, body: readonly number[]): number[] => {
  const length = 8 + body.length;
  return [
    (length >>> 24) & 0xff,
    (length >>> 16) & 0xff,
    (length >>> 8) & 0xff,
    length & 0xff,
    ...utf8(type),
    ...body,
  ];
};

const u32 = (value: number): number[] => [
  (value >>> 24) & 0xff,
  (value >>> 16) & 0xff,
  (value >>> 8) & 0xff,
  value & 0xff,
];

const u16le = (value: number): number[] => [value & 0xff, (value >>> 8) & 0xff];
const u32le = (value: number): number[] => [
  value & 0xff,
  (value >>> 8) & 0xff,
  (value >>> 16) & 0xff,
  (value >>> 24) & 0xff,
];

const cborText = (value: string): number[] =>
  value.length < 24
    ? [0x60 + value.length, ...utf8(value)]
    : [0x78, value.length, ...utf8(value)];

const cborMap = (
  entries: readonly (readonly [string, number[]])[]
): number[] => [
  0xa0 + entries.length,
  ...entries.flatMap(([key, value]) => [...cborText(key), ...value]),
];

const cborArray = (items: readonly (readonly number[])[]): number[] => [
  0x80 + items.length,
  ...items.flat(),
];

const claimCbor = (): number[] =>
  cborMap([
    ["claim_generator", cborText("Test_AI c2pa-rs/1.0")],
    [
      "actions",
      cborArray([
        cborMap([
          ["action", cborText("c2pa.created")],
          [
            "digitalSourceType",
            cborText(
              "http://cv.iptc.org/newscodes/digitalsourcetype/trainedAlgorithmicMedia"
            ),
          ],
          [
            "parameters",
            [
              0xbf,
              ...cborText("com.example.version"),
              ...cborText("1.0"),
              0xff,
            ],
          ],
        ]),
      ]),
    ],
  ]);

const storeOf = (): Uint8Array =>
  new Uint8Array(
    box("jumb", [
      ...box("jumd", [...new Array(16).fill(0), 0, ...utf8("c2pa.claim"), 0]),
      ...box("cbor", claimCbor()),
    ])
  );

const pngOf = (store: Uint8Array): Uint8Array => {
  const signature = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  return new Uint8Array([
    ...signature,
    ...u32(store.length),
    ...utf8("caBX"),
    ...store,
    0,
    0,
    0,
    0,
  ]);
};

const webpOf = (store: Uint8Array): Uint8Array => {
  const chunk = [
    ...utf8("C2PA"),
    store.length & 0xff,
    (store.length >>> 8) & 0xff,
    (store.length >>> 16) & 0xff,
    (store.length >>> 24) & 0xff,
    ...store,
  ];
  const riffLength = 4 + chunk.length;
  return new Uint8Array([
    ...utf8("RIFF"),
    riffLength & 0xff,
    (riffLength >>> 8) & 0xff,
    (riffLength >>> 16) & 0xff,
    (riffLength >>> 24) & 0xff,
    ...utf8("WEBP"),
    ...chunk,
  ]);
};

const tiffOf = (store: Uint8Array): Uint8Array => {
  const ifdOffset = 8;
  const entryOffset = ifdOffset + 2 + 12 + 4;
  return new Uint8Array([
    0x49,
    0x49,
    0x2a,
    0x00,
    ...u32le(ifdOffset),
    ...u16le(1),
    0x41,
    0xcd,
    ...u16le(7),
    ...u32le(store.length),
    ...u32le(entryOffset),
    ...u32le(0),
    ...store,
  ]);
};

const bmffOf = (store: Uint8Array): Uint8Array =>
  new Uint8Array([...box("ftyp", [...utf8("avif"), 0, 0, 0, 0]), ...store]);

const gifOf = (store: Uint8Array): Uint8Array => {
  const subBlocks: number[] = [];
  for (let offset = 0; offset < store.length; offset += 255) {
    const part = store.subarray(offset, offset + 255);
    subBlocks.push(part.length, ...part);
  }
  return new Uint8Array([
    ...utf8("GIF89a"),
    1,
    0,
    1,
    0,
    0,
    0,
    0,
    0x21,
    0xff,
    11,
    ...utf8("C2PA_GIF"),
    0,
    0,
    0,
    ...subBlocks,
    0,
    0x3b,
  ]);
};

describe("C2PA scan of real samples", () => {
  it("reads the camera manifest", () => {
    const scan = scanC2pa(sample("camera-nikon-z9-c2pa.jpg"), "jpeg");
    expect(scan).not.toBeNull();
    expect(scan?.bytes).toBeGreaterThan(200_000);
    expect(scan?.claimGenerator).toContain("Nikon_Z_9_Sample");
    expect(scan?.manifests).toBe(1);
    expect(scan?.hasThumbnail).toBe(true);
    expect(scan?.parsed).toBe(true);
  });

  it("reads the AI manifest's actions and generation parameters", () => {
    const scan = scanC2pa(sample("ai-firefly-c2pa.jpg"), "jpeg");
    expect(scan?.claimGenerator).toBe("Adobe_Firefly");
    expect(scan?.actions).toContain("c2pa.created");
    expect(scan?.digitalSourceTypes[0]).toContain("trainedAlgorithmicMedia");
    expect(scan?.parameters).toEqual(
      expect.arrayContaining([
        { label: "com.adobe.firefly.operation", value: "text_to_image" },
      ])
    );
  });

  it("returns null when there is no manifest", () => {
    expect(scanC2pa(new Uint8Array([1, 2, 3]), "jpeg")).toBeNull();
  });

  it("gathers JPEG segments into one store", () => {
    expect(
      extractC2paStores(sample("camera-nikon-z9-c2pa.jpg"), "jpeg")
    ).toHaveLength(1);
  });
});

describe("C2PA container carriers", () => {
  const store = storeOf();
  const cases: readonly [string, FileFormatLike][] = [
    ["png", "png"],
    ["webp", "webp"],
    ["tiff", "tiff"],
    ["avif", "avif"],
    ["gif", "gif"],
  ];
  for (const [name, format] of cases) {
    it(`finds a ${format} carrier`, () => {
      const bytes =
        name === "png"
          ? pngOf(store)
          : name === "webp"
            ? webpOf(store)
            : name === "tiff"
              ? tiffOf(store)
              : name === "gif"
                ? gifOf(store)
                : bmffOf(store);
      const scan = scanC2pa(bytes, format);
      expect(scan).not.toBeNull();
      expect(scan?.claimGenerator).toBe("Test_AI c2pa-rs/1.0");
      expect(scan?.actions).toContain("c2pa.created");
      expect(scan?.parameters).toEqual([
        { label: "com.example.version", value: "1.0" },
      ]);
    });
  }

  it("finds an ISO BMFF C2PA uuid box", () => {
    const uuid = [
      0xd8, 0xfe, 0xc3, 0xd6, 0x1b, 0x0e, 0x48, 0x3c, 0x92, 0x97, 0x58, 0x28,
      0x87, 0x7e, 0xc4, 0x81,
    ];
    const bytes = new Uint8Array([
      ...box("ftyp", [...utf8("avif"), 0, 0, 0, 0]),
      ...box("uuid", [...uuid, ...store]),
    ]);
    expect(scanC2pa(bytes, "avif")?.claimGenerator).toBe("Test_AI c2pa-rs/1.0");
  });
});

describe("CBOR", () => {
  it("decodes definite maps, arrays, text, and bytes", () => {
    const bytes = new Uint8Array([
      0xa2,
      ...cborText("text"),
      ...cborText("value"),
      ...cborText("bytes"),
      0x42,
      1,
      2,
    ]);
    expect(decodeCbor(bytes)).toEqual({
      bytes: new Uint8Array([1, 2]),
      text: "value",
    });
  });

  it("decodes indefinite maps, arrays, and text", () => {
    const bytes = new Uint8Array([
      0xbf,
      ...cborText("actions"),
      0x9f,
      0xa1,
      ...cborText("action"),
      ...cborText("c2pa.created"),
      0xff,
      0xff,
    ]);
    expect(decodeCbor(bytes)).toEqual({
      actions: [{ action: "c2pa.created" }],
    });
  });

  it("decodes integers, negatives, booleans, null, and tags", () => {
    expect(decodeCbor(new Uint8Array([0x01]))).toBe(1);
    expect(decodeCbor(new Uint8Array([0x20]))).toBe(-1);
    expect(decodeCbor(new Uint8Array([0xf4]))).toBe(false);
    expect(decodeCbor(new Uint8Array([0xf5]))).toBe(true);
    expect(decodeCbor(new Uint8Array([0xf6]))).toBeNull();
    expect(decodeCbor(new Uint8Array([0xc1, 0x01]))).toBe(1);
    expect(decodeCbor(new Uint8Array([0x1b, 0, 0, 0, 1, 0, 0, 0, 0]))).toBe(
      2 ** 32
    );
  });

  it("keeps a __proto__ key as an own property", () => {
    // SAFETY: a CBOR map with one text key decodes to an object.
    const decoded = decodeCbor(
      new Uint8Array([0xa1, ...cborText("__proto__"), ...cborText("payload")])
    ) as object;
    expect(Object.getPrototypeOf(decoded)).toBe(Object.prototype);
    expect(Object.getOwnPropertyDescriptor(decoded, "__proto__")?.value).toBe(
      "payload"
    );
  });

  it("does not throw on a truncated string", () => {
    expect(decodeCbor(new Uint8Array([0x78, 0xff]))).toBe("");
  });
});

type FileFormatLike = "avif" | "gif" | "png" | "tiff" | "webp";
