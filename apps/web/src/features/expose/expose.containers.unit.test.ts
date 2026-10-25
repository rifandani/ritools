/* eslint-disable eslint/no-bitwise, eslint/no-await-in-loop -- these tests mutate binary container fields and verify each result in sequence */
import { readFileSync } from "node:fs";

import { zipSync, strToU8, unzipSync } from "fflate";
import { expect, it } from "vitest";

import { sniffFormat } from "@/features/expose/expose";
import { checkContent, mediaBoxes } from "@/features/expose/expose.content";
import { TAG_MAP } from "@/features/expose/expose.groups";
import {
  officeEntries,
  readOffice,
  writeOffice,
  OFFICE_PARTS,
} from "@/features/expose/expose.office";
import { gpsCoordinatesOf } from "@/features/expose/expose.reader";

const fixture = (ext: string) =>
  new Uint8Array(
    readFileSync(new URL(`fixtures/metadata.${ext}`, import.meta.url))
  );
it.each(["docx", "xlsx", "pptx"])(
  "keeps every non-metadata ZIP entry byte exact in %s",
  async (format) => {
    const bytes = fixture(format);
    const output = writeOffice(bytes, Object.values(TAG_MAP.office).flat());
    const decodedBefore = new Map(Object.entries(unzipSync(bytes)));
    const decodedAfter = new Map(Object.entries(unzipSync(output)));
    for (const [name, content] of decodedBefore) {
      if (!OFFICE_PARTS.has(name)) {
        expect(decodedAfter.get(name)).toEqual(content);
      }
    }
    const before = officeEntries(bytes);
    const after = officeEntries(output);
    expect(after.map((entry) => entry.name)).toEqual(
      before.map((entry) => entry.name)
    );
    for (const entry of before.filter((item) => !OFFICE_PARTS.has(item.name))) {
      expect(after.find((item) => item.name === entry.name)?.data).toEqual(
        entry.data
      );
    }
    expect(readOffice(output).properties).toEqual([]);
    expect(readOffice(output).thumbnail).toBeNull();
    expect(
      await checkContent(
        bytes,
        output,
        format === "docx" ? "docx" : format === "xlsx" ? "xlsx" : "pptx"
      )
    ).toMatchObject({ kind: "office-parts", unchanged: true });
  }
);
it("rejects a ZIP with the wrong main content type", () => {
  const bytes = zipSync({
    "[Content_Types].xml": strToU8(
      '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Override PartName="/word/document.xml" ContentType="text/plain"/></Types>'
    ),
    "word/document.xml": strToU8("content"),
  });
  expect(sniffFormat(bytes, "false.docx")).toBeNull();
});
it("rejects a truncated ZIP and duplicate names", () => {
  expect(() => officeEntries(fixture("docx").slice(0, -1))).toThrow();
  const zip = zipSync(
    { "a.xml": strToU8("a"), "b.xml": strToU8("b") },
    { level: 0 }
  );
  const text = new TextDecoder("latin1").decode(zip);
  const at = text.lastIndexOf("b.xml");
  zip[at] = 97;
  expect(() => officeEntries(zip)).toThrow();
});
it("rejects metadata entities before parsing XML", () => {
  const zip = zipSync({
    "docProps/core.xml": strToU8(
      '<!DOCTYPE doc [<!ENTITY x SYSTEM "file:///etc/passwd">]><doc>&x;</doc>'
    ),
  });
  expect(() => readOffice(zip)).toThrow();
});
it("bounds decompression before reading an oversized metadata part", () => {
  const zip = zipSync({ "docProps/core.xml": strToU8("<doc/>") });
  const view = new DataView(zip.buffer);
  for (let at = 0; at + 46 < zip.length; at += 1) {
    if (view.getUint32(at, true) === 0x02_01_4b_50) {
      view.setUint32(at + 24, 3 * 1024 * 1024, true);
      break;
    }
  }
  expect(() => readOffice(zip)).toThrow();
});
it("detects changed document content and content types", async () => {
  for (const name of ["word/document.xml", "[Content_Types].xml"]) {
    const before = zipSync(Object.fromEntries([[name, strToU8("original")]]));
    const after = zipSync(Object.fromEntries([[name, strToU8("changed")]]));
    expect(await checkContent(before, after, "docx")).toMatchObject({
      unchanged: false,
    });
  }
});
it("detects changed media samples and sample counts", async () => {
  const before = fixture("mp4");
  const after = new Uint8Array(before);
  const mdat = mediaBoxes(after).find((box) => box.type === "mdat");
  if (mdat === undefined) {
    throw new Error("The fixture has no mdat");
  }
  after[mdat.body] = (after[mdat.body] ?? 0) ^ 1;
  expect(await checkContent(before, after, "mp4")).toMatchObject({
    kind: "media-samples",
    unchanged: false,
  });
  const changedCount = new Uint8Array(before);
  const text = new TextDecoder("latin1").decode(changedCount);
  const at = text.indexOf("stsz");
  if (at === -1) {
    throw new Error("The fixture has no sample count");
  }
  changedCount[at + 15] = (changedCount[at + 15] ?? 0) ^ 1;
  expect(await checkContent(before, changedCount, "mp4")).toMatchObject({
    unchanged: false,
  });
});
it("refuses content checks without a verifiable payload", async () => {
  await expect(
    checkContent(new Uint8Array([1]), new Uint8Array([2]), "jpeg")
  ).rejects.toMatchObject({ code: "engine-failed" });
  expect(() => mediaBoxes(new Uint8Array([1]))).toThrow();
});
it.each([
  ["40.736435, -73.99316", 40.736435, -73.99316],
  ["+40.736435-073.993160+174/", 40.736435, -73.99316],
  ["40 deg 44' 11.166\" N, 73 deg 59' 35.376\" W", 40.736435, -73.99316],
  ["95, -200", 90, -180],
] as const)("parses coordinates: %s", (value, lat, lon) => {
  expect(gpsCoordinatesOf(value)?.latitude).toBeCloseTo(lat, 6);
  expect(gpsCoordinatesOf(value)?.longitude).toBeCloseTo(lon, 6);
});
it("rejects incomplete coordinates", () => {
  expect(gpsCoordinatesOf("40 N")).toBeNull();
  expect(gpsCoordinatesOf("")).toBeNull();
});

it("extracts byte-exact Office thumbnails without loading another engine", () => {
  const { thumbnail } = readOffice(fixture("docx"));
  const cover = new Uint8Array(
    readFileSync(new URL("fixtures/cover.jpg", import.meta.url))
  );
  expect(thumbnail).toEqual(cover);
});

it("reports and removes unknown Office properties without hiding attributes", () => {
  const bytes = zipSync({
    "docProps/core.xml": strToU8(
      '<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:x="urn:fixture"><x:private owner="Fixture owner"/></cp:coreProperties>'
    ),
    "docProps/app.xml": strToU8(
      '<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties"><Manager>Fixture manager</Manager><Extra private="yes"/></Properties>'
    ),
  });
  const before = readOffice(bytes);
  expect(
    before.properties.some(
      (field) =>
        field.label === "Other property" &&
        field.value.includes("Fixture owner")
    )
  ).toBe(true);
  expect(
    before.properties.some(
      (field) => field.label === "Manager" && field.value === "Fixture manager"
    )
  ).toBe(true);
  const after = writeOffice(bytes, Object.values(TAG_MAP.office).flat());
  expect(readOffice(after).properties).toEqual([]);
});
