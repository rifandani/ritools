import { clampFileName } from "@/core/libs/files";

/** The three presets, from the lightest touch to the smallest file. */
export const FOLIO_COMPRESS_PRESETS = {
  balanced: { maxDpi: 150, quality: 78 },
  light: { maxDpi: 300, quality: 90 },
  strong: { maxDpi: 100, quality: 60 },
} as const;

export type FolioCompressPreset = keyof typeof FOLIO_COMPRESS_PRESETS;

/** The smallest edge a re-encoded image keeps, in pixels. */
const FOLIO_COMPRESS_MIN_EDGE = 64;

/** The largest pixel count one image may hold in memory at once. */
export const FOLIO_COMPRESS_MAX_PIXELS = 32_000_000;

/** The image facts the planner reads from PDFium. */
export interface FolioImageFacts {
  readonly width: number;
  readonly height: number;
  readonly horizontalDpi: number;
  readonly verticalDpi: number;
  readonly bitsPerPixel: number;
  readonly colorspace: number;
}

/** The size and quality one image is re-encoded at. */
export interface FolioImagePlan {
  readonly width: number;
  readonly height: number;
  readonly quality: number;
}

/**
 * The color spaces a JPEG round trip keeps. PDFium renders the image to BGRA,
 * so the pixel color survives. CMYK, Lab, Separation, DeviceN, Indexed, and
 * Pattern are refused because a JPEG would change their printed color.
 */
const JPEG_COLOR_SPACES: ReadonlySet<number> = new Set([0, 1, 2, 4, 5, 7]);

/** The bits per pixel a JPEG round trip keeps: 8 for gray, 24 for RGB. */
const JPEG_BITS_PER_PIXEL: ReadonlySet<number> = new Set([8, 24]);

/**
 * The size one image is re-encoded at under a preset. A missing or zero DPI
 * does not downscale: the image keeps every pixel and only its quality drops.
 * A null plan means the image stays as it is.
 */
export const planForImage = (
  facts: FolioImageFacts,
  preset: FolioCompressPreset
): FolioImagePlan | null => {
  if (facts.width < 1 || facts.height < 1) {
    return null;
  }
  if (!JPEG_BITS_PER_PIXEL.has(facts.bitsPerPixel)) {
    return null;
  }
  if (!JPEG_COLOR_SPACES.has(facts.colorspace)) {
    return null;
  }
  const { maxDpi, quality } = FOLIO_COMPRESS_PRESETS[preset];
  const scaleX =
    facts.horizontalDpi > 0 ? Math.min(1, maxDpi / facts.horizontalDpi) : 1;
  const scaleY =
    facts.verticalDpi > 0 ? Math.min(1, maxDpi / facts.verticalDpi) : 1;
  const width = Math.max(1, Math.round(facts.width * scaleX));
  const height = Math.max(1, Math.round(facts.height * scaleY));
  if (width < FOLIO_COMPRESS_MIN_EDGE || height < FOLIO_COMPRESS_MIN_EDGE) {
    return null;
  }
  if (width * height > FOLIO_COMPRESS_MAX_PIXELS) {
    return null;
  }
  return { height, quality, width };
};

/** The name of the copy Compress writes for one input. */
export const compressedNameOf = (name: string): string => {
  const trimmed = name.trim();
  const stem = trimmed.toLowerCase().endsWith(".pdf")
    ? trimmed.slice(0, -4)
    : trimmed;
  return clampFileName(`${stem || "document"}-compressed.pdf`);
};

/**
 * The names a ZIP can carry. One Batch may hold two files of the same name,
 * and a ZIP may not, so a repeat gets `-2`, `-3`, and so on before the
 * extension.
 */
export const uniqueCompressedNames = (
  names: readonly string[]
): readonly string[] => {
  const used = new Set<string>();
  return names.map((name) => {
    const base = compressedNameOf(name);
    if (!used.has(base)) {
      used.add(base);
      return base;
    }
    const dot = base.lastIndexOf(".");
    const stem = dot > 0 ? base.slice(0, dot) : base;
    const extension = dot > 0 ? base.slice(dot) : "";
    let index = 2;
    let candidate = `${stem}-${index}${extension}`;
    while (used.has(candidate)) {
      index += 1;
      candidate = `${stem}-${index}${extension}`;
    }
    used.add(candidate);
    return candidate;
  });
};

/** The percentage of the input bytes that the output removes. */
export const percentSaved = (
  inputBytes: number,
  outputBytes: number
): number =>
  inputBytes <= 0
    ? 0
    : Math.max(0, Math.round(((inputBytes - outputBytes) / inputBytes) * 100));

/** Whether a finished copy is smaller than its input. */
export const outcomeOf = (
  inputBytes: number,
  outputBytes: number
): "compressed" | "unchanged" =>
  outputBytes < inputBytes ? "compressed" : "unchanged";

/** A size a person reads, in the given Locale. */
export { formatBytes as formatSize } from "@/core/utils/file-size";
