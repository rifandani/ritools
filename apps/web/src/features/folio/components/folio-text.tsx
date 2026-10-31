/* oxlint-disable complexity, react/set-state-in-effect, react-doctor/no-giant-component -- One panel owns the object list, the page outline, the editor, and the undo stack; the viewer reports the page and the camera, so the effect follows them. */
"use client";

import type { DocumentsCapability, Viewer } from "@embedpdf/viewer-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { HiArrowUturnLeft, HiXMark } from "react-icons/hi2";
import { toast } from "sonner";

import { Button } from "@/core/components/ui/button";
import { Label } from "@/core/components/ui/field";
import { Heading } from "@/core/components/ui/heading";
import { Input } from "@/core/components/ui/input";
import { Note } from "@/core/components/ui/note";
import { TextField } from "@/core/components/ui/text-field";
import { useTranslation } from "@/features/i18n/use-translation";

import {
  listTextObjects,
  measureTextFit,
  rewriteTextObject,
} from "../folio.text";
import type { FolioTextObject } from "../folio.text";
import {
  FOLIO_TEXT_REFUSAL_KEY,
  isFolioTextEncrypted,
  pageRectOf,
} from "../folio.text.ui";
import { folioTextUndo } from "../folio.text.undo";
import { FolioTip } from "./folio-tip";

/** A box over the page, in the overlay's own pixels. */
interface FolioTextViewRect {
  readonly height: number;
  readonly left: number;
  readonly top: number;
  readonly width: number;
}

/** The measured fit of one draft against the free space on its line. */
interface FolioTextFit {
  readonly fits: boolean;
  readonly free: number;
  readonly needed: number;
}

/** The delay before a draft is measured, in ms. */
const FIT_DEBOUNCE = 200;

/** Round a point value to one decimal place for the fit readout. */
const roundFit = (value: number): number => Math.round(value * 10) / 10;

/** The object editor's width, in px, before it meets a narrow viewport. */
const POPOVER_WIDTH = 320;

/** The space above an object that the editor needs before it opens upward. */
const POPOVER_ROOM = 300;

/**
 * The viewer draws its pages inside a shadow root and gives the app no slot for
 * viewport-space UI, so Folio measures the surface that holds them: the nearest
 * positioned ancestor of a painted page that clips its overflow. `null` before
 * the first page paints, which only leaves the rows.
 */
const findStageSurface = (viewerElement: HTMLElement): HTMLElement | null => {
  let node: HTMLElement | null =
    viewerElement.shadowRoot?.querySelector("img")?.parentElement ?? null;
  while (node) {
    const style = getComputedStyle(node);
    if (style.position !== "static" && style.overflow !== "visible") {
      return node;
    }
    node = node.parentElement;
  }
  return null;
};

export interface FolioTextProps {
  readonly documentId: string;
  /** The layer over the page, in the viewer's own coordinate space. */
  readonly host: HTMLDivElement | null;
  readonly onClose: () => void;
  readonly viewer: Viewer;
  readonly viewerElement: HTMLElement | null;
}

/**
 * The Text (beta) mode: the current page's PDF Text Objects as rows and as
 * boxes over the page, with one object's characters editable at a time. The
 * engine refuses anything it cannot verify, and the panel shows that reason
 * without touching the document.
 */
