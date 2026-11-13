"use client";

/* oxlint-disable eslint/complexity, react-doctor/no-giant-component -- The editor owns the toolbar, the plate, the panels, and the shortcuts of one File Tab in one layout. */

import { useEffect, useRef, useState } from "react";
import {
  HiArrowUturnLeft,
  HiArrowUturnRight,
  HiArrowPath,
  HiChevronDown,
  HiChevronUp,
  HiEye,
} from "react-icons/hi2";

import { FullscreenButton } from "@/core/components/fullscreen";
import { Button } from "@/core/components/ui/button";
import { Toggle } from "@/core/components/ui/toggle";
import { Tooltip, TooltipContent } from "@/core/components/ui/tooltip";
import { EaselKeys } from "@/features/easel/components/easel-keys";
import { EaselPanelAnnotate } from "@/features/easel/components/easel-panel-annotate";
import {
  EaselPanelFilter,
  EaselPanelFinetune,
} from "@/features/easel/components/easel-panel-color";
import type { DrawThumbnail } from "@/features/easel/components/easel-panel-color";
import { EaselPanelCrop } from "@/features/easel/components/easel-panel-crop";
import { EaselPanelFill } from "@/features/easel/components/easel-panel-fill";
import {
  EaselPanelRedact,
  EaselPanelWatermark,
} from "@/features/easel/components/easel-panel-mark";
import {
  EaselExportMenu,
  EaselPanelResize,
} from "@/features/easel/components/easel-panel-output";
import { EaselStage } from "@/features/easel/components/easel-stage";
import type { StageHandle } from "@/features/easel/components/easel-stage";
import { EaselZoom } from "@/features/easel/components/easel-zoom";
import {
  FIT_VIEW,
  formatBytes,
  ZOOM_STEP,
  zoomView,
} from "@/features/easel/easel";
import type { EaselKey, View } from "@/features/easel/easel";
import type { Point } from "@/features/easel/easel.geometry";
import type {
  Drawn,
  LayerBand,
  LayerTool,
} from "@/features/easel/easel.layers.browser";
import { renderPlanOf } from "@/features/easel/easel.plan";
import {
  canRedo,
  canUndo,
  ORIGINAL,
  PANELS,
} from "@/features/easel/easel.stack";
import type { Panel, Redaction, RgbaColor } from "@/features/easel/easel.stack";
import {
  DEFAULT_DRAFT,
  framePixels,
  newImageLayer,
  newRedaction,
  newFigureLayer,
  newTextLayer,
  RED,
} from "@/features/easel/easel.tools";
import type {
  AnnotateTool,
  Draft,
  RedactTool,
  Selection,
} from "@/features/easel/easel.tools";
import type { EaselController, EaselTab } from "@/features/easel/use-easel";
import { useTranslation } from "@/features/i18n/use-translation";

const PANEL_LABEL = {
  annotate: "easelPanelAnnotate",
  crop: "easelPanelCrop",
  fill: "easelPanelFill",
  filter: "easelPanelFilter",
  finetune: "easelPanelFinetune",
  redact: "easelPanelRedact",
  resize: "easelPanelResize",
  watermark: "easelPanelWatermark",
} as const satisfies Record<Panel, EaselKey>;

const ARROWS = new Map<string, readonly [number, number]>([
  ["arrowdown", [0, 1]],
  ["arrowleft", [-1, 0]],
  ["arrowright", [1, 0]],
  ["arrowup", [0, -1]],
]);

let idSequence = 0;
const nextId = (prefix: string): string => {
  idSequence += 1;
  return `${prefix}-${Date.now().toString(36)}-${idSequence}`;
};

const isTyping = (target: EventTarget | null): boolean =>
  target instanceof HTMLElement &&
  (target.isContentEditable ||
    ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName));

