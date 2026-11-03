/* oxlint-disable eslint/complexity, eslint/no-bitwise -- ZIP validation checks the fixed binary header fields and rejects unsafe archives before inflation. */
import { Effect, Schema } from "effect";
import { strFromU8, strToU8, Unzip, UnzipInflate, zipSync } from "fflate";

import { safeZipSegments, uniqueZipPath } from "@/core/libs/files";

import { Body, Entry, QuillError } from "./quill";
import type { Output } from "./quill";

const Manifest = Schema.Struct({
  version: Schema.Literal(1),
  records: Schema.Array(
    Schema.Struct({
      entry: Entry,
      body: Schema.NullOr(Body),
      path: Schema.NullOr(Schema.String),
    })
  ),
});
const metadata = ".quill/manifest.json";
// Restore budgets bound untrusted decompression, not the size of a live Library.
const RESTORE_BYTES = 256 * 1024 * 1024;
const RESTORE_ENTRIES = 100_000;
const validPath = (path: string) =>
  !path.startsWith("/") &&
  !path.includes("\\") &&
  !path.includes(":") &&
  safeZipSegments(path.endsWith("/") ? path.slice(0, -1) : path).join("/") ===
    (path.endsWith("/") ? path.slice(0, -1) : path);
const bad = () => new QuillError({ reason: "invalid" });
const bytesOf = (body: Body) =>
  body.source === body.originalSource && body.original
    ? Uint8Array.from(body.original)
    : strToU8(body.source);
// Loaded on demand by the Quill service through Effect.tryPromise.
// fallow-ignore-next-line unused-export
export const writeArchive = (
  entries: readonly Entry[],
  bodies: readonly Body[],
  backup: boolean
): Effect.Effect<Output, QuillError> =>
  Effect.try({
    try: () => {
      const files = new Map<string, Uint8Array>();
      const paths = new Map<string, string>();
      const taken = new Set<string>([".quill"]);
      const bodyMap = new Map(bodies.map((body) => [body.id, body]));
      const remaining = entries.filter((entry) => !entry.trash);
      while (remaining.length) {
        const index = remaining.findIndex(
          (entry) =>
            !entry.parent ||
            paths.has(entry.parent) ||
            !entries.some((parent) => parent.id === entry.parent)
        );
        if (index === -1) {
          throw bad();
        }
        const [entry] = remaining.splice(index, 1);
        if (!entry) {
          throw bad();
        }
        const parent = entry.parent
          ? (paths.get(entry.parent)?.split("/").filter(Boolean) ?? [])
          : [];
        const name =
          entry.kind === "document" && !/\.(?:md|markdown)$/iu.test(entry.name)
            ? `${entry.name.slice(0, 61)}.md`
            : entry.name;
        const dot = entry.kind === "document" ? name.lastIndexOf(".") : -1;
        const path = uniqueZipPath(
          parent,
          dot > 0 ? name.slice(0, dot) : name,
          dot > 0 ? name.slice(dot) : "",
          taken
        );
        paths.set(entry.id, path);
        if (entry.kind === "folder") {
          files.set(`${path}/`, new Uint8Array());
        } else {
          const body = bodyMap.get(entry.id);
          if (!body) {
            throw bad();
          }
          files.set(path, bytesOf(body));
        }
      }
      if (backup) {
        files.set(
          metadata,
          strToU8(
            JSON.stringify({
              version: 1,
              records: entries.map((entry) => ({
                entry,
                body: bodyMap.get(entry.id) ?? null,
                path: paths.get(entry.id) ?? null,
              })),
            })
          )
        );
      }
      return {
        name: backup ? "quill-library-backup.zip" : "quill-markdown.zip",
        bytes: zipSync(Object.fromEntries(files), { level: 6 }),
        mime: "application/zip",
        warnings: [],
      };
    },
    catch: (cause) =>
      Schema.is(QuillError)(cause)
        ? cause
        : new QuillError({ reason: "resource" }),
  });
