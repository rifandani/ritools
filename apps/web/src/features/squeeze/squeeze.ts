import { Data, Effect, Option, Schema } from "effect";

/**
 * Squeeze: the domain of compressing one image to a Target.
 *
 * Everything here is pure or Effect. The browser sits behind the `CodecSession`
 * port, so the search and the outcome rules are unit-tested in Node.
 */

/** The image formats Squeeze accepts, and keeps. */
const ImageFormat = Schema.Literals(["jpeg", "png", "webp", "avif"]);
export type ImageFormat = typeof ImageFormat.Type;

/** How Squeeze chooses the quality of each output. */
const CompressionMode = Schema.Literals(["target", "quality"]);
export type CompressionMode = typeof CompressionMode.Type;

/** Why Squeeze could not compress one image. */
const SqueezeProblem = Schema.Literals([
  "unsupported",
  "unreadable",
  "codec-failed",
]);
export type SqueezeProblem = typeof SqueezeProblem.Type;

/** A failure that stopped Squeeze from reading or encoding one image. */
export class SqueezeError extends Schema.TaggedError<SqueezeError>()(
  "SqueezeError",
  {
    detail: Schema.String,
    problem: SqueezeProblem,
  }
) {}

/** The MIME type of each format, for the output Blob. */
export const MIME_TYPE: Record<ImageFormat, string> = {
  avif: "image/avif",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
};

/** The format a MIME type names. */
const FORMAT_BY_MIME = new Map<string, ImageFormat>([
  ["image/avif", "avif"],
  ["image/jpeg", "jpeg"],
  ["image/png", "png"],
  ["image/webp", "webp"],
]);

/** The format a file extension names. */
const FORMAT_BY_EXTENSION = new Map<string, ImageFormat>([
  ["avif", "avif"],
  ["jpeg", "jpeg"],
  ["jpg", "jpeg"],
  ["png", "png"],
  ["webp", "webp"],
]);

/**
 * The format Squeeze keeps for a file. The MIME type wins, because a drag from
 * a file manager sometimes carries no type and never carries a wrong one.
 */
export const formatOf = (file: {
  readonly name: string;
  readonly type: string;
}): Option.Option<ImageFormat> => {
  const byMime = FORMAT_BY_MIME.get(file.type);
  if (byMime !== undefined) {
    return Option.some(byMime);
  }
  const dot = file.name.lastIndexOf(".");
  const extension = dot === -1 ? "" : file.name.slice(dot + 1).toLowerCase();
  return Option.fromNullishOr(FORMAT_BY_EXTENSION.get(extension));
};

/** The settings one Batch runs under. */
export interface SqueezeSettings {
  /** The longest edge every image is scaled to, or `null` for no scaling. */
  readonly maxDimension: number | null;
  readonly mode: CompressionMode;
  /** Encoder quality, for `quality` mode. PNG ignores it. */
  readonly quality: number;
  /** The Target for one image, in bytes. */
  readonly targetBytes: number;
}

/** Bytes in a kilobyte, as the interface states it. */
export const BYTES_PER_KB = 1000;
/** 200 KB: a size most photographs can reach without visible damage. */
const DEFAULT_TARGET_BYTES = 200 * BYTES_PER_KB;
const DEFAULT_QUALITY = 80;
export const MIN_QUALITY = 10;
export const MAX_QUALITY = 95;
export const MIN_TARGET_BYTES = 10 * BYTES_PER_KB;
export const MAX_TARGET_BYTES = 10_000 * BYTES_PER_KB;
export const MIN_MAX_DIMENSION = 16;
export const MAX_MAX_DIMENSION = 10_000;

export const DEFAULT_SETTINGS: SqueezeSettings = {
  maxDimension: null,
  mode: "target",
  quality: DEFAULT_QUALITY,
  targetBytes: DEFAULT_TARGET_BYTES,
};

/** One rung of a format's quality ladder. */
export interface EncodeStep {
  /** Channel levels for PNG's uniform quantiser. `null` keeps every colour. */
  readonly levels: number | null;
  /** Encoder quality, 1-100. PNG ignores it. */
  readonly quality: number;
}

/** The pixel buffer of an image, which is also what `ImageData` is. */
export interface RgbaImage {
  readonly data: Uint8ClampedArray;
  readonly height: number;
  readonly width: number;
}

