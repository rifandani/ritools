import { beforeEach, describe, expect, it, vi } from "vitest";

const toast = vi.hoisted(() => ({ success: vi.fn() }));
vi.mock("sonner", () => ({ toast }));

const { copyText } = await import("@/features/expose/components/expose-copy");

const clipboard = { writeText: vi.fn() };

beforeEach(() => {
  toast.success.mockReset();
  clipboard.writeText.mockReset();
  vi.stubGlobal("navigator", { clipboard });
});

describe("copyText", () => {
  it("copies the value and announces it", async () => {
    copyText("40.736435, -73.993160", "Coordinates copied");

    await vi.waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith("Coordinates copied");
    });
    expect(clipboard.writeText).toHaveBeenCalledWith("40.736435, -73.993160");
  });

  it("stays silent when the clipboard refuses", async () => {
    clipboard.writeText.mockRejectedValue(new Error("denied"));

    copyText("40.736435, -73.993160", "Coordinates copied");

    await vi.waitFor(() => {
      expect(clipboard.writeText).toHaveBeenCalled();
    });
    await Promise.resolve();
    expect(toast.success).not.toHaveBeenCalled();
  });
});
