import { clampFileName, MAX_FILE_NAME_LENGTH } from "@/core/libs/files";

/** The stem of a document name: no `.pdf`, no space around it, never empty. */
const folioDocumentStem = (name: string): string => {
  const trimmed = name.trim();
  const stem = trimmed.toLowerCase().endsWith(".pdf")
    ? trimmed.slice(0, -4)
    : trimmed;
  return stem || "document";
};

/**
 * A new file name for one document: its stem and one suffix. The stem is
 * clamped, so a long name keeps the suffix that says what the file is.
 */
export const folioCopyFileName = (name: string, suffix: string): string =>
  `${clampFileName(
    folioDocumentStem(name),
    Math.max(1, MAX_FILE_NAME_LENGTH - suffix.length)
  )}${suffix}`;
