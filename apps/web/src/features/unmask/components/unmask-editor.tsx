"use client";

/* oxlint-disable complexity, react-doctor/no-giant-component -- The editor prints the plate, the Brush tray, the desk, and the result from one Matte session; the browser suite is the acceptance. */

import { useEffect, useRef, useState } from "react";
import { HiArrowUturnLeft, HiLink } from "react-icons/hi2";

import { Button } from "@/core/components/ui/button";
import { useTranslation } from "@/features/i18n/use-translation";
import { UnmaskCanvas } from "@/features/unmask/components/unmask-canvas";
import type { BrushTool } from "@/features/unmask/components/unmask-magic-brush";
import { UnmaskMagicBrush } from "@/features/unmask/components/unmask-magic-brush";
import { UnmaskResult } from "@/features/unmask/components/unmask-result";
import { UnmaskSettingsBar } from "@/features/unmask/components/unmask-settings-bar";
import type { ToolbarReason } from "@/features/unmask/unmask";
import {
  DEFAULT_BRUSH_SIZE,
  DEFAULT_TOLERANCE,
  formatBytes,
  formatLabelKey,
  jpegBlocked,
  ROW_STATE_KEY,
} from "@/features/unmask/unmask";
import type {
  Matte,
  MatteMode,
  OperationId,
  Pixel,
} from "@/features/unmask/unmask.engine";
import type {
  UnmaskController,
  UnmaskItem,
} from "@/features/unmask/use-unmask";

interface EditorProps {
  readonly controller: UnmaskController;
  readonly item: UnmaskItem;
}

