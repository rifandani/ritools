import {
  clampRect,
  clampStraighten,
  defaultCropOf,
  flipRect,
  frameSizeOf,
  FULL_RECT,
  rotatePoint,
  rotateRect,
  pivotPoint,
} from "@/features/easel/easel.geometry";
import type {
  Geometry,
  Point,
  QuarterSteps,
  Rect,
} from "@/features/easel/easel.geometry";
import { cropPresetOf } from "@/features/easel/easel.presets";
import type { CropPresetId, Size } from "@/features/easel/easel.presets";

/**
 * The Edit Stack (ADR-0041): the ordered set of changes Easel keeps for one
 * File Tab over the unchanged original pixels.
 *
 * This module holds the edit rules. It has no DOM, WebGL, or Fabric code. An
 * `EditState` is plain data, and each change gives a new state. The history
 * keeps at most `MAX_UNDO_STEPS` earlier states.
 */

/* -------------------------------------------------------------------------- */
/* State                                                                       */
/* -------------------------------------------------------------------------- */

export interface RgbaColor {
  readonly a: number;
  readonly b: number;
  readonly g: number;
  readonly r: number;
}

export type Backdrop =
  | { readonly _tag: "Transparent" }
  | { readonly _tag: "Solid"; readonly color: RgbaColor };

export const FINETUNE_KEYS = [
  "brightness",
  "contrast",
  "saturation",
  "hue",
  "warmth",
  "exposure",
  "blur",
  "vignette",
] as const;
export type FinetuneKey = (typeof FINETUNE_KEYS)[number];
export type Finetune = Readonly<Record<FinetuneKey, number>>;

export const FILTER_NAMES = [
  "mono",
  "noir",
  "fade",
  "sepia",
  "vintage",
  "warm",
  "cool",
  "vivid",
  "matte",
  "chrome",
] as const;
export type FilterName = (typeof FILTER_NAMES)[number];

export interface BucketFill {
  readonly color: RgbaColor;
  readonly id: string;
  /** The clicked point, in source pixels. */
  readonly point: Point;
  /** From 0 to 100. */
  readonly tolerance: number;
}

interface LayerBase {
  readonly hidden: boolean;
  readonly id: string;
  readonly locked: boolean;
  /** From 0 to 1. */
  readonly opacity: number;
  /** Degrees, clockwise. */
  readonly rotation: number;
  /** The center, in frame pixels from the frame center. */
  readonly x: number;
  readonly y: number;
}

export interface TextLayer extends LayerBase {
  readonly align: "center" | "left" | "right";
  readonly bold: boolean;
  /** The background box color, or `null` for none. */
  readonly box: RgbaColor | null;
  readonly color: RgbaColor;
  readonly font: string;
  readonly italic: boolean;
  readonly kind: "text";
  readonly outline: {
    readonly color: RgbaColor;
    readonly width: number;
  } | null;
  /** The font size, in frame pixels. */
  readonly size: number;
  readonly strike: boolean;
  readonly text: string;
  readonly underline: boolean;
  /** The wrap width, in frame pixels. */
  readonly width: number;
}

export interface FigureLayer extends LayerBase {
  readonly fill: RgbaColor | null;
  readonly height: number;
  readonly kind: "arrow" | "ellipse" | "line" | "rect";
  readonly radius: number;
  readonly stroke: RgbaColor | null;
  readonly strokeWidth: number;
  readonly width: number;
}

export interface ImageLayer extends LayerBase {
  /** The id of the picture in the File Tab's asset store. */
  readonly assetId: string;
  readonly height: number;
  readonly kind: "image";
  readonly width: number;
}

export type AnnotationLayer = ImageLayer | FigureLayer | TextLayer;

export interface Redaction {
  /** The Cover color. A Mosaic does not use it. */
  readonly color: RgbaColor;
  readonly height: number;
  readonly id: string;
  readonly kind: "cover" | "mosaic";
  /** The brush stroke, as x and y pairs in frame pixels from the center. */
  readonly points: readonly number[];
  readonly rotation: number;
  readonly form: "brush" | "ellipse" | "rect";
  /** The brush width, in frame pixels. */
  readonly size: number;
  readonly width: number;
  readonly x: number;
  readonly y: number;
}

