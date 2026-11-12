"use client";

import { useRef } from "react";
import { HiCursorArrowRays, HiPhoto, HiTrash } from "react-icons/hi2";

import { Button } from "@/core/components/ui/button";
import { Label } from "@/core/components/ui/field";
import { Input } from "@/core/components/ui/input";
import {
  NativeSelect,
  NativeSelectContent,
} from "@/core/components/ui/native-select";
import { Note } from "@/core/components/ui/note";
import { TextField } from "@/core/components/ui/text-field";
import { Toggle } from "@/core/components/ui/toggle";
import {
  EaselColor,
  EaselHint,
  EaselPanel,
  EaselSlider,
  EaselSwitch,
  LABEL_CLASS,
} from "@/features/easel/components/easel-controls";
import type { EaselKey } from "@/features/easel/easel";
import { ACCEPTED_MIME } from "@/features/easel/easel";
import { fontChoicesOf } from "@/features/easel/easel.fonts";
import type { Size } from "@/features/easel/easel.presets";
import {
  panelIsChanged,
  WATERMARK_ANCHORS,
} from "@/features/easel/easel.stack";
import type {
  EditState,
  Redaction,
  RgbaColor,
  WatermarkAnchor,
  WatermarkLayer,
} from "@/features/easel/easel.stack";
import {
  DEFAULT_WATERMARK,
  framePixels,
  MAX_WATERMARK_SCALE,
  MIN_WATERMARK_SCALE,
} from "@/features/easel/easel.tools";
import type { RedactTool, Selection } from "@/features/easel/easel.tools";
import type { EaselController } from "@/features/easel/use-easel";
import { useTranslation } from "@/features/i18n/use-translation";

const ANCHOR_LABEL = {
  "bottom-left": "easelAnchorBottomLeft",
  "bottom-right": "easelAnchorBottomRight",
  center: "easelAnchorCenter",
  "top-left": "easelAnchorTopLeft",
  "top-right": "easelAnchorTopRight",
} as const satisfies Record<WatermarkAnchor, EaselKey>;

