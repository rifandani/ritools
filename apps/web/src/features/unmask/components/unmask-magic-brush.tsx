"use client";

import {
  HiArrowPath,
  HiArrowUturnLeft,
  HiArrowUturnRight,
  HiCursorArrowRays,
  HiEye,
  HiKey,
  HiPaintBrush,
  HiQuestionMarkCircle,
} from "react-icons/hi2";

import { Button } from "@/core/components/ui/button";
import { Label } from "@/core/components/ui/field";
import {
  Popover,
  PopoverContent,
  PopoverTitle,
} from "@/core/components/ui/popover";
import {
  Slider,
  SliderOutput,
  SliderThumb,
  SliderTrack,
} from "@/core/components/ui/slider";
import { Switch, SwitchField } from "@/core/components/ui/switch";
import { Toggle } from "@/core/components/ui/toggle";
import { useTranslation } from "@/features/i18n/use-translation";
import {
  MAX_BRUSH_SIZE,
  MAX_TOLERANCE,
  MIN_BRUSH_SIZE,
  MIN_TOLERANCE,
} from "@/features/unmask/unmask";
import type { ToolbarReason } from "@/features/unmask/unmask";
import type { MatteMode } from "@/features/unmask/unmask.engine";

export type BrushTool = "brush" | "wand";

interface MagicBrushProps {
  readonly brushSize: number;
  readonly connectivity: 4 | 8;
  readonly disabledReason: ToolbarReason | null;
  readonly ghost: boolean;
  readonly mode: MatteMode;
  readonly onBrushSize: (value: number) => void;
  readonly onConnectivity: (value: 4 | 8) => void;
  readonly onGhost: (value: boolean) => void;
  readonly onMode: (mode: MatteMode) => void;
  readonly onRedo: () => void;
  readonly onReset: () => void;
  readonly onTool: (tool: BrushTool) => void;
  readonly onTolerance: (value: number) => void;
  readonly onUndo: () => void;
  readonly operationCount: number;
  readonly redoCount: number;
  readonly tolerance: number;
  readonly tool: BrushTool;
}

const numberFrom = (value: number | number[]): number =>
  Array.isArray(value) ? (value[0] ?? 0) : value;

const Hint = ({
  disabledReason,
  ghost,
  mode,
  tool,
}: {
  readonly disabledReason: ToolbarReason | null;
  readonly ghost: boolean;
  readonly mode: MatteMode;
  readonly tool: BrushTool;
}) => {
  const { t } = useTranslation();
  if (disabledReason !== null) {
    return (
      <p className="text-muted-fg text-xs leading-4">{t(disabledReason)}</p>
    );
  }
  if (tool === "wand") {
    return (
      <p className="text-muted-fg text-xs leading-4">{t("unmaskWandHint")}</p>
    );
  }
  if (mode === "restore" && ghost) {
    return (
      <p className="text-muted-fg text-xs leading-4">
        {t("unmaskRestoreHint")}
      </p>
    );
  }
  return (
    <p className="text-muted-fg text-xs leading-4">
      {mode === "erase" ? t("unmaskEraseHint") : t("unmaskBrushHint")}
    </p>
  );
};

/**
 * The Magic Brush tray: tools, modes, the Ghost, their options, and the
 * operation log's undo and redo. It is a panel under the plate, never a
 * floating bar over the image.
 */
