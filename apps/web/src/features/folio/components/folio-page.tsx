/* oxlint-disable react/todo -- The engine import and file opening use explicit failure/finally handling at the browser boundary. */
/* oxlint-disable jsx-a11y/no-noninteractive-element-interactions -- The PDF drop region duplicates a labelled file input. */
/* oxlint-disable react-doctor/no-array-index-as-key -- The file choices are immutable for this dialog lifetime and include every dropped file. */
"use client";

import { Effect } from "effect";
import { useRef, useState } from "react";
import type { ComponentType } from "react";

import { Button } from "@/core/components/ui/button";
import { Container } from "@/core/components/ui/container";
import { Masthead } from "@/core/components/ui/masthead";
import {
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
} from "@/core/components/ui/modal";
import { Note } from "@/core/components/ui/note";
import { useTranslation } from "@/features/i18n/use-translation";

import { FolioFailure, RequestId } from "../folio";
import { sampleFile } from "../folio.browser";
import { errorKeys, runLocal, uiFailure } from "../folio.ui";
import { FolioSelect } from "./folio-controls";
import { FolioExplainer } from "./folio-explainer";
import type { WorkspaceProps } from "./folio-workspace";

export const FolioPage = () => {
  const { t } = useTranslation();
  const input = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [sources, setSources] = useState<readonly File[]>([]);
  const [files, setFiles] = useState<readonly File[]>([]);
  const [choice, setChoice] = useState("0");
  const [workspaceComponent, setWorkspaceComponent] =
    useState<ComponentType<WorkspaceProps> | null>(null);
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<ReturnType<typeof uiFailure> | null>(
    null
  );
  const [dragging, setDragging] = useState(false);
  const [generation, setGeneration] = useState(0);
  const loading = useRef(0);
  const replace = async (next: File, others: readonly File[] = []) => {
    loading.current += 1;
    const request = loading.current;
    setBusy(true);
    setFailure(null);
    try {
      const module = await runLocal(
        Effect.tryPromise({
          try: () => import("./folio-workspace"),
          catch: () =>
            FolioFailure.make({
              requestId: RequestId.make("load"),
              code: "offline-asset-missing",
              sessionAlive: false,
            }),
        })
      );
      if (request !== loading.current) {
        return;
      }
      setWorkspaceComponent(() => module.FolioWorkspace);
      setFile(next);
      setSources(others);
      setGeneration((n) => n + 1);
    } catch (error) {
      setFailure(uiFailure(error));
    } finally {
      if (request === loading.current) {
        setBusy(false);
      }
    }
  };
  const takeFiles = (incoming: readonly File[]) => {
    if (incoming.length === 0) {
      setFile(null);
      setWorkspaceComponent(null);
      return;
    }
    if (incoming.length > 1) {
      setChoice("0");
      setFiles(incoming);
    } else if (incoming[0]) {
      void replace(incoming[0]);
    }
  };
  const sample = async () => {
    setBusy(true);
    setFailure(null);
    try {
      await replace(await runLocal(sampleFile()));
    } catch (error) {
      setFailure(uiFailure(error));
    } finally {
      setBusy(false);
    }
  };
  const Workspace = workspaceComponent;
  return (
    <Container className="flex min-w-0 flex-col gap-6 py-10 [--container-breakpoint:90rem] [&_button]:min-h-11">
      <Masthead name="Folio" />
      {file && Workspace ? (
        <Workspace
          key={generation}
          file={file}
          initialSources={sources}
          onReplace={takeFiles}
        />
      ) : (
        <>
          <section
            aria-label={t("folioChoose")}
            className={`border-input bracket flex min-h-52 min-w-0 flex-col items-center justify-center gap-3 border-2 px-6 py-8 text-center ${dragging ? "bg-wash-red" : ""}`}
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragging(false);
              if (!busy) {
                takeFiles([...e.dataTransfer.files]);
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
              <Button onPress={() => input.current?.click()} isDisabled={busy}>
                {t("folioChoose")}
              </Button>
              <Button
                intent="outline"
                onPress={() => {
                  void sample();
                }}
                isDisabled={busy}
              >
                {t("folioSample")}
              </Button>
            </div>
          </section>
          <input
            ref={input}
            aria-label={t("folioChoose")}
            type="file"
            accept="application/pdf,.pdf"
            multiple
            className="sr-only"
            tabIndex={-1}
            onChange={(e) => {
              takeFiles([...(e.target.files ?? [])]);
              e.target.value = "";
            }}
          />
        </>
      )}
      {busy ? (
        <Note intent="info">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <output>{t("folioEngineDownload")}</output>
            <Button
              intent="outline"
              onPress={() => {
                loading.current += 1;
                setBusy(false);
              }}
            >
              {t("folioCancel")}
            </Button>
          </div>
        </Note>
      ) : null}
      {failure ? (
        <Note intent="danger">
          <div id="folio-error" tabIndex={-1} role="alert">
            {t(errorKeys[failure.code])}
          </div>
          <Button intent="outline" onPress={() => window.location.reload()}>
            {t("reload")}
          </Button>
          <Button intent="outline" onPress={() => input.current?.click()}>
            {t("folioChoose")}
          </Button>
        </Note>
      ) : null}
      <FolioExplainer />
      {files.length ? (
        <ModalContent
          className="[&_button]:min-h-11"
          isOpen
          aria-label={t("folioMultiTitle")}
          size="md"
          onOpenChange={(open) => {
            if (!open) {
              setFiles([]);
            }
          }}
        >
          <ModalHeader title={t("folioMultiTitle")} />
          <ModalBody>
            <p className="mb-4 text-sm/6">{t("folioMultiBody")}</p>
            <FolioSelect
              label={t("folioWorkingFile")}
              id="folio-working-file"
              value={choice}
              onChange={setChoice}
            >
              {files.map((item, i) => (
                <option key={i} value={String(i)}>
                  {item.name}
                </option>
              ))}
            </FolioSelect>
            <ul className="mt-4 flex flex-col gap-2 text-sm [overflow-wrap:anywhere]">
              {files.map((item, i) => (
                <li key={i}>
                  {item.name}{" "}
                  <span className="num text-muted-fg">
                    ({item.size.toLocaleString()} B)
                  </span>
                </li>
              ))}
            </ul>
          </ModalBody>
          <ModalFooter>
            <Button intent="plain" onPress={() => setFiles([])}>
              {t("folioCancel")}
            </Button>
            <Button
              intent="outline"
              onPress={() => {
                const next = files[Number(choice)];
                if (next) {
                  void replace(next);
                }
                setFiles([]);
              }}
            >
              {t("folioOpenOnly")}
            </Button>
            <Button
              onPress={() => {
                const next = files[Number(choice)];
                if (next) {
                  void replace(
                    next,
                    files.filter((_, i) => i !== Number(choice))
                  );
                }
                setFiles([]);
              }}
            >
              {t("folioOpenWithSources")}
            </Button>
          </ModalFooter>
        </ModalContent>
      ) : null}
    </Container>
  );
};
