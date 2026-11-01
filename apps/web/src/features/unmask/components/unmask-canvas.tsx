"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  HiArrowsPointingOut,
  HiMagnifyingGlassMinus,
  HiMagnifyingGlassPlus,
} from "react-icons/hi2";

import { Button } from "@/core/components/ui/button";
import { useTranslation } from "@/features/i18n/use-translation";
import type { BrushTool } from "@/features/unmask/components/unmask-magic-brush";
import {
  backdropLabelKey,
  clampScale,
  modeLabelKey,
  ROW_STATE_KEY,
} from "@/features/unmask/unmask";
import type {
  PreviewState,
  UnmaskKey,
  UnmaskSettings,
} from "@/features/unmask/unmask";
import type {
  Matte,
  Pixel,
  RasterImage,
} from "@/features/unmask/unmask.engine";
import { featherMatte } from "@/features/unmask/unmask.matte";
import type { UnmaskItem } from "@/features/unmask/use-unmask";

interface CanvasProps {
  readonly brushSize: number;
  readonly compare: boolean;
  readonly compareAt: number;
  readonly disabledReason: UnmaskKey | null;
  readonly ghost: boolean;
  readonly item: UnmaskItem;
  readonly mode: "erase" | "restore";
  readonly onBrush: (points: readonly Pixel[]) => void;
  readonly onCompare: (value: boolean) => void;
  readonly onCompareAt: (value: number) => void;
  readonly onStrokePreview: (points: readonly Pixel[] | null) => void;
  readonly onWand: (seed: Pixel) => void;
  readonly settings: UnmaskSettings;
  readonly strokePreview: Matte | null;
  readonly tool: BrushTool;
}

/* oxlint-disable eslint/complexity, react-doctor/no-giant-component -- The viewport owns the fixed plate, pointer, and keyboard contract in one canvas. */

const CHECKERBOARD =
  "repeating-conic-gradient(var(--muted) 0% 25%, var(--card) 0% 50%) 50% / 16px 16px";

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

const canvasOf = (width: number, height: number) => {
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(width));
  canvas.height = Math.max(1, Math.round(height));
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (context === null) {
    throw new Error("The browser did not provide a 2D canvas");
  }
  return { canvas, context };
};

/**
 * A source raster at preview size, built once per source and Matte size. The
 * full source stays in one buffer; the preview copy is sampled cell by cell so
 * a 24 MP image never needs a second full-size canvas.
 */
const useSourceCanvas = (
  source: RasterImage | null,
  width: number,
  height: number
) =>
  useMemo(() => {
    if (source === null || width <= 0 || height <= 0) {
      return null;
    }
    const { canvas, context } = canvasOf(width, height);
    const image = context.createImageData(width, height);
    const clampIndex = (value: number, limit: number) =>
      Math.min(limit - 1, Math.max(0, value));
    for (let y = 0; y < height; y += 1) {
      const sourceY = Math.max(
        0,
        Math.min(source.height - 1, ((y + 0.5) * source.height) / height - 0.5)
      );
      const y0 = clampIndex(Math.floor(sourceY), source.height);
      const y1 = clampIndex(y0 + 1, source.height);
      const wy = sourceY - y0;
      for (let x = 0; x < width; x += 1) {
        const sourceX = Math.max(
          0,
          Math.min(source.width - 1, ((x + 0.5) * source.width) / width - 0.5)
        );
        const x0 = clampIndex(Math.floor(sourceX), source.width);
        const x1 = clampIndex(x0 + 1, source.width);
        const wx = sourceX - x0;
        const topLeft = (y0 * source.width + x0) * 4;
        const topRight = (y0 * source.width + x1) * 4;
        const bottomLeft = (y1 * source.width + x0) * 4;
        const bottomRight = (y1 * source.width + x1) * 4;
        const to = (y * width + x) * 4;
        for (let channel = 0; channel < 4; channel += 1) {
          const top =
            (source.rgba[topLeft + channel] ?? 0) * (1 - wx) +
            (source.rgba[topRight + channel] ?? 0) * wx;
          const bottom =
            (source.rgba[bottomLeft + channel] ?? 0) * (1 - wx) +
            (source.rgba[bottomRight + channel] ?? 0) * wx;
          image.data[to + channel] = Math.round(top * (1 - wy) + bottom * wy);
        }
      }
    }
    context.putImageData(image, 0, 0);
    return canvas;
  }, [source, width, height]);

