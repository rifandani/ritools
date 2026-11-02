"use client";

/* oxlint-disable eslint/complexity, react-doctor/no-giant-component -- The editor owns the fixed plate, desk, shortcuts, and result contract in one layout. */

import { useEffect, useRef, useState } from "react";
import { HiArrowUturnLeft, HiScissors, HiStop } from "react-icons/hi2";

import { Button } from "@/core/components/ui/button";
import { Loader } from "@/core/components/ui/loader";
import { useTranslation } from "@/features/i18n/use-translation";
import { UnmaskCanvas } from "@/features/unmask/components/unmask-canvas";
import type { BrushTool } from "@/features/unmask/components/unmask-magic-brush";
import { UnmaskMagicBrush } from "@/features/unmask/components/unmask-magic-brush";
import { UnmaskResult } from "@/features/unmask/components/unmask-result";
import { UnmaskSettingsBar } from "@/features/unmask/components/unmask-settings-bar";
import { UnmaskSourcePreview } from "@/features/unmask/components/unmask-source-preview";
import {
  DEFAULT_BRUSH_SIZE,
  DEFAULT_TOLERANCE,
  formatBytes,
  formatLabelKey,
  jpegBlocked,
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
  const busyLabel = (): string => {
    const { progress } = item;
    if (progress?._tag === "ModelDownload") {
      return progress.total === null
        ? t("unmaskModelLoadingTitle")
        : `${t("unmaskModelLoadingTitle")} · ${Math.round((progress.loaded / progress.total) * 100)}%`;
    }
    if (progress?._tag === "ModelInit") {
      return t("unmaskModelLoadingTitle");
    }
    if (item.state === "reading") {
      return t("unmaskReading");
    }
    return t("unmaskCuttingOut");
  };
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
    <div className="grid min-w-0 gap-8 lg:grid-cols-[minmax(20rem,3fr)_minmax(0,8fr)]">
      <div className="min-w-0 lg:col-start-2 lg:row-start-1">
        {controller.batch.length > 1 ? (
          <div className="mb-3 flex justify-end">
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
          </div>
        ) : null}

        {item.preview === null ||
        item.facts === null ||
        item.source === null ? (
          <>
            <UnmaskSourcePreview item={item} />
            <p className="num text-muted-fg mt-2 text-xs" id="unmask-facts">
              {factsLine}
            </p>
          </>
        ) : (
          <UnmaskCanvas
            brushSize={brushSize}
            compare={compare}
            compareAt={compareAt}
            disabledReason={disabledReason}
            factsLine={factsLine}
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

      <aside className="min-w-0 lg:col-start-1 lg:row-span-2 lg:row-start-1">
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
            isPending={busy}
            onPress={() => {
              controller.retry(item.id);
            }}
            size="md"
          >
            {busy ? (
              <>
                <Loader aria-label={busyLabel()} />
                <span aria-hidden>{busyLabel()}</span>
              </>
            ) : (
              <>
                <HiScissors aria-hidden />
                {hasResult ? t("unmaskCutOutAgain") : t("unmaskCutOut")}
              </>
            )}
          </Button>
          {busy ? (
            <div className="mt-2 flex items-center justify-between gap-2">
              <Button
                className="w-full"
                id="unmask-cancel"
                intent="plain"
                onPress={() => {
                  controller.cancel();
                  requestAnimationFrame(() => {
                    document
                      .querySelector<HTMLElement>("#unmask-cut-out")
                      ?.focus();
                  });
                }}
                size="xs"
              >
                <HiStop aria-hidden />
                {t("unmaskCancel")}
              </Button>
            </div>
          ) : null}
          {blockedByJpeg ? (
            <p className="text-danger-subtle-fg mt-1 text-xs">
              {t("unmaskCutOutDisabledTransparentJpeg")}
            </p>
          ) : null}
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

        <Button
          className="mt-3 w-full"
          intent="outline"
          isDisabled={busy}
          onPress={handleCutAnother}
          size="md"
        >
          <HiArrowUturnLeft aria-hidden />
          {t("unmaskChooseAnother")}
        </Button>
      </aside>
    </div>
  );
};
