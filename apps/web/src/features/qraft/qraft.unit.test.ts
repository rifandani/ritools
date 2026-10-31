import { BARCODE_TYPES } from "etiket/barcode";
import { describe, expect, it } from "vitest";

import enUS from "@/core/libs/i18n/locales/en-US";
import idID from "@/core/libs/i18n/locales/id-ID";

import {
  ADVANCED_PRESETS,
  BATCH_WARN_AT,
  DEFAULT_SETTINGS,
  DEFAULT_STYLE,
  LINEAR_TYPES,
  POSTAL_TYPES,
  PRESETS,
  PRESET_FIELD_SPECS,
  SYMBOLOGY_IDS,
  batchWarns,
  batchFileNameOf,
  buildPreset,
  clearPayload,
  defaultSymbologyOf,
  ecLevelsOf,
  familyOf,
  fileNameOf,
  hasControl,
  parseBatchCsv,
  parseBatchLines,
  scanWarnings,
  selectFamily,
  selectPreset,
  selectSymbology,
  setPayload,
  setPresetField,
  setStyle,
  slugOf,
  symbologiesOf,
  symbologyOf,
  validatePayload,
  validatePreset,
  validateSettings,
} from "./qraft";
import type { QraftSettings, SymbologyId } from "./qraft";

const text = (value: string) => ({ text: value });

const withPayload = (
  payload: string,
  overrides: Partial<QraftSettings> = {}
): QraftSettings => ({
  ...DEFAULT_SETTINGS,
  fields: text(payload),
  payload,
  ...overrides,
});

const A_LONG_PAYLOAD = "x".repeat(5000);

describe("the default settings", () => {
  it("starts on a QR code that points at the Ritools URL", () => {
    expect(DEFAULT_SETTINGS.symbology).toBe("qr");
    expect(DEFAULT_SETTINGS.preset).toBe("text");
    expect(DEFAULT_SETTINGS.payload).toBe("https://ritools.com");
    expect(DEFAULT_SETTINGS.fields.text).toBe("https://ritools.com");
    expect(DEFAULT_SETTINGS.output).toBe("svg");
  });

  it("starts on a scan-safe square code", () => {
    expect(DEFAULT_STYLE.dotType).toBe("square");
    expect(DEFAULT_STYLE.quietZone).toBe(4);
    expect(DEFAULT_STYLE.gradient).toBe("none");
    expect(DEFAULT_STYLE.logo).toBeNull();
    expect(DEFAULT_STYLE.ecLevel).toBe("M");
    expect(scanWarnings(DEFAULT_SETTINGS)).toEqual([]);
  });
});

describe("the Symbology registry", () => {
  it("lists every Symbology once, with a label and a hint in both Locales", () => {
    expect(new Set(SYMBOLOGY_IDS).size).toBe(SYMBOLOGY_IDS.length);
    for (const id of SYMBOLOGY_IDS) {
      expect(symbologiesOf(familyOf(id))).toContain(id);
      const entry = symbologyOf(id);
      expect(Object.keys(enUS)).toContain(entry.labelTranslation);
      expect(Object.keys(enUS)).toContain(entry.hintTranslation);
      expect(Object.keys(idID)).toContain(entry.labelTranslation);
      expect(Object.keys(idID)).toContain(entry.hintTranslation);
    }
  });

  it("gives every family a first Symbology that belongs to it", () => {
    for (const family of ["qr", "2d", "1d", "postal"] as const) {
      const first = defaultSymbologyOf(family);
      expect(familyOf(first)).toBe(family);
      expect(symbologiesOf(family)).toContain(first);
    }
  });

  it("covers every BARCODE_TYPE and the five height-modulated postal codes", () => {
    const covered = [...LINEAR_TYPES, ...POSTAL_TYPES];
    expect(new Set(covered).size).toBe(45);
    for (const type of BARCODE_TYPES) {
      expect(covered).toContain(type);
    }
    expect(covered).toContain("postnet");
    expect(covered).toContain("planet");
  });

  it("does not list JAB Code", () => {
    expect(JSON.stringify(SYMBOLOGY_IDS)).not.toMatch(/jab/iu);
  });

  it("gives QR the styling controls and a linear code the linear ones", () => {
    expect(hasControl("qr", "dot")).toBe(true);
    expect(hasControl("qr", "logo")).toBe(true);
    expect(hasControl("qr", "gradient")).toBe(true);
    expect(hasControl("code128", "linear")).toBe(true);
    expect(hasControl("code128", "dot")).toBe(false);
    expect(hasControl("itf14", "bearerBars")).toBe(true);
    expect(hasControl("pdf417", "pdfColumns")).toBe(true);
  });

  it("gives every Symbology a validator and a renderer", () => {
    for (const id of SYMBOLOGY_IDS) {
      const entry = symbologyOf(id);
      expect(entry.validate).toBeTypeOf("function");
      expect(entry.render).toBeTypeOf("function");
    }
    expect(symbologyOf("qr").validate("", DEFAULT_STYLE).valid).toBe(false);
    expect(symbologyOf("qr").validate("hello", DEFAULT_STYLE).valid).toBe(true);
  });

  it("does not offer a gradient on a matrix code that cannot draw one", () => {
    expect(hasControl("datamatrix", "gradient")).toBe(false);
    expect(hasControl("microqr", "gradient")).toBe(false);
    expect(hasControl("rmqr", "gradient")).toBe(false);
  });

  it("offers the Error Correction levels the Symbology accepts", () => {
    expect(ecLevelsOf("qr")).toEqual(["L", "M", "Q", "H"]);
    expect(ecLevelsOf("microqr")).toEqual(["L", "M", "Q"]);
    expect(ecLevelsOf("rmqr")).toEqual(["M", "H"]);
  });

  it("lists a field spec for every preset", () => {
    for (const preset of PRESETS) {
      expect(PRESET_FIELD_SPECS[preset].length).toBeGreaterThan(0);
    }
    expect(ADVANCED_PRESETS).toEqual(["swiss", "gs1-digital-link", "gs1qr"]);
  });
});