const maskedCanvas = (
  source: HTMLCanvasElement,
  matte: Matte,
  invert: boolean
): HTMLCanvasElement => {
  const { canvas, context } = canvasOf(matte.width, matte.height);
  context.drawImage(source, 0, 0, matte.width, matte.height);
  const mask = canvasOf(matte.width, matte.height);
  const image = mask.context.createImageData(matte.width, matte.height);
  for (let index = 0; index < matte.alpha.length; index += 1) {
    const alpha = matte.alpha[index] ?? 0;
    image.data[index * 4] = 255;
    image.data[index * 4 + 1] = 255;
    image.data[index * 4 + 2] = 255;
    image.data[index * 4 + 3] = invert ? 255 - alpha : alpha;
  }
  mask.context.putImageData(image, 0, 0);
  context.globalCompositeOperation = "destination-in";
  context.drawImage(mask.canvas, 0, 0);
  context.globalCompositeOperation = "source-over";
  return canvas;
};

interface ZoomInput {
  readonly compare: boolean;
  readonly compareAt: number;
  readonly scale: number;
  readonly x: number;
  readonly y: number;
}

const zoomView = (
  current: ZoomInput,
  nextScale: number,
  pointerX: number,
  pointerY: number,
  viewportWidth: number,
  viewportHeight: number
): PreviewState => {
  const scale = clampScale(nextScale);
  const ratio = scale / current.scale;
  const x = pointerX - (pointerX - current.x) * ratio;
  const y = pointerY - (pointerY - current.y) * ratio;
  const slackX = Math.max(40, viewportWidth * scale * 0.5);
  const slackY = Math.max(40, viewportHeight * scale * 0.5);
  return {
    ...current,
    scale,
    x: clamp(x, -slackX, slackX),
    y: clamp(y, -slackY, slackY),
  };
};

