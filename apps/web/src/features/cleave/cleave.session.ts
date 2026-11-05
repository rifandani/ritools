import { diffAcceptRejectHunk, parseDiffFromFile } from "@pierre/diffs";
import type { FileDiffMetadata } from "@pierre/diffs";

import { swapTexts } from "./cleave";
import type { Texts } from "./cleave";

export type Choice = "before" | "after" | "both";
const normalize = (text: string) => text.replaceAll("\r\n", "\n");
const usesCRLF = (text: string) =>
  text.includes("\r\n") && !/[\r\n]/u.test(text.replaceAll("\r\n", ""));
const lineCount = (text: string) =>
  text === ""
    ? 0
    : normalize(text).split("\n").length - Number(text.endsWith("\n"));
// Count Unicode code points, excluding line endings, on both sides of a Change.
const characterCount = (text: string) => {
  let count = 0;
  for (const character of text) {
    if (character !== "\n" && character !== "\r") {
      count += 1;
    }
  }
  return count;
};
export interface ComparisonStatistics {
  readonly lines: number;
  /** Lines in Changes that are not settled yet. */
  readonly changedLines: number;
  readonly characters: number;
  /** Characters in Changes that are not settled yet. */
  readonly changedCharacters: number;
}
interface TextSize {
  readonly lines: number;
  readonly characters: number;
}
type Side = "before" | "after";
const changedSize = (
  lines: readonly string[],
  start: number,
  count: number
): TextSize => ({
  lines: count,
  characters: characterCount(lines.slice(start, start + count).join("")),
});
const changes = (diff: FileDiffMetadata) =>
  diff.hunks.flatMap((hunk, hunkIndex) =>
    hunk.hunkContent.flatMap((content, changeIndex) =>
      content.type === "change" ? [{ content, hunkIndex, changeIndex }] : []
    )
  );

// A Stacked row order: unchanged lines, then the Removals and Additions of each Change.
const stackedLines = (diff: FileDiffMetadata) => {
  const segments: string[][] = [];
  let unchanged = 0;
  for (const { content } of changes(diff)) {
    segments.push(
      diff.additionLines.slice(unchanged, content.additionLineIndex),
      diff.deletionLines.slice(
        content.deletionLineIndex,
        content.deletionLineIndex + content.deletions
      ),
      diff.additionLines.slice(
        content.additionLineIndex,
        content.additionLineIndex + content.additions
      )
    );
    unchanged = content.additionLineIndex + content.additions;
  }
  segments.push(diff.additionLines.slice(unchanged));
  return segments.flat();
};

/** Pure in-memory session. Conflict IDs survive changes to hunk and line indexes. */
export class CleaveSession {
  private diff: FileDiffMetadata;
  private readonly original: FileDiffMetadata;
  private readonly ids: number[];
  private pending: number[];
  private readonly inputSizes: Readonly<Record<Side, TextSize>>;
  // Indexed by Conflict ID. A Change keeps its size until it is settled.
  private readonly changeSizes: readonly Readonly<Record<Side, TextSize>>[];

  readonly stacked: {
    readonly text: string;
    readonly lines: number;
    readonly characters: number;
  };

  readonly texts: Texts;

  constructor(texts: Texts, diff: FileDiffMetadata) {
    this.texts = texts;
    this.original = diff;
    this.diff = diff;
    const all = changes(diff);
    this.ids = all.map((_, index) => index);
    this.pending = [...this.ids];
    this.inputSizes = {
      before: {
        lines: lineCount(texts.before),
        characters: characterCount(texts.before),
      },
      after: {
        lines: lineCount(texts.after),
        characters: characterCount(texts.after),
      },
    };
    this.changeSizes = all.map(({ content }) => ({
      before: changedSize(
        diff.deletionLines,
        content.deletionLineIndex,
        content.deletions
      ),
      after: changedSize(
        diff.additionLines,
        content.additionLineIndex,
        content.additions
      ),
    }));
    const lines = stackedLines(diff);
    this.stacked = {
      lines: lines.length,
      characters: lines.reduce(
        (total, line) => total + characterCount(line),
        0
      ),
      text: this.restoreEndings(
        lines
          // A line at a missing EOF newline can sit above a line of the other side.
          .map((line, index) =>
            index < lines.length - 1 && !line.endsWith("\n")
              ? `${line}\n`
              : line
          )
          .join("")
      ),
    };
  }

  static compare(texts: Texts) {
    return new CleaveSession(
      texts,
      parseDiffFromFile(
        {
          name: texts.beforeName ?? "before.txt",
          contents: normalize(texts.before),
        },
        {
          name: texts.afterName ?? "after.txt",
          contents: normalize(texts.after),
        }
      )
    );
  }

  get statistics() {
    return {
      before: this.sideStatistics("before"),
      after: this.sideStatistics("after"),
    };
  }

  get view() {
    const { statistics } = this;
    return {
      statistics,
      removals: statistics.before.changedLines,
      additions: statistics.after.changedLines,
      beforeLines: statistics.before.lines,
      afterLines: statistics.after.lines,
      diff: this.diff,
      conflicts: changes(this.diff).map(({ content }, index) => ({
        id: this.pending[index] ?? -1,
        side:
          content.additions > 0
            ? ("additions" as const)
            : ("deletions" as const),
        lineNumber:
          content.additions > 0
            ? content.additionLineIndex + content.additions
            : content.deletionLineIndex + content.deletions,
      })),
      remaining: this.pending.length,
      chosen: this.ids.length - this.pending.length,
      resolved:
        this.pending.length === 0
          ? this.restoreEndings(this.diff.additionLines.join(""))
          : null,
    };
  }

  choose(id: number, choice: Choice) {
    const position = this.pending.indexOf(id);
    const target = changes(this.diff)[position];
    if (!target) {
      return;
    }
    const boundary =
      target.content.deletionLineIndex + target.content.deletions - 1;
    // 1.6.4 keeps line strings verbatim. Both needs a separator at a missing EOF newline.
    const diff =
      choice === "both" &&
      target.content.additions > 0 &&
      target.content.deletions > 0
        ? {
            ...this.diff,
            deletionLines: this.diff.deletionLines.map((line, index) =>
              index === boundary && !line.endsWith("\n") ? `${line}\n` : line
            ),
          }
        : this.diff;
    this.diff = diffAcceptRejectHunk(diff, target.hunkIndex, {
      type:
        choice === "after" ? "accept" : choice === "before" ? "reject" : "both",
      changeIndex: target.changeIndex,
    });
    this.pending = this.pending.filter((pending) => pending !== id);
  }
  chooseAll(choice: Choice) {
    for (const id of this.pending) {
      this.choose(id, choice);
    }
  }

  reset() {
    this.diff = this.original;
    this.pending = [...this.ids];
  }

  swap() {
    return CleaveSession.compare(swapTexts(this.texts));
  }

  private sideStatistics(side: Side): ComparisonStatistics {
    const sizes = this.pending.flatMap(
      (id) => this.changeSizes[id]?.[side] ?? []
    );
    return {
      ...this.inputSizes[side],
      changedLines: sizes.reduce((total, size) => total + size.lines, 0),
      changedCharacters: sizes.reduce(
        (total, size) => total + size.characters,
        0
      ),
    };
  }

  private restoreEndings(text: string) {
    return usesCRLF(this.texts.before) && usesCRLF(this.texts.after)
      ? text.replaceAll("\n", "\r\n")
      : text;
  }
}
