/* eslint-disable unicorn/no-useless-spread -- xmldom NodeLists are live; removal must iterate a snapshot */
/* eslint-disable eslint/complexity, eslint/no-bitwise, unicorn/prefer-dom-node-remove -- ZIP headers and CRC32 use bit operations; xmldom supports removeChild, not browser ChildNode.remove */
/* oxlint-disable react-doctor/js-set-map-lookups -- the property and selection lists are bounded to ten semantic groups */
import { DOMParser, XMLSerializer, onErrorStopParsing } from "@xmldom/xmldom";
import type { Node } from "@xmldom/xmldom";
import { inflateSync } from "fflate";

import type { FileFormat, MetadataContainer } from "@/features/expose/expose";
import { ExposeError } from "@/features/expose/expose.error";

/** Bounded OOXML container adapter. It has no semantic group or writer policy. */
export interface OfficeEntry {
  readonly name: string;
  readonly header: Uint8Array;
  readonly data: Uint8Array;
  readonly method: number;
  readonly size: number;
  readonly crc: number;
}

export const OFFICE_PARTS = new Set([
  "docProps/core.xml",
  "docProps/app.xml",
  "docProps/custom.xml",
  "docProps/thumbnail.jpeg",
]);
const XML_LIMIT = 2 * 1024 * 1024;
const THUMBNAIL_LIMIT = 20 * 1024 * 1024;
const decoder = new TextDecoder("utf-8", { fatal: true });
const encoder = new TextEncoder();
const bad = (detail: string): never => {
  throw new ExposeError({ code: "unreadable-file", detail });
};

const asciiName = (bytes: Uint8Array): string => {
  try {
    return decoder.decode(bytes);
  } catch {
    return bad("ZIP entry name is not UTF-8");
  }
};

/** ZIP32 only. All ranges and duplicate names are checked before decompression. */
export const officeEntries = (bytes: Uint8Array): readonly OfficeEntry[] => {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let end = bytes.length - 22;
  while (end >= Math.max(0, bytes.length - 65_557)) {
    if (
      view.getUint32(end, true) === 0x06_05_4b_50 &&
      end + 22 + view.getUint16(end + 20, true) === bytes.length
    ) {
      break;
    }
    end -= 1;
  }
  if (end < 0 || end < bytes.length - 65_557) {
    return bad("ZIP end directory is missing");
  }
  if (
    view.getUint16(end + 4, true) !== 0 ||
    view.getUint16(end + 6, true) !== 0
  ) {
    return bad("Multi-disk ZIP is not supported");
  }
  const count = view.getUint16(end + 10, true);
  let at = view.getUint32(end + 16, true);
  const centralStart = at;
  const centralEnd = at + view.getUint32(end + 12, true);
  if (
    count === 0xff_ff ||
    at === 0xff_ff_ff_ff ||
    centralEnd !== end ||
    count !== view.getUint16(end + 8, true)
  ) {
    return bad("ZIP64 or invalid directory is not supported");
  }
  const entries: OfficeEntry[] = [];
  const names = new Set<string>();
  const ranges: { start: number; end: number }[] = [];
  for (let index = 0; index < count; index += 1) {
    if (at + 46 > centralEnd || view.getUint32(at, true) !== 0x02_01_4b_50) {
      return bad("Invalid ZIP directory entry");
    }
    const flags = view.getUint16(at + 8, true);
    const method = view.getUint16(at + 10, true);
    const compressed = view.getUint32(at + 20, true);
    const size = view.getUint32(at + 24, true);
    const nameLength = view.getUint16(at + 28, true);
    const length =
      46 +
      nameLength +
      view.getUint16(at + 30, true) +
      view.getUint16(at + 32, true);
    const local = view.getUint32(at + 42, true);
    if (
      (flags & 1) !== 0 ||
      ![0, 8].includes(method) ||
      compressed === 0xff_ff_ff_ff ||
      size === 0xff_ff_ff_ff ||
      at + length > centralEnd ||
      local + 30 > centralStart
    ) {
      return bad("Unsupported or damaged ZIP entry");
    }
    let name: string;
    try {
      name = decoder.decode(bytes.subarray(at + 46, at + 46 + nameLength));
    } catch {
      return bad("ZIP entry name is not UTF-8");
    }
    if (
      names.has(name) ||
      name.includes("\u0000") ||
      name.includes("\\") ||
      name.startsWith("/") ||
      name.split("/").includes("..")
    ) {
      return bad("ZIP entry name is invalid or repeated");
    }
    names.add(name);
    if (
      view.getUint32(local, true) !== 0x04_03_4b_50 ||
      view.getUint16(local + 8, true) !== method ||
      view.getUint16(local + 6, true) !== flags
    ) {
      return bad("ZIP local header does not match its directory");
    }
    const localNameLength = view.getUint16(local + 26, true);
    const start =
      local + 30 + localNameLength + view.getUint16(local + 28, true);
    if (
      start + compressed > centralStart ||
      start < local ||
      asciiName(bytes.subarray(local + 30, local + 30 + localNameLength)) !==
        name
    ) {
      return bad("ZIP entry data is outside its container");
    }
    ranges.push({ start: local, end: start + compressed });
    entries.push({
      name,
      header: bytes.slice(at, at + length),
      data: bytes.subarray(start, start + compressed),
      method,
      size,
      crc: view.getUint32(at + 16, true),
    });
    at += length;
  }
  if (at !== centralEnd) {
    return bad("ZIP directory length does not match");
  }
  ranges.sort((left, right) => left.start - right.start);
  if (
    ranges.some(
      (range, index) => index > 0 && range.start < (ranges[index - 1]?.end ?? 0)
    )
  ) {
    return bad("ZIP entries overlap");
  }
  return entries;
};

