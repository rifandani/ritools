/* oxlint-disable anti-slop/no-unknown-parameters -- Fabric events carry loosely typed targets. */
import type * as Fabric from "fabric";

import { loadLibrary } from "@/core/libs/library-load";
import { cssOf } from "@/features/easel/easel.color";
import {
  drawWatermark,
  paintRedactionArea,
} from "@/features/easel/easel.draw.browser";
import { boxBetween, segmentBetween } from "@/features/easel/easel.geometry";
import type { Matrix, Point, Rect } from "@/features/easel/easel.geometry";
import type { RenderPlan } from "@/features/easel/easel.plan";
import type { Size } from "@/features/easel/easel.presets";
import type {
  AnnotationLayer,
  Change,
  EditState,
  LayerPatch,
  Redaction,
  FigureLayer,
  WatermarkLayer,
} from "@/features/easel/easel.stack";

/**
 * The Layer adapter (ADR-0041): it wraps Fabric.js. Fabric holds the
 * Annotation Layers, the Redactions, and the Watermark Layer as objects, with
 * handles, inline text editing, and z-order inside the fixed bands.
 *
 * The Edit Stack is the one source of truth. `sync` makes the Fabric objects
 * match a state, and a user action on the canvas comes back as a change. Undo
 * states never come from Fabric.
 *
 * Scene coordinates are frame pixels from the frame center, the same as the
 * Edit Stack uses.
 */

type FabricModule = typeof Fabric;

const loadFabric = (): Promise<FabricModule> =>
  loadLibrary("Fabric.js", () => import("fabric"));

export type FigureKind = FigureLayer["kind"];

export type LayerTool =
  | { readonly kind: "none" }
  | { readonly kind: "select" }
  | { readonly kind: "text" }
  | { readonly kind: "figure"; readonly form: FigureKind }
  | {
      readonly kind: "redact";
      readonly form: Redaction["form"];
      /** The brush width, in frame pixels. */
      readonly size: number;
    };

export type LayerBand = "annotation" | "redaction";

/** What the user drew with a tool. The editor turns it into a change. */
export type Drawn =
  | { readonly kind: "text"; readonly at: Point }
  | {
      readonly kind: "figure";
      readonly form: FigureKind;
      readonly box: { readonly height: number; readonly width: number } & Point;
      readonly rotation: number;
    }
  | {
      readonly kind: "redact";
      readonly form: "ellipse" | "rect";
      readonly box: { readonly height: number; readonly width: number } & Point;
    }
  | {
      readonly kind: "redact";
      readonly form: "brush";
      readonly points: readonly number[];
      readonly size: number;
    };

export interface LayerHost {
  readonly assetOf: (id: string) => CanvasImageSource | null;
  readonly onChange: (change: Change) => void;
  readonly onDrawn: (drawn: Drawn) => void;
  readonly onSelect: (
    selection: { readonly band: LayerBand; readonly id: string } | null
  ) => void;
}

export interface LayerView {
  /** The crop the view shows, in frame pixels from the frame center. */
  readonly clip: Rect | null;
  readonly cssSize: Size;
  /** From a frame point (origin at the frame center) to a CSS pixel. */
  readonly frameToCss: Matrix;
}

export interface LayerAdapter {
  readonly dispose: () => void;
  readonly editText: (id: string) => void;
  /** Whether the user is typing in a text layer. */
  readonly isEditingText: () => boolean;
  readonly select: (
    selection: { readonly band: LayerBand; readonly id: string } | null
  ) => void;
  /**
   * Sets the picture a Mosaic shows in the live view: the whole frame as
   * blocks, or `null`.
   */
  readonly setMosaicBase: (base: CanvasImageSource | null) => void;
  readonly setMode: (band: LayerBand | null, tool: LayerTool) => void;
  readonly setView: (view: LayerView) => void;
  readonly sync: (state: EditState, plan: RenderPlan) => void;
}

const TRANSPARENT = "rgba(0,0,0,0)";
/** The longest side of the Mosaic and Watermark pictures of the live view. */
const RASTER_SIDE = 1536;
const MIN_DRAW = 4;

const arrowPathOf = (length: number, strokeWidth: number): string => {
  const head = Math.min(length * 0.6, Math.max(12, strokeWidth * 4));
  const half = head * 0.6;
  return `M 0 0 L ${length} 0 M ${length - head} ${-half} L ${length} 0 L ${length - head} ${half}`;
};

