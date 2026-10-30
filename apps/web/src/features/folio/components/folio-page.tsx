/* oxlint-disable react/set-state-in-effect, react/todo -- The route starts one local-file open after mount, never during SSR; the guarded import and finalizer stay at the browser boundary. */
/* oxlint-disable jsx-a11y/no-noninteractive-element-interactions -- The PDF drop region duplicates a labelled file input. */
"use client";

import { useRef, useState } from "react";
import type { ComponentType } from "react";

import { Button } from "@/core/components/ui/button";
import { Container } from "@/core/components/ui/container";
import { Note } from "@/core/components/ui/note";
import { useTranslation } from "@/features/i18n/use-translation";

import { FolioExplainer } from "./folio-explainer";
import type { FolioViewerProps } from "./folio-viewer";

type Failure = "empty" | "engine" | "sample";

const isPdf = (file: File) =>
  file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");

const stageStyle = { height: "clamp(48rem, 120svh, 100rem)" } as const;

/**
 * Folio: a local PDF workspace. Before a file opens, the page explains the
 * tool and offers a drop target. After one opens, EmbedPDF's viewer takes the
 * page and keeps every file in this tab.
 */
export const FolioPage = () => {
  const { t } = useTranslation();
  const input = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<readonly File[]>([]);
  const [generation, setGeneration] = useState(0);
  const [viewer, setViewer] = useState<ComponentType<FolioViewerProps> | null>(
    null
  );
  const [failure, setFailure] = useState<Failure | null>(null);
  const [dragging, setDragging] = useState(false);
  const [busy, setBusy] = useState(false);

  const prepare = async () => {
    if (viewer) {
      return true;
    }
    try {
      const module = await import("./folio-viewer");
      setViewer(() => module.FolioViewer);
      return true;
    } catch {
      setFailure("engine");
      return false;
    }
  };

  const open = (incoming: readonly File[]) => {
    const pdfs = incoming.filter(isPdf);
    if (pdfs.length === 0) {
      setFailure(incoming.length > 0 ? "empty" : null);
      return;
    }
    setFailure(null);
    setFiles(pdfs);
    setGeneration((current) => current + 1);
    void prepare();
  };

  const sample = async () => {
    setBusy(true);
    setFailure(null);
    try {
      const response = await fetch("/folio/sample.pdf", {
        cache: "force-cache",
      });
      if (!response.ok) {
        throw new Error("sample");
      }
      open([
        new File([await response.arrayBuffer()], "folio-sample.pdf", {
          type: "application/pdf",
        }),
      ]);
    } catch {
      setFailure("sample");
    } finally {
      setBusy(false);
    }
  };

  const close = () => {
    setFiles([]);
    setFailure(null);
  };

  if (files.length > 0) {
    const Viewer = viewer;
    return (
      <Container className="flex max-w-none min-w-0 flex-col gap-6 py-10">
        <div className="border-rule bg-bg min-h-0 border-2" style={stageStyle}>
          {failure === "engine" ? (
            <div className="grid h-full place-content-center gap-4 px-6 text-center">
              <p className="text-muted-fg max-w-prose text-sm/6">
                {t("folioEngineUnavailable")}
              </p>
              <div className="flex justify-center gap-2">
                <Button
                  intent="outline"
                  onPress={() => window.location.reload()}
                >
                  {t("reload")}
                </Button>
                <Button intent="plain" onPress={close}>
                  {t("folioCloseFile")}
                </Button>
              </div>
            </div>
          ) : Viewer ? (
            <Viewer key={generation} documents={files} onClose={close} />
          ) : (
            <output
              aria-live="polite"
              className="text-muted-fg grid h-full place-content-center text-sm"
            >
              {t("folioOpening")}
            </output>
          )}
        </div>
        <FolioExplainer />
      </Container>
    );
  }

  return (
    <Container className="flex max-w-none min-w-0 flex-col gap-6 py-10 [&_button]:min-h-11">
      <section
        aria-label={t("folioChoose")}
        className={`border-input bracket flex min-h-52 min-w-0 flex-col items-center justify-center gap-3 border-2 px-6 py-8 text-center ${dragging ? "bg-wash-red" : ""}`}
        onDragLeave={() => setDragging(false)}
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          if (!busy) {
            open([...event.dataTransfer.files]);
          }
        }}
      >
        <div className="min-w-0">
          <h2 className="font-display text-xl leading-6 font-black uppercase [font-stretch:75%]">
            {t("folioDropHeading")}
          </h2>
          <p className="text-muted-fg mt-2 text-xs/5">
            {t("folioLocalSession")}
          </p>
        </div>
        <div className="flex flex-wrap justify-center gap-2">
          <Button isDisabled={busy} onPress={() => input.current?.click()}>
            {t("folioChoose")}
          </Button>
          <Button
            intent="outline"
            isDisabled={busy}
            onPress={() => {
              void sample();
            }}
          >
            {t("folioSample")}
          </Button>
        </div>
        <input
          ref={input}
          accept="application/pdf,.pdf"
          aria-label={t("folioChoose")}
          className="sr-only"
          multiple
          tabIndex={-1}
          type="file"
          onChange={(event) => {
            open([...(event.target.files ?? [])]);
            event.target.value = "";
          }}
        />
      </section>
      {failure === "empty" ? (
        <Note intent="warning">{t("folioInvalidPdf")}</Note>
      ) : null}
      {failure === "sample" ? (
        <Note intent="danger">{t("folioSampleUnavailable")}</Note>
      ) : null}
      <FolioExplainer />
    </Container>
  );
};