/** The Watermark Layer: one text or image mark that is always on top. */
export const EaselPanelWatermark = ({
  controller,
  state,
}: {
  readonly controller: EaselController;
  readonly state: EditState;
}) => {
  const { t } = useTranslation();
  const imageInput = useRef<HTMLInputElement>(null);
  const mark = state.watermark;
  const set = (
    patch: Partial<WatermarkLayer>,
    gesture: string | null = null
  ) => {
    if (mark !== null) {
      controller.apply(
        { _tag: "SetWatermark", watermark: { ...mark, ...patch } },
        gesture
      );
    }
  };
  const chooseFont = async (family: string) => {
    await controller.ensureFont(family);
    set({ font: family });
  };
  return (
    <EaselPanel
      canReset={panelIsChanged(state, "watermark")}
      id="watermark"
      onReset={() => {
        controller.apply({ _tag: "ResetPanel", panel: "watermark" });
      }}
      title={t("easelPanelWatermark")}
    >
      <EaselSwitch
        id="watermark"
        isSelected={mark !== null}
        label={t("easelWatermarkOn")}
        onChange={(on) => {
          controller.apply({
            _tag: "SetWatermark",
            watermark: on
              ? { ...DEFAULT_WATERMARK, text: t("easelWatermarkDefaultText") }
              : null,
          });
        }}
      />
      <EaselHint>{t("easelWatermarkHint")}</EaselHint>
      {mark === null ? null : (
        <>
          <fieldset
            aria-label={t("easelWatermarkKind")}
            className="m-0 flex border-0 p-0"
          >
            <Toggle
              isSelected={mark.kind === "text"}
              onPress={() => {
                set({ kind: "text" });
              }}
              size="sm"
            >
              {t("easelWatermarkText")}
            </Toggle>
            <Toggle
              data-easel-watermark="image"
              isSelected={mark.kind === "image"}
              onPress={() => {
                if (mark.assetId === null) {
                  imageInput.current?.click();
                } else {
                  set({ kind: "image" });
                }
              }}
              size="sm"
            >
              <HiPhoto aria-hidden="true" />
              {t("easelWatermarkImage")}
            </Toggle>
          </fieldset>
          <input
            accept={ACCEPTED_MIME}
            aria-label={t("easelWatermarkImage")}
            className="hidden"
            id="easel-watermark-image"
            onChange={async (event) => {
              const [file] = event.target.files ?? [];
              event.target.value = "";
              if (file !== undefined) {
                const asset = await controller.addAsset(file);
                if (asset !== null) {
                  set({ assetId: asset.id, kind: "image" });
                }
              }
            }}
            ref={imageInput}
            type="file"
          />
          {mark.kind === "text" ? (
            <>
              <TextField
                onChange={(text) => {
                  set({ text }, "watermark-text");
                }}
                value={mark.text}
              >
                <Label className={LABEL_CLASS}>{t("easelWatermarkText")}</Label>
                <Input
                  className="mt-1.5"
                  id="easel-watermark-text"
                  onBlur={() => {
                    controller.finishGesture();
                  }}
                />
              </TextField>
              <div className="flex flex-col gap-y-1.5">
                <Label className={LABEL_CLASS} htmlFor="easel-watermark-font">
                  {t("easelFont")}
                </Label>
                <NativeSelect>
                  <NativeSelectContent
                    id="easel-watermark-font"
                    onChange={(event) => {
                      void chooseFont(event.target.value);
                    }}
                    value={mark.font}
                  >
                    {fontChoicesOf(controller.fonts).map((choice) => (
                      <option key={choice.family} value={choice.family}>
                        {choice.label}
                      </option>
                    ))}
                  </NativeSelectContent>
                </NativeSelect>
              </div>
              <EaselColor
                color={mark.color}
                label={t("easelTextColor")}
                onChange={(color) => {
                  set({ color }, "watermark-color");
                }}
              />
            </>
          ) : (
            <Button
              intent="outline"
              onPress={() => {
                imageInput.current?.click();
              }}
              size="sm"
            >
              {t("easelWatermarkChooseImage")}
            </Button>
          )}
          <EaselSlider
            id="watermark-opacity"
            label={t("easelOpacity")}
            max={100}
            min={5}
            onChange={(value) => {
              set({ opacity: value / 100 }, "watermark-opacity");
            }}
            onCommit={() => {
              controller.finishGesture();
            }}
            value={Math.round(mark.opacity * 100)}
          />
          <EaselSlider
            id="watermark-size"
            label={t("easelWatermarkSize")}
            max={MAX_WATERMARK_SCALE * 100}
            min={MIN_WATERMARK_SCALE * 100}
            onChange={(value) => {
              set({ scale: value / 100 }, "watermark-size");
            }}
            onCommit={() => {
              controller.finishGesture();
            }}
            value={Math.round(mark.scale * 100)}
          />
          <EaselSwitch
            id="watermark-tiled"
            isSelected={mark.tiled}
            label={t("easelWatermarkTiled")}
            onChange={(tiled) => {
              set({ tiled });
            }}
          />
          {mark.tiled ? null : (
            <div className="flex flex-col gap-y-1.5">
              <Label className={LABEL_CLASS} htmlFor="easel-watermark-anchor">
                {t("easelWatermarkPosition")}
              </Label>
              <NativeSelect>
                <NativeSelectContent
                  id="easel-watermark-anchor"
                  onChange={(event) => {
                    const anchor = WATERMARK_ANCHORS.find(
                      (value) => value === event.target.value
                    );
                    if (anchor !== undefined) {
                      set({ anchor });
                    }
                  }}
                  value={mark.anchor}
                >
                  {WATERMARK_ANCHORS.map((anchor) => (
                    <option key={anchor} value={anchor}>
                      {t(ANCHOR_LABEL[anchor])}
                    </option>
                  ))}
                </NativeSelectContent>
              </NativeSelect>
            </div>
          )}
        </>
      )}
    </EaselPanel>
  );
};

const REDACT_TOOLS = [
  { key: "easelToolSelect", tool: "select" },
  { key: "easelToolRect", tool: "rect" },
  { key: "easelToolEllipse", tool: "ellipse" },
  { key: "easelToolBrush", tool: "brush" },
] as const satisfies readonly {
  readonly key: EaselKey;
  readonly tool: RedactTool;
}[];

const FORM_LABEL = {
  brush: "easelToolBrush",
  ellipse: "easelToolEllipse",
  rect: "easelToolRect",
} as const satisfies Record<Redaction["form"], EaselKey>;

