import { describe, expect, it } from "vitest";

import { formatKilobytes } from "@/core/utils/file-size";

describe("formatKilobytes", () => {
  it("prints one unit and at most one decimal place", () => {
    expect(formatKilobytes(0, "en-US")).toBe("0 KB");
    expect(formatKilobytes(512, "en-US")).toBe("0.5 KB");
    expect(formatKilobytes(999, "en-US")).toBe("1 KB");
    expect(formatKilobytes(3421, "en-US")).toBe("3.4 KB");
    expect(formatKilobytes(61_194, "en-US")).toBe("61.2 KB");
    expect(formatKilobytes(3_603_318, "en-US")).toBe("3,603.3 KB");
  });

  it("groups and separates the figure for the Locale", () => {
    expect(formatKilobytes(1500, "id-ID")).toBe("1,5 KB");
    expect(formatKilobytes(1_500_000, "id-ID")).toBe("1.500 KB");
  });

  it("never prints a negative or an unknown size", () => {
    expect(formatKilobytes(-5, "en-US")).toBe("0 KB");
    expect(formatKilobytes(Number.NaN, "en-US")).toBe("0 KB");
    expect(formatKilobytes(Number.POSITIVE_INFINITY, "en-US")).toBe("0 KB");
  });
});
