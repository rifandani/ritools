"use client";

import { Button } from "@/core/components/ui/button";
import { Container } from "@/core/components/ui/container";
import { useTranslation } from "@/features/i18n/use-translation";
import type { SqueezeSettings } from "@/features/squeeze/squeeze";
import {
  BYTES_PER_KB,
  MAX_MAX_DIMENSION,
  MAX_QUALITY,
  MAX_TARGET_BYTES,
  MIN_MAX_DIMENSION,
  MIN_QUALITY,
  MIN_TARGET_BYTES,
} from "@/features/squeeze/squeeze";

interface SettingsBarProps {
  readonly onChange: (settings: SqueezeSettings) => void;
  readonly settings: SqueezeSettings;
}

const fieldClass =
  "h-9 w-full rounded-lg border border-border bg-bg px-3 text-sm tabular-nums focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring";

/** The two modes, and the knobs each one shows. */
export const SqueezeSettingsBar = ({
  onChange,
  settings,
}: SettingsBarProps) => {
  const { t } = useTranslation();

  const setTargetKb = (value: string) => {
    const kb = Number(value);
    if (!Number.isFinite(kb) || kb <= 0) {
      return;
    }
    onChange({ ...settings, targetBytes: Math.round(kb * BYTES_PER_KB) });
  };

  // Clamp when the field is left, never while it is being typed: clamping each
  // keystroke fights the person, because the first digit of "20" is under the
  // floor and would be rewritten before the second is typed.
  const clampTarget = () =>
    onChange({
      ...settings,
      targetBytes: Math.min(
        MAX_TARGET_BYTES,
        Math.max(MIN_TARGET_BYTES, settings.targetBytes)
      ),
    });

  const setMaxDimension = (value: string) => {
    if (value === "") {
      onChange({ ...settings, maxDimension: null });
      return;
    }
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      return;
    }
    onChange({ ...settings, maxDimension: Math.round(parsed) });
  };

  const clampMaxDimension = () => {
    if (settings.maxDimension !== null) {
      onChange({
        ...settings,
        maxDimension: Math.min(
          MAX_MAX_DIMENSION,
          Math.max(MIN_MAX_DIMENSION, settings.maxDimension)
        ),
      });
    }
  };

  return (
    <Container className="border-border flex flex-wrap items-end gap-x-6 gap-y-4 rounded-xl border p-4">
      <fieldset className="flex flex-col gap-y-2">
        <legend className="text-muted-fg text-xs font-medium uppercase">
          {t("squeezeMode")}
        </legend>
        <div className="flex gap-x-2">
          <Button
            intent={settings.mode === "target" ? "primary" : "outline"}
            onPress={() => {
              onChange({ ...settings, mode: "target" });
            }}
            size="sm"
          >
            {t("squeezeModeTarget")}
          </Button>
          <Button
            intent={settings.mode === "quality" ? "primary" : "outline"}
            onPress={() => {
              onChange({ ...settings, mode: "quality" });
            }}
            size="sm"
          >
            {t("squeezeModeQuality")}
          </Button>
        </div>
      </fieldset>

      {settings.mode === "target" ? (
        <label className="flex flex-col gap-y-2">
          <span className="text-muted-fg text-xs font-medium uppercase">
            {t("squeezeTargetSize")}
          </span>
          <span className="flex items-center gap-x-2">
            <input
              className={`${fieldClass} w-28`}
              inputMode="numeric"
              max={MAX_TARGET_BYTES / BYTES_PER_KB}
              min={MIN_TARGET_BYTES / BYTES_PER_KB}
              onBlur={clampTarget}
              onChange={(event) => {
                setTargetKb(event.target.value);
              }}
              step={10}
              type="number"
              value={Math.round(settings.targetBytes / BYTES_PER_KB)}
            />
            <span className="text-muted-fg text-sm">
              {t("squeezeTargetUnit")}
            </span>
          </span>
        </label>
      ) : (
        <label className="flex flex-col gap-y-2">
          <span className="text-muted-fg text-xs font-medium uppercase">
            {t("squeezeQuality")}
          </span>
          <span className="flex items-center gap-x-3">
            <input
              className="w-40 accent-(--color-primary)"
              max={MAX_QUALITY}
              min={MIN_QUALITY}
              onChange={(event) => {
                onChange({ ...settings, quality: Number(event.target.value) });
              }}
              type="range"
              value={settings.quality}
            />
            <span className="w-8 text-sm tabular-nums">{settings.quality}</span>
          </span>
        </label>
      )}

      <label className="flex flex-col gap-y-2">
        <span className="text-muted-fg text-xs font-medium uppercase">
          {t("squeezeMaxDimension")}
        </span>
        <span className="flex items-center gap-x-2">
          <input
            className={`${fieldClass} w-24`}
            id="squeeze-max-dimension"
            inputMode="numeric"
            max={MAX_MAX_DIMENSION}
            min={MIN_MAX_DIMENSION}
            onBlur={clampMaxDimension}
            onChange={(event) => {
              setMaxDimension(event.target.value);
            }}
            placeholder={t("squeezeMaxDimensionOff")}
            step={100}
            type="number"
            value={settings.maxDimension ?? ""}
          />
          <span className="text-muted-fg text-sm">
            {t("squeezeMaxDimensionUnit")}
          </span>
        </span>
      </label>
    </Container>
  );
};
