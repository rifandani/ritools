/* oxlint-disable react-doctor/no-derived-useState, react-doctor/prefer-useReducer -- The file ID remounts this editor; its initial snapshot seeds independent renderer and input states. */
/* oxlint-disable eslint/complexity, react-doctor/no-giant-component -- Coordinates the input, result, and Resolve states of one Tool. */
import { useAtomValue, useAtomSet } from "@effect/atom-react";
import { useBlocker } from "@tanstack/react-router";
import { Effect } from "effect";
import { Fragment, useEffect, useEffectEvent, useRef, useState } from "react";
import type { ReactNode } from "react";
import {
  HiArrowLeft,
  HiArrowRight,
  HiArrowUturnLeft,
  HiArrowsRightLeft,
  HiCheckCircle,
  HiExclamationTriangle,
  HiMagnifyingGlass,
  HiWrenchScrewdriver,
  HiXMark,
} from "react-icons/hi2";
import { toast } from "sonner";

import { Button } from "@/core/components/ui/button";
import { Loader } from "@/core/components/ui/loader";
import {
  ModalContent,
  ModalHeader,
  ModalFooter,
} from "@/core/components/ui/modal";
import { Note } from "@/core/components/ui/note";
import { Tooltip, TooltipContent } from "@/core/components/ui/tooltip";
import { loadLibrary } from "@/core/libs/library-load";
import { appliedColorModeAtom } from "@/features/color-mode/color-mode.atoms";
import { useTranslation } from "@/features/i18n/use-translation";

import { importText, inputMode, isLargeText, swapTexts } from "../cleave";
import type { Language, Texts } from "../cleave";
import { controlsAtom } from "../cleave.atoms";
import { fileLanguage } from "../cleave.files";
import type { ComparisonFile, Resolution } from "../cleave.files";
import { fileAtoms } from "../cleave.files.atoms";
import { LANGUAGE_CATALOG } from "../cleave.languages";
import type { LanguageOption, LanguageSelection } from "../cleave.languages";
import { MarkedSession } from "../cleave.marked.browser";
import { loadRuntime } from "../cleave.renderer.browser";
import { compare } from "../cleave.worker-client";
import { CleaveControls } from "./cleave-controls";
import { CleaveInput } from "./cleave-input";
import type { Run, CleaveResult } from "./cleave-result";

import "./cleave.css";

const emptyTexts: Texts = { before: "", after: "" };

const RemainingConflicts = ({ count }: { readonly count: number }) => {
  const { t } = useTranslation();
  const Icon = count > 0 ? HiExclamationTriangle : HiCheckCircle;
  return (
    <output className="num me-auto inline-flex items-center gap-1.5">
      {t("cleaveRemaining", { count })}
      <Icon
        aria-hidden="true"
        className={`size-5 ${count > 0 ? "text-warning-subtle-fg" : "text-success-subtle-fg"}`}
      />
    </output>
  );
};

