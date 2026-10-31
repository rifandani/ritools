/* oxlint-disable react/set-state-in-effect -- The panel reads the signature state of the live viewer into React state. */
"use client";

import type { Viewer, ViewerPlugins } from "@embedpdf/viewer-react";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  HiArrowDownTray,
  HiDocumentArrowDown,
  HiStop,
  HiXMark,
} from "react-icons/hi2";

import { Button } from "@/core/components/ui/button";
import { Checkbox, CheckboxField } from "@/core/components/ui/checkbox";
import { Legend } from "@/core/components/ui/field";
import { Heading } from "@/core/components/ui/heading";
import { Note } from "@/core/components/ui/note";
import { Radio, RadioField, RadioGroup } from "@/core/components/ui/radio";
import { download } from "@/core/libs/files";
import { useTranslation } from "@/features/i18n/use-translation";

import { folioExtractFormatSize } from "../folio.extract";
import {
  folioFlattenFlagsRefusal,
  folioFlattenName,
  folioFlattenPages,
  folioFlattenSelectedIndexes,
} from "../folio.flatten";
import type {
  FolioFlattenFlags,
  FolioFlattenRefusal,
  FolioFlattenScope,
} from "../folio.flatten";
import type { FolioFlattenStats } from "../folio.flatten.types";
import {
  makeFolioFlattenedCopy,
  stopFolioFlatten,
} from "../folio.flatten.worker-client";
import type { FolioFlattenError } from "../folio.flatten.worker-client";
import { isFolioTextEncrypted } from "../folio.text.ui";

type DocumentsCapability = ViewerPlugins["documents"];
type PageEditCapability = ViewerPlugins["pageEdit"];
type SelectionCapability = ViewerPlugins["selection"];
type Translate = ReturnType<typeof useTranslation>["t"];

export interface FolioFlattenProps {
  readonly documentId: string;
  readonly documents: DocumentsCapability;
  readonly initialPage: number;
  readonly onClose: () => void;
  readonly pageEdit: PageEditCapability;
  readonly selection: SelectionCapability;
  readonly viewer: Viewer;
}

/** Everything the viewer hands the panel but its close action. */
export type FolioFlattenTarget = Omit<FolioFlattenProps, "onClose">;

type Phase = "done" | "failed" | "refused" | "running" | "setup" | "stopped";

interface Result {
  readonly blob: Blob;
  readonly name: string;
  readonly stats: FolioFlattenStats;
}

const REFUSAL_KEY = {
  encrypted: "folioFlattenRefusedEncrypted",
  layers: "folioFlattenRefusedLayers",
  restricted: "folioFlattenRefusedRestricted",
  signed: "folioFlattenRefusedSigned",
} as const satisfies Record<FolioFlattenRefusal, string>;

const CHECK_KEY = {
  open: "folioFlattenCheckOpen",
  pages: "folioFlattenCheckPages",
  render: "folioFlattenCheckRender",
  text: "folioFlattenCheckText",
} as const;

const FAILURE_KEY = {
  busy: "folioFlattenFailedBusy",
  copy: "folioFlattenFailedCopy",
  engine: "folioFlattenFailedEngine",
  source: "folioFlattenFailedSource",
  stopped: "folioFlattenStopped",
  unreadable: "folioFlattenFailedUnreadable",
  verify: "folioFlattenFailedVerify",
  write: "folioFlattenFailedWrite",
} as const;

const KEPT = ["folioFlattenKeptContent", "folioFlattenKeptForms"] as const;

const REMOVED = [
  "folioFlattenRemovedForms",
  "folioFlattenRemovedLinks",
  "folioFlattenRemovedScripts",
  "folioFlattenRemovedAttachments",
  "folioFlattenRemovedMedia",
  "folioFlattenRemovedOutlines",
  "folioFlattenRemovedTags",
  "folioFlattenRemovedAnnotations",
] as const;

const WARNINGS = [
  "folioFlattenWarnAccessible",
  "folioFlattenWarnFill",
  "folioFlattenWarnMetadata",
  "folioFlattenWarnLayers",
] as const;

/** The named reason a run made no copy. */
const failureText = (error: FolioFlattenError, t: Translate): string => {
  if (error.check === "interactive") {
    return t("folioFlattenCheckInteractive", {
      names: error.names.join(", "),
    });
  }
  return error.check ? t(CHECK_KEY[error.check]) : t(FAILURE_KEY[error.reason]);
};

/**
 * The text of each page in scope, read from the live viewer. The pages are
 * read one at a time, and the reader's own selection is put back afterwards.
 */
