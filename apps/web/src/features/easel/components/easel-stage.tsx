"use client";

/* oxlint-disable eslint/complexity, react-doctor/no-giant-component, jsx-a11y/prefer-tag-over-role -- The stage joins the pixel renderer, the Layer adapter, the crop box, and the view in one plate. */

import { cn } from "cn";
import {
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import type { PointerEvent, RefObject } from "react";

import { useLatest } from "@/core/hooks/use-latest";
import { EaselCropOverlay } from "@/features/easel/components/easel-crop-overlay";
import type { DrawThumbnail } from "@/features/easel/components/easel-panel-color";
import {
  frameToCssOf,
  invertView,
  panView,
  zoomView,
} from "@/features/easel/easel";
import type { View } from "@/features/easel/easel";
import { cssOf } from "@/features/easel/easel.color";
import { applyMatrix } from "@/features/easel/easel.geometry";
import type { Point, Rect } from "@/features/easel/easel.geometry";
import { createLayerAdapter } from "@/features/easel/easel.layers.browser";
import type {
  Drawn,
  LayerAdapter,
  LayerBand,
  LayerTool,
} from "@/features/easel/easel.layers.browser";
import { mosaicBlockSizeOf } from "@/features/easel/easel.pixels";
import { renderPlanOf } from "@/features/easel/easel.plan";
import type { RenderPlan } from "@/features/easel/easel.plan";
import { cropPresetOf } from "@/features/easel/easel.presets";
import type { Size } from "@/features/easel/easel.presets";
import { exportMatrixOf } from "@/features/easel/easel.renderer.browser";
import { ORIGINAL } from "@/features/easel/easel.stack";
import type { Change, EditState } from "@/features/easel/easel.stack";
import type { Selection } from "@/features/easel/easel.tools";
import type { EaselController, EaselTab } from "@/features/easel/use-easel";
import { useTranslation } from "@/features/i18n/use-translation";

export interface StageHandle {
  readonly adapter: () => LayerAdapter | null;
  readonly drawThumbnail: DrawThumbnail;
  /** The frame point (origin at the frame center) in the middle of the view. */
  readonly viewCenter: () => Point;
}

const THUMBNAIL: Size = { height: 72, width: 96 };
/** A pointer that moves less than this is a click, not a drag. */
const CLICK_SLOP = 4;

const centeredRect = (plan: RenderPlan, whole: boolean): Rect =>
  whole
    ? {
        height: plan.frame.height,
        width: plan.frame.width,
        x: -plan.frame.width / 2,
        y: -plan.frame.height / 2,
      }
    : {
        height: plan.crop.height,
        width: plan.crop.width,
        x: plan.crop.x - plan.frame.width / 2,
        y: plan.crop.y - plan.frame.height / 2,
      };

/**
 * The plate: the image, the layers over it, and the crop box. The pixel
 * renderer draws the photo to a 2D canvas, and Fabric draws the layers on a
 * second canvas above it.
 */
export const EaselStage = ({
  band,
  compare,
  controller,
  cropping,
  handle,
  onChange,
  onDrawn,
  onPickFill,
  onSelect,
  onView,
  panning,
  picking,
  plan,
  selection,
  state,
  tab,
  tool,
  view,
}: {
  readonly band: LayerBand | null;
  readonly compare: boolean;
  readonly controller: EaselController;
  readonly cropping: boolean;
  readonly handle: RefObject<StageHandle | null>;
  readonly onChange: (change: Change, gesture?: string | null) => void;
  readonly onDrawn: (drawn: Drawn) => void;
  /** A click in the Fill panel, as a source pixel. */
  readonly onPickFill: (point: Point) => void;
  readonly onSelect: (selection: Selection | null) => void;
  readonly onView: (view: View) => void;
  /** Whether a drag pans the view and does not reach the layers. */
  readonly panning: boolean;
  readonly picking: boolean;
  readonly plan: RenderPlan;
  readonly selection: Selection | null;
  readonly state: EditState;
  readonly tab: EaselTab;
  readonly tool: LayerTool;
  readonly view: View;
}) => {
  const { t } = useTranslation();
  const stage = useRef<HTMLDivElement>(null);
  const photoCanvas = useRef<HTMLCanvasElement>(null);
  const layerCanvas = useRef<HTMLCanvasElement>(null);
  const adapter = useRef<LayerAdapter | null>(null);
  const mosaicBase = useRef<HTMLCanvasElement | null>(null);
  const [ready, setReady] = useState(false);
  const [size, setSize] = useState<Size | null>(null);

  const original = renderPlanOf({
    format: tab.format,
    name: tab.name,
    source: tab.source,
    state: ORIGINAL,
  });
  const shownState = compare ? ORIGINAL : state;
  const shownPlan = compare ? original : plan;
  const whole = cropping && !compare;
  const content = centeredRect(shownPlan, whole);
  const stageSize = size ?? { height: 1, width: 1 };
  const frameToCss = frameToCssOf(content, stageSize, view);
  const [scale] = frameToCss;
  const cropRect = centeredRect(shownPlan, false);
  const cropTopLeft = applyMatrix(frameToCss, cropRect);
  const cropBox: Rect = {
    height: cropRect.height * scale,
    width: cropRect.width * scale,
    x: cropTopLeft.x,
    y: cropTopLeft.y,
  };
  const ellipse = shownPlan.form === "ellipse" && !compare;

  const latest = useLatest({
    frameToCss,
    onChange,
    onDrawn,
    onPickFill,
    onSelect,
    onView,
    plan,
    state,
    stageSize,
    view,
  });

  /* ------------------------------- the size ------------------------------- */

  useEffect(() => {
    const element = stage.current;
    if (element === null) {
      return;
    }
    const observer = new ResizeObserver(() => {
      const rect = element.getBoundingClientRect();
      setSize({
        height: Math.max(1, Math.round(rect.height)),
        width: Math.max(1, Math.round(rect.width)),
      });
    });
    observer.observe(element);
    return () => {
      observer.disconnect();
    };
  }, []);

  /* ------------------------------- the photo ------------------------------ */

  const { photoOf } = controller;
  const matrixKey = frameToCss.join(",");
  useEffect(() => {
    const canvas = photoCanvas.current;
    if (canvas === null || size === null) {
      return;
    }
    const frame = requestAnimationFrame(() => {
      const photo = photoOf(tab.id, shownState);
      const context = canvas.getContext("2d");
      if (photo === null || context === null) {
        return;
      }
      const ratio = window.devicePixelRatio || 1;
      const pixels = {
        height: Math.max(1, Math.round(size.height * ratio)),
        width: Math.max(1, Math.round(size.width * ratio)),
      };
      const cssToFrame = invertView(latest.current.frameToCss);
      photo.draw({
        canvasToFrame: [
          cssToFrame[0] / ratio,
          0,
          0,
          cssToFrame[3] / ratio,
          cssToFrame[4],
          cssToFrame[5],
        ],
        plan: shownPlan,
        size: pixels,
        state: shownState,
        wholeFrame: whole,
      });
      if (canvas.width !== pixels.width || canvas.height !== pixels.height) {
        canvas.width = pixels.width;
        canvas.height = pixels.height;
      }
      context.clearRect(0, 0, pixels.width, pixels.height);
      context.drawImage(photo.canvas, 0, 0);
      canvas.dataset.easelDrawn = String(
        Number(canvas.dataset.easelDrawn ?? 0) + 1
      );
    });
    return () => {
      cancelAnimationFrame(frame);
    };
    // The plan follows the state, and the matrix key follows the view.
    // oxlint-disable-next-line react-hooks/exhaustive-deps
  }, [photoOf, tab.id, shownState, size, matrixKey, whole]);

  /* ------------------------------- the layers ----------------------------- */

  useEffect(() => {
    const element = layerCanvas.current;
    if (element === null) {
      return;
    }
    let cancelled = false;
    let made: LayerAdapter | null = null;
    void (async () => {
      try {
        const next = await createLayerAdapter(element, {
          assetOf: controller.assetOf,
          onChange: (change) => {
            latest.current.onChange(change);
          },
          onDrawn: (drawn) => {
            latest.current.onDrawn(drawn);
          },
          onSelect: (picked) => {
            latest.current.onSelect(picked);
          },
        });
        if (cancelled) {
          next.dispose();
          return;
        }
        made = next;
        adapter.current = next;
        setReady(true);
      } catch {
        // The shared toast reports a library that did not load.
      }
    })();
    return () => {
      cancelled = true;
      adapter.current = null;
      made?.dispose();
    };
  }, [controller.assetOf, latest]);

  useEffect(() => {
    const layers = adapter.current;
    if (!ready || layers === null || size === null) {
      return;
    }
    layers.sync(state, plan);
    layers.setView({
      clip: whole ? null : centeredRect(plan, false),
      cssSize: size,
      frameToCss: latest.current.frameToCss,
    });
    layers.setMode(band, tool);
    // oxlint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, state, size, matrixKey, whole, band, tool]);

  useEffect(() => {
    if (ready) {
      adapter.current?.select(selection);
    }
  }, [ready, selection, state]);

  // A Mosaic in the live view shows the whole frame as blocks.
  const hasMosaic = state.redactions.some((item) => item.kind === "mosaic");
  useEffect(() => {
    const layers = adapter.current;
    if (!ready || layers === null) {
      return;
    }
    if (!hasMosaic) {
      layers.setMosaicBase(null);
      return;
    }
    const photo = photoOf(tab.id, state);
    if (photo === null) {
      return;
    }
    const block =
      mosaicBlockSizeOf(plan.exportSize.width, plan.exportSize.height) *
      (plan.crop.width / plan.exportSize.width);
    const base = {
      height: Math.max(1, Math.ceil(plan.frame.height / block)),
      width: Math.max(1, Math.ceil(plan.frame.width / block)),
    };
    photo.draw({
      canvasToFrame: [
        plan.frame.width / base.width,
        0,
        0,
        plan.frame.height / base.height,
        -plan.frame.width / 2,
        -plan.frame.height / 2,
      ],
      plan,
      size: base,
      state,
      wholeFrame: true,
    });
    mosaicBase.current ??= document.createElement("canvas");
    const canvas = mosaicBase.current;
    canvas.width = base.width;
    canvas.height = base.height;
    canvas.getContext("2d")?.drawImage(photo.canvas, 0, 0);
    layers.setMosaicBase(canvas);
    // oxlint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, hasMosaic, photoOf, tab.id, state]);

  /* ------------------------------ the handle ------------------------------ */

  const drawThumbnail = useCallback<DrawThumbnail>(
    (canvas, filter) => {
      const { current } = latest;
      const photo = photoOf(tab.id, current.state);
      const context = canvas.getContext("2d");
      if (photo === null || context === null) {
        return;
      }
      const fit = Math.min(
        THUMBNAIL.width / current.plan.crop.width,
        THUMBNAIL.height / current.plan.crop.height
      );
      const thumb = {
        height: Math.max(1, Math.round(current.plan.crop.height * fit)),
        width: Math.max(1, Math.round(current.plan.crop.width * fit)),
      };
      photo.draw({
        canvasToFrame: exportMatrixOf(current.plan, thumb),
        plan: current.plan,
        size: thumb,
        state: { ...current.state, filter, filterStrength: 100 },
      });
      context.clearRect(0, 0, canvas.width, canvas.height);
      context.drawImage(
        photo.canvas,
        Math.round((canvas.width - thumb.width) / 2),
        Math.round((canvas.height - thumb.height) / 2)
      );
    },
    [latest, photoOf, tab.id]
  );

  useImperativeHandle(
    handle,
    () => ({
      adapter: () => adapter.current,
      drawThumbnail,
      viewCenter: () => {
        const { current } = latest;
        return applyMatrix(invertView(current.frameToCss), {
          x: current.stageSize.width / 2,
          y: current.stageSize.height / 2,
        });
      },
    }),
    [drawThumbnail, latest]
  );

  /* -------------------------------- the view ------------------------------ */

  useEffect(() => {
    const element = stage.current;
    if (element === null) {
      return;
    }
    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      const rect = element.getBoundingClientRect();
      const { current } = latest;
      current.onView(
        zoomView(current.view, Math.exp(-event.deltaY * 0.0015), {
          x: event.clientX - rect.left - rect.width / 2,
          y: event.clientY - rect.top - rect.height / 2,
        })
      );
    };
    element.addEventListener("wheel", onWheel, { passive: false });
    return () => {
      element.removeEventListener("wheel", onWheel);
    };
  }, [latest]);

  const pointers = useRef(new Map<number, Point>());
  const gesture = useRef<{
    readonly distance: number;
    readonly moved: boolean;
    readonly start: Point;
    readonly view: View;
  } | null>(null);

  const centerOf = (): { readonly distance: number } & Point => {
    const points = [...pointers.current.values()];
    const [first, second] = points;
    if (first === undefined) {
      return { distance: 0, x: 0, y: 0 };
    }
    if (second === undefined) {
      return { distance: 0, ...first };
    }
    return {
      distance: Math.hypot(second.x - first.x, second.y - first.y),
      x: (first.x + second.x) / 2,
      y: (first.y + second.y) / 2,
    };
  };

  const startGesture = () => {
    const center = centerOf();
    gesture.current = {
      distance: center.distance,
      moved: false,
      start: center,
      view,
    };
  };

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    pointers.current.set(event.pointerId, {
      x: event.clientX,
      y: event.clientY,
    });
    const pinch = pointers.current.size === 2;
    if (pinch || panning || picking || event.button === 1) {
      if (pinch) {
        adapter.current?.select(null);
      }
      event.currentTarget.setPointerCapture(event.pointerId);
      startGesture();
    }
  };

  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (!pointers.current.has(event.pointerId)) {
      return;
    }
    pointers.current.set(event.pointerId, {
      x: event.clientX,
      y: event.clientY,
    });
    const active = gesture.current;
    if (active === null) {
      return;
    }
    const center = centerOf();
    const dx = center.x - active.start.x;
    const dy = center.y - active.start.y;
    if (
      !active.moved &&
      Math.hypot(dx, dy) < CLICK_SLOP &&
      center.distance === 0
    ) {
      return;
    }
    gesture.current = { ...active, moved: true };
    const rect = event.currentTarget.getBoundingClientRect();
    const zoomed =
      active.distance > 0 && center.distance > 0
        ? zoomView(active.view, center.distance / active.distance, {
            x: active.start.x - rect.left - rect.width / 2,
            y: active.start.y - rect.top - rect.height / 2,
          })
        : active.view;
    onView(panView(zoomed, dx, dy));
  };

  const onPointerUp = (event: PointerEvent<HTMLDivElement>) => {
    const active = gesture.current;
    const wasSingle = pointers.current.size === 1;
    pointers.current.delete(event.pointerId);
    if (active === null) {
      return;
    }
    if (pointers.current.size > 0) {
      // One finger of a pinch stays: go on as a pan from here.
      startGesture();
      return;
    }
    gesture.current = null;
    if (picking && wasSingle && !active.moved && event.type === "pointerup") {
      const rect = event.currentTarget.getBoundingClientRect();
      const framePoint = applyMatrix(invertView(frameToCss), {
        x: event.clientX - rect.left,
        y: event.clientY - rect.top,
      });
      onPickFill(applyMatrix(plan.frameToSource, framePoint));
    }
  };

  const showLayers = !compare && size !== null;
  const backdrop =
    state.backdrop._tag === "Solid" ? cssOf(state.backdrop.color) : null;

  return (
    <div
      aria-label={t("easelStage")}
      className={cn(
        "easel-stage bg-muted relative min-h-0 touch-none overflow-hidden select-none",
        picking && "cursor-crosshair",
        panning && "cursor-grab"
      )}
      data-easel-compare={compare || undefined}
      data-easel-stage=""
      onPointerCancel={onPointerUp}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      ref={stage}
      role="group"
    >
      {size === null ? null : (
        <div
          aria-hidden="true"
          className={cn("absolute", backdrop === null && "easel-checker")}
          data-easel-backdrop-box=""
          style={{
            background: backdrop ?? undefined,
            height: (whole ? content.height * scale : cropBox.height) || 0,
            left: whole ? applyMatrix(frameToCss, content).x : cropBox.x,
            top: whole ? applyMatrix(frameToCss, content).y : cropBox.y,
            width: (whole ? content.width * scale : cropBox.width) || 0,
          }}
        />
      )}
      <canvas
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 size-full"
        data-easel-photo=""
        ref={photoCanvas}
        style={
          ellipse && !whole
            ? {
                clipPath: `ellipse(${cropBox.width / 2}px ${cropBox.height / 2}px at ${cropBox.x + cropBox.width / 2}px ${cropBox.y + cropBox.height / 2}px)`,
              }
            : undefined
        }
      />
      <div
        className={cn(
          "absolute inset-0",
          !showLayers && "invisible",
          (panning || picking || cropping || tool.kind === "none") &&
            "pointer-events-none"
        )}
        data-easel-layers=""
      >
        <canvas ref={layerCanvas} />
      </div>
      {whole && size !== null ? (
        <EaselCropOverlay
          box={cropBox}
          frame={plan.frame}
          onChange={(rect, gestureId) => {
            onChange({ _tag: "SetCrop", rect }, gestureId);
          }}
          onCommit={() => {
            controller.finishGesture();
          }}
          ratio={cropPresetOf(state.cropPreset).ratio}
          rect={{
            height: plan.crop.height / plan.frame.height,
            width: plan.crop.width / plan.frame.width,
            x: plan.crop.x / plan.frame.width,
            y: plan.crop.y / plan.frame.height,
          }}
          scale={scale}
          form={plan.form}
        />
      ) : null}
      {compare ? (
        <p className="bg-fg text-bg absolute top-2 left-2 px-2 py-1 text-xs font-bold tracking-[0.08em] uppercase">
          {t("easelCompareOriginal")}
        </p>
      ) : null}
    </div>
  );
};
