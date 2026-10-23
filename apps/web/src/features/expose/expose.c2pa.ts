/* eslint-disable eslint/no-bitwise, eslint/complexity, eslint/require-unicode-regexp, eslint/no-unmodified-loop-condition, unicorn/prefer-code-point, unicorn/consistent-function-scoping, unicorn/no-lonely-if -- JUMBF, CBOR, and DER parsing is byte-exact and branch-heavy */
/* oxlint-disable anti-slop/no-unknown-parameters, anti-slop/no-unknown-returns, anti-slop/no-runtime-typeof, anti-slop/require-safety-comment-for-type-assertion, anti-slop/no-unsafe-dictionary-type, anti-slop/no-known-value-widening, react-doctor/js-flatmap-filter -- the scanner is the boundary that turns untrusted manifests into C2PA evidence */
import type { ImageFormat } from "@/features/expose/expose";

/**
 * A small C2PA container scan.
 *
 * ExifReader does not parse C2PA, and the UI needs presence, size, claim
 * generator, actions, and generation parameters. This module finds the JUMBF
 * manifest in each of the eight formats, parses the CBOR claim and JSON
 * assertions, and never validates a signature.
 *
 * Every string is returned as text. No library type leaves this module.
 */

export interface C2paParameter {
  readonly label: string;
  readonly value: string;
}

export interface C2paScan {
  readonly actions: readonly string[];
  readonly bytes: number;
  readonly claimGenerator: string | null;
  readonly claimedSigner: string | null;
  readonly digitalSourceTypes: readonly string[];
  readonly hasThumbnail: boolean;
  readonly manifests: number;
  readonly parameters: readonly C2paParameter[];
  readonly parsed: boolean;
  readonly signals: readonly {
    readonly label: string;
    readonly value: string;
  }[];
}

/** The C2PA UUID for an ISO BMFF `uuid` box. */
const C2PA_BMFF_UUID = new Uint8Array([
  0xd8, 0xfe, 0xc3, 0xd6, 0x1b, 0x0e, 0x48, 0x3c, 0x92, 0x97, 0x58, 0x28, 0x87,
  0x7e, 0xc4, 0x81,
]);

const text = (bytes: Uint8Array, start = 0, end = bytes.length): string => {
  let out = "";
  for (let index = start; index < end; index += 1) {
    out += String.fromCharCode(bytes[index] ?? 0);
  }
  return out;
};

const readU32 = (bytes: Uint8Array, offset: number): number =>
  ((bytes[offset] ?? 0) * 0x1_00_00_00 +
    ((bytes[offset + 1] ?? 0) << 16) +
    ((bytes[offset + 2] ?? 0) << 8) +
    (bytes[offset + 3] ?? 0)) >>>
  0;

const readU16 = (bytes: Uint8Array, offset: number): number =>
  ((bytes[offset] ?? 0) << 8) | (bytes[offset + 1] ?? 0);

const readU64 = (bytes: Uint8Array, offset: number): number => {
  const high = readU32(bytes, offset);
  const low = readU32(bytes, offset + 4);
  return high * 2 ** 32 + low;
};

const bytesEqual = (left: Uint8Array, right: Uint8Array): boolean => {
  if (left.length !== right.length) {
    return false;
  }
  return left.every((value, index) => value === right[index]);
};

/* -------------------------------------------------------------------------- */
/* Container scans                                                            */
/* -------------------------------------------------------------------------- */

/** JPEG: gather APP11 JUMBF segments by their box instance number. */
const scanJpeg = (bytes: Uint8Array): Uint8Array[] => {
  // APP11 segments carry one JUMBF store in order. The 4-byte field after the
  // version is a sequence number, not a separate store: a manifest can span
  // any number of segments, so every payload joins the same byte stream.
  const parts: Uint8Array[] = [];
  let offset = 2;
  while (offset + 4 <= bytes.length) {
    if (bytes[offset] !== 0xff) {
      break;
    }
    const marker = bytes[offset + 1] ?? 0;
    if (marker === 0xda) {
      break;
    }
    if (
      marker === 0xd8 ||
      marker === 0xd9 ||
      (marker >= 0xd0 && marker <= 0xd7)
    ) {
      offset += 2;
      continue;
    }
    if (marker === 0x01) {
      offset += 2;
      continue;
    }
    const length = readU16(bytes, offset + 2);
    if (length < 2) {
      break;
    }
    const end = offset + 2 + length;
    if (marker === 0xeb && end <= bytes.length) {
      const data = bytes.subarray(offset + 4, end);
      if (data.length > 8 && text(data, 0, 2) === "JP") {
        parts.push(data.subarray(8));
      }
    }
    offset = end;
  }
  if (parts.length === 0) {
    return [];
  }
  const total = parts.reduce((sum, part) => sum + part.length, 0);
  const joined = new Uint8Array(total);
  let at = 0;
  for (const part of parts) {
    joined.set(part, at);
    at += part.length;
  }
  return [joined];
};

