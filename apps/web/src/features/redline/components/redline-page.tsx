/* oxlint-disable eslint/complexity, react-doctor/no-giant-component -- Coordinates the input, result, and Resolve states of one Tool. */
import { useAtomValue, useAtomSet } from "@effect/atom-react";
import { useBlocker } from "@tanstack/react-router";
import { Effect } from "effect";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/core/components/ui/button";
import { Container } from "@/core/components/ui/container";
import {
  ModalContent,
  ModalHeader,
  ModalFooter,
} from "@/core/components/ui/modal";
import { Note } from "@/core/components/ui/note";
import { download } from "@/core/libs/files";
import { loadLibrary } from "@/core/libs/library-load";
import { appliedColorModeAtom } from "@/features/color-mode/color-mode.atoms";
import { useTranslation } from "@/features/i18n/use-translation";

import {
  downloadName,
  importText,
  inputMode,
  isLargeText,
  languageFromName,
  swapTexts,
} from "../redline";
import type { Language, Texts } from "../redline";
import { controlsAtom } from "../redline.atoms";
import { MarkedSession } from "../redline.marked.browser";
import { loadRuntime } from "../redline.renderer.browser";
import { compare } from "../redline.worker-client";
import { RedlineControls } from "./redline-controls";
import { RedlineExplainer } from "./redline-explainer";
import { RedlineInput } from "./redline-input";
import type { Run, RedlineResult } from "./redline-result";

import "./redline.css";

