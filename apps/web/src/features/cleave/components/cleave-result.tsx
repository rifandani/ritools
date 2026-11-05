/* oxlint-disable react-doctor/prefer-dynamic-import -- This whole renderer loads only on the first compare. */
import {
  UnresolvedFile,
  DEFAULT_THEMES,
  preloadHighlighter,
  canUseWASM,
} from "@pierre/diffs";
import type { UnresolvedFileOptions } from "@pierre/diffs";
import { FileDiff } from "@pierre/diffs/react";
import { useEffect, useEffectEvent, useRef, useState } from "react";
import { Button as ButtonPrimitive } from "react-aria-components/Button";

import { loadLibrary } from "@/core/libs/library-load";
import { useTranslation } from "@/features/i18n/use-translation";

import type { Language } from "../cleave";
import type { Controls } from "../cleave.controls";
import { toOptions } from "../cleave.controls";
import type { MarkedSession } from "../cleave.marked.browser";
import type { CleaveSession } from "../cleave.session";
import { CleaveComparisonFooter } from "./cleave-comparison-footer";
import { CleaveComparisonHeader } from "./cleave-comparison-header";

export type Run =
  | { readonly kind: "compare"; readonly session: CleaveSession }
  | { readonly kind: "marked"; readonly session: MarkedSession };

const markedActions = [
  ["current", "cleaveAcceptCurrent"],
  ["incoming", "cleaveAcceptIncoming"],
  ["both", "cleaveAcceptBoth"],
] as const;

const conflictActionClass = "cleave-conflict-action bracket";
// Keep this entry independent of the library entry so a failed import can retry.
const preferredHighlighter = canUseWASM() ? "highlights" : "shiki-js";

class MarkedRenderer extends UnresolvedFile {
  setLanguage(language: Language) {
    const diff = this.computedCache.fileDiff;
    if (diff) {
      this.computedCache.fileDiff = { ...diff, lang: language };
    }
  }
}

const MarkedSurface = ({
  session,
  options,
  language,
  changed,
  failed,
}: {
  readonly session: MarkedSession;
  readonly options: ReturnType<typeof toOptions> & {
    preferredHighlighter: typeof preferredHighlighter;
    themeType: "light" | "dark";
  };
  readonly language: Language;
  readonly changed: () => void;
  readonly failed: () => void;
}) => {
  const { t } = useTranslation();
  const host = useRef<HTMLDivElement>(null);
  const instance = useRef<MarkedRenderer | null>(null);
  const notify = useEffectEvent(changed);
  const fail = useEffectEvent(failed);
  const settings = useRef(options);
  const nativeOptions = useEffectEvent(
    (): UnresolvedFileOptions<undefined> => ({
      ...settings.current,
      mergeConflictActionsType: (action) => {
        const row = document.createElement("fieldset");
        row.className = "cleave-conflict-actions";
        row.dataset.marked = "";
        row.setAttribute(
          "aria-label",
          `${t("cleaveMarkedAction")} ${action.conflictIndex + 1}`
        );
        for (const [resolution, label] of markedActions) {
          const button = document.createElement("button");
          button.type = "button";
          button.className = conflictActionClass;
          button.textContent = t(label);
          button.dataset.mergeConflictAction = resolution;
          button.dataset.mergeConflictConflictIndex = String(
            action.conflictIndex
          );
          row.append(button);
        }
        return row;
      },
      onMergeConflictResolve: (file, payload) => {
        session.receive(payload.conflict.conflictIndex, file.contents);
        notify();
      },
    })
  );
  useEffect(() => {
    if (!host.current) {
      return;
    }
    const renderer = new MarkedRenderer(nativeOptions());
    instance.current = renderer;
    try {
      renderer.render({
        file: { name: "marked.txt", contents: session.text, lang: "text" },
        containerWrapper: host.current,
      });
      session.connect((id, choice) => {
        const resolution =
          choice === "before"
            ? "current"
            : choice === "after"
              ? "incoming"
              : "both";
        host.current
          ?.querySelector<HTMLButtonElement>(
            `[data-merge-conflict-conflict-index="${id}"][data-merge-conflict-action="${resolution}"]`
          )
          ?.click();
      });
    } catch {
      fail();
    }
    return () => {
      session.disconnect();
      renderer.cleanUp();
      instance.current = null;
    };
  }, [session]);
  useEffect(() => {
    settings.current = options;
    if (instance.current) {
      instance.current.setOptions(nativeOptions());
      instance.current.setLanguage(language);
      instance.current.rerender();
      for (const [resolution, label] of markedActions) {
        for (const button of host.current?.querySelectorAll<HTMLButtonElement>(
          `[data-merge-conflict-action="${resolution}"]`
        ) ?? []) {
          button.textContent = t(label);
        }
      }
    }
  }, [options, language, t]);
  return <div className="cleave-renderer" ref={host} />;
};

export const CleaveResult = ({
  run,
  controls,
  language,
  resolving,
  colorMode,
  changed,
  failed,
  copy,
}: {
  readonly run: Run;
  readonly controls: Controls;
  readonly language: Language;
  readonly resolving: boolean;
  readonly colorMode: "light" | "dark";
  readonly changed: () => void;
  readonly failed: () => void;
  readonly copy: (text: string) => Promise<void>;
}) => {
  const { t } = useTranslation();
  const [loadedLanguage, setLoadedLanguage] = useState<Language>("text");
  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        if (language !== "text") {
          await loadLibrary("Cleave", () =>
            preloadHighlighter({
              themes: Object.values(DEFAULT_THEMES),
              langs: [language],
              preferredHighlighter,
            })
          );
        }
        if (active) {
          setLoadedLanguage(language);
        }
      } catch {
        if (active) {
          setLoadedLanguage("text");
        }
      }
    };
    void load();
    return () => {
      active = false;
    };
  }, [language]);
  const options = {
    ...toOptions(controls),
    preferredHighlighter,
    themeType: colorMode,
  } satisfies UnresolvedFileOptions<undefined>;
  if (run.kind === "marked") {
    return (
      <MarkedSurface
        session={run.session}
        options={options}
        language={loadedLanguage}
        changed={changed}
        failed={failed}
      />
    );
  }
  const { session } = run;
  const { view } = session;
  return (
    <div className="cleave-comparison">
      {/* `session` stays the same object after a choice; `statistics` does not. */}
      <CleaveComparisonHeader
        session={session}
        statistics={view.statistics}
        layout={controls.layout}
        copy={copy}
      />
      <FileDiff<number>
        className="cleave-renderer"
        fileDiff={{ ...view.diff, lang: loadedLanguage }}
        options={options}
        lineAnnotations={
          resolving
            ? view.conflicts.map((conflict) => ({
                side: conflict.side,
                lineNumber: conflict.lineNumber,
                metadata: conflict.id,
              }))
            : []
        }
        renderAnnotation={(annotation) => (
          <fieldset
            className="cleave-conflict-actions"
            aria-label={`${t("cleaveResolve")} ${annotation.metadata + 1}`}
          >
            {(
              [
                ["before", "cleaveAcceptBefore"],
                ["after", "cleaveAcceptAfter"],
                ["both", "cleaveAcceptBoth"],
              ] as const
            ).map(([choice, label]) => (
              <ButtonPrimitive
                className={conflictActionClass}
                key={choice}
                onPress={() => {
                  session.choose(annotation.metadata, choice);
                  changed();
                }}
              >
                {t(label)}
              </ButtonPrimitive>
            ))}
          </fieldset>
        )}
      />
      <CleaveComparisonFooter session={session} layout={controls.layout} />
    </div>
  );
};