describe("Payload Presets", () => {
  it("sends a Wi-Fi Payload with its reserved characters escaped", () => {
    expect(
      buildPreset("wifi", {
        encryption: "WPA",
        hidden: "true",
        password: "p:a;ss",
        ssid: "Cafe;Guest",
      })
    ).toEqual({
      payload: "WIFI:T:WPA;S:Cafe\\;Guest;P:p\\:a\\;ss;H:true;;",
      problem: null,
    });
  });

  it("leaves the password out of an open network", () => {
    expect(
      buildPreset("wifi", {
        encryption: "nopass",
        hidden: "false",
        password: "ignored",
        ssid: "Open",
      }).payload
    ).toBe("WIFI:T:nopass;S:Open;P:;;");
  });

  it("builds a vCard 3.0 with escaped values", () => {
    const built = buildPreset("vcard", {
      email: "ada@example.com",
      firstName: "Ada",
      lastName: "Lovelace",
      org: "Analytical, Engines",
      phone: "+44 20 0000",
    });
    expect(built.problem).toBeNull();
    expect(built.payload).toContain("BEGIN:VCARD\r\nVERSION:3.0");
    expect(built.payload).toContain("N:Lovelace;Ada;;;");
    expect(built.payload).toContain("FN:Ada Lovelace");
    expect(built.payload).toContain("ORG:Analytical\\, Engines");
    expect(built.payload).toContain("TEL;TYPE=CELL:+44 20 0000");
    expect(built.payload).toContain("END:VCARD");
  });

  it("builds a MeCard", () => {
    expect(
      buildPreset("mecard", {
        email: "ada@example.com",
        name: "Ada Lovelace",
        phone: "+44",
      }).payload
    ).toBe("MECARD:N:Ada Lovelace;TEL:+44;EMAIL:ada@example.com;;");
  });

  it("builds an email with encoded query values", () => {
    expect(
      buildPreset("email", {
        body: "Hi there!",
        subject: "Hello world",
        to: "ada@example.com",
      }).payload
    ).toBe("mailto:ada@example.com?subject=Hello+world&body=Hi+there%21");
  });

  it("rejects an email without an at sign", () => {
    expect(buildPreset("email", { to: "ada" }).problem).toBe("invalid-email");
  });

  it("builds an SMS, a phone call, and a location", () => {
    expect(
      buildPreset("sms", { message: "Hello", number: "+62 812 3456" }).payload
    ).toBe("SMSTO:+628123456:Hello");
    expect(buildPreset("phone", { number: "+62 (812) 3456" }).payload).toBe(
      "tel:+628123456"
    );
    expect(
      buildPreset("location", { latitude: "-6.2", longitude: "106.8" }).payload
    ).toBe("geo:-6.200000,106.800000");
    expect(
      buildPreset("location", { latitude: "200", longitude: "0" }).problem
    ).toBe("invalid-coordinates");
  });

  it("builds an iCalendar event", () => {
    const built = buildPreset("event", {
      description: "Line one\nLine two",
      end: "2026-04-01T11:00",
      location: "Office",
      start: "2026-04-01T10:00",
      title: "Meeting: budget",
    });
    expect(built.problem).toBeNull();
    expect(built.payload).toContain("BEGIN:VCALENDAR\r\nVERSION:2.0");
    expect(built.payload).toContain("SUMMARY:Meeting: budget");
    expect(built.payload).toContain("DTSTART:20260401T100000");
    expect(built.payload).toContain("DTEND:20260401T110000");
    expect(built.payload).toContain("DESCRIPTION:Line one\\nLine two");
  });

  it("builds a Swiss QR-bill in the standard order", () => {
    const built = buildPreset("swiss", {
      amount: "1949.75",
      creditorCity: "Zürich",
      creditorCountry: "CH",
      creditorName: "Max Muster",
      creditorPostalCode: "8000",
      creditorStreet: "Musterstrasse",
      currency: "CHF",
      iban: "CH44 3199 9123 0008 8901 2",
      reference: "210000000003139471430009017",
      referenceType: "QRR",
    });
    expect(built.problem).toBeNull();
    const lines = built.payload.split("\r\n");
    expect(lines.slice(0, 5)).toEqual([
      "SPC",
      "0200",
      "1",
      "CH4431999123000889012",
      "S",
    ]);
    expect(lines[5]).toBe("Max Muster");
    expect(lines[10]).toBe("CH");
    expect(lines[18]).toBe("1949.75");
    expect(lines[19]).toBe("CHF");
    expect(lines[27]).toBe("QRR");
    expect(lines[28]).toBe("210000000003139471430009017");
    expect(lines.at(-1)).toBe("EPD");
  });

  it("requires both coordinates before it builds a location", () => {
    expect(buildPreset("location", {}).problem).toBe("required");
    expect(
      buildPreset("location", { latitude: "-6.2", longitude: "" }).problem
    ).toBe("required");
  });

  it("rejects a Swiss IBAN that is not one", () => {
    expect(
      buildPreset("swiss", {
        creditorCity: "Zürich",
        creditorCountry: "CH",
        creditorName: "Max",
        creditorPostalCode: "8000",
        iban: "not-an-iban",
      }).problem
    ).toBe("invalid-iban");
  });

  it("builds a GS1 Digital Link and a GS1 QR Payload", () => {
    expect(
      buildPreset("gs1-digital-link", {
        batch: "LOT42",
        domain: "https://example.com",
        gtin: "09501101020917",
      }).payload
    ).toBe("https://example.com/01/09501101020917?10=LOT42");
    expect(
      buildPreset("gs1qr", {
        expiry: "2026-04-01",
        gtin: "09501101020917",
        lot: "LOT42",
      }).payload
    ).toBe("(01)09501101020917(17)260401(10)LOT42");
    expect(buildPreset("gs1qr", { gtin: "123" }).problem).toBe("invalid-gtin");
  });

  it("reports a required field rather than building half a Payload", () => {
    expect(buildPreset("wifi", {}).problem).toBe("required");
    expect(buildPreset("vcard", {}).problem).toBe("required");
    expect(validatePreset("wifi", {}).valid).toBe(false);
  });
});

