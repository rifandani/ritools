/* oxlint-disable eslint/no-control-regex -- Download names remove control characters and path separators. */
import { clampFileName } from "@/core/libs/files";

/** A file name from untrusted source text. It keeps no path separator. */
export const cleanDownloadName = (value: string): string =>
  value.replaceAll(/[\u0000-\u001F\u007F/\\]/gu, "").trim() || "tabular";

const BASE_LIMIT = 60;
const NAME_LIMIT = 120;

export interface SplitNames {
  readonly sourceName: string;
  readonly sheetName: string;
  readonly workbook: boolean;
  readonly partCount: number;
}

/** The number of Parts in a Split. It is zero when there is nothing to split. */
export const splitPartCount = (
  dataRows: number,
  rowsPerPart: number
): number =>
  dataRows > 0 && rowsPerPart > 0 ? Math.ceil(dataRows / rowsPerPart) : 0;

const splitBase = (names: SplitNames): string => {
  const stem = cleanDownloadName(names.sourceName.replace(/\.[^.]*$/u, ""));
  const sheet = names.workbook ? `-${cleanDownloadName(names.sheetName)}` : "";
  return [...`${stem}${sheet}`].slice(0, BASE_LIMIT).join("");
};

const pad = (value: number, width: number): string =>
  String(value).padStart(width, "0");

/** One Part file name. `index` is zero-based; `partCount` sets the padding. */
export const splitPartName = (names: SplitNames, index: number): string => {
  const width = Math.max(1, String(names.partCount).length);
  return clampFileName(
    `${splitBase(names)}-part-${pad(index + 1, width)}-of-${pad(names.partCount, width)}.csv`,
    NAME_LIMIT
  );
};

/** The ZIP name for a Split with more than one Part. */
export const splitZipName = (names: SplitNames): string =>
  clampFileName(`${splitBase(names)}-split.zip`, NAME_LIMIT);
