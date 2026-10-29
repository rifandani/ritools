/* oxlint-disable eslint/complexity, react-doctor/no-giant-component -- The route coordinates the fixed open, panel, draft, export, password, and discard states. */
/* oxlint-disable react/set-state-in-effect, react-doctor/no-adjust-state-on-prop-change -- The engine owns page identity; navigation and the initial import panel follow its committed projection. */
/* oxlint-disable jsx-a11y/no-noninteractive-element-interactions -- The drop region duplicates the labelled native file input. */
"use client";

import { useEffect, useEffectEvent, useRef, useState } from "react";

import { Button } from "@/core/components/ui/button";
import {
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
} from "@/core/components/ui/modal";
import { Note } from "@/core/components/ui/note";
import {
  ProgressBar,
  ProgressBarTrack,
} from "@/core/components/ui/progress-bar";
import {
  SheetBody,
  SheetContent,
  SheetFooter,
  SheetHeader,
} from "@/core/components/ui/sheet";
import { useTranslation } from "@/features/i18n/use-translation";

import * as F from "../folio";
import { focusElement } from "../folio.browser";
import { errorKeys, reasonKeys } from "../folio.ui";
import type { Panel, Tool } from "../folio.ui";
import { useFolio } from "../use-folio";
import { FolioAnnotations, newAnnotation } from "./folio-annotations";
import type { AnnotationDraft } from "./folio-annotations";
import { FolioField } from "./folio-controls";
import { FolioDocument } from "./folio-document";
import { FolioExport } from "./folio-export";
import { FolioForms } from "./folio-forms";
import { FolioImport, FolioPages } from "./folio-pages";
import { FolioToolbar } from "./folio-toolbar";

export interface WorkspaceProps {
  readonly file: File;
  readonly initialSources: readonly File[];
  readonly onReplace: (files: readonly File[]) => void;
}
const phaseKeys = {
  "engine-download": "folioEngineDownload",
  opening: "folioOpening",
  reading: "folioReading",
  searching: "folioSearching",
  applying: "folioApplying",
  planning: "folioPlanning",
  writing: "folioWriting",
  verifying: "folioVerifying",
  closing: "folioClose",
} as const;
const panelKeys = {
  pages: "folioPages",
  outline: "folioOutline",
  annotations: "folioAnnotationList",
  forms: "folioFormFields",
} as const;