/** PNG: each `caBX` chunk carries one JUMBF store. */
const scanPng = (bytes: Uint8Array): Uint8Array[] => {
  const stores: Uint8Array[] = [];
  let offset = 8;
  while (offset + 8 <= bytes.length) {
    const length = readU32(bytes, offset);
    const type = text(bytes, offset + 4, offset + 8);
    const start = offset + 8;
    const end = start + length;
    if (end + 4 > bytes.length) {
      break;
    }
    if (type === "caBX") {
      stores.push(bytes.subarray(start, end));
    }
    offset = end + 4;
  }
  return stores;
};

/** WebP: a `C2PA` or `JUMBF` RIFF chunk. */
const scanWebp = (bytes: Uint8Array): Uint8Array[] => {
  const stores: Uint8Array[] = [];
  let offset = 12;
  while (offset + 8 <= bytes.length) {
    const type = text(bytes, offset, offset + 4);
    const length =
      (bytes[offset + 4] ?? 0) +
      ((bytes[offset + 5] ?? 0) << 8) +
      ((bytes[offset + 6] ?? 0) << 16) +
      (bytes[offset + 7] ?? 0) * 0x1_00_00_00;
    const start = offset + 8;
    const end = start + length;
    if (end > bytes.length) {
      break;
    }
    if (type === "C2PA" || type === "JUMBF") {
      stores.push(bytes.subarray(start, end));
    }
    offset = end + (length % 2);
  }
  return stores;
};

/** GIF: the `C2PA_GIF` and `JUMBF` application extensions. */
const scanGif = (bytes: Uint8Array): Uint8Array[] => {
  const stores: Uint8Array[] = [];
  let offset = 13;
  if (bytes.length >= 13 && (bytes[10] ?? 0) & 0x80) {
    offset += 3 * 2 ** (((bytes[10] ?? 0) & 0x07) + 1);
  }
  while (offset < bytes.length) {
    const block = bytes[offset] ?? 0;
    if (block === 0x3b) {
      break;
    }
    if (block === 0x21) {
      const label = bytes[offset + 1] ?? 0;
      const identifierLength = bytes[offset + 2] ?? 0;
      const identifierEnd = offset + 3 + identifierLength;
      const identifier = text(bytes, offset + 3, identifierEnd);
      if (
        label === 0xff &&
        (identifier.startsWith("C2PA_GIF") || identifier.startsWith("JUMBF"))
      ) {
        const parts: Uint8Array[] = [];
        let cursor = identifierEnd;
        while (cursor < bytes.length) {
          const size = bytes[cursor] ?? 0;
          cursor += 1;
          if (size === 0) {
            break;
          }
          parts.push(bytes.subarray(cursor, cursor + size));
          cursor += size;
        }
        const total = parts.reduce((sum, part) => sum + part.length, 0);
        const joined = new Uint8Array(total);
        let at = 0;
        for (const part of parts) {
          joined.set(part, at);
          at += part.length;
        }
        stores.push(joined);
        offset = cursor;
        continue;
      }
      offset = identifierEnd;
      while (offset < bytes.length) {
        const size = bytes[offset] ?? 0;
        offset += 1;
        if (size === 0) {
          break;
        }
        offset += size;
      }
      continue;
    }
    if (block === 0x2c) {
      const localFlags = bytes[offset + 9] ?? 0;
      offset += 10;
      if (localFlags & 0x80) {
        offset += 3 * 2 ** ((localFlags & 0x07) + 1);
      }
      offset += 1;
      while (offset < bytes.length) {
        const size = bytes[offset] ?? 0;
        offset += 1;
        if (size === 0) {
          break;
        }
        offset += size;
      }
      continue;
    }
    offset += 1;
  }
  return stores;
};

