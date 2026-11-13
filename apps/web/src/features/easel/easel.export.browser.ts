import { cssOf } from "@/features/easel/easel.color";
import { fittedSizeOf } from "@/features/easel/easel.decode.browser";
import {
  drawWatermark,
  paintRedactionArea,
} from "@/features/easel/easel.draw.browser";
import type { Matrix } from "@/features/easel/easel.geometry";
import { renderAnnotations } from "@/features/easel/easel.layers.browser";
import {
  bakeCover,
  bakeMosaic,
  mosaicBlockSizeOf,
} from "@/features/easel/easel.pixels";
import { OUTPUT_MIME, renderPlanOf } from "@/features/easel/easel.plan";
import type { OutputFormat, RenderPlan } from "@/features/easel/easel.plan";
import type { Size } from "@/features/easel/easel.presets";
import { exportMatrixOf } from "@/features/easel/easel.renderer.browser";
import type { PhotoRenderer } from "@/features/easel/easel.renderer.browser";
import type { EditState, Redaction } from "@/features/easel/easel.stack";
import { encodeInWorker } from "@/features/easel/easel.worker-client";

/**
 * The export (ADR-0041): it draws every step of the Edit Stack at the export
 * size, bakes the Redactions into the pixels, and encodes the result. The
 * file comes from canvas pixels only, so it holds no metadata and no hidden
 * pixel under a Redaction.
 */

export interface ExportedImage {
  readonly bytes: Uint8Array;
  readonly format: OutputFormat;
  readonly height: number;
  readonly mime: string;
  readonly name: string;
  readonly width: number;
}

const context2dOf = (canvas: HTMLCanvasElement): CanvasRenderingContext2D => {
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (context === null) {
    throw new Error("the browser has no 2D canvas");
  }
  return context;
};

const canvasOf = (size: Size): HTMLCanvasElement => {
  const canvas = document.createElement("canvas");
  canvas.width = size.width;
  canvas.height = size.height;
  return canvas;
};

/** From a frame point (origin at the frame center) to an export pixel. */
const frameToExportOf = (plan: RenderPlan, size: Size): Matrix => {
  const scaleX = size.width / plan.crop.width;
  const scaleY = size.height / plan.crop.height;
  return [
    scaleX,
    0,
    0,
    scaleY,
    (plan.frame.width / 2 - plan.crop.x) * scaleX,
    (plan.frame.height / 2 - plan.crop.y) * scaleY,
  ];
};

/** The area of some Redactions as one byte for each export pixel. */
const areaOf = (
  redactions: readonly Redaction[],
  matrix: Matrix,
  size: Size
): Uint8Array => {
  const canvas = canvasOf(size);
  const context = context2dOf(canvas);
  context.setTransform(...matrix);
  context.fillStyle = "#fff";
  context.strokeStyle = "#fff";
  for (const redaction of redactions) {
    paintRedactionArea(context, redaction);
  }
  const { data } = context.getImageData(0, 0, size.width, size.height);
  const area = new Uint8Array(size.width * size.height);
  for (let pixel = 0; pixel < area.length; pixel += 1) {
    area[pixel] = data[pixel * 4 + 3] ?? 0;
  }
  return area;
};

/** Draws one state at its export size and returns the finished pixels. */
const composeExport = async (options: {
  readonly assetOf: (id: string) => CanvasImageSource | null;
  readonly plan: RenderPlan;
  /**
   * Gives the renderer with this File Tab's source on the GPU. The export
   * asks for it after each wait, so another File Tab cannot change it first.
   */
  readonly renderer: () => PhotoRenderer | null;
  readonly state: EditState;
}): Promise<ImageData> => {
  const { assetOf, plan, state } = options;
  await document.fonts.ready;
  const renderer = options.renderer();
  if (renderer === null) {
    throw new Error("the pixel renderer is not available");
  }
  const size = fittedSizeOf(plan.exportSize, renderer.maxSize);

  // Steps 1 to 3: geometry, Finetune, Filter, and Bucket Fills.
  renderer.draw({
    canvasToFrame: exportMatrixOf(plan, size),
    plan,
    size,
    state,
  });
  const canvas = canvasOf(size);
  const context = context2dOf(canvas);
  context.drawImage(renderer.canvas, 0, 0);
  const backdrop =
    plan.backdrop._tag === "Solid" ? cssOf(plan.backdrop.color) : null;
  const fillBehind = (): void => {
    if (backdrop !== null) {
      context.globalCompositeOperation = "destination-over";
      context.fillStyle = backdrop;
      context.fillRect(0, 0, size.width, size.height);
      context.globalCompositeOperation = "source-over";
    }
  };
  // The Backdrop shows in the empty corners of Keep whole image.
  fillBehind();

  // Step 4: Annotation Layers, in the user's order.
  const annotations = await renderAnnotations({ assetOf, plan, size, state });
  if (annotations !== null) {
    context.drawImage(annotations, 0, 0);
  }

  // Step 5: Redactions, baked into the pixels.
  if (state.redactions.length > 0) {
    const matrix = frameToExportOf(plan, size);
    const image = context.getImageData(0, 0, size.width, size.height);
    const raster = {
      height: image.height,
      rgba: image.data,
      width: image.width,
    };
    const mosaics = state.redactions.filter((item) => item.kind === "mosaic");
    if (mosaics.length > 0) {
      bakeMosaic(
        raster,
        areaOf(mosaics, matrix, size),
        mosaicBlockSizeOf(size.width, size.height)
      );
    }
    for (const cover of state.redactions) {
      if (cover.kind === "cover") {
        bakeCover(raster, areaOf([cover], matrix, size), cover.color);
      }
    }
    context.putImageData(image, 0, 0);
  }

  // Step 6: the Watermark Layer, always on top.
  if (state.watermark !== null) {
    drawWatermark(
      context,
      state.watermark,
      { height: size.height, width: size.width, x: 0, y: 0 },
      state.watermark.assetId === null ? null : assetOf(state.watermark.assetId)
    );
  }

  if (plan.form === "ellipse") {
    context.globalCompositeOperation = "destination-in";
    context.beginPath();
    context.ellipse(
      size.width / 2,
      size.height / 2,
      size.width / 2,
      size.height / 2,
      0,
      0,
      Math.PI * 2
    );
    context.fill();
    context.globalCompositeOperation = "source-over";
    // The Backdrop fills the outside of an Ellipse Crop.
    fillBehind();
  }
  return context.getImageData(0, 0, size.width, size.height);
};

/** Draws and encodes one state as a new image file. */
export const exportImage = async (options: {
  readonly assetOf: (id: string) => CanvasImageSource | null;
  readonly format: OutputFormat;
  readonly name: string;
  readonly quality: number;
  /**
   * Gives the renderer with this File Tab's source on the GPU. The export
   * asks for it after each wait, so another File Tab cannot change it first.
   */
  readonly renderer: () => PhotoRenderer | null;
  readonly source: Size;
  readonly state: EditState;
}): Promise<ExportedImage> => {
  const { format, name, source, state } = options;
  const plan = renderPlanOf({ format, name, source, state });
  const image = await composeExport({
    assetOf: options.assetOf,
    plan,
    renderer: options.renderer,
    state,
  });
  const bytes = await encodeInWorker({
    format,
    height: image.height,
    quality: options.quality,
    // SAFETY: a canvas ImageData is backed by an ArrayBuffer.
    rgba: image.data.buffer as ArrayBuffer,
    width: image.width,
  });
  return {
    bytes,
    format,
    height: image.height,
    mime: OUTPUT_MIME[format],
    name: plan.fileName,
    width: image.width,
  };
};
