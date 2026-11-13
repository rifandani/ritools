import type {
  FilterName,
  Finetune,
  RgbaColor,
} from "@/features/easel/easel.stack";

/**
 * The color rules of Finetune and Filter.
 *
 * Each color adjustment is an affine change of RGB, so one 3×4 matrix holds
 * all of them. The renderer gives that one matrix to its shader. Blur and
 * Vignette are not color matrices; the renderer draws them itself.
 *
 * A matrix has three rows (red, green, blue). Each row has three factors and
 * one offset. Colors go from 0 to 1.
 */

export type ColorMatrix = readonly [
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
];

export const IDENTITY: ColorMatrix = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0];

const LUMA = [0.2126, 0.7152, 0.0722] as const;

const at = (matrix: ColorMatrix, index: number): number =>
  /* v8 ignore next -- @preserve a ColorMatrix always has 12 numbers. */
  matrix[index] ?? 0;

/** A matrix from the value of each of its 12 places. */
const matrixOf = (place: (index: number) => number): ColorMatrix => [
  place(0),
  place(1),
  place(2),
  place(3),
  place(4),
  place(5),
  place(6),
  place(7),
  place(8),
  place(9),
  place(10),
  place(11),
];

/** The matrix that applies `first`, then `second`. */
export const compose = (first: ColorMatrix, second: ColorMatrix): ColorMatrix =>
  matrixOf((index) => {
    const row = Math.floor(index / 4);
    const column = index % 4;
    let value = column === 3 ? at(second, row * 4 + 3) : 0;
    for (let inner = 0; inner < 3; inner += 1) {
      value += at(second, row * 4 + inner) * at(first, inner * 4 + column);
    }
    return value;
  });

const chain = (...steps: readonly ColorMatrix[]): ColorMatrix => {
  let result = IDENTITY;
  for (const step of steps) {
    result = compose(result, step);
  }
  return result;
};

const gain = (red: number, green: number, blue: number): ColorMatrix => [
  red,
  0,
  0,
  0,
  0,
  green,
  0,
  0,
  0,
  0,
  blue,
  0,
];

const lift = (red: number, green = red, blue = red): ColorMatrix => [
  1,
  0,
  0,
  red,
  0,
  1,
  0,
  green,
  0,
  0,
  1,
  blue,
];

/** Contrast around middle grey. */
const contrast = (factor: number): ColorMatrix => {
  const offset = 0.5 * (1 - factor);
  return [factor, 0, 0, offset, 0, factor, 0, offset, 0, 0, factor, offset];
};

const saturate = (factor: number): ColorMatrix => {
  const [r, g, b] = LUMA;
  const keep = 1 - factor;
  return [
    keep * r + factor,
    keep * g,
    keep * b,
    0,
    keep * r,
    keep * g + factor,
    keep * b,
    0,
    keep * r,
    keep * g,
    keep * b + factor,
    0,
  ];
};

const hueRotate = (degrees: number): ColorMatrix => {
  const angle = (degrees * Math.PI) / 180;
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const [r, g, b] = LUMA;
  return [
    r + cos * (1 - r) - sin * r,
    g - cos * g - sin * g,
    b - cos * b + sin * (1 - b),
    0,
    r - cos * r + sin * 0.143,
    g + cos * (1 - g) + sin * 0.14,
    b - cos * b - sin * 0.283,
    0,
    r - cos * r - sin * (1 - r),
    g - cos * g + sin * g,
    b + cos * (1 - b) + sin * b,
    0,
  ];
};

const warm = (amount: number): ColorMatrix =>
  gain(1 + 0.2 * amount, 1 + 0.04 * amount, 1 - 0.2 * amount);

const SEPIA: ColorMatrix = [
  0.393, 0.769, 0.189, 0, 0.349, 0.686, 0.168, 0, 0.272, 0.534, 0.131, 0,
];

/** A matrix between the identity and `matrix`. `amount` goes from 0 to 1. */
const mix = (matrix: ColorMatrix, amount: number): ColorMatrix =>
  matrixOf(
    (index) => at(IDENTITY, index) * (1 - amount) + at(matrix, index) * amount
  );