/** Cover and Mosaic: the areas that hide content in the export. */
export const EaselPanelRedact = ({
  brush,
  color,
  controller,
  frame,
  kind,
  onBrush,
  onColor,
  onKind,
  onSelect,
  onTool,
  selection,
  state,
  tool,
}: {
  /** The brush width as a part of the longest frame side. */
  readonly brush: number;
  readonly color: RgbaColor;
  readonly controller: EaselController;
  readonly frame: Size;
  readonly kind: Redaction["kind"];
  readonly onBrush: (value: number) => void;
  readonly onColor: (color: RgbaColor) => void;
  readonly onKind: (kind: Redaction["kind"]) => void;
  readonly onSelect: (selection: Selection | null) => void;
  readonly onTool: (tool: RedactTool) => void;
  readonly selection: Selection | null;
  readonly state: EditState;
  readonly tool: RedactTool;
}) => {
  const { t } = useTranslation();
  const longSide = Math.max(frame.width, frame.height);
  const selected =
    selection?.band === "redaction"
      ? (state.redactions.find((item) => item.id === selection.id) ?? null)
      : null;
  return (
    <EaselPanel
      canReset={panelIsChanged(state, "redact")}
      id="redact"
      onReset={() => {
        onSelect(null);
        controller.apply({ _tag: "ResetPanel", panel: "redact" });
      }}
      title={t("easelPanelRedact")}
    >
      <fieldset
        aria-label={t("easelRedactKind")}
        className="m-0 flex border-0 p-0"
      >
        <Toggle
          data-easel-redact="cover"
          isSelected={kind === "cover"}
          onPress={() => {
            onKind("cover");
          }}
          size="sm"
        >
          {t("easelCover")}
        </Toggle>
        <Toggle
          data-easel-redact="mosaic"
          isSelected={kind === "mosaic"}
          onPress={() => {
            onKind("mosaic");
          }}
          size="sm"
        >
          {t("easelMosaic")}
        </Toggle>
      </fieldset>
      <fieldset
        aria-label={t("easelTools")}
        className="m-0 flex flex-wrap border-0 p-0"
      >
        {REDACT_TOOLS.map((entry) => (
          <Toggle
            data-easel-tool={entry.tool}
            isSelected={tool === entry.tool}
            key={entry.tool}
            onPress={() => {
              onTool(entry.tool);
            }}
            size="sm"
          >
            {entry.tool === "select" ? (
              <HiCursorArrowRays aria-hidden="true" />
            ) : null}
            {t(entry.key)}
          </Toggle>
        ))}
      </fieldset>
      <EaselHint>
        {t(tool === "select" ? "easelRedactSelectHint" : "easelRedactDrawHint")}
      </EaselHint>
      {kind === "cover" ? (
        <EaselColor
          color={selected?.kind === "cover" ? selected.color : color}
          label={t("easelCoverColor")}
          onChange={(next) => {
            onColor(next);
            if (selected?.kind === "cover") {
              controller.apply(
                {
                  _tag: "UpdateRedaction",
                  id: selected.id,
                  patch: { color: next },
                },
                `cover-color-${selected.id}`
              );
            }
          }}
        />
      ) : null}
      {tool === "brush" ? (
        <EaselSlider
          id="brush-size"
          label={t("easelBrushSize")}
          max={Math.max(16, Math.round(longSide / 5))}
          min={4}
          onChange={(value) => {
            onBrush(value / longSide);
          }}
          value={framePixels(frame, brush, 4)}
        />
      ) : null}
      <Note intent="warning">{t("easelRedactNote")}</Note>

      {state.redactions.length === 0 ? null : (
        <ul
          aria-label={t("easelRedactList")}
          className="border-rule m-0 flex list-none flex-col border-2 p-0"
        >
          {state.redactions.map((item, index) => (
            <li
              className="border-rule flex items-center gap-x-2 border-b-2 px-2 py-1 last:border-b-0"
              data-easel-redaction={item.id}
              key={item.id}
            >
              <Toggle
                className="min-w-0 flex-1 justify-start"
                isSelected={item.id === selected?.id}
                onPress={() => {
                  onTool("select");
                  onSelect(
                    item.id === selected?.id
                      ? null
                      : { band: "redaction", id: item.id }
                  );
                }}
                size="sm"
              >
                <span className="truncate">
                  {t("easelRedactItem", {
                    kind: t(
                      item.kind === "cover" ? "easelCover" : "easelMosaic"
                    ),
                    number: String(index + 1),
                    form: t(FORM_LABEL[item.form]),
                  })}
                </span>
              </Toggle>
              <Button
                aria-label={t("easelRedactRemove", {
                  number: String(index + 1),
                })}
                intent="plain"
                onPress={() => {
                  if (item.id === selected?.id) {
                    onSelect(null);
                  }
                  controller.apply({ _tag: "RemoveRedaction", id: item.id });
                }}
                size="sq-sm"
              >
                <HiTrash aria-hidden="true" />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </EaselPanel>
  );
};