/** Qualities from best to worst, for the formats that take a quality. */
const LOSSY_LADDER = [95, 88, 80, 72, 64, 56, 48, 40, 30, 20] as const;
/** AVIF reaches the same damage at a lower number than JPEG and WebP do. */
const AVIF_LADDER = [70, 63, 56, 49, 42, 35, 28, 22, 16, 10] as const;
/** Channel levels from best to worst. `null` keeps every colour, so PNG is exact. */
const PNG_LADDER = [null, 8, 6, 5, 4, 3, 2] as const;

/**
 * The rungs Squeeze tries for a format, best first. A lower rung gives a
 * smaller file, so the order is what lets `searchBestStep` bisect.
 */
export const ladderFor = (format: ImageFormat): readonly EncodeStep[] => {
  if (format === "png") {
    return PNG_LADDER.map((levels) => ({ levels, quality: MAX_QUALITY }));
  }
  const qualities = format === "avif" ? AVIF_LADDER : LOSSY_LADDER;
  return qualities.map((quality) => ({ levels: null, quality }));
};

/**
 * The rungs one run uses: the whole ladder to reach a Target, one rung in
 * `quality` mode, where the user has already picked the quality.
 */
export const stepsFor = (
  format: ImageFormat,
  settings: SqueezeSettings
): readonly EncodeStep[] => {
  if (settings.mode === "quality") {
    return [{ levels: null, quality: settings.quality }];
  }
  return ladderFor(format);
};

/**
 * Reduces an image to `levels` values per channel. The quantiser is uniform,
 * which is what makes it fast enough to run inside the search, and a smaller
 * colour set is what PNG's deflate then compresses well.
 *
 * Alpha is kept exactly: transparency is not a colour.
 */
export const quantizeLevels = (image: RgbaImage, levels: number): RgbaImage => {
  const step = Math.max(1, Math.ceil(256 / levels));
  return {
    data: Uint8ClampedArray.from(image.data, (value, index) =>
      index % 4 === 3 ? value : Math.min(255, Math.round(value / step) * step)
    ),
    height: image.height,
    width: image.width,
  };
};

/** The width and height of an image, in pixels. */
export interface ImageSize {
  readonly height: number;
  readonly width: number;
}

/**
 * The size to scale an image to so its longest edge is `max` or less. An image
 * that already fits is returned unchanged.
 */
export const scaleToFit = (size: ImageSize, max: number): ImageSize => {
  const longest = Math.max(size.height, size.width);
  if (longest <= max) {
    return size;
  }
  const factor = max / longest;
  return {
    height: Math.max(1, Math.round(size.height * factor)),
    width: Math.max(1, Math.round(size.width * factor)),
  };
};

/** A size a person reads, in the given Locale. */
export const formatBytes = (bytes: number, locale: string): string => {
  const units = ["B", "KB", "MB", "GB"];
  let value = Math.max(0, bytes);
  let unit = 0;
  while (value >= BYTES_PER_KB && unit < units.length - 1) {
    value /= BYTES_PER_KB;
    unit += 1;
  }
  const digits = unit === 0 || Number.isInteger(value) ? 0 : 1;
  const label = unit === 0 ? "B" : unit === 1 ? "KB" : unit === 2 ? "MB" : "GB";
  return `${new Intl.NumberFormat(locale, {
    maximumFractionDigits: digits,
    minimumFractionDigits: digits,
  }).format(value)} ${label}`;
};

/** How much smaller the output is, as a percentage. It is negative when bigger. */
export const savingsPercent = (
  inputBytes: number,
  outputBytes: number
): number => {
  if (inputBytes <= 0) {
    return 0;
  }
  return Math.round(((inputBytes - outputBytes) / inputBytes) * 100);
};

/** One measurement of a rung. */
export interface Probe<S, A> {
  readonly result: A;
  readonly step: S;
}

/** The rung whose output Squeeze kept, and whether it reached the bar. */
export interface SearchOutcome<S, A> {
  readonly best: Probe<S, A>;
  /** How many times the ladder was measured. */
  readonly probes: number;
  readonly within: boolean;
}

/* v8 ignore start -- @preserve A ladder is never empty, so this is unreachable. */
const at = <A>(items: readonly A[], index: number): A => {
  const value = items[index];
  if (value === undefined) {
    throw new Error(`Squeeze: ladder index ${index} is out of range`);
  }
  return value;
};
/* v8 ignore stop -- @preserve */

