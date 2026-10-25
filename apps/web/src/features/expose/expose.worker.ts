/* eslint-disable unicorn/require-post-message-target-origin -- this is a DedicatedWorker postMessage, not a window message */
/* oxlint-disable anti-slop/no-runtime-typeof, react-doctor/js-set-map-lookups, anti-slop/no-unknown-parameters, anti-slop/no-conditional-empty-object-spread -- the worker is the boundary that turns an untyped thrown value into a named failure */
/// <reference lib="webworker" />
import type {
  CleanProgress,
  CleanResult,
  ExposeErrorCode,
  FileFormat,
  MetadataGroup,
  ReadReport,
} from "@/features/expose/expose";
import { ExposeError, isMemoryFailure } from "@/features/expose/expose";
import { cleanFile } from "@/features/expose/expose.cleaner";
import { fatalEngineFailure } from "@/features/expose/expose.engine";
import { readFile } from "@/features/expose/expose.reader";

declare let self: DedicatedWorkerGlobalScope;

export interface ReadMessage {
  readonly bytes: ArrayBuffer;
  readonly id: number;
  readonly kind: "read";
  readonly name: string;
  readonly type: string;
}

export interface CleanMessage {
  readonly bytes: ArrayBuffer;
  readonly groups: readonly MetadataGroup[];
  readonly id: number;
  readonly kind: "clean";
  readonly name: string;
  readonly preset: "ai-only" | "personal" | "everything" | "custom";
  readonly type: string;
}

export type WorkerRequest = ReadMessage | CleanMessage;

export interface FailedReply {
  readonly fatal?: boolean;
  readonly code: ExposeErrorCode;
  readonly detail: string;
  readonly format?: FileFormat;
  readonly group?: MetadataGroup;
  readonly id: number;
  readonly kind: "failed";
}

export type WorkerReply =
  | { readonly id: number; readonly kind: "read"; readonly report: ReadReport }
  | {
      readonly id: number;
      readonly kind: "clean";
      readonly result: CleanResult;
    }
  | FailedReply
  | {
      readonly id: number;
      readonly kind: "progress";
      readonly progress: CleanProgress;
    };

const fail = (id: number, error: unknown): FailedReply => {
  if (error instanceof ExposeError) {
    return {
      code: error.code,
      fatal: fatalEngineFailure(error.detail),
      detail: error.detail,
      format: error.format,
      group: error.group,
      id,
      kind: "failed",
    };
  }
  return {
    fatal: fatalEngineFailure(
      error instanceof Error ? error.message : String(error)
    ),
    code: isMemoryFailure(error) ? "too-large" : "engine-failed",
    detail: error instanceof Error ? error.message : "the engine failed",
    id,
    kind: "failed",
  };
};

/**
 * A request is only handled when it names a read or a clean. A DedicatedWorker
 * receives messages only from the document that created it, and Chrome reports
 * `event.origin` as an empty string for those messages, so an origin check here
 * would drop every request. The payload is the boundary.
 */
const isWorkerRequest = (value: unknown): value is WorkerRequest => {
  if (
    typeof value !== "object" ||
    value === null ||
    !("kind" in value) ||
    !("id" in value) ||
    !("bytes" in value) ||
    !("name" in value) ||
    !("type" in value)
  ) {
    return false;
  }
  if (
    !Number.isSafeInteger(value.id) ||
    !(value.bytes instanceof ArrayBuffer) ||
    typeof value.name !== "string" ||
    typeof value.type !== "string"
  ) {
    return false;
  }
  if (value.kind === "read") {
    return true;
  }
  return (
    value.kind === "clean" &&
    "groups" in value &&
    Array.isArray(value.groups) &&
    value.groups.every(
      (group) =>
        typeof group === "string" &&
        [
          "ai-provenance",
          "location",
          "time",
          "device-identity",
          "camera-settings",
          "authorship",
          "software-history",
          "thumbnails",
          "other-text",
          "display",
        ].includes(group)
    ) &&
    "preset" in value &&
    typeof value.preset === "string" &&
    ["ai-only", "personal", "everything", "custom"].includes(value.preset)
  );
};

// The host serializes requests. Keep this queue too, so direct messages cannot overlap Perl calls.
let pending = Promise.resolve();
self.addEventListener("message", (event: MessageEvent<unknown>) => {
  if (!isWorkerRequest(event.data)) {
    return;
  }
  const request = event.data;
  const handle = async () => {
    try {
      const { browserMetadataEngine } =
        await import("@/features/expose/expose.engine.browser");
      const progress = (value: CleanProgress) =>
        self.postMessage({ id: request.id, kind: "progress", progress: value });
      if (request.kind === "read") {
        const report = await readFile(
          {
            bytes: new Uint8Array(request.bytes),
            name: request.name,
            type: request.type,
          },
          browserMetadataEngine,
          progress
        );
        self.postMessage({ id: request.id, kind: "read", report });
      } else {
        const result = await cleanFile(
          {
            bytes: new Blob([request.bytes], { type: request.type }),
            lastModified: 0,
            name: request.name,
            type: request.type,
          },
          { groups: request.groups, preset: request.preset, report: progress },
          browserMetadataEngine,
          browserMetadataEngine
        );
        self.postMessage({ id: request.id, kind: "clean", result });
      }
    } catch (error) {
      self.postMessage(fail(request.id, error));
    }
  };
  // oxlint-disable-next-line promise/prefer-await-to-then -- one promise chain serializes dedicated Worker messages without overlapping the Perl interpreter
  pending = pending.then(handle, handle);
});
