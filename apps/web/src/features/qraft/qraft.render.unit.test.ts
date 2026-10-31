/* oxlint-disable anti-slop/no-shape-in-symbol-names -- The style field is the library's term. */
import { describe, expect, it } from "vitest";

import {
  DEFAULT_SETTINGS,
  parseBatchText,
  renderBatchFiles,
  renderPng,
  renderSheetPng,
  renderSheetSvg,
  renderSvg,
  renderTerminal,
  renderQrSvg,
  setPresetField,
  selectPreset,
  setStyle,
  svgDataUri,
} from "./qraft";
import type { BatchEntry, QraftSettings, SymbologyId } from "./qraft";

const LABELS = {
  desc: "A static QR code. The image holds its Payload.",
  title: "QR code",
};

const settingsOf = (
  symbology: SymbologyId,
  payload: string,
  patch: Partial<QraftSettings["style"]> = {}
): QraftSettings => ({
  ...DEFAULT_SETTINGS,
  payload,
  style: { ...DEFAULT_SETTINGS.style, ...patch },
  symbology,
});

const dimensionsOf = (png: Uint8Array) => {
  const view = new DataView(png.buffer, png.byteOffset, png.byteLength);
  return {
    height: view.getUint32(20),
    signature: [...png.subarray(0, 8)],
    width: view.getUint32(16),
  };
};

describe("the QR SVG", () => {
  it("renders on the first screen with a viewBox, a size, and an accessible name", () => {
    const svg = renderQrSvg(DEFAULT_SETTINGS, LABELS);
    expect(svg).toContain('viewBox="0 0 320 320"');
    expect(svg).toContain('width="320');
    expect(svg).toContain("<title>QR code</title>");
    expect(svg).toContain("<desc>A static QR code.");
    expect(svg).toContain('role="img"');
  });

  it("never prints the Payload in the accessible name", () => {
    const settings = {
      ...DEFAULT_SETTINGS,
      payload: "WIFI:T:WPA;S:Home;P:secret;;",
    };
    const svg = renderQrSvg(settings, LABELS);
    expect(svg).not.toContain("secret");
    expect(svg).not.toContain("WIFI:");
    expect(svg).toContain("<title>QR code</title>");
  });

  it("carries the chosen unit, dot type, corner shape, and gradient", () => {
    const mm = renderQrSvg(setStyle(DEFAULT_SETTINGS, { unit: "mm" }), LABELS);
    expect(mm).toContain('width="320mm"');
    expect(mm).toContain('height="320mm"');

    const styled = renderQrSvg(
      setStyle(DEFAULT_SETTINGS, {
        cornerOuter: "extra-rounded",
        dotType: "dots",
        gradient: "linear",
      }),
      LABELS
    );
    expect(styled).not.toBe(renderQrSvg(DEFAULT_SETTINGS, LABELS));
    expect(styled).toContain("linearGradient");
  });

  it("keeps the aspect ratio of a rectangular code in a print unit", () => {
    const rectangular = renderQrSvg(
      settingsOf("rmqr", "Hello", { ecLevel: "M", unit: "mm" }),
      LABELS
    );
    const width = rectangular.match(/width="(?<width>[\d.]+)mm"/u)?.groups
      ?.width;
    const height = rectangular.match(/height="(?<height>[\d.]+)mm"/u)?.groups
      ?.height;
    expect(Number(width)).toBe(320);
    expect(Number(height)).toBeLessThan(320);
  });

  it("adds a logo and raises the Error Correction to H", () => {
    const svg = renderQrSvg(
      setStyle(DEFAULT_SETTINGS, {
        logo: { dataUri: "data:image/png;base64,AA==", name: "logo.png" },
        logoSize: 20,
      }),
      LABELS
    );
    expect(svg).toContain("data:image/png;base64,AA==");
    expect(svg).toContain("<image");
  });

  it("renders Micro QR and rMQR", () => {
    const micro = renderQrSvg(settingsOf("microqr", "12345"), LABELS);
    expect(micro).toContain("<svg");
    expect(micro).toContain("<title>QR code</title>");
    const rectangular = renderQrSvg(
      settingsOf("rmqr", "Hello", { ecLevel: "M" }),
      LABELS
    );
    expect(rectangular).toContain("<svg");
  });

  it("rejects a Payload past the capacity", async () => {
    await expect(
      renderSvg(settingsOf("qr", "x".repeat(5000)), LABELS)
    ).rejects.toThrow();
  });
});

