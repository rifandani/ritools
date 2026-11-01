/* oxlint-disable eslint/no-use-before-define -- the blur helper reads better after the public Feather function. */
import type {
  BrushOperation,
  Matte,
  MatteId,
  MatteOperation,
  MatteMode,
  Pixel,
  RasterImage,
  WandOperation,
} from "@/features/unmask/unmask.engine";

/**
 * The pure Matte operations the engine seam promises.
 *
 * `refine` is deterministic: the same source, Matte, and operation list give
 * the same bytes. Nothing here reads a clock, a random value, or the DOM.
 */

const MAX_TOLERANCE = 100;
const MAX_BRUSH_SIZE = 200;
const MIN_BRUSH_SIZE = 1;
/** The largest sRGB distance the Wand can reach: sqrt(3) * 255. */
const MAX_RGB_DISTANCE = 441.6729559300637;
/** A wand region edge is hard; only the Brush paints a soft edge. */
const BRUSH_CORE = 0.7;

export const matteLengthOf = (width: number, height: number) => width * height;

export const makeMatteId = (seed: number): MatteId =>
  // SAFETY: the template always yields a non-empty string; MatteId is opaque.
  `matte-${seed}` as MatteId;

export const createMatte = (
  matteId: MatteId,
  width: number,
  height: number,
  alpha: Uint8Array
): Matte => {
  if (!Number.isSafeInteger(width) || width <= 0) {
    throw new Error("Matte width must be a positive integer");
  }
  if (!Number.isSafeInteger(height) || height <= 0) {
    throw new Error("Matte height must be a positive integer");
  }
  if (alpha.length !== matteLengthOf(width, height)) {
    throw new Error("Matte length does not match its size");
  }
  return { alpha, height, matteId, width };
};

/** A stable Matte from the source size: a centred, soft-edged oval. */
export const fakeMatteBytes = (width: number, height: number): Uint8Array => {
  const alpha = new Uint8Array(matteLengthOf(width, height));
  const centerX = (width - 1) / 2;
  const centerY = (height - 1) / 2;
  const radiusX = Math.max(1, width * 0.38);
  const radiusY = Math.max(1, height * 0.42);
  // An edge of two percent of the short side keeps the fake visibly soft
  // without becoming a blur in the preview.
  const edge = Math.max(1, Math.min(width, height) * 0.02);
  for (let y = 0; y < height; y += 1) {
    const dy = (y - centerY) / radiusY;
    for (let x = 0; x < width; x += 1) {
      const dx = (x - centerX) / radiusX;
      const distance = Math.hypot(dx, dy);
      // The two radii are not equal, so the distance is normalized again by
      // the local gradient of the oval. The edge width is in pixels.
      const normalized = (1 - distance) * Math.min(radiusX, radiusY);
      const value = Math.round(
        Math.max(0, Math.min(1, normalized / edge + 0.5)) * 255
      );
      alpha[y * width + x] = value;
    }
  }
  return alpha;
};

export const fakeMatte = (
  matteId: MatteId,
  width: number,
  height: number
): Matte => createMatte(matteId, width, height, fakeMatteBytes(width, height));

/** Whether the input alpha is meaningful enough to become the Matte. */
export const meaningfulAlpha = (alpha: Uint8Array): boolean => {
  if (alpha.length === 0) {
    return false;
  }
  let transparent = 0;
  for (const value of alpha) {
    if (value < 255) {
      transparent += 1;
    }
  }
  return transparent / alpha.length >= 0.001;
};

export const anyTransparent = (alpha: Uint8Array): boolean => {
  for (const value of alpha) {
    if (value < 255) {
      return true;
    }
  }
  return false;
};

const alphaOf = (alpha: Uint8Array, index: number): number => alpha[index] ?? 0;

const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

const clampPixel = (point: Pixel, width: number, height: number): Pixel => ({
  x: clamp(Math.round(point.x), 0, Math.max(0, width - 1)),
  y: clamp(Math.round(point.y), 0, Math.max(0, height - 1)),
});

const sampleRgb = (
  rgba: Uint8Array,
  index: number
): readonly [number, number, number] => [
  rgba[index] ?? 0,
  rgba[index + 1] ?? 0,
  rgba[index + 2] ?? 0,
];

const rgbDistanceSquared = (
  a: readonly [number, number, number],
  b: readonly [number, number, number]
): number => {
  const dr = a[0] - b[0];
  const dg = a[1] - b[1];
  const db = a[2] - b[2];
  return dr * dr + dg * dg + db * db;
};

/** The matte index for a source pixel, or `-1` when it falls outside. */
const matteIndexFor = (
  point: Pixel,
  sourceWidth: number,
  sourceHeight: number,
  matteWidth: number,
  matteHeight: number
): number => {
  if (
    point.x < 0 ||
    point.y < 0 ||
    point.x >= sourceWidth ||
    point.y >= sourceHeight
  ) {
    return -1;
  }
  const x = Math.min(
    matteWidth - 1,
    Math.floor((point.x * matteWidth) / sourceWidth)
  );
  const y = Math.min(
    matteHeight - 1,
    Math.floor((point.y * matteHeight) / sourceHeight)
  );
  return y * matteWidth + x;
};

