/* oxlint-disable anti-slop/no-unknown-parameters, anti-slop/no-unknown-returns, anti-slop/no-runtime-typeof, anti-slop/no-reflect-get, anti-slop/no-object-parameters -- An Agent Action takes and returns JSON values; the tests read them as an agent does. */
import { describe, expect, it } from "vitest";

import type {
  OutputFormat,
  QraftSettings,
  SheetOptions,
} from "@/features/qraft/qraft";
import {
  DEFAULT_SETTINGS,
  DEFAULT_SHEET_OPTIONS,
  parseBatchText,
  selectPreset,
  selectSymbology,
  setOutput,
  setPayload,
  setPresetField,
  setStyle,
} from "@/features/qraft/qraft";
import {
  MAX_SVG_BYTES,
  problemOf,
  QRAFT_AGENT_ACTIONS,
  styleFieldsOf,
} from "@/features/qraft/qraft.agent";
import type {
  QraftAgentController,
  QraftTab,
} from "@/features/qraft/qraft.agent";

interface Fake {
  calls: string[];
  controller: () => QraftAgentController;
  state: {
    batchProblem: QraftAgentController["batchProblem"];
    batchText: string;
    settings: QraftSettings;
    sheet: SheetOptions;
    tab: QraftTab;
  };
}

/**
 * A controller that makes the same transitions as `useQraft`, from the pure
 * functions in `qraft.ts`, and records each call.
 */
const fakeOf = (
  options: {
    readonly settings?: QraftSettings;
    readonly svg?: string;
    readonly saves?: boolean;
    readonly batchProblem?: QraftAgentController["batchProblem"];
    readonly batchBusy?: boolean;
  } = {}
): Fake => {
  const calls: string[] = [];
  const state: Fake["state"] = {
    batchProblem: null,
    batchText: "",
    settings: options.settings ?? DEFAULT_SETTINGS,
    sheet: DEFAULT_SHEET_OPTIONS,
    tab: "single",
  };
  const batchDownload = (kind: string) => (format: OutputFormat) => {
    calls.push(`${kind}:${format}`);
    state.batchProblem = options.batchProblem ?? null;
    return Promise.resolve();
  };
  const controller = (): QraftAgentController => ({
    batchBusy: options.batchBusy ?? false,
    batchProblem: state.batchProblem,
    changeBatchText: (text) => {
      calls.push("batch");
      state.batchText = text;
    },
    changeField: (name, value) => {
      calls.push(`field:${name}`);
      state.settings = setPresetField(state.settings, name, value);
    },
    changeOutput: (output) => {
      calls.push(`output:${output}`);
      state.settings = setOutput(state.settings, output);
    },
    changeRaw: (payload) => {
      calls.push("payload");
      state.settings = setPayload(state.settings, payload);
    },
    changeStyle: (patch) => {
      calls.push(`style:${Object.keys(patch).join(",")}`);
      state.settings = setStyle(state.settings, patch);
    },
    choosePreset: (preset) => {
      calls.push(`preset:${preset}`);
      state.settings = selectPreset(state.settings, preset);
    },
    chooseSymbology: (symbology) => {
      calls.push(`symbology:${symbology}`);
      state.settings = selectSymbology(state.settings, symbology);
    },
    downloadSheet: batchDownload("sheet"),
    downloadZip: batchDownload("zip"),
    entries: parseBatchText(state.batchText),
    removeLogo: () => {
      calls.push("removeLogo");
      state.settings = setStyle(state.settings, { logo: null });
    },
    renderSvg: () => {
      calls.push("render");
      return Promise.resolve(options.svg ?? "<svg>code</svg>");
    },
    save: (format) => {
      calls.push(`save:${format}`);
      return Promise.resolve(options.saves ?? true);
    },
    setSheet: (sheet) => {
      calls.push("sheet");
      state.sheet = sheet;
    },
    settings: state.settings,
    sheet: state.sheet,
    showTab: (tab) => {
      state.tab = tab;
    },
    tab: state.tab,
  });
  return { calls, controller, state };
};