/** The Fabric object of one Annotation Layer. */
const annotationObjectOf = (
  fabric: FabricModule,
  layer: AnnotationLayer,
  assetOf: (id: string) => CanvasImageSource | null
): Fabric.FabricObject | null => {
  const common = {
    angle: layer.rotation,
    left: layer.x,
    opacity: layer.opacity,
    originX: "center",
    originY: "center",
    top: layer.y,
    visible: !layer.hidden,
  } as const;
  if (layer.kind === "text") {
    return new fabric.Textbox(layer.text, {
      ...common,
      backgroundColor: layer.box === null ? "" : cssOf(layer.box),
      fill: cssOf(layer.color),
      fontFamily: `"${layer.font}", sans-serif`,
      fontSize: layer.size,
      fontStyle: layer.italic ? "italic" : "normal",
      fontWeight: layer.bold ? "bold" : "normal",
      linethrough: layer.strike,
      paintFirst: "stroke",
      stroke: layer.outline === null ? null : cssOf(layer.outline.color),
      strokeWidth: layer.outline === null ? 0 : layer.outline.width,
      textAlign: layer.align,
      underline: layer.underline,
      width: layer.width,
    });
  }
  if (layer.kind === "image") {
    const asset = assetOf(layer.assetId);
    if (asset === null) {
      return null;
    }
    // SAFETY: Fabric draws every CanvasImageSource; its type names fewer.
    const image = new fabric.FabricImage(asset as HTMLCanvasElement, common);
    image.set({
      scaleX: layer.width / Math.max(1, image.width),
      scaleY: layer.height / Math.max(1, image.height),
    });
    return image;
  }
  const paint = {
    ...common,
    fill: layer.fill === null ? TRANSPARENT : cssOf(layer.fill),
    stroke: layer.stroke === null ? null : cssOf(layer.stroke),
    strokeUniform: true,
    strokeWidth: layer.stroke === null ? 0 : layer.strokeWidth,
  };
  if (layer.kind === "rect") {
    return new fabric.Rect({
      ...paint,
      height: layer.height,
      rx: layer.radius,
      ry: layer.radius,
      width: layer.width,
    });
  }
  if (layer.kind === "ellipse") {
    return new fabric.Ellipse({
      ...paint,
      rx: layer.width / 2,
      ry: layer.height / 2,
    });
  }
  const line = {
    ...paint,
    fill: TRANSPARENT,
    stroke: cssOf(layer.stroke ?? layer.fill ?? { a: 255, b: 0, g: 0, r: 0 }),
    strokeLineCap: "round",
    strokeLineJoin: "round",
    strokeWidth: Math.max(1, layer.strokeWidth),
  } as const;
  if (layer.kind === "line") {
    return new fabric.Line([-layer.width / 2, 0, layer.width / 2, 0], line);
  }
  return new fabric.Path(arrowPathOf(layer.width, line.strokeWidth), line);
};

/** The change of an Annotation Layer after the user moved its handles. */
const annotationPatchOf = (
  object: Fabric.FabricObject,
  layer: AnnotationLayer
): LayerPatch => {
  const center = object.getCenterPoint();
  const scaleX = Math.abs(object.scaleX);
  const scaleY = Math.abs(object.scaleY);
  const placed = { rotation: object.angle, x: center.x, y: center.y };
  if (layer.kind === "text") {
    return {
      ...placed,
      size: Math.max(4, layer.size * scaleY),
      width: Math.max(8, object.width * scaleX),
    };
  }
  if (layer.kind === "image") {
    return {
      ...placed,
      height: Math.max(1, object.height * scaleY),
      width: Math.max(1, object.width * scaleX),
    };
  }
  if (layer.kind === "line" || layer.kind === "arrow") {
    return { ...placed, width: Math.max(1, layer.width * scaleX) };
  }
  return {
    ...placed,
    height: Math.max(1, layer.height * scaleY),
    width: Math.max(1, layer.width * scaleX),
  };
};

const redactionPatchOf = (
  object: Fabric.FabricObject,
  redaction: Redaction
): Partial<Redaction> => {
  const center = object.getCenterPoint();
  return {
    height: Math.max(1, redaction.height * Math.abs(object.scaleY)),
    rotation: object.angle,
    width: Math.max(1, redaction.width * Math.abs(object.scaleX)),
    x: center.x,
    y: center.y,
  };
};