describe("validation", () => {
  it("blocks an empty Payload and a Payload past the QR capacity", () => {
    expect(validatePayload("qr", "").problem).toBe("empty");
    expect(validatePayload("qr", A_LONG_PAYLOAD).problem).toBe("qr-capacity");
  });

  it("blocks a matrix Payload past its capacity", () => {
    expect(validatePayload("pdf417", "x".repeat(926)).problem).toBe(
      "barcode-input"
    );
    expect(validatePayload("pdf417", "x".repeat(10)).valid).toBe(true);
    expect(validatePayload("datamatrix", "x".repeat(1559)).problem).toBe(
      "barcode-input"
    );
  });

  it("blocks input a linear Symbology cannot hold", () => {
    expect(validatePayload("ean13", "ABC").problem).toBe("barcode-input");
    expect(validatePayload("code128", "ABC").valid).toBe(true);
  });

  it("blocks a postal code with the wrong length", () => {
    expect(validatePayload("postnet", "1234").problem).toBe("postal-input");
    expect(validatePayload("postnet", "12345").valid).toBe(true);
    expect(validatePayload("imb", "123").problem).toBe("postal-input");
  });

  it("lets a valid Raw Payload pass an unfinished preset form", () => {
    expect(
      validateSettings(withPayload("hello", { fields: {}, preset: "wifi" }))
        .valid
    ).toBe(true);
    expect(
      validateSettings(withPayload("", { fields: {}, preset: "wifi" })).valid
    ).toBe(false);
    expect(validateSettings(DEFAULT_SETTINGS).valid).toBe(true);
  });
});