/** One field of a result, read without a type assertion. */
const fieldOf = (result: unknown, ...path: readonly string[]): unknown =>
  path.reduce<unknown>(
    (value, key) =>
      typeof value === "object" && value !== null
        ? Reflect.get(value, key)
        : undefined,
    result
  );

const call = (fake: Fake, name: string, args: object = {}) => {
  const action = QRAFT_AGENT_ACTIONS.find((entry) => entry.name === name);
  if (action === undefined) {
    throw new Error(`no action ${name}`);
  }
  return action.execute(
    { controller: fake.controller, settled: () => Promise.resolve() },
    args,
    new AbortController().signal
  );
};

const withLogo = setStyle(DEFAULT_SETTINGS, {
  logo: { dataUri: "data:image/png;base64,AAAA", name: "brand.png" },
});

describe("Qraft Agent Actions", () => {
  it("offers the Qraft actions with snake_case names", () => {
    expect(QRAFT_AGENT_ACTIONS.map((action) => action.name)).toEqual([
      "qraft_get_state",
      "qraft_set_code",
      "qraft_set_style",
      "qraft_render",
      "qraft_download",
      "qraft_set_batch",
      "qraft_set_sheet",
      "qraft_download_batch",
      "qraft_remove_logo",
    ]);
    const hints = Object.fromEntries(
      QRAFT_AGENT_ACTIONS.map((action) => [action.name, action.annotations])
    );
    expect(hints.qraft_get_state).toEqual({
      readOnlyHint: true,
      untrustedContentHint: true,
    });
    expect(hints.qraft_render).toEqual({
      readOnlyHint: true,
      untrustedContentHint: true,
    });
    expect(hints.qraft_set_sheet).toBeUndefined();
  });
});

describe("qraft_get_state", () => {
  it("reads the code, the applicable style, the Batch, and the tab", async () => {
    const state = await call(fakeOf(), "qraft_get_state");
    expect(state).toMatchObject({
      batch: { count: 0, sheet: DEFAULT_SHEET_OPTIONS, slow: false },
      code: {
        family: "qr",
        payload: "https://ritools.com",
        preset: "text",
        presetFields: [{ kind: "textarea", name: "text" }],
        problem: null,
        symbology: "qr",
        warnings: [],
      },
      ok: true,
      style: { logo: null, output: "svg" },
      tab: "single",
    });
    const styleFields = fieldOf(state, "style", "styleFields");
    const style = fieldOf(state, "style", "style");
    expect(styleFields).toContain("dotType");
    expect(styleFields).not.toContain("height");
    expect(Object.keys(style ?? {})).toEqual(styleFields);
  });

  it("gives the logo by name only, never its pixels", async () => {
    const text = JSON.stringify(
      await call(fakeOf({ settings: withLogo }), "qraft_get_state")
    );
    expect(text).toContain('"logo":{"name":"brand.png"}');
    expect(text).not.toContain("data:image");
  });

  it("gives the problem and the Scan Warnings in the page's words", async () => {
    const settings = setStyle(setPayload(DEFAULT_SETTINGS, ""), {
      fg: "#eeeeee",
      quietZone: 1,
    });
    const state = await call(fakeOf({ settings }), "qraft_get_state");
    expect(state).toMatchObject({
      code: {
        problem: "Type a Payload first.",
        warnings: [
          {
            id: "low-contrast",
            message: "The contrast is 1.2:1. Below 3:1, some scanners fail.",
          },
          {
            id: "quiet-zone",
            message: "The Quiet Zone is 1 modules. Use 4 or more for print.",
          },
        ],
      },
    });
  });
});

describe("problemOf", () => {
  it("prefers the preset form problem when the form is not complete", () => {
    expect(problemOf(selectPreset(DEFAULT_SETTINGS, "email"))).toBe(
      "Fill the required fields."
    );
    expect(problemOf(DEFAULT_SETTINGS)).toBeNull();
  });
});

describe("styleFieldsOf", () => {
  it("follows the Style panel's controls for each family", () => {
    expect(styleFieldsOf("ean13")).toEqual(
      expect.arrayContaining(["height", "text", "rotation", "fg", "size"])
    );
    expect(styleFieldsOf("ean13")).not.toContain("dotType");
    expect(styleFieldsOf("datamatrix")).toEqual(
      expect.arrayContaining(["quietZone", "datamatrixShape"])
    );
    expect(styleFieldsOf("postnet")).toEqual(
      expect.arrayContaining(["height", "text"])
    );
    expect(styleFieldsOf("postnet")).not.toContain("quietZone");
  });
});