export const UnmaskMagicBrush = ({
  brushSize,
  connectivity,
  disabledReason,
  ghost,
  mode,
  onBrushSize,
  onConnectivity,
  onGhost,
  onMode,
  onRedo,
  onReset,
  onTool,
  onTolerance,
  onUndo,
  operationCount,
  redoCount,
  tolerance,
  tool,
}: MagicBrushProps) => {
  const { t } = useTranslation();
  const disabled = disabledReason !== null;
  return (
    <section
      aria-labelledby="unmask-magic-brush-heading"
      className="border-rule mt-3 border-2"
    >
      <header className="border-rule flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 border-b-2 px-3 py-2">
        <h3
          className="font-display text-lg leading-6 font-black uppercase [font-stretch:75%]"
          id="unmask-magic-brush-heading"
        >
          {t("unmaskMagicBrush")}
        </h3>
        <span className="text-muted-fg text-xs">
          {operationCount === 0
            ? t("unmaskNoEdits")
            : t("unmaskOperationCount", { count: operationCount })}
        </span>
      </header>

      <div className="flex flex-wrap items-start gap-x-4 gap-y-3 px-3 py-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-muted-fg text-xs font-bold tracking-[0.06em] uppercase [font-stretch:87.5%]">
            {t("unmaskWand")}
          </span>
          <fieldset
            aria-label={t("unmaskMagicBrush")}
            className="m-0 flex border-0 p-0"
          >
            <Toggle
              isDisabled={disabled}
              isSelected={tool === "wand"}
              onPress={() => {
                onTool("wand");
              }}
              size="sm"
            >
              <HiCursorArrowRays aria-hidden="true" />
              {t("unmaskWand")}
            </Toggle>
            <Toggle
              isDisabled={disabled}
              isSelected={tool === "brush"}
              onPress={() => {
                onTool("brush");
              }}
              size="sm"
            >
              <HiPaintBrush aria-hidden="true" />
              {t("unmaskBrush")}
            </Toggle>
          </fieldset>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <fieldset
            aria-label={t("unmaskMagicBrush")}
            className="m-0 flex border-0 p-0"
          >
            <Toggle
              isDisabled={disabled}
              isSelected={mode === "restore"}
              onPress={() => {
                onMode("restore");
              }}
              size="sm"
            >
              {t("unmaskRestore")}
            </Toggle>
            <Toggle
              isDisabled={disabled}
              isSelected={mode === "erase"}
              onPress={() => {
                onMode("erase");
              }}
              size="sm"
            >
              {t("unmaskErase")}
            </Toggle>
          </fieldset>
          <SwitchField
            isDisabled={disabled || mode === "erase"}
            isSelected={ghost && mode === "restore"}
            onChange={onGhost}
          >
            <Switch>
              <HiEye aria-hidden="true" />
              {t("unmaskGhost")}
            </Switch>
          </SwitchField>
        </div>

        <div className="flex min-w-48 flex-1 flex-wrap items-end gap-3">
          {tool === "brush" ? (
            <div className="min-w-40 flex-1">
              <Slider
                isDisabled={disabled}
                maxValue={MAX_BRUSH_SIZE}
                minValue={MIN_BRUSH_SIZE}
                onChange={(value) => {
                  onBrushSize(numberFrom(value));
                }}
                step={1}
                value={brushSize}
              >
                <div className="flex items-baseline justify-between">
                  <Label className="text-xs font-bold tracking-[0.06em] uppercase [font-stretch:87.5%]">
                    {t("unmaskBrushSize")}
                  </Label>
                  <SliderOutput />
                </div>
                <SliderTrack>
                  <SliderThumb />
                </SliderTrack>
              </Slider>
            </div>
          ) : (
            <>
              <div className="min-w-40 flex-1">
                <Slider
                  isDisabled={disabled}
                  maxValue={MAX_TOLERANCE}
                  minValue={MIN_TOLERANCE}
                  onChange={(value) => {
                    onTolerance(numberFrom(value));
                  }}
                  step={1}
                  value={tolerance}
                >
                  <div className="flex items-baseline justify-between">
                    <Label className="text-xs font-bold tracking-[0.06em] uppercase [font-stretch:87.5%]">
                      {t("unmaskTolerance")}
                    </Label>
                    <SliderOutput />
                  </div>
                  <SliderTrack>
                    <SliderThumb />
                  </SliderTrack>
                </Slider>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-muted-fg text-xs font-bold tracking-[0.06em] uppercase [font-stretch:87.5%]">
                  {t("unmaskConnectivity")}
                </span>
                <fieldset
                  aria-label={t("unmaskConnectivity")}
                  className="m-0 flex border-0 p-0"
                >
                  <Toggle
                    isDisabled={disabled}
                    isSelected={connectivity === 4}
                    onPress={() => {
                      onConnectivity(4);
                    }}
                    size="xs"
                  >
                    {t("unmaskFourConnected")}
                  </Toggle>
                  <Toggle
                    isDisabled={disabled}
                    isSelected={connectivity === 8}
                    onPress={() => {
                      onConnectivity(8);
                    }}
                    size="xs"
                  >
                    {t("unmaskEightConnected")}
                  </Toggle>
                </fieldset>
              </div>
            </>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <Button
            aria-label={t("unmaskUndo")}
            intent="outline"
            isDisabled={disabled || operationCount === 0}
            onPress={onUndo}
            size="sq-sm"
          >
            <HiArrowUturnLeft aria-hidden="true" />
          </Button>
          <Button
            aria-label={t("unmaskRedo")}
            intent="outline"
            isDisabled={disabled || redoCount === 0}
            onPress={onRedo}
            size="sq-sm"
          >
            <HiArrowUturnRight aria-hidden="true" />
          </Button>
          <Button
            intent="plain"
            isDisabled={disabled || operationCount === 0}
            onPress={onReset}
            size="xs"
          >
            <HiArrowPath aria-hidden="true" />
            {t("unmaskResetMatte")}
          </Button>
          <Popover>
            <Button aria-label={t("unmaskKeys")} intent="plain" size="sq-sm">
              <HiQuestionMarkCircle aria-hidden="true" />
            </Button>
            <PopoverContent className="p-4" placement="top end">
              <PopoverTitle className="flex items-center gap-2 text-sm font-bold">
                <HiKey aria-hidden="true" />
                {t("unmaskKeys")}
              </PopoverTitle>
              <p className="text-muted-fg mt-2 text-sm/6">
                {t("unmaskKeysBody")}
              </p>
            </PopoverContent>
          </Popover>
        </div>
      </div>

      <div className="border-rule border-t-2 px-3 py-2">
        <Hint
          disabledReason={disabledReason}
          ghost={ghost}
          mode={mode}
          tool={tool}
        />
      </div>
    </section>
  );
};
