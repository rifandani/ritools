"use client";

/* oxlint-disable jsx-a11y/no-noninteractive-element-interactions, jsx-a11y/prefer-tag-over-role -- The crop box is a group that moves with the pointer and the arrow keys; its handles are buttons. */

import { useRef } from "react";
import type { KeyboardEvent, PointerEvent } from "react";

import {
  CROP_HANDLES,
  moveCrop,
  resizeCrop,
} from "@/features/easel/easel.geometry";
import type { CropHandle, Rect } from "@/features/easel/easel.geometry";
import type { Size } from "@/features/easel/easel.presets";
import { useTranslation } from "@/features/i18n/use-translation";

const HANDLE_POSITION: Readonly<Record<CropHandle, string>> = {
  e: "top-1/2 right-0 translate-x-1/2 -translate-y-1/2 cursor-ew-resize",
  n: "top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 cursor-ns-resize",
  ne: "top-0 right-0 translate-x-1/2 -translate-y-1/2 cursor-nesw-resize",
  nw: "top-0 left-0 -translate-x-1/2 -translate-y-1/2 cursor-nwse-resize",
  s: "bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 cursor-ns-resize",
  se: "right-0 bottom-0 translate-x-1/2 translate-y-1/2 cursor-nwse-resize",
  sw: "bottom-0 left-0 -translate-x-1/2 translate-y-1/2 cursor-nesw-resize",
  w: "top-1/2 left-0 -translate-x-1/2 -translate-y-1/2 cursor-ew-resize",
};

const ARROWS = new Map<string, readonly [number, number]>([
  ["ArrowLeft", [-1, 0]],
  ["ArrowRight", [1, 0]],
  ["ArrowUp", [0, -1]],
  ["ArrowDown", [0, 1]],
]);

/**
 * The crop box over the whole frame. A drag of the box moves the crop, and a
 * drag of a handle changes its size. One drag is one undo step. The arrow
 * keys do the same for a keyboard user.
 */
export const EaselCropOverlay = ({
  box,
  frame,
  onChange,
  onCommit,
  ratio,
  rect,
  scale,
  form,
}: {
  /** The crop box in the CSS pixels of the stage. */
  readonly box: Rect;
  readonly frame: Size;
  readonly onChange: (rect: Rect, gesture: string) => void;
  readonly onCommit: () => void;
  /** The pixel ratio the crop keeps, or `null`. */
  readonly ratio: number | null;
  /** The crop, normalized to the frame. */
  readonly rect: Rect;
  /** CSS pixels for one frame pixel. */
  readonly scale: number;
  readonly form: "ellipse" | "rectangle";
}) => {
  const { t } = useTranslation();
  const drag = useRef<{
    readonly gesture: string;
    readonly handle: CropHandle | null;
    readonly rect: Rect;
    readonly x: number;
    readonly y: number;
  } | null>(null);
  const sequence = useRef(0);

  const change = (
    handle: CropHandle | null,
    from: Rect,
    dx: number,
    dy: number,
    gesture: string
  ) => {
    onChange(
      handle === null
        ? moveCrop(from, dx, dy)
        : resizeCrop({ dx, dy, frame, handle, ratio, rect: from }),
      gesture
    );
  };

  const start = (handle: CropHandle | null) => (event: PointerEvent) => {
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    sequence.current += 1;
    drag.current = {
      gesture: `crop-${sequence.current}`,
      handle,
      rect,
      x: event.clientX,
      y: event.clientY,
    };
  };
  const move = (event: PointerEvent) => {
    const active = drag.current;
    if (active === null) {
      return;
    }
    event.stopPropagation();
    change(
      active.handle,
      active.rect,
      (event.clientX - active.x) / (scale * frame.width),
      (event.clientY - active.y) / (scale * frame.height),
      active.gesture
    );
  };
  const end = (event: PointerEvent) => {
    if (drag.current !== null) {
      event.stopPropagation();
      drag.current = null;
      onCommit();
    }
  };
  const onKey = (handle: CropHandle | null) => (event: KeyboardEvent) => {
    const arrow = ARROWS.get(event.key);
    if (arrow === undefined) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    const step = event.shiftKey ? 0.05 : 0.01;
    change(handle, rect, arrow[0] * step, arrow[1] * step, "crop-keys");
  };

  return (
    <div
      aria-label={t("easelCropBox")}
      className="absolute cursor-move touch-none shadow-[0_0_0_9999px_rgba(0,0,0,0.55)] outline-2 outline-white focus-visible:outline-4"
      data-easel-crop-box=""
      onBlur={onCommit}
      onKeyDown={onKey(null)}
      onPointerCancel={end}
      onPointerDown={start(null)}
      onPointerMove={move}
      onPointerUp={end}
      role="group"
      style={{
        height: box.height,
        left: box.x,
        top: box.y,
        width: box.width,
      }}
      // oxlint-disable-next-line jsx-a11y/no-noninteractive-tabindex -- the arrow keys move the crop box.
      tabIndex={0}
    >
      {form === "ellipse" ? (
        <div className="pointer-events-none absolute inset-0 rounded-full border-2 border-dashed border-white" />
      ) : (
        <div className="pointer-events-none absolute inset-0 grid grid-cols-3 grid-rows-3">
          {Array.from({ length: 9 }, (_, index) => (
            <span className="border border-white/35" key={index} />
          ))}
        </div>
      )}
      {CROP_HANDLES.map((handle) => (
        <button
          aria-label={t("easelCropHandle", { side: handle.toUpperCase() })}
          className={`border-fg absolute size-4 touch-none border-2 bg-white outline-offset-2 focus-visible:outline-2 ${HANDLE_POSITION[handle]}`}
          data-easel-crop-handle={handle}
          key={handle}
          onKeyDown={onKey(handle)}
          onPointerCancel={end}
          onPointerDown={start(handle)}
          onPointerMove={move}
          onPointerUp={end}
          type="button"
        />
      ))}
    </div>
  );
};