describe("qraft_set_code", () => {
  it("sets a Payload Preset and its fields, which makes a QR", async () => {
    const fake = fakeOf({
      settings: selectSymbology(DEFAULT_SETTINGS, "ean13"),
    });
    const result = await call(fake, "qraft_set_code", {
      fields: { encryption: "WPA", password: "secret", ssid: "Guest" },
      preset: "wifi",
    });
    expect(result).toMatchObject({
      ok: true,
      preset: "wifi",
      problem: null,
      symbology: "qr",
    });
    expect(String(fieldOf(result, "payload"))).toContain("S:Guest");
    expect(fake.state.settings.payload).toBe(fieldOf(result, "payload"));
    expect(fake.calls).toEqual([
      "preset:wifi",
      "field:encryption",
      "field:password",
      "field:ssid",
    ]);
  });

  it("sets any Symbology and a raw Payload", async () => {
    const fake = fakeOf();
    fake.state.tab = "batch";
    const result = await call(fake, "qraft_set_code", {
      payload: "5901234123457",
      symbology: "ean13",
    });
    expect(result).toMatchObject({
      family: "1d",
      ok: true,
      payload: "5901234123457",
      problem: null,
      symbology: "ean13",
    });
    expect(fake.state.tab).toBe("single");
    expect(fake.calls).toEqual(["symbology:ean13", "payload"]);
  });

  it("reports a Payload the Symbology cannot encode", async () => {
    const result = await call(fakeOf(), "qraft_set_code", {
      payload: "letters",
      symbology: "ean13",
    });
    expect(result).toMatchObject({
      ok: true,
      problem:
        "This Symbology cannot encode the Payload. Check its input hint.",
    });
  });

  it("refuses a preset with a non-QR Symbology, and changes nothing", async () => {
    const fake = fakeOf();
    expect(
      await call(fake, "qraft_set_code", { preset: "wifi", symbology: "ean13" })
    ).toMatchObject({ code: "not-applicable", ok: false });
    expect(fake.calls).toEqual([]);
  });

  it("refuses a field the preset does not have, and lists the fields", async () => {
    const fake = fakeOf();
    const result = await call(fake, "qraft_set_code", {
      fields: { ssid: "x" },
    });
    expect(result).toMatchObject({
      code: "not-applicable",
      hint: "Send only these fields: text.",
    });
    expect(fake.calls).toEqual([]);
  });

  it("refuses a select value or a checkbox value that the form has not", async () => {
    expect(
      await call(fakeOf(), "qraft_set_code", {
        fields: { encryption: "WPA9" },
        preset: "wifi",
      })
    ).toMatchObject({
      code: "invalid-input",
      message: "The field encryption takes one of: WPA, WEP, nopass.",
    });
    expect(
      await call(fakeOf(), "qraft_set_code", {
        fields: { hidden: "yes" },
        preset: "wifi",
      })
    ).toMatchObject({ code: "invalid-input" });
  });

  it("refuses a Symbology that does not exist", async () => {
    expect(
      await call(fakeOf(), "qraft_set_code", { symbology: "jabcode" })
    ).toMatchObject({ code: "invalid-input" });
  });
});

