import { diffAcceptRejectHunk, parseDiffFromFile } from "@pierre/diffs";
import type { FileDiffMetadata } from "@pierre/diffs";

import { swapTexts } from "./redline";
import type { Texts } from "./redline";

export type Choice = "before" | "after" | "both";
const normalize = (text: string) => text.replaceAll("\r\n", "\n");
const usesCRLF = (text: string) =>
  text.includes("\r\n") && !/[\r\n]/u.test(text.replaceAll("\r\n", ""));
const lineCount = (text: string) =>
  text === ""
    ? 0
    : normalize(text).split("\n").length - Number(text.endsWith("\n"));
const changes = (diff: FileDiffMetadata) =>
  diff.hunks.flatMap((hunk, hunkIndex) =>
    hunk.hunkContent.flatMap((content, changeIndex) =>
      content.type === "change" ? [{ content, hunkIndex, changeIndex }] : []
    )
  );

/** Pure in-memory session. Conflict IDs survive changes to hunk and line indexes. */
export class RedlineSession {
  private diff: FileDiffMetadata;
  private readonly original: FileDiffMetadata;
  private readonly ids: number[];
  private pending: number[];
  private readonly totals: { removals: number; additions: number };

  readonly texts: Texts;

  constructor(texts: Texts, diff: FileDiffMetadata) {
    this.texts = texts;
    this.original = diff;
    this.diff = diff;
    const all = changes(diff);
    this.ids = all.map((_, index) => index);
    this.pending = [...this.ids];
    this.totals = all.reduce(
      (sum, { content }) => ({
        removals: sum.removals + content.deletions,
        additions: sum.additions + content.additions,
      }),
      { removals: 0, additions: 0 }
    );
  }

  static compare(texts: Texts) {
    return new RedlineSession(
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

  get view() {
    return {
      ...this.totals,
      beforeLines: lineCount(this.texts.before),
      afterLines: lineCount(this.texts.after),
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
    return RedlineSession.compare(swapTexts(this.texts));
  }

  private restoreEndings(text: string) {
    return usesCRLF(this.texts.before) && usesCRLF(this.texts.after)
      ? text.replaceAll("\n", "\r\n")
      : text;
  }
}