export const WATERMARK_ANCHORS = [
  "top-left",
  "top-right",
  "center",
  "bottom-left",
  "bottom-right",
] as const;
export type WatermarkAnchor = (typeof WATERMARK_ANCHORS)[number];

export interface WatermarkLayer {
  readonly anchor: WatermarkAnchor;
  /** The id of the picture, for an image mark. */
  readonly assetId: string | null;
  readonly color: RgbaColor;
  readonly font: string;
  readonly kind: "image" | "text";
  /** From 0 to 1. */
  readonly opacity: number;
  /** The mark width as a part of the image width, from 0.05 to 1. */
  readonly scale: number;
  readonly text: string;
  readonly tiled: boolean;
}

export interface Resize {
  readonly height: number;
  readonly locked: boolean;
  readonly width: number;
}

export interface EditState extends Geometry {
  readonly backdrop: Backdrop;
  /** The user's crop, normalized to the frame. */
  readonly crop: Rect;
  readonly cropPreset: CropPresetId;
  readonly fills: readonly BucketFill[];
  readonly filter: FilterName | null;
  /** From 0 to 100. */
  readonly filterStrength: number;
  readonly finetune: Finetune;
  /** Annotation Layers, from the back to the front. */
  readonly layers: readonly AnnotationLayer[];
  readonly redactions: readonly Redaction[];
  readonly resize: Resize | null;
  readonly watermark: WatermarkLayer | null;
}

export const NO_FINETUNE: Finetune = {
  blur: 0,
  brightness: 0,
  contrast: 0,
  exposure: 0,
  hue: 0,
  saturation: 0,
  vignette: 0,
  warmth: 0,
};

const TRANSPARENT: Backdrop = { _tag: "Transparent" };
export const WHITE: RgbaColor = { a: 255, b: 255, g: 255, r: 255 };
export const BLACK: RgbaColor = { a: 255, b: 0, g: 0, r: 0 };

/** The state of an image with no change. */
export const ORIGINAL: EditState = {
  backdrop: TRANSPARENT,
  crop: FULL_RECT,
  cropPreset: "custom",
  fills: [],
  filter: null,
  filterStrength: 100,
  finetune: NO_FINETUNE,
  flipH: false,
  flipV: false,
  keepWhole: false,
  layers: [],
  redactions: [],
  resize: null,
  rotate: 0,
  straighten: 0,
  watermark: null,
};

/* -------------------------------------------------------------------------- */
/* Changes                                                                     */
/* -------------------------------------------------------------------------- */

export const PANELS = [
  "crop",
  "finetune",
  "filter",
  "fill",
  "annotate",
  "watermark",
  "redact",
  "resize",
] as const;
export type Panel = (typeof PANELS)[number];

export type LayerMove = "bottom" | "down" | "top" | "up";

/** A partial update of one Annotation Layer. The `kind` and `id` stay. */
export type LayerPatch = Partial<
  Omit<ImageLayer, "id" | "kind"> &
    Omit<FigureLayer, "id" | "kind"> &
    Omit<TextLayer, "id" | "kind">
>;

export type Change =
  | { readonly _tag: "SetCrop"; readonly rect: Rect }
  | {
      readonly _tag: "SetCropPreset";
      readonly preset: CropPresetId;
      readonly source: Size;
    }
  | { readonly _tag: "Rotate"; readonly direction: "left" | "right" }
  | { readonly _tag: "SetStraighten"; readonly angle: number }
  | { readonly _tag: "SetKeepWhole"; readonly value: boolean }
  | { readonly _tag: "Flip"; readonly axis: "horizontal" | "vertical" }
  | {
      readonly _tag: "SetFinetune";
      readonly key: FinetuneKey;
      readonly value: number;
    }
  | {
      readonly _tag: "SetFilter";
      readonly name: FilterName | null;
      /** With a strength, the Filter and its strength are one change. */
      readonly strength?: number;
    }
  | { readonly _tag: "SetFilterStrength"; readonly value: number }
  | { readonly _tag: "SetBackdrop"; readonly backdrop: Backdrop }
  | { readonly _tag: "AddFill"; readonly fill: BucketFill }
  | {
      readonly _tag: "UpdateFill";
      readonly id: string;
      readonly patch: Partial<Omit<BucketFill, "id">>;
    }
  | { readonly _tag: "RemoveFill"; readonly id: string }
  | { readonly _tag: "AddLayer"; readonly layer: AnnotationLayer }
  | {
      readonly _tag: "UpdateLayer";
      readonly id: string;
      readonly patch: LayerPatch;
    }
  | { readonly _tag: "RemoveLayer"; readonly id: string }
  | {
      readonly _tag: "MoveLayer";
      readonly id: string;
      readonly to: LayerMove;
    }
  | {
      readonly _tag: "DuplicateLayer";
      readonly id: string;
      readonly newId: string;
    }
  | { readonly _tag: "AddRedaction"; readonly redaction: Redaction }
  | {
      readonly _tag: "UpdateRedaction";
      readonly id: string;
      readonly patch: Partial<Omit<Redaction, "id">>;
    }
  | { readonly _tag: "RemoveRedaction"; readonly id: string }
  | { readonly _tag: "SetWatermark"; readonly watermark: WatermarkLayer | null }
  | { readonly _tag: "SetResize"; readonly resize: Resize | null }
  | { readonly _tag: "ResetPanel"; readonly panel: Panel }
  | { readonly _tag: "Revert" };