// Inspect the central directory before inflation. unzipSync alone would collapse
// duplicate names and allocate from untrusted size headers before validation.
const inspectZip = (bytes: Uint8Array) => {
  if (bytes.length > RESTORE_BYTES || bytes.length < 22) {
    throw bad();
  }
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let end = bytes.length - 22;
  while (
    end >= Math.max(0, bytes.length - 65_557) &&
    view.getUint32(end, true) !== 0x06_05_4b_50
  ) {
    end -= 1;
  }
  if (
    end < 0 ||
    end + 22 + view.getUint16(end + 20, true) !== bytes.length ||
    view.getUint16(end + 4, true) !== 0 ||
    view.getUint16(end + 6, true) !== 0
  ) {
    throw bad();
  }
  const count = view.getUint16(end + 10, true);
  let offset = view.getUint32(end + 16, true);
  const centralSize = view.getUint32(end + 12, true);
  if (
    count === 65_535 ||
    count > RESTORE_ENTRIES ||
    offset + centralSize !== end ||
    view.getUint16(end + 8, true) !== count
  ) {
    throw bad();
  }
  const paths = new Set<string>();
  let total = 0;
  for (let index = 0; index < count; index += 1) {
    if (offset + 46 > end || view.getUint32(offset, true) !== 0x02_01_4b_50) {
      throw bad();
    }
    const flags = view.getUint16(offset + 8, true);
    const method = view.getUint16(offset + 10, true);
    const length = view.getUint16(offset + 28, true);
    const extra = view.getUint16(offset + 30, true);
    const comment = view.getUint16(offset + 32, true);
    const size = view.getUint32(offset + 24, true);
    const packed = view.getUint32(offset + 20, true);
    const local = view.getUint32(offset + 42, true);
    if (
      offset + 46 + length + extra + comment > end ||
      flags & 1 ||
      ![0, 8].includes(method) ||
      size === 0xff_ff_ff_ff ||
      packed === 0xff_ff_ff_ff
    ) {
      throw bad();
    }
    const path = new TextDecoder("utf-8", { fatal: true }).decode(
      bytes.subarray(offset + 46, offset + 46 + length)
    );
    if (
      !validPath(path) ||
      paths.has(path.toLowerCase()) ||
      local + 30 > view.getUint32(end + 16, true) ||
      view.getUint32(local, true) !== 0x04_03_4b_50
    ) {
      throw bad();
    }
    const localLength = view.getUint16(local + 26, true);
    const localExtra = view.getUint16(local + 28, true);
    if (
      local + 30 + localLength + localExtra + packed >
        view.getUint32(end + 16, true) ||
      new TextDecoder("utf-8", { fatal: true }).decode(
        bytes.subarray(local + 30, local + 30 + localLength)
      ) !== path
    ) {
      throw bad();
    }
    if (size !== view.getUint32(local + 22, true) && !(flags & 8)) {
      throw bad();
    }
    total += size;
    if (total > RESTORE_BYTES) {
      throw new QuillError({ reason: "resource" });
    }
    paths.add(path.toLowerCase());
    offset += 46 + length + extra + comment;
  }
  if (offset !== end) {
    throw bad();
  }
};
const inflateArchive = (bytes: Uint8Array) => {
  const files = new Map<string, Uint8Array>();
  let total = 0;
  const reader = new Unzip((file) => {
    const chunks: Uint8Array[] = [];
    let size = 0;
    file.ondata = (error, chunk, final) => {
      if (error) {
        throw bad();
      }
      size += chunk.length;
      total += chunk.length;
      if (
        total > RESTORE_BYTES ||
        (file.name === metadata && size > 32 * 1024 * 1024)
      ) {
        throw new QuillError({ reason: "resource" });
      }
      chunks.push(chunk);
      if (final) {
        const contents = new Uint8Array(size);
        let offset = 0;
        for (const part of chunks) {
          contents.set(part, offset);
          offset += part.length;
        }
        files.set(file.name, contents);
      }
    };
    file.start();
  });
  reader.register(UnzipInflate);
  for (let offset = 0; offset < bytes.length; offset += 32_768) {
    reader.push(
      bytes.subarray(offset, offset + 32_768),
      offset + 32_768 >= bytes.length
    );
  }
  return files;
};
// Loaded on demand by the Quill service through Effect.tryPromise.
// fallow-ignore-next-line unused-export
export const readBackup = (bytes: Uint8Array) =>
  Effect.try({
    try: () => {
      inspectZip(bytes);
      const files = inflateArchive(bytes);
      const manifestBytes = files.get(metadata);
      if (!manifestBytes) {
        throw bad();
      }
      const manifest = Schema.decodeUnknownSync(Manifest)(
        JSON.parse(strFromU8(manifestBytes))
      );
      const records = new Map(
        manifest.records.map((record) => [record.entry.id, record])
      );
      if (records.size !== manifest.records.length) {
        throw bad();
      }
      const expected = new Set([metadata]);
      for (const { entry, body, path } of records.values()) {
        if (
          !validPath(entry.name) ||
          entry.name.includes("/") ||
          entry.name.toLowerCase() === ".quill" ||
          !Number.isSafeInteger(entry.revision) ||
          entry.revision < 0
        ) {
          throw bad();
        }
        const visited = new Set([entry.id]);
        let { parent } = entry;
        while (parent) {
          const record = records.get(parent);
          if (
            !record ||
            record.entry.kind !== "folder" ||
            visited.has(parent)
          ) {
            throw bad();
          }
          visited.add(parent);
          ({ parent } = record.entry);
        }
        if (
          entry.trash &&
          records.get(entry.trash)?.entry.trash !== entry.trash
        ) {
          throw bad();
        }
        if (entry.kind === "document") {
          if (
            !body ||
            body.id !== entry.id ||
            body.revision !== entry.revision ||
            body.original?.some(
              (byte) => !Number.isInteger(byte) || byte < 0 || byte > 255
            )
          ) {
            throw bad();
          }
        } else if (body) {
          throw bad();
        }
        if (!entry.trash) {
          if (
            !path ||
            !validPath(path) ||
            path.toLowerCase().startsWith(".quill/") ||
            path.toLowerCase() === ".quill"
          ) {
            throw bad();
          }
          const key = entry.kind === "folder" ? `${path}/` : path;
          if (expected.has(key) || !files.has(key)) {
            throw bad();
          }
          expected.add(key);
          if (body) {
            const current = files.get(key);
            const content = bytesOf(body);
            if (
              !current ||
              current.length !== content.length ||
              current.some((byte, index) => byte !== content[index])
            ) {
              throw bad();
            }
          }
        } else if (path !== null) {
          throw bad();
        }
      }
      if (files.size !== expected.size) {
        throw bad();
      }
      return [...records.values()];
    },
    catch: (cause) => (Schema.is(QuillError)(cause) ? cause : bad()),
  });