const emptyTexts: Texts = { before: "", after: "" };
export const RedlinePage = () => {
  const { t } = useTranslation();
  const colorMode = useAtomValue(appliedColorModeAtom);
  const [texts, setTexts] = useState<Texts>(emptyTexts);
  const [run, setRun] = useState<Run | null>(null);
  const [renderer, setRenderer] = useState<{
    component: typeof RedlineResult;
  } | null>(null);
  const controls = useAtomValue(controlsAtom);
  const setControls = useAtomSet(controlsAtom);
  const [language, setLanguage] = useState<Language>("text");
  const [resolving, setResolving] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<"file" | "markers" | "compare" | null>(
    null
  );
  const [leave, setLeave] = useState<(() => void) | null>(null);
  const [, setRevision] = useState(0);
  const controller = useRef<AbortController | null>(null);
  const inputFiles = useRef(new Map<string, number>());
  const importSequence = useRef(0);
  const changed = () => setRevision((revision) => revision + 1);
  const view = run?.session.view;
  const resolved = view?.resolved ?? null;
  const hasChoices = resolving && (view?.chosen ?? 0) > 0;
  const blocker = useBlocker({
    shouldBlockFn: () => hasChoices,
    enableBeforeUnload: hasChoices,
    withResolver: true,
  });
  useEffect(() => () => controller.current?.abort(), []);
  const mode = inputMode(texts.before, texts.after);
  const leaveWith = (action: () => void) => {
    if (hasChoices) {
      setLeave(() => action);
    } else {
      action();
    }
  };
  const copy = async (text: string) => {
    const result = await Effect.runPromise(
      Effect.tryPromise(() => navigator.clipboard.writeText(text)).pipe(
        Effect.result
      )
    );
    if (result._tag === "Success") {
      toast.success(t("redlineCopied"));
    } else {
      toast.error(t("redlineCopyFailed"));
    }
  };
  const openFile = async (side: "before" | "after", file: File) => {
    importSequence.current += 1;
    const request = importSequence.current;
    inputFiles.current.set(side, request);
    const result = await Effect.runPromise(
      Effect.tryPromise(async () =>
        importText(new Uint8Array(await file.arrayBuffer()))
      ).pipe(Effect.result)
    );
    if (inputFiles.current.get(side) !== request) {
      return;
    }
    if (result._tag === "Success") {
      setTexts((current) =>
        side === "before"
          ? { ...current, before: result.success, beforeName: file.name }
          : { ...current, after: result.success, afterName: file.name }
      );
      setError(null);
    } else {
      setError("file");
    }
  };
  const start = async (input: Texts = texts) => {
    const action = inputMode(input.before, input.after);
    if (action === "broken") {
      setError("markers");
      return;
    }
    controller.current?.abort();
    inputFiles.current.clear();
    const abort = new AbortController();
    controller.current = abort;
    setBusy(true);
    setError(null);
    try {
      const runtime = await loadLibrary(
        "Redline",
        () => Effect.runPromise(loadRuntime()),
        abort.signal
      );
      if (abort.signal.aborted) {
        return;
      }
      if (action === "marked") {
        if (abort.signal.aborted) {
          return;
        }
        setRun({
          kind: "marked",
          session: MarkedSession.create(input.before || input.after),
        });
        setResolving(true);
      } else {
        const diff = await Effect.runPromise(compare(input), {
          signal: abort.signal,
        });
        if (abort.signal.aborted) {
          return;
        }
        setRun({
          kind: "compare",
          session: new runtime.Session(input, diff),
        });
        setResolving(false);
      }
      setTexts(input);
      setLanguage(languageFromName(input.afterName ?? input.beforeName));
      setRenderer({ component: runtime.Result });
    } catch {
      if (!abort.signal.aborted) {
        setError(action === "marked" ? "markers" : "compare");
      }
    }
    if (controller.current === abort) {
      setBusy(false);
    }
  };
  const reset = () => {
    if (!run) {
      return;
    }
    if (run.kind === "marked") {
      setRun({ kind: "marked", session: run.session.reset() });
    } else {
      run.session.reset();
      changed();
    }
  };
  const swap = () => {
    const swapped = swapTexts(texts);
    if (run) {
      void start(swapped);
    } else {
      setTexts(swapped);
    }
  };
  const clear = () =>
    leaveWith(() => {
      setRun(null);
      setTexts(emptyTexts);
      setResolving(false);
      setError(null);
      inputFiles.current.clear();
    });
  const Result = renderer?.component;
  return (
    <Container className="py-6 sm:py-8">
      <p className="text-muted-fg mb-4 max-w-prose">{t("redlinePromise")}</p>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        {run ? (
          <Button
            intent="outline"
            isDisabled={busy}
            onPress={() =>
              leaveWith(() => {
                setRun(null);
                setResolving(false);
              })
            }
          >
            {t("redlineEdit")}
          </Button>
        ) : null}
        <Button
          intent="outline"
          isDisabled={busy || resolving || (!texts.before && !texts.after)}
          onPress={swap}
        >
          {t("redlineSwap")}
        </Button>
        <Button
          intent="outline"
          isDisabled={busy || (!texts.before && !texts.after)}
          onPress={clear}
        >
          {t("redlineClear")}
        </Button>
        {busy ? (
          <>
            <output>{t("redlineWorking")}</output>
            <Button
              intent="outline"
              onPress={() => {
                controller.current?.abort();
                setBusy(false);
              }}
            >
              {t("redlineCancel")}
            </Button>
          </>
        ) : null}
      </div>
      {error ? (
        <Note intent="danger" role="alert" className="mb-4">
          {t(
            error === "file"
              ? "redlineFileError"
              : error === "markers"
                ? "redlineMarkersError"
                : "redlineCompareError"
          )}
        </Note>
      ) : null}
      {run ? (
        <>
          {run.kind === "compare" ? (
            <output className="flex flex-wrap gap-4">
              <span className="num text-danger-subtle-fg">
                {t("redlineRemovals", {
                  count: run.session.view.removals,
                })}
              </span>
              <span className="num text-success-subtle-fg">
                {t("redlineAdditions", {
                  count: run.session.view.additions,
                })}
              </span>
              <span>
                {t("redlineBefore")}:{" "}
                <span className="num">
                  {t("redlineLines", {
                    count: run.session.view.beforeLines,
                  })}
                </span>
              </span>
              <span>
                {t("redlineAfter")}:{" "}
                <span className="num">
                  {t("redlineLines", {
                    count: run.session.view.afterLines,
                  })}
                </span>
              </span>
            </output>
          ) : (
            <p>{t("redlineMarkedLayout")}</p>
          )}
          <div className="mt-4 flex flex-wrap gap-2">
            <Button
              intent="outline"
              onPress={() => {
                void copy(texts.before);
              }}
            >
              {t("redlineCopyBefore")}
            </Button>
            <Button
              intent="outline"
              onPress={() => {
                void copy(texts.after);
              }}
            >
              {t("redlineCopyAfter")}
            </Button>
            {!resolving && (view?.remaining ?? 0) > 0 ? (
              <Button onPress={() => setResolving(true)}>
                {t("redlineResolve")}
              </Button>
            ) : null}
          </div>
          <RedlineControls
            controls={controls}
            language={language}
            marked={run.kind === "marked"}
            onChange={(next) => {
              setControls(next);
            }}
            onLanguage={setLanguage}
          />
          {resolving ? (
            <div className="mb-4 flex flex-wrap items-center gap-2">
              <output className="num me-auto">
                {t("redlineRemaining", { count: view?.remaining ?? 0 })}
              </output>
              <Button
                intent="outline"
                isDisabled={!view?.remaining}
                onPress={() => {
                  run.session.chooseAll("before");
                  changed();
                }}
              >
                {t(
                  run.kind === "marked"
                    ? "redlineAllCurrent"
                    : "redlineAllBefore"
                )}
              </Button>
              <Button
                intent="outline"
                isDisabled={!view?.remaining}
                onPress={() => {
                  run.session.chooseAll("after");
                  changed();
                }}
              >
                {t(
                  run.kind === "marked"
                    ? "redlineAllIncoming"
                    : "redlineAllAfter"
                )}
              </Button>
              <Button intent="outline" onPress={reset}>
                {t("redlineReset")}
              </Button>
            </div>
          ) : null}
          {!resolving && view?.remaining === 0 ? (
            <Note>{t("redlineNoChanges")}</Note>
          ) : null}
          {Result ? (
            <Result
              run={run}
              controls={controls}
              language={language}
              resolving={resolving}
              colorMode={colorMode}
              changed={changed}
              failed={() => {
                setError("markers");
                setRun(null);
                setResolving(false);
              }}
            />
          ) : null}
          {resolving ? (
            <section className="mt-6" aria-label={t("redlineResolved")}>
              <h2 className="mb-3 text-xl font-bold">{t("redlineResolved")}</h2>
              <div className="mb-4 flex flex-wrap gap-2">
                <Button
                  isDisabled={resolved === null}
                  onPress={() => {
                    if (resolved !== null) {
                      void copy(resolved);
                    }
                  }}
                >
                  {t("redlineCopyResolved")}
                </Button>
                <Button
                  intent="outline"
                  isDisabled={resolved === null}
                  onPress={() => {
                    if (resolved !== null) {
                      download(
                        new Blob([resolved], {
                          type: "text/plain;charset=utf-8",
                        }),
                        downloadName(
                          texts.afterName ??
                            (run.kind === "marked"
                              ? texts.beforeName
                              : undefined)
                        )
                      );
                    }
                  }}
                >
                  {t("redlineDownload")}
                </Button>
              </div>
              {resolved === null ? null : (
                <pre className="redline-resolved">{resolved}</pre>
              )}
            </section>
          ) : null}
        </>
      ) : (
        <>
          <div className="redline-input-grid">
            {(["before", "after"] as const).map((side) => (
              <RedlineInput
                key={side}
                side={side}
                text={texts[side]}
                name={side === "before" ? texts.beforeName : texts.afterName}
                disabled={busy}
                onChange={(text) => {
                  importSequence.current += 1;
                  inputFiles.current.set(side, importSequence.current);
                  setTexts((current) => ({ ...current, [side]: text }));
                }}
                onFile={(file) => {
                  void openFile(side, file);
                }}
              />
            ))}
          </div>
          {isLargeText(texts.before) || isLargeText(texts.after) ? (
            <Note className="mt-4" intent="warning">
              {t("redlineLarge")}
            </Note>
          ) : null}
          <Button
            className="mt-4"
            isDisabled={busy || (!texts.before && !texts.after)}
            onPress={() => {
              void start();
            }}
          >
            {t(mode === "compare" ? "redlineFind" : "redlineMarkedAction")}
          </Button>
        </>
      )}
      <p className="text-muted-fg mt-4 max-w-prose text-sm">
        {t("redlineLocal")}
      </p>
      <RedlineExplainer />
      <ModalContent
        role="alertdialog"
        isOpen={leave !== null || blocker.status === "blocked"}
        onOpenChange={(open) => {
          if (!open) {
            setLeave(null);
            blocker.reset?.();
          }
        }}
      >
        <ModalHeader
          title={t("redlineLeaveTitle")}
          description={t("redlineLeaveBody")}
        />
        <ModalFooter>
          <Button
            intent="outline"
            onPress={() => {
              setLeave(null);
              blocker.reset?.();
            }}
          >
            {t("redlineStay")}
          </Button>
          <Button
            onPress={() => {
              if (leave) {
                const action = leave;
                setLeave(null);
                action();
              } else {
                blocker.proceed?.();
              }
            }}
          >
            {t("redlineLeave")}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Container>
  );
};