describe("the 2D and linear SVG", () => {
  const samples: readonly [SymbologyId, string][] = [
    ["datamatrix", "Hello"],
    ["gs1-datamatrix", "(01)12345678901231"],
    ["pdf417", "Hello world"],
    ["micropdf417", "Hello"],
    ["aztec", "Hello world"],
    ["maxicode", "Hello"],
    ["dotcode", "Hello"],
    ["hanxin", "Hello"],
    ["codablock-f", "Hello world"],
    ["code16k", "Hello world"],
    ["code128", "Hello world"],
    ["ean13", "4006381333931"],
    ["upca", "036000291452"],
    ["itf14", "00012345678905"],
    ["postnet", "12345"],
    ["rm4scc", "SN34RD1A"],
    ["imb", "01234567094987654321"],
  ];

  for (const [symbology, payload] of samples) {
    it(`writes ${symbology}`, async () => {
      const svg = await renderSvg(settingsOf(symbology, payload), LABELS);
      expect(svg.startsWith("<svg")).toBe(true);
      expect(svg).toContain("<title>QR code</title>");
    });
  }

  it("writes a rectangular 2D code without stretching it", async () => {
    const svg = await renderSvg(
      settingsOf("datamatrix", "Hello", {
        datamatrixShape: "rectangle",
        unit: "mm",
      }),
      LABELS
    );
    const width = svg.match(/width="(?<width>[\d.]+)mm"/u)?.groups?.width;
    const height = svg.match(/height="(?<height>[\d.]+)mm"/u)?.groups?.height;
    expect(Number(width)).toBe(320);
    expect(Number(height)).not.toBe(320);
  });

  it("writes the linear options the label needs", async () => {
    const svg = await renderSvg(
      settingsOf("code128", "Hello", {
        bg: "#ffffff",
        fg: "#000000",
        height: 60,
        showText: true,
      }),
      LABELS
    );
    expect(svg).toContain('height="');
    expect(svg).toContain("<text");
    const custom = await renderSvg(
      settingsOf("code128", "Hello", {
        showText: true,
        text: "CUSTOM LABEL",
      }),
      LABELS
    );
    expect(custom).toContain("CUSTOM LABEL");
  });

  it("rejects input a linear Symbology cannot hold", async () => {
    await expect(
      renderSvg(settingsOf("ean13", "ABC"), LABELS)
    ).rejects.toThrow();
  });
});

