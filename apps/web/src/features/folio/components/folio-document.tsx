/* oxlint-disable react/todo -- Bitmap cleanup uses try/finally at the browser graphics boundary. */
/* oxlint-disable react/exhaustive-effect-dependencies -- Session and revision invalidate external page reads even when the request atom owns their values. */
/* oxlint-disable jsx-a11y/no-static-element-interactions -- Pointer and selection events on the PDF duplicate the labelled keyboard editors. */
/* oxlint-disable jsx-a11y/no-noninteractive-tabindex -- The labelled scroll region must receive keyboard scroll commands. */
/* oxlint-disable react-doctor/no-giant-component -- One realized page keeps canvas, selectable text, coordinate transforms, and pointer ownership together. */
/* oxlint-disable react-doctor/js-combine-iterations -- These lists contain only realized pages, text rectangles, or widgets on one page. */
/* oxlint-disable unicorn/consistent-function-scoping -- The coordinate closure belongs to the current selection geometry. */
"use client";

import { useEffect, useEffectEvent, useRef, useState } from "react";

import { Button } from "@/core/components/ui/button";
import { useTranslation } from "@/features/i18n/use-translation";

import * as F from "../folio";
import { pageSize, transformBox, transformPoint } from "../folio.ui";
import type { Tool } from "../folio.ui";
import type { FolioController } from "../use-folio";
import { FolioWidget } from "./folio-widget";

interface PageProps {
  readonly controller: FolioController;
  readonly page: F.Page;
  readonly scale: number;
  readonly tool: Tool;
  readonly maxPixels: number;
  readonly onReadingChange: (id: F.PageId, open: boolean) => void;
  readonly onSelection: (
    page: F.PageId,
    quads: Extract<F.Annotation, { _tag: "Highlight" }>["quads"],
    text: string
  ) => void;
  readonly onPlace: (
    page: F.PageId,
    point: F.Point,
    stroke?: readonly F.Point[]
  ) => void;
}

const textQuads = (
  runs: readonly F.TextRun[],
  start: number,
  end: number
): Extract<F.Annotation, { _tag: "Highlight" }>["quads"] => {
  let offset = 0;
  return runs.flatMap((run) => {
    const from = Math.max(start - offset, 0);
    const to = Math.min(end - offset, run.text.length);
    offset += run.text.length;
    if (to <= from || !run.text.length || run.width <= 0) {
      return [];
    }
    const angle = Math.atan2(run.transform[1], run.transform[0]);
    const x = run.transform.at(4) ?? 0;
    const y = run.transform.at(5) ?? 0;
    const along = (n: number, h: number): F.Point => [
      x + Math.cos(angle) * n - Math.sin(angle) * h,
      y + Math.sin(angle) * n + Math.cos(angle) * h,
    ];
    const a = (run.width * from) / run.text.length;
    const b = (run.width * to) / run.text.length;
    const quad: readonly [F.Point, F.Point, F.Point, F.Point] = [
      along(a, run.height),
      along(b, run.height),
      along(a, 0),
      along(b, 0),
    ];
    return [quad];
  });
};

