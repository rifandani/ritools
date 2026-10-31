"use client";

/* oxlint-disable anti-slop/no-shape-in-symbol-names -- "shape" is the QR style term the library, the design, and the labels use. */
/* oxlint-disable anti-slop/require-safety-comment-for-type-assertion -- Every cast narrows a value this file built from a fixed option list. */
/* oxlint-disable eslint/complexity, react-doctor/no-giant-component -- One panel prints the controls the Symbology registry selects; the branch list is the control catalog. */

import type { DotType } from "etiket";

import { Button } from "@/core/components/ui/button";

import { ecLevelsOf } from "../qraft";
import type { QraftController } from "../use-qraft";
import {
  QraftFileButton,
  QraftNumber,
  QraftSelect,
  QraftSwitch,
  QraftText,
} from "./qraft-fields";

const DOT_TYPES = [
  ["square", "qraftDotSquare"],
  ["rounded", "qraftDotRounded"],
  ["dots", "qraftDotDots"],
  ["diamond", "qraftDotDiamond"],
  ["classy", "qraftDotClassy"],
  ["classy-rounded", "qraftDotClassyRounded"],
  ["extra-rounded", "qraftDotExtraRounded"],
  ["vertical-line", "qraftDotVertical"],
  ["horizontal-line", "qraftDotHorizontal"],
  ["small-square", "qraftDotSmall"],
  ["tiny-square", "qraftDotTiny"],
] as const;

const CORNER_OUTER = [
  ["square", "qraftDotSquare"],
  ["rounded", "qraftDotRounded"],
  ["dots", "qraftDotDots"],
  ["extra-rounded", "qraftDotExtraRounded"],
  ["classy", "qraftDotClassy"],
] as const;

const CORNER_INNER = [
  ["square", "qraftDotSquare"],
  ["rounded", "qraftDotRounded"],
  ["dots", "qraftDotDots"],
] as const;

const Group = ({
  children,
  title,
}: {
  readonly children: React.ReactNode;
  readonly title: string;
}) => (
  <div className="border-rule mt-4 border-t-2 pt-3 first:mt-0 first:border-t-0 first:pt-0">
    <h3 className="text-xs font-bold tracking-[0.08em] uppercase [font-stretch:87.5%]">
      {title}
    </h3>
    <div className="mt-3 grid gap-4 sm:grid-cols-2">{children}</div>
  </div>
);