/**
 * Finds the best rung whose output satisfies `fits`.
 *
 * The ladder is ordered best first, and a lower rung gives a smaller file, so a
 * bisection finds the best fit in `log2(steps)` measurements. When no rung
 * fits, the outcome is the worst rung, with `within: false`: the caller reports
 * a Miss and still hands the user the smallest file it made.
 */
export const searchBestStep = <S, A, E>(options: {
  readonly fits: (result: A) => boolean;
  readonly ladder: readonly S[];
  readonly measure: (step: S, index: number) => Effect.Effect<A, E>;
}): Effect.Effect<SearchOutcome<S, A>, E> =>
  Effect.gen(function* () {
    const { fits, ladder, measure } = options;
    const measured = new Map<number, Probe<S, A>>();
    let probes = 0;

    const probeAt = (index: number) =>
      Effect.gen(function* () {
        const cached = measured.get(index);
        if (cached !== undefined) {
          return cached;
        }
        const step = at(ladder, index);
        const probe = { result: yield* measure(step, index), step };
        probes += 1;
        measured.set(index, probe);
        return probe;
      });

    let low = 0;
    let high = ladder.length - 1;
    let best: Probe<S, A> | null = null;
    while (low <= high) {
      const middle = Math.floor((low + high) / 2);
      const probe = yield* probeAt(middle);
      if (fits(probe.result)) {
        best = probe;
        high = middle - 1;
      } else {
        low = middle + 1;
      }
    }

    return {
      best: best ?? (yield* probeAt(ladder.length - 1)),
      probes,
      within: best !== null,
    };
  });

/** One image of a Batch. */
export interface BatchItem {
  readonly format: Option.Option<ImageFormat>;
  readonly id: string;
  readonly name: string;
  readonly size: number;
  readonly source: Blob;
  /** The Target for this image alone, or `null` to use the Batch Target. */
  readonly targetBytes: number | null;
}

/** What Squeeze made of one image. */
interface EncodedImage {
  readonly attempts: number;
  readonly bytes: ArrayBuffer;
  readonly height: number;
  readonly reducedColors: boolean;
  readonly resized: boolean;
  readonly size: number;
  readonly width: number;
}

/**
 * The result of one image, which is the row state the UI shows.
 *
 * `UnderTarget` carries no bytes because Squeeze encoded nothing: the file the
 * user dropped already fits.
 */
export type ItemOutcome = Data.TaggedEnum<{
  Compressed: EncodedImage;
  UnderTarget: { readonly size: number };
  Miss: EncodedImage;
  Rejected: { readonly problem: SqueezeProblem };
}>;

export const ItemOutcome = Data.taggedEnum<ItemOutcome>();

/** An image the codec has read and scaled, ready to encode. */
export interface OpenedImage {
  readonly height: number;
  readonly sourceHeight: number;
  readonly sourceWidth: number;
  readonly width: number;
}

/**
 * The codec port: one image at a time, over one Worker.
 *
 * `open` reads the bytes and scales them once, so every rung of the ladder
 * costs an encode and not a decode.
 */
export interface CodecSession {
  readonly encode: (
    step: EncodeStep
  ) => Effect.Effect<ArrayBuffer, SqueezeError>;
  readonly open: (input: {
    readonly bytes: ArrayBuffer;
    readonly format: ImageFormat;
    readonly maxDimension: number | null;
  }) => Effect.Effect<OpenedImage, SqueezeError>;
}

/** One message the pool sends to a codec Worker. */
export type CodecRequest =
  | {
      readonly kind: "open";
      readonly bytes: ArrayBuffer;
      readonly format: ImageFormat;
      readonly maxDimension: number | null;
    }
  | { readonly kind: "encode"; readonly step: EncodeStep }
  | { readonly kind: "release" };

/** One message a codec Worker sends back. It answers the request it just got. */
export type CodecReply =
  | { readonly image: OpenedImage; readonly kind: "opened" }
  | { readonly bytes: ArrayBuffer; readonly kind: "encoded" }
  | {
      readonly detail: string;
      readonly kind: "failed";
      readonly problem: SqueezeProblem;
    };

/**
 * The part of `Worker` the pool uses. It is an interface rather than the DOM
 * type so a unit test can supply a fake.
 *
 * `error` carries the message the Worker's own error event already read, so the
 * pool never handles an unparsed failure.
 */