describe("Scan Warnings", () => {
  it("reports low contrast and inverted colours", () => {
    const low = scanWarnings(
      setStyle(DEFAULT_SETTINGS, { bg: "#ffffff", fg: "#ffdddd" })
    );
    expect(low.map((warning) => warning.id)).toContain("low-contrast");
    const inverted = scanWarnings(
      setStyle(DEFAULT_SETTINGS, { bg: "#111111", fg: "#ffffff" })
    );
    expect(inverted.map((warning) => warning.id)).toContain("inverted");
  });

  it("reports a logo over 30 percent, a small Quiet Zone, and a light stop", () => {
    const warnings = scanWarnings(
      setStyle(DEFAULT_SETTINGS, {
        gradient: "linear",
        gradientEnd: "#eeeeee",
        logo: { dataUri: "data:image/png;base64,AA==", name: "logo.png" },
        logoSize: 40,
        quietZone: 1,
      })
    );
    expect(warnings.map((warning) => warning.id)).toEqual(
      expect.arrayContaining(["logo-size", "quiet-zone", "gradient-stop"])
    );
  });

  it("reports a Payload near the QR capacity", () => {
    const warnings = scanWarnings(
      withPayload("x".repeat(2000), { fields: text("x".repeat(2000)) })
    );
    expect(warnings.map((warning) => warning.id)).toContain("near-capacity");
  });

  it("never blocks a render or a download", () => {
    const settings = setStyle(DEFAULT_SETTINGS, { fg: "#eeeeee" });
    expect(scanWarnings(settings).length).toBeGreaterThan(0);
    expect(validateSettings(settings).valid).toBe(true);
  });
});

describe("settings transitions", () => {
  it("resolves a family to its first Symbology", () => {
    expect(selectFamily(DEFAULT_SETTINGS, "1d").symbology).toBe("code128");
    expect(selectFamily(DEFAULT_SETTINGS, "postal").symbology).toBe("postnet");
    expect(selectFamily(DEFAULT_SETTINGS, "2d").symbology).toBe("datamatrix");
  });

  it("clamps the Error Correction to a level the Symbology accepts", () => {
    const low = setStyle(selectSymbology(DEFAULT_SETTINGS, "qr"), {
      ecLevel: "L",
    });
    expect(selectSymbology(low, "rmqr").style.ecLevel).toBe("M");
    const high = setStyle(selectSymbology(DEFAULT_SETTINGS, "microqr"), {
      ecLevel: "H",
    });
    expect(selectSymbology(high, "microqr").style.ecLevel).toBe("M");
  });

  it("keeps the Payload when the Symbology changes", () => {
    const next = selectSymbology(DEFAULT_SETTINGS, "code128");
    expect(next.payload).toBe(DEFAULT_SETTINGS.payload);
  });

  it("seeds a preset and builds its Payload", () => {
    const next = selectPreset(DEFAULT_SETTINGS, "wifi");
    expect(next.symbology).toBe("qr");
    expect(next.preset).toBe("wifi");
    expect(next.fields.encryption).toBe("WPA");
    expect(next.payload).toBe("");
    const filled = setPresetField(next, "ssid", "Cafe");
    expect(filled.payload).toBe("WIFI:T:WPA;S:Cafe;P:;;");
  });

  it("blocks the preview when a required preset field is cleared", () => {
    const filled = setPresetField(
      setPresetField(selectPreset(DEFAULT_SETTINGS, "wifi"), "ssid", "Cafe"),
      "password",
      "secret"
    );
    expect(validateSettings(filled).valid).toBe(true);
    expect(validateSettings(setPresetField(filled, "ssid", "")).valid).toBe(
      false
    );
  });

  it("turns a GS1 QR preset into a GS1 QR code, and a new URL back off", () => {
    const next = selectPreset(DEFAULT_SETTINGS, "gs1qr");
    expect(next.style.gs1).toBe(true);
    expect(selectPreset(DEFAULT_SETTINGS, "wifi").style.gs1).toBe(false);
    expect(setPayload(next, "https://example.com").style.gs1).toBe(false);
    expect(setPayload(next, "(01)12345678901231").style.gs1).toBe(true);
    expect(clearPayload(next).style.gs1).toBe(false);
  });

  it("clears the Payload back to a new text code", () => {
    const next = clearPayload(
      setPresetField(selectPreset(DEFAULT_SETTINGS, "wifi"), "ssid", "Cafe")
    );
    expect(next.payload).toBe("");
    expect(next.preset).toBe("text");
    expect(validateSettings(next).problem).toBe("empty");
  });

  it("keeps the raw Payload when the user edits it", () => {
    const next = setPayload(DEFAULT_SETTINGS, "https://example.com");
    expect(next.payload).toBe("https://example.com");
    expect(next.fields.text).toBe("https://example.com");
  });

  it("does not read a field name as a record key", () => {
    const next = setPresetField(DEFAULT_SETTINGS, "__proto__", "x");
    expect(Object.hasOwn(next.fields, "__proto__")).toBe(true);
    expect(next.payload).toBe(DEFAULT_SETTINGS.payload);
  });
});

