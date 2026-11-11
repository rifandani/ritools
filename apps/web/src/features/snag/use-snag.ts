"use client";

/* oxlint-disable react/set-state-in-effect -- The hook owns the session state; the browser calls sit at the event boundary. */
import { Effect, Exit, Option } from "effect";
import { useCallback, useEffect, useRef, useState } from "react";

import { useLatest } from "@/core/hooks/use-latest";
import { LibraryLoadError } from "@/core/libs/library-load";
import { useTranslation } from "@/features/i18n/use-translation";
import {
  fileNameOf,
  parseVideoLink,
  saveOptionsOf,
  SnagRefusal,
} from "@/features/snag/snag";
import type {
  LinkProblem,
  RefusalReason,
  SaveOption,
  SnagStream,
  SnagVideo,
  VideoId,
} from "@/features/snag/snag";
import { inspectVideoLink } from "@/features/snag/snag.functions";
import { openSink, saveOption, SaveError } from "@/features/snag/snag.save";
import type {
  SaveFailure,
  SaveProgress,
  SaveSink,
} from "@/features/snag/snag.save";

/** The state of one save of one Save Option. */
export type SaveState =
  | { readonly status: "saving"; readonly progress: SaveProgress }
  | { readonly status: "done" }
  | {
      readonly status: "failed";
      readonly reason: Exclude<SaveFailure, "cancelled"> | "library";
    }
  | { readonly status: "cancelled" };

/** One submitted Video Link and what Snag knows about it. */
export interface SnagCard {
  readonly key: string;
  readonly id: VideoId;
  readonly state:
    | { readonly status: "reading" }
    | {
        readonly status: "ready";
        readonly video: SnagVideo;
        readonly options: readonly SaveOption[];
      }
    | { readonly status: "refused"; readonly reason: RefusalReason };
  /** Save states by Save Option id. */
  readonly saves: ReadonlyMap<string, SaveState>;
}

export type InspectOutcome =
  | { readonly ok: true; readonly card: SnagCard }
  | {
      readonly ok: false;
      readonly problem: LinkProblem | RefusalReason;
      readonly card: SnagCard | null;
    };

export type SaveOutcome =
  | { readonly ok: true; readonly name: string }
  | {
      readonly ok: false;
      readonly reason:
        | SaveFailure
        | "library"
        | "declined"
        | "busy"
        | "unknown";
    };

const inspect = async (id: VideoId) => {
  const exit = await Effect.runPromiseExit(inspectVideoLink(id));
  if (Exit.isSuccess(exit)) {
    return { ok: true as const, video: exit.value };
  }
  const error = Option.getOrUndefined(Exit.findErrorOption(exit));
  return {
    ok: false as const,
    reason: error instanceof SnagRefusal ? error.reason : "unreachable",
  };
};

/** A number that changes only when the visible progress changes. */
const percentOf = (progress: SaveProgress): number => {
  if (progress.phase === "fetching") {
    return Math.floor((progress.received / progress.total) * 100);
  }
  return progress.phase === "encoding"
    ? 100 + Math.floor(progress.fraction * 100)
    : 200;
};

/** Runs one save and turns its error into a reason. */
const runSave = async (
  request: Parameters<typeof saveOption>[0]
): Promise<
  | { readonly ok: true }
  | { readonly ok: false; readonly reason: SaveFailure | "library" }
> => {
  try {
    await saveOption(request);
    return { ok: true };
  } catch (error) {
    if (error instanceof LibraryLoadError) {
      return { ok: false, reason: "library" };
    }
    return {
      ok: false,
      reason: error instanceof SaveError ? error.reason : "write-failed",
    };
  }
};

const saveKeyOf = (cardKey: string, optionId: string) =>
  `${cardKey}\u0000${optionId}`;

/**
 * One Snag session: the submitted Video Links, newest first, and the saves of
 * their Save Options. Nothing survives a reload.
 */