describe("PNG output", () => {
  it("writes the QR at the exact pixel size", async () => {
    const png = await renderPng(settingsOf("qr", "https://ritools.com"), 256);
    expect(dimensionsOf(png)).toEqual({
      height: 256,
      signature: [137, 80, 78, 71, 13, 10, 26, 10],
      width: 256,
    });
  });

  it("writes the chosen size for a matrix and a linear code", async () => {
    const matrix = await renderPng(settingsOf("datamatrix", "Hello"), 300);
    expect(dimensionsOf(matrix).width).toBe(300);
    expect(dimensionsOf(matrix).height).toBe(300);

    const linear = await renderPng(
      settingsOf("code128", "Hello", { moduleSize: 2, height: 60 }),
      400
    );
    expect(dimensionsOf(linear).width).toBe(400);
    expect(dimensionsOf(linear).height).toBe(400);
  });

  it("writes the 2D options the Symbology accepts", async () => {
    const aztec = await renderSvg(
      settingsOf("aztec", "Hello", { aztecEcPercent: 60 }),
      LABELS
    );
    expect(aztec).toContain("<svg");
    const hanxin = await renderSvg(
      settingsOf("hanxin", "Hello", {
        hanxinEcLevel: 4,
        hanxinVersion: 10,
      }),
      LABELS
    );
    expect(hanxin).toContain("<svg");
    const dotcode = await renderSvg(
      settingsOf("dotcode", "Hello", {
        dotcodeColumns: 21,
        dotcodeMask: 1,
        dotcodeRows: 20,
      }),
      LABELS
    );
    expect(dotcode).toContain("<svg");
  });

  it("writes every Symbology as a small PNG", async () => {
    const samples: readonly [SymbologyId, string][] = [
      ["microqr", "12345"],
      ["rmqr", "Hello"],
      ["datamatrix", "Hello"],
      ["gs1-datamatrix", "(01)12345678901231"],
      ["pdf417", "Hello"],
      ["micropdf417", "Hello"],
      ["aztec", "Hello"],
      ["maxicode", "Hello"],
      ["dotcode", "Hello"],
      ["hanxin", "Hello"],
      ["codablock-f", "Hello"],
      ["code16k", "Hello"],
      ["code128", "Hello"],
      ["ean13", "4006381333931"],
      ["upca", "036000291452"],
      ["itf14", "00012345678905"],
      ["postnet", "12345"],
      ["planet", "12345678901"],
      ["rm4scc", "SN34RD1A"],
      ["kix", "1234AB"],
      ["auspost", "12345678"],
      ["jppost", "1234567"],
      ["imb", "01234567094987654321"],
    ];
    const pngs = await Promise.all(
      samples.map(([symbology, payload]) =>
        renderPng(settingsOf(symbology, payload), 32)
      )
    );
    for (const png of pngs) {
      expect(dimensionsOf(png)).toEqual({
        height: 32,
        signature: [137, 80, 78, 71, 13, 10, 26, 10],
        width: 32,
      });
    }
  });

  it("writes the type-specific PNG options", async () => {
    const codes: readonly [
      SymbologyId,
      string,
      Partial<QraftSettings["style"]>,
    ][] = [
      ["codabar", "A1234B", { codabarStart: "A", codabarStop: "B" }],
      ["code39", "HELLO", { code39CheckDigit: true }],
      ["msi", "123456", { msiCheckDigit: "mod11" }],
      ["industrial2of5", "1234", { code25CheckDigit: "add" }],
      ["industrial2of5", "12348", { code25CheckDigit: "verify" }],
      [
        "dotcode",
        "Hello",
        { dotcodeColumns: 21, dotcodeMask: 1, dotcodeRows: 20 },
      ],
      ["hanxin", "Hello", { hanxinEcLevel: 4, hanxinVersion: 10 }],
      ["maxicode", "Hello", { maxicodeCountry: "abc", maxicodeMode: 4 }],
      ["qr", "Hello", { mask: 3, version: 2 }],
      ["microqr", "12345", { ecLevel: "H", version: 1 }],
      ["rmqr", "Hello", { ecLevel: "H", version: 1 }],
    ];
    const pngs = await Promise.all(
      codes.map(([symbology, payload, style]) =>
        renderPng(settingsOf(symbology, payload, style), 64)
      )
    );
    for (const png of pngs) {
      expect(dimensionsOf(png).width).toBe(64);
    }
  });

  it("writes a postal code and a logo code", async () => {
    const postal = await renderPng(settingsOf("rm4scc", "SN34RD1A"), 320);
    expect(dimensionsOf(postal).width).toBe(320);

    const logo = await renderPng(
      settingsOf("qr", "Hello", {
        logo: { dataUri: "data:image/png;base64,AA==", name: "logo.png" },
        logoSize: 20,
      }),
      200
    );
    expect(dimensionsOf(logo).width).toBe(200);
  });
});

describe("the terminal output", () => {
  it("prints a QR code for a terminal", () => {
    const output = renderTerminal("https://ritools.com");
    expect(output).toContain("█");
    expect(output.split("\n").length).toBeGreaterThan(5);
  });
});

describe("the preview data URI", () => {
  it("is an encoded SVG, not raw markup", () => {
    const uri = svgDataUri("<svg><title>QR</title></svg>");
    expect(uri.startsWith("data:image/svg+xml;charset=utf-8,")).toBe(true);
    expect(uri).not.toContain("<svg>");
  });
});

