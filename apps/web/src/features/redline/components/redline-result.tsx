/* oxlint-disable react-doctor/prefer-dynamic-import -- This whole renderer loads only on the first compare. */
import {
  UnresolvedFile,
  DEFAULT_THEMES,
  preloadHighlighter,
  getResolvedOrResolveLanguage,
} from "@pierre/diffs";
import type { UnresolvedFileOptions } from "@pierre/diffs";
import { FileDiff } from "@pierre/diffs/react";
import { useEffect, useEffectEvent, useRef, useState } from "react";

import { Button, buttonStyles } from "@/core/components/ui/button";
import { loadLibrary } from "@/core/libs/library-load";
import { useTranslation } from "@/features/i18n/use-translation";

import type { Language } from "../redline";
import type { Controls } from "../redline.controls";
import { toOptions } from "../redline.controls";
import type { MarkedSession } from "../redline.marked.browser";
import type { RedlineSession } from "../redline.session";

export type Run =
  | { readonly kind: "compare"; readonly session: RedlineSession }
  | { readonly kind: "marked"; readonly session: MarkedSession };

const markedActions = [
  ["current", "redlineAcceptCurrent"],
  ["incoming", "redlineAcceptIncoming"],
  ["both", "redlineAcceptBoth"],
] as const;

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
        row.className = "redline-conflict-actions";

        row.setAttribute(
          "aria-label",
          `${t("redlineMarkedAction")} ${action.conflictIndex + 1}`
        );
        for (const [resolution, label] of markedActions) {
          const button = document.createElement("button");
          button.type = "button";
          button.className = `${buttonStyles({ intent: "outline", size: "sm" })} bracket`;
          button.addEventListener("pointerenter", () => {
            button.dataset.hovered = "";
          });
          button.addEventListener("pointerleave", () => {
            delete button.dataset.hovered;
          });
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
  return <div className="redline-renderer" ref={host} />;
};

export const RedlineResult = ({
  run,
  controls,
  language,
  resolving,
  colorMode,
  changed,
  failed,
}: {
  readonly run: Run;
  readonly controls: Controls;
  readonly language: Language;
  readonly resolving: boolean;
  readonly colorMode: "light" | "dark";
  readonly changed: () => void;
  readonly failed: () => void;
}) => {
  const { t } = useTranslation();
  const [loadedLanguage, setLoadedLanguage] = useState<Language>("text");
  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        if (language !== "text") {
          await loadLibrary("Redline", async () => {
            await getResolvedOrResolveLanguage(language);
            return preloadHighlighter({
              themes: Object.values(DEFAULT_THEMES),
              langs: [language],
              preferredHighlighter: "shiki-js",
            });
          });
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
  const options = { ...toOptions(controls), themeType: colorMode };
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
    <FileDiff<number>
      className="redline-renderer"
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
          className="redline-conflict-actions"
          aria-label={`${t("redlineResolve")} ${annotation.metadata + 1}`}
        >
          {(
            [
              ["before", "redlineAcceptBefore"],
              ["after", "redlineAcceptAfter"],
              ["both", "redlineAcceptBoth"],
            ] as const
          ).map(([choice, label]) => (
            <Button
              size="sm"
              intent="outline"
              key={choice}
              onPress={() => {
                session.choose(annotation.metadata, choice);
                changed();
              }}
            >
              {t(label)}
            </Button>
          ))}
        </fieldset>
      )}
    />
  );
};
