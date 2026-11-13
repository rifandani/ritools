import { DEFAULT_FONT } from "@/features/easel/easel.fonts";
import type { Point } from "@/features/easel/easel.geometry";
import type { Size } from "@/features/easel/easel.presets";
import { BLACK, WHITE } from "@/features/easel/easel.stack";
import type {
  ImageLayer,
  Redaction,
  RgbaColor,
  FigureLayer,
  TextLayer,
  WatermarkLayer,
} from "@/features/easel/easel.stack";

/**
 * The style of the next thing the user adds, and the factories that make an
 * Annotation Layer, a Redaction, or a Watermark Layer from it. Sizes follow
 * the frame, so a new layer looks the same on a small and a large image.
 */

export const RED: RgbaColor = { a: 255, b: 34, g: 51, r: 230 };

export interface Draft {
  readonly align: TextLayer["align"];
  readonly bold: boolean;
  readonly box: RgbaColor | null;
  /** The brush width as a part of the longest frame side. */
  readonly brush: number;
  readonly cover: RgbaColor;
  readonly fill: RgbaColor | null;
  readonly font: string;
  readonly italic: boolean;
  readonly opacity: number;
  readonly outline: RgbaColor | null;
  readonly radius: number;
  readonly strike: boolean;
  readonly stroke: RgbaColor | null;
  /** The stroke width as a part of the longest frame side. */
  readonly strokeWidth: number;
  readonly textColor: RgbaColor;
  /** The text size as a part of the longest frame side. */
  readonly textSize: number;
  readonly underline: boolean;
}

export const DEFAULT_DRAFT: Draft = {
  align: "left",
  bold: false,
  box: null,
  brush: 0.04,
  cover: BLACK,
  fill: null,
  font: DEFAULT_FONT,
  italic: false,
  opacity: 1,
  outline: null,
  radius: 0,
  strike: false,
  stroke: RED,
  strokeWidth: 0.006,
  textColor: WHITE,
  textSize: 0.06,
  underline: false,
};

const longSideOf = (frame: Size): number => Math.max(frame.width, frame.height);

/** A frame-relative size as whole frame pixels, at least `minimum`. */
export const framePixels = (frame: Size, part: number, minimum = 1): number =>
  Math.max(minimum, Math.round(longSideOf(frame) * part));

const placed = (id: string, at: Point, opacity: number) => ({
  hidden: false,
  id,
  locked: false,
  opacity,
  rotation: 0,
  x: at.x,
  y: at.y,
});

export const newTextLayer = (options: {
  readonly at: Point;
  readonly draft: Draft;
  readonly frame: Size;
  readonly id: string;
  readonly text: string;
}): TextLayer => {
  const { draft, frame } = options;
  const size = framePixels(frame, draft.textSize, 8);
  return {
    ...placed(options.id, options.at, draft.opacity),
    align: draft.align,
    bold: draft.bold,
    box: draft.box,
    color: draft.textColor,
    font: draft.font,
    italic: draft.italic,
    kind: "text",
    outline:
      draft.outline === null
        ? null
        : { color: draft.outline, width: Math.max(1, Math.round(size / 16)) },
    size,
    strike: draft.strike,
    text: options.text,
    underline: draft.underline,
    width: Math.round(Math.min(frame.width * 0.8, size * 10)),
  };
};

export const newFigureLayer = (options: {
  readonly box: { readonly height: number; readonly width: number } & Point;
  readonly draft: Draft;
  readonly frame: Size;
  readonly id: string;
  readonly kind: FigureLayer["kind"];
  readonly rotation: number;
}): FigureLayer => {
  const { box, draft, frame, kind } = options;
  const line = kind === "line" || kind === "arrow";
  const strokeWidth = framePixels(frame, draft.strokeWidth, 1);
  return {
    ...placed(options.id, box, draft.opacity),
    // A line has no area, so it always has a stroke.
    fill: line ? null : draft.fill,
    height: line ? strokeWidth : box.height,
    kind,
    radius: kind === "rect" ? draft.radius : 0,
    rotation: options.rotation,
    stroke: line ? (draft.stroke ?? draft.fill ?? RED) : draft.stroke,
    strokeWidth,
    width: box.width,
  };
};

/** An image layer in the middle of the view, at most half the frame wide. */
export const newImageLayer = (options: {
  readonly assetId: string;
  readonly at: Point;
  readonly draft: Draft;
  readonly frame: Size;
  readonly id: string;
  readonly size: Size;
}): ImageLayer => {
  const { frame, size } = options;
  const scale = Math.min(
    1,
    (frame.width * 0.5) / size.width,
    (frame.height * 0.5) / size.height
  );
  return {
    ...placed(options.id, options.at, options.draft.opacity),
    assetId: options.assetId,
    height: Math.max(1, Math.round(size.height * scale)),
    kind: "image",
    width: Math.max(1, Math.round(size.width * scale)),
  };
};

export const newRedaction = (options: {
  readonly color: RgbaColor;
  readonly id: string;
  readonly kind: Redaction["kind"];
  readonly area:
    | {
        readonly box: {
          readonly height: number;
          readonly width: number;
        } & Point;
        readonly form: "ellipse" | "rect";
      }
    | {
        readonly points: readonly number[];
        readonly form: "brush";
        readonly size: number;
      };
}): Redaction => {
  const { area } = options;
  const base = {
    color: options.color,
    id: options.id,
    kind: options.kind,
    rotation: 0,
  };
  return area.form === "brush"
    ? {
        ...base,
        height: 0,
        points: area.points,
        form: "brush",
        size: area.size,
        width: 0,
        x: 0,
        y: 0,
      }
    : {
        ...base,
        height: area.box.height,
        points: [],
        form: area.form,
        size: 0,
        width: area.box.width,
        x: area.box.x,
        y: area.box.y,
      };
};

export const DEFAULT_WATERMARK: WatermarkLayer = {
  anchor: "bottom-right",
  assetId: null,
  color: WHITE,
  font: DEFAULT_FONT,
  kind: "text",
  opacity: 0.5,
  scale: 0.3,
  text: "",
  tiled: false,
};

export const MIN_WATERMARK_SCALE = 0.05;
export const MAX_WATERMARK_SCALE = 1;

/** A short name for a text layer in the layer list. */
export const textExcerptOf = (text: string): string => {
  const line = text.replaceAll(/\s+/gu, " ").trim();
  return line.length > 24 ? `${line.slice(0, 24)}…` : line;
};

/** The tool of the Annotate panel. */
export type AnnotateTool =
  | "arrow"
  | "ellipse"
  | "line"
  | "rect"
  | "select"
  | "text";

/** The tool of the Redact panel. */
export type RedactTool = "brush" | "ellipse" | "rect" | "select";

/** The layer or Redaction the user selected on the canvas. */
export interface Selection {
  readonly band: "annotation" | "redaction";
  readonly id: string;
}
