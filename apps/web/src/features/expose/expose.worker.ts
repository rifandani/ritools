/* eslint-disable unicorn/require-post-message-target-origin -- this is a DedicatedWorker postMessage, not a window message */
/* oxlint-disable anti-slop/no-unknown-parameters, anti-slop/no-conditional-empty-object-spread -- the worker is the boundary that turns an untyped thrown value into a named failure */
/// <reference lib="webworker" />
import type {
  CleanProgress,
  CleanResult,
  ExposeErrorCode,
  ImageFormat,
  MetadataGroup,
  ReadReport,
} from "@/features/expose/expose";
import { ExposeError } from "@/features/expose/expose";
import { cleanFile } from "@/features/expose/expose.cleaner";
import type { ExifToolWriter } from "@/features/expose/expose.cleaner";
import { readImage } from "@/features/expose/expose.reader";

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
  readonly code: ExposeErrorCode;
  readonly detail: string;
  readonly format?: ImageFormat;
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
      detail: error.detail,
      format: error.format,
      group: error.group,
      id,
      kind: "failed",
    };
  }
  return {
    code: "engine-failed",
    detail: error instanceof Error ? error.message : "the engine failed",
    id,
    kind: "failed",
  };
};

self.addEventListener("message", (event: MessageEvent<WorkerRequest>) => {
  // Only pages of this origin may ask the Worker to read or clean bytes.
  if (event.origin !== self.location.origin) {
    return;
  }
  const request = event.data;
  if (request.kind === "read") {
    try {
      const report = readImage({
        bytes: new Uint8Array(request.bytes),
        name: request.name,
        type: request.type,
      });
      self.postMessage({ id: request.id, kind: "read", report });
    } catch (error) {
      self.postMessage(fail(request.id, error));
    }
    return;
  }

  void (async () => {
    try {
      const { browserExifToolWriter } =
        await import("@/features/expose/expose.writer.browser");
      const writer: ExifToolWriter = browserExifToolWriter;
      const result = await cleanFile(
        {
          bytes: new Blob([request.bytes], { type: request.type }),
          lastModified: Date.now(),
          name: request.name,
          type: request.type,
        },
        {
          groups: request.groups,
          preset: request.preset,
          report: (progress) => {
            self.postMessage({
              id: request.id,
              kind: "progress",
              progress,
            });
          },
        },
        writer
      );
      self.postMessage({ id: request.id, kind: "clean", result });
    } catch (error) {
      self.postMessage(fail(request.id, error));
    }
  })();
});