/** The Cutting Room: the plate at left, the cutting desk at right. */
export const UnmaskEditor = ({ controller, item }: EditorProps) => {
  const { t, locale } = useTranslation();
  const [tool, setTool] = useState<BrushTool>("wand");
  const [mode, setMode] = useState<MatteMode>("restore");
  const [ghost, setGhost] = useState(true);
  const [brushSize, setBrushSize] = useState(DEFAULT_BRUSH_SIZE);
  const [tolerance, setTolerance] = useState(DEFAULT_TOLERANCE);
  const [connectivity, setConnectivity] = useState<4 | 8>(8);
  const [compare, setCompare] = useState(false);
  const [compareAt, setCompareAt] = useState(50);
  const [strokePreview, setStrokePreview] = useState<Matte | null>(null);
  const operationSequence = useRef(0);

  const busy = controller.running;
  const disabledReason: ToolbarReason | null = busy
    ? "unmaskToolbarPaused"
    : compare
      ? "unmaskCompareActive"
      : item.previewBase === null
        ? "unmaskToolbarNoCutout"
        : null;

  const nextOperationId = () => {
    operationSequence.current += 1;
    // SAFETY: The engine owns the operation namespace; the counter makes it
    // unique, and no file text is part of the id.
    return `unmask-op-${operationSequence.current}` as OperationId;
  };

  const previewStroke = (points: readonly Pixel[] | null) => {
    if (points === null || points.length === 0) {
      setStrokePreview(null);
      return;
    }
    setStrokePreview(controller.previewStroke(points, brushSize, mode));
  };

  const applyBrush = (points: readonly Pixel[]) => {
    if (item.previewBase === null || points.length === 0) {
      return;
    }
    controller.applyOperation({
      _tag: "Brush",
      mode,
      operationId: nextOperationId(),
      points,
      size: brushSize,
    });
    setStrokePreview(null);
  };

  const applyWand = (seed: Pixel) => {
    controller.applyOperation({
      _tag: "Wand",
      connectivity,
      mode,
      operationId: nextOperationId(),
      seed,
      tolerance,
    });
  };

  useEffect(() => {
    document.querySelector<HTMLElement>("#unmask-canvas-heading")?.focus();
  }, []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const { target } = event;
      if (
        target instanceof HTMLElement &&
        (target.isContentEditable ||
          ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName))
      ) {
        return;
      }
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "z") {
        event.preventDefault();
        if (event.shiftKey) {
          controller.redo();
        } else {
          controller.undo();
        }
        return;
      }
      switch (event.key.toLowerCase()) {
        case "w": {
          setTool("wand");
          break;
        }
        case "b": {
          setTool("brush");
          break;
        }
        case "r": {
          setMode("restore");
          break;
        }
        case "e": {
          setMode("erase");
          break;
        }
        case "[": {
          event.preventDefault();
          setBrushSize((current) => Math.max(1, current - 1));
          break;
        }
        case "]": {
          event.preventDefault();
          setBrushSize((current) => Math.min(200, current + 1));
          break;
        }
        default: {
          break;
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
    };
  }, [controller]);

  const hasResult = item.result !== null;
  const alphaKept = item.notes.some((note) => note._tag === "InputAlpha");
  const blockedByJpeg =
    jpegBlocked(controller.settings) && controller.settings.format === "jpeg";
  const cutOutDisabled = item.claimedFormat === null || blockedByJpeg;
  const format = item.facts?.format ?? item.claimedFormat;
  const factsLine = [
    item.facts === null ? null : `${item.facts.width} × ${item.facts.height}`,
    formatBytes(item.byteSize, locale),
    format === null ? null : t(formatLabelKey(format)),
  ]
    .filter((part): part is string => part !== null)
    .join(" · ");

  return (
    <div className="grid min-w-0 gap-8 lg:grid-cols-[minmax(0,8fr)_minmax(20rem,3fr)]">
      <div className="min-w-0">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <span className="text-muted-fg text-xs font-bold tracking-[0.08em] uppercase [font-stretch:87.5%]">
            {t("unmaskCanvasLabel")}
          </span>
          {controller.batch.length > 1 ? (
            <Button
              intent="plain"
              onPress={() => {
                controller.open(null);
                requestAnimationFrame(() => {
                  document
                    .querySelector<HTMLElement>("#unmask-batch-heading")
                    ?.focus();
                });
              }}
              size="xs"
            >
              <HiArrowUturnLeft aria-hidden />
              {t("unmaskBackToBatch")}
            </Button>
          ) : null}
        </div>

        {item.preview === null ||
        item.facts === null ||
        item.source === null ? (
          <div className="border-input flex min-h-64 flex-col items-center justify-center border-2 px-4 py-10 text-center">
            <p className="font-display text-2xl font-black uppercase [font-stretch:75%]">
              {t("unmaskCanvasEmpty")}
            </p>
            <p className="text-muted-fg mt-2 text-sm">
              {t(ROW_STATE_KEY[item.state])}
            </p>
          </div>
        ) : (
          <UnmaskCanvas
            brushSize={brushSize}
            compare={compare}
            compareAt={compareAt}
            disabledReason={disabledReason}
            ghost={ghost}
            item={item}
            mode={mode}
            onBrush={applyBrush}
            onCompare={(next) => {
              setCompare(next);
              if (next) {
                setStrokePreview(null);
              }
            }}
            onCompareAt={setCompareAt}
            onStrokePreview={previewStroke}
            onWand={applyWand}
            settings={controller.settings}
            strokePreview={strokePreview}
            tool={tool}
          />
        )}

        <p className="num text-muted-fg mt-2 text-xs" id="unmask-facts">
          {factsLine}
        </p>

        <UnmaskMagicBrush
          brushSize={brushSize}
          connectivity={connectivity}
          disabledReason={disabledReason}
          ghost={ghost}
          mode={mode}
          onBrushSize={setBrushSize}
          onConnectivity={setConnectivity}
          onGhost={setGhost}
          onMode={setMode}
          onRedo={() => {
            controller.redo();
          }}
          onReset={() => {
            controller.resetMatte();
          }}
          onTool={setTool}
          onTolerance={setTolerance}
          onUndo={() => {
            controller.undo();
          }}
          operationCount={item.operations.length}
          redoCount={item.redo.length}
          tolerance={tolerance}
          tool={tool}
        />

        {item.error === null ? null : (
          <p className="text-danger-subtle-fg mt-3 text-sm" role="alert">
            {t("unmaskDidNotOpen")}
          </p>
        )}
      </div>

      <aside className="min-w-0">
        <UnmaskSettingsBar
          heading={t("unmaskBatchSettingsHeading")}
          onChange={(next) => {
            controller.changeSettings(next);
          }}
          settings={controller.settings}
        />

        <div className="mt-4">
          <Button
            className="w-full"
            id="unmask-cut-out"
            intent="primary"
            isDisabled={busy ? false : cutOutDisabled}
            onPress={() => {
              if (busy) {
                controller.cancel();
                return;
              }
              controller.retry(item.id);
            }}
            size="md"
          >
            {busy
              ? t("unmaskCancel")
              : hasResult
                ? t("unmaskCutOutAgain")
                : t("unmaskCutOut")}
          </Button>
          {blockedByJpeg ? (
            <p className="text-danger-subtle-fg mt-1 text-xs">
              {t("unmaskCutOutDisabledTransparentJpeg")}
            </p>
          ) : null}
        </div>

        <div className="border-rule mt-3 border-t-2 pt-3">
          <p className="text-muted-fg text-xs leading-4">
            {alphaKept
              ? t("unmaskResultAlpha")
              : hasResult
                ? t("unmaskModelCached")
                : t("unmaskModelFirstRun")}
          </p>
          {alphaKept ? null : (
            <p className="mt-1 flex flex-wrap items-center gap-x-2 text-xs">
              <span className="font-semibold">{t("unmaskResultModel")}</span>
              <a
                className="text-primary-ink inline-flex items-center gap-1 underline"
                href="https://github.com/xrds/isnet-general-onnx-int8"
                rel="noreferrer"
                target="_blank"
              >
                <HiLink aria-hidden />
                {t("unmaskModelLink")}
              </a>
            </p>
          )}
        </div>

        <UnmaskResult
          item={item}
          onBackToBatch={
            controller.batch.length > 1
              ? () => {
                  controller.open(null);
                  requestAnimationFrame(() => {
                    document
                      .querySelector<HTMLElement>("#unmask-batch-heading")
                      ?.focus();
                  });
                }
              : null
          }
          onCutAnother={() => {
            if (controller.batch.length > 1) {
              controller.open(null);
              requestAnimationFrame(() => {
                document
                  .querySelector<HTMLElement>("#unmask-batch-heading")
                  ?.focus();
              });
              return;
            }
            controller.remove(item.id);
            requestAnimationFrame(() => {
              document
                .querySelector<HTMLElement>("#unmask-choose-files")
                ?.focus();
            });
          }}
          onDownload={() => {
            controller.downloadOne(item.id);
          }}
          onRetry={() => {
            controller.retry(item.id);
          }}
          running={busy}
        />
      </aside>
    </div>
  );
};
