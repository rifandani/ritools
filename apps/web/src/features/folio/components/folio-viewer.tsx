/* oxlint-disable react-doctor/no-giant-component -- The viewer owns the toolbar commands, the panel targets, and the chrome tooltip layer as one live session; the panels stay separate components. */
"use client";

import { useAtomValue } from "@effect/atom-react";
import {
  DocumentsToken,
  PDFViewer,
  Region,
  ToolbarItem,
  usePDFViewer,
} from "@embedpdf/viewer-react";
import type {
  CommandDef,
  DocumentsCapability,
  DocumentInfo,
  Layout,
  LayoutEnv,
  Viewer,
} from "@embedpdf/viewer-react";
import { useEffect, useMemo, useRef, useState } from "react";

import { appliedColorModeAtom } from "@/features/color-mode/color-mode.atoms";
import { useTranslation } from "@/features/i18n/use-translation";

import "./folio-viewer.css";
import {
  forgetFolioTextEncrypted,
  isFolioTextEncrypted,
  markFolioTextEncrypted,
} from "../folio.text.ui";
import { folioTextUndo } from "../folio.text.undo";
import { FolioCompress } from "./folio-compress";
import { FolioExtract } from "./folio-extract";
import type { FolioExtractTarget } from "./folio-extract";
import { FolioFlatten } from "./folio-flatten";
import type { FolioFlattenTarget } from "./folio-flatten";
import { FolioOcr } from "./folio-ocr";
import { FolioRepair } from "./folio-repair";
import { FolioSecurity } from "./folio-security";
import { FolioTabs } from "./folio-tabs";
import { FolioText } from "./folio-text";
import { folioViewerTheme } from "./folio-viewer-theme";
import { FolioZoom } from "./folio-zoom";

export interface FolioViewerProps {
  readonly documents: readonly File[];
  /** Called when the viewer closes its last document. */
  readonly onClose: () => void;
}

const savePdf = (bytes: Uint8Array, filename: string) => {
  // SAFETY: the engine returns a Uint8Array over an ArrayBuffer, a BlobPart.
  const url = URL.createObjectURL(
    new Blob([bytes as BlobPart], { type: "application/pdf" })
  );
  const anchor = document.createElement("a");
  anchor.download = filename;
  anchor.href = url;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};

const filenameOf = (document: DocumentInfo | null) => {
  const name = document?.name;
  if (name) {
    return name.toLowerCase().endsWith(".pdf") ? name : `${name}.pdf`;
  }
  const id = document?.id;
  return id ? `${id}.pdf` : "document.pdf";
};

/**
 * The built-in command writes `document.pdf`. Keep the opened file's name
 * instead, so a save never overwrites another download by accident.
 */
const downloadCommand: CommandDef = {
  id: "document:download",
  run: (context) => {
    const library = context.tryGet(DocumentsToken);
    if (!library) {
      return;
    }
    const documentId = context.documentId ?? undefined;
    const filename = filenameOf(library.get(documentId));
    return library.download(documentId).then((bytes) => {
      savePdf(bytes, filename);
    });
  },
};

const viewerStrings = {
  "en-us": {
    "folio.compress": "Compress",
    "folio.extract": "Extract",
    "folio.flatten": "Flattened copy",
    "folio.ocr": "OCR",
    "folio.repair": "Repair copy",
    "folio.security": "Security",
    folioTextBeta: "Text (beta)",
  },
  "id-id": {
    "folio.compress": "Kompres",
    "folio.extract": "Ekstrak",
    "folio.flatten": "Salinan rata",
    "folio.ocr": "OCR",
    "folio.repair": "Salinan perbaikan",
    "folio.security": "Keamanan",
    folioTextBeta: "Teks (beta)",
  },
} as const;

const viewerLayout = (layout: Layout, env: LayoutEnv) =>
  (env.size === "compact"
    ? layout
    : layout.replace("zoom", { custom: "folio-zoom", importance: 4 })
  )
    .tabs("always")
    .add("document:security", { after: "document:print", to: "document" })
    .add("document:ocr", { after: "document:security", to: "document" })
    .add("document:compress", { after: "document:ocr", to: "document" })
    .add("document:extract", { after: "document:compress", to: "document" })
    .add("document:flatten", { after: "document:extract", to: "document" })
    .add("document:repair", { after: "document:flatten", to: "document" })
    .add("document:text-edit", { after: "document:repair", to: "document" });

/**
 * The viewer names each toolbar mark in `title`. Move that name to a data
 * attribute, so Folio can print its own note on hover or focus and the browser
 * does not draw its slow one. A mark without a name of its own takes the title
 * as its accessible name before the title goes.
 */