/** TIFF: primary IFD tag `0xCD41` carries the JUMBF store. */
const scanTiff = (bytes: Uint8Array): Uint8Array[] => {
  const stores: Uint8Array[] = [];
  if (bytes.length < 8) {
    return stores;
  }
  const little = bytes[0] === 0x49;
  const u16 = (offset: number): number =>
    little
      ? (bytes[offset] ?? 0) | ((bytes[offset + 1] ?? 0) << 8)
      : readU16(bytes, offset);
  const u32 = (offset: number): number => {
    if (little) {
      return (
        (bytes[offset] ?? 0) +
        ((bytes[offset + 1] ?? 0) << 8) +
        ((bytes[offset + 2] ?? 0) << 16) +
        (bytes[offset + 3] ?? 0) * 0x1_00_00_00
      );
    }
    const raw = [
      bytes[offset],
      bytes[offset + 1],
      bytes[offset + 2],
      bytes[offset + 3],
    ];
    return (
      ((raw[3] ?? 0) * 0x1_00_00_00 +
        ((raw[2] ?? 0) << 16) +
        ((raw[1] ?? 0) << 8) +
        (raw[0] ?? 0)) >>>
      0
    );
  };
  const ifd = u32(4);
  if (ifd < 8 || ifd + 2 > bytes.length) {
    return stores;
  }
  const count = u16(ifd);
  const typeSize = (type: number): number => {
    if (type === 1 || type === 2 || type === 6 || type === 7) {
      return 1;
    }
    if (type === 3 || type === 8) {
      return 2;
    }
    if (type === 4 || type === 9 || type === 11 || type === 13) {
      return 4;
    }
    return 8;
  };
  for (let index = 0; index < count; index += 1) {
    const entry = ifd + 2 + index * 12;
    if (entry + 12 > bytes.length) {
      break;
    }
    const tag = u16(entry);
    if (tag !== 0xcd_41) {
      continue;
    }
    const type = u16(entry + 2);
    const length = u32(entry + 4);
    const total = length * typeSize(type);
    const valueOffset = total <= 4 ? entry + 8 : u32(entry + 8);
    if (valueOffset + total <= bytes.length) {
      stores.push(bytes.subarray(valueOffset, valueOffset + total));
    }
  }
  return stores;
};

/** ISO BMFF: a top-level `jumb` box or the C2PA `uuid` box. */
const scanBmff = (bytes: Uint8Array): Uint8Array[] => {
  const stores: Uint8Array[] = [];
  const walk = (start: number, end: number, depth: number): void => {
    let offset = start;
    while (offset + 8 <= end && depth < 4) {
      let size = readU32(bytes, offset);
      const type = text(bytes, offset + 4, offset + 8);
      let header = 8;
      if (size === 1) {
        if (offset + 16 > end) {
          break;
        }
        size = readU64(bytes, offset + 8);
        header = 16;
      } else if (size === 0) {
        size = end - offset;
      }
      if (size < header || offset + size > end) {
        break;
      }
      const body = offset + header;
      if (type === "jumb") {
        stores.push(bytes.subarray(offset, offset + size));
      } else if (type === "uuid") {
        if (bytesEqual(bytes.subarray(body, body + 16), C2PA_BMFF_UUID)) {
          stores.push(bytes.subarray(offset, offset + size));
        }
      } else if (
        type === "meta" ||
        type === "moov" ||
        type === "trak" ||
        type === "mdia" ||
        type === "minf" ||
        type === "stbl"
      ) {
        const childStart = type === "meta" ? body + 4 : body;
        walk(childStart, offset + size, depth + 1);
      }
      offset += size;
    }
  };
  walk(0, bytes.length, 0);
  return stores;
};

/** The JUMBF stores a format carries. */
export const extractC2paStores = (
  bytes: Uint8Array,
  format: ImageFormat
): readonly Uint8Array[] => {
  if (format === "jpeg") {
    return scanJpeg(bytes);
  }
  if (format === "png") {
    return scanPng(bytes);
  }
  if (format === "webp") {
    return scanWebp(bytes);
  }
  if (format === "gif") {
    return scanGif(bytes);
  }
  if (format === "tiff") {
    return scanTiff(bytes);
  }
  return scanBmff(bytes);
};