/** The editor of one File Tab: the toolbar on top, the plate at right, the tool panels at left. */
export const EaselEditor = ({
  controller,
  tab,
}: {
  readonly controller: EaselController;
  readonly tab: EaselTab;
}) => {
  const { t, locale } = useTranslation();
  const [panel, setPanel] = useState<Panel>("crop");
  const [annotateTool, setAnnotateTool] = useState<AnnotateTool>("select");
  const [redactTool, setRedactTool] = useState<RedactTool>("rect");
  const [redactKind, setRedactKind] = useState<Redaction["kind"]>("cover");
  const [draft, setDraft] = useState<Draft>(DEFAULT_DRAFT);
  const [fillColor, setFillColor] = useState<RgbaColor>(RED);
  const [fillTolerance, setFillTolerance] = useState(20);
  const [selectedFill, setSelectedFill] = useState<string | null>(null);
  const [selection, setSelection] = useState<Selection | null>(null);
  const [compare, setCompare] = useState(false);
  const [spaceHeld, setSpaceHeld] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(true);
  const [view, setView] = useState<View>(FIT_VIEW);
  const stage = useRef<StageHandle>(null);

  const state = tab.stack.present;
  const plan = renderPlanOf({
    format: tab.format,
    name: tab.name,
    source: tab.source,
    state,
  });
  const { frame } = plan;

  const band: LayerBand | null =
    panel === "annotate"
      ? "annotation"
      : panel === "redact"
        ? "redaction"
        : null;
  const tool: LayerTool =
    panel === "annotate"
      ? annotateTool === "select"
        ? { kind: "select" }
        : annotateTool === "text"
          ? { kind: "text" }
          : { kind: "figure", form: annotateTool }
      : panel === "redact"
        ? redactTool === "select"
          ? { kind: "select" }
          : {
              kind: "redact",
              form: redactTool,
              size: framePixels(frame, draft.brush, 4),
            }
        : { kind: "none" };
  const cropping = panel === "crop";
  const picking = panel === "fill" && !spaceHeld;
  const panning =
    spaceHeld || (tool.kind === "none" && !cropping && panel !== "fill");

  const choosePanel = (next: Panel) => {
    setPanel(next);
    setSelection(null);
    setView(FIT_VIEW);
  };

  const onDrawn = (drawn: Drawn) => {
    if (drawn.kind === "text") {
      const id = nextId("text");
      controller.apply({
        _tag: "AddLayer",
        layer: newTextLayer({
          at: drawn.at,
          draft,
          frame,
          id,
          text: t("easelTextDefault"),
        }),
      });
      setAnnotateTool("select");
      setSelection({ band: "annotation", id });
      // The Layer adapter has the new object after the next render.
      setTimeout(() => {
        stage.current?.adapter()?.editText(id);
      }, 60);
      return;
    }
    if (drawn.kind === "figure") {
      const id = nextId(drawn.form);
      controller.apply({
        _tag: "AddLayer",
        layer: newFigureLayer({
          box: drawn.box,
          draft,
          frame,
          id,
          kind: drawn.form,
          rotation: drawn.rotation,
        }),
      });
      setAnnotateTool("select");
      setSelection({ band: "annotation", id });
      return;
    }
    controller.apply({
      _tag: "AddRedaction",
      redaction: newRedaction({
        color: draft.cover,
        id: nextId(redactKind),
        kind: redactKind,
        area:
          drawn.form === "brush"
            ? { points: drawn.points, form: "brush", size: drawn.size }
            : { box: drawn.box, form: drawn.form },
      }),
    });
  };

  const addImageLayer = async (file: File) => {
    const asset = await controller.addAsset(file);
    if (asset === null) {
      return;
    }
    const id = nextId("image");
    controller.apply({
      _tag: "AddLayer",
      layer: newImageLayer({
        assetId: asset.id,
        at: stage.current?.viewCenter() ?? { x: 0, y: 0 },
        draft,
        frame,
        id,
        size: asset,
      }),
    });
    setAnnotateTool("select");
    setSelection({ band: "annotation", id });
  };

  const pickFill = (point: Point) => {
    if (
      point.x < 0 ||
      point.y < 0 ||
      point.x >= tab.source.width ||
      point.y >= tab.source.height
    ) {
      return;
    }
    const id = nextId("fill");
    controller.apply({
      _tag: "AddFill",
      fill: { color: fillColor, id, point, tolerance: fillTolerance },
    });
    setSelectedFill(id);
  };

  const removeSelection = () => {
    if (selection === null) {
      return;
    }
    controller.apply(
      selection.band === "annotation"
        ? { _tag: "RemoveLayer", id: selection.id }
        : { _tag: "RemoveRedaction", id: selection.id }
    );
    setSelection(null);
  };

  const shortcuts = {
    controller,
    removeSelection,
    selection,
    state,
  };
  const latest = useRef(shortcuts);
  useEffect(() => {
    latest.current = shortcuts;
  });

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (isTyping(event.target)) {
        return;
      }
      const { current } = latest;
      const key = event.key.toLowerCase();
      if ((event.metaKey || event.ctrlKey) && (key === "z" || key === "y")) {
        event.preventDefault();
        if (event.shiftKey || key === "y") {
          current.controller.redo();
        } else {
          current.controller.undo();
        }
        return;
      }
      if (event.metaKey || event.ctrlKey || event.altKey) {
        return;
      }
      if (key === " ") {
        // A focused button keeps Space for its own press.
        if (!(event.target instanceof HTMLButtonElement)) {
          event.preventDefault();
          setSpaceHeld(true);
        }
        return;
      }
      if (key === "c") {
        setCompare(true);
        return;
      }
      if (key === "+" || key === "=") {
        setView((now) => zoomView(now, ZOOM_STEP));
        return;
      }
      if (key === "-") {
        setView((now) => zoomView(now, 1 / ZOOM_STEP));
        return;
      }
      if (key === "0") {
        setView(FIT_VIEW);
        return;
      }
      if (key === "escape") {
        setSelection(null);
        return;
      }
      if (key === "delete" || key === "backspace") {
        if (current.selection !== null) {
          event.preventDefault();
          current.removeSelection();
        }
        return;
      }
      const arrow = ARROWS.get(key);
      const selected = current.selection;
      if (
        arrow !== undefined &&
        selected?.band === "annotation" &&
        !(
          event.target instanceof HTMLElement &&
          event.target.closest("[role=slider],[data-easel-crop-box]")
        )
      ) {
        const layer = current.state.layers.find(
          (item) => item.id === selected.id
        );
        if (layer !== undefined && !layer.locked) {
          event.preventDefault();
          const step = event.shiftKey ? 10 : 1;
          current.controller.apply(
            {
              _tag: "UpdateLayer",
              id: layer.id,
              patch: {
                x: layer.x + arrow[0] * step,
                y: layer.y + arrow[1] * step,
              },
            },
            `nudge-${layer.id}`
          );
        }
      }
    };
    const onKeyUp = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();
      if (key === " ") {
        setSpaceHeld(false);
      } else if (key === "c") {
        setCompare(false);
      } else if (key.startsWith("arrow")) {
        latest.current.controller.finishGesture();
      }
    };
    const onBlur = () => {
      setSpaceHeld(false);
      setCompare(false);
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("blur", onBlur);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", onBlur);
    };
  }, []);

  const drawThumbnail: DrawThumbnail = (canvas, filter) => {
    stage.current?.drawThumbnail(canvas, filter);
  };

  const percent = Math.round(view.zoom * 100);

  const factsLine = [
    `${tab.source.width} × ${tab.source.height}`,
    formatBytes(tab.byteSize, locale),
  ].join(" · ");

  return (
    <div className="easel-editor" data-easel-editor={tab.id}>
      <div
        aria-label={t("easelToolbar")}
        className="easel-bar easel-toolbar"
        role="toolbar"
      >
        <EaselZoom
          onFit={() => {
            setView(FIT_VIEW);
          }}
          onZoomIn={() => {
            setView((now) => zoomView(now, ZOOM_STEP));
          }}
          onZoomOut={() => {
            setView((now) => zoomView(now, 1 / ZOOM_STEP));
          }}
          onZoomTo={(level) => {
            // The view zooms by the ratio to the wanted level; `zoomView` clamps it.
            setView((now) => zoomView(now, level / 100 / now.zoom));
          }}
          percent={percent}
        />
        <nav aria-label={t("easelPanels")} className="easel-panels">
          {PANELS.map((entry) => (
            <Toggle
              data-easel-panel-tab={entry}
              isSelected={panel === entry}
              key={entry}
              onPress={() => {
                choosePanel(entry);
                setSheetOpen(true);
              }}
              size="sm"
            >
              {t(PANEL_LABEL[entry])}
            </Toggle>
          ))}
        </nav>
        <span className="easel-actions flex items-center gap-x-1">
          <Tooltip delay={300}>
            <Button
              aria-label={t("easelCompare")}
              aria-pressed={compare}
              id="easel-compare"
              intent="outline"
              onPressEnd={() => {
                setCompare(false);
              }}
              onPressStart={() => {
                setCompare(true);
              }}
              size="sq-sm"
            >
              <HiEye aria-hidden="true" />
            </Button>
            <TooltipContent placement="bottom">
              {t("easelCompare")}
            </TooltipContent>
          </Tooltip>
          <Tooltip delay={300}>
            <Button
              aria-label={t("easelUndo")}
              id="easel-undo"
              intent="outline"
              isDisabled={!canUndo(tab.stack)}
              onPress={() => {
                controller.undo();
              }}
              size="sq-sm"
            >
              <HiArrowUturnLeft aria-hidden="true" />
            </Button>
            <TooltipContent placement="bottom">{t("easelUndo")}</TooltipContent>
          </Tooltip>
          <Tooltip delay={300}>
            <Button
              aria-label={t("easelRedo")}
              id="easel-redo"
              intent="outline"
              isDisabled={!canRedo(tab.stack)}
              onPress={() => {
                controller.redo();
              }}
              size="sq-sm"
            >
              <HiArrowUturnRight aria-hidden="true" />
            </Button>
            <TooltipContent placement="bottom">{t("easelRedo")}</TooltipContent>
          </Tooltip>
          <Tooltip delay={300}>
            <Button
              aria-label={t("easelRevert")}
              id="easel-revert"
              intent="outline"
              isDisabled={state === ORIGINAL}
              onPress={() => {
                setSelection(null);
                setSelectedFill(null);
                controller.apply({ _tag: "Revert" });
              }}
              size="sq-sm"
            >
              <HiArrowPath aria-hidden="true" />
            </Button>
            <TooltipContent placement="bottom">
              {t("easelRevert")}
            </TooltipContent>
          </Tooltip>
          <EaselKeys />
          <FullscreenButton id="easel-fullscreen" size="sq-sm" />
          <EaselExportMenu
            controller={controller}
            plan={plan}
            state={state}
            tab={tab}
          />
        </span>
      </div>

      <div className="easel-view">
        <EaselStage
          band={band}
          compare={compare}
          controller={controller}
          cropping={cropping}
          handle={stage}
          onChange={(change, gesture) => {
            controller.apply(change, gesture);
          }}
          onDrawn={onDrawn}
          onPickFill={pickFill}
          onSelect={setSelection}
          onView={setView}
          panning={panning}
          picking={picking}
          plan={plan}
          selection={selection}
          state={state}
          tab={tab}
          tool={tool}
          view={view}
        />
        <p
          className="num text-muted-fg border-rule border-t-2 px-3 py-2 text-xs"
          id="easel-facts"
        >
          {factsLine}
        </p>
      </div>

      <aside
        aria-label={t("easelDesk")}
        className="easel-desk bg-bg flex min-w-0 flex-col"
        data-sheet={sheetOpen ? "open" : "closed"}
      >
        <div className="easel-bar flex justify-end lg:hidden">
          <Button
            aria-expanded={sheetOpen}
            aria-label={t(sheetOpen ? "easelSheetClose" : "easelSheetOpen")}
            intent="outline"
            onPress={() => {
              setSheetOpen((open) => !open);
            }}
            size="sq-sm"
          >
            {sheetOpen ? (
              <HiChevronDown aria-hidden="true" />
            ) : (
              <HiChevronUp aria-hidden="true" />
            )}
          </Button>
        </div>

        <div className="easel-desk-body divide-rule flex flex-col divide-y-2">
          {panel === "crop" ? (
            <EaselPanelCrop controller={controller} state={state} tab={tab} />
          ) : null}
          {panel === "finetune" ? (
            <EaselPanelFinetune controller={controller} state={state} />
          ) : null}
          {panel === "filter" ? (
            <EaselPanelFilter
              controller={controller}
              drawThumbnail={drawThumbnail}
              state={state}
            />
          ) : null}
          {panel === "fill" ? (
            <EaselPanelFill
              color={fillColor}
              controller={controller}
              onColor={setFillColor}
              onSelect={setSelectedFill}
              onTolerance={setFillTolerance}
              selectedId={selectedFill}
              state={state}
              tolerance={fillTolerance}
            />
          ) : null}
          {panel === "annotate" ? (
            <EaselPanelAnnotate
              controller={controller}
              draft={draft}
              frame={frame}
              onAddImage={(file) => {
                void addImageLayer(file);
              }}
              onDraft={(patch) => {
                setDraft((current) => ({ ...current, ...patch }));
              }}
              onSelect={setSelection}
              onTool={(next) => {
                setAnnotateTool(next);
                if (next !== "select") {
                  setSelection(null);
                }
              }}
              selection={selection}
              state={state}
              tool={annotateTool}
            />
          ) : null}
          {panel === "watermark" ? (
            <EaselPanelWatermark controller={controller} state={state} />
          ) : null}
          {panel === "redact" ? (
            <EaselPanelRedact
              brush={draft.brush}
              color={draft.cover}
              controller={controller}
              frame={frame}
              kind={redactKind}
              onBrush={(brush) => {
                setDraft((current) => ({ ...current, brush }));
              }}
              onColor={(cover) => {
                setDraft((current) => ({ ...current, cover }));
              }}
              onKind={setRedactKind}
              onSelect={setSelection}
              onTool={(next) => {
                setRedactTool(next);
                if (next !== "select") {
                  setSelection(null);
                }
              }}
              selection={selection}
              state={state}
              tool={redactTool}
            />
          ) : null}
          {panel === "resize" ? (
            <EaselPanelResize
              controller={controller}
              plan={plan}
              state={state}
            />
          ) : null}
        </div>
      </aside>
    </div>
  );
};