const crc32 = (bytes: Uint8Array): number => {
  let crc = 0xff_ff_ff_ff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc >>> 1) ^ ((crc & 1) === 1 ? 0xed_b8_83_20 : 0);
    }
  }
  return (crc ^ 0xff_ff_ff_ff) >>> 0;
};

const unpack = (entry: OfficeEntry, limit: number): Uint8Array => {
  if (entry.size > limit) {
    return bad("OOXML metadata part exceeds the adapter bound");
  }
  let out: Uint8Array;
  try {
    out =
      entry.method === 0
        ? entry.data
        : inflateSync(entry.data, { out: new Uint8Array(entry.size) });
  } catch {
    return bad("OOXML metadata part cannot be inflated");
  }
  if (out.length !== entry.size || crc32(out) !== entry.crc) {
    return bad("OOXML metadata part checksum does not match");
  }
  return out;
};
const parseXml = (entry: OfficeEntry) => {
  const text = asciiName(unpack(entry, XML_LIMIT));
  if (/<!DOCTYPE|<!ENTITY/iu.test(text)) {
    return bad("OOXML metadata entities are not supported");
  }
  try {
    return new DOMParser({ onError: onErrorStopParsing }).parseFromString(
      text,
      "application/xml"
    );
  } catch {
    return bad("OOXML metadata XML is invalid");
  }
};

const MAIN_PARTS = [
  [
    "docx",
    "/word/document.xml",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml",
  ],
  [
    "xlsx",
    "/xl/workbook.xml",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml",
  ],
  [
    "pptx",
    "/ppt/presentation.xml",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation.main+xml",
  ],
] as const;
export const officeFormatOf = (bytes: Uint8Array): FileFormat | null => {
  const entries = officeEntries(bytes);
  const types = entries.find((entry) => entry.name === "[Content_Types].xml");
  if (types === undefined) {
    return null;
  }
  const nodes = [
    ...parseXml(types).getElementsByTagNameNS(
      "http://schemas.openxmlformats.org/package/2006/content-types",
      "Override"
    ),
  ];
  const matches = MAIN_PARTS.filter(
    ([, part, type]) =>
      entries.some((entry) => entry.name === part.slice(1)) &&
      nodes.some(
        (node) =>
          node.getAttribute("PartName") === part &&
          node.getAttribute("ContentType") === type
      )
  );
  return matches.length === 1 ? (matches[0]?.[0] ?? null) : null;
};