export const FolioText = ({
  documentId: initialDocumentId,
  host,
  onClose,
  viewer,
  viewerElement,
}: FolioTextProps) => {
  const { t } = useTranslation();
  const documents: DocumentsCapability = viewer.get("documents");
  const [documentId, setDocumentId] = useState(initialDocumentId);
  const ready = documents.get(documentId)?.status === "ready";
  // The stage rides on the panel's document, not the active one: an applied
  // edit opens a new document, and the active tab is loading for a moment.
  const stage = ready ? viewer.forDocument(documentId).get("stage") : null;
  const pageOf = useCallback(
    (id: string) => {
      if (documents.get(id)?.status !== "ready") {
        return 0;
      }
      return viewer.forDocument(id).get("stage").getCurrentPageIndex();
    },
    [documents, viewer]
  );
  const [page, setPage] = useState(() => pageOf(initialDocumentId));
  const [listed, setListed] = useState<{
    readonly objects: readonly FolioTextObject[];
    readonly tagged: boolean;
  } | null>(null);
  const [unreadable, setUnreadable] = useState(false);
  const [revision, setRevision] = useState(0);
  const [rects, setRects] = useState<ReadonlyMap<number, FolioTextViewRect>>(
    new Map()
  );
  const [hovered, setHovered] = useState<number | null>(null);
  const [selected, setSelected] = useState<number | null>(null);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [undoCount, setUndoCount] = useState(0);
  const [signed, setSigned] = useState(false);
  const bytesRef = useRef<{
    bytes: Uint8Array;
    documentId: string;
    revision: number;
  } | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const encrypted =
    isFolioTextEncrypted(documentId) ||
    documents.get(documentId)?.status === "locked";
  const blocked = encrypted || signed;

  const objects = useMemo(
    () =>
      (listed?.objects ?? []).filter(
        (object) => object.text.trim().length > 0 && !object.invisible
      ),
    [listed]
  );
  const selectedObject = useMemo(
    () => objects.find((object) => object.index === selected) ?? null,
    [objects, selected]
  );
  const [fit, setFit] = useState<FolioTextFit | null>(null);

  useEffect(
    () =>
      documents.onActiveChanged(({ documentId: active }) => {
        if (active) {
          setDocumentId(active);
          setPage(pageOf(active));
          setSelected(null);
        }
      }),
    [documents, pageOf]
  );

  // A document becomes ready after it becomes active, and the store does not
  // re-render on its own. The increment makes the panel read it again.
  useEffect(
    () =>
      documents.onOpened(() => {
        setRevision((current) => current + 1);
      }),
    [documents]
  );

  useEffect(() => {
    if (!stage) {
      return;
    }
    return stage.onPageChanged(({ pageIndex }) => {
      setPage(pageIndex);
      setSelected(null);
    });
  }, [stage]);

  useEffect(() => {
    const stop = viewer.watch(
      () =>
        viewer
          .tryGet("signature")
          ?.getSnapshot()
          ?.signatures.some((signature) => signature.signed) ?? false,
      (value) => setSigned(value)
    );
    return () => {
      stop();
    };
  }, [viewer]);

  useEffect(() => {
    const stop = folioTextUndo.watch(documents);
    setUndoCount(folioTextUndo.count(documentId));
    return () => {
      stop();
    };
  }, [documentId, documents]);

  const bytesFor = useCallback(async (): Promise<Uint8Array> => {
    const cached = bytesRef.current;
    if (
      cached &&
      cached.documentId === documentId &&
      cached.revision === revision
    ) {
      return cached.bytes;
    }
    const bytes = await documents.download(documentId);
    bytesRef.current = { bytes, documentId, revision };
    return bytes;
  }, [documentId, documents, revision]);

  useEffect(() => {
    setSelected(null);
    if (blocked || !ready) {
      setListed(null);
      return;
    }
    let cancelled = false;
    setListed(null);
    setUnreadable(false);
    void (async () => {
      try {
        const bytes = await bytesFor();
        const result = await listTextObjects(bytes, page);
        if (!cancelled) {
          setListed(result);
        }
      } catch {
        if (!cancelled) {
          setUnreadable(true);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [blocked, bytesFor, page, ready]);

  // The meter is advisory: a stale result is ignored, and Apply stays enabled
  // while a measurement is in flight. The rewrite gate still refuses a race.
  useEffect(() => {
    setFit(null);
    if (!(selectedObject && ready) || blocked) {
      return;
    }
    const object = selectedObject;
    let cancelled = false;
    const timer = setTimeout(() => {
      void (async () => {
        try {
          const bytes = await bytesFor();
          const measured = await measureTextFit(bytes, {
            expected: object.text,
            next: draft,
            objectIndex: object.index,
            pageIndex: page,
          });
          if (!cancelled) {
            setFit(measured);
          }
        } catch {
          if (!cancelled) {
            setFit(null);
          }
        }
      })();
    }, FIT_DEBOUNCE);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [blocked, bytesFor, draft, page, ready, selectedObject]);

  const measure = useCallback(() => {
    if (!(stage && host && viewerElement) || objects.length === 0) {
      setRects(new Map());
      return;
    }
    const surface = findStageSurface(viewerElement);
    const crop = documents.getPage(page, documentId)?.pdfCropBox;
    if (!(surface && crop)) {
      setRects(new Map());
      return;
    }
    const stageBox = surface.getBoundingClientRect();
    const hostBox = host.getBoundingClientRect();
    const next = new Map<number, FolioTextViewRect>();
    for (const object of objects) {
      const viewport = stage.pageRectToViewport(
        page,
        pageRectOf(object.bounds, crop)
      );
      if (!viewport) {
        continue;
      }
      next.set(object.index, {
        height: viewport.height,
        left: viewport.x + stageBox.left - hostBox.left,
        top: viewport.y + stageBox.top - hostBox.top,
        width: viewport.width,
      });
    }
    setRects(next);
  }, [
    documentId,
    documents,
    host,
    objects,
    page,
    setRects,
    stage,
    viewerElement,
  ]);

  useEffect(() => {
    measure();
    if (!stage) {
      return;
    }
    const stops = [
      stage.onCameraChanged(measure),
      stage.onViewportChanged(measure),
      stage.onZoomChanged(measure),
    ];
    const observer = new ResizeObserver(measure);
    if (host) {
      observer.observe(host);
    }
    return () => {
      for (const stop of stops) {
        stop();
      }
      observer.disconnect();
    };
  }, [host, measure, stage]);

  useEffect(() => {
    if (selected === null) {
      return;
    }
    inputRef.current?.focus();
    inputRef.current?.select();
  }, [selected]);

  const open = (object: FolioTextObject) => {
    setSelected(object.index);
    setDraft(object.text);
    const crop = documents.getPage(page, documentId)?.pdfCropBox;
    const rect = rects.get(object.index);
    const height = host?.clientHeight ?? 0;
    if (
      stage &&
      crop &&
      (!rect || rect.top < POPOVER_ROOM || rect.top + rect.height > height)
    ) {
      stage.reveal(page, { rect: pageRectOf(object.bounds, crop) });
    }
  };

  const reopen = async (bytes: Uint8Array) => {
    const name = documents.get(documentId)?.name;
    const opened = await documents.open(
      { bytes, kind: "bytes" },
      { activate: true, name }
    );
    const nextId = opened.document.id;
    if (nextId !== documentId) {
      folioTextUndo.move(documentId, nextId);
      await documents.close(documentId);
      setDocumentId(nextId);
    }
    const nextRevision = revision + 1;
    bytesRef.current = {
      bytes,
      documentId: nextId,
      revision: nextRevision,
    };
    setRevision(nextRevision);
    setPage(pageOf(nextId));
    setSelected(null);
    setUndoCount(folioTextUndo.count(nextId));
  };

  const apply = async () => {
    const object = objects.find((entry) => entry.index === selected);
    if (!(object && !busy)) {
      return;
    }
    setBusy(true);
    try {
      const bytes = await bytesFor();
      const result = await rewriteTextObject(bytes, {
        expected: object.text,
        next: draft,
        objectIndex: object.index,
        pageIndex: page,
      });
      if (!result.ok) {
        toast.error(t(FOLIO_TEXT_REFUSAL_KEY[result.reason]));
        setBusy(false);
        return;
      }
      folioTextUndo.remember(documentId, bytes);
      await reopen(result.bytes);
      toast.success(t("folioTextChanged"));
    } catch {
      toast.error(t("folioTextRefusedGeneric"));
    }
    setBusy(false);
  };

  const undo = async () => {
    if (busy) {
      return;
    }
    const snapshot = folioTextUndo.take(documentId);
    if (!snapshot) {
      setUndoCount(0);
      return;
    }
    setBusy(true);
    try {
      await reopen(snapshot);
    } catch {
      folioTextUndo.remember(documentId, snapshot);
      setUndoCount(folioTextUndo.count(documentId));
      toast.error(t("folioTextRefusedGeneric"));
    }
    setBusy(false);
  };

  const selectedRect = selected === null ? undefined : rects.get(selected);
  const hostWidth = host?.clientWidth ?? 0;
  // The editor is fixed to the viewport, so a page scrolled under a phone
  // sheet still brings its note to where the reader is looking.
  const hostBox = host?.getBoundingClientRect();
  const viewportWidth =
    host?.ownerDocument.defaultView?.innerWidth ?? hostWidth;
  const popoverWidth = Math.min(
    POPOVER_WIDTH,
    Math.max(200, viewportWidth - 16)
  );
  const popoverLeft = selectedRect
    ? Math.max(
        8,
        Math.min(
          (hostBox?.left ?? 0) + selectedRect.left,
          viewportWidth - popoverWidth - 8
        )
      )
    : 8;
  const popoverTop = (hostBox?.top ?? 0) + (selectedRect?.top ?? 0);
  const popoverAbove = selectedRect ? popoverTop > POPOVER_ROOM : false;

  const overlay =
    host && objects.length > 0
      ? createPortal(
          <div className="pointer-events-none absolute inset-0">
            {objects.map((object) => {
              const rect = rects.get(object.index);
              if (!rect) {
                return null;
              }
              const active = object.index === selected;
              const lit = active || object.index === hovered;
              return (
                <button
                  aria-label={object.text}
                  className="folio-text-box pointer-events-auto absolute rounded-none"
                  data-hovered={lit ? "" : undefined}
                  data-selected={active ? "" : undefined}
                  key={object.index}
                  onBlur={() => setHovered(null)}
                  onClick={() => open(object)}
                  onFocus={() => setHovered(object.index)}
                  onMouseEnter={() => setHovered(object.index)}
                  onMouseLeave={() => setHovered(null)}
                  style={{
                    height: rect.height,
                    left: rect.left,
                    top: rect.top,
                    width: rect.width,
                  }}
                  type="button"
                />
              );
            })}
          </div>,
          host
        )
      : null;

  // The editor leaves the page layer so it can sit over a phone's bottom
  // sheet, which is fixed above the page.
  const editor =
    host && selectedObject && selectedRect
      ? createPortal(
          <dialog
            aria-label={t("folioTextMode")}
            className="folio-text-editor border-rule bg-overlay text-overlay-fg fixed z-50 m-0 border-2 p-4"
            open
            style={{
              bottom: "auto",
              left: popoverLeft,
              margin: 0,
              right: "auto",
              top: popoverAbove
                ? popoverTop - 8
                : popoverTop + selectedRect.height + 8,
              transform: popoverAbove ? "translateY(-100%)" : undefined,
              width: popoverWidth,
            }}
          >
            <form
              className="flex flex-col gap-3"
              onSubmit={(event) => {
                event.preventDefault();
                void apply();
              }}
            >
              <TextField value={draft} onChange={setDraft}>
                <Label>{t("folioTextMode")}</Label>
                <Input
                  autoComplete="off"
                  autoFocus
                  onKeyDown={(event) => {
                    if (event.key === "Escape") {
                      event.preventDefault();
                      event.stopPropagation();
                      setSelected(null);
                    }
                  }}
                  ref={inputRef}
                  spellCheck={false}
                />
              </TextField>
              {fit ? (
                <output aria-live="polite" className="text-muted-fg text-xs/5">
                  {fit.fits
                    ? t("folioTextFit", { free: roundFit(fit.free) })
                    : t("folioTextOverflowFit", {
                        free: roundFit(fit.free),
                        needed: roundFit(fit.needed),
                      })}
                </output>
              ) : null}
              {fit?.fits === false ? (
                <Note intent="warning">{t("folioTextRefusedOverflow")}</Note>
              ) : null}
              <div className="flex flex-wrap justify-end gap-2">
                <Button
                  intent="plain"
                  onPress={() => setSelected(null)}
                  type="button"
                >
                  {t("folioTextCancel")}
                </Button>
                <Button
                  isDisabled={
                    busy || draft === selectedObject.text || fit?.fits === false
                  }
                  type="submit"
                >
                  {t("folioTextApply")}
                </Button>
              </div>
            </form>
          </dialog>,
          host.ownerDocument.body
        )
      : null;

  return (
    <>
      {overlay}
      {editor}
      <aside
        aria-label={t("folioTextPanelTitle")}
        className="border-rule bg-overlay text-overlay-fg flex flex-col border-t-2 max-lg:fixed max-lg:inset-x-0 max-lg:bottom-0 max-lg:z-40 max-lg:max-h-[55svh] lg:w-80 lg:shrink-0 lg:border-s-2 lg:border-t-0"
      >
        <header className="border-rule flex items-start justify-between gap-2 border-b-2 px-5 py-4">
          <Heading className="min-w-0 flex-1" level={2}>
            {t("folioTextPanelTitle")}
          </Heading>
          <div className="flex shrink-0 items-center gap-1">
            <FolioTip label={t("folioTextUndo")}>
              <Button
                aria-label={t("folioTextUndo")}
                intent="plain"
                isDisabled={blocked || busy || undoCount === 0}
                onPress={() => {
                  void undo();
                }}
                size="sq-sm"
              >
                <HiArrowUturnLeft aria-hidden="true" className="size-4.5" />
              </Button>
            </FolioTip>
            <FolioTip label={t("close")}>
              <Button
                aria-label={t("close")}
                intent="plain"
                onPress={onClose}
                size="sq-sm"
              >
                <HiXMark aria-hidden="true" className="size-4.5" />
              </Button>
            </FolioTip>
          </div>
        </header>

        <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-5 py-4">
          <p className="text-muted-fg text-sm/6">{t("folioTextPanelBody")}</p>
          {blocked ? (
            <Note intent="warning">
              {encrypted
                ? t("folioTextRefusedEncrypted")
                : t("folioTextRefusedSigned")}
            </Note>
          ) : null}
          {!blocked && listed?.tagged ? (
            <Note intent="warning">{t("folioTextTags")}</Note>
          ) : null}
          {!blocked && listed?.objects.some((object) => object.invisible) ? (
            <Note intent="warning">{t("folioTextInvisible")}</Note>
          ) : null}

          {blocked ? null : listed === null ? (
            <output aria-live="polite" className="text-muted-fg text-sm/6">
              {unreadable ? t("folioTextReadFailed") : t("folioTextReading")}
            </output>
          ) : objects.length === 0 ? (
            <p className="text-muted-fg text-sm/6">{t("folioTextEmpty")}</p>
          ) : (
            <ul className="border-rule divide-rule divide-y-2 border-2">
              {objects.map((object) => {
                const active = object.index === selected;
                return (
                  <li key={object.index}>
                    <button
                      className="folio-text-row"
                      data-selected={active ? "" : undefined}
                      onBlur={() => setHovered(null)}
                      onClick={() => open(object)}
                      onFocus={() => setHovered(object.index)}
                      onMouseEnter={() => setHovered(object.index)}
                      onMouseLeave={() => setHovered(null)}
                      type="button"
                    >
                      {object.text}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
          {!blocked && unreadable ? (
            <Note intent="danger">{t("folioTextReadFailed")}</Note>
          ) : null}
        </div>
      </aside>
    </>
  );
};