describe("file names", () => {
  it("slugs a URL and falls back to the Symbology", () => {
    expect(slugOf("https://ritools.com")).toBe("https-ritools-com");
    expect(slugOf("!!!", "qr")).toBe("qr");
    expect(slugOf("Héllo Wörld")).toBe("hello-world");
  });

  it("names a single file after the Payload, and a secret preset after itself", () => {
    expect(fileNameOf(DEFAULT_SETTINGS)).toBe("qraft-https-ritools-com.svg");
    expect(fileNameOf({ ...DEFAULT_SETTINGS, output: "png" })).toBe(
      "qraft-https-ritools-com.png"
    );
    expect(fileNameOf(selectPreset(DEFAULT_SETTINGS, "wifi"))).toBe(
      "qraft-wifi.svg"
    );
  });

  it("numbers the Batch files and keeps a label when there is one", () => {
    expect(batchFileNameOf(0, "", "svg")).toBe("qraft-001.svg");
    expect(batchFileNameOf(0, "Cafe Guest", "png")).toBe(
      "qraft-001-cafe-guest.png"
    );
  });
});

describe("the Batch parser", () => {
  it("reads one Payload per line and drops empty lines", () => {
    expect(parseBatchLines("https://a.test\n\n https://b.test \r\n")).toEqual([
      { label: "", payload: "https://a.test" },
      { label: "", payload: "https://b.test" },
    ]);
  });

  it("reads a CSV with a header and a label", () => {
    expect(
      parseBatchCsv('payload,label\nhttps://a.test,First\n"https://b.test",Two')
    ).toEqual([
      { label: "First", payload: "https://a.test" },
      { label: "Two", payload: "https://b.test" },
    ]);
  });

  it("reads a CSV without a header, and one with the columns reversed", () => {
    expect(parseBatchCsv("https://a.test,First\nhttps://b.test,Two")).toEqual([
      { label: "First", payload: "https://a.test" },
      { label: "Two", payload: "https://b.test" },
    ]);
    expect(parseBatchCsv("label,payload\nFirst,https://a.test")).toEqual([
      { label: "First", payload: "https://a.test" },
    ]);
  });

  it("reads a quoted comma and an escaped quote", () => {
    expect(parseBatchCsv('payload,label\n"a,b","He said ""hi"""')).toEqual([
      { label: 'He said "hi"', payload: "a,b" },
    ]);
  });

  it("ignores a row without a Payload and an empty file", () => {
    expect(parseBatchCsv("payload,label\n,First")).toEqual([]);
    expect(parseBatchCsv("")).toEqual([]);
    expect(parseBatchLines("\n\n")).toEqual([]);
  });

  it("warns above 500 codes and does not cap", () => {
    expect(batchWarns(BATCH_WARN_AT)).toBe(false);
    expect(batchWarns(BATCH_WARN_AT + 1)).toBe(true);
    const lines = Array.from({ length: 600 }, (_, index) => `code-${index}`);
    expect(parseBatchLines(lines.join("\n"))).toHaveLength(600);
  });
});

describe("the registry labels", () => {
  it("has a distinct label key for every Symbology", () => {
    const labels = SYMBOLOGY_IDS.map((id) => `qraftName${id}`);
    expect(new Set(labels).size).toBe(SYMBOLOGY_IDS.length);
  });

  it("names every Symbology id in the core type", () => {
    const ids: readonly SymbologyId[] = SYMBOLOGY_IDS;
    expect(ids.length).toBe(58);
  });
});