describe("qraft_set_style", () => {
  it("changes the fields it gets and the output", async () => {
    const fake = fakeOf();
    const result = await call(fake, "qraft_set_style", {
      dotType: "dots",
      fg: "#c8102e",
      output: "png",
    });
    expect(result).toMatchObject({
      ok: true,
      output: "png",
      style: { dotType: "dots", fg: "#c8102e" },
    });
    expect(fake.calls).toEqual(["style:fg,dotType", "output:png"]);
    expect(fake.state.settings.style.dotType).toBe("dots");
  });

  it("refuses a field that does not apply, lists the fields that do, and changes nothing", async () => {
    const fake = fakeOf({
      settings: selectSymbology(DEFAULT_SETTINGS, "ean13"),
    });
    const result = await call(fake, "qraft_set_style", {
      dotType: "dots",
      height: 60,
    });
    expect(result).toMatchObject({
      code: "not-applicable",
      message: "dotType does not apply to ean13.",
      ok: false,
    });
    expect(String(fieldOf(result, "hint"))).toContain("height");
    expect(String(fieldOf(result, "hint"))).not.toContain("dotType");
    expect(fake.calls).toEqual([]);
    expect(
      await call(fake, "qraft_set_style", { cornerInner: "dots", mask: 1 })
    ).toMatchObject({ message: "cornerInner, mask do not apply to ean13." });
  });

  it("refuses an Error Correction level the Symbology does not have", async () => {
    const fake = fakeOf({
      settings: selectSymbology(DEFAULT_SETTINGS, "rmqr"),
    });
    expect(await call(fake, "qraft_set_style", { ecLevel: "L" })).toMatchObject(
      {
        code: "invalid-settings",
        message: "rmqr takes the Error Correction levels M, H.",
      }
    );
  });

  it("refuses a value out of range and a color that is not hex", async () => {
    expect(
      await call(fakeOf(), "qraft_set_style", { quietZone: 40 })
    ).toMatchObject({ code: "invalid-input" });
    expect(
      await call(fakeOf(), "qraft_set_style", { fg: "red" })
    ).toMatchObject({ code: "invalid-input" });
    expect(
      await call(fakeOf(), "qraft_set_style", { logo: null })
    ).toMatchObject({ code: "invalid-input" });
  });

  it("changes only the output when no style field comes", async () => {
    const fake = fakeOf();
    await call(fake, "qraft_set_style", { output: "png" });
    expect(fake.calls).toEqual(["output:png"]);
  });
});

describe("qraft_render", () => {
  it("returns the SVG text with the Scan Warnings", async () => {
    const fake = fakeOf();
    expect(await call(fake, "qraft_render")).toEqual({
      ok: true,
      payload: "https://ritools.com",
      svg: "<svg>code</svg>",
      svgBytes: 15,
      svgLeftOut: null,
      warnings: [],
    });
  });

  it("leaves the SVG out when a logo is present, and renders nothing", async () => {
    const fake = fakeOf({ settings: withLogo });
    expect(await call(fake, "qraft_render")).toMatchObject({
      svg: null,
      svgBytes: null,
      svgLeftOut: "logo",
    });
    expect(fake.calls).toEqual([]);
  });

  it("leaves the SVG out when it is over 64 KB", async () => {
    const svg = `<svg>${"x".repeat(MAX_SVG_BYTES)}</svg>`;
    expect(await call(fakeOf({ svg }), "qraft_render")).toMatchObject({
      svg: null,
      svgBytes: MAX_SVG_BYTES + 11,
      svgLeftOut: "too-large",
    });
    const fits = `<svg>${"x".repeat(MAX_SVG_BYTES - 11)}</svg>`;
    expect(await call(fakeOf({ svg: fits }), "qraft_render")).toMatchObject({
      svg: fits,
      svgLeftOut: null,
    });
  });

  it("returns invalid-settings when the Payload does not encode", async () => {
    expect(
      await call(
        fakeOf({ settings: setPayload(DEFAULT_SETTINGS, "") }),
        "qraft_render"
      )
    ).toMatchObject({
      code: "invalid-settings",
      message: "Type a Payload first.",
    });
  });
});

describe("qraft_download", () => {
  it("starts the page's download and names the file", async () => {
    const fake = fakeOf();
    fake.state.tab = "batch";
    expect(await call(fake, "qraft_download", { format: "png" })).toEqual({
      fileName: "qraft-https-ritools-com.png",
      ok: true,
    });
    expect(fake.calls).toEqual(["save:png"]);
    expect(fake.state.tab).toBe("single");
  });

  it("says when the code is not valid or the download fails", async () => {
    expect(
      await call(
        fakeOf({ settings: setPayload(DEFAULT_SETTINGS, "") }),
        "qraft_download",
        { format: "svg" }
      )
    ).toMatchObject({ code: "invalid-settings" });
    expect(
      await call(fakeOf({ saves: false }), "qraft_download", { format: "svg" })
    ).toMatchObject({ code: "render-failed" });
    expect(
      await call(fakeOf(), "qraft_download", { format: "pdf" })
    ).toMatchObject({ code: "invalid-input" });
  });
});

