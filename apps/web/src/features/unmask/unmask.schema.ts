/* oxlint-disable eslint/max-classes-per-file, anti-slop/no-shape-in-symbol-names -- The fixed engine contract groups the vocabulary, the tagged errors, and the service tag in one module. */
import { Context, Schema } from "effect";
import type { Effect } from "effect";

/**
 * Unmask: the domain of removing the Background from one image and writing a
 * Cutout.
 *
 * This module is the engine-side seam. It holds the vocabulary, the named
 * errors, and the service tag. The model, the Worker, and every codec sit
 * behind it, so no ONNX Runtime type, tensor, session, model path, or codec
 * type leaks out.
 */

/* -------------------------------------------------------------------------- */
/* Primitives                                                                  */
/* -------------------------------------------------------------------------- */

/** A safe non-negative integer count. */
const Count = Schema.Number.check(
  Schema.isInt(),
  Schema.isGreaterThanOrEqualTo(0),
  Schema.isLessThanOrEqualTo(Number.MAX_SAFE_INTEGER)
);
export type Count = typeof Count.Type;

/** The opaque identity of one decoded source. It carries no file text. */
const SourceId = Schema.String.check(Schema.isMinLength(1)).pipe(
  Schema.brand("UnmaskSource")
);
export type SourceId = typeof SourceId.Type;

/** The opaque identity of one Matte. */
const MatteId = Schema.String.check(Schema.isMinLength(1)).pipe(
  Schema.brand("UnmaskMatte")
);
export type MatteId = typeof MatteId.Type;

/** The opaque identity of one Magic Brush operation. */
const OperationId = Schema.String.check(Schema.isMinLength(1)).pipe(
  Schema.brand("UnmaskOperation")
);
export type OperationId = typeof OperationId.Type;

/** The opaque identity of one Worker request. */
export const RequestId = Schema.String.check(Schema.isMinLength(1)).pipe(
  Schema.brand("UnmaskRequest")
);
export type RequestId = typeof RequestId.Type;

/** An integer coordinate in the source image. */
const Pixel = Schema.Struct({
  x: Schema.Int,
  y: Schema.Int,
});
export type Pixel = typeof Pixel.Type;

/* -------------------------------------------------------------------------- */
/* Vocabulary                                                                  */
/* -------------------------------------------------------------------------- */

/** The six input formats. GIF and BMP contribute their first frame. */
const ImageFormat = Schema.Literals([
  "jpeg",
  "png",
  "webp",
  "avif",
  "gif",
  "bmp",
]);
export type ImageFormat = typeof ImageFormat.Type;

/** The four output formats. */
const OutputFormat = Schema.Literals(["png", "webp", "avif", "jpeg"]);
export type OutputFormat = typeof OutputFormat.Type;

/** An opaque, sRGB colour behind the Subject. */
const RgbaColor = Schema.Struct({
  a: Schema.Literal(255),
  b: Schema.Number.check(
    Schema.isInt(),
    Schema.isGreaterThanOrEqualTo(0),
    Schema.isLessThanOrEqualTo(255)
  ),
  g: Schema.Number.check(
    Schema.isInt(),
    Schema.isGreaterThanOrEqualTo(0),
    Schema.isLessThanOrEqualTo(255)
  ),
  r: Schema.Number.check(
    Schema.isInt(),
    Schema.isGreaterThanOrEqualTo(0),
    Schema.isLessThanOrEqualTo(255)
  ),
});
export type RgbaColor = typeof RgbaColor.Type;

/** The fill behind the Subject. */
export const Backdrop = Schema.TaggedUnion({
  Transparent: {},
  Solid: { color: RgbaColor },
  Blur: { radius: Schema.Finite },
});
export type Backdrop = typeof Backdrop.Type;

/** The width, height, and one 8-bit alpha sample per pixel, row-major. */
export const Matte = Schema.Struct({
  matteId: MatteId,
  width: Count,
  height: Count,
  alpha: Schema.Uint8Array,
}).check(
  Schema.makeFilter(
    (matte) =>
      matte.alpha.length === matte.width * matte.height ||
      "a Matte alpha buffer must hold exactly width * height samples"
  )
);
export type Matte = typeof Matte.Type;

