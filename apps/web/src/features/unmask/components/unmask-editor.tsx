"use client";

/* oxlint-disable eslint/complexity, react-doctor/no-giant-component -- The editor owns the fixed plate, desk, shortcuts, and result contract in one layout. */

import { useEffect, useRef, useState } from "react";
import { HiArrowUturnLeft, HiLink } from "react-icons/hi2";

import { Button } from "@/core/components/ui/button";
import { useTranslation } from "@/features/i18n/use-translation";
import { UnmaskCanvas } from "@/features/unmask/components/unmask-canvas";
import type { BrushTool } from "@/features/unmask/components/unmask-magic-brush";
import { UnmaskMagicBrush } from "@/features/unmask/components/unmask-magic-brush";
import { UnmaskResult } from "@/features/unmask/components/unmask-result";
import { UnmaskSettingsBar } from "@/features/unmask/components/unmask-settings-bar";
import {
  DEFAULT_BRUSH_SIZE,
  DEFAULT_TOLERANCE,
  formatBytes,
  formatLabelKey,
  jpegBlocked,
  ROW_STATE_KEY,
} from "@/features/unmask/unmask";
import type { UnmaskKey } from "@/features/unmask/unmask";
import type {
  Matte,
  MatteMode,
  OperationId,
  Pixel,
} from "@/features/unmask/unmask.engine";
import { refineMatte } from "@/features/unmask/unmask.matte";
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
  const disabledReason: UnmaskKey | null = busy
    ? "unmaskToolbarPaused"
    : compare
      ? "unmaskCompareActive"
      : item.previewBase === null
        ? "unmaskToolbarNoCutout"
        : null;

  const nextOperationId = () => {
    operationSequence.current += 1;
    // SAFETY: the counter yields a non-empty string, the OperationId brand.
    return `unmask-op-${operationSequence.current}` as OperationId;
  };

  const previewStroke = (points: readonly Pixel[] | null) => {
    if (
      points === null ||
      points.length === 0 ||
      item.previewBase === null ||
      item.source === null
    ) {
      setStrokePreview(null);
      return;
    }
    setStrokePreview(
      refineMatte({
        matte: item.previewBase,
        operations: [
          ...item.operations,
          {
            _tag: "Brush",
            mode,
            operationId: nextOperationId(),
            points,
            size: brushSize,
          },
        ],
        source: item.source,
      })
    );
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
          return;
        }
        case "b": {
          setTool("brush");
          return;
        }
        case "r": {
          setMode("restore");
          return;
        }
        case "e": {
          setMode("erase");
          return;
        }
        case "[": {
          event.preventDefault();
          setBrushSize((current) => Math.max(1, current - 1));
          return;
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

  const handleChangeSettings = controller.changeSettings;
  const handleCutAnother = controller.removeAll;
  const handleRedo = controller.redo;
  const handleResetMatte = controller.resetMatte;
  const handleUndo = controller.undo;

  const hasResult = item.result !== null;
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
              {item.preview === null
                ? t("unmaskCanvasEmpty")
                : t("unmaskReading")}
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
          onRedo={handleRedo}
          onReset={handleResetMatte}
          onTool={setTool}
          onTolerance={setTolerance}
          onUndo={handleUndo}
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
          onChange={handleChangeSettings}
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
            {hasResult ? t("unmaskModelCached") : t("unmaskModelFirstRun")}
          </p>
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
          onCutAnother={handleCutAnother}
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