/* -------------------------------------------------------------------------- */
/* CBOR                                                                       */
/* -------------------------------------------------------------------------- */

class CborReader {
  private offset = 0;
  private readonly bytes: Uint8Array;

  constructor(bytes: Uint8Array) {
    this.bytes = bytes;
  }

  read(): unknown {
    const initial = this.byte();
    const major = initial >> 5;
    const info = initial & 0x1f;
    if (major === 0) {
      return this.length(info);
    }
    if (major === 1) {
      return -1 - this.length(info);
    }
    if (major === 2) {
      if (info === 31) {
        const parts: Uint8Array[] = [];
        while (
          this.bytes[this.offset] !== 0xff &&
          this.offset < this.bytes.length
        ) {
          const next = this.read();
          if (next instanceof Uint8Array) {
            parts.push(next);
          }
        }
        if (this.bytes[this.offset] === 0xff) {
          this.offset += 1;
        }
        const total = parts.reduce((sum, part) => sum + part.length, 0);
        const out = new Uint8Array(total);
        let at = 0;
        for (const part of parts) {
          out.set(part, at);
          at += part.length;
        }
        return out;
      }
      const length = this.length(info);
      const out = this.bytes.subarray(this.offset, this.offset + length);
      this.offset += length;
      return out;
    }
    if (major === 3) {
      if (info === 31) {
        let combined = "";
        while (
          this.bytes[this.offset] !== 0xff &&
          this.offset < this.bytes.length
        ) {
          combined += String(this.read());
        }
        if (this.bytes[this.offset] === 0xff) {
          this.offset += 1;
        }
        return combined;
      }
      const length = this.length(info);
      const out = new TextDecoder().decode(
        this.bytes.subarray(this.offset, this.offset + length)
      );
      this.offset += length;
      return out;
    }
    if (major === 4) {
      if (info === 31) {
        const out: unknown[] = [];
        while (
          this.bytes[this.offset] !== 0xff &&
          this.offset < this.bytes.length
        ) {
          out.push(this.read());
        }
        if (this.bytes[this.offset] === 0xff) {
          this.offset += 1;
        }
        return out;
      }
      const length = this.length(info);
      return Array.from({ length }, () => this.read());
    }
    if (major === 5) {
      const entries: [string, unknown][] = [];
      if (info === 31) {
        while (
          this.bytes[this.offset] !== 0xff &&
          this.offset < this.bytes.length
        ) {
          const key = this.read();
          const value = this.read();
          entries.push([String(key), value]);
        }
        if (this.bytes[this.offset] === 0xff) {
          this.offset += 1;
        }
        return Object.fromEntries(entries);
      }
      const length = this.length(info);
      for (let index = 0; index < length; index += 1) {
        const key = this.read();
        const value = this.read();
        entries.push([String(key), value]);
      }
      return Object.fromEntries(entries);
    }
    if (major === 6) {
      this.length(info);
      return this.read();
    }
    if (major === 7) {
      if (info === 20) {
        return false;
      }
      if (info === 21) {
        return true;
      }
      if (info === 22) {
        return null;
      }
      if (info === 25) {
        const value = readU16(this.bytes, this.offset);
        this.offset += 2;
        return value;
      }
      if (info === 26) {
        const value = readU32(this.bytes, this.offset);
        this.offset += 4;
        return value;
      }
      if (info === 27) {
        const value = readU64(this.bytes, this.offset);
        this.offset += 8;
        return value;
      }
      return null;
    }
    return null;
  }

  private byte(): number {
    const value = this.bytes[this.offset] ?? 0;
    this.offset += 1;
    return value;
  }

  private length(info: number): number {
    if (info < 24) {
      return info;
    }
    if (info === 24) {
      return this.byte();
    }
    if (info === 25) {
      const value = readU16(this.bytes, this.offset);
      this.offset += 2;
      return value;
    }
    if (info === 26) {
      const value = readU32(this.bytes, this.offset);
      this.offset += 4;
      return value;
    }
    if (info === 27) {
      const value = readU64(this.bytes, this.offset);
      this.offset += 8;
      return value;
    }
    return 0;
  }
}