/** A decoded image at one size: RGBA, straight alpha, sRGB. */
export const RasterImage = Schema.Struct({
  width: Count,
  height: Count,
  rgba: Schema.Uint8Array,
}).check(
  Schema.makeFilter(
    (image) =>
      image.rgba.length === image.width * image.height * 4 ||
      "a RasterImage buffer must hold exactly width * height * 4 samples"
  )
);
export type RasterImage = typeof RasterImage.Type;

/** What the engine read from the source bytes. */
const SourceFacts = Schema.Struct({
  sourceId: SourceId,
  name: Schema.String,
  format: ImageFormat,
  width: Count,
  height: Count,
  bytes: Count,
  frameCount: Count,
  hasAlpha: Schema.Boolean,
});
export type SourceFacts = typeof SourceFacts.Type;

/** The model that ran, and the runtime that ran it. */
const ModelInfo = Schema.Struct({
  id: Schema.Literal("isnet-int8"),
  name: Schema.String,
  version: Schema.String,
  licence: Schema.String,
  licenceUrl: Schema.String,
  bytes: Count,
  sha256: Schema.String,
  backend: Schema.Literals(["webgpu", "wasm"]),
});
export type ModelInfo = typeof ModelInfo.Type;

/* -------------------------------------------------------------------------- */
/* Named errors                                                                */
/* -------------------------------------------------------------------------- */

/** The short code the UI selects the copy from. */
export type UnmaskErrorCode =
  | "unsupported"
  | "unreadable"
  | "too-large"
  | "model-unavailable"
  | "model-failed"
  | "cancelled"
  | "encode-failed"
  | "jpeg-needs-backdrop";

/**
 * A format outside the six input formats. The format is detected from the
 * bytes, not the file name.
 */
export class UnsupportedFormat extends Schema.TaggedError<UnsupportedFormat>()(
  "UnsupportedFormat",
  {
    detail: Schema.optionalKey(Schema.String),
    format: Schema.String,
  }
) {}

/** A supported format that the browser cannot decode, or a damaged file. */
export class UnreadableFile extends Schema.TaggedError<UnreadableFile>()(
  "UnreadableFile",
  {
    detail: Schema.optionalKey(Schema.String),
    reason: Schema.Literals(["decode", "damaged", "empty"]),
  }
) {}

/** A source over the device budget, found before or during decode. */
export class TooLarge extends Schema.TaggedError<TooLarge>()("TooLarge", {
  detail: Schema.optionalKey(Schema.String),
  height: Count,
  neededBytes: Count,
  pixels: Count,
  width: Count,
}) {}

/** A model that cannot be fetched or initialized. */
export class ModelUnavailable extends Schema.TaggedError<ModelUnavailable>()(
  "ModelUnavailable",
  {
    detail: Schema.optionalKey(Schema.String),
    reason: Schema.Literals(["offline", "fetch", "init"]),
  }
) {}

/** A model that loaded but did not finish. */
export class ModelFailed extends Schema.TaggedError<ModelFailed>()(
  "ModelFailed",
  {
    detail: Schema.optionalKey(Schema.String),
    reason: Schema.Literals(["inference", "memory", "device-lost"]),
  }
) {}

/** Effect interruption or the AbortSignal. The file is unchanged. */
export class Cancelled extends Schema.TaggedError<Cancelled>()("Cancelled", {
  detail: Schema.optionalKey(Schema.String),
}) {}

/**
 * A codec failure, or JPEG with a Transparent Backdrop. The Matte is kept, so
 * the user can choose another format.
 */
export class EncodeFailed extends Schema.TaggedError<EncodeFailed>()(
  "EncodeFailed",
  {
    detail: Schema.optionalKey(Schema.String),
    reason: Schema.Literals([
      "jpeg-needs-backdrop",
      "jpeg-transparent",
      "codec",
      "memory",
    ]),
  }
) {}

