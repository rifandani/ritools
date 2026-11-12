"use client";

/* oxlint-disable eslint/complexity, react-doctor/no-giant-component -- The Annotate panel prints the tools, the style of one layer kind, and the layer list from one selection. */

import { useRef } from "react";
import {
  HiArrowDown,
  HiArrowUp,
  HiBars3BottomLeft,
  HiBars3BottomRight,
  HiBars3,
  HiChevronDoubleDown,
  HiChevronDoubleUp,
  HiCursorArrowRays,
  HiDocumentDuplicate,
  HiEye,
  HiEyeSlash,
  HiLockClosed,
  HiLockOpen,
  HiPhoto,
  HiTrash,
} from "react-icons/hi2";

import { Button } from "@/core/components/ui/button";
import { Label } from "@/core/components/ui/field";
import {
  NativeSelect,
  NativeSelectContent,
} from "@/core/components/ui/native-select";
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
import { FONT_FILE_ACCEPT, fontChoicesOf } from "@/features/easel/easel.fonts";
import type { Size } from "@/features/easel/easel.presets";
import { BLACK, panelIsChanged, WHITE } from "@/features/easel/easel.stack";
import type {
  AnnotationLayer,
  EditState,
  LayerMove,
  LayerPatch,
  RgbaColor,
} from "@/features/easel/easel.stack";
import { framePixels, textExcerptOf } from "@/features/easel/easel.tools";
import type {
  AnnotateTool,
  Draft,
  Selection,
} from "@/features/easel/easel.tools";
import type { EaselController } from "@/features/easel/use-easel";
import { useTranslation } from "@/features/i18n/use-translation";

const TOOLS = [
  { key: "easelToolSelect", tool: "select" },
  { key: "easelToolText", tool: "text" },
  { key: "easelToolRect", tool: "rect" },
  { key: "easelToolEllipse", tool: "ellipse" },
  { key: "easelToolLine", tool: "line" },
  { key: "easelToolArrow", tool: "arrow" },
] as const satisfies readonly {
  readonly key: EaselKey;
  readonly tool: AnnotateTool;
}[];

const KIND_LABEL = {
  arrow: "easelToolArrow",
  ellipse: "easelToolEllipse",
  image: "easelLayerImage",
  line: "easelToolLine",
  rect: "easelToolRect",
  text: "easelToolText",
} as const satisfies Record<AnnotationLayer["kind"], EaselKey>;

const MOVES = [
  { icon: HiChevronDoubleUp, key: "easelLayerTop", to: "top" },
  { icon: HiArrowUp, key: "easelLayerUp", to: "up" },
  { icon: HiArrowDown, key: "easelLayerDown", to: "down" },
  { icon: HiChevronDoubleDown, key: "easelLayerBottom", to: "bottom" },
] as const satisfies readonly {
  readonly icon: typeof HiArrowUp;
  readonly key: EaselKey;
  readonly to: LayerMove;
}[];

/** A color that the user can turn off. */
const OptionalColor = ({
  color,
  fallback,
  label,
  onChange,
  switchLabel,
}: {
  readonly color: RgbaColor | null;
  readonly fallback: RgbaColor;
  readonly label: string;
  readonly onChange: (color: RgbaColor | null) => void;
  readonly switchLabel: string;
}) => (
  <div className="flex flex-col gap-y-2">
    <EaselSwitch
      isSelected={color !== null}
      label={switchLabel}
      onChange={(on) => {
        onChange(on ? fallback : null);
      }}
    />
    {color === null ? null : (
      <EaselColor color={color} label={label} onChange={onChange} />
    )}
  </div>
);

