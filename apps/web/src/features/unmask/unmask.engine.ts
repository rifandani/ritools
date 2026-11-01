/* oxlint-disable anti-slop/no-shape-in-symbol-names, max-classes-per-file -- The service and its boundary failure are the seam named by the contract document. */
import { Context } from "effect";
import type { Effect } from "effect";

/**
 * The public engine seam for Unmask, version 1.
 *
 * This module is application-owned. It hides ONNX Runtime, the model, the
 * Worker, and every codec: no vendor type crosses this boundary. The UI imports
 * the values below and never a tensor, a session, a model path, or a codec.
 *
 * The fake layer in `unmask.fake.ts` implements this seam until the real engine
 * lands. Do not change this file for the fake: the seam is fixed by
 * `docs/plans/unmask/engine-interface.md`.
 */

export type SourceId = string & { readonly kind: "Source" };
export type MatteId = string & { readonly kind: "Matte" };
export type OperationId = string & { readonly kind: "Operation" };

export type ByteCount = number;
export type Count = number;

export interface Pixel {
  readonly x: number;
  readonly y: number;
}

/** The six input formats. GIF and BMP contribute their first frame. */
export type ImageFormat = "jpeg" | "png" | "webp" | "avif" | "gif" | "bmp";

/** The four output formats. */
export type OutputFormat = "png" | "webp" | "avif" | "jpeg";

/** An opaque, sRGB colour behind the Subject. */
export interface RgbaColor {
  readonly r: number;
  readonly g: number;
  readonly b: number;
  readonly a: 255;
}

/** The fill behind the Subject. */
export type Backdrop =
  | { readonly _tag: "Transparent" }
  | { readonly _tag: "Solid"; readonly color: RgbaColor }
  | { readonly _tag: "Blur"; readonly radius: number };

/** The per-pixel opacity of the Subject. */
export interface Matte {
  readonly matteId: MatteId;
  readonly width: Count;
  readonly height: Count;
  /** One 8-bit sample per pixel, row-major. Length is width * height. */
  readonly alpha: Uint8Array;
}

/** A decoded source image at one size. RGBA, straight alpha, sRGB. */
export interface RasterImage {
  readonly width: Count;
  readonly height: Count;
  /** Four 8-bit samples per pixel, row-major. Length is width * height * 4. */
  readonly rgba: Uint8Array;
}

export interface SourceFacts {
  readonly sourceId: SourceId;
  readonly name: string;
  readonly format: ImageFormat;
  readonly width: Count;
  readonly height: Count;
  readonly bytes: ByteCount;
  readonly frameCount: Count;
  readonly hasAlpha: boolean;
}

export interface ModelInfo {
  readonly id: "isnet-int8";
  readonly name: string;
  readonly version: string;
  readonly licence: string;
  readonly licenceUrl: string;
  readonly bytes: ByteCount;
  readonly sha256: string;
  readonly backend: "webgpu" | "wasm";
}

export interface SourceFile {
  readonly name: string;
  readonly mime: string;
  readonly bytes: Uint8Array;
}

export type RemoveProgress =
  | { readonly _tag: "Decode" }
  | {
      readonly _tag: "ModelDownload";
      readonly loaded: ByteCount;
      readonly total: ByteCount | null;
    }
  | { readonly _tag: "ModelInit" }
  | { readonly _tag: "Infer" };

export interface RemoveOptions {
  /** Long edge of the preview Matte. Default 2048, clamped to 512-2048. */
  readonly previewMaxEdge?: number;
  /** The adapter's cancel path. Effect interruption is the primary path. */
  readonly signal?: AbortSignal;
  readonly report?: (event: RemoveProgress) => void;
}

export type RemoveNote =
  | { readonly _tag: "InputAlpha" }
  | { readonly _tag: "FirstFrame"; readonly format: ImageFormat }
  | { readonly _tag: "ModelCached" }
  | { readonly _tag: "ModelDownloaded" }
  | {
      readonly _tag: "PreviewDownscaled";
      readonly width: Count;
      readonly height: Count;
    }
  | { readonly _tag: "WebGpuFallback"; readonly reason: string };