export const decodeCbor = (bytes: Uint8Array): unknown => {
  try {
    return new CborReader(bytes).read();
  } catch {
    return null;
  }
};

/* -------------------------------------------------------------------------- */
/* X.509 subject                                                              */
/* -------------------------------------------------------------------------- */

const derLength = (
  bytes: Uint8Array,
  offset: number
): { length: number; next: number } => {
  const first = bytes[offset] ?? 0;
  if (first < 0x80) {
    return { length: first, next: offset + 1 };
  }
  const count = first & 0x7f;
  let length = 0;
  for (let index = 0; index < count; index += 1) {
    length = length * 256 + (bytes[offset + 1 + index] ?? 0);
  }
  return { length, next: offset + 1 + count };
};

interface DerNode {
  readonly next: number;
  readonly start: number;
  readonly tag: number;
}

const derNode = (bytes: Uint8Array, offset: number): DerNode | null => {
  if (offset >= bytes.length) {
    return null;
  }
  const tag = bytes[offset] ?? 0;
  const { length, next } = derLength(bytes, offset + 1);
  return { next: next + length, start: next, tag };
};

const decodeString = (bytes: Uint8Array): string => {
  const decoder = new TextDecoder();
  return decoder.decode(bytes).replaceAll("\u0000", "").trim();
};

/** The first common name (or organisation) in a DER certificate's subject. */
const subjectOfCertificate = (certificate: Uint8Array): string | null => {
  try {
    const certificateNode = derNode(certificate, 0);
    if (certificateNode === null) {
      return null;
    }
    const tbs = derNode(certificate, certificateNode.start);
    if (tbs === null) {
      return null;
    }
    let offset = tbs.start;
    // Optional [0] version.
    if ((certificate[offset] ?? 0) === 0xa0) {
      const version = derNode(certificate, offset);
      if (version === null) {
        return null;
      }
      offset = version.next;
    }
    // serialNumber, signature, issuer, validity, subject.
    for (let index = 0; index < 4; index += 1) {
      const node = derNode(certificate, offset);
      if (node === null) {
        return null;
      }
      offset = node.next;
    }
    const subject = derNode(certificate, offset);
    if (subject === null) {
      return null;
    }
    const rdnSet = derNode(certificate, subject.start);
    if (rdnSet === null) {
      return null;
    }
    let commonName: string | null = null;
    let organisation: string | null = null;
    let cursor = rdnSet.start;
    while (cursor < rdnSet.next) {
      const sequence = derNode(certificate, cursor);
      if (sequence === null) {
        break;
      }
      let inner = sequence.start;
      while (inner < sequence.next) {
        const oid = derNode(certificate, inner);
        if (oid === null) {
          break;
        }
        const value = derNode(certificate, oid.next);
        if (value === null) {
          break;
        }
        const oidText = [...certificate.subarray(oid.start, oid.next)]
          .map((byte) => byte.toString(16).padStart(2, "0"))
          .join("");
        const decoded = decodeString(
          certificate.subarray(value.start, value.next)
        );
        if (oidText === "550403") {
          commonName = decoded;
        } else if (oidText === "55040a") {
          organisation = decoded;
        }
        inner = value.next;
      }
      cursor = sequence.next;
    }
    return commonName ?? organisation;
  } catch {
    return null;
  }
};

/* -------------------------------------------------------------------------- */
/* JUMBF                                                                      */
/* -------------------------------------------------------------------------- */

interface ScanState {
  actions: string[];
  bytes: number;
  claimGenerator: string | null;
  claimedSigner: string | null;
  digitalSourceTypes: string[];
  hasThumbnail: boolean;
  manifests: number;
  parameters: C2paParameter[];
  parsed: boolean;
  signals: { label: string; value: string }[];
}