/** The styling controls the registry gives the chosen Symbology. */
export const QraftStyle = ({
  controller,
}: {
  readonly controller: QraftController;
}) => {
  const c = controller;
  const { style } = c.settings;
  const has = c.hasControl;
  const dotOptions = DOT_TYPES.map(([id, key]) => ({
    id,
    label: c.t(key),
  }));
  const outerOptions = CORNER_OUTER.map(([id, key]) => ({
    id,
    label: c.t(key),
  }));
  const innerOptions = CORNER_INNER.map(([id, key]) => ({
    id,
    label: c.t(key),
  }));
  const ecOptions = ecLevelsOf(c.settings.symbology).map((level) => ({
    id: level,
    label: c.t(
      level === "L"
        ? "qraftEcL"
        : level === "M"
          ? "qraftEcM"
          : level === "Q"
            ? "qraftEcQ"
            : "qraftEcH"
    ),
  }));
  const modeOptions = [
    { id: "auto", label: c.t("qraftAuto") },
    { id: "numeric", label: c.t("qraftModeNumeric") },
    { id: "alphanumeric", label: c.t("qraftModeAlphanumeric") },
    { id: "byte", label: c.t("qraftModeByte") },
  ];
  const maskOptions = [
    { id: "auto", label: c.t("qraftAuto") },
    ...Array.from({ length: 8 }, (_, value) => ({
      id: String(value),
      label: String(value),
    })),
  ];
  const gradientOptions = [
    { id: "none", label: c.t("qraftGradientNone") },
    { id: "linear", label: c.t("qraftGradientLinear") },
    { id: "radial", label: c.t("qraftGradientRadial") },
  ];
  const textPositionOptions = [
    { id: "bottom", label: c.t("qraftTextBottom") },
    { id: "top", label: c.t("qraftTextTop") },
  ];
  const charsetOptions = ["auto", "A", "B", "C"].map((value) => ({
    id: value,
    label: value,
  }));
  const msiOptions = [
    { id: "mod10", label: c.t("qraftCheckMod10") },
    { id: "mod11", label: c.t("qraftCheckMod11") },
    { id: "mod1010", label: c.t("qraftCheckMod1010") },
    { id: "mod1110", label: c.t("qraftCheckMod1110") },
    { id: "none", label: c.t("qraftCheckDigitNone") },
  ];
  const matrixShapeOptions = [
    { id: "square", label: c.t("qraftDatamatrixSquare") },
    { id: "rectangle", label: c.t("qraftDatamatrixRectangle") },
    { id: "auto", label: c.t("qraftAuto") },
  ];
  const maxicodeModeOptions = [2, 3, 4, 5].map((value) => ({
    id: String(value),
    label: String(value),
  }));
  const code25Options = [
    { id: "none", label: c.t("qraftCheckDigitNone") },
    { id: "add", label: c.t("qraftCheckAdd") },
    { id: "verify", label: c.t("qraftCheckVerify") },
  ];
  const hanxinEcOptions = [1, 2, 3, 4].map((value) => ({
    id: String(value),
    label: `L${value}`,
  }));
  const dotcodeMaskOptions = [
    { id: "auto", label: c.t("qraftAuto") },
    ...[0, 1, 2, 3].map((value) => ({
      id: String(value),
      label: String(value),
    })),
  ];

  return (
    <section aria-labelledby="qraft-style-heading" className="min-w-0">
      <h2
        className="border-rule font-display border-b-2 pb-2 text-lg font-black uppercase [font-stretch:75%]"
        id="qraft-style-heading"
      >
        {c.t("qraftStyleHeading")}
      </h2>

      <div className="mt-4">
        <Group title={c.t("qraftForeground")}>
          <QraftText
            id="qraft-fg"
            label={c.t("qraftForeground")}
            value={style.fg}
            onChange={(next) => c.changeStyle({ fg: next })}
          />
          <QraftText
            id="qraft-bg"
            label={c.t("qraftBackground")}
            value={style.bg}
            onChange={(next) => c.changeStyle({ bg: next })}
          />
        </Group>

        {(has("dot") || has("gradient")) && (
          <Group title={c.t("qraftGradient")}>
            <QraftSelect
              id="qraft-gradient"
              label={c.t("qraftGradient")}
              options={gradientOptions}
              value={style.gradient}
              onChange={(next) =>
                c.changeStyle({
                  gradient: next as "linear" | "none" | "radial",
                })
              }
            />
            {style.gradient !== "none" && (
              <>
                <QraftText
                  id="qraft-gradient-end"
                  label={c.t("qraftGradientEnd")}
                  value={style.gradientEnd}
                  onChange={(next) => c.changeStyle({ gradientEnd: next })}
                />
                {style.gradient === "linear" && (
                  <QraftNumber
                    id="qraft-gradient-rotation"
                    label={c.t("qraftGradientRotation")}
                    max={360}
                    min={0}
                    value={style.gradientRotation}
                    onChange={(next) =>
                      c.changeStyle({ gradientRotation: next })
                    }
                  />
                )}
              </>
            )}
          </Group>
        )}

        {has("dot") && (
          <Group title={c.t("qraftDotType")}>
            <QraftSelect
              id="qraft-dot-type"
              label={c.t("qraftDotType")}
              options={dotOptions}
              value={style.dotType}
              onChange={(next) => c.changeStyle({ dotType: next as DotType })}
            />
            <QraftNumber
              id="qraft-dot-size"
              label={c.t("qraftDotSize")}
              max={1}
              min={0.1}
              step={0.05}
              value={style.dotSize}
              onChange={(next) => c.changeStyle({ dotSize: next })}
            />
            <QraftSelect
              id="qraft-shape"
              label={c.t("qraftBodyForm")}
              options={[
                { id: "square", label: c.t("qraftBodySquare") },
                { id: "circle", label: c.t("qraftBodyCircle") },
              ]}
              value={style.shape}
              onChange={(next) =>
                c.changeStyle({ shape: next as "circle" | "square" })
              }
            />
          </Group>
        )}

        {has("corner") && (
          <Group title={c.t("qraftCorners")}>
            <QraftSelect
              id="qraft-corner-outer"
              label={c.t("qraftCornerOuter")}
              options={outerOptions}
              value={style.cornerOuter}
              onChange={(next) =>
                c.changeStyle({
                  cornerOuter: next as
                    | "classy"
                    | "dots"
                    | "extra-rounded"
                    | "rounded"
                    | "square",
                })
              }
            />
            <QraftSelect
              id="qraft-corner-inner"
              label={c.t("qraftCornerInner")}
              options={innerOptions}
              value={style.cornerInner}
              onChange={(next) =>
                c.changeStyle({
                  cornerInner: next as "dots" | "rounded" | "square",
                })
              }
            />
            <QraftText
              id="qraft-corner-color"
              label={c.t("qraftCornerColor")}
              value={style.cornerColor}
              onChange={(next) => c.changeStyle({ cornerColor: next })}
            />
          </Group>
        )}

        {has("quietZone") && (
          <Group title={c.t("qraftQuietZone")}>
            <QraftNumber
              id="qraft-quiet-zone"
              label={c.t("qraftQuietZone")}
              max={16}
              min={0}
              value={style.quietZone}
              onChange={(next) => c.changeStyle({ quietZone: next })}
            />
            <p className="text-muted-fg self-end text-xs/5">
              {c.t("qraftQuietZoneHint")}
            </p>
          </Group>
        )}

        {has("ec") && (
          <Group title={c.t("qraftErrorCorrection")}>
            <QraftSelect
              id="qraft-ec"
              label={c.t("qraftErrorCorrection")}
              options={ecOptions}
              value={style.ecLevel}
              onChange={(next) =>
                c.changeStyle({ ecLevel: next as "H" | "L" | "M" | "Q" })
              }
            />
            <p className="text-muted-fg self-end text-xs/5">
              {style.logo === null ? null : c.t("qraftEcLogoHint")}
            </p>
          </Group>
        )}

        {has("version") && (
          <Group title={c.t("qraftVersion")}>
            <QraftNumber
              id="qraft-version"
              label={c.t("qraftVersion")}
              max={40}
              min={0}
              value={style.version ?? 0}
              onChange={(next) =>
                c.changeStyle({ version: next === 0 ? null : next })
              }
            />
            {has("mode") && (
              <QraftSelect
                id="qraft-mode"
                label={c.t("qraftMode")}
                options={modeOptions}
                value={style.mode}
                onChange={(next) =>
                  c.changeStyle({
                    mode: next as "alphanumeric" | "auto" | "byte" | "numeric",
                  })
                }
              />
            )}
            {has("mask") && (
              <QraftSelect
                id="qraft-mask"
                label={c.t("qraftMask")}
                options={maskOptions}
                value={style.mask === null ? "auto" : String(style.mask)}
                onChange={(next) =>
                  c.changeStyle({
                    mask: next === "auto" ? null : Number(next),
                  })
                }
              />
            )}
          </Group>
        )}

        {has("logo") && (
          <Group title={c.t("qraftLogo")}>
            <div className="sm:col-span-2">
              <p className="text-muted-fg text-xs/5">{c.t("qraftLogoHint")}</p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <QraftFileButton
                  accept={["image/png", "image/jpeg", "image/svg+xml"]}
                  id="qraft-logo-file"
                  label={c.t("qraftLogoChoose")}
                  onPick={(file) => c.chooseLogo(file)}
                />
                {style.logo !== null && (
                  <Button
                    intent="plain"
                    onPress={() => c.removeLogo()}
                    size="sm"
                  >
                    {c.t("qraftLogoRemove")}
                  </Button>
                )}
                {style.logo !== null && (
                  <span className="text-muted-fg truncate text-xs">
                    {style.logo.name}
                  </span>
                )}
              </div>
            </div>
            <QraftNumber
              id="qraft-logo-size"
              label={c.t("qraftLogoSize")}
              max={50}
              min={10}
              value={style.logoSize}
              onChange={(next) => c.changeStyle({ logoSize: next })}
            />
            <QraftNumber
              id="qraft-logo-margin"
              label={c.t("qraftLogoMargin")}
              max={40}
              min={0}
              value={style.logoMargin}
              onChange={(next) => c.changeStyle({ logoMargin: next })}
            />
            <QraftText
              id="qraft-logo-background"
              label={c.t("qraftLogoBackground")}
              value={style.logoBackground}
              onChange={(next) => c.changeStyle({ logoBackground: next })}
            />
            <QraftSwitch
              isSelected={style.logoHideDots}
              label={c.t("qraftLogoHideDots")}
              onChange={(next) => c.changeStyle({ logoHideDots: next })}
            />
          </Group>
        )}

        {has("linear") && (
          <Group title={c.t("qraftHeight")}>
            <QraftNumber
              id="qraft-height"
              label={c.t("qraftHeight")}
              max={400}
              min={10}
              value={style.height}
              onChange={(next) => c.changeStyle({ height: next })}
            />
            <QraftNumber
              id="qraft-module-size"
              label={c.t("qraftModuleSize")}
              max={12}
              min={1}
              step={0.5}
              value={style.moduleSize}
              onChange={(next) => c.changeStyle({ moduleSize: next })}
            />
            <QraftNumber
              id="qraft-margin"
              label={c.t("qraftMargin")}
              max={80}
              min={0}
              value={style.margin}
              onChange={(next) => c.changeStyle({ margin: next })}
            />
            <QraftNumber
              id="qraft-font-size"
              label={c.t("qraftFontSize")}
              max={72}
              min={6}
              value={style.fontSize}
              onChange={(next) => c.changeStyle({ fontSize: next })}
            />
            <QraftSelect
              id="qraft-rotation"
              label={c.t("qraftRotation")}
              options={[0, 90, 180, 270].map((value) => ({
                id: String(value),
                label: `${value}°`,
              }))}
              value={String(style.rotation)}
              onChange={(next) =>
                c.changeStyle({ rotation: Number(next) as 0 | 90 | 180 | 270 })
              }
            />
            <QraftSwitch
              isSelected={style.showText}
              label={c.t("qraftShowText")}
              onChange={(next) => c.changeStyle({ showText: next })}
            />
            {style.showText && (
              <QraftSelect
                id="qraft-text-position"
                label={c.t("qraftTextPosition")}
                options={textPositionOptions}
                value={style.textPosition}
                onChange={(next) =>
                  c.changeStyle({ textPosition: next as "bottom" | "top" })
                }
              />
            )}
            {has("textOverride") && (
              <QraftText
                id="qraft-text-override"
                label={c.t("qraftTextOverride")}
                value={style.text}
                onChange={(next) => c.changeStyle({ text: next })}
              />
            )}
            {has("code25CheckDigit") && (
              <QraftSelect
                id="qraft-code25-check"
                label={c.t("qraftCode25CheckDigit")}
                options={code25Options}
                value={style.code25CheckDigit}
                onChange={(next) =>
                  c.changeStyle({
                    code25CheckDigit: next as "add" | "none" | "verify",
                  })
                }
              />
            )}
            {has("bearerBars") && (
              <QraftSwitch
                isSelected={style.bearerBars}
                label={c.t("qraftBearerBars")}
                onChange={(next) => c.changeStyle({ bearerBars: next })}
              />
            )}
            {has("code128Charset") && (
              <QraftSelect
                id="qraft-charset"
                label={c.t("qraftCode128Charset")}
                options={charsetOptions}
                value={style.code128Charset}
                onChange={(next) =>
                  c.changeStyle({
                    code128Charset: next as "A" | "B" | "C" | "auto",
                  })
                }
              />
            )}
            {has("code39CheckDigit") && (
              <QraftSwitch
                isSelected={style.code39CheckDigit}
                label={c.t("qraftCode39CheckDigit")}
                onChange={(next) => c.changeStyle({ code39CheckDigit: next })}
              />
            )}
            {has("codabar") && (
              <>
                <QraftText
                  id="qraft-codabar-start"
                  label={c.t("qraftCodabarStart")}
                  value={style.codabarStart}
                  onChange={(next) => c.changeStyle({ codabarStart: next })}
                />
                <QraftText
                  id="qraft-codabar-stop"
                  label={c.t("qraftCodabarStop")}
                  value={style.codabarStop}
                  onChange={(next) => c.changeStyle({ codabarStop: next })}
                />
              </>
            )}
            {has("msiCheckDigit") && (
              <QraftSelect
                id="qraft-msi-check"
                label={c.t("qraftMsiCheckDigit")}
                options={msiOptions}
                value={style.msiCheckDigit}
                onChange={(next) =>
                  c.changeStyle({
                    msiCheckDigit: next as
                      | "mod10"
                      | "mod1010"
                      | "mod11"
                      | "mod1110"
                      | "none",
                  })
                }
              />
            )}
            {has("routingCode") && (
              <QraftText
                id="qraft-routing-code"
                label={c.t("qraftRoutingCode")}
                value={style.routingCode}
                onChange={(next) => c.changeStyle({ routingCode: next })}
              />
            )}
          </Group>
        )}

        {has("aztecEc") && (
          <Group title={c.t("qraftAztecEc")}>
            <QraftNumber
              id="qraft-aztec-ec"
              label={c.t("qraftAztecEc")}
              max={95}
              min={5}
              value={style.aztecEcPercent}
              onChange={(next) => c.changeStyle({ aztecEcPercent: next })}
            />
          </Group>
        )}

        {has("hanxin") && (
          <Group title={c.t("qraftHanxinVersion")}>
            <QraftNumber
              id="qraft-hanxin-version"
              label={c.t("qraftHanxinVersion")}
              max={84}
              min={0}
              value={style.hanxinVersion}
              onChange={(next) => c.changeStyle({ hanxinVersion: next })}
            />
            <QraftSelect
              id="qraft-hanxin-ec"
              label={c.t("qraftHanxinEc")}
              options={hanxinEcOptions}
              value={String(style.hanxinEcLevel)}
              onChange={(next) =>
                c.changeStyle({
                  hanxinEcLevel: Number(next) as 1 | 2 | 3 | 4,
                })
              }
            />
          </Group>
        )}

        {has("dotcode") && (
          <Group title={c.t("qraftDotcodeRows")}>
            <QraftNumber
              id="qraft-dotcode-rows"
              label={c.t("qraftDotcodeRows")}
              max={200}
              min={0}
              value={style.dotcodeRows}
              onChange={(next) => c.changeStyle({ dotcodeRows: next })}
            />
            <QraftNumber
              id="qraft-dotcode-columns"
              label={c.t("qraftDotcodeColumns")}
              max={200}
              min={0}
              value={style.dotcodeColumns}
              onChange={(next) => c.changeStyle({ dotcodeColumns: next })}
            />
            <QraftSelect
              id="qraft-dotcode-mask"
              label={c.t("qraftDotcodeMask")}
              options={dotcodeMaskOptions}
              value={style.dotcodeMask < 0 ? "auto" : String(style.dotcodeMask)}
              onChange={(next) =>
                c.changeStyle({
                  dotcodeMask: next === "auto" ? -1 : Number(next),
                })
              }
            />
          </Group>
        )}

        {has("datamatrixShape") && (
          <Group title={c.t("qraftDatamatrixLayout")}>
            <QraftSelect
              id="qraft-datamatrix-shape"
              label={c.t("qraftDatamatrixLayout")}
              options={matrixShapeOptions}
              value={style.datamatrixShape}
              onChange={(next) =>
                c.changeStyle({
                  datamatrixShape: next as "auto" | "rectangle" | "square",
                })
              }
            />
          </Group>
        )}

        {(has("pdfColumns") || has("pdfEc")) && (
          <Group title={c.t("qraftPdfColumns")}>
            {has("pdfColumns") && (
              <QraftNumber
                id="qraft-pdf-columns"
                label={c.t("qraftPdfColumns")}
                max={30}
                min={1}
                value={style.pdfColumns ?? 0}
                onChange={(next) =>
                  c.changeStyle({ pdfColumns: next === 0 ? null : next })
                }
              />
            )}
            {has("pdfEc") && (
              <QraftNumber
                id="qraft-pdf-ec"
                label={c.t("qraftPdfEc")}
                max={8}
                min={0}
                value={style.pdfEc ?? 0}
                onChange={(next) =>
                  c.changeStyle({ pdfEc: next === 0 ? null : next })
                }
              />
            )}
          </Group>
        )}

        {has("stackedColumns") && (
          <Group title={c.t("qraftStackedColumns")}>
            <QraftNumber
              id="qraft-stacked-columns"
              label={c.t("qraftStackedColumns")}
              max={62}
              min={4}
              value={style.stackedColumns ?? 0}
              onChange={(next) =>
                c.changeStyle({ stackedColumns: next === 0 ? null : next })
              }
            />
          </Group>
        )}

        {has("maxicode") && (
          <Group title={c.t("qraftMaxicodeMode")}>
            <QraftSelect
              id="qraft-maxicode-mode"
              label={c.t("qraftMaxicodeMode")}
              options={maxicodeModeOptions}
              value={String(style.maxicodeMode)}
              onChange={(next) =>
                c.changeStyle({ maxicodeMode: Number(next) as 2 | 3 | 4 | 5 })
              }
            />
            <QraftText
              id="qraft-maxicode-postal"
              label={c.t("qraftMaxicodePostal")}
              value={style.maxicodePostal}
              onChange={(next) => c.changeStyle({ maxicodePostal: next })}
            />
            <QraftText
              id="qraft-maxicode-country"
              label={c.t("qraftMaxicodeCountry")}
              value={style.maxicodeCountry}
              onChange={(next) => c.changeStyle({ maxicodeCountry: next })}
            />
          </Group>
        )}
      </div>
    </section>
  );
};