// fallow-ignore-next-line unused-export -- FolioPage loads this component through its guarded dynamic import.
export const FolioWorkspace = ({
  file,
  initialSources,
  onReplace,
}: WorkspaceProps) => {
  const { t, locale } = useTranslation();
  const c = useFolio(file);
  const input = useRef<HTMLInputElement>(null);
  const [panel, setPanel] = useState<Panel>(null);
  const opener = useRef<HTMLElement | null>(null);
  const [narrow, setNarrow] = useState(false);
  const [zoom, setZoom] = useState<"width" | "page" | number>("width");
  const [query, setQuery] = useState("");
  const [pageNumber, setPageNumber] = useState("1");
  const [password, setPassword] = useState("");
  const [tool, setTool] = useState<Tool>("select");
  const [draft, setDraft] = useState<AnnotationDraft | null>(null);
  const selection = useRef<{
    page: F.PageId;
    quads: Extract<F.Annotation, { _tag: "Highlight" }>["quads"];
    text: string;
  } | null>(null);
  const [importing, setImporting] = useState(false);
  const importedInitial = useRef(false);
  const [exportPlan, setExportPlan] = useState<F.ExportPlan | null>(null);
  const { snapshot } = c;
  const pages = snapshot?.pages ?? [];
  const current = pages.find((page) => page.id === c.currentPage);
  const disabled = c.busy || !snapshot;
  const openPanel = (next: Panel) => {
    if (c.drafting && next !== panel) {
      c.setNotice("folioDiscardDraft");
      return;
    }
    opener.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    setPanel(panel === next ? null : next);
  };
  const closePanel = () => {
    if (c.drafting) {
      c.setNotice("folioDiscardDraft");
      return;
    }
    setPanel(null);
    requestAnimationFrame(() => opener.current?.focus());
  };
  const openDraft = (next: AnnotationDraft) => {
    const entering = !draft || draft.annotation.id !== next.annotation.id;
    setDraft(next);
    c.setDrafting(true);
    setPanel("annotations");
    if (entering) {
      focusElement("folio-annotation-text");
    }
  };
  const closeDraft = () => {
    setDraft(null);
    c.setDrafting(false);
    setTool("select");
  };
  const lastOpened = useRef(0);
  const resetOpened = useEffectEvent(() => {
    setDraft(null);
    c.setDrafting(false);
    setTool("select");
    selection.current = null;
    setPanel(null);
    setImporting(false);
    setExportPlan(null);
  });
  const { openedEpoch } = c;
  useEffect(() => {
    if (!openedEpoch) {
      return;
    }
    if (lastOpened.current) {
      resetOpened();
    }
    lastOpened.current = openedEpoch;
  }, [openedEpoch]);
  useEffect(() => {
    const media = window.matchMedia("(max-width: 1023px)");
    const update = () => setNarrow(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);
  useEffect(() => {
    if (current) {
      setPageNumber(String(current.index + 1));
    }
  }, [current]);
  useEffect(() => {
    if (
      snapshot &&
      !c.busy &&
      initialSources.length &&
      !importedInitial.current
    ) {
      importedInitial.current = true;
      setImporting(true);
    }
  }, [snapshot, c.busy, initialSources]);
  const keydown = useEffectEvent((event: KeyboardEvent) => {
    if (event.isComposing) {
      return;
    }
    if (event.key === "Escape" && draft) {
      event.preventDefault();
      event.stopImmediatePropagation();
      closeDraft();
      return;
    }
    if (
      event.target instanceof Element &&
      event.target.closest("input,textarea,select,[contenteditable=true]")
    ) {
      return;
    }
    if (
      (event.metaKey || event.ctrlKey) &&
      ["z", "y"].includes(event.key.toLowerCase())
    ) {
      event.preventDefault();
      if (!disabled && !c.drafting) {
        void c.undoRedo(
          event.shiftKey || event.key.toLowerCase() === "y" ? "redo" : "undo"
        );
      }
    }
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "f") {
      event.preventDefault();
      focusElement("folio-search");
    }
  });
  useEffect(() => {
    window.addEventListener("keydown", keydown, true);
    return () => window.removeEventListener("keydown", keydown, true);
  }, []);
  const chooseTool = (next: Tool) => {
    if (c.drafting) {
      return;
    }
    setTool(next);
    if (next === "select") {
      return;
    }
    if (next === "Highlight") {
      if (selection.current) {
        openDraft({
          existing: false,
          annotation: {
            _tag: "Highlight",
            id: F.AnnotationId.make(crypto.randomUUID()),
            page: selection.current.page,
            quads: selection.current.quads,
            color: [255, 220, 0, 102],
            contents: selection.current.text,
          },
        });
      } else {
        c.setNotice("folioHighlightHelp");
      }
      return;
    }
    if (current) {
      openDraft({ existing: false, annotation: newAnnotation(next, current) });
    }
  };
  const navigate = (number: number) => {
    const page = pages[Math.max(0, Math.min(pages.length - 1, number - 1))];
    if (page) {
      c.setCurrentPage(page.id);
    }
  };
  const find = (direction: "next" | "previous") => {
    void c.findText(query, direction);
    focusElement("folio-search");
  };
  const review = (scope: F.ExportScope) => {
    void (async () => {
      const plan = await c.reviewExport(scope);
      if (plan) {
        setExportPlan(plan);
      }
    })();
  };
  const result = c.searchResult;
  const matchIndex = result?.current
    ? result.matches.findIndex(
        (match) =>
          match.page === result.current?.page &&
          match.start === result.current.start
      ) + 1
    : 0;
  const searchNotice = result
    ? result.current
      ? t("folioMatch", {
          index: String(matchIndex),
          total: String(result.totalKnown),
          page: String(
            (pages.find((page) => page.id === result.current?.page)?.index ??
              0) + 1
          ),
        })
      : t("folioNoMatch")
    : "";
  const panelBody =
    panel === "pages" ? (
      <FolioPages
        controller={c}
        onImport={() => {
          setImporting(true);
          if (narrow) {
            setPanel(null);
          }
        }}
        onExtract={() => review({ _tag: "Selected", pages: c.selected })}
      />
    ) : panel === "outline" ? (
      <div className="flex flex-col gap-3">
        <h3 className="font-bold">{t("folioOutline")}</h3>
        {c.outline.length ? (
          <ul>
            {c.outline.map((item) => (
              <li key={item.id} className={item.parent ? "pl-4" : ""}>
                {item.page ? (
                  <Button
                    intent="plain"
                    className="h-auto min-h-11 max-w-full justify-start text-left [overflow-wrap:anywhere] whitespace-normal"
                    onPress={() => {
                      if (item.page) {
                        c.setCurrentPage(item.page);
                      }
                      if (narrow) {
                        closePanel();
                      }
                    }}
                  >
                    {item.title}
                  </Button>
                ) : item.externalUrl ? (
                  <a
                    href={item.externalUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bracket inline-flex min-h-11 items-center underline"
                  >
                    {item.title}
                  </a>
                ) : (
                  <span>{item.title}</span>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-muted-fg text-sm">{t("folioNoOutline")}</p>
        )}
      </div>
    ) : panel === "annotations" ? (
      <FolioAnnotations
        controller={c}
        draft={draft}
        onDraft={openDraft}
        onCloseDraft={closeDraft}
      />
    ) : panel === "forms" ? (
      <FolioForms controller={c} />
    ) : null;
  const notice =
    c.notice === "folioReady"
      ? t("folioReady", { count: String(pages.length) })
      : c.notice === "folioDownloadStarted"
        ? t("folioDownloadStarted", {
            revision: String(c.receipt?.revision ?? 0),
          })
        : c.notice
          ? t(c.notice)
          : "";
  return (
    <>
      <section
        aria-label={t("folioWorkingFile")}
        className="border-input flex min-w-0 flex-wrap items-center justify-between gap-4 border-2 p-4"
        onDragOver={(event) => event.preventDefault()}
        onDrop={(event) => {
          event.preventDefault();
          if (!c.busy) {
            const files = [...event.dataTransfer.files];
            c.requestReplace(() => onReplace(files));
          }
        }}
      >
        <div className="min-w-0 flex-1">
          <h2 className="font-bold [overflow-wrap:anywhere]">{file.name}</h2>
          <p className="num text-muted-fg mt-1 text-xs/5">
            {t("folioFileFacts", {
              bytes: file.size.toLocaleString(locale),
              count: pages.length.toLocaleString(locale),
              revision: String(snapshot?.revision ?? 0),
            })}
          </p>
          <p className="mt-1 text-sm">
            {snapshot?.downloadedRevision === snapshot?.revision &&
            snapshot?.revision !== undefined
              ? t("folioDownloadStarted", {
                  revision: String(snapshot.revision),
                })
              : snapshot?.revision
                ? t("folioPending")
                : t("folioOriginal")}
          </p>
          {c.receipt && snapshot && c.receipt.revision !== snapshot.revision ? (
            <p className="text-warning-subtle-fg mt-1 text-xs">
              {t("folioStaleReceipt")}
            </p>
          ) : null}
        </div>
        <Button
          intent="outline"
          isDisabled={c.busy}
          onPress={() => input.current?.click()}
        >
          {t("folioOpen")}
        </Button>
        <input
          ref={input}
          aria-label={t("folioChoose")}
          type="file"
          accept="application/pdf,.pdf"
          multiple
          tabIndex={-1}
          className="sr-only"
          onChange={(event) => {
            const files = [...(event.target.files ?? [])];
            event.target.value = "";
            if (files.length) {
              c.requestReplace(() => onReplace(files));
            }
          }}
        />
      </section>
      <output className="sr-only" aria-live="polite">
        {c.busy ? t(phaseKeys[c.progress?.phase ?? "opening"]) : ""}
      </output>
      {c.busy ? (
        <Note intent="info">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p>{t(c.progress ? phaseKeys[c.progress.phase] : c.phase)}</p>
            <Button
              intent="outline"
              onPress={() => {
                void c.cancel();
              }}
            >
              {t("folioCancel")}
            </Button>
          </div>
          <ProgressBar aria-label={t(c.phase)} isIndeterminate>
            <ProgressBarTrack />
          </ProgressBar>
        </Note>
      ) : null}
      {c.failure && !c.passwordRequired ? (
        <Note intent="danger">
          <div
            id="folio-error"
            tabIndex={-1}
            role="alert"
            className="outline-hidden"
          >
            <h3 className="font-bold">{t("folioErrorTitle")}</h3>
            <p className="mt-2">{t(errorKeys[c.failure.code])}</p>
            {c.failure.code === "resource-limit" ? (
              <p className="mt-2">
                {t(
                  c.failure.sessionAlive
                    ? "folioSessionAlive"
                    : "folioSessionLost"
                )}
              </p>
            ) : null}
            {c.failure.reason ? (
              <p className="mt-2">{t(reasonKeys[c.failure.reason])}</p>
            ) : null}
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button
              intent="outline"
              isDisabled={c.busy}
              onPress={() => {
                if (
                  c.failure?.retry === "connect" &&
                  snapshot &&
                  c.failure.sessionAlive &&
                  !snapshot.facts.encrypted
                ) {
                  c.retryReading();
                  focusElement("folio-document");
                } else if (c.failure?.retry === "connect" || !snapshot) {
                  c.requestReplace(() => {
                    void c.retry();
                  });
                } else {
                  c.clearFailure();
                  focusElement("folio-document");
                }
              }}
            >
              {t(
                c.failure.retry === "reopen" ||
                  c.failure.retry === "choose-file"
                  ? "folioOpen"
                  : "folioRetry"
              )}
            </Button>
            <Button intent="plain" onPress={() => input.current?.click()}>
              {t("folioChoose")}
            </Button>
          </div>
        </Note>
      ) : null}
      {snapshot ? (
        <>
          {snapshot.facts.readOnlyReasons.length ? (
            <Note intent="warning">
              <div className="flex flex-col gap-2">
                {snapshot.facts.readOnlyReasons.map((reason) => (
                  <p key={reason}>
                    {t("folioReadonly", { reason: t(reasonKeys[reason]) })}
                  </p>
                ))}
              </div>
            </Note>
          ) : null}
          {snapshot.history.limitReached ? (
            <Note intent="warning">{t("folioHistoryLimit")}</Note>
          ) : null}
          <FolioToolbar
            c={c}
            current={current}
            pageNumber={pageNumber}
            setPageNumber={setPageNumber}
            zoom={zoom}
            setZoom={setZoom}
            query={query}
            setQuery={setQuery}
            find={find}
            navigate={navigate}
            openPanel={openPanel}
            chooseTool={chooseTool}
            review={review}
            panel={panel}
            tool={tool}
            searchNotice={searchNotice}
            narrow={narrow}
          />
          {c.notice && !c.busy ? (
            <output className="text-sm">{notice}</output>
          ) : null}
          <div
            className={`grid min-w-0 gap-4 ${panel && !narrow ? (panel === "pages" || panel === "outline" ? "grid-cols-[16rem_minmax(0,1fr)]" : "grid-cols-[minmax(0,1fr)_20rem]") : "grid-cols-1"}`}
          >
            {panel && !narrow && (panel === "pages" || panel === "outline") ? (
              <aside className="border-rule max-h-[70dvh] min-w-0 overflow-auto border-r-2 pr-4">
                {panelBody}
              </aside>
            ) : null}
            <FolioDocument
              controller={c}
              zoom={zoom}
              tool={tool}
              onSelection={(page, quads, text) => {
                selection.current = { page, quads, text };
              }}
              onPlace={(id, point, stroke) => {
                const page = pages.find((p) => p.id === id);
                if (!page) {
                  return;
                }
                if (tool === "Note" || tool === "AddedText" || tool === "Ink") {
                  openDraft({
                    existing: false,
                    annotation: newAnnotation(tool, page, point, stroke),
                  });
                }
              }}
            />
            {panel &&
            !narrow &&
            (panel === "annotations" || panel === "forms") ? (
              <aside className="border-rule max-h-[70dvh] min-w-0 overflow-auto border-l-2 pl-4">
                {panelBody}
              </aside>
            ) : null}
          </div>
          <p className="num text-muted-fg text-xs/5">
            {t("folioHistoryFacts", {
              count: String(snapshot.history.entries),
              bytes: (snapshot.history.retainedBytes / 1024 / 1024).toFixed(2),
            })}
          </p>
          {snapshot.facts.hasText ? null : (
            <p className="text-muted-fg text-sm">{t("folioNotOcr")}</p>
          )}
          {panel && narrow ? (
            <SheetContent
              isOpen
              side="right"
              className="max-h-[calc(var(--visual-viewport-height,100dvh)_-_2rem)] w-[calc(100%_-_2rem)] max-w-lg [&_button]:min-h-11"
              aria-label={t(panelKeys[panel])}
              onOpenChange={(open) => {
                if (!open) {
                  closePanel();
                }
              }}
            >
              <SheetHeader title={t(panelKeys[panel])} />
              <SheetBody>{panelBody}</SheetBody>
              <SheetFooter>
                <Button intent="outline" onPress={closePanel}>
                  {t("folioClose")}
                </Button>
              </SheetFooter>
            </SheetContent>
          ) : null}
          {importing ? (
            <FolioImport
              controller={c}
              initialFiles={initialSources}
              onClose={() => {
                setImporting(false);
                focusElement("folio-open-pages");
              }}
            />
          ) : null}
          {exportPlan ? (
            <FolioExport
              key={exportPlan.id}
              controller={c}
              plan={exportPlan}
              onClose={() => {
                setExportPlan(null);
                c.setPlan(null);
                focusElement("folio-download");
              }}
            />
          ) : null}
        </>
      ) : null}
      {c.passwordRequired ? (
        <ModalContent
          className="[&_button]:min-h-11"
          isOpen
          aria-label={t("folioPassword")}
          size="sm"
          onOpenChange={(open) => {
            if (!open) {
              setPassword("");
              onReplace([]);
            }
          }}
        >
          <ModalHeader title={t("folioPassword")} />
          <ModalBody>
            <p className="mb-4 text-sm/6">
              {t("folioEncryptedReason")} {t("folioUnlock")}
            </p>
            <FolioField
              id="folio-password"
              label={t("folioPassword")}
              type="password"
              value={password}
              onChange={setPassword}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  void c.retry(password);
                  setPassword("");
                }
              }}
            />
            {c.failure?.code === "wrong-password" ? (
              <p className="mt-3 text-sm" role="alert">
                {t("folioWrongPassword")}
              </p>
            ) : null}
          </ModalBody>
          <ModalFooter>
            <Button
              intent="plain"
              onPress={() => {
                setPassword("");
                onReplace([]);
              }}
            >
              {t("folioCancel")}
            </Button>
            <Button
              isDisabled={c.busy}
              onPress={() => {
                void c.retry(password);
                setPassword("");
              }}
            >
              {t("folioUnlock")}
            </Button>
          </ModalFooter>
        </ModalContent>
      ) : null}
      {c.pending ? (
        <ModalContent
          className="[&_button]:min-h-11"
          isOpen
          role="alertdialog"
          aria-label={t("folioDiscardTitle")}
          size="sm"
          onOpenChange={(open) => {
            if (!open) {
              c.keepEditing();
            }
          }}
        >
          <ModalHeader title={t("folioDiscardTitle")} />
          <ModalBody>{t("folioDiscardBody")}</ModalBody>
          <ModalFooter>
            <Button autoFocus intent="outline" onPress={() => c.keepEditing()}>
              {t("folioKeepEditing")}
            </Button>
            <Button intent="danger" onPress={() => c.discard()}>
              {t("folioDiscard")}
            </Button>
          </ModalFooter>
        </ModalContent>
      ) : null}
    </>
  );
};
