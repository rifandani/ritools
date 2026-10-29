/* oxlint-disable react-doctor/no-giant-component -- The contextual editor covers the four frozen annotation variants and their labelled geometry controls. */
/* oxlint-disable jsx-a11y/no-static-element-interactions -- Escape is delegated from the labelled draft controls. */
/* oxlint-disable react-doctor/no-array-index-as-key -- Drawing points have fixed sequence positions; this editor adds and removes only the final point. */
import { useState } from "react";

import { Button } from "@/core/components/ui/button";
import { Note } from "@/core/components/ui/note";
import { useTranslation } from "@/features/i18n/use-translation";

import * as F from "../folio";
import { focusElement } from "../folio.browser";
import type { FolioController } from "../use-folio";
import { FolioField, FolioSelect } from "./folio-controls";

export interface AnnotationDraft {
  readonly annotation: F.Annotation;
  readonly existing: boolean;
}
export const annotationKeys = {
  Highlight: "folioHighlight",
  Note: "folioNote",
  Ink: "folioInk",
  AddedText: "folioAddedText",
} as const;
const colors = [
  { key: "folioYellow", value: "yellow", color: [255, 220, 0, 102] },
  { key: "folioBlack", value: "black", color: [0, 0, 0, 255] },
  { key: "folioRed", value: "red", color: [184, 0, 22, 255] },
  { key: "folioBlue", value: "blue", color: [0, 70, 170, 255] },
] as const;

export const newAnnotation = (
  kind: "Note" | "AddedText" | "Ink",
  page: F.Page,
  position?: F.Point,
  points?: readonly F.Point[]
): F.Annotation => {
  const id = F.AnnotationId.make(crypto.randomUUID());
  const [x, y] = position ?? [
    page.cropBox.x + 24,
    page.cropBox.y + page.cropBox.height - 48,
  ];
  if (kind === "Note") {
    return { _tag: kind, id, page: page.id, position: [x, y], contents: "" };
  }
  if (kind === "Ink") {
    return {
      _tag: kind,
      id,
      page: page.id,
      strokes: points ? [points] : [],
      width: 2,
      color: [184, 0, 22, 255],
      contents: "",
    };
  }
  return {
    _tag: kind,
    id,
    page: page.id,
    box: {
      x,
      y: Math.max(page.cropBox.y, y - 48),
      width: Math.min(200, page.cropBox.width - 48),
      height: 48,
    },
    text: "",
    fontSize: 12,
    color: [0, 0, 0, 255],
  };
};