/* oxlint-disable eslint/no-await-in-loop, react-doctor/async-await-in-loop -- The selection is a single live range, so the pages cannot be read in parallel. */
const readFolioSourceText = async (
  selection: SelectionCapability,
  indexes: readonly number[],
  signal: AbortSignal
): Promise<readonly string[]> => {
  const saved = selection.getRange();
  const texts: string[] = [];
  try {
    for (const index of indexes) {
      if (signal.aborted) {
        throw new DOMException("Flatten cancelled", "AbortError");
      }
      selection.selectPage(index);
      const range = selection.getRange();
      if (!range) {
        throw new Error("the page text could not be read");
      }
      texts.push(
        await selection.readTextInRange(
          {
            end: { index: Number.MAX_SAFE_INTEGER, page: range.start.page },
            start: { index: 0, page: range.start.page },
          },
          { signal }
        )
      );
    }
  } finally {
    if (saved) {
      selection.select(saved);
    } else {
      selection.clear();
    }
  }
  return texts;
};

/** All pages, or the pages the reader picks, with the page count. */
const FolioFlattenPages = ({
  isDisabled,
  onScopeChange,
  onSelectedChange,
  pageCount,
  scope,
  selected,
}: {
  readonly isDisabled: boolean;
  readonly onScopeChange: (scope: FolioFlattenScope) => void;
  readonly onSelectedChange: (selected: ReadonlySet<number>) => void;
  readonly pageCount: number;
  readonly scope: FolioFlattenScope;
  readonly selected: ReadonlySet<number>;
}) => {
  const { t } = useTranslation();
  const allSelected = pageCount > 0 && selected.size === pageCount;
  return (
    <fieldset>
      <Legend>{t("folioFlattenScope")}</Legend>
      <RadioGroup
        aria-label={t("folioFlattenScope")}
        className="mt-2 space-y-2"
        isDisabled={isDisabled}
        onChange={(value) => {
          if (value === "all" || value === "selected") {
            onScopeChange(value);
          }
        }}
        value={scope}
      >
        <RadioField value="all">
          <Radio>{t("folioFlattenScopeAll", { count: pageCount })}</Radio>
        </RadioField>
        <RadioField value="selected">
          <Radio>
            {t("folioFlattenScopeSelected", { count: selected.size })}
          </Radio>
        </RadioField>
      </RadioGroup>
      {scope === "selected" ? (
        <section className="mt-3">
          <div className="flex items-center justify-between gap-2">
            <p className="text-muted-fg text-xs/5">
              {t("folioFlattenSelectedHint")}
            </p>
            <Button
              intent="plain"
              isDisabled={isDisabled || pageCount === 0}
              onPress={() => {
                onSelectedChange(
                  allSelected
                    ? new Set()
                    : new Set(
                        Array.from({ length: pageCount }, (_, index) => index)
                      )
                );
              }}
              size="sm"
            >
              {allSelected
                ? t("folioFlattenSelectNone")
                : t("folioFlattenSelectAll")}
            </Button>
          </div>
          <div className="border-rule mt-2 max-h-48 overflow-auto border-2">
            <ul className="divide-rule divide-y">
              {Array.from({ length: pageCount }, (_, index) => (
                <li className="px-3 py-2" key={`page-${index + 1}`}>
                  <CheckboxField
                    isDisabled={isDisabled}
                    isSelected={selected.has(index)}
                    onChange={(isSelected) => {
                      const next = new Set(selected);
                      if (isSelected) {
                        next.add(index);
                      } else {
                        next.delete(index);
                      }
                      onSelectedChange(next);
                    }}
                  >
                    <Checkbox>
                      {t("folioFlattenPage", { page: index + 1 })}
                    </Checkbox>
                  </CheckboxField>
                </li>
              ))}
            </ul>
          </div>
        </section>
      ) : null}
    </fieldset>
  );
};

/** What the copy keeps, what it removes, its name, and what it loses. */
const FolioFlattenFacts = ({ name }: { readonly name: string }) => {
  const { t } = useTranslation();
  return (
    <>
      <section>
        <h3 className="text-fg text-sm font-bold">{t("folioFlattenKept")}</h3>
        <ul className="text-muted-fg mt-1 list-disc ps-5 text-sm/6">
          {KEPT.map((key) => (
            <li key={key}>{t(key)}</li>
          ))}
        </ul>
      </section>
      <section>
        <h3 className="text-fg text-sm font-bold">
          {t("folioFlattenRemoved")}
        </h3>
        <ul className="text-muted-fg mt-1 list-disc ps-5 text-sm/6">
          {REMOVED.map((key) => (
            <li key={key}>{t(key)}</li>
          ))}
        </ul>
      </section>
      <section>
        <h3 className="text-fg text-sm font-bold">{t("folioFlattenOutput")}</h3>
        <p className="text-muted-fg mt-1 text-sm/6 break-all">{name}</p>
      </section>
      <Note intent="warning">
        <ul className="list-disc ps-4">
          {WARNINGS.map((key) => (
            <li key={key}>{t(key)}</li>
          ))}
        </ul>
      </Note>
      <Note>{t("folioFlattenVector")}</Note>
    </>
  );
};

