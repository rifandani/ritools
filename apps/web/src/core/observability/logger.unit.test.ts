import { afterEach, describe, expect, it, vi } from "vitest";

import { reportError } from "@/core/observability/logger";

describe("reportError", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("logs the message at error level, with the error and its info", () => {
    const lines: string[] = [];
    const record = (...args: unknown[]) => {
      lines.push(args.map(String).join(" "));
    };
    // The pretty logger writes to `console.log`, in groups.
    vi.spyOn(console, "log").mockImplementation(record);
    vi.spyOn(console, "error").mockImplementation(record);
    vi.spyOn(console, "group").mockImplementation(() => {});
    vi.spyOn(console, "groupEnd").mockImplementation(() => {});

    reportError("[router.onError]", {
      error: new Error("boom"),
      errorInfo: "route /",
    });

    const output = lines.join("\n");
    expect(output).toContain("ERROR");
    expect(output).toContain("[router.onError]");
    expect(output).toContain("boom");
    expect(output).toContain("route /");
  });
});
