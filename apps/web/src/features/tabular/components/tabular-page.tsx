/* oxlint-disable promise/prefer-await-to-then -- Installed file-handle callbacks settle locally before entering the same open workflow. */
/* oxlint-disable eslint/complexity -- The route coordinates the documented session, preview, failure, and dialog states. */
"use client";

import {
  lazy,
  Suspense,
  useEffect,
  useEffectEvent,
  useRef,
  useState,
} from "react";
import { HiArrowDownTray } from "react-icons/hi2";

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

import { useTabular } from "../use-tabular";
import { TabularConfirm, TabularEditorDialog } from "./tabular-dialogs";
import type { EditorDialog } from "./tabular-dialogs";
import { TabularError } from "./tabular-error";
import { TabularExport } from "./tabular-export";
import { TabularParse } from "./tabular-parse";
import {
  TabularInput,
  TabularToolbar,
  TabularActions,
  TabularNotes,
  TabularExplainer,
} from "./tabular-parts";
import { TabularStructure } from "./tabular-structure";

const Grid = lazy(async () => {
  const module = await import("./tabular-grid");
  return { default: module.TabularGrid };
});
const phases = {
  "loading-engine": "tabularLoadingEngine",
  detecting: "tabularDetecting",
  previewing: "tabularPreviewing",
  reading: "tabularReading",
  view: "tabularUpdatingView",
  editing: "tabularApplyingEdit",
  "planning-export": "tabularPlanningExport",
  writing: "tabularWriting",
  verifying: "tabularVerifying",
} as const;

const historyKinds = {
  "set-cell": "tabularEditCell",
  paste: "tabularPasteText",
  "insert-rows": "tabularAddRow",
  "insert-columns": "tabularAddColumn",
  "delete-rows": "tabularDeleteRows",
  "delete-columns": "tabularDeleteColumns",
  "rename-header": "tabularRenameHeader",
  "revert-cell": "tabularRevertCell",
  "revert-all": "tabularRevertAll",
} as const;

declare global {
  interface Window {
    launchQueue?: {
      setConsumer: (
        consumer: (params: {
          readonly files: readonly FileSystemFileHandle[];
        }) => void
      ) => void;
    };
  }
}

