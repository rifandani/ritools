"use client";

import { HiArrowDownTray, HiPhoto } from "react-icons/hi2";

import { Button } from "@/core/components/ui/button";
import { Label } from "@/core/components/ui/field";
import { Loader } from "@/core/components/ui/loader";
import { Note } from "@/core/components/ui/note";
import { NumberField, NumberInput } from "@/core/components/ui/number-field";
import { Toggle } from "@/core/components/ui/toggle";
import {
  EaselHint,
  EaselPanel,
  EaselSlider,
  EaselSwitch,
  LABEL_CLASS,
} from "@/features/easel/components/easel-controls";
import type { EaselKey } from "@/features/easel/easel";
import { formatBytes } from "@/features/easel/easel";
import {
  MAX_UPSCALE,
  OUTPUT_FORMATS,
  resizeOf,
  showsBackdrop,
} from "@/features/easel/easel.plan";
import type { OutputFormat, RenderPlan } from "@/features/easel/easel.plan";
import { MAX_QUALITY, MIN_QUALITY } from "@/features/easel/easel.protocol";
import { panelIsChanged } from "@/features/easel/easel.stack";
import type { EditState } from "@/features/easel/easel.stack";
import type { EaselController, EaselTab } from "@/features/easel/use-easel";
import { useTranslation } from "@/features/i18n/use-translation";

/** The export size. The ratio is locked unless the user turns the lock off. */
export const EaselPanelResize = ({
  controller,
  plan,
  state,
}: {
  readonly controller: EaselController;
  readonly plan: RenderPlan;
  readonly state: EditState;
}) => {
  const { t } = useTranslation();
  const locked = state.resize?.locked ?? true;
  const current = state.resize ?? { ...plan.exportSize, locked };
  const change = (side: "height" | "width", value: number) => {
    controller.apply({
      _tag: "SetResize",
      resize: resizeOf({
        current,
        locked,
        natural: plan.natural,
        side,
        value,
      }),
    });
  };
  return (
    <EaselPanel
      canReset={panelIsChanged(state, "resize")}
      id="resize"
      onReset={() => {
        controller.apply({ _tag: "ResetPanel", panel: "resize" });
      }}
      title={t("easelPanelResize")}
    >
      <div className="grid grid-cols-2 gap-3">
        {(["width", "height"] as const).map((side) => (
          <NumberField
            data-easel-resize={side}
            formatOptions={{ maximumFractionDigits: 0, useGrouping: false }}
            key={side}
            maxValue={plan.natural[side] * MAX_UPSCALE}
            minValue={1}
            onChange={(value) => {
              change(side, value);
            }}
            value={plan.exportSize[side]}
          >
            <Label className={LABEL_CLASS}>
              {t(side === "width" ? "easelResizeWidth" : "easelResizeHeight")}
            </Label>
            <NumberInput />
          </NumberField>
        ))}
      </div>
      <EaselSwitch
        id="resize-lock"
        isSelected={locked}
        label={t("easelResizeLock")}
        onChange={(next) => {
          controller.apply({
            _tag: "SetResize",
            resize: next
              ? resizeOf({
                  current,
                  locked: true,
                  natural: plan.natural,
                  side: "width",
                  value: current.width,
                })
              : { ...current, locked: false },
          });
        }}
      />
      <EaselHint>
        {t("easelResizeNatural", {
          height: String(plan.natural.height),
          width: String(plan.natural.width),
        })}
      </EaselHint>
    </EaselPanel>
  );
};

const FORMAT_LABEL = {
  avif: "easelFormatAvif",
  jpeg: "easelFormatJpeg",
  png: "easelFormatPng",
  webp: "easelFormatWebp",
} as const satisfies Record<OutputFormat, EaselKey>;

/** The format, the quality, and the export with its size before a download. */
export const EaselExport = ({
  controller,
  plan,
  state,
  tab,
}: {
  readonly controller: EaselController;
  readonly plan: RenderPlan;
  readonly state: EditState;
  readonly tab: EaselTab;
}) => {
  const { t, locale } = useTranslation();
  const result =
    tab.result !== null && tab.result.state === state ? tab.result : null;
  return (
    <EaselPanel
      canReset={false}
      id="export"
      onReset={null}
      title={t("easelExport")}
    >
      <fieldset
        aria-label={t("easelFormat")}
        className="m-0 flex flex-wrap border-0 p-0"
      >
        {OUTPUT_FORMATS.map((format) => (
          <Toggle
            data-easel-format={format}
            isSelected={tab.format === format}
            key={format}
            onPress={() => {
              controller.setFormat(format);
            }}
            size="sm"
          >
            {t(FORMAT_LABEL[format])}
          </Toggle>
        ))}
      </fieldset>
      <EaselSlider
        id="quality"
        isDisabled={tab.format === "png"}
        label={t("easelQuality")}
        max={MAX_QUALITY}
        min={MIN_QUALITY}
        onChange={(value) => {
          controller.setQuality(value);
        }}
        value={tab.quality}
      />
      <EaselHint>
        {t(tab.format === "png" ? "easelQualityPng" : "easelQualityNote")}
      </EaselHint>
      {plan.backdropFallback && showsBackdrop(state) ? (
        <Note data-easel-note="jpeg-backdrop" intent="info">
          {t("easelJpegBackdropNote")}
        </Note>
      ) : null}
      {plan.upscaled ? (
        <Note data-easel-note="upscale" intent="warning">
          {t("easelResizeUpscale")}
        </Note>
      ) : null}
      <p className="num text-xs" id="easel-export-size">
        {t("easelExportSize", {
          height: String(plan.exportSize.height),
          width: String(plan.exportSize.width),
        })}
      </p>
      <Button
        className="w-full"
        id="easel-export"
        intent="primary"
        isPending={tab.exporting}
        onPress={() => {
          void controller.exportActive();
        }}
        size="md"
      >
        {tab.exporting ? (
          <>
            <Loader aria-label={t("easelExporting")} />
            <span aria-hidden="true">{t("easelExporting")}</span>
          </>
        ) : (
          <>
            <HiPhoto aria-hidden="true" />
            {t("easelExport")}
          </>
        )}
      </Button>
      {tab.exportFailed ? (
        <Note intent="danger" role="alert">
          {t("easelExportFailed")}
        </Note>
      ) : null}
      {result === null ? null : (
        <div
          className="border-rule flex flex-col gap-y-2 border-2 p-3"
          id="easel-result"
        >
          <p className="text-sm font-bold break-all">{result.image.name}</p>
          <p className="num text-xs" id="easel-result-facts">
            {`${result.image.width} × ${result.image.height} · ${formatBytes(
              result.image.bytes.byteLength,
              locale
            )}`}
          </p>
          <Button
            id="easel-download"
            intent="primary"
            onPress={() => {
              controller.downloadExport(tab.id, result.image, result.state);
            }}
            size="md"
          >
            <HiArrowDownTray aria-hidden="true" />
            {t("easelDownload")}
          </Button>
          <EaselHint>{t("easelExportNoMetadata")}</EaselHint>
        </div>
      )}
    </EaselPanel>
  );
};