describe("the Label Sheet", () => {
  const entries: BatchEntry[] = [
    { label: "First", payload: "https://one.test" },
    { label: "Second", payload: "https://two.test" },
    { label: "Third", payload: "https://three.test" },
  ];

  it("writes a QR sheet with columns, labels, and an accessible name", async () => {
    const svg = await renderSheetSvg(
      DEFAULT_SETTINGS,
      entries,
      { captions: true, columns: 2, gap: 10, padding: 12 },
      LABELS
    );
    expect(svg).toContain("<svg");
    expect(svg).toContain("First");
    expect(svg).toContain("Third");
    expect(svg).toContain('aria-label="QR code"');
  });

  it("writes a linear sheet with the library layout", async () => {
    const svg = await renderSheetSvg(
      settingsOf("code128", "x"),
      entries,
      { captions: false, columns: 2, gap: 8, padding: 8 },
      LABELS
    );
    expect(svg).toContain("<svg");
  });

  it("writes a PNG sheet at the exact grid size", async () => {
    const png = await renderSheetPng(
      DEFAULT_SETTINGS,
      entries,
      { captions: true, columns: 2, gap: 10, padding: 12 },
      120
    );
    const width = 12 * 2 + 2 * 120 + 10;
    const height = 12 * 2 + 2 * (120 + 18) + 10;
    expect(dimensionsOf(png)).toEqual({
      height,
      signature: [137, 80, 78, 71, 13, 10, 26, 10],
      width,
    });
  });

  it("writes one named file per Batch member", async () => {
    const files = await renderBatchFiles(
      DEFAULT_SETTINGS,
      entries,
      "svg",
      LABELS
    );
    expect(files.map((file) => file.name)).toEqual([
      "qraft-001-first.svg",
      "qraft-002-second.svg",
      "qraft-003-third.svg",
    ]);
    expect(files.every((file) => file.data instanceof Uint8Array)).toBe(false);
  });

  it("draws an unknown caption glyph and a fallback colour", async () => {
    const png = await renderSheetPng(
      settingsOf("qr", "Hello", { bg: "not-a-colour", fg: "not-a-colour" }),
      [{ label: "Café ☃", payload: "https://a.test" }],
      { captions: true, columns: 1, gap: 8, padding: 8 },
      80
    );
    expect(dimensionsOf(png).width).toBeGreaterThan(0);
  });

  it("writes one PNG file per Batch member", async () => {
    const files = await renderBatchFiles(
      DEFAULT_SETTINGS,
      [{ label: "", payload: "https://a.test" }],
      "png",
      LABELS
    );
    expect(files[0]?.name).toBe("qraft-001.png");
    expect(files[0]?.data).toBeInstanceOf(Uint8Array);
  });

  it("writes a PNG sheet without captions when they are off", async () => {
    const png = await renderSheetPng(
      DEFAULT_SETTINGS,
      entries,
      { captions: false, columns: 2, gap: 10, padding: 12 },
      120
    );
    expect(dimensionsOf(png).width).toBe(274);
    expect(dimensionsOf(png).height).toBe(274);
  });

  it("never prints a Payload as a caption", async () => {
    const svg = await renderSheetSvg(
      DEFAULT_SETTINGS,
      [{ label: "", payload: "WIFI:T:WPA;S:Home;P:secret;;" }],
      { captions: true, columns: 1, gap: 8, padding: 8 },
      LABELS
    );
    expect(svg).not.toContain("secret");
    expect(svg).not.toContain("WIFI:");
  });

  it("prints a label the user typed", async () => {
    const svg = await renderSheetSvg(
      DEFAULT_SETTINGS,
      [{ label: "Cafe Guest", payload: "https://cafe.test" }],
      { captions: true, columns: 1, gap: 8, padding: 8 },
      LABELS
    );
    expect(svg).toContain("Cafe Guest");
  });

  it("writes a QR sheet without captions when they are off", async () => {
    const svg = await renderSheetSvg(
      DEFAULT_SETTINGS,
      entries,
      { captions: false, columns: 2, gap: 8, padding: 8 },
      LABELS
    );
    expect(svg).not.toContain("First");
  });

  it("writes a 1D sheet with and without captions", async () => {
    const without = await renderSheetSvg(
      settingsOf("code128", "x"),
      entries,
      { captions: false, columns: 2, gap: 8, padding: 8 },
      LABELS
    );
    expect(without).toContain("<svg");
    const withCaptions = await renderSheetSvg(
      settingsOf("code128", "x"),
      entries,
      { captions: true, columns: 2, gap: 8, padding: 8 },
      LABELS
    );
    expect(withCaptions).toContain("First");
  });

  it("writes a generic 2D sheet without captions", async () => {
    const svg = await renderSheetSvg(
      settingsOf("datamatrix", "x"),
      entries,
      { captions: false, columns: 3, gap: 8, padding: 8 },
      LABELS
    );
    expect(svg).not.toContain("First");
  });

  it("writes a generic 2D sheet", async () => {
    const svg = await renderSheetSvg(
      settingsOf("datamatrix", "x"),
      entries,
      { captions: true, columns: 3, gap: 8, padding: 8 },
      LABELS
    );
    expect(svg).toContain("First");
    expect(svg.match(/<svg /gu)?.length).toBeGreaterThan(3);
  });
});

describe("a preset payload", () => {
  it("renders the Wi-Fi payload the form built", async () => {
    const next = setPresetField(
      setPresetField(selectPreset(DEFAULT_SETTINGS, "wifi"), "ssid", "Cafe"),
      "password",
      "secret"
    );
    expect(next.payload).toBe("WIFI:T:WPA;S:Cafe;P:secret;;");
    const svg = await renderSvg(next, {
      desc: "A static Wi-Fi code.",
      title: "Wi-Fi code",
    });
    expect(svg).toContain("<title>Wi-Fi code</title>");
    expect(svg).not.toContain("secret");
  });
});

describe("parseBatchText", () => {
  it("keeps a CSV label and drops an empty payload", () => {
    expect(
      parseBatchText("payload,label\nhttps://a.test,First\n,None")
    ).toEqual([{ label: "First", payload: "https://a.test" }]);
  });
});
