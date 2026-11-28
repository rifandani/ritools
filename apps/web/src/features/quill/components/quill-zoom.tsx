/* oxlint-disable jsx-a11y/no-noninteractive-element-interactions, jsx-a11y/no-noninteractive-tabindex -- The zoom stage is an application region: it takes focus, the wheel, drags, and keys. */
import { createContext, use, useEffect, useId, useRef, useState } from "react";
import type { KeyboardEvent, MouseEvent } from "react";
import { mergeProps } from "react-aria/mergeProps";
import { useMove } from "react-aria/useMove";
import {
  HiArrowsPointingIn,
  HiMagnifyingGlassMinus,
  HiMagnifyingGlassPlus,
} from "react-icons/hi2";

import { Button } from "@/core/components/ui/button";
import { ModalContent, ModalTitle } from "@/core/components/ui/modal";
import { Toolbar } from "@/core/components/ui/toolbar";
import { useTranslation } from "@/features/i18n/use-translation";

import {
  clampPan,
  fitSize,
  panBy,
  stepScale,
  typedScale,
  wheelScale,
  ZOOM_FIT,
  ZOOM_MAX,
  ZOOM_MIN,
  zoomAt,
  zoomPercent,
} from "../quill.zoom";
import type { Point, Size, ZoomView } from "../quill.zoom";

export interface ZoomTarget {
  readonly src: string;
  readonly alt: string;
  /** The size of the figure in the reader, used for its aspect ratio. */
  readonly natural: Size;
}

/** The reader supplies this; a figure outside a reader does not open a zoom view. */
export const QuillZoomContext = createContext<
  ((target: ZoomTarget) => void) | null
>(null);

/** One arrow key press moves a zoomed figure this many pixels. */
const KEY_PAN = 48;
/** A double-click on the fitted figure zooms to this level. */
const DOUBLE_CLICK_SCALE = 2;
const LINE_HEIGHT = 16;

/** A block figure in the reader. A click opens it in the zoom view. */
export const QuillZoomFigure = ({
  alt,
  src,
  vector,
}: {
  readonly alt: string;
  readonly src: string;
  readonly vector: string | undefined;
}) => {
  const { t } = useTranslation();
  const open = use(QuillZoomContext);
  return (
    <button
      aria-haspopup="dialog"
      className="quill-zoom-trigger"
      onClick={(event: MouseEvent<HTMLButtonElement>) => {
        const image = event.currentTarget.querySelector("img");
        open?.({
          alt,
          src: vector ?? src,
          natural: {
            width: image?.naturalWidth ?? 0,
            height: image?.naturalHeight ?? 0,
          },
        });
      }}
      title={t("quillZoomOpen")}
      type="button"
    >
      <img
        alt={alt}
        className="max-h-[36rem] max-w-full object-contain"
        src={src}
      />
    </button>
  );
};

const useStageSize = () => {
  const stage = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState<Size>({ width: 0, height: 0 });
  useEffect(() => {
    const node = stage.current;
    if (!node) {
      return;
    }
    const observer = new ResizeObserver(([entry]) => {
      if (entry) {
        setBox({
          width: entry.contentRect.width,
          height: entry.contentRect.height,
        });
      }
    });
    observer.observe(node);
    return () => {
      observer.disconnect();
    };
  }, []);
  return { stage, box };
};

const anchorOf = (node: HTMLElement, clientX: number, clientY: number) => {
  const rect = node.getBoundingClientRect();
  return {
    x: clientX - rect.left - rect.width / 2,
    y: clientY - rect.top - rect.height / 2,
  } satisfies Point;
};