export interface CodecWorkerPort {
  readonly send: (
    request: CodecRequest,
    transfer: readonly Transferable[]
  ) => void;
  readonly subscribe: (on: {
    readonly error: (detail: string) => void;
    readonly message: (reply: CodecReply) => void;
  }) => void;
  readonly terminate: () => void;
}

/**
 * How many codec Workers run at once: half the cores, kept between 2 and 4.
 *
 * A bound is what keeps a large Batch alive: an unbounded pool would decode
 * every image at the same time and exhaust the device. Two is the floor because
 * one Worker leaves the encoder inside a single thread.
 */
export const workerCount = (hardwareConcurrency = 4): number =>
  Math.min(4, Math.max(2, Math.floor(hardwareConcurrency / 2)));

/** What one image asks of Squeeze, before its bytes are read. */
export interface CompressPlan {
  readonly inputBytes: number;
  readonly settings: SqueezeSettings;
  readonly targetBytes: number;
}

/** Everything `compressImage` needs, with the bytes already read. */
export interface CompressInput extends CompressPlan {
  readonly bytes: ArrayBuffer;
  readonly format: ImageFormat;
}

/**
 * Whether Squeeze can skip the codec entirely: the input already fits the
 * Target, and nothing else asks for a change.
 */
export const canSkipEncoding = (plan: CompressPlan): boolean =>
  plan.settings.mode === "target" &&
  plan.settings.maxDimension === null &&
  plan.inputBytes <= plan.targetBytes;

/**
 * Compresses one image: opens it, walks the ladder until the output reaches the
 * bar, and reports the best output it made.
 *
 * In `target` mode the bar is the Target. In `quality` mode there is no Target,
 * so the bar is the input size — an output that is not smaller is a Miss, and
 * the user keeps the file they came with.
 *
 * The caller has already ruled out the input that needs no work; see
 * `canSkipEncoding`.
 */
export const compressImage = (
  codec: CodecSession,
  input: CompressInput
): Effect.Effect<ItemOutcome, SqueezeError> =>
  Effect.gen(function* () {
    const opened = yield* codec.open({
      bytes: input.bytes,
      format: input.format,
      maxDimension: input.settings.maxDimension,
    });

    const search = yield* searchBestStep<EncodeStep, ArrayBuffer, SqueezeError>(
      {
        fits: (bytes) =>
          input.settings.mode === "quality"
            ? bytes.byteLength < input.inputBytes
            : bytes.byteLength <= input.targetBytes,
        ladder: stepsFor(input.format, input.settings),
        measure: (step) => codec.encode(step),
      }
    );

    // Squeeze never hands back something bigger than the input. For a Miss that
    // is the whole point: the user keeps the file they came with.
    const kept = search.best.result.byteLength < input.inputBytes;
    const bytes = kept ? search.best.result : input.bytes;
    const scaled = opened.width !== opened.sourceWidth;
    const encoded: EncodedImage = {
      attempts: search.probes,
      bytes,
      height: kept ? opened.height : opened.sourceHeight,
      reducedColors: kept && search.best.step.levels !== null,
      resized: kept && scaled,
      size: bytes.byteLength,
      width: kept ? opened.width : opened.sourceWidth,
    };

    return search.within
      ? ItemOutcome.Compressed(encoded)
      : ItemOutcome.Miss(encoded);
  });

/** The result of one image, with the id that ties it to its Batch Item. */
export interface ItemResult {
  readonly id: string;
  /** The settings it was made under. A different key makes it stale. */
  readonly key: string;
  readonly outcome: ItemOutcome;
}

/** The settings key of one image: a result under another key is stale. */
export const settingsKeyOf = (
  settings: SqueezeSettings,
  targetBytes: number
): string =>
  [
    settings.mode,
    settings.quality,
    settings.maxDimension ?? "none",
    targetBytes,
  ].join(":");

/** The state one row of the Batch shows. */
export type RowState =
  | "compressed"
  | "miss"
  | "rejected"
  | "under-target"
  | "working";

/** What one row of the Batch shows, derived from its outcome. */
export interface RowView {
  /** The output's size in pixels, when it has one. */
  readonly dimension: string | null;
  /** Why Squeeze rejected the row, when it did. */
  readonly problem: SqueezeProblem | null;
  readonly reducedColors: boolean;
  readonly resized: boolean;
  /** How much smaller the output is, as a percentage. */
  readonly saved: number;
  /** The size the user ends up with, or `null` before a result. */
  readonly size: number | null;
  readonly state: RowState;
}

