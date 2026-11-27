/* oxlint-disable jsx-a11y/prefer-tag-over-role -- A window splitter takes focus and a value; `<hr>` is a static rule. */
import { useRef, useState } from "react";
import { useMove } from "react-aria/useMove";

import { useTranslation } from "@/features/i18n/use-translation";

import {
  dragSplit,
  SPLIT_DEFAULT,
  SPLIT_LARGE_STEPS,
  SPLIT_MAX,
  SPLIT_MIN,
  stepSplit,
} from "../quill.split";

/**
 * The border between the source and the reader in Split view. A drag or the
 * arrow keys move it; a double-click puts it back in the middle.
 */
export const QuillSplitHandle = ({
  percent,
  onChange,
}: {
  readonly percent: number;
  readonly onChange: (update: (current: number) => number) => void;
}) => {
  const { t } = useTranslation();
  const handle = useRef<HTMLDivElement>(null);
  /* The panes width at drag start. A drag converts pixels with it. */
  const width = useRef(0);
  const [moving, setMoving] = useState(false);
  const { moveProps } = useMove({
    onMoveStart: () => {
      setMoving(true);
      width.current =
        handle.current?.parentElement?.getBoundingClientRect().width ?? 0;
    },
    onMove: (event) => {
      onChange((current) =>
        event.pointerType === "keyboard"
          ? stepSplit(
              current,
              Math.sign(event.deltaX) * (event.shiftKey ? SPLIT_LARGE_STEPS : 1)
            )
          : dragSplit(current, event.deltaX, width.current)
      );
    },
    onMoveEnd: () => setMoving(false),
  });
  const value = Math.round(percent);
  return (
    <div
      {...moveProps}
      aria-label={t("quillResizePanes")}
      aria-orientation="vertical"
      aria-valuemax={SPLIT_MAX}
      aria-valuemin={SPLIT_MIN}
      aria-valuenow={value}
      aria-valuetext={`${value}% / ${100 - value}%`}
      className="quill-split-handle"
      data-moving={moving || undefined}
      onDoubleClick={() => onChange(() => SPLIT_DEFAULT)}
      ref={handle}
      onKeyDown={(event) => {
        if (event.key === "Home" || event.key === "End") {
          event.preventDefault();
          onChange(() => (event.key === "Home" ? SPLIT_MIN : SPLIT_MAX));
        } else if (event.key === "Enter") {
          event.preventDefault();
          onChange(() => SPLIT_DEFAULT);
        } else {
          moveProps.onKeyDown?.(event);
        }
      }}
      role="separator"
      tabIndex={0}
    />
  );
};
