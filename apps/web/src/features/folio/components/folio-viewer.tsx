"use client";

import { useAtomValue } from "@effect/atom-react";
import {
  DocumentsToken,
  PDFViewer,
  Region,
  ToolbarItem,
} from "@embedpdf/viewer-react";
import type {
  CommandDef,
  DocumentsCapability,
  DocumentInfo,
  Layout,
  LayoutEnv,
} from "@embedpdf/viewer-react";
import { useMemo, useRef, useState } from "react";

import { appliedColorModeAtom } from "@/features/color-mode/color-mode.atoms";
import { useTranslation } from "@/features/i18n/use-translation";

import "./folio-viewer.css";
import { FolioSecurity } from "./folio-security";
import { FolioTabs } from "./folio-tabs";
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

const securityStrings = {
  "en-us": { "folio.security": "Security" },
  "id-id": { "folio.security": "Keamanan" },
} as const;

const viewerLayout = (layout: Layout, env: LayoutEnv) =>
  (env.size === "compact"
    ? layout
    : layout.replace("zoom", { custom: "folio-zoom", importance: 4 })
  )
    .tabs("always")
    .add("document:security", { after: "document:print", to: "document" });

/**
 * The PDF workspace: EmbedPDF's drop-in viewer, with the local PDFium engine
 * running in a Worker. The viewer owns opening, editing, annotations, forms,
 * signatures, redaction, printing, and saving; Folio only hands it local files.
 */
export const FolioViewer = ({ documents, onClose }: FolioViewerProps) => {
  const { locale } = useTranslation();
  const colorMode = useAtomValue(appliedColorModeAtom);
  const opened = useRef(false);
  const theme = useMemo(() => folioViewerTheme(colorMode), [colorMode]);
  const [securityTarget, setSecurityTarget] = useState<{
    readonly documentId: string;
    readonly documents: DocumentsCapability;
  } | null>(null);

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
    ],
    []
  );

  return (
    <>
      <PDFViewer
        className="folio-viewer"
        commands={commands}
        documents={initialDocuments}
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
        strings={securityStrings}
        theme={theme}
      >
        <Region name="tabs">
          <FolioTabs />
        </Region>
        <ToolbarItem id="folio-zoom">
          <FolioZoom />
        </ToolbarItem>
      </PDFViewer>
      {securityTarget ? (
        <FolioSecurity
          documentId={securityTarget.documentId}
          documents={securityTarget.documents}
          onClose={() => setSecurityTarget(null)}
        />
      ) : null}
    </>
  );
};
