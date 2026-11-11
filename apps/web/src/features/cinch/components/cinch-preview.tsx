"use client";

import { useCallback, useEffect, useRef } from "react";

import { formatBytes } from "@/core/utils/file-size";
import { useTranslation } from "@/features/i18n/use-translation";

type Side = "after" | "before";

/** What a player tells the pair: it played, paused, or moved to a time. */
type PlayerEvent =
  | { readonly kind: "pause" | "play" }
  | { readonly kind: "seek"; readonly time: number };

/** Plays a player that follows the other. A blocked play waits for a press. */
const playQuietly = async (player: HTMLVideoElement) => {
  try {
    await player.play();
  } catch {
    // The browser blocked the play; the user can press it.
  }
};

/** One player with its label. The object URL lives as long as the player. */
const Player = ({
  blob,
  label,
  onElement,
  onEvent,
}: {
  readonly blob: Blob;
  readonly label: string;
  readonly onElement: (element: HTMLVideoElement | null) => void;
  readonly onEvent: (event: PlayerEvent) => void;
}) => {
  const video = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const element = video.current;
    if (element === null) {
      return;
    }
    const url = URL.createObjectURL(blob);
    element.src = url;
    onElement(element);
    return () => {
      onElement(null);
      element.removeAttribute("src");
      element.load();
      URL.revokeObjectURL(url);
    };
  }, [blob, onElement]);

  return (
    <figure className="flex min-w-0 flex-col gap-y-1">
      <figcaption className="text-xs font-bold tracking-[0.06em] uppercase [font-stretch:87.5%]">
        {label}
      </figcaption>
      {/* oxlint-disable-next-line jsx-a11y/media-has-caption -- The user's own video has no captions to offer. */}
      <video
        className="border-rule bg-muted aspect-video w-full border-2 object-contain"
        controls
        muted
        onPause={() => {
          onEvent({ kind: "pause" });
        }}
        onPlay={() => {
          onEvent({ kind: "play" });
        }}
        onSeeked={(event) => {
          onEvent({ kind: "seek", time: event.currentTarget.currentTime });
        }}
        playsInline
        preload="metadata"
        ref={video}
      />
    </figure>
  );
};

/**
 * Before and after, side by side. A play, a pause, or a seek in one player
 * moves the other too, so the user can compare one frame.
 */
export const CinchPreview = ({
  input,
  output,
}: {
  readonly input: Blob;
  readonly output: Blob;
}) => {
  const { t, locale } = useTranslation();
  const players = useRef<Record<Side, HTMLVideoElement | null>>({
    after: null,
    before: null,
  });

  const setBefore = useCallback((element: HTMLVideoElement | null) => {
    players.current.before = element;
  }, []);
  const setAfter = useCallback((element: HTMLVideoElement | null) => {
    players.current.after = element;
  }, []);

  const follow = useCallback((from: Side, event: PlayerEvent) => {
    const other = players.current[from === "before" ? "after" : "before"];
    if (other === null) {
      return;
    }
    if (event.kind === "play" && other.paused) {
      void playQuietly(other);
    } else if (event.kind === "pause" && !other.paused) {
      other.pause();
    } else if (
      event.kind === "seek" &&
      Math.abs(other.currentTime - event.time) > 0.1
    ) {
      other.currentTime = event.time;
    }
  }, []);

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <Player
        blob={input}
        label={t("cinchPreviewBefore", {
          size: formatBytes(input.size, locale),
        })}
        onElement={setBefore}
        onEvent={(event) => {
          follow("before", event);
        }}
      />
      <Player
        blob={output}
        label={t("cinchPreviewAfter", {
          size: formatBytes(output.size, locale),
        })}
        onElement={setAfter}
        onEvent={(event) => {
          follow("after", event);
        }}
      />
    </div>
  );
};