export const CleaveFile = ({
  file,
  navigation,
}: {
  readonly file: ComparisonFile;
  readonly navigation: ReactNode;
}) => {
  const initial = useRef(file);
  const { t } = useTranslation();
  const colorMode = useAtomValue(appliedColorModeAtom);
  const [texts, setTexts] = useState<Texts>(file.texts);
  const [run, setRun] = useState<Run | null>(null);
  const [renderer, setRenderer] = useState<{
    component: typeof CleaveResult;
    languages: readonly LanguageOption[];
  } | null>(null);
  const controls = useAtomValue(controlsAtom);
  const setControls = useAtomSet(controlsAtom);
  const [detectedLanguage, setDetectedLanguage] = useState<Language>("text");
  const [languageSelection, setLanguageSelection] = useState<LanguageSelection>(
    () => fileLanguage(file)
  );
  const language =
    languageSelection === "auto" ? detectedLanguage : languageSelection;
  const [resolving, setResolving] = useState(file.resolving);
  const [busy, setBusy] = useState(file.compared);
  const [error, setError] = useState<"file" | "markers" | "compare" | null>(
    null
  );
  const [leave, setLeave] = useState<(() => void) | null>(null);
  const [, setRevision] = useState(0);
  const [choices, setChoices] = useState<readonly Resolution[]>(
    () => file.choices
  );
  const restored = useRef(!file.compared);
  const controller = useRef<AbortController | null>(null);
  const inputFiles = useRef(new Map<string, number>());
  const importSequence = useRef(0);
  const changed = (resolution?: Resolution) => {
    if (resolution) {
      setChoices((current) =>
        current.some((item) => item.id === resolution.id)
          ? current
          : [...current, resolution]
      );
    }
    setRevision((value) => value + 1);
  };
  const view = run?.session.view;
  const hasChoices = resolving && (view?.chosen ?? 0) > 0;
  const saving = useAtomValue(fileAtoms.saving);
  const saveFailure = useAtomValue(fileAtoms.failure);
  const unsaved = saving || saveFailure === "write";
  const blocker = useBlocker({
    shouldBlockFn: () => hasChoices && unsaved,
    enableBeforeUnload: hasChoices && unsaved,
    withResolver: true,
  });
  useEffect(
    () => () => {
      controller.current?.abort();
      inputFiles.current.clear();
    },
    []
  );
  const command = useAtomSet(fileAtoms.command);
  useEffect(() => {
    if (restored.current && !busy) {
      command({
        type: "edit",
        file: {
          ...initial.current,
          texts,
          compared: run !== null,
          resolving,
          language: languageSelection,
          choices,
        },
      });
    }
  }, [texts, run, resolving, languageSelection, choices, busy, command]);
  const mode = inputMode(texts.before, texts.after);
  // Keep the saved comparison's controls in place while its session is rebuilt.
  const restoring = busy && file.compared;
  const marked = run ? run.kind === "marked" : mode === "marked";
  const canResolve = view ? view.remaining > 0 : texts.before !== texts.after;
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
      toast.success(t("cleaveCopied"));
    } else {
      toast.error(t("cleaveCopyFailed"));
    }
  };
  const openFile = async (side: "before" | "after", inputFile: File) => {
    importSequence.current += 1;
    const request = importSequence.current;
    inputFiles.current.set(side, request);
    const result = await Effect.runPromise(
      Effect.tryPromise(async () =>
        importText(new Uint8Array(await inputFile.arrayBuffer()))
      ).pipe(Effect.result)
    );
    if (inputFiles.current.get(side) !== request) {
      return;
    }
    if (result._tag === "Success") {
      restored.current = true;
      setChoices([]);
      setTexts((current) =>
        side === "before"
          ? { ...current, before: result.success, beforeName: inputFile.name }
          : { ...current, after: result.success, afterName: inputFile.name }
      );
      setError(null);
    } else {
      setError("file");
    }
  };
  const start = async (input: Texts = texts, restoreFile?: ComparisonFile) => {
    const saved = restored.current ? restoreFile : initial.current;
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
        "Cleave",
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
          session: MarkedSession.create(
            input.before || input.after,
            saved?.choices
          ),
        });
        setResolving(true);
      } else {
        const diff = await Effect.runPromise(compare(input), {
          signal: abort.signal,
        });
        if (abort.signal.aborted) {
          return;
        }
        const session = new runtime.Session(input, diff);
        for (const resolution of saved?.choices ?? []) {
          session.choose(resolution.id, resolution.choice);
        }
        setRun({
          kind: "compare",
          session,
        });
        setResolving(saved?.resolving ?? false);
      }
      setChoices(saved?.choices ?? []);
      restored.current = true;
      setTexts(input);
      const detected = runtime.detectLanguage(input);
      setDetectedLanguage(
        runtime.languages.some((item) => item.id === detected)
          ? detected
          : "text"
      );
      setRenderer({ component: runtime.Result, languages: runtime.languages });
    } catch {
      if (!abort.signal.aborted) {
        setError(action === "marked" ? "markers" : "compare");
      }
    }
    if (controller.current === abort) {
      setBusy(false);
    }
  };
  const restore = useEffectEvent(() => {
    if (initial.current.compared) {
      void start(initial.current.texts, initial.current);
    }
  });
  useEffect(() => {
    restore();
  }, []);
  const reset = () => {
    if (!run) {
      return;
    }
    setChoices([]);
    if (run.kind === "marked") {
      setRun({ kind: "marked", session: run.session.reset() });
    } else {
      run.session.reset();
      changed();
    }
  };
  const swap = () => {
    setTexts(swapTexts(texts));
  };
  const swapButton = (
    <Tooltip>
      <Button
        aria-label={t("cleaveSwap")}
        intent="outline"
        size="sq-md"
        isDisabled={busy || (!texts.before && !texts.after)}
        onPress={swap}
      >
        <HiArrowsRightLeft
          aria-hidden="true"
          className="rotate-90 md:rotate-0"
        />
      </Button>
      <TooltipContent>{t("cleaveSwap")}</TooltipContent>
    </Tooltip>
  );
  const Result = renderer?.component;
  return (
    <>
      {error ? (
        <Note intent="danger" role="alert" className="mb-4">
          {t(
            error === "file"
              ? "cleaveFileError"
              : error === "markers"
                ? "cleaveMarkersError"
                : "cleaveCompareError"
          )}
        </Note>
      ) : null}
      {run || restoring ? (
        <>
          {marked ? <p>{t("cleaveMarkedLayout")}</p> : null}
          <CleaveControls
            controls={controls}
            colorMode={colorMode}
            isDisabled={busy}
            language={language}
            languageSelection={languageSelection}
            languages={renderer?.languages ?? LANGUAGE_CATALOG}
            marked={marked}
            onChange={(next) => {
              setControls(next);
            }}
            onClear={() =>
              leaveWith(() => {
                inputFiles.current.clear();
                setTexts(emptyTexts);
                setChoices([]);
                setRun(null);
                setResolving(false);
                setError(null);
              })
            }
            onLanguage={setLanguageSelection}
            onSwap={
              !marked && !resolving
                ? () => {
                    void start(swapTexts(texts));
                  }
                : undefined
            }
          >
            {!marked && !resolving && canResolve ? (
              <Button isDisabled={busy} onPress={() => setResolving(true)}>
                <HiWrenchScrewdriver aria-hidden="true" />
                {t("cleaveResolve")}
              </Button>
            ) : null}
          </CleaveControls>
          {resolving ? (
            <div className="mb-4 flex flex-wrap items-center gap-2">
              <RemainingConflicts count={view?.remaining ?? 0} />
              <Button
                intent="outline"
                isDisabled={busy || !view?.remaining}
                onPress={() => {
                  if (!run) {
                    return;
                  }
                  if (run.kind === "compare") {
                    const pending = run.session.view.conflicts.map(
                      ({ id }) => ({ id, choice: "before" as const })
                    );
                    setChoices((current) => [...current, ...pending]);
                  }
                  run.session.chooseAll("before");
                  changed();
                }}
              >
                <HiArrowLeft aria-hidden="true" />
                {t(marked ? "cleaveAllCurrent" : "cleaveAllBefore")}
              </Button>
              <Button
                intent="outline"
                isDisabled={busy || !view?.remaining}
                onPress={() => {
                  if (!run) {
                    return;
                  }
                  if (run.kind === "compare") {
                    const pending = run.session.view.conflicts.map(
                      ({ id }) => ({ id, choice: "after" as const })
                    );
                    setChoices((current) => [...current, ...pending]);
                  }
                  run.session.chooseAll("after");
                  changed();
                }}
              >
                <HiArrowRight aria-hidden="true" />
                {t(marked ? "cleaveAllIncoming" : "cleaveAllAfter")}
              </Button>
              <Button intent="outline" isDisabled={busy} onPress={reset}>
                <HiArrowUturnLeft aria-hidden="true" />
                {t("cleaveReset")}
              </Button>
              {marked ? null : (
                <Button
                  intent="outline"
                  isDisabled={busy}
                  onPress={() => {
                    reset();
                    setResolving(false);
                  }}
                >
                  <HiXMark aria-hidden="true" />
                  {t("cancel")}
                </Button>
              )}
            </div>
          ) : null}
        </>
      ) : null}
      {navigation}
      {run ? (
        <>
          {!resolving && view?.remaining === 0 ? (
            <Note>{t("cleaveNoChanges")}</Note>
          ) : null}
          {Result ? (
            <Result
              run={run}
              controls={controls}
              language={language}
              resolving={resolving}
              colorMode={colorMode}
              copy={copy}
              changed={changed}
              failed={() => {
                setError("markers");
                setRun(null);
                setResolving(false);
              }}
            />
          ) : null}
        </>
      ) : restoring ? (
        <div
          className="flex min-h-64 items-center justify-center"
          aria-busy="true"
        >
          <Loader aria-label={t("loading")} />
        </div>
      ) : (
        <>
          <div className="cleave-input-grid">
            {(["before", "after"] as const).map((side) => (
              <Fragment key={side}>
                <CleaveInput
                  side={side}
                  text={texts[side]}
                  disabled={busy}
                  onChange={(text) => {
                    restored.current = true;
                    setChoices([]);
                    importSequence.current += 1;
                    inputFiles.current.set(side, importSequence.current);
                    setTexts((current) => ({ ...current, [side]: text }));
                  }}
                  onFile={(inputFile) => {
                    void openFile(side, inputFile);
                  }}
                />
                {side === "before" ? (
                  <div className="cleave-input-swap">{swapButton}</div>
                ) : null}
              </Fragment>
            ))}
          </div>
          {isLargeText(texts.before) || isLargeText(texts.after) ? (
            <Note className="mt-4" intent="warning">
              {t("cleaveLarge")}
            </Note>
          ) : null}
          <div className="mt-4 flex justify-center">
            <Button
              className="h-11 py-0 sm:h-10"
              isDisabled={!texts.before && !texts.after}
              isPending={busy}
              onPress={() => {
                void start();
              }}
            >
              {busy ? (
                <>
                  <Loader aria-label={t("loading")} />
                  <span>{t("loading")}</span>
                </>
              ) : (
                <>
                  <HiMagnifyingGlass aria-hidden="true" />
                  {t(mode === "compare" ? "cleaveFind" : "cleaveMarkedAction")}
                </>
              )}
            </Button>
          </div>
        </>
      )}
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
          title={t("cleaveLeaveTitle")}
          description={t(leave ? "cleaveClearBody" : "cleaveLeaveBody")}
        />
        <ModalFooter>
          <Button
            intent="outline"
            onPress={() => {
              setLeave(null);
              blocker.reset?.();
            }}
          >
            {t("cleaveStay")}
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
            {t("cleaveLeave")}
          </Button>
        </ModalFooter>
      </ModalContent>
    </>
  );
};
