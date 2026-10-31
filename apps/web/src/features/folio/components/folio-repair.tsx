"use client";

import type { DocumentsCapability } from "@embedpdf/viewer-react";
import { cn } from "cn";
import { useEffect, useRef, useState } from "react";
import { HiArrowDownTray, HiStop, HiWrench, HiXMark } from "react-icons/hi2";

import { Button } from "@/core/components/ui/button";
import { Heading } from "@/core/components/ui/heading";
import {
  NativeSelect,
  NativeSelectContent,
} from "@/core/components/ui/native-select";
import { Note } from "@/core/components/ui/note";
import { download } from "@/core/libs/files";
import { useTranslation } from "@/features/i18n/use-translation";

import { repairedNameOf } from "../folio.repair";
import type {
  FolioLostStructure,
  FolioRepairCheck,
  FolioRepairPath,
} from "../folio.repair";
import type {
  FolioRepairAttempt,
  FolioRepairFailure,
  FolioRepairProgress,
  FolioRepairRefusal,
} from "../folio.repair.engine";
import {
  FolioRepairError,
  repairFolioPdf,
  stopFolioRepair,
} from "../folio.repair.worker-client";
import type { FolioRepairResult } from "../folio.repair.worker-client";

type Translate = ReturnType<typeof useTranslation>["t"];

type Phase =
  | { readonly type: "idle" }
  | {
      readonly progress: FolioRepairProgress | null;
      readonly type: "running";
    }
  | Extract<FolioRepairResult, { readonly type: "repaired" | "failed" }>
  | {
      readonly reason: FolioRepairRefusal | "restricted";
      readonly type: "refused";
    }
  | { readonly type: "stopped" }
  | { readonly type: "error" };

const PATH_KEY = {
  rebuild: "folioRepairPathRebuild",
  rewrite: "folioRepairPathRewrite",
} as const satisfies Record<FolioRepairPath, string>;

const CHECK_KEY = {
  opens: "folioRepairCheckOpens",
  order: "folioRepairCheckOrder",
  pages: "folioRepairCheckPages",
  render: "folioRepairCheckRender",
  text: "folioRepairCheckText",
  write: "folioRepairCheckWrite",
} as const satisfies Record<FolioRepairCheck, string>;

const LOST_KEY = {
  annotations: "folioRepairLostAnnotations",
  attachments: "folioRepairLostAttachments",
  forms: "folioRepairLostForms",
  javascript: "folioRepairLostJavascript",
  metadata: "folioRepairLostMetadata",
  outlines: "folioRepairLostOutlines",
} as const satisfies Record<FolioLostStructure, string>;

const FAILURE_KEY = {
  empty: "folioRepairFailedEmpty",
  unreadable: "folioRepairFailedUnreadable",
  unverified: "folioRepairFailedUnverified",
} as const satisfies Record<FolioRepairFailure, string>;

const REFUSAL_KEY = {
  encrypted: "folioRepairRefusedEncrypted",
  restricted: "folioRepairRefusedRestricted",
  signed: "folioRepairRefusedSigned",
} as const satisfies Record<FolioRepairRefusal | "restricted", string>;

const Attempts = ({
  attempts,
  t,
}: {
  readonly attempts: readonly FolioRepairAttempt[];
  readonly t: Translate;
}) =>
  attempts.length === 0 ? null : (
    <ul className="mt-1 list-disc ps-5">
      {attempts.map((attempt) => (
        <li key={attempt.path}>
          {t("folioRepairAttemptFailed", {
            check: t(CHECK_KEY[attempt.check]),
            path: t(PATH_KEY[attempt.path]),
          })}
        </li>
      ))}
    </ul>
  );

const lostOf = (
  lost: readonly FolioLostStructure[],
  locale: string,
  t: Translate
): string =>
  lost.length === 0
    ? t("folioRepairLostNone")
    : t("folioRepairLost", {
        list: new Intl.ListFormat(locale, { type: "conjunction" }).format(
          lost.map((structure) => t(LOST_KEY[structure]))
        ),
      });

/**
 * The outcome of the last run. A download shows only for a copy that passed
 * every check; a refused, failed, or stopped run names its reason.
 */
