import { clampFileName } from "@/core/libs/files";

/** The name of the copy Repair copy writes for one input. */
export const repairedNameOf = (name: string): string => {
  const trimmed = name.trim();
  const stem = trimmed.toLowerCase().endsWith(".pdf")
    ? trimmed.slice(0, -4)
    : trimmed;
  return clampFileName(`${stem || "document"}-repaired.pdf`);
};

/** How a repaired copy is made, in the order the engine tries them. */
export type FolioRepairPath = "rewrite" | "rebuild";

/** A check that a copy must pass before it is offered. */
export type FolioRepairCheck =
  | "write"
  | "opens"
  | "pages"
  | "text"
  | "order"
  | "render";

/** A document structure that a copy can lose. */
export type FolioLostStructure =
  | "forms"
  | "annotations"
  | "outlines"
  | "attachments"
  | "javascript"
  | "metadata";

/** What one page shows, as the checks compare it. */
export interface FolioPageFacts {
  readonly width: number;
  readonly height: number;
  /** The number of text characters on the page. */
  readonly chars: number;
  /** The first characters of the page text. */
  readonly sample: string;
  /** A hash of a small render, or null when the page does not render. */
  readonly render: number | null;
  readonly annotations: number;
}

/** The document structures outside the page content. */
export interface FolioStructureFacts {
  readonly attachments: number;
  readonly forms: boolean;
  readonly javascript: number;
  /** Each document information entry with a value, as `key=value`. */
  readonly metadata: readonly string[];
  readonly outlines: boolean;
}

/**
 * The first check a copy fails, or null when it passes all of them. A copy
 * that did not open has no pages to compare.
 */
export const failedCheckOf = (
  source: readonly FolioPageFacts[],
  copy: readonly FolioPageFacts[] | null
): FolioRepairCheck | null => {
  if (copy === null) {
    return "opens";
  }
  if (copy.length === 0 || copy.length !== source.length) {
    return "pages";
  }
  const pairs = source.map((page, index) => ({ copy: copy[index], page }));
  if (pairs.some(({ copy: other, page }) => page.chars > 0 && !other?.chars)) {
    return "text";
  }
  if (
    pairs.some(
      ({ copy: other, page }) =>
        other?.sample !== page.sample ||
        other.width !== page.width ||
        other.height !== page.height
    )
  ) {
    return "order";
  }
  if (
    pairs.some(
      ({ copy: other, page }) =>
        other?.render === null || other?.render !== page.render
    )
  ) {
    return "render";
  }
  return null;
};

/** The structures the source has and the copy does not keep. */
export const lostStructuresOf = (
  source: readonly FolioPageFacts[],
  sourceStructure: FolioStructureFacts,
  copy: readonly FolioPageFacts[],
  copyStructure: FolioStructureFacts
): readonly FolioLostStructure[] => {
  const annotationsOf = (pages: readonly FolioPageFacts[]) =>
    pages.reduce((sum, page) => sum + page.annotations, 0);
  const lost: FolioLostStructure[] = [];
  if (sourceStructure.forms && !copyStructure.forms) {
    lost.push("forms");
  }
  if (annotationsOf(copy) < annotationsOf(source)) {
    lost.push("annotations");
  }
  if (sourceStructure.outlines && !copyStructure.outlines) {
    lost.push("outlines");
  }
  if (copyStructure.attachments < sourceStructure.attachments) {
    lost.push("attachments");
  }
  if (copyStructure.javascript < sourceStructure.javascript) {
    lost.push("javascript");
  }
  const kept = new Set(copyStructure.metadata);
  if (sourceStructure.metadata.some((entry) => !kept.has(entry))) {
    lost.push("metadata");
  }
  return lost;
};