/** The receipt of a verified copy. */
const FolioFlattenReceipt = ({ result }: { readonly result: Result }) => {
  const { locale, t } = useTranslation();
  return (
    <output aria-live="polite" className="block">
      <section className="border-rule border-2 p-3">
        <p className="text-fg text-sm leading-5 font-bold">
          {t("folioFlattenDone")}
        </p>
        <p className="text-muted-fg mt-1 text-sm/6">
          {t("folioFlattenReceipt", {
            count: result.stats.pages,
            size: folioExtractFormatSize(result.stats.outputBytes, locale),
          })}
        </p>
        <p className="text-muted-fg mt-2 text-sm/6">
          {t("folioFlattenDownloaded")}
        </p>
        <p className="text-muted-fg mt-2 text-xs/5">
          {t("folioFlattenChecked")}
        </p>
      </section>
    </output>
  );
};

/** The panel footer: start, stop, download, and start again. */
const FolioFlattenActions = ({
  canStart,
  onCancel,
  onReset,
  onRun,
  phase,
  progress,
  result,
}: {
  readonly canStart: boolean;
  readonly onCancel: () => void;
  readonly onReset: () => void;
  readonly onRun: () => void;
  readonly phase: Phase;
  readonly progress: { readonly done: number; readonly total: number };
  readonly result: Result | null;
}) => {
  const { t } = useTranslation();
  const running = phase === "running";
  let main = (
    <Button intent="primary" isDisabled={!canStart} onPress={onRun}>
      <HiDocumentArrowDown aria-hidden="true" />
      {t("folioFlattenStart")}
    </Button>
  );
  if (running) {
    main = (
      <Button intent="danger" onPress={onCancel}>
        <HiStop aria-hidden="true" />
        {t("folioFlattenStopIdle")}
      </Button>
    );
  } else if (result) {
    main = (
      <Button
        intent="primary"
        onPress={() => {
          download(result.blob, result.name);
        }}
      >
        <HiArrowDownTray aria-hidden="true" />
        {t("folioFlattenDownloadAgain")}
      </Button>
    );
  }
  return (
    <footer className="border-rule bg-overlay border-t-2">
      {running ? (
        <progress
          aria-label={t("folioFlattenProgress")}
          className="bg-border [&::-moz-progress-bar]:bg-accent [&::-webkit-progress-bar]:bg-border [&::-webkit-progress-value]:bg-accent block h-1 w-full appearance-none border-0"
          max={Math.max(progress.total, 1)}
          value={progress.total === 0 ? undefined : progress.done}
        />
      ) : null}
      <div className="flex flex-col gap-2 px-5 py-4">
        {main}
        {phase === "done" || phase === "failed" || phase === "stopped" ? (
          <Button intent="plain" onPress={onReset}>
            {t("folioFlattenReset")}
          </Button>
        ) : null}
      </div>
    </footer>
  );
};

/**
 * The Flattened copy panel: a new PDF of the pages in scope, with form values
 * and annotation appearances painted into the page and every interactive part
 * removed. The open file, its history, and its unsaved state do not change.
 */