const Outcome = ({
  locale,
  name,
  phase,
  t,
}: {
  readonly locale: string;
  readonly name: string;
  readonly phase: Phase;
  readonly t: Translate;
}) => {
  switch (phase.type) {
    case "repaired": {
      return (
        <Note intent="success">
          <p className="font-bold">{t("folioRepairDoneTitle")}</p>
          <p>{t("folioRepairPages", { count: phase.pages })}</p>
          <p>{t("folioRepairPathUsed", { path: t(PATH_KEY[phase.path]) })}</p>
          <p>
            {phase.damaged
              ? t("folioRepairDamaged")
              : t("folioRepairNotDamaged")}
          </p>
          <p>{lostOf(phase.lost, locale, t)}</p>
          <Attempts attempts={phase.attempts} t={t} />
          <Button
            className="mt-3"
            intent="primary"
            onPress={() => {
              // SAFETY: the Worker returns a Uint8Array over its own ArrayBuffer, a BlobPart.
              download(
                new Blob([phase.bytes as BlobPart], {
                  type: "application/pdf",
                }),
                repairedNameOf(name)
              );
            }}
          >
            <HiArrowDownTray aria-hidden="true" />
            {t("folioRepairDownload")}
          </Button>
        </Note>
      );
    }
    case "failed": {
      return (
        <Note intent="danger">
          <p className="font-bold">{t("folioRepairFailedTitle")}</p>
          <p>{t(FAILURE_KEY[phase.reason])}</p>
          <Attempts attempts={phase.attempts} t={t} />
        </Note>
      );
    }
    case "refused": {
      return (
        <Note intent="warning">
          <p className="font-bold">{t("folioRepairRefusedTitle")}</p>
          <p>{t(REFUSAL_KEY[phase.reason])}</p>
        </Note>
      );
    }
    case "stopped": {
      return <Note intent="warning">{t("folioRepairStopped")}</Note>;
    }
    case "error": {
      return <Note intent="danger">{t("folioRepairError")}</Note>;
    }
    default: {
      return null;
    }
  }
};

/**
 * The Repair copy panel: one damaged PDF in, one verified copy out. The open
 * file and its history do not change, and no copy is offered until the engine
 * reopens it and it matches the source page by page. Every open tab is a
 * choice, a failed one too: the viewer hides its menu for a file that did not
 * open, and the panel names why no copy is possible.
 */