/** Text, shapes, and pictures over the photo, and their order. */
export const EaselPanelAnnotate = ({
  controller,
  draft,
  frame,
  onAddImage,
  onDraft,
  onSelect,
  onTool,
  selection,
  state,
  tool,
}: {
  readonly controller: EaselController;
  readonly draft: Draft;
  readonly frame: Size;
  readonly onAddImage: (file: File) => void;
  readonly onDraft: (patch: Partial<Draft>) => void;
  readonly onSelect: (selection: Selection | null) => void;
  readonly onTool: (tool: AnnotateTool) => void;
  readonly selection: Selection | null;
  readonly state: EditState;
  readonly tool: AnnotateTool;
}) => {
  const { t } = useTranslation();
  const imageInput = useRef<HTMLInputElement>(null);
  const fontInput = useRef<HTMLInputElement>(null);
  const layer =
    selection?.band === "annotation"
      ? (state.layers.find((item) => item.id === selection.id) ?? null)
      : null;
  const longSide = Math.max(frame.width, frame.height);

  /** Changes the selected layer, as one undo step for each control. */
  const patchLayer = (patch: LayerPatch, gesture: string | null = null) => {
    if (layer !== null) {
      controller.apply(
        { _tag: "UpdateLayer", id: layer.id, patch },
        gesture === null ? null : `${gesture}-${layer.id}`
      );
    }
  };

  // The style controls show the selected layer, or the next layer's style.
  const kind: "image" | "figure" | "text" =
    layer === null
      ? tool === "text" || tool === "select"
        ? "text"
        : "figure"
      : layer.kind === "text"
        ? "text"
        : layer.kind === "image"
          ? "image"
          : "figure";
  const text = layer?.kind === "text" ? layer : null;
  const figure =
    layer !== null && layer.kind !== "text" && layer.kind !== "image"
      ? layer
      : null;
  const figureKind = figure?.kind ?? (tool === "select" ? "rect" : tool);
  const isLine = figureKind === "line" || figureKind === "arrow";
  const font = text?.font ?? draft.font;
  const fonts = fontChoicesOf(controller.fonts);

  const chooseFont = async (family: string) => {
    await controller.ensureFont(family);
    onDraft({ font: family });
    patchLayer({ font: family });
  };

  return (
    <EaselPanel
      canReset={panelIsChanged(state, "annotate")}
      id="annotate"
      onReset={() => {
        onSelect(null);
        controller.apply({ _tag: "ResetPanel", panel: "annotate" });
      }}
      title={t("easelPanelAnnotate")}
    >
      <fieldset
        aria-label={t("easelTools")}
        className="m-0 flex flex-wrap border-0 p-0"
      >
        {TOOLS.map((entry) => (
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
        <Button
          data-easel-tool="image"
          intent="outline"
          onPress={() => {
            imageInput.current?.click();
          }}
          size="sm"
        >
          <HiPhoto aria-hidden="true" />
          {t("easelToolImage")}
        </Button>
      </fieldset>
      <input
        accept={ACCEPTED_MIME}
        aria-label={t("easelToolImage")}
        className="hidden"
        id="easel-layer-image"
        onChange={(event) => {
          const [file] = event.target.files ?? [];
          if (file !== undefined) {
            onAddImage(file);
          }
          event.target.value = "";
        }}
        ref={imageInput}
        type="file"
      />
      <EaselHint>
        {t(
          tool === "select"
            ? "easelAnnotateSelectHint"
            : tool === "text"
              ? "easelAnnotateTextHint"
              : "easelAnnotateFigureHint"
        )}
      </EaselHint>

      {kind === "text" ? (
        <div className="flex flex-col gap-y-3" data-easel-style="text">
          <div className="flex flex-col gap-y-1.5">
            <Label className={LABEL_CLASS} htmlFor="easel-font">
              {t("easelFont")}
            </Label>
            <NativeSelect>
              <NativeSelectContent
                id="easel-font"
                onChange={(event) => {
                  void chooseFont(event.target.value);
                }}
                value={font}
              >
                {fonts.map((choice) => (
                  <option key={choice.family} value={choice.family}>
                    {choice.label}
                  </option>
                ))}
              </NativeSelectContent>
            </NativeSelect>
            <div className="flex flex-wrap gap-2">
              <Button
                intent="plain"
                onPress={() => {
                  fontInput.current?.click();
                }}
                size="xs"
              >
                {t("easelFontFile")}
              </Button>
              {controller.canQueryDeviceFonts() ? (
                <Button
                  intent="plain"
                  onPress={() => {
                    void controller.loadDeviceFonts();
                  }}
                  size="xs"
                >
                  {t("easelFontDevice")}
                </Button>
              ) : null}
            </div>
            <input
              accept={FONT_FILE_ACCEPT}
              aria-label={t("easelFontFile")}
              className="hidden"
              id="easel-font-file"
              onChange={async (event) => {
                const [file] = event.target.files ?? [];
                event.target.value = "";
                if (file !== undefined) {
                  const family = await controller.addFontFile(file);
                  if (family !== null) {
                    await chooseFont(family);
                  }
                }
              }}
              ref={fontInput}
              type="file"
            />
          </div>
          <EaselSlider
            id="text-size"
            label={t("easelTextSize")}
            max={Math.max(16, Math.round(longSide / 3))}
            min={8}
            onChange={(value) => {
              onDraft({ textSize: value / longSide });
              patchLayer({ size: value }, "text-size");
            }}
            onCommit={() => {
              controller.finishGesture();
            }}
            value={Math.round(
              text?.size ?? framePixels(frame, draft.textSize, 8)
            )}
          />
          <EaselColor
            color={text?.color ?? draft.textColor}
            label={t("easelTextColor")}
            onChange={(color) => {
              onDraft({ textColor: color });
              patchLayer({ color }, "text-color");
            }}
          />
          <div className="flex flex-wrap gap-y-2">
            <fieldset
              aria-label={t("easelTextStyle")}
              className="m-0 flex border-0 p-0"
            >
              {(
                [
                  ["bold", "easelTextBold", "B"],
                  ["italic", "easelTextItalic", "I"],
                  ["underline", "easelTextUnderline", "U"],
                  ["strike", "easelTextStrike", "S"],
                ] as const
              ).map(([field, key, mark]) => (
                <Toggle
                  aria-label={t(key)}
                  data-easel-text={field}
                  isSelected={text?.[field] ?? draft[field]}
                  key={field}
                  onPress={() => {
                    const next = !(text?.[field] ?? draft[field]);
                    onDraft({ [field]: next });
                    patchLayer({ [field]: next });
                  }}
                  size="sq-sm"
                >
                  <span aria-hidden="true" className="font-black">
                    {mark}
                  </span>
                </Toggle>
              ))}
            </fieldset>
            <fieldset
              aria-label={t("easelTextAlign")}
              className="m-0 ms-3 flex border-0 p-0"
            >
              {(
                [
                  ["left", "easelAlignLeft", HiBars3BottomLeft],
                  ["center", "easelAlignCenter", HiBars3],
                  ["right", "easelAlignRight", HiBars3BottomRight],
                ] as const
              ).map(([align, key, Icon]) => (
                <Toggle
                  aria-label={t(key)}
                  isSelected={(text?.align ?? draft.align) === align}
                  key={align}
                  onPress={() => {
                    onDraft({ align });
                    patchLayer({ align });
                  }}
                  size="sq-sm"
                >
                  <Icon aria-hidden="true" />
                </Toggle>
              ))}
            </fieldset>
          </div>
          <OptionalColor
            color={text === null ? draft.box : text.box}
            fallback={BLACK}
            label={t("easelTextBoxColor")}
            onChange={(box) => {
              onDraft({ box });
              patchLayer({ box }, "text-box");
            }}
            switchLabel={t("easelTextBox")}
          />
          <OptionalColor
            color={
              text === null ? draft.outline : (text.outline?.color ?? null)
            }
            fallback={BLACK}
            label={t("easelTextOutlineColor")}
            onChange={(color) => {
              onDraft({ outline: color });
              if (text !== null) {
                patchLayer(
                  {
                    outline:
                      color === null
                        ? null
                        : {
                            color,
                            width:
                              text.outline?.width ??
                              Math.max(1, Math.round(text.size / 16)),
                          },
                  },
                  "text-outline"
                );
              }
            }}
            switchLabel={t("easelTextOutline")}
          />
        </div>
      ) : null}

      {kind === "figure" ? (
        <div className="flex flex-col gap-y-3" data-easel-style="figure">
          {isLine ? null : (
            <OptionalColor
              color={figure === null ? draft.fill : figure.fill}
              fallback={WHITE}
              label={t("easelFigureFillColor")}
              onChange={(fill) => {
                onDraft({ fill });
                patchLayer({ fill }, "figure-fill");
              }}
              switchLabel={t("easelFigureFill")}
            />
          )}
          {isLine ? (
            <EaselColor
              color={figure?.stroke ?? draft.stroke ?? BLACK}
              label={t("easelFigureStrokeColor")}
              onChange={(stroke) => {
                onDraft({ stroke });
                patchLayer({ stroke }, "figure-stroke");
              }}
            />
          ) : (
            <OptionalColor
              color={figure === null ? draft.stroke : figure.stroke}
              fallback={BLACK}
              label={t("easelFigureStrokeColor")}
              onChange={(stroke) => {
                onDraft({ stroke });
                patchLayer({ stroke }, "figure-stroke");
              }}
              switchLabel={t("easelFigureStroke")}
            />
          )}
          <EaselSlider
            id="stroke-width"
            label={t("easelFigureStrokeWidth")}
            max={Math.max(8, Math.round(longSide / 20))}
            min={1}
            onChange={(value) => {
              onDraft({ strokeWidth: value / longSide });
              patchLayer({ strokeWidth: value }, "stroke-width");
            }}
            onCommit={() => {
              controller.finishGesture();
            }}
            value={Math.round(
              figure?.strokeWidth ?? framePixels(frame, draft.strokeWidth)
            )}
          />
          {figureKind === "rect" ? (
            <EaselSlider
              id="radius"
              label={t("easelFigureRadius")}
              max={Math.max(8, Math.round(longSide / 10))}
              min={0}
              onChange={(value) => {
                onDraft({ radius: value });
                patchLayer({ radius: value }, "radius");
              }}
              onCommit={() => {
                controller.finishGesture();
              }}
              value={Math.round(figure?.radius ?? draft.radius)}
            />
          ) : null}
        </div>
      ) : null}

      <EaselSlider
        id="opacity"
        label={t("easelOpacity")}
        max={100}
        min={0}
        onChange={(value) => {
          onDraft({ opacity: value / 100 });
          patchLayer({ opacity: value / 100 }, "opacity");
        }}
        onCommit={() => {
          controller.finishGesture();
        }}
        value={Math.round((layer?.opacity ?? draft.opacity) * 100)}
      />

      <div className="border-rule border-t-2 pt-3">
        <p className={`${LABEL_CLASS} mb-2`}>{t("easelLayers")}</p>
        {state.layers.length === 0 ? (
          <EaselHint>{t("easelLayersEmpty")}</EaselHint>
        ) : (
          <>
            <ul
              aria-label={t("easelLayers")}
              className="border-rule m-0 flex list-none flex-col border-2 p-0"
            >
              {/* The list shows the front layer first. */}
              {state.layers.toReversed().map((item) => (
                <li
                  className="border-rule flex items-center border-b-2 last:border-b-0"
                  data-easel-layer={item.id}
                  key={item.id}
                >
                  <Toggle
                    className="min-w-0 flex-1 justify-start"
                    isSelected={item.id === layer?.id}
                    onPress={() => {
                      onSelect(
                        item.id === layer?.id
                          ? null
                          : { band: "annotation", id: item.id }
                      );
                    }}
                    size="sm"
                  >
                    <span className="truncate">
                      {item.kind === "text"
                        ? textExcerptOf(item.text)
                        : t(KIND_LABEL[item.kind])}
                    </span>
                    {item.hidden ? <HiEyeSlash aria-hidden="true" /> : null}
                    {item.locked ? <HiLockClosed aria-hidden="true" /> : null}
                  </Toggle>
                </li>
              ))}
            </ul>
            <div
              aria-label={t("easelLayerActions")}
              className="mt-2 flex flex-wrap"
              role="toolbar"
            >
              {MOVES.map(({ icon: Icon, key, to }) => (
                <Button
                  aria-label={t(key)}
                  data-easel-layer-action={to}
                  intent="outline"
                  isDisabled={layer === null}
                  key={to}
                  onPress={() => {
                    if (layer !== null) {
                      controller.apply({ _tag: "MoveLayer", id: layer.id, to });
                    }
                  }}
                  size="sq-sm"
                >
                  <Icon aria-hidden="true" />
                </Button>
              ))}
              <Button
                aria-label={t(
                  layer?.hidden === true ? "easelLayerShow" : "easelLayerHide"
                )}
                data-easel-layer-action="hide"
                intent="outline"
                isDisabled={layer === null}
                onPress={() => {
                  patchLayer({ hidden: layer?.hidden !== true });
                }}
                size="sq-sm"
              >
                {layer?.hidden === true ? (
                  <HiEye aria-hidden="true" />
                ) : (
                  <HiEyeSlash aria-hidden="true" />
                )}
              </Button>
              <Button
                aria-label={t(
                  layer?.locked === true ? "easelLayerUnlock" : "easelLayerLock"
                )}
                data-easel-layer-action="lock"
                intent="outline"
                isDisabled={layer === null}
                onPress={() => {
                  patchLayer({ locked: layer?.locked !== true });
                }}
                size="sq-sm"
              >
                {layer?.locked === true ? (
                  <HiLockOpen aria-hidden="true" />
                ) : (
                  <HiLockClosed aria-hidden="true" />
                )}
              </Button>
              <Button
                aria-label={t("easelLayerDuplicate")}
                data-easel-layer-action="duplicate"
                intent="outline"
                isDisabled={layer === null}
                onPress={() => {
                  if (layer !== null) {
                    const newId = `${layer.id}-copy-${Date.now().toString(36)}`;
                    controller.apply({
                      _tag: "DuplicateLayer",
                      id: layer.id,
                      newId,
                    });
                    onSelect({ band: "annotation", id: newId });
                  }
                }}
                size="sq-sm"
              >
                <HiDocumentDuplicate aria-hidden="true" />
              </Button>
              <Button
                aria-label={t("easelLayerDelete")}
                data-easel-layer-action="delete"
                intent="outline"
                isDisabled={layer === null}
                onPress={() => {
                  if (layer !== null) {
                    onSelect(null);
                    controller.apply({ _tag: "RemoveLayer", id: layer.id });
                  }
                }}
                size="sq-sm"
              >
                <HiTrash aria-hidden="true" />
              </Button>
            </div>
          </>
        )}
      </div>
    </EaselPanel>
  );
};