interface OfficeProperty {
  readonly container: MetadataContainer;
  /** A fixed element name. Custom property names are values, never tag keys. */
  readonly label: string;
  readonly value: string;
}
const CORE =
  "http://schemas.openxmlformats.org/package/2006/metadata/core-properties";
const DC = "http://purl.org/dc/elements/1.1/";
const TERMS = "http://purl.org/dc/terms/";
const APP =
  "http://schemas.openxmlformats.org/officeDocument/2006/extended-properties";
const CUSTOM =
  "http://schemas.openxmlformats.org/officeDocument/2006/custom-properties";
const OFFICE_PROPERTIES = [
  ["ooxml-core", TERMS, "created"],
  ["ooxml-core", TERMS, "modified"],
  ["ooxml-core", DC, "creator"],
  ["ooxml-core", CORE, "lastModifiedBy"],
  ["ooxml-core", DC, "rights"],
  ["ooxml-core", DC, "title"],
  ["ooxml-core", DC, "subject"],
  ["ooxml-core", DC, "description"],
  ["ooxml-core", CORE, "keywords"],
  ["ooxml-core", CORE, "category"],
  ["ooxml-core", CORE, "lastPrinted"],
  ["ooxml-core", CORE, "revision"],
  ["ooxml-core", CORE, "version"],
  ["ooxml-app", APP, "Manager"],
  ["ooxml-app", APP, "Template"],
  ["ooxml-app", APP, "TotalTime"],
  ["ooxml-app", APP, "Application"],
  ["ooxml-app", APP, "AppVersion"],
  ["ooxml-app", APP, "Company"],
] as const;

interface OfficeRead {
  readonly properties: readonly OfficeProperty[];
  readonly thumbnail: Uint8Array | null;
  readonly parts: number;
}
export const readOffice = (bytes: Uint8Array): OfficeRead => {
  const entries = officeEntries(bytes);
  const properties: OfficeProperty[] = [];
  let thumbnail: Uint8Array | null = null;
  for (const entry of entries) {
    if (!OFFICE_PARTS.has(entry.name)) {
      continue;
    }
    if (entry.name === "docProps/thumbnail.jpeg") {
      thumbnail = entry.size === 0 ? null : unpack(entry, THUMBNAIL_LIMIT);
      continue;
    }
    const doc = parseXml(entry);
    if (entry.name === "docProps/custom.xml") {
      for (const node of [...doc.getElementsByTagNameNS(CUSTOM, "property")]) {
        properties.push({
          container: "ooxml-custom",
          label: "Custom property",
          value: `${node.getAttribute("name") ?? ""}: ${node.textContent}`,
        });
      }
      continue;
    }
    const container =
      entry.name === "docProps/core.xml" ? "ooxml-core" : "ooxml-app";
    for (const [family, ns, label] of OFFICE_PROPERTIES) {
      if (family !== container) {
        continue;
      }
      for (const node of [...doc.getElementsByTagNameNS(ns, label)]) {
        properties.push({ container, label, value: node.textContent ?? "" });
      }
    }
    const known = new Set<Node>();
    for (const [family, ns, label] of OFFICE_PROPERTIES) {
      if (family === container) {
        for (const node of [...doc.getElementsByTagNameNS(ns, label)]) {
          known.add(node);
        }
      }
    }
    for (const node of [...(doc.documentElement?.childNodes ?? [])]) {
      if (node.nodeType === 1 && !known.has(node)) {
        properties.push({
          container,
          label: "Other property",
          value: new XMLSerializer().serializeToString(node),
        });
      }
    }
  }
  return { properties, thumbnail, parts: entries.length };
};