export const TabularPage = () => {
  const { t, locale } = useTranslation();
  const c = useTabular();
  const input = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<readonly File[]>([]);
  const [dialog, setDialog] = useState<EditorDialog | null>(null);
  const [exporting, setExporting] = useState(false);
  const [parseSettings, setParseSettings] = useState(false);
  const [revert, setRevert] = useState(false);
  const takeFiles = (incoming: readonly File[]) => {
    const [first] = incoming;
    if (incoming.length > 1) {
      setFiles(incoming);
    } else if (first) {
      c.openFile(first);
    }
  };
  const keydown = useEffectEvent((event: KeyboardEvent) => {
    if (
      event.isComposing ||
      (event.target instanceof Element &&
        event.target.closest("input,textarea,select,[contenteditable=true]"))
    ) {
      return;
    }
    if (event.key === "/") {
      event.preventDefault();
      const target = document.querySelector("#tabular-search");
      if (target instanceof HTMLElement) {
        target.focus();
      }
    }
    if (
      (event.metaKey || event.ctrlKey) &&
      (event.key.toLowerCase() === "z" || event.key.toLowerCase() === "y")
    ) {
      event.preventDefault();
      if (!c.busy && !dialog && !c.pending) {
        void c.applyChange(
          event.shiftKey || event.key.toLowerCase() === "y" ? "redo" : "undo"
        );
      }
    }
  });
  const launched = useEffectEvent((incoming: readonly File[]) =>
    takeFiles(incoming)
  );
  const launchFailed = useEffectEvent(() => c.reportFailure(null));
  useEffect(() => {
    window.addEventListener("keydown", keydown);
    window.launchQueue?.setConsumer((params) => {
      void Promise.all(params.files.map((handle) => handle.getFile()))
        .then(launched)
        .catch(launchFailed);
    });
    return () => {
      window.removeEventListener("keydown", keydown);
      window.launchQueue?.setConsumer(() => {
        /* Stop deliveries after this route leaves. */
      });
    };
  }, []);
  const copy = async () => {
    const text = await c.copyRange();
    if (text !== null) {
      setDialog({ kind: "copy", text });
    }
  };
  const closeDialog = (committed = false) => {
    setDialog(null);
    if (!committed) {
      requestAnimationFrame(() => c.focusSelection());
    }
  };
  const openExport = () => {
    setExporting(true);
    requestAnimationFrame(() => {
      const target = document.querySelector("#tabular-export-format");
      if (target instanceof HTMLElement) {
        target.focus();
        target.scrollIntoView({ block: "center" });
      }
    });
  };
  return (
    <Container className="flex min-w-0 flex-col gap-8 py-10 lg:max-w-none lg:px-12">
      <Masthead
        name="Tabular"
        tagline={t("tabularPromise")}
        note={t("tabularLocal")}
      />
      <p className="text-muted-fg max-w-prose text-sm/6">
        {t("tabularLifetime")}
      </p>
      <TabularInput controller={c} input={input} onFiles={takeFiles} />
      <output className="sr-only" aria-live="polite">
        {c.busy
          ? t(phases[c.progress?.phase ?? "reading"])
          : c.notice === "tabularDownloadReady" && c.receipt
            ? t("tabularDownloadReady", {
                sheets: c.receipt.writtenSheets.toLocaleString(locale),
                rows: c.receipt.writtenRows.toLocaleString(locale),
              })
            : c.historyNotice
              ? t("tabularHistoryDone", {
                  operation: `${t(c.historyNotice.direction === "undo" ? "tabularUndo" : "tabularRedo")}: ${t(historyKinds[c.historyNotice.kind])}`,
                  sheet: c.historyNotice.sheet,
                })
              : c.notice && c.notice !== "tabularDownloadReady"
                ? t(c.notice)
                : c.view && c.view.search === c.query.search
                  ? t("tabularRowCounts", {
                      matched: c.view.matchingRows.toLocaleString(locale),
                      total: c.view.totalRows.toLocaleString(locale),
                    })
                  : ""}
      </output>
      {c.busy ? (
        <Note intent="info">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p>{t(phases[c.progress?.phase ?? "reading"])}</p>
            <Button intent="outline" onPress={() => c.cancel()}>
              {t("tabularCancel")}
            </Button>
          </div>
        </Note>
      ) : null}
      {c.failure ? (
        <>
          <TabularError error={c.failure} />
          <div className="flex flex-wrap gap-2">
            <Button
              intent="outline"
              onPress={() => {
                if (c.source) {
                  c.applyParse(c.options);
                } else {
                  input.current?.click();
                }
              }}
            >
              {t("tabularRetry")}
            </Button>
            <Button intent="plain" onPress={() => input.current?.click()}>
              {t("tabularChooseAnother")}
            </Button>
            {c.source ? (
              <Button intent="plain" onPress={() => setParseSettings(true)}>
                {t("tabularParseSettings")}
              </Button>
            ) : null}
          </div>
        </>
      ) : null}
      {c.candidate || parseSettings ? (
        <TabularParse
          key={c.candidate?.candidateId ?? "settings"}
          controller={c}
        />
      ) : null}
      {c.session ? (
        <>
          <TabularToolbar controller={c} />
          <Suspense fallback={<output>{t("loading")}</output>}>
            <Grid
              controller={c}
              onEdit={(text) =>
                setDialog({
                  kind: "edit",
                  text: text ?? c.activeCell?.display ?? "",
                })
              }
              onRange={() => setDialog({ kind: "range" })}
              onPaste={(text) => setDialog({ kind: "paste", text: text ?? "" })}
              onCopy={copy}
            />
          </Suspense>
          <TabularActions
            controller={c}
            onCopy={copy}
            onPaste={() => setDialog({ kind: "paste", text: "" })}
            onRevert={() => setRevert(true)}
            onParse={() => setParseSettings(!parseSettings)}
          />
          <TabularStructure controller={c} />
          <TabularNotes controller={c} />
          <div className="border-rule flex flex-wrap items-center justify-between gap-4 border-t-[3px] pt-5">
            <p className="text-muted-fg max-w-prose text-sm">
              {t("tabularViewHint")}
            </p>
            <Button
              id="tabular-open-export"
              intent="primary"
              isDisabled={c.busy || !c.view}
              onPress={openExport}
            >
              <HiArrowDownTray aria-hidden />
              {t("tabularExport")}
            </Button>
          </div>
          {exporting ? (
            <TabularExport
              controller={c}
              onClose={() => {
                setExporting(false);
                requestAnimationFrame(() => {
                  const target = document.querySelector("#tabular-open-export");
                  if (target instanceof HTMLElement) {
                    target.focus();
                  }
                });
              }}
            />
          ) : null}
        </>
      ) : null}
      <TabularExplainer />
      {dialog ? (
        <TabularEditorDialog
          key={dialog.kind}
          controller={c}
          dialog={dialog}
          onClose={closeDialog}
        />
      ) : null}
      {c.pending ? (
        <TabularConfirm
          title={t("tabularDiscardTitle")}
          confirmLabel={t("tabularDiscardContinue")}
          description={t("tabularDiscardBody", {
            cells: (c.session?.history.changedCellCount ?? 0).toLocaleString(
              locale
            ),
            headers: (
              c.session?.history.changedHeaderCount ?? 0
            ).toLocaleString(locale),
            structure: (
              c.session?.history.structuralEditCount ?? 0
            ).toLocaleString(locale),
          })}
          onCancel={() => c.keepWorking()}
          onConfirm={() => c.discard()}
        />
      ) : null}
      {revert ? (
        <TabularConfirm
          title={t("tabularRevertAll")}
          description={t("tabularRevertConfirm")}
          onCancel={() => setRevert(false)}
          onConfirm={() => {
            setRevert(false);
            void c.applyChange({ _tag: "RevertAll" });
          }}
        />
      ) : null}
      {files.length ? (
        <ModalContent
          isOpen
          aria-label={t("tabularOneFile")}
          size="sm"
          onOpenChange={(open) => {
            if (!open) {
              setFiles([]);
            }
          }}
        >
          <ModalHeader title={t("tabularOneFile")} />
          <ModalBody>
            <div className="flex flex-col gap-2">
              {files.map((file) => (
                <Button
                  intent="outline"
                  key={`${file.name}:${file.size}:${file.lastModified}`}
                  className="h-auto min-h-11 [overflow-wrap:anywhere] whitespace-normal"
                  onPress={() => {
                    c.openFile(file);
                    setFiles([]);
                  }}
                >
                  {file.name}
                </Button>
              ))}
            </div>
          </ModalBody>
          <ModalFooter>
            <Button intent="plain" onPress={() => setFiles([])}>
              {t("tabularCancel")}
            </Button>
          </ModalFooter>
        </ModalContent>
      ) : null}
    </Container>
  );
};