/** The Cutout viewport: the plate, its comparison rule, and its controls. */
export const UnmaskCanvas = ({
  brushSize,
  compare,
  compareAt,
  disabledReason,
  ghost,
  item,
  mode,
  onBrush,
  onCompare,
  onCompareAt,
  onStrokePreview,
  onWand,
  settings,
  strokePreview,
  tool,
}: CanvasProps) => {
  const { t } = useTranslation();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [view, setView] = useState<PreviewState>({
    compare: false,
    compareAt: 50,
    scale: 1,
    x: 0,
    y: 0,
  });
  const [cursor, setCursor] = useState<{
    readonly x: number;
    readonly y: number;
    readonly visible: boolean;
  }>({ visible: false, x: 0, y: 0 });
  const keyboardCursor = useRef<Pixel | null>(null);
  const [displayedWidth, setDisplayedWidth] = useState(0);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const panning = useRef<{
    readonly startX: number;
    readonly startY: number;
    readonly viewX: number;
    readonly viewY: number;
  } | null>(null);
  const painting = useRef<Pixel[]>([]);
  const strokeRef = useRef<Pixel[]>([]);
  const pinch = useRef<{
    readonly distance: number;
    readonly scale: number;
  } | null>(null);
  const spaceDown = useRef(false);

  const preview = strokePreview ?? item.preview;
  const width = preview?.width ?? 0;
  const height = preview?.height ?? 0;
  const sourceCanvas = useSourceCanvas(item.source, width, height);

  const { facts } = item;
  const summary =
    facts === null || preview === null
      ? t("unmaskCanvasHint")
      : t("unmaskCanvasSummary", {
          backdrop: t(backdropLabelKey(settings.backdrop)),
          brush: t(tool === "wand" ? "unmaskWand" : "unmaskBrush"),
          height: String(facts.height),
          mode: t(modeLabelKey(mode)),
          name: item.name,
          state: t(ROW_STATE_KEY[item.state]),
          width: String(facts.width),
        });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas === null || preview === null || sourceCanvas === null) {
      return;
    }
    canvas.width = preview.width;
    canvas.height = preview.height;
    const context = canvas.getContext("2d", { willReadFrequently: true });
    if (context === null) {
      return;
    }
    const feathered =
      settings.feather > 0 ? featherMatte(preview, settings.feather) : preview;
    context.clearRect(0, 0, canvas.width, canvas.height);
    if (settings.backdrop._tag === "Solid") {
      const { color } = settings.backdrop;
      context.fillStyle = `rgb(${color.r} ${color.g} ${color.b})`;
      context.fillRect(0, 0, canvas.width, canvas.height);
    } else if (settings.backdrop._tag === "Blur") {
      const scale = preview.width / (item.source?.width ?? preview.width);
      context.filter = `blur(${(settings.backdrop.radius * scale) / 2}px)`;
      context.drawImage(sourceCanvas, 0, 0, canvas.width, canvas.height);
      context.filter = "none";
    }

    const subject = maskedCanvas(sourceCanvas, feathered, false);
    context.drawImage(subject, 0, 0);

    if (ghost && mode === "restore") {
      const removed = maskedCanvas(sourceCanvas, feathered, true);
      context.globalAlpha = 0.3;
      context.drawImage(removed, 0, 0);
      context.globalAlpha = 1;
    }

    if (compare && compareAt < 100) {
      const split = Math.round((compareAt / 100) * canvas.width);
      context.save();
      context.beginPath();
      context.rect(0, 0, split, canvas.height);
      context.clip();
      context.drawImage(sourceCanvas, 0, 0, canvas.width, canvas.height);
      context.restore();
    }
  }, [
    compare,
    compareAt,
    ghost,
    item.source,
    mode,
    preview,
    settings.backdrop,
    settings.feather,
    sourceCanvas,
  ]);

  const toImagePoint = useCallback(
    (event: React.PointerEvent | React.MouseEvent): Pixel | null => {
      const canvas = canvasRef.current;
      if (canvas === null || preview === null) {
        return null;
      }
      const rect = canvas.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) {
        return null;
      }
      const x = ((event.clientX - rect.left) / rect.width) * preview.width;
      const y = ((event.clientY - rect.top) / rect.height) * preview.height;
      return {
        x: clamp(Math.floor(x), 0, preview.width - 1),
        y: clamp(Math.floor(y), 0, preview.height - 1),
      };
    },
    [preview]
  );

  const toSourcePoint = useCallback(
    (point: Pixel): Pixel | null => {
      if (facts === null || preview === null) {
        return null;
      }
      return {
        x: clamp(
          Math.floor((point.x / preview.width) * facts.width),
          0,
          facts.width - 1
        ),
        y: clamp(
          Math.floor((point.y / preview.height) * facts.height),
          0,
          facts.height - 1
        ),
      };
    },
    [facts, preview]
  );

  const setCursorFromEvent = useCallback(
    (event: React.PointerEvent | React.MouseEvent) => {
      const wrapper = wrapperRef.current;
      if (wrapper === null) {
        return;
      }
      const rect = wrapper.getBoundingClientRect();
      setCursor({
        visible: true,
        x: event.clientX - rect.left,
        y: event.clientY - rect.top,
      });
    },
    []
  );

  const startPan = (event: React.PointerEvent) => {
    panning.current = {
      startX: event.clientX,
      startY: event.clientY,
      viewX: view.x,
      viewY: view.y,
    };
  };

  const onPointerDown = (event: React.PointerEvent<HTMLCanvasElement>) => {
    event.currentTarget.focus();
    event.currentTarget.setPointerCapture(event.pointerId);
    pointers.current.set(event.pointerId, {
      x: event.clientX,
      y: event.clientY,
    });
    if (pointers.current.size === 2) {
      const [first, second] = [...pointers.current.values()];
      if (first !== undefined && second !== undefined) {
        pinch.current = {
          distance: Math.hypot(second.x - first.x, second.y - first.y),
          scale: view.scale,
        };
      }
      return;
    }
    const wantsPan =
      event.button === 1 ||
      event.altKey ||
      spaceDown.current ||
      compare ||
      disabledReason !== null;
    if (wantsPan) {
      startPan(event);
      return;
    }
    if (tool === "wand") {
      const point = toImagePoint(event);
      const source = point === null ? null : toSourcePoint(point);
      if (source !== null) {
        onWand(source);
      }
      return;
    }
    const point = toImagePoint(event);
    if (point === null) {
      return;
    }
    const source = toSourcePoint(point);
    if (source === null) {
      return;
    }
    painting.current = [source];
    strokeRef.current = [source];
    onStrokePreview([source]);
  };

  const onPointerMove = (event: React.PointerEvent<HTMLCanvasElement>) => {
    setCursorFromEvent(event);
    if (pointers.current.has(event.pointerId)) {
      pointers.current.set(event.pointerId, {
        x: event.clientX,
        y: event.clientY,
      });
    }
    if (pointers.current.size === 2) {
      const [first, second] = [...pointers.current.values()];
      if (
        first !== undefined &&
        second !== undefined &&
        pinch.current !== null
      ) {
        const distance = Math.hypot(second.x - first.x, second.y - first.y);
        const wrapper = wrapperRef.current;
        if (wrapper !== null) {
          const rect = wrapper.getBoundingClientRect();
          const next =
            pinch.current.scale * (distance / pinch.current.distance);
          setView((current) =>
            zoomView(
              current,
              next,
              (first.x + second.x) / 2 - rect.left,
              (first.y + second.y) / 2 - rect.top,
              rect.width,
              rect.height
            )
          );
        }
      }
      return;
    }
    if (panning.current !== null) {
      const start = panning.current;
      setView((current) => ({
        ...current,
        x: current.x + (event.clientX - start.startX),
        y: current.y + (event.clientY - start.startY),
      }));
      return;
    }
    if (tool === "brush" && painting.current.length > 0) {
      const point = toImagePoint(event);
      const source = point === null ? null : toSourcePoint(point);
      if (source === null) {
        return;
      }
      const last = painting.current.at(-1);
      if (
        last === undefined ||
        Math.hypot(source.x - last.x, source.y - last.y) >= 1
      ) {
        painting.current.push(source);
        onStrokePreview(painting.current);
      }
    }
  };

  const endPointer = (event: React.PointerEvent<HTMLCanvasElement>) => {
    pointers.current.delete(event.pointerId);
    if (pointers.current.size < 2) {
      pinch.current = null;
    }
    panning.current = null;
    if (tool === "brush" && painting.current.length > 0) {
      const points = painting.current;
      painting.current = [];
      onBrush(points);
      onStrokePreview(null);
    }
  };

  const onWheel = useCallback((event: WheelEvent) => {
    const wrapper = wrapperRef.current;
    if (wrapper === null) {
      return;
    }
    event.preventDefault();
    const rect = wrapper.getBoundingClientRect();
    setView((current) =>
      zoomView(
        current,
        current.scale * Math.exp(-event.deltaY * 0.0015),
        event.clientX - rect.left,
        event.clientY - rect.top,
        rect.width,
        rect.height
      )
    );
  }, []);

  useEffect(() => {
    const wrapper = wrapperRef.current;
    if (wrapper === null) {
      return;
    }
    wrapper.addEventListener("wheel", onWheel, { passive: false });
    return () => {
      wrapper.removeEventListener("wheel", onWheel);
    };
  }, [onWheel]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas === null) {
      return;
    }
    const observer = new ResizeObserver((entries) => {
      setDisplayedWidth(entries[0]?.contentRect.width ?? 0);
    });
    observer.observe(canvas);
    return () => {
      observer.disconnect();
    };
  }, []);

  useEffect(() => {
    const onKeyUp = (event: KeyboardEvent) => {
      if (event.code === "Space") {
        spaceDown.current = false;
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (
        event.code === "Space" &&
        document.activeElement === canvasRef.current
      ) {
        spaceDown.current = true;
      }
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, []);

  const keyDown = (event: React.KeyboardEvent<HTMLCanvasElement>) => {
    if (preview === null) {
      return;
    }
    const step = event.shiftKey ? 10 : 1;
    const move = (dx: number, dy: number) => {
      event.preventDefault();
      const { current } = keyboardCursor;
      keyboardCursor.current = {
        x: clamp((current?.x ?? preview.width / 2) + dx, 0, preview.width - 1),
        y: clamp(
          (current?.y ?? preview.height / 2) + dy,
          0,
          preview.height - 1
        ),
      };
    };
    switch (event.key) {
      case "ArrowLeft": {
        move(-step, 0);
        return;
      }
      case "ArrowRight": {
        move(step, 0);
        return;
      }
      case "ArrowUp": {
        move(0, -step);
        return;
      }
      case "ArrowDown": {
        move(0, step);
        return;
      }
      case "+":
      case "=": {
        event.preventDefault();
        setView((current) => ({
          ...current,
          scale: clampScale(current.scale * 1.25),
        }));
        return;
      }
      case "-": {
        event.preventDefault();
        setView((current) => ({
          ...current,
          scale: clampScale(current.scale / 1.25),
        }));
        return;
      }
      case "0": {
        event.preventDefault();
        setView({ compare: false, compareAt: 50, scale: 1, x: 0, y: 0 });
        return;
      }
      case "Enter": {
        event.preventDefault();
        const point = keyboardCursor.current ?? {
          x: Math.floor(preview.width / 2),
          y: Math.floor(preview.height / 2),
        };
        const source = toSourcePoint(point);
        if (source === null) {
          return;
        }
        if (tool === "wand") {
          onWand(source);
        } else {
          strokeRef.current = [...strokeRef.current, source];
          onStrokePreview(strokeRef.current);
        }
        return;
      }
      case "Escape": {
        if (strokeRef.current.length > 0) {
          event.preventDefault();
          onBrush(strokeRef.current);
          strokeRef.current = [];
          onStrokePreview(null);
        }
        break;
      }
      default:
    }
  };

  const actualScale = () => {
    const canvas = canvasRef.current;
    if (canvas === null || canvas.getBoundingClientRect().width === 0) {
      return;
    }
    setView((current) => ({
      ...current,
      scale: clampScale(canvas.width / canvas.getBoundingClientRect().width),
    }));
  };

  const fit = () => {
    setView({ compare: false, compareAt: 50, scale: 1, x: 0, y: 0 });
  };
  const ringSize = Math.max(
    8,
    (brushSize / Math.max(1, item.source?.width ?? preview?.width ?? 1)) *
      displayedWidth *
      view.scale
  );

  return (
    <section aria-labelledby="unmask-canvas-heading" className="min-w-0">
      <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-2">
        <div className="min-w-0">
          <h2
            className="font-display text-[clamp(1.75rem,4vw,2.5rem)] leading-none font-black uppercase [font-stretch:75%]"
            id="unmask-canvas-heading"
            tabIndex={-1}
          >
            {t("unmaskCutout")}
          </h2>
          <p className="text-muted-fg mt-1 text-sm/6" id="unmask-canvas-hint">
            {t("unmaskCanvasHint")}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <Button
            aria-label={t("unmaskZoomOut")}
            intent="outline"
            onPress={() => {
              setView((current) => ({
                ...current,
                scale: clampScale(current.scale / 1.25),
              }));
            }}
            size="sq-sm"
          >
            <HiMagnifyingGlassMinus aria-hidden="true" />
          </Button>
          <Button
            aria-label={t("unmaskZoomIn")}
            intent="outline"
            onPress={() => {
              setView((current) => ({
                ...current,
                scale: clampScale(current.scale * 1.25),
              }));
            }}
            size="sq-sm"
          >
            <HiMagnifyingGlassPlus aria-hidden="true" />
          </Button>
          <Button intent="outline" onPress={fit} size="xs">
            <HiArrowsPointingOut aria-hidden="true" />
            {t("unmaskZoomFit")}
          </Button>
          <Button intent="plain" onPress={actualScale} size="xs">
            {t("unmaskZoomActual")}
          </Button>
          <Button
            aria-pressed={compare}
            intent={compare ? "primary" : "outline"}
            onPress={() => {
              onCompare(!compare);
            }}
            size="xs"
          >
            {t("unmaskCompare")}
          </Button>
        </div>
      </div>

      <div
        className="border-rule bg-card relative mt-3 touch-none overflow-hidden border-2"
        ref={wrapperRef}
        style={{ background: CHECKERBOARD }}
      >
        <div
          className="relative mx-auto origin-center transition-transform duration-90 ease-out motion-reduce:transition-none"
          style={{
            transform: `translate(${view.x}px, ${view.y}px) scale(${view.scale})`,
          }}
        >
          <canvas
            aria-describedby="unmask-canvas-hint"
            aria-label={summary}
            className="block h-auto w-full cursor-crosshair outline-hidden"
            onBlur={() => {
              setCursor((current) => ({ ...current, visible: false }));
            }}
            onFocus={() => {
              if (keyboardCursor.current === null) {
                keyboardCursor.current = { x: 0, y: 0 };
              }
            }}
            onKeyDown={keyDown}
            onPointerCancel={endPointer}
            onPointerDown={onPointerDown}
            onPointerLeave={() => {
              setCursor((current) => ({ ...current, visible: false }));
            }}
            onPointerMove={onPointerMove}
            onPointerUp={endPointer}
            ref={canvasRef}
            tabIndex={0}
          />
        </div>

        {compare ? (
          <>
            <input
              aria-label={t("unmaskCompare")}
              aria-valuetext={t("unmaskCompareValue", {
                percent: String(compareAt),
              })}
              className="absolute inset-0 z-20 h-full w-full cursor-ew-resize opacity-0"
              max={100}
              min={0}
              onChange={(event) => {
                onCompareAt(Number(event.target.value));
              }}
              type="range"
              value={compareAt}
            />
            <div
              aria-hidden="true"
              className="bg-primary pointer-events-none absolute inset-y-0 z-10 w-0.5"
              style={{ left: `${compareAt}%` }}
            >
              <span className="border-primary bg-bg absolute top-1/2 left-1/2 size-3 -translate-x-1/2 -translate-y-1/2 rotate-45 border-2" />
            </div>
            <span className="bg-bg/90 pointer-events-none absolute top-2 left-2 z-10 px-1.5 text-xs font-bold uppercase">
              {t("unmaskOriginal")}
            </span>
            <span className="bg-bg/90 pointer-events-none absolute top-2 right-2 z-10 px-1.5 text-xs font-bold uppercase">
              {t("unmaskCutout")}
            </span>
          </>
        ) : null}

        {disabledReason === null && compare === false ? (
          <div
            aria-hidden="true"
            className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-1/2 border-2 border-white shadow-[0_0_0_2px_#000]"
            style={{
              borderRadius: tool === "brush" ? "9999px" : 0,
              display: cursor.visible ? "block" : "none",
              height: tool === "wand" ? 18 : ringSize,
              left: cursor.x,
              top: cursor.y,
              width: tool === "wand" ? 18 : ringSize,
            }}
          />
        ) : null}
      </div>

      <p className="text-muted-fg mt-2 text-xs leading-4">
        {t("unmaskCanvasKeyboard")}
      </p>
    </section>
  );
};
