import { describe, expect, it } from "vitest";

import {
  cleanDownloadName,
  splitPartCount,
  splitPartName,
  splitZipName,
} from "./tabular.split";

const names = (
  overrides: Partial<Parameters<typeof splitPartName>[0]> = {}
) => ({
  sourceName: "data.csv",
  sheetName: "Sheet1",
  workbook: false,
  partCount: 12,
  ...overrides,
});

describe("CSV Split names", () => {
  it("counts parts with a short final part", () => {
    expect(splitPartCount(891, 1000)).toBe(1);
    expect(splitPartCount(891, 500)).toBe(2);
    expect(splitPartCount(1000, 1000)).toBe(1);
    expect(splitPartCount(1001, 1000)).toBe(2);
    expect(splitPartCount(0, 1000)).toBe(0);
    expect(splitPartCount(100, 0)).toBe(0);
  });

  it("pads the part number to the total width", () => {
    expect(splitPartName(names(), 0)).toBe("data-part-01-of-12.csv");
    expect(splitPartName(names(), 11)).toBe("data-part-12-of-12.csv");
    expect(splitPartName(names({ partCount: 9 }), 0)).toBe(
      "data-part-1-of-9.csv"
    );
  });

  it("names a workbook Part with its Sheet", () => {
    expect(
      splitPartName(
        names({
          sourceName: "report.xlsx",
          sheetName: "Q1",
          workbook: true,
          partCount: 3,
        }),
        2
      )
    ).toBe("report-Q1-part-3-of-3.csv");
  });

  it("keeps names short and free of path separators", () => {
    const name = splitPartName(
      names({
        sourceName: `${"a".repeat(300)}.csv`,
        partCount: 1200,
      }),
      0
    );
    expect(name.length).toBeLessThanOrEqual(120);
    expect(name.endsWith(".csv")).toBe(true);
    expect(name).not.toContain("/");
    expect(name).not.toContain("\\");
    expect(cleanDownloadName("../../bad\u0000.csv")).toBe("....bad.csv");
  });

  it("names the ZIP from the same base", () => {
    expect(splitZipName(names())).toBe("data-split.zip");
    expect(
      splitZipName(
        names({ sourceName: "report.xlsx", sheetName: "Q1", workbook: true })
      )
    ).toBe("report-Q1-split.zip");
  });
});