const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, Number.isFinite(value) ? value : 0));

/** The limits of one Finetune slider. Blur starts at 0; the others center on 0. */
export const finetuneLimitsOf = (
  key: FinetuneKey
): { readonly max: number; readonly min: number } =>
  key === "blur" ? { max: 100, min: 0 } : { max: 100, min: -100 };

const sameRect = (left: Rect, right: Rect): boolean =>
  left.x === right.x &&
  left.y === right.y &&
  left.width === right.width &&
  left.height === right.height;

const replaceById = <Item extends { readonly id: string }>(
  items: readonly Item[],
  id: string,
  update: (item: Item) => Item
): readonly Item[] => {
  if (!items.some((item) => item.id === id)) {
    return items;
  }
  return items.map((item) => (item.id === id ? update(item) : item));
};

const withoutId = <Item extends { readonly id: string }>(
  items: readonly Item[],
  id: string
): readonly Item[] =>
  items.some((item) => item.id === id)
    ? items.filter((item) => item.id !== id)
    : items;

const moveLayer = (
  layers: readonly AnnotationLayer[],
  id: string,
  to: LayerMove
): readonly AnnotationLayer[] => {
  const from = layers.findIndex((layer) => layer.id === id);
  const layer = layers[from];
  if (layer === undefined) {
    return layers;
  }
  const last = layers.length - 1;
  const target =
    to === "top"
      ? last
      : to === "bottom"
        ? 0
        : clamp(from + (to === "up" ? 1 : -1), 0, last);
  if (target === from) {
    return layers;
  }
  const rest = layers.filter((entry) => entry.id !== id);
  return [...rest.slice(0, target), layer, ...rest.slice(target)];
};

const normalizeAngle = (degrees: number): number => {
  const turned = ((degrees % 360) + 360) % 360;
  return turned > 180 ? turned - 360 : turned;
};

/** An Annotation Layer or a Redaction after a 90° Rotate of the image. */
const rotatePlaced = <Placed extends Point & { readonly rotation: number }>(
  placed: Placed,
  direction: "left" | "right"
): Placed => ({
  ...placed,
  ...rotatePoint(placed, direction),
  rotation: normalizeAngle(
    placed.rotation + (direction === "right" ? 90 : -90)
  ),
});

const flipPoint = (point: Point, axis: "horizontal" | "vertical"): Point =>
  axis === "horizontal"
    ? { x: -point.x, y: point.y }
    : { x: point.x, y: -point.y };

const mapPoints = (
  points: readonly number[],
  map: (point: Point) => Point
): readonly number[] => {
  const next: number[] = [];
  for (let index = 0; index + 1 < points.length; index += 2) {
    const moved = map({ x: points[index] ?? 0, y: points[index + 1] ?? 0 });
    next.push(moved.x, moved.y);
  }
  return next;
};

/** A Redaction that stays on the content it hides while the image moves. */
const moveRedaction = (
  redaction: Redaction,
  map: (point: Point) => Point,
  rotationOf: (rotation: number) => number
): Redaction => ({
  ...redaction,
  ...map(redaction),
  points: mapPoints(redaction.points, map),
  rotation: normalizeAngle(rotationOf(redaction.rotation)),
});