const ZoomStage = ({ target }: { readonly target: ZoomTarget }) => {
  const { t } = useTranslation();
  const { stage, box } = useStageSize();
  const [view, setView] = useState<ZoomView>(ZOOM_FIT);
  const [moving, setMoving] = useState(false);
  const natural =
    target.natural.width > 0 && target.natural.height > 0
      ? target.natural
      : box;
  const fitted = fitSize(natural, box);
  const shown = clampPan(view, fitted, box);
  const hint = useId();

  useEffect(() => {
    const node = stage.current;
    if (!node) {
      return;
    }
    // React adds wheel listeners as passive, and a passive listener cannot stop the page scroll.
    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      const unit =
        event.deltaMode === WheelEvent.DOM_DELTA_LINE
          ? LINE_HEIGHT
          : event.deltaMode === WheelEvent.DOM_DELTA_PAGE
            ? box.height
            : 1;
      // A trackpad pinch arrives as a wheel event with `ctrlKey` and small steps.
      const delta = event.deltaY * unit * (event.ctrlKey ? 4 : 1);
      const anchor = anchorOf(node, event.clientX, event.clientY);
      setView((current) =>
        zoomAt(current, wheelScale(current.scale, delta), fitted, box, anchor)
      );
    };
    node.addEventListener("wheel", onWheel, { passive: false });
    return () => {
      node.removeEventListener("wheel", onWheel);
    };
  }, [stage, box, fitted]);

  const { moveProps } = useMove({
    onMoveStart: () => setMoving(true),
    onMove: (event) => {
      const factor = event.pointerType === "keyboard" ? KEY_PAN : 1;
      setView((current) =>
        panBy(
          current,
          { x: event.deltaX * factor, y: event.deltaY * factor },
          fitted,
          box
        )
      );
    },
    onMoveEnd: () => setMoving(false),
  });

  const zoomStep = (direction: 1 | -1) =>
    setView((current) =>
      zoomAt(current, stepScale(current.scale, direction), fitted, box)
    );
  /* The typed level while the field has focus; `null` shows the live level. */
  const [draft, setDraft] = useState<string | null>(null);
  const commitDraft = () => {
    const scale = draft === null ? null : typedScale(draft);
    setDraft(null);
    if (scale !== null) {
      setView((current) => zoomAt(current, scale, fitted, box));
    }
  };
  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "+" || event.key === "=") {
      event.preventDefault();
      zoomStep(1);
    } else if (event.key === "-") {
      event.preventDefault();
      zoomStep(-1);
    } else if (event.key === "0") {
      event.preventDefault();
      setView(ZOOM_FIT);
    }
  };

  return (
    <>
      <div className="quill-zoom-header">
        <ModalTitle className="quill-zoom-title">
          {t("quillZoomTitle")}
        </ModalTitle>
        <Toolbar
          aria-label={t("quillZoomControls")}
          className="quill-zoom-toolbar border-0 bg-transparent p-0"
        >
          <Button
            aria-label={t("quillZoomOut")}
            intent="outline"
            isDisabled={shown.scale <= ZOOM_MIN}
            onPress={() => zoomStep(-1)}
            size="sq-sm"
          >
            <HiMagnifyingGlassMinus aria-hidden />
          </Button>
          <span className="quill-zoom-field">
            <input
              aria-label={t("quillZoomLevel")}
              autoComplete="off"
              className="quill-zoom-level num"
              inputMode="numeric"
              onBlur={commitDraft}
              onChange={(event) => {
                setDraft(event.target.value.replaceAll(/\D/gu, ""));
              }}
              onFocus={(event) => {
                setDraft(String(zoomPercent(shown.scale)));
                event.currentTarget.select();
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  commitDraft();
                } else if (event.key === "Escape") {
                  // A changed value reverts first; a second Escape closes the view.
                  if (
                    draft !== null &&
                    draft !== String(zoomPercent(shown.scale))
                  ) {
                    event.preventDefault();
                    event.stopPropagation();
                  }
                  setDraft(null);
                }
              }}
              pattern="\d*"
              spellCheck={false}
              type="text"
              value={draft ?? String(zoomPercent(shown.scale))}
            />
            <span aria-hidden="true">%</span>
          </span>
          <Button
            aria-label={t("quillZoomIn")}
            intent="outline"
            isDisabled={shown.scale >= ZOOM_MAX}
            onPress={() => zoomStep(1)}
            size="sq-sm"
          >
            <HiMagnifyingGlassPlus aria-hidden />
          </Button>
          <Button
            intent="outline"
            isDisabled={shown.scale === 1 && shown.x === 0 && shown.y === 0}
            onPress={() => setView(ZOOM_FIT)}
            size="sm"
          >
            <HiArrowsPointingIn aria-hidden />
            {t("quillZoomFit")}
          </Button>
        </Toolbar>
      </div>
      <div
        {...mergeProps(moveProps, { onKeyDown })}
        aria-describedby={hint}
        aria-label={target.alt}
        className="quill-zoom-stage"
        data-moving={moving || undefined}
        onDoubleClick={(event) => {
          const anchor = anchorOf(
            event.currentTarget,
            event.clientX,
            event.clientY
          );
          setView((current) =>
            current.scale > 1
              ? ZOOM_FIT
              : zoomAt(current, DOUBLE_CLICK_SCALE, fitted, box, anchor)
          );
        }}
        ref={stage}
        aria-roledescription={t("quillZoomStage")}
        role="application"
        tabIndex={0}
      >
        <img
          alt=""
          className="quill-zoom-image"
          draggable={false}
          src={target.src}
          style={{
            width: fitted.width * shown.scale,
            height: fitted.height * shown.scale,
            transform: `translate(-50%, -50%) translate(${shown.x}px, ${shown.y}px)`,
          }}
        />
      </div>
      <p className="quill-zoom-hint" id={hint}>
        {t("quillZoomHint")}
      </p>
    </>
  );
};

/** A centered view of one figure. The wheel zooms, a drag moves it, and Escape closes it. */
export const QuillZoomDialog = ({
  target,
  isOpen,
  onClose,
}: {
  readonly target: ZoomTarget | null;
  readonly isOpen: boolean;
  readonly onClose: () => void;
}) => {
  const { t } = useTranslation();
  return (
    <ModalContent
      aria-label={t("quillZoomTitle")}
      className="quill-zoom"
      isOpen={isOpen}
      onOpenChange={(open) => {
        if (!open) {
          onClose();
        }
      }}
      overlay={{ className: "sm:grid-rows-[1fr_auto_1fr]" }}
      size="fullscreen"
    >
      {/* A new figure starts at the fitted level. */}
      {target ? <ZoomStage key={target.src} target={target} /> : null}
    </ModalContent>
  );
};