/** Fixed parts/elements selected by the shared tag map. Other ZIP members stay byte exact. */
export const writeOffice = (
  bytes: Uint8Array,
  selected: readonly string[]
): Uint8Array => {
  const entries = officeEntries(bytes);
  const replacements = new Map<string, Uint8Array>();
  for (const entry of entries) {
    if (!OFFICE_PARTS.has(entry.name)) {
      continue;
    }
    if (entry.name === "docProps/thumbnail.jpeg") {
      if (selected.includes("docProps/thumbnail.jpeg")) {
        replacements.set(entry.name, new Uint8Array());
      }
      continue;
    }
    const doc = parseXml(entry);
    let changed = false;
    const container =
      entry.name === "docProps/core.xml" ? "ooxml-core" : "ooxml-app";
    const descriptors: readonly (readonly [string, string, string])[] =
      entry.name === "docProps/custom.xml"
        ? [["ooxml-custom", CUSTOM, "property"]]
        : OFFICE_PROPERTIES;
    for (const [family, ns, label] of descriptors) {
      if (
        (family !== container && family !== "ooxml-custom") ||
        !selected.includes(`${family}:${label}`)
      ) {
        continue;
      }
      for (const node of [...doc.getElementsByTagNameNS(ns, label)]) {
        node.parentNode?.removeChild(node);
        changed = true;
      }
    }
    if (selected.includes(`${container}:Other property`)) {
      const known = new Set<Node>();
      for (const [family, ns, label] of OFFICE_PROPERTIES) {
        if (family === container) {
          for (const node of [...doc.getElementsByTagNameNS(ns, label)]) {
            known.add(node);
          }
        }
      }
      for (const node of [...(doc.documentElement?.childNodes ?? [])]) {
        if (node.nodeType === 1 && !known.has(node)) {
          node.parentNode?.removeChild(node);
          changed = true;
        }
      }
    }
    if (changed) {
      replacements.set(
        entry.name,
        encoder.encode(new XMLSerializer().serializeToString(doc))
      );
    }
  }
  const locals: Uint8Array[] = [];
  const central: Uint8Array[] = [];
  let offset = 0;
  for (const entry of entries) {
    const replacement = replacements.get(entry.name);
    const data = replacement ?? entry.data;
    const header = new Uint8Array(entry.header);
    const view = new DataView(header.buffer);
    const nameLength = view.getUint16(28, true);
    view.setUint16(8, view.getUint16(8, true) & ~8, true);
    if (replacement !== undefined) {
      view.setUint16(10, 0, true);
      view.setUint32(16, crc32(data), true);
      view.setUint32(20, data.length, true);
      view.setUint32(24, data.length, true);
    }
    view.setUint32(42, offset, true);
    const local = new Uint8Array(30 + nameLength);
    const lv = new DataView(local.buffer);
    lv.setUint32(0, 0x04_03_4b_50, true);
    local.set(header.subarray(6, 28), 4);
    lv.setUint16(26, nameLength, true);
    lv.setUint16(28, 0, true);
    local.set(header.subarray(46, 46 + nameLength), 30);
    locals.push(local, data);
    central.push(header);
    offset += local.length + data.length;
  }
  const centralBytes = central.reduce((total, part) => total + part.length, 0);
  const end = new Uint8Array(22);
  const ev = new DataView(end.buffer);
  ev.setUint32(0, 0x06_05_4b_50, true);
  ev.setUint16(8, entries.length, true);
  ev.setUint16(10, entries.length, true);
  ev.setUint32(12, centralBytes, true);
  ev.setUint32(16, offset, true);
  const out = new Uint8Array(offset + centralBytes + 22);
  let at = 0;
  for (const part of [...locals, ...central, end]) {
    out.set(part, at);
    at += part.length;
  }
  return out;
};