const geometryPart = (state: EditState): Geometry => ({
  flipH: state.flipH,
  flipV: state.flipV,
  keepWhole: state.keepWhole,
  rotate: state.rotate,
  straighten: state.straighten,
});

/** One change through the reducer, for a Reset that takes steps back. */
const stepBack = (state: EditState, change: Change): EditState =>
  // oxlint-disable-next-line eslint/no-use-before-define -- the reducer and its panel Resets call each other.
  reduce(state, change);

/**
 * The state with no crop, Rotate, Straighten, or flip. It takes each step
 * back as a change, so the Annotation Layers and the Redactions move back
 * with the photo. A Redaction never stays behind on other content.
 */
const resetGeometry = (state: EditState): EditState => {
  let next = stepBack(state, { _tag: "SetStraighten", angle: 0 });
  for (let step = next.rotate; step > 0; step -= 1) {
    next = stepBack(next, { _tag: "Rotate", direction: "left" });
  }
  if (next.flipH) {
    next = stepBack(next, { _tag: "Flip", axis: "horizontal" });
  }
  if (next.flipV) {
    next = stepBack(next, { _tag: "Flip", axis: "vertical" });
  }
  return {
    ...next,
    crop: ORIGINAL.crop,
    cropPreset: ORIGINAL.cropPreset,
    keepWhole: false,
  };
};

const PANEL_RESET: Readonly<Record<Panel, (state: EditState) => EditState>> = {
  annotate: (state) => ({ ...state, layers: ORIGINAL.layers }),
  crop: (state) => resetGeometry(state),
  fill: (state) => ({
    ...state,
    backdrop: ORIGINAL.backdrop,
    fills: ORIGINAL.fills,
  }),
  filter: (state) => ({
    ...state,
    filter: ORIGINAL.filter,
    filterStrength: ORIGINAL.filterStrength,
  }),
  finetune: (state) => ({ ...state, finetune: NO_FINETUNE }),
  redact: (state) => ({ ...state, redactions: ORIGINAL.redactions }),
  resize: (state) => ({ ...state, resize: ORIGINAL.resize }),
  watermark: (state) => ({ ...state, watermark: ORIGINAL.watermark }),
};

/** Whether a panel has a change that its Reset removes. */
export const panelIsChanged = (state: EditState, panel: Panel): boolean => {
  switch (panel) {
    case "annotate": {
      return state.layers.length > 0;
    }
    case "crop": {
      return (
        !sameRect(state.crop, FULL_RECT) ||
        state.cropPreset !== "custom" ||
        state.flipH ||
        state.flipV ||
        state.keepWhole ||
        state.rotate !== 0 ||
        state.straighten !== 0
      );
    }
    case "fill": {
      return state.fills.length > 0 || state.backdrop._tag !== "Transparent";
    }
    case "filter": {
      return state.filter !== null || state.filterStrength !== 100;
    }
    case "finetune": {
      return FINETUNE_KEYS.some((key) => state.finetune[key] !== 0);
    }
    case "redact": {
      return state.redactions.length > 0;
    }
    case "resize": {
      return state.resize !== null;
    }
    default: {
      return state.watermark !== null;
    }
  }
};

/** The longest side of a layer, for the offset of a duplicate. */
const layerExtentOf = (layer: AnnotationLayer): number =>
  layer.kind === "text"
    ? Math.max(layer.width, layer.size)
    : Math.max(layer.width, layer.height);

/**
 * The state after one change. A change that changes nothing returns the same
 * object, so the history can ignore it.
 */