export const FolioFlatten = ({
  documentId,
  documents,
  initialPage,
  onClose,
  pageEdit,
  selection,
  viewer,
}: FolioFlattenProps) => {
  const { t } = useTranslation();
  const info = documents.get(documentId);
  const pageCount = info?.pageCount ?? 0;
  const name = folioFlattenName(info?.name ?? "document.pdf");
  // Start on the reader's page selection, or on the page they are looking at.
  const readerSelection = folioFlattenSelectedIndexes(
    pageEdit
      .getSelected()
      .map((ref) => documents.getPageIndex(ref, documentId)),
    pageCount
  );
  const firstPage = Math.min(
    Math.max(0, initialPage),
    Math.max(pageCount - 1, 0)
  );
  const [scope, setScope] = useState<FolioFlattenScope>(() =>
    readerSelection.length > 0 ? "selected" : "all"
  );
  const [selectedPages, setSelectedPages] = useState<ReadonlySet<number>>(
    () => new Set(readerSelection.length > 0 ? readerSelection : [firstPage])
  );
  const [signed, setSigned] = useState(false);
  const [phase, setPhase] = useState<Phase>("setup");
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [failure, setFailure] = useState<string | null>(null);
  const [refused, setRefused] = useState<FolioFlattenRefusal | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const signature = viewer.forDocument(documentId).get("signature");
    const read = () =>
      signature.getSnapshot()?.signatures.some((entry) => entry.signed) ??
      false;
    // A watch reports a change only, so read the state the panel opens on.
    setSigned(read());
    const stop = viewer.watch(read, (value) => setSigned(value));
    return () => {
      stop();
    };
  }, [documentId, viewer]);

  useEffect(
    () =>
      documents.onClosed(({ documentId: closed }) => {
        if (closed === documentId) {
          onClose();
        }
      }),
    [documentId, documents, onClose]
  );

  useEffect(
    () => () => {
      abortRef.current?.abort();
      stopFolioFlatten();
    },
    []
  );

  const flags: FolioFlattenFlags = {
    encrypted: isFolioTextEncrypted(documentId) || info?.status === "locked",
    restricted: !documents.canDownload(documentId) || !pageEdit.canExtract(),
    signed,
  };
  const refusal = folioFlattenFlagsRefusal(flags) ?? refused;
  const indexes = useMemo(
    () => folioFlattenPages(scope, pageCount, selectedPages),
    [pageCount, scope, selectedPages]
  );
  const running = phase === "running";
  const canStart = !running && refusal === null && indexes.length > 0;

  const run = async () => {
    if (!canStart || abortRef.current) {
      return;
    }
    const controller = new AbortController();
    abortRef.current = controller;
    setFailure(null);
    setResult(null);
    setPhase("running");
    setProgress({ done: 0, total: 0 });
    const outcome = await makeFolioFlattenedCopy({
      copyPages: () => pageEdit.extract(indexes, { signal: controller.signal }),
      flags,
      onProgress: setProgress,
      pages: indexes.length,
      readSourceText: () =>
        readFolioSourceText(selection, indexes, controller.signal),
      signal: controller.signal,
    });
    abortRef.current = null;
    if (outcome.outcome === "flattened") {
      // SAFETY: the Worker returns a Uint8Array over its own ArrayBuffer.
      const blob = new Blob([outcome.bytes as BlobPart], {
        type: "application/pdf",
      });
      setResult({ blob, name, stats: outcome.stats });
      setPhase("done");
      download(blob, name);
    } else if (outcome.outcome === "refused") {
      setRefused(outcome.reason);
      setPhase("refused");
    } else if (outcome.outcome === "failed") {
      setFailure(failureText(outcome.error, t));
      setPhase("failed");
    } else {
      setPhase("stopped");
    }
  };

  const cancel = () => {
    abortRef.current?.abort();
    stopFolioFlatten();
  };

  const close = () => {
    cancel();
    setResult(null);
    onClose();
  };

  const reset = () => {
    setFailure(null);
    setResult(null);
    setPhase("setup");
  };

  return (
    <aside
      aria-label={t("folioFlattenTitle")}
      className="border-rule bg-overlay text-overlay-fg flex flex-col border-t-2 max-lg:fixed max-lg:inset-x-0 max-lg:bottom-0 max-lg:z-40 max-lg:max-h-[72svh] lg:w-[28rem] lg:shrink-0 lg:border-s-2 lg:border-t-0"
    >
      <header className="border-rule flex items-start justify-between gap-2 border-b-2 px-5 py-4">
        <Heading className="min-w-0 flex-1" level={2}>
          {t("folioFlattenTitle")}
        </Heading>
        <Button
          aria-label={t("close")}
          intent="plain"
          onPress={close}
          size="sq-sm"
        >
          <HiXMark aria-hidden="true" className="size-4.5" />
        </Button>
      </header>

      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-5 py-4">
        <p className="text-muted-fg text-sm/6">{t("folioFlattenIntro")}</p>
        {refusal ? (
          <Note intent="danger">{t(REFUSAL_KEY[refusal])}</Note>
        ) : null}
        <FolioFlattenPages
          isDisabled={running}
          onScopeChange={setScope}
          onSelectedChange={setSelectedPages}
          pageCount={pageCount}
          scope={scope}
          selected={selectedPages}
        />
        <FolioFlattenFacts name={name} />
        {scope === "selected" && indexes.length === 0 ? (
          <Note intent="warning">{t("folioFlattenNoPages")}</Note>
        ) : null}
        {failure ? (
          <Note intent="danger">
            <p className="font-bold">{t("folioFlattenFailed")}</p>
            <p>{failure}</p>
          </Note>
        ) : null}
        {phase === "stopped" ? (
          <Note intent="warning">{t("folioFlattenStopped")}</Note>
        ) : null}
        {result ? <FolioFlattenReceipt result={result} /> : null}
        <output aria-live="polite" className="sr-only">
          {running ? t("folioFlattenLive") : ""}
          {phase === "done" ? t("folioFlattenLiveDone") : ""}
        </output>
      </div>

      <FolioFlattenActions
        canStart={canStart}
        onCancel={cancel}
        onReset={reset}
        onRun={() => {
          void run();
        }}
        phase={phase}
        progress={progress}
        result={result}
      />
    </aside>
  );
};