/** The named looks. They are our own set. */
const FILTERS: Readonly<Record<FilterName, ColorMatrix>> = {
  chrome: chain(saturate(1.25), contrast(1.25), gain(0.98, 1, 1.04)),
  cool: chain(warm(-0.6), saturate(1.05)),
  fade: chain(saturate(0.8), contrast(0.8), lift(0.06)),
  matte: chain(saturate(0.9), contrast(0.85), lift(0.05, 0.05, 0.08)),
  mono: saturate(0),
  noir: chain(saturate(0), contrast(1.45), lift(-0.04)),
  sepia: SEPIA,
  vintage: chain(mix(SEPIA, 0.45), contrast(0.9), lift(0.04, 0.02, -0.01)),
  vivid: chain(saturate(1.5), contrast(1.15)),
  warm: chain(warm(0.6), saturate(1.05)),
};

/** The matrix of one Filter at a strength from 0 to 100. */
export const filterMatrixOf = (
  name: FilterName | null,
  strength: number
): ColorMatrix =>
  name === null
    ? IDENTITY
    : mix(FILTERS[name], Math.min(100, Math.max(0, strength)) / 100);

/** The matrix of the Finetune color sliders. Each slider is 0 at rest. */
export const finetuneMatrixOf = (finetune: Finetune): ColorMatrix => {
  const exposure = 2 ** (finetune.exposure / 100);
  return chain(
    gain(exposure, exposure, exposure),
    warm(finetune.warmth / 100),
    lift((finetune.brightness / 100) * 0.5),
    contrast(1 + (finetune.contrast / 100) * 0.8),
    saturate(1 + finetune.saturation / 100),
    hueRotate((finetune.hue / 100) * 180)
  );
};

/** The one matrix of a state: Finetune, then Filter. */
export const colorMatrixOf = (options: {
  readonly filter: FilterName | null;
  readonly filterStrength: number;
  readonly finetune: Finetune;
}): ColorMatrix =>
  compose(
    finetuneMatrixOf(options.finetune),
    filterMatrixOf(options.filter, options.filterStrength)
  );

const toByte = (value: number): number =>
  Math.min(255, Math.max(0, Math.round(value * 255)));

/** One color through a matrix. Alpha does not change. */
export const applyColorMatrix = (
  matrix: ColorMatrix,
  color: RgbaColor
): RgbaColor => {
  const r = color.r / 255;
  const g = color.g / 255;
  const b = color.b / 255;
  const row = (index: number): number =>
    toByte(
      at(matrix, index) * r +
        at(matrix, index + 1) * g +
        at(matrix, index + 2) * b +
        at(matrix, index + 3)
    );
  return { a: color.a, b: row(8), g: row(4), r: row(0) };
};

/** A color as `#rrggbb`, for a color input. */
export const hexOf = (color: RgbaColor): string =>
  `#${[color.r, color.g, color.b]
    .map((value) => value.toString(16).padStart(2, "0"))
    .join("")}`;

/** A color as a CSS `rgba()` value. */
export const cssOf = (color: RgbaColor): string =>
  `rgba(${color.r}, ${color.g}, ${color.b}, ${Math.round((color.a / 255) * 1000) / 1000})`;

/** One or two hex digits as a channel value. */
const channelOf = (text = "0"): number =>
  Number.parseInt(text.length === 1 ? text + text : text, 16);

/** The opaque color of a `#rrggbb` or `#rgb` value, or `null`. */
export const colorOfHex = (hex: string): RgbaColor | null => {
  const short = /^#?(?<r>[0-9a-f])(?<g>[0-9a-f])(?<b>[0-9a-f])$/iu.exec(hex);
  const long = /^#?(?<r>[0-9a-f]{2})(?<g>[0-9a-f]{2})(?<b>[0-9a-f]{2})$/iu.exec(
    hex
  );
  const groups = long?.groups ?? short?.groups;
  if (groups === undefined) {
    return null;
  }
  return {
    a: 255,
    b: channelOf(groups.b),
    g: channelOf(groups.g),
    r: channelOf(groups.r),
  };
};