export const useSnag = () => {
  const { t, locale } = useTranslation();
  const [cards, setCards] = useState<readonly SnagCard[]>([]);
  const [problem, setProblem] = useState<LinkProblem | null>(null);
  const [reading, setReading] = useState(false);
  const [announcement, setAnnouncement] = useState("");
  const cardsRef = useLatest(cards);
  const controllers = useRef(new Map<string, AbortController>());
  const nextKey = useRef(0);

  useEffect(() => {
    const running = controllers.current;
    return () => {
      for (const controller of running.values()) {
        controller.abort();
      }
    };
  }, []);

  const patchCard = useCallback(
    (key: string, patch: (card: SnagCard) => SnagCard) => {
      setCards((current) =>
        current.map((card) => (card.key === key ? patch(card) : card))
      );
    },
    []
  );

  const setSave = useCallback(
    (key: string, optionId: string, state: SaveState) => {
      patchCard(key, (card) => ({
        ...card,
        saves: new Map(card.saves).set(optionId, state),
      }));
    },
    [patchCard]
  );

  /** Reads one Video Link and adds its card at the top. */
  const submit = useCallback(
    async (text: string): Promise<InspectOutcome> => {
      const parsed = parseVideoLink(text);
      if (!parsed.ok) {
        setProblem(parsed.problem);
        setAnnouncement(
          t(
            parsed.problem === "playlist"
              ? "snagProblemPlaylist"
              : "snagProblemNotALink"
          )
        );
        return { card: null, ok: false, problem: parsed.problem };
      }
      setProblem(null);
      nextKey.current += 1;
      const key = `card-${nextKey.current}`;
      const pending: SnagCard = {
        id: parsed.id,
        key,
        saves: new Map(),
        state: { status: "reading" },
      };
      setCards((current) => [pending, ...current]);
      setReading(true);
      setAnnouncement(t("snagReading"));
      const result = await inspect(parsed.id);
      setReading(false);
      const card: SnagCard = result.ok
        ? {
            ...pending,
            state: {
              options: saveOptionsOf(result.video),
              status: "ready",
              video: result.video,
            },
          }
        : { ...pending, state: { reason: result.reason, status: "refused" } };
      patchCard(key, (current) => ({ ...card, saves: current.saves }));
      setAnnouncement(
        result.ok
          ? t("snagReadyAnnouncement", { title: result.video.title })
          : t("snagRefusedAnnouncement")
      );
      return result.ok
        ? { card, ok: true }
        : { card, ok: false, problem: result.reason };
    },
    [patchCard, t]
  );

  const refreshOf = useCallback(
    (id: VideoId) =>
      async (stream: SnagStream): Promise<SnagStream> => {
        const result = await inspect(id);
        const fresh = result.ok
          ? result.video.streams.find((item) => item.itag === stream.itag)
          : undefined;
        if (fresh === undefined) {
          throw new SaveError("expired");
        }
        return fresh;
      },
    []
  );

  /**
   * Saves one Save Option. A click opens the save dialog first, while the
   * click still counts; an Agent Action saves through memory.
   */
  const save = useCallback(
    async (
      key: string,
      optionId: string,
      options: { readonly fromAgent?: boolean } = {}
    ): Promise<SaveOutcome> => {
      const card = cardsRef.current.find((item) => item.key === key);
      if (card?.state.status !== "ready") {
        return { ok: false, reason: "unknown" };
      }
      const option = card.state.options.find((item) => item.id === optionId);
      if (option === undefined) {
        return { ok: false, reason: "unknown" };
      }
      const saveKey = saveKeyOf(key, optionId);
      if (controllers.current.has(saveKey)) {
        return { ok: false, reason: "busy" };
      }
      const name = fileNameOf(card.state.video, option);
      const controller = new AbortController();
      controllers.current.set(saveKey, controller);
      const sink: SaveSink | null =
        options.fromAgent === true
          ? { kind: "memory" }
          : await openSink(option, name);
      if (sink === null) {
        controllers.current.delete(saveKey);
        return { ok: false, reason: "declined" };
      }
      let lastPercent = -1;
      setSave(key, optionId, {
        progress: { phase: "fetching", received: 0, total: 1 },
        status: "saving",
      });
      setAnnouncement(t("snagSavingAnnouncement", { name }));
      const outcome = await runSave({
        name,
        onProgress: (progress) => {
          const percent = percentOf(progress);
          if (percent !== lastPercent) {
            lastPercent = percent;
            setSave(key, optionId, { progress, status: "saving" });
          }
        },
        option,
        refresh: refreshOf(card.id),
        signal: controller.signal,
        sink,
      });
      controllers.current.delete(saveKey);
      if (outcome.ok) {
        setSave(key, optionId, { status: "done" });
        setAnnouncement(t("snagSavedAnnouncement", { name }));
        return { name, ok: true };
      }
      controller.abort();
      const { reason } = outcome;
      setSave(
        key,
        optionId,
        reason === "cancelled"
          ? { status: "cancelled" }
          : { reason, status: "failed" }
      );
      setAnnouncement(
        t(
          reason === "cancelled"
            ? "snagCancelledAnnouncement"
            : "snagFailedAnnouncement",
          { name }
        )
      );
      return { ok: false, reason };
    },
    [cardsRef, refreshOf, setSave, t]
  );

  const cancel = useCallback((key: string, optionId: string) => {
    controllers.current.get(saveKeyOf(key, optionId))?.abort();
  }, []);

  /** Removes one card and stops its saves. */
  const remove = useCallback((key: string) => {
    for (const [saveKey, controller] of controllers.current) {
      if (saveKey.startsWith(`${key}\u0000`)) {
        controller.abort();
      }
    }
    setCards((current) => current.filter((card) => card.key !== key));
  }, []);

  return {
    announcement,
    cancel,
    cards,
    locale,
    problem,
    reading,
    remove,
    save,
    submit,
    t,
  };
};

export type SnagController = ReturnType<typeof useSnag>;