export const FolioRepair = ({
  documentId,
  documents,
  onClose,
}: {
  readonly documentId: string;
  readonly documents: DocumentsCapability;
  readonly onClose: () => void;
}) => {
  const { locale, t } = useTranslation();
  const [phase, setPhase] = useState<Phase>({ type: "idle" });
  const [chosenId, setChosenId] = useState(documentId);
  const [, setRevision] = useState(0);
  const cancelled = useRef(false);
  const choices = documents.list();
  // A closed tab is no longer a choice: the panel falls back to the first one.
  const targetId = documents.has(chosenId)
    ? chosenId
    : (choices[0]?.id ?? chosenId);
  const name = documents.get(targetId)?.name ?? t("folioUntitledDocument");

  useEffect(() => {
    const refresh = () => {
      setRevision((revision) => revision + 1);
    };
    const stops = [
      documents.onOpened(refresh),
      documents.onOpenFailed(refresh),
      documents.onLocked(refresh),
      documents.onClosed(refresh),
    ];
    return () => {
      for (const unsubscribe of stops) {
        unsubscribe();
      }
    };
  }, [documents]);

  useEffect(
    () => () => {
      cancelled.current = true;
      stopFolioRepair();
    },
    []
  );

  const running = phase.type === "running";

  const run = async () => {
    if (running) {
      return;
    }
    cancelled.current = false;
    const status = documents.get(targetId)?.status;
    if (status === "error") {
      setPhase({ attempts: [], reason: "unreadable", type: "failed" });
      return;
    }
    if (status === "locked") {
      setPhase({ reason: "encrypted", type: "refused" });
      return;
    }
    if (!documents.canDownload(targetId)) {
      setPhase({ reason: "restricted", type: "refused" });
      return;
    }
    setPhase({ progress: null, type: "running" });
    try {
      const bytes = await documents.download(targetId);
      if (cancelled.current) {
        setPhase({ type: "stopped" });
        return;
      }
      const result = await repairFolioPdf({
        bytes,
        onProgress: (progress) => {
          setPhase({ progress, type: "running" });
        },
      });
      setPhase(result);
    } catch (error) {
      setPhase(
        error instanceof FolioRepairError && error.reason === "stopped"
          ? { type: "stopped" }
          : { type: "error" }
      );
    }
  };

  const stop = () => {
    cancelled.current = true;
    stopFolioRepair();
  };

  const progress = phase.type === "running" ? phase.progress : null;
  const percent =
    progress && progress.total > 0
      ? Math.round((progress.done / progress.total) * 100)
      : 0;

  return (
    <aside
      aria-label={t("folioRepairTitle")}
      className="border-rule bg-overlay text-overlay-fg flex flex-col border-t-2 max-lg:fixed max-lg:inset-x-0 max-lg:bottom-0 max-lg:z-40 max-lg:max-h-[72svh] lg:w-[30rem] lg:shrink-0 lg:border-s-2 lg:border-t-0"
    >
      <header className="border-rule flex items-start justify-between gap-2 border-b-2 px-5 py-4">
        <Heading className="min-w-0 flex-1" level={2}>
          {t("folioRepairTitle")}
        </Heading>
        <Button
          aria-label={t("close")}
          intent="plain"
          onPress={onClose}
          size="sq-sm"
        >
          <HiXMark aria-hidden="true" className="size-4.5" />
        </Button>
      </header>

      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-5 py-4">
        <label className="grid gap-1">
          <span className="text-muted-fg text-xs font-bold tracking-[0.08em] uppercase [font-stretch:87.5%]">
            {t("folioRepairFile")}
          </span>
          <NativeSelect>
            <NativeSelectContent
              disabled={running}
              onChange={(event) => {
                setChosenId(event.target.value);
                setPhase({ type: "idle" });
              }}
              value={targetId}
            >
              {choices.map((choice) => (
                <option key={choice.id} value={choice.id}>
                  {choice.name ?? t("folioUntitledDocument")}
                </option>
              ))}
            </NativeSelectContent>
          </NativeSelect>
        </label>
        <p className="text-muted-fg text-sm/6">{t("folioRepairIntro")}</p>
        <Note intent="info">{t("folioRepairNoteOpen")}</Note>

        <section>
          <h3 className="text-fg text-sm font-bold">
            {t("folioRepairTriesTitle")}
          </h3>
          <ol className="text-muted-fg mt-1 list-decimal ps-5 text-xs/5">
            <li>{t("folioRepairTryRewrite")}</li>
            <li>{t("folioRepairTryRebuild")}</li>
          </ol>
        </section>

        <section>
          <h3 className="text-fg text-sm font-bold">
            {t("folioRepairRiskTitle")}
          </h3>
          <p className="text-muted-fg mt-1 text-xs/5">{t("folioRepairRisk")}</p>
        </section>

        <p className="text-muted-fg text-xs/5">{t("folioRepairChecks")}</p>

        <Outcome locale={locale} name={name} phase={phase} t={t} />

        <output aria-live="polite" className="sr-only">
          {running ? t("folioRepairLive") : ""}
        </output>
      </div>

      <footer className="border-rule bg-overlay border-t-2">
        {running ? (
          <div aria-hidden="true" className="bg-border h-1">
            <div
              className={cn(
                "bg-accent h-full transition-[width] duration-200 ease-linear motion-reduce:transition-none",
                progress ? "" : "w-1/3 animate-pulse"
              )}
              style={progress ? { width: `${percent}%` } : undefined}
            />
          </div>
        ) : null}
        <div className="flex flex-col gap-2 px-5 py-4">
          {running ? (
            <>
              <p className="text-muted-fg text-xs/4">
                {progress
                  ? t("folioRepairProgress", {
                      done: progress.done,
                      path: t(PATH_KEY[progress.path]),
                      total: progress.total,
                    })
                  : t("folioRepairProgressIdle")}
              </p>
              <Button intent="danger" onPress={stop}>
                <HiStop aria-hidden="true" />
                {t("folioRepairCancel")}
              </Button>
            </>
          ) : (
            <Button
              intent="primary"
              onPress={() => {
                void run();
              }}
            >
              <HiWrench aria-hidden="true" />
              {t("folioRepairRun")}
            </Button>
          )}
        </div>
      </footer>
    </aside>
  );
};