/** Every named failure the seam can return. */
export const UnmaskErrorSchema = Schema.Union([
  UnsupportedFormat,
  UnreadableFile,
  TooLarge,
  ModelUnavailable,
  ModelFailed,
  Cancelled,
  EncodeFailed,
]);
export type UnmaskError =
  | {
      readonly _tag: "UnsupportedFormat";
      readonly format: string;
      readonly detail?: string;
    }
  | {
      readonly _tag: "UnreadableFile";
      readonly reason: "decode" | "damaged" | "empty";
      readonly detail?: string;
    }
  | {
      readonly _tag: "TooLarge";
      readonly width: Count;
      readonly height: Count;
      readonly pixels: Count;
      readonly neededBytes: Count;
      readonly detail?: string;
    }
  | {
      readonly _tag: "ModelUnavailable";
      readonly reason: "offline" | "fetch" | "init";
      readonly detail?: string;
    }
  | {
      readonly _tag: "ModelFailed";
      readonly reason: "inference" | "memory" | "device-lost";
      readonly detail?: string;
    }
  | { readonly _tag: "Cancelled"; readonly detail?: string }
  | {
      readonly _tag: "EncodeFailed";
      readonly reason:
        | "jpeg-needs-backdrop"
        | "jpeg-transparent"
        | "codec"
        | "memory";
      readonly detail?: string;
    };

/** The short code for one named error. The UI selects the copy from it. */
export const errorCodeOf = (error: UnmaskError): UnmaskErrorCode => {
  switch (error._tag) {
    case "UnsupportedFormat": {
      return "unsupported";
    }
    case "UnreadableFile": {
      return "unreadable";
    }
    case "TooLarge": {
      return "too-large";
    }
    case "ModelUnavailable": {
      return "model-unavailable";
    }
    case "ModelFailed": {
      return "model-failed";
    }
    case "Cancelled": {
      return "cancelled";
    }
    case "EncodeFailed": {
      return error.reason === "jpeg-needs-backdrop"
        ? "jpeg-needs-backdrop"
        : "encode-failed";
    }
    default: {
      return "encode-failed";
    }
  }
};

/* -------------------------------------------------------------------------- */
/* remove                                                                      */
/* -------------------------------------------------------------------------- */

const SourceFile = Schema.Struct({
  name: Schema.String,
  mime: Schema.String,
  bytes: Schema.Uint8Array,
});
export type SourceFile = typeof SourceFile.Type;

export const RemoveProgress = Schema.TaggedUnion({
  Decode: {},
  ModelDownload: {
    loaded: Count,
    total: Schema.NullOr(Count),
  },
  ModelInit: {},
  Infer: {},
});
export type RemoveProgress = typeof RemoveProgress.Type;

const RemoveNote = Schema.TaggedUnion({
  InputAlpha: {},
  FirstFrame: { format: ImageFormat },
  ModelCached: {},
  ModelDownloaded: {},
  PreviewDownscaled: { width: Count, height: Count },
  WebGpuFallback: { reason: Schema.String },
});
export type RemoveNote = typeof RemoveNote.Type;

export const RemoveResult = Schema.Struct({
  source: SourceFacts,
  matte: Matte,
  preview: Matte,
  model: Schema.NullOr(ModelInfo),
  notes: Schema.Array(RemoveNote),
});
export type RemoveResult = typeof RemoveResult.Type;

export interface RemoveOptions {
  /** Long edge of the preview Matte. Default 2048, clamped to 512-2048. */
  readonly previewMaxEdge?: number;
  /** Effect interruption is the primary cancel path. This signal is for the
   * worker adapter and for non-Effect callers. */
  readonly signal?: AbortSignal;
  readonly report?: (event: RemoveProgress) => void;
}

/* -------------------------------------------------------------------------- */
/* refine                                                                      */
/* -------------------------------------------------------------------------- */

const MatteMode = Schema.Literals(["restore", "erase"]);
export type MatteMode = typeof MatteMode.Type;

const WandOperation = Schema.TaggedStruct("Wand", {
  operationId: OperationId,
  mode: MatteMode,
  seed: Pixel,
  tolerance: Schema.Finite,
  connectivity: Schema.Literals([4, 8]),
});
export type WandOperation = typeof WandOperation.Type;

const BrushOperation = Schema.TaggedStruct("Brush", {
  operationId: OperationId,
  mode: MatteMode,
  size: Schema.Finite,
  points: Schema.Array(Pixel).check(Schema.isMinLength(1)),
});
export type BrushOperation = typeof BrushOperation.Type;