/** The row of one image: its state, its sizes, and the notes about it. */
export const rowViewOf = (
  item: BatchItem,
  result: ItemResult | undefined
): RowView => {
  const outcome = result?.outcome;
  if (outcome === undefined) {
    return {
      dimension: null,
      problem: null,
      reducedColors: false,
      resized: false,
      saved: 0,
      size: null,
      state: "working",
    };
  }
  if (outcome._tag === "Rejected") {
    return {
      dimension: null,
      problem: outcome.problem,
      reducedColors: false,
      resized: false,
      saved: 0,
      size: item.size,
      state: "rejected",
    };
  }
  if (outcome._tag === "UnderTarget") {
    return {
      dimension: null,
      problem: null,
      reducedColors: false,
      resized: false,
      saved: 0,
      size: item.size,
      state: "under-target",
    };
  }
  return {
    dimension: `${outcome.width}×${outcome.height}`,
    problem: null,
    reducedColors: outcome.reducedColors,
    resized: outcome.resized,
    saved: savingsPercent(item.size, outcome.size),
    size: outcome.size,
    state: outcome._tag === "Compressed" ? "compressed" : "miss",
  };
};

const ROW_STATE_KEYS = {
  compressed: "squeezeStateCompressed",
  miss: "squeezeStateMiss",
  rejected: "squeezeStateRejected",
  "under-target": "squeezeStateUnderTarget",
  working: "squeezeWorking",
} as const satisfies Record<RowState, string>;

/** The Translation Key of a row state. */
export const rowStateKey = (state: RowState) => ROW_STATE_KEYS[state];

const PROBLEM_KEYS = {
  "codec-failed": "squeezeProblemCodecFailed",
  unreadable: "squeezeProblemUnreadable",
  unsupported: "squeezeProblemUnsupported",
} as const satisfies Record<SqueezeProblem, string>;

/** The Translation Key of a rejection reason. */
export const problemKey = (problem: SqueezeProblem) => PROBLEM_KEYS[problem];

/** The bytes the user gets for one image, or `null` when their own file is best. */
export const outputBytesOf = (
  item: BatchItem,
  result: ItemResult | undefined
): ArrayBuffer | null => {
  if (result === undefined) {
    return null;
  }
  return ItemOutcome.$match(result.outcome, {
    Compressed: (image) => image.bytes,
    Miss: (image) => image.bytes,
    Rejected: () => null,
    UnderTarget: () => null,
  });
};

/**
 * Names that a ZIP can carry. One Batch may hold two files of the same name,
 * and a ZIP may not, so a repeat gets `-2`, `-3`, and so on before its
 * extension.
 */
export const uniqueNames = (names: readonly string[]): readonly string[] =>
  names.map((name, index) => {
    const repeat = names.slice(0, index).filter((seen) => seen === name).length;
    if (repeat === 0) {
      return name;
    }
    const dot = name.lastIndexOf(".");
    const stem = dot <= 0 ? name : name.slice(0, dot);
    const extension = dot <= 0 ? "" : name.slice(dot);
    return `${stem}-${repeat + 1}${extension}`;
  });

/** What a Batch adds up to, for the summary bar. */
export interface BatchSummary {
  /** Images that have a result. */
  readonly done: number;
  readonly inputBytes: number;
  readonly misses: number;
  /** Bytes the Batch goes out at, counting an image without a result at its input size. */
  readonly outputBytes: number;
  readonly rejected: number;
  readonly total: number;
}

export const summarize = (
  items: ReadonlyMap<string, BatchItem>,
  results: ReadonlyMap<string, ItemResult>
): BatchSummary => {
  let done = 0;
  let inputBytes = 0;
  let misses = 0;
  let outputBytes = 0;
  let rejected = 0;

  for (const [id, item] of items) {
    inputBytes += item.size;
    const result = results.get(id);
    if (result === undefined) {
      outputBytes += item.size;
      continue;
    }
    done += 1;
    outputBytes += ItemOutcome.$match(result.outcome, {
      Compressed: (image) => image.size,
      Miss: (image) => image.size,
      Rejected: () => item.size,
      UnderTarget: () => item.size,
    });
    if (ItemOutcome.$is("Miss")(result.outcome)) {
      misses += 1;
    }
    if (ItemOutcome.$is("Rejected")(result.outcome)) {
      rejected += 1;
    }
  }

  return { done, inputBytes, misses, outputBytes, rejected, total: items.size };
};