const FolioDocumentPage = ({
  controller: c,
  page,
  scale,
  tool,
  maxPixels,
  onSelection,
  onPlace,
  onReadingChange,
}: PageProps) => {
  const { t } = useTranslation();
  const canvas = useRef<HTMLCanvasElement>(null);
  const surface = useRef<HTMLDivElement>(null);
  const [runs, setRuns] = useState<readonly F.TextRun[]>([]);
  const [textWidths, setTextWidths] = useState<readonly number[]>([]);
  const [matrix, setMatrix] = useState<F.Matrix | null>(null);
  const [renderError, setRenderError] = useState(false);
  const stroke = useRef<F.Point[]>([]);
  const size = pageSize(page);
  const width = size.width * scale;
  const height = size.height * scale;
  const revision = c.snapshot?.revision;
  const session = c.snapshot?.session;
  const { renderEpoch } = c;
  // PDF.js rounds both raster dimensions up. Reserve one pixel on each axis
  // so the allocated bitmap stays inside the page's share of the byte budget.
  const budgetScale = Math.max(
    Math.sqrt(maxPixels / (size.width * size.height)) -
      1 / Math.min(size.width, size.height),
    0.001
  );
  const renderScale = Math.min(
    scale * (window.devicePixelRatio || 1),
    budgetScale
  );
  const report = useEffectEvent(c.reportFailure);
  const { render, read } = c;
  useEffect(() => {
    let disposed = false;
    const abort = new AbortController();
    const load = async () => {
      try {
        const output = await render(
          {
            page: page.id,
            clip: page.cropBox,
            scale: renderScale,
            devicePixelRatio: 1,
            rotation: page.rotation,
          },
          abort.signal
        );
        try {
          if (disposed || !canvas.current || !output.bitmap) {
            return;
          }
          canvas.current.width = output.rendered.width;
          canvas.current.height = output.rendered.height;
          const context = canvas.current.getContext("2d");
          context?.drawImage(output.bitmap, 0, 0);
          const ratio = width / output.rendered.width;
          const [a, b, cc, d, e, f] = output.rendered.transform;
          setMatrix([
            a * ratio,
            b * ratio,
            cc * ratio,
            d * ratio,
            e * ratio,
            f * ratio,
          ]);
          setRenderError(false);
        } finally {
          output.bitmap?.close();
        }
        const text = await read({ tag: "ReadText", page: page.id });
        if (!disposed && text._tag === "TextRead") {
          const measuring = document.createElement("canvas").getContext("2d");
          if (measuring) {
            measuring.font = "100px sans-serif";
          }
          setTextWidths(
            text.runs.map((run) => measuring?.measureText(run.text).width ?? 0)
          );
          setRuns(text.runs);
        }
      } catch (error) {
        if (!disposed) {
          setRenderError(true);
          report(error);
        }
      }
    };
    void load();
    const node = canvas.current;
    return () => {
      disposed = true;
      abort.abort();
      if (node) {
        node.width = 0;
        node.height = 0;
      }
    };
  }, [
    render,
    read,
    page.id,
    page.cropBox,
    page.rotation,
    renderScale,
    revision,
    session,
    renderEpoch,
    width,
  ]);
  const point = (clientX: number, clientY: number): F.Point | null => {
    if (!matrix || !surface.current) {
      return null;
    }
    const bounds = surface.current.getBoundingClientRect();
    return F.viewportToPage(matrix, [
      clientX - bounds.left,
      clientY - bounds.top,
    ]);
  };
  const selection = () => {
    if (!matrix || !surface.current || !c.permissions.copy) {
      return;
    }
    const selected = window.getSelection();
    if (
      !selected?.rangeCount ||
      selected.isCollapsed ||
      !surface.current.contains(selected.anchorNode) ||
      !surface.current.contains(selected.focusNode)
    ) {
      return;
    }
    const bounds = surface.current.getBoundingClientRect();
    const quads = [...selected.getRangeAt(0).getClientRects()]
      .filter((rect) => rect.width > 0 && rect.height > 0)
      .map((rect) => {
        const toPage = (x: number, y: number) =>
          F.viewportToPage(matrix, [x - bounds.left, y - bounds.top]);
        return [
          toPage(rect.left, rect.top),
          toPage(rect.right, rect.top),
          toPage(rect.left, rect.bottom),
          toPage(rect.right, rect.bottom),
        ] as const;
      });
    if (quads.length) {
      onSelection(page.id, quads, selected.toString());
    }
  };
  const current = c.searchResult?.current;
  return (
    <article
      id={`folio-page-${page.id}`}
      tabIndex={-1}
      data-folio-page={page.index + 1}
      aria-label={t("folioPageNumber", { page: String(page.index + 1) })}
      className="min-w-0 outline-hidden"
    >
      <div className="text-muted-fg mb-2 flex items-center justify-between text-xs">
        <span className="num">
          {t("folioPage", {
            page: String(page.index + 1),
            count: String(c.snapshot?.pages.length ?? 0),
          })}
        </span>
      </div>
      <div
        ref={surface}
        className="relative bg-white text-black"
        style={{ width, height }}
        onMouseUp={selection}
        onKeyUp={selection}
        onPointerDown={(event) => {
          if (tool === "select" || tool === "Highlight" || c.busy) {
            return;
          }
          const start = point(event.clientX, event.clientY);
          if (!start) {
            return;
          }
          if (tool === "Ink") {
            stroke.current = [start];
            event.currentTarget.setPointerCapture(event.pointerId);
          } else {
            onPlace(page.id, start);
          }
        }}
        onPointerMove={(event) => {
          if (tool !== "Ink" || !stroke.current.length) {
            return;
          }
          const next = point(event.clientX, event.clientY);
          if (next) {
            stroke.current.push(next);
          }
        }}
        onPointerUp={(event) => {
          if (tool !== "Ink" || !stroke.current.length) {
            return;
          }
          const points = stroke.current;
          stroke.current = [];
          if (event.currentTarget.hasPointerCapture(event.pointerId)) {
            event.currentTarget.releasePointerCapture(event.pointerId);
          }
          if (points[0]) {
            onPlace(page.id, points[0], points);
          }
        }}
        onPointerCancel={() => {
          stroke.current = [];
        }}
      >
        <canvas
          ref={canvas}
          aria-hidden
          className="absolute inset-0 h-full w-full"
        />
        {matrix && c.permissions.copy ? (
          <div
            className={`absolute inset-0 overflow-hidden ${tool === "select" || tool === "Highlight" ? "select-text" : "pointer-events-none"}`}
            aria-hidden
          >
            {runs.map((run, i) => {
              const [x, y] = transformPoint(matrix, [
                run.transform[4],
                run.transform[5],
              ]);
              const angle = Math.atan2(
                matrix[1] * run.transform[0] + matrix[3] * run.transform[1],
                matrix[0] * run.transform[0] + matrix[2] * run.transform[1]
              );
              const fontHeight = Math.hypot(matrix[2], matrix[3]) * run.height;
              return (
                <span
                  key={i}
                  data-folio-text
                  className="absolute origin-top-left whitespace-pre text-transparent selection:bg-yellow-300/40"
                  dir={run.direction === "rtl" ? "rtl" : "ltr"}
                  style={{
                    left: x,
                    top: y - fontHeight * 0.8,
                    fontFamily: "sans-serif",
                    fontSize: fontHeight,
                    lineHeight: 1,
                    transform: `rotate(${angle}rad) scaleX(${textWidths[i] && fontHeight ? (run.width * Math.hypot(matrix[0], matrix[1]) * 100) / ((textWidths[i] ?? 1) * fontHeight) : 1})`,
                  }}
                >
                  {run.text}
                </span>
              );
            })}
          </div>
        ) : null}
        {matrix && current?.page === page.id
          ? current.boxes.map((box, i) => {
              const rect = transformBox(matrix, box);
              return (
                <span
                  key={i}
                  aria-hidden
                  className="pointer-events-none absolute border-2 border-black bg-yellow-300/40"
                  style={{
                    left: rect.x,
                    top: rect.y,
                    width: rect.width,
                    height: rect.height,
                  }}
                />
              );
            })
          : null}
        {matrix
          ? c.forms.flatMap((field) =>
              field.widgets.flatMap((widget, i) => {
                if (widget.page !== page.id) {
                  return [];
                }
                const rect = transformBox(matrix, widget.box);
                return [
                  <FolioWidget
                    key={`${field.id}:${i}:${revision}`}
                    controller={c}
                    field={field}
                    index={i}
                    style={{
                      left: rect.x,
                      top: rect.y,
                      width: rect.width,
                      height: rect.height,
                      fontSize: rect.height * 0.65,
                    }}
                  />,
                ];
              })
            )
          : null}
        {renderError ? (
          <div className="absolute inset-0 flex items-center justify-center bg-white p-6 text-black">
            {t("folioOfflineMissing")}
          </div>
        ) : null}
      </div>
      {c.permissions.copy ? (
        <details
          className="mt-2 max-w-prose text-sm"
          onToggle={(event) => {
            onReadingChange(page.id, event.currentTarget.open);
            if (event.currentTarget.open) {
              c.setCurrentPage(page.id);
            }
          }}
        >
          <summary className="bracket min-h-11 cursor-pointer py-3">
            {t("folioReadingText")}
          </summary>
          <label className="sr-only" htmlFor={`folio-reading-${page.id}`}>
            {t("folioSelectedText")}
          </label>
          <textarea
            id={`folio-reading-${page.id}`}
            className="well bracket min-h-32 w-full p-3"
            readOnly
            value={runs.map((run) => run.text).join("")}
            onSelect={(event) => {
              const target = event.currentTarget;
              if (target.selectionEnd > target.selectionStart) {
                onSelection(
                  page.id,
                  textQuads(runs, target.selectionStart, target.selectionEnd),
                  target.value.slice(target.selectionStart, target.selectionEnd)
                );
              }
            }}
          />
          <p className="text-muted-fg py-2 text-xs">
            {t(
              runs.some((run) => run.text) ? "folioAccessHelp" : "folioNotOcr"
            )}
          </p>
        </details>
      ) : null}
    </article>
  );
};