const writeWand = (
  operation: WandOperation,
  source: RasterImage,
  width: number,
  height: number,
  alpha: Uint8Array
): void => {
  const seed = clampPixel(operation.seed, source.width, source.height);
  const seedIndex = (seed.y * source.width + seed.x) * 4;
  const seedColour = sampleRgb(source.rgba, seedIndex);
  const tolerance = clamp(operation.tolerance, 0, MAX_TOLERANCE);
  const threshold = (tolerance / MAX_TOLERANCE) * MAX_RGB_DISTANCE;
  const thresholdSquared = threshold * threshold;
  const matches = (x: number, y: number): boolean => {
    if (tolerance >= MAX_TOLERANCE) {
      return true;
    }
    const index = (y * source.width + x) * 4;
    return (
      rgbDistanceSquared(sampleRgb(source.rgba, index), seedColour) <=
      thresholdSquared
    );
  };

  const visited = new Uint8Array(matteLengthOf(width, height));
  const stack = new Int32Array(matteLengthOf(width, height));
  let top = 0;
  const start = matteIndexFor(seed, source.width, source.height, width, height);
  if (start < 0) {
    return;
  }
  stack[top] = start;
  top += 1;
  const target = operation.mode === "restore" ? 255 : 0;
  const neighbours: readonly (readonly [number, number])[] =
    operation.connectivity === 8
      ? [
          [-1, 0],
          [1, 0],
          [0, -1],
          [0, 1],
          [-1, -1],
          [1, -1],
          [-1, 1],
          [1, 1],
        ]
      : [
          [-1, 0],
          [1, 0],
          [0, -1],
          [0, 1],
        ];

  while (top > 0) {
    top -= 1;
    const index = stack[top] ?? 0;
    if (visited[index] === 1) {
      continue;
    }
    visited[index] = 1;
    const x = index % width;
    const y = Math.floor(index / width);
    // The source and the preview share an aspect ratio, so one scaled sample
    // stands for the whole matte cell.
    const sourceX = Math.min(
      source.width - 1,
      Math.floor(((x + 0.5) * source.width) / width)
    );
    const sourceY = Math.min(
      source.height - 1,
      Math.floor(((y + 0.5) * source.height) / height)
    );
    if (!matches(sourceX, sourceY)) {
      continue;
    }
    alpha[index] = target;
    for (const [dx, dy] of neighbours) {
      const nextX = x + dx;
      const nextY = y + dy;
      if (nextX < 0 || nextY < 0 || nextX >= width || nextY >= height) {
        continue;
      }
      const next = nextY * width + nextX;
      if (visited[next] === 0) {
        stack[top] = next;
        top += 1;
      }
    }
  }
};

const smoothstep = (value: number): number => {
  const t = clamp(value, 0, 1);
  return t * t * (3 - 2 * t);
};

const writePoint = (
  mode: MatteMode,
  radius: number,
  point: Pixel,
  width: number,
  height: number,
  alpha: Uint8Array
): void => {
  const centerX = point.x;
  const centerY = point.y;
  const target = mode === "restore" ? 255 : 0;
  // A one-pixel Brush must paint the pixel it names: its radius is smaller
  // than the distance from the point to any pixel centre.
  if (radius <= 1) {
    const x = Math.min(width - 1, Math.max(0, Math.floor(centerX)));
    const y = Math.min(height - 1, Math.max(0, Math.floor(centerY)));
    const index = y * width + x;
    alpha[index] = target;
    return;
  }
  const core = radius * BRUSH_CORE;
  const minX = Math.max(0, Math.floor(centerX - radius));
  const maxX = Math.min(width - 1, Math.ceil(centerX + radius));
  const minY = Math.max(0, Math.floor(centerY - radius));
  const maxY = Math.min(height - 1, Math.ceil(centerY + radius));
  for (let y = minY; y <= maxY; y += 1) {
    const dy = y + 0.5 - centerY;
    for (let x = minX; x <= maxX; x += 1) {
      const dx = x + 0.5 - centerX;
      const distance = Math.hypot(dx, dy);
      if (distance >= radius) {
        continue;
      }
      const weight =
        distance <= core
          ? 1
          : smoothstep((radius - distance) / (radius - core));
      if (weight <= 0) {
        continue;
      }
      const index = y * width + x;
      const current = alphaOf(alpha, index);
      const next = current + (target - current) * weight;
      alpha[index] = clamp(Math.round(next), 0, 255);
    }
  }
};