const adoptChromeTooltips = (root: ShadowRoot) => {
  for (const element of root.querySelectorAll<HTMLElement>(
    '[part~="toolbar-button"]'
  )) {
    const { title } = element;
    if (!title) {
      continue;
    }
    if (!element.getAttribute("aria-label")) {
      element.setAttribute("aria-label", title);
    }
    element.dataset.folioTip = title;
    element.removeAttribute("title");
  }
};

/**
 * The encrypted-tab registry and the undo stack belong to the session, so they
 * listen here, inside the live viewer, instead of in a panel that comes and
 * goes. A tab that needed a password stays out of the Text (beta) mode, and
 * its snapshots go when the tab closes.
 */
const FolioTextWatch = () => {
  const viewer = usePDFViewer();
  useEffect(() => {
    const stop = folioTextUndo.watch(viewer.documents);
    const stops = [
      viewer.documents.onLocked(({ documentId }) => {
        markFolioTextEncrypted(documentId);
      }),
      viewer.documents.onClosed(({ documentId }) => {
        forgetFolioTextEncrypted(documentId);
      }),
    ];
    return () => {
      stop();
      for (const unsubscribe of stops) {
        unsubscribe();
      }
    };
  }, [viewer]);
  return null;
};

/**
 * The PDF workspace: EmbedPDF's drop-in viewer, with the local PDFium engine
 * running in a Worker. The viewer owns opening, editing, annotations, forms,
 * signatures, redaction, printing, and saving; Folio only hands it local files.
 */