// oxlint-disable-next-line eslint/complexity -- one branch for each change of the Edit Stack.
export const reduce = (state: EditState, change: Change): EditState => {
  switch (change._tag) {
    case "SetCrop": {
      const crop = clampRect(change.rect);
      return sameRect(crop, state.crop) ? state : { ...state, crop };
    }
    case "SetCropPreset": {
      if (change.preset === state.cropPreset) {
        return state;
      }
      const preset = cropPresetOf(change.preset);
      const frame = frameSizeOf(change.source, geometryPart(state));
      return {
        ...state,
        // A free form keeps the current area. A ratio starts from the middle.
        crop:
          preset.ratio === null
            ? state.crop
            : defaultCropOf(frame, preset.ratio),
        cropPreset: preset.id,
        // A social network format sets the export size itself.
        resize: preset.size === null ? state.resize : null,
      };
    }
    case "Rotate": {
      const step = change.direction === "right" ? 1 : 3;
      // SAFETY: a sum modulo 4 is in 0..3.
      const rotate = ((state.rotate + step) % 4) as QuarterSteps;
      const keepsRatio = cropPresetOf(state.cropPreset).ratio === null;
      return {
        ...state,
        crop: rotateRect(state.crop, change.direction),
        // A fixed ratio does not survive a quarter turn.
        cropPreset: keepsRatio ? state.cropPreset : "custom",
        layers: state.layers.map((layer) =>
          rotatePlaced(layer, change.direction)
        ),
        redactions: state.redactions.map((redaction) =>
          moveRedaction(
            redaction,
            (point) => rotatePoint(point, change.direction),
            (rotation) => rotation + (change.direction === "right" ? 90 : -90)
          )
        ),
        resize:
          state.resize === null
            ? null
            : {
                ...state.resize,
                height: state.resize.width,
                width: state.resize.height,
              },
        rotate,
      };
    }
    case "SetStraighten": {
      const straighten = clampStraighten(change.angle);
      if (straighten === state.straighten) {
        return state;
      }
      const delta = straighten - state.straighten;
      return {
        ...state,
        redactions: state.redactions.map((redaction) =>
          moveRedaction(
            redaction,
            (point) => pivotPoint(point, delta),
            (rotation) => rotation + delta
          )
        ),
        straighten,
      };
    }
    case "SetKeepWhole": {
      return change.value === state.keepWhole
        ? state
        : { ...state, keepWhole: change.value };
    }
    case "Flip": {
      // A mirror of the view turns the earlier rotations the other way.
      // SAFETY: (4 − n) % 4 for n in 0..3 is in 0..3.
      const rotate = ((4 - state.rotate) % 4) as QuarterSteps;
      const horizontal = change.axis === "horizontal";
      return {
        ...state,
        crop: flipRect(state.crop, change.axis),
        flipH: horizontal ? !state.flipH : state.flipH,
        flipV: horizontal ? state.flipV : !state.flipV,
        layers: state.layers.map((layer) => ({
          ...layer,
          ...flipPoint(layer, change.axis),
          // A line or an arrow keeps its direction in the mirror. Text
          // stays readable: only its tilt goes the other way.
          rotation: normalizeAngle(
            horizontal && (layer.kind === "line" || layer.kind === "arrow")
              ? 180 - layer.rotation
              : -layer.rotation
          ),
        })),
        redactions: state.redactions.map((redaction) =>
          moveRedaction(
            redaction,
            (point) => flipPoint(point, change.axis),
            (rotation) => -rotation
          )
        ),
        rotate,
        straighten: state.straighten === 0 ? 0 : -state.straighten,
      };
    }
    case "SetFinetune": {
      const limits = finetuneLimitsOf(change.key);
      const value = Math.round(clamp(change.value, limits.min, limits.max));
      return value === state.finetune[change.key]
        ? state
        : { ...state, finetune: { ...state.finetune, [change.key]: value } };
    }
    case "SetFilter": {
      const filterStrength =
        change.strength === undefined
          ? state.filterStrength
          : Math.round(clamp(change.strength, 0, 100));
      return change.name === state.filter &&
        filterStrength === state.filterStrength
        ? state
        : { ...state, filter: change.name, filterStrength };
    }
    case "SetFilterStrength": {
      const filterStrength = Math.round(clamp(change.value, 0, 100));
      return filterStrength === state.filterStrength
        ? state
        : { ...state, filterStrength };
    }
    case "SetBackdrop": {
      return { ...state, backdrop: change.backdrop };
    }
    case "AddFill": {
      return { ...state, fills: [...state.fills, change.fill] };
    }
    case "UpdateFill": {
      const fills = replaceById(state.fills, change.id, (fill) => ({
        ...fill,
        ...change.patch,
      }));
      return fills === state.fills ? state : { ...state, fills };
    }
    case "RemoveFill": {
      const fills = withoutId(state.fills, change.id);
      return fills === state.fills ? state : { ...state, fills };
    }
    case "AddLayer": {
      return { ...state, layers: [...state.layers, change.layer] };
    }
    case "UpdateLayer": {
      const layers = replaceById(
        state.layers,
        change.id,
        // SAFETY: a patch holds only fields of the layer's own kind; the
        // `kind` and `id` are not part of a patch.
        (layer) => ({ ...layer, ...change.patch }) as AnnotationLayer
      );
      return layers === state.layers ? state : { ...state, layers };
    }
    case "RemoveLayer": {
      const layers = withoutId(state.layers, change.id);
      return layers === state.layers ? state : { ...state, layers };
    }
    case "MoveLayer": {
      const layers = moveLayer(state.layers, change.id, change.to);
      return layers === state.layers ? state : { ...state, layers };
    }
    case "DuplicateLayer": {
      const index = state.layers.findIndex((layer) => layer.id === change.id);
      const layer = state.layers[index];
      if (layer === undefined) {
        return state;
      }
      const offset = Math.max(8, Math.round(layerExtentOf(layer) * 0.08));
      const copy: AnnotationLayer = {
        ...layer,
        id: change.newId,
        locked: false,
        x: layer.x + offset,
        y: layer.y + offset,
      };
      return {
        ...state,
        layers: [
          ...state.layers.slice(0, index + 1),
          copy,
          ...state.layers.slice(index + 1),
        ],
      };
    }
    case "AddRedaction": {
      return { ...state, redactions: [...state.redactions, change.redaction] };
    }
    case "UpdateRedaction": {
      const redactions = replaceById(
        state.redactions,
        change.id,
        (redaction) => ({ ...redaction, ...change.patch })
      );
      return redactions === state.redactions ? state : { ...state, redactions };
    }
    case "RemoveRedaction": {
      const redactions = withoutId(state.redactions, change.id);
      return redactions === state.redactions ? state : { ...state, redactions };
    }
    case "SetWatermark": {
      return change.watermark === state.watermark
        ? state
        : { ...state, watermark: change.watermark };
    }
    case "SetResize": {
      return change.resize === state.resize
        ? state
        : { ...state, resize: change.resize };
    }
    case "ResetPanel": {
      return panelIsChanged(state, change.panel)
        ? PANEL_RESET[change.panel](state)
        : state;
    }
    default: {
      return state === ORIGINAL ? state : ORIGINAL;
    }
  }
};

