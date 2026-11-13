"use client";

import { useId, useState } from "react";
import type { ReactNode } from "react";
import { HiArrowPath } from "react-icons/hi2";

import { Button } from "@/core/components/ui/button";
import { ColorWell } from "@/core/components/ui/color-well";
import { Label } from "@/core/components/ui/field";
import {
  Slider,
  SliderOutput,
  SliderThumb,
  SliderTrack,
} from "@/core/components/ui/slider";
import { Switch, SwitchField } from "@/core/components/ui/switch";
import { colorOfHex, hexOf } from "@/features/easel/easel.color";
import type { RgbaColor } from "@/features/easel/easel.stack";
import { useTranslation } from "@/features/i18n/use-translation";

const numberFrom = (value: number | number[]): number =>
  Array.isArray(value) ? (value[0] ?? 0) : value;

export const LABEL_CLASS =
  "text-xs font-bold tracking-[0.06em] uppercase [font-stretch:87.5%]";

/** The frame of one tool panel: its title and its own Reset. */
export const EaselPanel = ({
  canReset,
  children,
  id,
  onReset,
  title,
}: {
  readonly canReset: boolean;
  readonly children: ReactNode;
  readonly id: string;
  readonly onReset: (() => void) | null;
  readonly title: string;
}) => {
  const { t } = useTranslation();
  const headingId = useId();
  return (
    <section
      aria-labelledby={headingId}
      className="bg-card text-fg"
      data-easel-panel={id}
    >
      <header className="border-red flex min-h-11 items-center justify-between gap-x-2 border-b-[3px] px-3 py-1.5">
        <h3
          className="text-xs font-bold tracking-[0.08em] uppercase [font-stretch:87.5%]"
          id={headingId}
        >
          {title}
        </h3>
        {onReset === null ? null : (
          <Button
            data-easel-reset={id}
            intent="plain"
            isDisabled={!canReset}
            onPress={onReset}
            size="xs"
          >
            <HiArrowPath aria-hidden="true" />
            {t("easelReset")}
          </Button>
        )}
      </header>
      <div className="flex flex-col gap-y-4 px-3 py-3">{children}</div>
    </section>
  );
};

/**
 * One labelled slider. A drag is one gesture: `onChange` runs while the thumb
 * moves, and `onCommit` runs once at the end, so the drag is one undo step.
 */
export const EaselSlider = ({
  id,
  isDisabled = false,
  label,
  max,
  min,
  onChange,
  onCommit,
  onReset,
  step = 1,
  value,
}: {
  readonly id?: string;
  readonly isDisabled?: boolean;
  readonly label: string;
  readonly max: number;
  readonly min: number;
  readonly onChange: (value: number) => void;
  readonly onCommit?: () => void;
  /** With a reset, the slider shows a button that sets it to 0. */
  readonly onReset?: () => void;
  readonly step?: number;
  readonly value: number;
}) => {
  const { t } = useTranslation();
  return (
    <div className="flex items-end gap-x-1" data-easel-slider={id}>
      <Slider
        aria-label={label}
        className="min-w-0 flex-1 gap-y-1"
        isDisabled={isDisabled}
        maxValue={max}
        minValue={min}
        onChange={(next) => {
          onChange(numberFrom(next));
        }}
        onChangeEnd={onCommit}
        step={step}
        value={value}
      >
        <div className="flex items-baseline justify-between">
          <Label className={LABEL_CLASS}>{label}</Label>
          <SliderOutput />
        </div>
        <SliderTrack className="min-h-9 grow-0 sm:min-h-8">
          <SliderThumb />
        </SliderTrack>
      </Slider>
      {onReset === undefined ? null : (
        <Button
          aria-label={t("easelResetOne", { name: label })}
          intent="plain"
          isDisabled={isDisabled || value === 0}
          onPress={onReset}
          size="sq-sm"
        >
          <HiArrowPath aria-hidden="true" />
        </Button>
      )}
    </div>
  );
};

/** A color well that edits one opaque color. */
export const EaselColor = ({
  color,
  label,
  onChange,
}: {
  readonly color: RgbaColor;
  readonly label: string;
  readonly onChange: (color: RgbaColor) => void;
}) => {
  const { t } = useTranslation();
  // The field can hold a hex that is still being typed, so the text stays
  // apart from the color until it names one.
  const [draft, setDraft] = useState<string | null>(null);
  return (
    <ColorWell
      hueLabel={t("easelColorHue")}
      label={label}
      onBlur={() => {
        setDraft(null);
      }}
      onChange={(next) => {
        setDraft(next);
        const committed = colorOfHex(next.trim());
        if (committed !== null) {
          onChange({ ...committed, a: color.a });
        }
      }}
      pickerLabel={label}
      value={draft ?? hexOf(color)}
    />
  );
};

export const EaselSwitch = ({
  id,
  isDisabled = false,
  isSelected,
  label,
  onChange,
}: {
  readonly id?: string;
  readonly isDisabled?: boolean;
  readonly isSelected: boolean;
  readonly label: string;
  readonly onChange: (value: boolean) => void;
}) => (
  <SwitchField
    data-easel-switch={id}
    isDisabled={isDisabled}
    isSelected={isSelected}
    onChange={onChange}
  >
    <Switch className="min-h-9 items-center gap-x-3 sm:min-h-8 [&>[data-slot=indicator]]:mt-0 [&>[data-slot=indicator]]:self-center">
      <Label
        className="text-xs font-bold uppercase decoration-2 group-disabled:line-through sm:text-xs"
        data-slot="control-label"
        elementType="span"
      >
        {label}
      </Label>
    </Switch>
  </SwitchField>
);

export const EaselHint = ({ children }: { readonly children: ReactNode }) => (
  <p className="text-muted-fg text-xs leading-4">{children}</p>
);