export const FolioViewer = ({ documents, onClose }: FolioViewerProps) => {
  const { locale } = useTranslation();
  const colorMode = useAtomValue(appliedColorModeAtom);
  const opened = useRef(false);
  const chromeTipRef = useRef<HTMLDivElement | null>(null);
  const theme = useMemo(() => folioViewerTheme(colorMode), [colorMode]);
  const [viewerElement, setViewerElement] = useState<HTMLElement | null>(null);
  const [overlayHost, setOverlayHost] = useState<HTMLDivElement | null>(null);
  const [securityTarget, setSecurityTarget] = useState<{
    readonly documentId: string;
    readonly documents: DocumentsCapability;
  } | null>(null);
  const [compressTarget, setCompressTarget] =
    useState<DocumentsCapability | null>(null);
  const [extractTarget, setExtractTarget] = useState<FolioExtractTarget | null>(
    null
  );
  const [flattenTarget, setFlattenTarget] = useState<FolioFlattenTarget | null>(
    null
  );
  const [repairTarget, setRepairTarget] = useState<{
    readonly documentId: string;
    readonly documents: DocumentsCapability;
  } | null>(null);
  const [ocrTarget, setOcrTarget] = useState<{
    readonly documentId: string;
    readonly viewer: Viewer;
  } | null>(null);
  const [textTarget, setTextTarget] = useState<{
    readonly documentId: string;
    readonly viewer: Viewer;
  } | null>(null);

  // The toolbar lives in the viewer's shadow root, which the custom element
  // makes when it connects, before React sets the element ref. Take each
  // mark's name, then print it in a fixed layer: a panel cannot clip the
  // note, and a disabled mark's faded stacking context cannot trap it.
  const tooltipRoot = viewerElement?.shadowRoot ?? null;
  useEffect(() => {
    if (!tooltipRoot) {
      return;
    }
    let scheduled = 0;
    let hiding = 0;
    const tip = chromeTipRef.current;

    const adopt = () => {
      adoptChromeTooltips(tooltipRoot);
    };
    const schedule = () => {
      if (scheduled === 0) {
        scheduled = requestAnimationFrame(() => {
          scheduled = 0;
          adopt();
        });
      }
    };
    const hideNow = () => {
      if (tip) {
        delete tip.dataset.visible;
      }
    };
    const hide = () => {
      window.clearTimeout(hiding);
      hiding = window.setTimeout(hideNow, 60);
    };
    const show = (event: Event) => {
      const target = event
        .composedPath()
        .find(
          (node): node is HTMLElement =>
            node instanceof HTMLElement &&
            node.matches('[part~="toolbar-button"]')
        );
      const label = target?.dataset.folioTip;
      if (!(tip && label)) {
        hide();
        return;
      }
      window.clearTimeout(hiding);
      tip.textContent = label;
      tip.dataset.visible = "";
      const box = target.getBoundingClientRect();
      const gap = 8;
      const width = tip.offsetWidth;
      const height = tip.offsetHeight;
      const left = Math.min(
        Math.max(8, box.left + box.width / 2 - width / 2),
        globalThis.innerWidth - width - 8
      );
      const above = globalThis.innerHeight - box.bottom < height + gap + 8;
      tip.style.left = `${left}px`;
      tip.style.top = `${above ? box.top - height - gap : box.bottom + gap}px`;
    };
    const observer = new MutationObserver(schedule);
    adopt();
    observer.observe(tooltipRoot, {
      attributeFilter: ["title"],
      attributes: true,
      childList: true,
      subtree: true,
    });
    tooltipRoot.addEventListener("focusin", show);
    tooltipRoot.addEventListener("focusout", hide);
    tooltipRoot.addEventListener("pointerover", show);
    tooltipRoot.addEventListener("pointerout", hide);
    tooltipRoot.addEventListener("scroll", hide, true);
    globalThis.addEventListener("resize", hide);
    globalThis.addEventListener("scroll", hide, true);

    return () => {
      globalThis.clearTimeout(hiding);
      cancelAnimationFrame(scheduled);
      observer.disconnect();
      tooltipRoot.removeEventListener("focusin", show);
      tooltipRoot.removeEventListener("focusout", hide);
      tooltipRoot.removeEventListener("pointerover", show);
      tooltipRoot.removeEventListener("pointerout", hide);
      tooltipRoot.removeEventListener("scroll", hide, true);
      globalThis.removeEventListener("resize", hide);
      globalThis.removeEventListener("scroll", hide, true);
      hideNow();
    };
  }, [tooltipRoot]);

  const initialDocuments = useMemo(
    () =>
      documents.map((file, index) => ({
        active: index === 0,
        src: file,
      })),
    [documents]
  );

  const commands = useMemo<readonly CommandDef[]>(
    () => [
      downloadCommand,
      {
        id: "document:security",
        icon: "lock",
        label: "Security",
        labelKey: "folio.security",
        visible: (context) =>
          context.tryGet(DocumentsToken)?.getActiveId() !== null,
        run: (context) => {
          const library = context.tryGet(DocumentsToken);
          const documentId =
            context.documentId ?? library?.getActiveId() ?? null;
          if (documentId && library) {
            setSecurityTarget({ documentId, documents: library });
          }
        },
      },
      {
        id: "document:ocr",
        icon: "insertText",
        label: "OCR",
        labelKey: "folio.ocr",
        visible: (context) =>
          context.tryGet(DocumentsToken)?.getActiveId() !== null,
        run: (context) => {
          const library = context.tryGet(DocumentsToken);
          const documentId =
            context.documentId ?? library?.getActiveId() ?? null;
          if (documentId && library?.get(documentId)?.status === "ready") {
            setOcrTarget({ documentId, viewer: context.viewer });
          }
        },
      },
      {
        id: "document:compress",
        icon: "chevronsDown",
        label: "Compress",
        labelKey: "folio.compress",
        visible: (context) =>
          context
            .tryGet(DocumentsToken)
            ?.list()
            .some((document) => document.status === "ready") ?? false,
        run: (context) => {
          const library = context.tryGet(DocumentsToken);
          if (library) {
            setCompressTarget(library);
          }
        },
      },
      {
        id: "document:extract",
        icon: "fileExport",
        label: "Extract",
        labelKey: "folio.extract",
        visible: (context) => {
          const library = context.tryGet(DocumentsToken);
          const documentId =
            context.documentId ?? library?.getActiveId() ?? null;
          return (
            documentId !== null && library?.get(documentId)?.status === "ready"
          );
        },
        run: (context) => {
          const library = context.tryGet(DocumentsToken);
          const documentId =
            context.documentId ?? library?.getActiveId() ?? null;
          if (!(documentId && library)) {
            return;
          }
          const scoped = context.viewer.forDocument(documentId);
          setExtractTarget({
            annotation: scoped.get("annotation"),
            attachment: scoped.get("attachment"),
            documentId,
            documents: library,
            initialPage: scoped.get("stage").getCurrentPageIndex(),
            render: scoped.get("render"),
            selection: scoped.get("selection"),
          });
        },
      },
      {
        id: "document:flatten",
        icon: "fileExport",
        label: "Flattened copy",
        labelKey: "folio.flatten",
        visible: (context) => {
          const library = context.tryGet(DocumentsToken);
          const documentId =
            context.documentId ?? library?.getActiveId() ?? null;
          return (
            documentId !== null && library?.get(documentId)?.status === "ready"
          );
        },
        run: (context) => {
          const library = context.tryGet(DocumentsToken);
          const documentId =
            context.documentId ?? library?.getActiveId() ?? null;
          if (!(documentId && library?.get(documentId)?.status === "ready")) {
            return;
          }
          const scoped = context.viewer.forDocument(documentId);
          setFlattenTarget({
            documentId,
            documents: library,
            initialPage: scoped.get("stage").getCurrentPageIndex(),
            pageEdit: scoped.get("pageEdit"),
            viewer: context.viewer,
          });
        },
      },
      {
        id: "document:repair",
        icon: "copy",
        label: "Repair copy",
        labelKey: "folio.repair",
        // A file that failed to open keeps its tab, so the panel can name
        // why no copy is possible instead of hiding the command.
        visible: (context) => {
          const library = context.tryGet(DocumentsToken);
          const documentId =
            context.documentId ?? library?.getActiveId() ?? null;
          const status = documentId ? library?.get(documentId)?.status : null;
          return (
            status !== null && status !== undefined && status !== "loading"
          );
        },
        run: (context) => {
          const library = context.tryGet(DocumentsToken);
          const documentId =
            context.documentId ?? library?.getActiveId() ?? null;
          if (documentId && library) {
            setRepairTarget({ documentId, documents: library });
          }
        },
      },
      {
        id: "document:text-edit",
        icon: "text",
        label: "Text (beta)",
        labelKey: "folioTextBeta",
        visible: (context) => {
          const library = context.tryGet(DocumentsToken);
          const documentId =
            context.documentId ?? library?.getActiveId() ?? null;
          if (!(library && documentId)) {
            return false;
          }
          if (library.get(documentId)?.status !== "ready") {
            return false;
          }
          if (isFolioTextEncrypted(documentId)) {
            return false;
          }
          const signature = context.tryGet("signature");
          return !(
            signature
              ?.getSnapshot()
              ?.signatures.some((entry) => entry.signed) ?? false
          );
        },
        run: (context) => {
          const library = context.tryGet(DocumentsToken);
          const documentId =
            context.documentId ?? library?.getActiveId() ?? null;
          if (documentId && library) {
            setTextTarget({ documentId, viewer: context.viewer });
          }
        },
      },
    ],
    []
  );

  return (
    <div className="flex h-full min-h-0 w-full flex-col lg:flex-row">
      <div className="relative h-full min-h-0 w-full min-w-0 flex-1">
        <PDFViewer
          className="folio-viewer"
          commands={commands}
          documents={initialDocuments}
          elementRef={setViewerElement}
          layout={viewerLayout}
          locale={locale}
          onDocumentChange={(documentId) => {
            if (documentId === null) {
              if (opened.current) {
                onClose();
              }
              return;
            }
            opened.current = true;
          }}
          style={{ height: "100%", width: "100%" }}
          strings={viewerStrings}
          theme={theme}
        >
          <FolioTextWatch />
          <Region name="tabs">
            <FolioTabs />
          </Region>
          <ToolbarItem id="folio-zoom">
            <FolioZoom />
          </ToolbarItem>
        </PDFViewer>
        <div
          className="pointer-events-none absolute inset-0 z-30"
          ref={setOverlayHost}
        />
      </div>
      {textTarget ? (
        <FolioText
          documentId={textTarget.documentId}
          host={overlayHost}
          onClose={() => setTextTarget(null)}
          viewer={textTarget.viewer}
          viewerElement={viewerElement}
        />
      ) : null}
      {securityTarget ? (
        <FolioSecurity
          documentId={securityTarget.documentId}
          documents={securityTarget.documents}
          onClose={() => setSecurityTarget(null)}
        />
      ) : null}
      {ocrTarget ? (
        <FolioOcr
          documentId={ocrTarget.documentId}
          onClose={() => setOcrTarget(null)}
          viewer={ocrTarget.viewer}
        />
      ) : null}
      {compressTarget ? (
        <FolioCompress
          documents={compressTarget}
          onClose={() => setCompressTarget(null)}
        />
      ) : null}
      {extractTarget ? (
        <FolioExtract
          annotation={extractTarget.annotation}
          attachment={extractTarget.attachment}
          documentId={extractTarget.documentId}
          documents={extractTarget.documents}
          initialPage={extractTarget.initialPage}
          onClose={() => setExtractTarget(null)}
          render={extractTarget.render}
          selection={extractTarget.selection}
        />
      ) : null}
      {flattenTarget ? (
        <FolioFlatten
          documentId={flattenTarget.documentId}
          documents={flattenTarget.documents}
          initialPage={flattenTarget.initialPage}
          onClose={() => setFlattenTarget(null)}
          pageEdit={flattenTarget.pageEdit}
          viewer={flattenTarget.viewer}
        />
      ) : null}
      {repairTarget ? (
        <FolioRepair
          documentId={repairTarget.documentId}
          documents={repairTarget.documents}
          key={repairTarget.documentId}
          onClose={() => setRepairTarget(null)}
        />
      ) : null}
      <div aria-hidden="true" className="folio-chrome-tip" ref={chromeTipRef} />
    </div>
  );
};
