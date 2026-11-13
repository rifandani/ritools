import { cssOf } from "@/features/easel/easel.color";
import type { Rect } from "@/features/easel/easel.geometry";
import type { Size } from "@/features/easel/easel.presets";
import type { Redaction, WatermarkLayer } from "@/features/easel/easel.stack";

/**
 * Canvas 2D drawing that the live view and the export share, so the two give
 * the same shapes: the area of a Redaction and the Watermark Layer.
 */

type Context2D = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;

/**
 * Paints the area of one Redaction with the current fill and stroke style.
 * The context must map frame points (origin at the frame center) to pixels.
 */
export const paintRedactionArea = (
  context: Context2D,
  redaction: Redaction
): void => {
  context.save();
  if (redaction.form === "brush") {
    const { points } = redaction;
    context.lineCap = "round";
    context.lineJoin = "round";
    context.lineWidth = Math.max(1, redaction.size);
    context.beginPath();
    context.moveTo(points[0] ?? 0, points[1] ?? 0);
    for (let index = 2; index + 1 < points.length; index += 2) {
      context.lineTo(points[index] ?? 0, points[index + 1] ?? 0);
    }
    if (points.length <= 2) {
      // One click is one round dot.
      context.lineTo((points[0] ?? 0) + 0.01, points[1] ?? 0);
    }
    context.stroke();
  } else {
    context.translate(redaction.x, redaction.y);
    context.rotate((redaction.rotation * Math.PI) / 180);
    context.beginPath();
    if (redaction.form === "ellipse") {
      context.ellipse(
        0,
        0,
        redaction.width / 2,
        redaction.height / 2,
        0,
        0,
        Math.PI * 2
      );
    } else {
      context.rect(
        -redaction.width / 2,
        -redaction.height / 2,
        redaction.width,
        redaction.height
      );
    }
    context.fill();
  }
  context.restore();
};

/** The pixel size of a picture. */
const sizeOfSource = (source: CanvasImageSource): Size => {
  if (source instanceof HTMLImageElement) {
    return { height: source.naturalHeight, width: source.naturalWidth };
  }
  if (source instanceof HTMLVideoElement) {
    return { height: source.videoHeight, width: source.videoWidth };
  }
  if (source instanceof VideoFrame) {
    return { height: source.displayHeight, width: source.displayWidth };
  }
  if (source instanceof SVGImageElement) {
    return {
      height: source.height.baseVal.value,
      width: source.width.baseVal.value,
    };
  }
  return { height: source.height, width: source.width };
};

/** The font size that makes `text` as wide as `width`. */
const fittedFontSize = (
  context: Context2D,
  text: string,
  font: string,
  width: number
): number => {
  context.font = `600 100px "${font}", sans-serif`;
  const measured = Math.max(1, context.measureText(text).width);
  return Math.max(4, (100 * width) / measured);
};

/**
 * Draws the Watermark Layer over `area` (the cropped image, in the pixels of
 * the context). A single mark sits at its anchor. A tiled mark repeats over
 * the whole area on a slant, so a crop cannot remove it.
 */
export const drawWatermark = (
  context: Context2D,
  watermark: WatermarkLayer,
  area: Rect,
  asset: CanvasImageSource | null
): void => {
  const text = watermark.text.trim();
  if (watermark.kind === "image" ? asset === null : text.length === 0) {
    return;
  }
  const markWidth = Math.max(8, area.width * watermark.scale);
  let markHeight = markWidth;
  let fontSize = 0;
  if (watermark.kind === "image" && asset !== null) {
    const size = sizeOfSource(asset);
    markHeight = (markWidth * size.height) / Math.max(1, size.width);
  } else {
    fontSize = fittedFontSize(context, text, watermark.font, markWidth);
    markHeight = fontSize * 1.2;
  }
  const drawMark = (centerX: number, centerY: number): void => {
    if (watermark.kind === "image" && asset !== null) {
      context.drawImage(
        asset,
        centerX - markWidth / 2,
        centerY - markHeight / 2,
        markWidth,
        markHeight
      );
      return;
    }
    context.font = `600 ${fontSize}px "${watermark.font}", sans-serif`;
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillStyle = cssOf(watermark.color);
    context.fillText(text, centerX, centerY);
  };

  context.save();
  context.beginPath();
  context.rect(area.x, area.y, area.width, area.height);
  context.clip();
  context.globalAlpha = Math.min(1, Math.max(0, watermark.opacity));
  if (watermark.tiled) {
    const stepX = markWidth * 1.5;
    const stepY = markHeight * 3;
    const reach = Math.hypot(area.width, area.height);
    context.translate(area.x + area.width / 2, area.y + area.height / 2);
    context.rotate(-Math.PI / 6);
    let row = 0;
    for (let y = -reach / 2; y <= reach / 2; y += stepY) {
      const shift = row % 2 === 0 ? 0 : stepX / 2;
      for (let x = -reach / 2; x <= reach / 2 + stepX; x += stepX) {
        drawMark(x + shift, y);
      }
      row += 1;
    }
  } else {
    const margin = Math.min(area.width, area.height) * 0.04;
    const left = area.x + margin + markWidth / 2;
    const right = area.x + area.width - margin - markWidth / 2;
    const top = area.y + margin + markHeight / 2;
    const bottom = area.y + area.height - margin - markHeight / 2;
    const centerX =
      watermark.anchor === "center"
        ? area.x + area.width / 2
        : watermark.anchor.endsWith("left")
          ? left
          : right;
    const centerY =
      watermark.anchor === "center"
        ? area.y + area.height / 2
        : watermark.anchor.startsWith("top")
          ? top
          : bottom;
    drawMark(centerX, centerY);
  }
  context.restore();
};