const redactionObjectOf = (
  fabric: FabricModule,
  redaction: Redaction
): Fabric.FabricObject => {
  // A Mosaic object is clear: the Mosaic picture under it shows the blocks.
  const paint =
    redaction.kind === "cover" ? cssOf(redaction.color) : TRANSPARENT;
  if (redaction.form === "brush") {
    const points: Point[] = [];
    for (let index = 0; index + 1 < redaction.points.length; index += 2) {
      points.push({
        x: redaction.points[index] ?? 0,
        y: redaction.points[index + 1] ?? 0,
      });
    }
    if (points.length === 1) {
      const [only] = points;
      points.push({ x: (only?.x ?? 0) + 0.01, y: only?.y ?? 0 });
    }
    return new fabric.Polyline(points, {
      fill: TRANSPARENT,
      hasControls: false,
      lockMovementX: true,
      lockMovementY: true,
      stroke: paint,
      strokeLineCap: "round",
      strokeLineJoin: "round",
      strokeWidth: Math.max(1, redaction.size),
    });
  }
  const common = {
    angle: redaction.rotation,
    fill: paint,
    left: redaction.x,
    originX: "center",
    originY: "center",
    strokeWidth: 0,
    top: redaction.y,
  } as const;
  return redaction.form === "ellipse"
    ? new fabric.Ellipse({
        ...common,
        rx: redaction.width / 2,
        ry: redaction.height / 2,
      })
    : new fabric.Rect({
        ...common,
        height: redaction.height,
        width: redaction.width,
      });
};

interface Entry<Data> {
  readonly data: Data;
  readonly object: Fabric.FabricObject;
}

/**
 * Draws the Annotation Layers of a state on a new canvas of the export size.
 * The export uses it, so it does not depend on the live canvas.
 */
export const renderAnnotations = async (options: {
  readonly assetOf: (id: string) => CanvasImageSource | null;
  readonly plan: RenderPlan;
  readonly size: Size;
  readonly state: EditState;
}): Promise<HTMLCanvasElement | null> => {
  const { assetOf, plan, size, state } = options;
  const visible = state.layers.filter((layer) => !layer.hidden);
  if (visible.length === 0) {
    return null;
  }
  const fabric = await loadFabric();
  const canvas = new fabric.StaticCanvas(undefined, {
    enableRetinaScaling: false,
    height: size.height,
    renderOnAddRemove: false,
    width: size.width,
  });
  const scaleX = size.width / plan.crop.width;
  const scaleY = size.height / plan.crop.height;
  canvas.setViewportTransform([
    scaleX,
    0,
    0,
    scaleY,
    (plan.frame.width / 2 - plan.crop.x) * scaleX,
    (plan.frame.height / 2 - plan.crop.y) * scaleY,
  ]);
  for (const layer of visible) {
    const object = annotationObjectOf(fabric, layer, assetOf);
    if (object !== null) {
      object.objectCaching = false;
      canvas.add(object);
    }
  }
  canvas.renderAll();
  const copy = document.createElement("canvas");
  copy.width = size.width;
  copy.height = size.height;
  copy.getContext("2d")?.drawImage(canvas.getElement(), 0, 0);
  await canvas.dispose();
  return copy;
};