const MatteOperation = Schema.Union([WandOperation, BrushOperation]);
export type MatteOperation = typeof MatteOperation.Type;

const RefineRequest = Schema.Struct({
  /** The original pixels at the same size as `matte`. */
  source: RasterImage,
  matte: Matte,
  operations: Schema.Array(MatteOperation),
});
export type RefineRequest = typeof RefineRequest.Type;

/* -------------------------------------------------------------------------- */
/* composite                                                                   */
/* -------------------------------------------------------------------------- */

const CompositeRequestSchema = Schema.Struct({
  source: RasterImage,
  matte: Matte,
  backdrop: Backdrop,
  feather: Schema.Finite,
  imageToken: Schema.optionalKey(Schema.String),
});

export interface CompositeRequest {
  /** The original pixels at the same size as `matte`. */
  readonly source: RasterImage;
  readonly matte: Matte;
  readonly backdrop: Backdrop;
  /** 0-50 px. */
  readonly feather: number;
  readonly imageToken?: string;
  /** The adapter's cancel path. Effect interruption is the primary path. */
  readonly signal?: AbortSignal;
}

/* -------------------------------------------------------------------------- */
/* encode                                                                      */
/* -------------------------------------------------------------------------- */

const EncodeRequestSchema = Schema.Struct({
  image: RasterImage,
  format: OutputFormat,
  quality: Schema.Finite,
  nameStem: Schema.String,
  imageToken: Schema.optionalKey(Schema.String),
});

export interface EncodeRequest {
  readonly image: RasterImage;
  readonly format: OutputFormat;
  /** 1-100. Ignored for PNG. */
  readonly quality: number;
  readonly nameStem: string;
  readonly imageToken?: string;
  /** The Backdrop the user chose, when the caller knows it. JPEG refuses
   * Transparent even when every pixel is opaque. */
  readonly backdrop?: Backdrop;
  /** The adapter's cancel path. Effect interruption is the primary path. */
  readonly signal?: AbortSignal;
}

export const EncodedFile = Schema.Struct({
  name: Schema.String,
  mime: Schema.String,
  bytes: Schema.Uint8Array,
  width: Count,
  height: Count,
  format: OutputFormat,
  quality: Schema.NullOr(Count),
  hasAlpha: Schema.Boolean,
  bytesLength: Count,
});
export type EncodedFile = typeof EncodedFile.Type;

/* -------------------------------------------------------------------------- */
/* The seam                                                                    */
/* -------------------------------------------------------------------------- */

/** The only interface the UI imports. Every other engine module is private. */
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

export class UnmaskEngine extends Context.Service<
  UnmaskEngine,
  UnmaskEngineShape
>()("@ritools/web/UnmaskEngine") {}

/* -------------------------------------------------------------------------- */
/* Defaults and limits                                                         */
/* -------------------------------------------------------------------------- */

/** Long edge of the preview Matte, in source pixels. */
export const DEFAULT_PREVIEW_MAX_EDGE = 2048;
/** The clamped range of the preview long edge. */
export const MIN_PREVIEW_MAX_EDGE = 512;
export const MAX_PREVIEW_MAX_EDGE = 2048;
/** The model input size, fixed by the model card. */
export const MODEL_INPUT_SIZE = 1024;
/** The default Feather, in source pixels. */
export const DEFAULT_FEATHER = 0;
/** The default Blur Backdrop radius, in source pixels. */
export const DEFAULT_BLUR_RADIUS = 20;
/** The default quality for the lossy formats. */
export const DEFAULT_QUALITY = 85;
/** The largest source, in pixels, that the preflight accepts. */
export const MAX_PIXELS = 64_000_000;
/** The largest estimated working set, in bytes, that the preflight accepts. */
export const MAX_WORKING_BYTES = 1024 * 1024 * 1024;
/** The total input size above which the Batch asks for care, in bytes. */
export const BATCH_WARN_BYTES = 512 * 1024 * 1024;
/** The largest operation log the history keeps. */
const HISTORY_LIMIT = 100;