export const FolioAnnotations = ({
  controller: c,
  draft,
  onDraft,
  onCloseDraft,
}: {
  readonly controller: FolioController;
  readonly draft: AnnotationDraft | null;
  readonly onDraft: (draft: AnnotationDraft) => void;
  readonly onCloseDraft: () => void;
}) => {
  const { t } = useTranslation();
  const [invalid, setInvalid] = useState(false);
  const annotation = draft?.annotation;
  const [pointX, setPointX] = useState("24");
  const [pointY, setPointY] = useState("24");
  const update = (next: F.Annotation) => {
    if (draft) {
      onDraft({ ...draft, annotation: next });
    }
    setInvalid(false);
  };
  const save = async () => {
    if (!annotation || !draft) {
      return;
    }
    const page = c.snapshot?.pages.find((p) => p.id === annotation.page);
    const goodPoint = ([x, y]: F.Point) =>
      page &&
      Number.isFinite(x) &&
      Number.isFinite(y) &&
      x >= page.cropBox.x &&
      x <= page.cropBox.x + page.cropBox.width &&
      y >= page.cropBox.y &&
      y <= page.cropBox.y + page.cropBox.height;
    const valid =
      annotation._tag === "Note"
        ? goodPoint(annotation.position)
        : annotation._tag === "AddedText"
          ? goodPoint([annotation.box.x, annotation.box.y]) &&
            annotation.box.width > 0 &&
            annotation.box.height > 0 &&
            annotation.fontSize > 0 &&
            goodPoint([
              annotation.box.x + annotation.box.width,
              annotation.box.y + annotation.box.height,
            ])
          : annotation._tag === "Ink"
            ? annotation.width > 0 &&
              annotation.strokes.length > 0 &&
              annotation.strokes.every(
                (stroke) => stroke.length >= 2 && stroke.every(goodPoint)
              )
            : annotation.quads.length > 0;
    if (!valid) {
      setInvalid(true);
      focusElement("folio-annotation-text");
      return;
    }
    const result = await c.applyDraft({
      _tag: draft.existing ? "UpdateAnnotation" : "CreateAnnotation",
      annotation,
    });
    if (result) {
      onCloseDraft();
      focusElement("folio-annotations-heading");
    }
  };
  return (
    <div className="flex min-w-0 flex-col gap-4">
      <h3 id="folio-annotations-heading" tabIndex={-1} className="font-bold">
        {t("folioAnnotationList")}
      </h3>
      <p className="text-muted-fg text-xs/5">{t("folioGeometryHelp")}</p>
      <FolioSelect
        label={t("folioAnnotationPage")}
        id="folio-annotation-page"
        value={c.currentPage ?? ""}
        onChange={(value) => {
          if (!c.drafting) {
            c.setCurrentPage(F.PageId.make(value));
          }
        }}
        disabled={c.drafting}
      >
        {c.snapshot?.pages.map((page) => (
          <option key={page.id} value={page.id}>
            {t("folioPageNumber", { page: String(page.index + 1) })}
          </option>
        ))}
      </FolioSelect>
      <div className="flex flex-wrap gap-2">
        {(["Note", "AddedText", "Ink"] as const).map((kind) => (
          <Button
            key={kind}
            intent="outline"
            isDisabled={c.busy || c.drafting || !c.permissions.annotate}
            onPress={() => {
              const page = c.snapshot?.pages.find(
                (p) => p.id === c.currentPage
              );
              if (page) {
                onDraft({
                  annotation: newAnnotation(kind, page),
                  existing: false,
                });
              }
            }}
          >
            {t(annotationKeys[kind])}
          </Button>
        ))}
      </div>
      {annotation ? (
        <div
          className="border-rule flex flex-col gap-4 border-y-2 py-4"
          onKeyDown={(event) => {
            if (event.key === "Escape" && !event.nativeEvent.isComposing) {
              event.stopPropagation();
              onCloseDraft();
            }
          }}
        >
          <h4 className="font-bold">
            {t(draft?.existing ? "folioEditAnnotation" : "folioNewAnnotation")}:{" "}
            {t(annotationKeys[annotation._tag])}
          </h4>
          <FolioField
            id="folio-annotation-text"
            label={t("folioAnnotationText")}
            value={
              annotation._tag === "AddedText"
                ? annotation.text
                : annotation.contents
            }
            onChange={(value) =>
              update(
                annotation._tag === "AddedText"
                  ? { ...annotation, text: value }
                  : { ...annotation, contents: value }
              )
            }
          />
          {annotation._tag === "Note" ? null : (
            <FolioSelect
              label={t("folioAnnotationColor")}
              id="folio-color"
              value={
                colors.find(
                  (item) =>
                    item.color[0] === annotation.color[0] &&
                    item.color[1] === annotation.color[1]
                )?.value ?? "black"
              }
              onChange={(value) => {
                const color = colors.find(
                  (item) => item.value === value
                )?.color;
                if (color) {
                  update({ ...annotation, color });
                }
              }}
            >
              {colors.map((color) => (
                <option key={color.value} value={color.value}>
                  {t(color.key)}
                </option>
              ))}
            </FolioSelect>
          )}
          {annotation._tag === "Note" || annotation._tag === "AddedText" ? (
            <div className="grid grid-cols-2 gap-3">
              <FolioField
                label={t("folioPositionX")}
                type="number"
                value={String(
                  annotation._tag === "Note"
                    ? annotation.position[0]
                    : annotation.box.x
                )}
                onChange={(value) =>
                  update(
                    annotation._tag === "Note"
                      ? {
                          ...annotation,
                          position: [Number(value), annotation.position[1]],
                        }
                      : {
                          ...annotation,
                          box: { ...annotation.box, x: Number(value) },
                        }
                  )
                }
              />
              <FolioField
                label={t("folioPositionY")}
                type="number"
                value={String(
                  annotation._tag === "Note"
                    ? annotation.position[1]
                    : annotation.box.y
                )}
                onChange={(value) =>
                  update(
                    annotation._tag === "Note"
                      ? {
                          ...annotation,
                          position: [annotation.position[0], Number(value)],
                        }
                      : {
                          ...annotation,
                          box: { ...annotation.box, y: Number(value) },
                        }
                  )
                }
              />
            </div>
          ) : null}
          {annotation._tag === "AddedText" ? (
            <div className="grid grid-cols-2 gap-3">
              <FolioField
                label={t("folioBoxWidth")}
                type="number"
                min={1}
                value={String(annotation.box.width)}
                onChange={(value) =>
                  update({
                    ...annotation,
                    box: { ...annotation.box, width: Number(value) },
                  })
                }
              />
              <FolioField
                label={t("folioBoxHeight")}
                type="number"
                min={1}
                value={String(annotation.box.height)}
                onChange={(value) =>
                  update({
                    ...annotation,
                    box: { ...annotation.box, height: Number(value) },
                  })
                }
              />
              <FolioField
                label={t("folioFontSize")}
                type="number"
                min={1}
                value={String(annotation.fontSize)}
                onChange={(value) =>
                  update({ ...annotation, fontSize: Number(value) })
                }
              />
            </div>
          ) : null}
          {annotation._tag === "Ink" ? (
            <>
              <p className="text-muted-fg text-xs/5">{t("folioDrawingHelp")}</p>
              <FolioField
                label={t("folioStrokeWidth")}
                type="number"
                min={1}
                value={String(annotation.width)}
                onChange={(value) =>
                  update({ ...annotation, width: Number(value) })
                }
              />
              {annotation.strokes.flatMap((stroke, strokeIndex) =>
                stroke.map((point, i) => (
                  <fieldset
                    key={`${strokeIndex}:${i}`}
                    className="grid grid-cols-2 gap-2"
                  >
                    <legend className="text-sm">
                      {t("folioPoint", { index: String(i + 1) })}
                    </legend>
                    <FolioField
                      label={t("folioPositionX")}
                      type="number"
                      value={String(point[0])}
                      onChange={(value) =>
                        update({
                          ...annotation,
                          strokes: annotation.strokes.map((points, j) =>
                            j === strokeIndex
                              ? points.map((p, k) =>
                                  k === i ? [Number(value), p[1]] : p
                                )
                              : points
                          ),
                        })
                      }
                    />
                    <FolioField
                      label={t("folioPositionY")}
                      type="number"
                      value={String(point[1])}
                      onChange={(value) =>
                        update({
                          ...annotation,
                          strokes: annotation.strokes.map((points, j) =>
                            j === strokeIndex
                              ? points.map((p, k) =>
                                  k === i ? [p[0], Number(value)] : p
                                )
                              : points
                          ),
                        })
                      }
                    />
                  </fieldset>
                ))
              )}
              <div className="grid grid-cols-2 gap-2">
                <FolioField
                  label={t("folioPositionX")}
                  type="number"
                  value={pointX}
                  onChange={setPointX}
                />
                <FolioField
                  label={t("folioPositionY")}
                  type="number"
                  value={pointY}
                  onChange={setPointY}
                />
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  intent="outline"
                  onPress={() =>
                    update({
                      ...annotation,
                      strokes: [
                        [
                          ...(annotation.strokes[0] ?? []),
                          [Number(pointX), Number(pointY)],
                        ],
                      ],
                    })
                  }
                >
                  {t("folioAddPoint")}
                </Button>
                <Button
                  intent="outline"
                  onPress={() =>
                    update({
                      ...annotation,
                      strokes: [(annotation.strokes[0] ?? []).slice(0, -1)],
                    })
                  }
                >
                  {t("folioRemovePoint")}
                </Button>
              </div>
            </>
          ) : null}
          {invalid ? (
            <Note intent="danger">
              <p role="alert">{t("folioInvalidGeometry")}</p>
            </Note>
          ) : null}
          <div className="flex flex-wrap gap-2">
            <Button
              isDisabled={c.busy}
              onPress={() => {
                void save();
              }}
            >
              {t(
                annotation._tag === "Ink" ? "folioFinishDrawing" : "folioApply"
              )}
            </Button>
            <Button intent="plain" isDisabled={c.busy} onPress={onCloseDraft}>
              {t("folioCancel")}
            </Button>
          </div>
        </div>
      ) : null}
      {c.annotations.length ? (
        <ul className="flex flex-col gap-2">
          {c.annotations.map((item, i) => (
            <li key={item.id} className="border-input border-b-2 py-3">
              <p className="font-bold">{t(annotationKeys[item._tag])}</p>
              <p className="my-2 text-sm [overflow-wrap:anywhere]">
                {item._tag === "AddedText" ? item.text : item.contents}
              </p>
              <div className="flex flex-wrap gap-2">
                <Button
                  id={`folio-annotation-${item.id}`}
                  intent="outline"
                  isDisabled={c.busy || c.drafting || !c.permissions.annotate}
                  onPress={() => onDraft({ annotation: item, existing: true })}
                >
                  {t("folioEdit")}
                </Button>
                <Button
                  intent="danger"
                  isDisabled={c.busy || c.drafting || !c.permissions.annotate}
                  onPress={() => {
                    void (async () => {
                      const result = await c.apply({
                        _tag: "DeleteAnnotation",
                        annotation: item.id,
                      });
                      if (result) {
                        focusElement(
                          c.annotations[i + 1]
                            ? `folio-annotation-${c.annotations[i + 1]?.id}`
                            : c.annotations[i - 1]
                              ? `folio-annotation-${c.annotations[i - 1]?.id}`
                              : "folio-annotations-heading"
                        );
                      }
                    })();
                  }}
                >
                  {t("folioDelete")}
                </Button>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-muted-fg text-sm">{t("folioNoAnnotations")}</p>
      )}
    </div>
  );
};