/** Makes the adapter on one canvas element. Fabric loads on this call. */
export const createLayerAdapter = async (
  element: HTMLCanvasElement,
  host: LayerHost
): Promise<LayerAdapter> => {
  const fabric = await loadFabric();
  const canvas = new fabric.Canvas(element, {
    preserveObjectStacking: true,
    selection: false,
    stopContextMenu: true,
  });
  // The printed look of the app: square handles in ink, no rounded corners.
  fabric.InteractiveFabricObject.ownDefaults = {
    ...fabric.InteractiveFabricObject.ownDefaults,
    borderColor: "#e63322",
    cornerColor: "#ffffff",
    cornerSize: 12,
    cornerStrokeColor: "#111111",
    cornerStyle: "rect",
    touchCornerSize: 32,
    transparentCorners: false,
  };
  const { controls } = new fabric.Rect();
  const rotationControl = controls.mtr;
  if (rotationControl) {
    controls.mtr = new fabric.Control({
      ...rotationControl,
      sizeX: 18,
      sizeY: 18,
      touchSizeX: 32,
      touchSizeY: 32,
      render(ctx, left, top, styleOverride, object) {
        rotationControl.render(ctx, left, top, styleOverride, object);
        ctx.save();
        ctx.translate(left, top);
        ctx.strokeStyle = "#0b0b0b";
        ctx.lineWidth = 1.4;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.beginPath();
        ctx.arc(0, 0, 3.5, Math.PI * 0.35, Math.PI * 1.9);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(2.7, 2.2);
        ctx.lineTo(4.2, 2.6);
        ctx.lineTo(3.8, 1.1);
        ctx.stroke();
        ctx.restore();
      },
    });
  }
  fabric.InteractiveFabricObject.ownDefaults = {
    ...fabric.InteractiveFabricObject.ownDefaults,
    controls,
  };

  const annotations = new Map<string, Entry<AnnotationLayer>>();
  const redactions = new Map<string, Entry<Redaction>>();
  const idOf = new WeakMap<
    Fabric.FabricObject,
    { readonly band: LayerBand; readonly id: string }
  >();
  let state: EditState | null = null;
  let plan: RenderPlan | null = null;
  let band: LayerBand | null = null;
  let tool: LayerTool = { kind: "none" };
  let mosaicBase: CanvasImageSource | null = null;
  let disposed = false;

  /* ---------------------------- raster pictures --------------------------- */

  const rasterOf = () => {
    const raster = document.createElement("canvas");
    raster.width = 1;
    raster.height = 1;
    const image = new fabric.FabricImage(raster, {
      evented: false,
      objectCaching: false,
      originX: "center",
      originY: "center",
      selectable: false,
      visible: false,
    });
    return { canvas: raster, image };
  };
  const mosaic = rasterOf();
  const mark = rasterOf();
  canvas.add(mosaic.image, mark.image);

  /** Sizes a raster picture to cover `area` and returns its context. */
  const prepareRaster = (
    raster: ReturnType<typeof rasterOf>,
    area: Rect
  ): CanvasRenderingContext2D | null => {
    const scale = Math.min(1, RASTER_SIDE / Math.max(area.width, area.height));
    const width = Math.max(1, Math.round(area.width * scale));
    const height = Math.max(1, Math.round(area.height * scale));
    raster.canvas.width = width;
    raster.canvas.height = height;
    raster.image.set({
      height,
      left: area.x + area.width / 2,
      scaleX: area.width / width,
      scaleY: area.height / height,
      top: area.y + area.height / 2,
      width,
    });
    raster.image.setCoords();
    const context = raster.canvas.getContext("2d");
    context?.setTransform(
      width / area.width,
      0,
      0,
      height / area.height,
      (-area.x * width) / area.width,
      (-area.y * height) / area.height
    );
    return context;
  };

  const paintMosaic = (items: readonly Redaction[]): void => {
    const mosaics = items.filter((item) => item.kind === "mosaic");
    if (plan === null || mosaicBase === null || mosaics.length === 0) {
      mosaic.image.set({ visible: false });
      return;
    }
    const frame: Rect = {
      height: plan.frame.height,
      width: plan.frame.width,
      x: -plan.frame.width / 2,
      y: -plan.frame.height / 2,
    };
    const context = prepareRaster(mosaic, frame);
    if (context === null) {
      return;
    }
    context.fillStyle = "#fff";
    context.strokeStyle = "#fff";
    for (const item of mosaics) {
      paintRedactionArea(context, item);
    }
    // Keep the blocks only where a Mosaic is.
    context.globalCompositeOperation = "source-in";
    context.imageSmoothingEnabled = false;
    context.drawImage(mosaicBase, frame.x, frame.y, frame.width, frame.height);
    context.globalCompositeOperation = "source-over";
    mosaic.image.set({ dirty: true, visible: true });
  };

  let markKey: WatermarkLayer | null = null;
  let markArea = "";
  const paintWatermark = (watermark: WatermarkLayer | null): void => {
    if (plan === null || watermark === null) {
      mark.image.set({ visible: false });
      markKey = null;
      return;
    }
    const area: Rect = {
      height: plan.crop.height,
      width: plan.crop.width,
      x: plan.crop.x - plan.frame.width / 2,
      y: plan.crop.y - plan.frame.height / 2,
    };
    const areaKey = `${area.x},${area.y},${area.width},${area.height}`;
    if (watermark === markKey && areaKey === markArea) {
      return;
    }
    markKey = watermark;
    markArea = areaKey;
    const context = prepareRaster(mark, area);
    if (context === null) {
      return;
    }
    drawWatermark(
      context,
      watermark,
      area,
      watermark.assetId === null ? null : host.assetOf(watermark.assetId)
    );
    mark.image.set({ dirty: true, visible: true });
  };

  /* ------------------------------ interaction ----------------------------- */

  const applyInteractivity = (): void => {
    const selecting = tool.kind === "select";
    for (const [id, entry] of annotations) {
      const active = band === "annotation" && selecting;
      const { locked } = entry.data;
      entry.object.set({
        evented: active,
        hasControls: !locked,
        lockMovementX: locked,
        lockMovementY: locked,
        lockRotation: locked,
        lockScalingX: locked,
        lockScalingY: locked,
        selectable: active,
      });
      idOf.set(entry.object, { band: "annotation", id });
    }
    for (const [id, entry] of redactions) {
      const active = band === "redaction" && selecting;
      entry.object.set({ evented: active, selectable: active });
      idOf.set(entry.object, { band: "redaction", id });
    }
    const drawing = tool.kind !== "select" && tool.kind !== "none";
    canvas.defaultCursor = drawing ? "crosshair" : "default";
    canvas.skipTargetFind = !selecting;
    const active = canvas.getActiveObject();
    if (active !== undefined && idOf.get(active)?.band !== band) {
      canvas.discardActiveObject();
    }
  };

  const restack = (): void => {
    if (state === null) {
      return;
    }
    let index = 0;
    for (const layer of state.layers) {
      const entry = annotations.get(layer.id);
      if (entry !== undefined) {
        canvas.moveObjectTo(entry.object, index);
        index += 1;
      }
    }
    canvas.moveObjectTo(mosaic.image, index);
    index += 1;
    for (const redaction of state.redactions) {
      const entry = redactions.get(redaction.id);
      if (entry !== undefined) {
        canvas.moveObjectTo(entry.object, index);
        index += 1;
      }
    }
    // The Watermark Layer is always on top.
    canvas.moveObjectTo(mark.image, index);
  };

  const reconcile = <Data extends { readonly id: string }>(
    entries: Map<string, Entry<Data>>,
    items: readonly Data[],
    build: (item: Data) => Fabric.FabricObject | null
  ): void => {
    const wanted = new Set(items.map((item) => item.id));
    const active = canvas.getActiveObject();
    for (const [id, entry] of entries) {
      if (!wanted.has(id)) {
        if (active === entry.object) {
          canvas.discardActiveObject();
        }
        canvas.remove(entry.object);
        entries.delete(id);
      }
    }
    for (const item of items) {
      const existing = entries.get(item.id);
      if (existing?.data === item) {
        continue;
      }
      const object = build(item);
      if (existing !== undefined) {
        canvas.remove(existing.object);
        entries.delete(item.id);
      }
      if (object === null) {
        continue;
      }
      canvas.add(object);
      entries.set(item.id, { data: item, object });
      if (existing !== undefined && active === existing.object) {
        canvas.setActiveObject(object);
      }
    }
  };

  /* -------------------------------- events -------------------------------- */

  const selectionOf = (
    object: Fabric.FabricObject | undefined
  ): { readonly band: LayerBand; readonly id: string } | null =>
    object === undefined ? null : (idOf.get(object) ?? null);

  const reportSelection = (): void => {
    host.onSelect(selectionOf(canvas.getActiveObject()));
  };
  canvas.on("selection:created", reportSelection);
  canvas.on("selection:updated", reportSelection);
  canvas.on("selection:cleared", reportSelection);

  canvas.on("object:modified", ({ target }) => {
    const selection = selectionOf(target);
    if (selection === null) {
      return;
    }
    if (selection.band === "annotation") {
      const entry = annotations.get(selection.id);
      if (entry !== undefined) {
        host.onChange({
          _tag: "UpdateLayer",
          id: selection.id,
          patch: annotationPatchOf(target, entry.data),
        });
      }
      return;
    }
    const entry = redactions.get(selection.id);
    if (entry !== undefined && entry.data.form !== "brush") {
      host.onChange({
        _tag: "UpdateRedaction",
        id: selection.id,
        patch: redactionPatchOf(target, entry.data),
      });
    }
  });

  /** A Mosaic follows its object while the user moves it. */
  const followMosaic = ({ target }: { target: Fabric.FabricObject }): void => {
    const selection = selectionOf(target);
    if (state === null || selection?.band !== "redaction") {
      return;
    }
    const entry = redactions.get(selection.id);
    if (entry === undefined || entry.data.kind !== "mosaic") {
      return;
    }
    const moved = { ...entry.data, ...redactionPatchOf(target, entry.data) };
    paintMosaic(
      state.redactions.map((item) => (item.id === moved.id ? moved : item))
    );
  };
  canvas.on("object:moving", followMosaic);
  canvas.on("object:scaling", followMosaic);
  canvas.on("object:rotating", followMosaic);

  canvas.on("text:editing:exited", ({ target }) => {
    const selection = selectionOf(target);
    if (selection?.band !== "annotation") {
      return;
    }
    const text = target.text ?? "";
    host.onChange(
      text.trim().length === 0
        ? { _tag: "RemoveLayer", id: selection.id }
        : {
            _tag: "UpdateLayer",
            id: selection.id,
            patch: { text, width: target.width },
          }
    );
  });

  /* -------------------------------- drawing ------------------------------- */

  let start: Point | null = null;
  let stroke: number[] = [];
  let ghost: Fabric.FabricObject | null = null;

  const clearGhost = (): void => {
    if (ghost !== null) {
      canvas.remove(ghost);
      ghost = null;
    }
  };

  const ghostStyle = {
    evented: false,
    fill: "rgba(230,51,34,0.15)",
    objectCaching: false,
    originX: "center",
    originY: "center",
    selectable: false,
    stroke: "#e63322",
    strokeUniform: true,
    strokeWidth: 1,
  } as const;

  const showGhost = (to: Point, shift: boolean): void => {
    if (start === null) {
      return;
    }
    clearGhost();
    const zoom = canvas.getZoom();
    const thin = {
      ...ghostStyle,
      strokeDashArray: [6 / zoom, 4 / zoom],
      strokeWidth: 1.5 / zoom,
    };
    if (tool.kind === "redact" && tool.form === "brush") {
      const points: Point[] = [];
      for (let index = 0; index + 1 < stroke.length; index += 2) {
        points.push({ x: stroke[index] ?? 0, y: stroke[index + 1] ?? 0 });
      }
      ghost = new fabric.Polyline(points, {
        evented: false,
        fill: TRANSPARENT,
        objectCaching: false,
        selectable: false,
        stroke: "rgba(17,17,17,0.6)",
        strokeLineCap: "round",
        strokeLineJoin: "round",
        strokeWidth: Math.max(1, tool.size),
      });
    } else if (
      tool.kind === "figure" &&
      (tool.form === "line" || tool.form === "arrow")
    ) {
      const segment = segmentBetween(start, to, shift);
      ghost = new fabric.Line([-segment.width / 2, 0, segment.width / 2, 0], {
        ...thin,
        angle: segment.rotation,
        left: segment.x,
        strokeWidth: 3 / zoom,
        top: segment.y,
      });
    } else {
      const box = boxBetween(start, to, shift);
      const ellipse =
        (tool.kind === "figure" || tool.kind === "redact") &&
        tool.form === "ellipse";
      ghost = ellipse
        ? new fabric.Ellipse({
            ...thin,
            left: box.x,
            rx: box.width / 2,
            ry: box.height / 2,
            top: box.y,
          })
        : new fabric.Rect({
            ...thin,
            height: box.height,
            left: box.x,
            top: box.y,
            width: box.width,
          });
    }
    canvas.add(ghost);
    canvas.requestRenderAll();
  };

  canvas.on("mouse:down", ({ scenePoint }) => {
    if (tool.kind === "none" || tool.kind === "select") {
      return;
    }
    start = { x: scenePoint.x, y: scenePoint.y };
    stroke = [scenePoint.x, scenePoint.y];
  });

  canvas.on("mouse:move", ({ e, scenePoint }) => {
    if (start === null || tool.kind === "text") {
      return;
    }
    stroke.push(scenePoint.x, scenePoint.y);
    showGhost(scenePoint, e.shiftKey);
  });

  canvas.on("mouse:up", ({ e, scenePoint }) => {
    const from = start;
    start = null;
    clearGhost();
    if (from === null) {
      return;
    }
    const to = { x: scenePoint.x, y: scenePoint.y };
    const minimum = MIN_DRAW / canvas.getZoom();
    if (tool.kind === "text") {
      host.onDrawn({ at: to, kind: "text" });
    } else if (tool.kind === "redact" && tool.form === "brush") {
      host.onDrawn({
        kind: "redact",
        points: stroke,
        form: "brush",
        size: tool.size,
      });
    } else if (tool.kind === "redact" && tool.form !== "brush") {
      const box = boxBetween(from, to, e.shiftKey);
      if (box.width >= minimum && box.height >= minimum) {
        host.onDrawn({ box, kind: "redact", form: tool.form });
      }
    } else if (tool.kind === "figure") {
      if (tool.form === "line" || tool.form === "arrow") {
        const segment = segmentBetween(from, to, e.shiftKey);
        if (segment.width >= minimum) {
          host.onDrawn({
            box: {
              height: 0,
              width: segment.width,
              x: segment.x,
              y: segment.y,
            },
            kind: "figure",
            rotation: segment.rotation,
            form: tool.form,
          });
        }
      } else {
        const box = boxBetween(from, to, e.shiftKey);
        if (box.width >= minimum && box.height >= minimum) {
          host.onDrawn({ box, kind: "figure", rotation: 0, form: tool.form });
        }
      }
    }
    stroke = [];
    canvas.requestRenderAll();
  });

  /* --------------------------------- API ---------------------------------- */

  return {
    dispose: () => {
      disposed = true;
      void canvas.dispose();
    },
    editText: (id) => {
      const object = annotations.get(id)?.object;
      if (object instanceof fabric.Textbox) {
        canvas.setActiveObject(object);
        object.enterEditing();
        object.selectAll();
        canvas.requestRenderAll();
      }
    },
    isEditingText: () => {
      const active = canvas.getActiveObject();
      return active instanceof fabric.Textbox && active.isEditing;
    },
    select: (selection) => {
      const object =
        selection === null
          ? undefined
          : (selection.band === "annotation" ? annotations : redactions).get(
              selection.id
            )?.object;
      if (object === undefined) {
        canvas.discardActiveObject();
      } else if (canvas.getActiveObject() !== object) {
        canvas.setActiveObject(object);
      }
      canvas.requestRenderAll();
    },
    setMode: (nextBand, nextTool) => {
      band = nextBand;
      tool = nextTool;
      applyInteractivity();
      canvas.requestRenderAll();
    },
    setMosaicBase: (base) => {
      mosaicBase = base;
      if (state !== null) {
        paintMosaic(state.redactions);
        canvas.requestRenderAll();
      }
    },
    setView: (view) => {
      if (disposed) {
        return;
      }
      canvas.setDimensions(view.cssSize);
      canvas.setViewportTransform([...view.frameToCss]);
      canvas.clipPath =
        view.clip === null
          ? undefined
          : plan?.form === "ellipse"
            ? new fabric.Ellipse({
                left: view.clip.x + view.clip.width / 2,
                originX: "center",
                originY: "center",
                rx: view.clip.width / 2,
                ry: view.clip.height / 2,
                top: view.clip.y + view.clip.height / 2,
              })
            : new fabric.Rect({
                height: view.clip.height,
                left: view.clip.x + view.clip.width / 2,
                originX: "center",
                originY: "center",
                top: view.clip.y + view.clip.height / 2,
                width: view.clip.width,
              });
      canvas.requestRenderAll();
    },
    sync: (nextState, nextPlan) => {
      if (disposed) {
        return;
      }
      state = nextState;
      plan = nextPlan;
      reconcile(annotations, nextState.layers, (layer) =>
        annotationObjectOf(fabric, layer, host.assetOf)
      );
      reconcile(redactions, nextState.redactions, (redaction) =>
        redactionObjectOf(fabric, redaction)
      );
      paintMosaic(nextState.redactions);
      paintWatermark(nextState.watermark);
      restack();
      applyInteractivity();
      canvas.requestRenderAll();
    },
  };
};
