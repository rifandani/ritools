import { useEffect } from "react";
import type {
  Dispatch,
  MutableRefObject,
  SetStateAction,
} from "react";
import type { DragEvent, RefObject } from "react";

export type TabPosition = {
  readonly id: string;
  readonly side: "before" | "after";
};

type DropState<T extends TabPosition> = Dispatch<SetStateAction<T | null>>;

export const updateTabDrop = <T extends TabPosition>(
  setDrop: DropState<T>,
  target: T | null
) => {
  setDrop((previous) =>
    previous?.id === target?.id && previous?.side === target?.side
      ? previous
      : target
  );
};

export const clearTabDropOnLeave = <T extends TabPosition>(
  event: DragEvent<HTMLElement>,
  dragX: MutableRefObject<number | null>,
  setDrop: DropState<T>
) => {
  if (
    !(event.relatedTarget instanceof Node) ||
    !event.currentTarget.contains(event.relatedTarget)
  ) {
    dragX.current = null;
    setDrop(null);
  }
};

export const useTabStripWheel = (
  strip: RefObject<HTMLElement | null>
) => {
  useEffect(() => {
    const element = strip.current;
    if (!element) {
      return;
    }
    const wheel = (event: WheelEvent) => {
      if (
        Math.abs(event.deltaY) > Math.abs(event.deltaX) &&
        element.scrollWidth > element.clientWidth
      ) {
        event.preventDefault();
        element.scrollLeft += event.deltaY;
      }
    };
    element.addEventListener("wheel", wheel, { passive: false });
    return () => element.removeEventListener("wheel", wheel);
  }, [strip]);
};

export const useTabStripAutoScroll = <T extends TabPosition>(
  strip: RefObject<HTMLElement | null>,
  dragX: MutableRefObject<number | null>,
  enabled: boolean,
  positionAt: (strip: HTMLElement, x: number) => T | null,
  setDrop: DropState<T>
) => {
  useEffect(() => {
    if (!enabled) {
      return;
    }
    let frame = 0;
    const scroll = () => {
      const element = strip.current;
      const x = dragX.current;
      if (element && x !== null) {
        const rect = element.getBoundingClientRect();
        const previousScroll = element.scrollLeft;
        if (x < rect.left + 40) {
          element.scrollLeft -= 8;
        } else if (x > rect.right - 40) {
          element.scrollLeft += 8;
        }
        if (element.scrollLeft !== previousScroll) {
          updateTabDrop(setDrop, positionAt(element, x));
        }
      }
      frame = requestAnimationFrame(scroll);
    };
    frame = requestAnimationFrame(scroll);
    return () => cancelAnimationFrame(frame);
  }, [dragX, enabled, positionAt, setDrop, strip]);
};