export const FolioDocument = ({
  controller: c,
  zoom,
  tool,
  onSelection,
  onPlace,
}: {
  readonly controller: FolioController;
  readonly zoom: "width" | "page" | number;
  readonly tool: Tool;
  readonly onSelection: PageProps["onSelection"];
  readonly onPlace: PageProps["onPlace"];
}) => {
  const { t } = useTranslation();
  const viewport = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 700, height: 700 });
  const [top, setTop] = useState(0);
  const [focused, setFocused] = useState<F.PageId | null>(null);
  useEffect(() => {
    const node = viewport.current;
    if (!node) {
      return;
    }
    const observer = new ResizeObserver(([entry]) => {
      if (entry) {
        setDimensions({
          width: entry.contentRect.width,
          height: entry.contentRect.height,
        });
      }
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);
  const pages = c.snapshot?.pages ?? [];
  const [readingPages, setReadingPages] = useState<ReadonlySet<F.PageId>>(
    new Set()
  );
  const offsets = [0];
  const layout = pages.map((page) => {
    const size = pageSize(page);
    const available = Math.max(dimensions.width - 32, 100);
    const scale =
      zoom === "width"
        ? F.fitWidthScale(size.width, available)
        : zoom === "page"
          ? F.fitPageScale(
              size.width,
              size.height,
              available,
              dimensions.height - 100
            )
          : zoom;
    const height =
      size.height * scale + (readingPages.has(page.id) ? 330 : 100);
    const row = { page, scale, top: offsets.at(-1) ?? 0, height };
    offsets.push(row.top + height);
    return row;
  });
  const limit = dimensions.width < 640 ? 3 : 6;
  const visible = layout.filter(
    (row) => row.top + row.height > top && row.top < top + dimensions.height
  );
  const first = visible[0]?.page.index ?? 0;
  const realized = new Set(
    layout
      .slice(Math.max(0, first - 1), Math.max(0, first - 1) + limit)
      .map((row) => row.page.id)
  );
  if (focused && !realized.has(focused)) {
    const last = [...realized].find(
      (id) => !visible.some((row) => row.page.id === id)
    );
    const removed = last ?? [...realized].at(-1);
    if (removed) {
      realized.delete(removed);
    }
    realized.add(focused);
  }
  const desired = c.currentPage;
  const currentScrollPage = useRef<F.PageId | null>(null);
  useEffect(() => {
    if (desired && desired !== currentScrollPage.current) {
      const row = layout.find((item) => item.page.id === desired);
      if (row && viewport.current) {
        viewport.current.scrollTop = row.top;
        setTop(row.top);
        currentScrollPage.current = desired;
      }
    }
  }, [desired, layout]);
  return (
    <section
      id="folio-document"
      ref={viewport}
      tabIndex={0}
      aria-label={t("folioWorkingFile")}
      className="bg-muted bracket border-input relative h-[70dvh] min-h-96 min-w-0 overflow-auto overscroll-contain border-2 p-4 outline-hidden [overflow-anchor:none]"
      onScroll={(event) => {
        const next = event.currentTarget.scrollTop;
        setTop(next);
        const row = layout.find((item) => item.top + item.height > next + 32);
        if (row) {
          currentScrollPage.current = row.page.id;
          c.setCurrentPage(row.page.id);
        }
      }}
      onFocusCapture={(event) => {
        const article = event.target.closest<HTMLElement>("[data-folio-page]");
        if (article) {
          const row = pages[Number(article.dataset.folioPage) - 1];
          if (row) {
            setFocused(row.id);
          }
        }
      }}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) {
          setFocused(null);
        }
      }}
    >
      <div className="relative" style={{ height: offsets.at(-1) ?? 0 }}>
        {layout
          .filter((row) => realized.has(row.page.id))
          .map((row) => (
            <div
              key={row.page.id}
              className="absolute top-0 left-0 min-w-full"
              style={{ transform: `translateY(${row.top}px)` }}
            >
              <FolioDocumentPage
                controller={c}
                page={row.page}
                scale={row.scale}
                tool={tool}
                maxPixels={
                  ((dimensions.width < 640 ? 16 : 48) * 1024 * 1024) /
                  (4 * limit)
                }
                onSelection={onSelection}
                onPlace={onPlace}
                onReadingChange={(id, open) =>
                  setReadingPages((previous) => {
                    const next = new Set(previous);
                    if (open) {
                      next.add(id);
                    } else {
                      next.delete(id);
                    }
                    return next;
                  })
                }
              />
            </div>
          ))}
      </div>
      {pages.length ? null : (
        <Button
          intent="outline"
          onPress={() => {
            void c.retry();
          }}
        >
          {t("folioRetry")}
        </Button>
      )}
    </section>
  );
};