describe("qraft_set_batch", () => {
  it("reads CSV text with labels, pages the entries, and shows the Batch tab", async () => {
    const fake = fakeOf();
    const result = await call(fake, "qraft_set_batch", {
      limit: 1,
      offset: 1,
      text: "payload,label\nhttps://a.example,A\nhttps://b.example,B",
    });
    expect(result).toMatchObject({
      count: 2,
      entries: {
        limit: 1,
        offset: 1,
        rows: [{ index: 1, label: "B", payload: "https://b.example" }],
        total: 2,
      },
      ok: true,
      slow: false,
    });
    expect(fake.state.tab).toBe("batch");
  });

  it("reads line text and warns over 500 codes", async () => {
    const text = Array.from(
      { length: 501 },
      (_, index) => `code-${index}`
    ).join("\n");
    const result = await call(fakeOf(), "qraft_set_batch", { text });
    expect(result).toMatchObject({ count: 501, slow: true });
    expect(fieldOf(result, "entries", "rows", "0")).toEqual({
      index: 0,
      label: "",
      payload: "code-0",
    });
  });
});

describe("qraft_set_sheet", () => {
  it("changes only the fields it gets", async () => {
    const fake = fakeOf();
    expect(
      await call(fake, "qraft_set_sheet", { captions: false, columns: 3 })
    ).toEqual({
      ok: true,
      sheet: { ...DEFAULT_SHEET_OPTIONS, captions: false, columns: 3 },
    });
    expect(fake.state.tab).toBe("batch");
    expect(await call(fake, "qraft_set_sheet", { columns: 13 })).toMatchObject({
      code: "invalid-input",
    });
  });
});

const withBatch = (fake: Fake) => {
  fake.state.batchText = "one\ntwo";
  return fake;
};

describe("qraft_download_batch", () => {
  it("downloads the Label Sheet or the ZIP", async () => {
    const fake = withBatch(fakeOf());
    expect(
      await call(fake, "qraft_download_batch", { format: "svg", kind: "sheet" })
    ).toEqual({ count: 2, kind: "sheet", ok: true });
    expect(
      await call(fake, "qraft_download_batch", { format: "png", kind: "zip" })
    ).toEqual({ count: 2, kind: "zip", ok: true });
    expect(fake.calls).toEqual(["sheet:svg", "zip:png"]);
  });

  it("returns empty-batch, busy, and the page's failure", async () => {
    expect(
      await call(fakeOf(), "qraft_download_batch", {
        format: "svg",
        kind: "sheet",
      })
    ).toMatchObject({
      code: "empty-batch",
      message: "Add at least one Payload.",
    });
    expect(
      await call(
        withBatch(fakeOf({ batchBusy: true })),
        "qraft_download_batch",
        {
          format: "svg",
          kind: "sheet",
        }
      )
    ).toMatchObject({ code: "busy" });
    expect(
      await call(
        withBatch(fakeOf({ batchProblem: "build" })),
        "qraft_download_batch",
        { format: "svg", kind: "sheet" }
      )
    ).toMatchObject({
      code: "build-failed",
      message: "The Batch could not be written. Check each Payload.",
    });
    expect(
      await call(
        withBatch(fakeOf({ batchProblem: "zip" })),
        "qraft_download_batch",
        { format: "png", kind: "zip" }
      )
    ).toMatchObject({ code: "zip-failed" });
  });
});

describe("qraft_remove_logo", () => {
  it("removes the logo when one is there", async () => {
    const fake = fakeOf({ settings: withLogo });
    expect(await call(fake, "qraft_remove_logo")).toEqual({
      ok: true,
      removed: true,
    });
    expect(fake.state.settings.style.logo).toBeNull();
    const none = fakeOf();
    expect(await call(none, "qraft_remove_logo")).toEqual({
      ok: true,
      removed: false,
    });
    expect(none.calls).toEqual([]);
  });
});