const writeBrush = (
  operation: BrushOperation,
  source: RasterImage,
  width: number,
  height: number,
  alpha: Uint8Array
): void => {
  const scale = width / source.width;
  const size = clamp(operation.size, MIN_BRUSH_SIZE, MAX_BRUSH_SIZE);
  const radius = (size / 2) * scale;
  if (operation.points.length === 0 || radius <= 0) {
    return;
  }
  const points = operation.points.map((point) =>
    clampPixel(
      {
        x: point.x * scale,
        y: point.y * (height / source.height),
      },
      width,
      height
    )
  );
  const [first] = points;
  if (first === undefined) {
    return;
  }
  writePoint(operation.mode, radius, first, width, height, alpha);
  let previous = first;
  for (const point of points.slice(1)) {
    const distance = Math.hypot(point.x - previous.x, point.y - previous.y);
    // One stamp per source pixel keeps a fast drag continuous.
    const steps = Math.max(1, Math.ceil(distance));
    for (let step = 1; step <= steps; step += 1) {
      const t = step / steps;
      writePoint(
        operation.mode,
        radius,
        {
          x: previous.x + (point.x - previous.x) * t,
          y: previous.y + (point.y - previous.y) * t,
        },
        width,
        height,
        alpha
      );
    }
    previous = point;
  }
};

/** Replays the whole operation log from the input Matte. */
export const refineMatte = (request: {
  readonly source: RasterImage;
  readonly matte: Matte;
  readonly operations: readonly MatteOperation[];
}): Matte => {
  const { matte, operations, source } = request;
  if (
    source.width <= 0 ||
    source.height <= 0 ||
    matte.width <= 0 ||
    matte.height <= 0
  ) {
    throw new Error("The source and the Matte must be non-empty");
  }
  if (
    Math.abs(source.width / source.height - matte.width / matte.height) > 0.001
  ) {
    throw new Error("The source and the Matte must share an aspect ratio");
  }
  const alpha = Uint8Array.from(matte.alpha);
  for (const operation of operations) {
    if (operation._tag === "Wand") {
      writeWand(operation, source, matte.width, matte.height, alpha);
    } else {
      writeBrush(operation, source, matte.width, matte.height, alpha);
    }
  }
  return { ...matte, alpha };
};

/**
 * A three-pass box blur of the alpha channel. Three boxes approximate the
 * named Gaussian closely enough for the visible edge, and the cost stays
 * linear so a 26 MP export does not stall the device.
 */
export const featherMatte = (matte: Matte, feather: number): Matte => {
  const { width, height } = matte;
  const amount = clamp(feather, 0, 50);
  if (amount === 0) {
    return matte;
  }
  const radius = Math.max(1, Math.round(amount / 2.56));
  let current = Uint8Array.from(matte.alpha);
  let next = new Uint8Array(current.length);
  for (let pass = 0; pass < 3; pass += 1) {
    boxPass(current, next, width, height, radius);
    const swap = current;
    current = next;
    next = swap;
  }
  return { ...matte, alpha: current };
};

const boxPass = (
  input: Uint8Array,
  output: Uint8Array,
  width: number,
  height: number,
  radius: number
): void => {
  const window = radius * 2 + 1;
  const rows = new Int32Array(input.length);
  // Horizontal pass.
  for (let y = 0; y < height; y += 1) {
    const row = y * width;
    let sum = 0;
    for (let x = -radius; x <= radius; x += 1) {
      sum += input[row + clamp(x, 0, width - 1)] ?? 0;
    }
    for (let x = 0; x < width; x += 1) {
      rows[row + x] = Math.round(sum / window);
      const out = x - radius;
      const into = x + radius + 1;
      sum -= input[row + clamp(out, 0, width - 1)] ?? 0;
      sum += input[row + clamp(into, 0, width - 1)] ?? 0;
    }
  }
  // Vertical pass.
  for (let x = 0; x < width; x += 1) {
    let sum = 0;
    for (let y = -radius; y <= radius; y += 1) {
      sum += rows[clamp(y, 0, height - 1) * width + x] ?? 0;
    }
    for (let y = 0; y < height; y += 1) {
      output[y * width + x] = Math.round(sum / window);
      const out = y - radius;
      const into = y + radius + 1;
      sum -= rows[clamp(out, 0, height - 1) * width + x] ?? 0;
      sum += rows[clamp(into, 0, height - 1) * width + x] ?? 0;
    }
  }
};

/** Downscales a Matte by averaging each source cell. */
export const scaleMatte = (
  matte: Matte,
  width: number,
  height: number,
  matteId: MatteId = matte.matteId
): Matte => {
  if (width === matte.width && height === matte.height) {
    return { ...matte, matteId };
  }
  const alpha = new Uint8Array(matteLengthOf(width, height));
  const xRatio = matte.width / width;
  const yRatio = matte.height / height;
  for (let y = 0; y < height; y += 1) {
    const startY = Math.floor(y * yRatio);
    const endY = Math.max(startY + 1, Math.floor((y + 1) * yRatio));
    for (let x = 0; x < width; x += 1) {
      const startX = Math.floor(x * xRatio);
      const endX = Math.max(startX + 1, Math.floor((x + 1) * xRatio));
      let sum = 0;
      let count = 0;
      for (let sy = startY; sy < endY; sy += 1) {
        for (let sx = startX; sx < endX; sx += 1) {
          sum += matte.alpha[sy * matte.width + sx] ?? 0;
          count += 1;
        }
      }
      alpha[y * width + x] = count === 0 ? 0 : Math.round(sum / count);
    }
  }
  return { alpha, height, matteId, width };
};