const asText = (value: unknown): string => {
  if (typeof value === "string") {
    return value;
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  if (value instanceof Uint8Array) {
    return `${value.length} bytes`;
  }
  if (Array.isArray(value)) {
    return value.map(asText).filter(Boolean).join(", ");
  }
  return "";
};

const inspectAction = (value: unknown, state: ScanState): void => {
  if (typeof value !== "object" || value === null) {
    return;
  }
  const action = value as Record<string, unknown>;
  if (typeof action.action === "string") {
    state.actions.push(action.action);
  }
  if (typeof action.digitalSourceType === "string") {
    state.digitalSourceTypes.push(action.digitalSourceType);
  }
  if (typeof action.softwareAgent === "string") {
    state.signals.push({ label: "softwareAgent", value: action.softwareAgent });
  }
  const { parameters } = action;
  if (typeof parameters === "object" && parameters !== null) {
    for (const [label, parameter] of Object.entries(parameters)) {
      state.parameters.push({ label, value: asText(parameter) });
    }
  }
};

const inspectCbor = (value: unknown, state: ScanState): void => {
  if (typeof value !== "object" || value === null) {
    return;
  }
  if (Array.isArray(value)) {
    for (const item of value) {
      if (item instanceof Uint8Array) {
        const nested = decodeCbor(item);
        if (nested !== null) {
          inspectCbor(nested, state);
        }
      } else {
        inspectCbor(item, state);
      }
    }
    return;
  }
  const record = value as Record<string, unknown>;
  if (typeof record.claim_generator === "string") {
    state.claimGenerator = record.claim_generator;
  }
  const info = record.claim_generator_info;
  if (Array.isArray(info)) {
    for (const entry of info) {
      if (
        typeof entry === "object" &&
        entry !== null &&
        typeof (entry as Record<string, unknown>).name === "string"
      ) {
        state.claimGenerator = (entry as Record<string, unknown>)
          .name as string;
      }
    }
  }
  if (Array.isArray(record.actions)) {
    for (const action of record.actions) {
      inspectAction(action, state);
    }
  }
  if (typeof record.digitalSourceType === "string") {
    state.digitalSourceTypes.push(record.digitalSourceType);
  }
  if (typeof record.softwareAgent === "string") {
    state.signals.push({ label: "softwareAgent", value: record.softwareAgent });
  }
  const chain = record.x5chain ?? record["33"];
  const certificates = Array.isArray(chain)
    ? chain
    : chain instanceof Uint8Array
      ? [chain]
      : [];
  for (const certificate of certificates) {
    if (certificate instanceof Uint8Array) {
      const signer = subjectOfCertificate(certificate);
      if (signer !== null) {
        state.claimedSigner = signer;
        break;
      }
    }
  }
  if (
    state.parsed === false &&
    (record.claim_generator !== undefined ||
      record.actions !== undefined ||
      record.assertions !== undefined)
  ) {
    state.parsed = true;
  }
};

const inspectJson = (value: unknown, state: ScanState): void => {
  if (typeof value !== "object" || value === null) {
    return;
  }
  if (Array.isArray(value)) {
    for (const item of value) {
      inspectJson(item, state);
    }
    return;
  }
  const record = value as Record<string, unknown>;
  if (typeof record.claim_generator === "string") {
    state.claimGenerator = record.claim_generator;
    state.parsed = true;
  }
  if (typeof record.digitalSourceType === "string") {
    state.digitalSourceTypes.push(record.digitalSourceType);
  }
  if (Array.isArray(record.actions)) {
    for (const action of record.actions) {
      inspectAction(action, state);
    }
  }
  if (
    typeof record["@type"] === "string" &&
    typeof record.copyrightNotice === "string"
  ) {
    state.parsed = true;
  }
};

const jumbfLabel = (bytes: Uint8Array, start: number, end: number): string => {
  if (end - start < 17) {
    return "";
  }
  return text(bytes, start + 17, end).replaceAll("\u0000", "");
};

const parseJumbf = (
  bytes: Uint8Array,
  start: number,
  end: number,
  state: ScanState,
  depth: number
): void => {
  let offset = start;
  while (offset + 8 <= end && depth < 6) {
    let length = readU32(bytes, offset);
    const type = text(bytes, offset + 4, offset + 8);
    let header = 8;
    if (length === 1) {
      if (offset + 16 > end) {
        return;
      }
      length = readU64(bytes, offset + 8);
      header = 16;
    } else if (length === 0) {
      length = end - offset;
    }
    if (length < header || offset + length > end) {
      return;
    }
    const body = offset + header;
    const boxEnd = offset + length;
    if (type === "jumb") {
      parseJumbf(bytes, body, boxEnd, state, depth + 1);
    } else if (type === "jumd") {
      const label = jumbfLabel(bytes, body, boxEnd);
      if (
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
          label
        )
      ) {
        state.manifests += 1;
      }
      if (label.includes("thumbnail")) {
        state.hasThumbnail = true;
      }
    } else if (type === "cbor") {
      const decoded = decodeCbor(bytes.subarray(body, boxEnd));
      inspectCbor(decoded, state);
    } else if (type === "json") {
      try {
        const decoded = JSON.parse(
          new TextDecoder().decode(bytes.subarray(body, boxEnd))
        ) as unknown;
        inspectJson(decoded, state);
      } catch {
        // A JSON assertion that does not parse is not a manifest.
      }
    } else if (type === "bfdb" || type === "bidb") {
      if (type === "bidb") {
        state.hasThumbnail = true;
      }
    }
    offset = boxEnd;
  }
};