/* -------------------------------------------------------------------------- */
/* History                                                                     */
/* -------------------------------------------------------------------------- */

export const MAX_UNDO_STEPS = 100;

export interface EditStack {
  readonly future: readonly EditState[];
  /**
   * The gesture that made the present state, or `null`. Changes of one
   * gesture (one slider drag, one layer move) are one undo step.
   */
  readonly gesture: string | null;
  readonly past: readonly EditState[];
  readonly present: EditState;
}

export const EMPTY_STACK: EditStack = {
  future: [],
  gesture: null,
  past: [],
  present: ORIGINAL,
};

/**
 * Applies one change. With a `gesture`, the change joins the earlier changes
 * of the same gesture in one undo step.
 */
export const applyChange = (
  stack: EditStack,
  change: Change,
  gesture: string | null = null
): EditStack => {
  const present = reduce(stack.present, change);
  if (present === stack.present) {
    return stack;
  }
  if (gesture !== null && gesture === stack.gesture) {
    return { ...stack, future: [], present };
  }
  return {
    future: [],
    gesture,
    past: [...stack.past, stack.present].slice(-MAX_UNDO_STEPS),
    present,
  };
};

/** Ends the current gesture, so the next change is a new undo step. */
export const endGesture = (stack: EditStack): EditStack =>
  stack.gesture === null ? stack : { ...stack, gesture: null };

export const canUndo = (stack: EditStack): boolean => stack.past.length > 0;
export const canRedo = (stack: EditStack): boolean => stack.future.length > 0;

export const undo = (stack: EditStack): EditStack => {
  const previous = stack.past.at(-1);
  if (previous === undefined) {
    return stack;
  }
  return {
    future: [stack.present, ...stack.future],
    gesture: null,
    past: stack.past.slice(0, -1),
    present: previous,
  };
};

export const redo = (stack: EditStack): EditStack => {
  const [next, ...future] = stack.future;
  if (next === undefined) {
    return stack;
  }
  return {
    future,
    gesture: null,
    past: [...stack.past, stack.present],
    present: next,
  };
};