export interface RemoveResult {
  readonly source: SourceFacts;
  readonly matte: Matte;
  readonly preview: Matte;
  readonly model: ModelInfo | null;
  readonly notes: readonly RemoveNote[];
}

export type MatteMode = "restore" | "erase";

export interface WandOperation {
  readonly _tag: "Wand";
  readonly operationId: OperationId;
  readonly mode: MatteMode;
  readonly seed: Pixel;
  /** 0-100. 0 is an exact match; 100 includes every colour. */
  readonly tolerance: number;
  readonly connectivity: 4 | 8;
}

export interface BrushOperation {
  readonly _tag: "Brush";
  readonly operationId: OperationId;
  readonly mode: MatteMode;
  /** 1-200 source px. */
  readonly size: number;
  readonly points: readonly Pixel[];
}

export type MatteOperation = WandOperation | BrushOperation;

export interface RefineRequest {
  readonly source: RasterImage;
  readonly matte: Matte;
  readonly operations: readonly MatteOperation[];
}

export interface CompositeRequest {
  readonly source: RasterImage;
  readonly matte: Matte;
  readonly backdrop: Backdrop;
  /** 0-50 px. */
  readonly feather: number;
  readonly signal?: AbortSignal;
}

export interface EncodeRequest {
  readonly image: RasterImage;
  readonly format: OutputFormat;
  /** 1-100. Ignored for PNG. */
  readonly quality: number;
  readonly nameStem: string;
  readonly signal?: AbortSignal;
}

export interface EncodedFile {
  readonly name: string;
  readonly mime: string;
  readonly bytes: Uint8Array;
  readonly width: Count;
  readonly height: Count;
  readonly format: OutputFormat;
  readonly quality: number | null;
  readonly hasAlpha: boolean;
  readonly bytesLength: ByteCount;
}

export type UnmaskError =
  | { readonly _tag: "UnsupportedFormat"; readonly format: string }
  | {
      readonly _tag: "UnreadableFile";
      readonly reason: "decode" | "damaged" | "empty";
    }
  | {
      readonly _tag: "TooLarge";
      readonly width: Count;
      readonly height: Count;
      readonly pixels: Count;
      readonly neededBytes: ByteCount;
    }
  | {
      readonly _tag: "ModelUnavailable";
      readonly reason: "offline" | "fetch" | "init";
    }
  | {
      readonly _tag: "ModelFailed";
      readonly reason: "inference" | "memory" | "device-lost";
    }
  | { readonly _tag: "Cancelled" }
  | {
      readonly _tag: "EncodeFailed";
      readonly reason: "jpeg-transparent" | "codec" | "memory";
    };

/** What the engine does for the rest of the app. */
export interface UnmaskEngineShape {
  readonly remove: (
    file: SourceFile,
    options?: RemoveOptions
  ) => Effect.Effect<RemoveResult, UnmaskError>;
  readonly refine: (request: RefineRequest) => Matte;
  readonly composite: (
    request: CompositeRequest
  ) => Effect.Effect<RasterImage, UnmaskError>;
  readonly encode: (
    request: EncodeRequest
  ) => Effect.Effect<EncodedFile, UnmaskError>;
}

/** The service the UI calls. It never names a Worker or a vendor module. */
// fallow-ignore-next-line unused-export -- The Engine issue binds this service; the fake layer shares the same contract.
export class UnmaskEngine extends Context.Service<
  UnmaskEngine,
  UnmaskEngineShape
>()("@ritools/web/UnmaskEngine") {}

/** A failure that carries the public tagged error through `throw`. */
export class UnmaskEngineFailureError extends Error {
  readonly unmaskError: UnmaskError;

  constructor(error: UnmaskError) {
    super(error._tag);
    this.name = "UnmaskEngineFailureError";
    this.unmaskError = error;
  }
}

/**
 * The tagged error a promise rejection carries. The adapter boundary is the
 * only place that reads it; the UI never inspects a vendor error.
 */
// oxlint-disable-next-line anti-slop/no-unknown-parameters -- Effect's rejection is raw at this boundary.
export const unmaskErrorOf = (error: unknown): UnmaskError =>
  error instanceof UnmaskEngineFailureError
    ? error.unmaskError
    : { _tag: "UnreadableFile", reason: "decode" };