/**
 * Some JUMBF writers pad or shorten a box length inside a thumbnail payload.
 * A strict walk then loses the claim that follows. This loose pass finds every
 * `cbor` and `json` box by its signature and decodes what parses. It never
 * trusts a length that runs past the store.
 */
const scanLoose = (bytes: Uint8Array, state: ScanState): void => {
  for (let offset = 0; offset + 8 <= bytes.length; offset += 1) {
    const type = text(bytes, offset + 4, offset + 8);
    if (type !== "cbor" && type !== "json") {
      continue;
    }
    const length = readU32(bytes, offset);
    const start = offset + 8;
    const end = Math.min(bytes.length, start + Math.max(0, length - 8));
    if (end <= start) {
      continue;
    }
    if (type === "cbor") {
      const decoded = decodeCbor(bytes.subarray(start, end));
      if (decoded !== null) {
        inspectCbor(decoded, state);
      }
    } else {
      try {
        const decoded = JSON.parse(
          new TextDecoder().decode(bytes.subarray(start, end))
        ) as unknown;
        inspectJson(decoded, state);
      } catch {
        // Not a JSON assertion.
      }
    }
  }
  const textBytes = text(bytes, 0, bytes.length);
  if (textBytes.includes("c2pa.claim")) {
    state.parsed = true;
    state.manifests = Math.max(state.manifests, 1);
  }
  if (textBytes.includes("c2pa.thumbnail")) {
    state.hasThumbnail = true;
  }
};

/** Scan one file for C2PA evidence. It returns null when no manifest exists. */
export const scanC2pa = (
  bytes: Uint8Array,
  format: ImageFormat
): C2paScan | null => {
  const stores = extractC2paStores(bytes, format);
  if (stores.length === 0) {
    return null;
  }
  const state: ScanState = {
    actions: [],
    bytes: stores.reduce((sum, store) => sum + store.length, 0),
    claimGenerator: null,
    claimedSigner: null,
    digitalSourceTypes: [],
    hasThumbnail: false,
    manifests: 0,
    parameters: [],
    parsed: false,
    signals: [],
  };
  for (const store of stores) {
    // A store may start with the JUMBF box, or with the BMFF `uuid` header.
    if (text(store, 4, 8) === "uuid") {
      parseJumbf(store, 24, store.length, state, 0);
    } else {
      parseJumbf(store, 0, store.length, state, 0);
    }
    scanLoose(store, state);
  }
  return {
    actions: [...new Set(state.actions)],
    bytes: state.bytes,
    claimGenerator: state.claimGenerator,
    claimedSigner: state.claimedSigner,
    digitalSourceTypes: [...new Set(state.digitalSourceTypes)],
    hasThumbnail: state.hasThumbnail,
    manifests: Math.max(state.manifests, 1),
    parameters: [
      ...new Map(
        state.parameters.map((parameter) => [
          `${parameter.label}\u0000${parameter.value}`,
          parameter,
        ])
      ).values(),
    ],
    parsed: state.parsed,
    signals: [
      ...new Map(
        state.signals.map((signal) => [
          `${signal.label}\u0000${signal.value}`,
          signal,
        ])
      ).values(),
    ],
  };
};
