import { describe, expect, it } from "vitest";

import {
  DEFAULT_SETTINGS,
  DEFAULT_STYLE,
  POSTAL_TYPES,
  PRESETS,
  PRESET_DEFAULTS,
  buildPreset,
  parseBatchCsv,
  parseBatchText,
  scanWarnings,
  selectFamily,
  selectSymbology,
  setOutput,
  setStyle,
  symbologyOf,
  validatePayload,
  validatePreset,
} from "./qraft";
import type { PresetId, SymbologyId } from "./qraft";

/**
 * Branch coverage for the parts of the core that one happy path does not
 * reach: every Preset form, every postal standard, and the styling guards.
 */

describe("every Payload Preset", () => {
  it("builds from its own defaults", () => {
    for (const preset of PRESETS) {
      expect(buildPreset(preset, PRESET_DEFAULTS[preset]).payload).toBeTypeOf(
        "string"
      );
    }
  });

  it("fills every optional vCard field", () => {
    const built = buildPreset("vcard", {
      address: "1 Main St",
      email: "ada@example.com",
      firstName: "Ada",
      lastName: "Lovelace",
      org: "Analytical Engines",
      phone: "+44",
      title: "Mathematician",
      url: "https://ada.test",
    });
    expect(built.payload).toContain("TITLE:Mathematician");
    expect(built.payload).toContain("URL:https://ada.test");
    expect(built.payload).toContain("ADR;TYPE=WORK:;;1 Main St;;;;");
  });

  it("fills every optional MeCard field", () => {
    const built = buildPreset("mecard", {
      address: "1 Main St",
      email: "ada@example.com",
      name: "Ada",
      phone: "+44",
      url: "https://ada.test",
    });
    expect(built.payload).toContain("URL:https\\://ada.test");
    expect(built.payload).toContain("ADR:1 Main St");
  });

  it("builds an email with and without a query", () => {
    expect(
      buildPreset("email", {
        body: "",
        subject: "",
        to: "ada@example.com",
      }).payload
    ).toBe("mailto:ada@example.com");
    expect(
      buildPreset("email", {
        body: "Hi",
        subject: "Hello",
        to: "ada@example.com",
      }).payload
    ).toContain("subject=Hello");
  });

  it("builds an event with and without an end", () => {
    const full = buildPreset("event", {
      description: "Bring notes",
      end: "2026-04-01T11:00",
      location: "Office",
      start: "2026-04-01T10:00",
      title: "Meeting",
    });
    expect(full.payload).toContain("DTEND:");
    expect(full.payload).toContain("LOCATION:Office");
    expect(full.payload).toContain("DESCRIPTION:Bring notes");
    const noEnd = buildPreset("event", {
      end: "",
      start: "2026-04-01",
      title: "Meeting",
    });
    expect(noEnd.payload).not.toContain("DTEND:");
  });

  it("builds a Swiss code with an amount and a reference", () => {
    const built = buildPreset("swiss", {
      amount: "1949,75",
      creditorCity: "Zürich",
      creditorCountry: "CH",
      creditorName: "Max Muster",
      creditorPostalCode: "8000",
      creditorStreet: "Musterstrasse",
      currency: "EUR",
      iban: "CH4431999123000889012",
      reference: "210000000003139471430009017",
      referenceType: "SCOR",
    });
    expect(built.payload).toContain("\r\n1949.75\r\nEUR\r\n");
    expect(built.payload).toContain("\r\nSCOR\r\n");
  });

  it("builds a GS1 Digital Link with every field", () => {
    const built = buildPreset("gs1-digital-link", {
      batch: "LOT42",
      domain: "https://example.com/",
      expiry: "2026-04-01",
      gtin: "09501101020917",
      serial: "SERIAL",
    });
    expect(built.payload).toBe(
      "https://example.com/01/09501101020917?17=260401&10=LOT42&21=SERIAL"
    );
  });

  it("builds a GS1 QR with a serial", () => {
    expect(
      buildPreset("gs1qr", {
        expiry: "",
        gtin: "09501101020917",
        lot: "",
        serial: "SERIAL",
      }).payload
    ).toBe("(01)09501101020917(21)SERIAL");
  });

  it("builds the smallest form of each preset", () => {
    const vcard = buildPreset("vcard", { firstName: "Ada" }).payload;
    expect(vcard).not.toContain("ORG:");
    expect(vcard).not.toContain("TITLE:");
    expect(vcard).not.toContain("TEL:");
    expect(vcard).not.toContain("EMAIL:");
    expect(vcard).not.toContain("URL:");
    expect(vcard).not.toContain("ADR;");
    const mecard = buildPreset("mecard", { name: "Ada" }).payload;
    expect(mecard).not.toContain("TEL:");
    expect(mecard).not.toContain("EMAIL:");
    expect(mecard).not.toContain("URL:");
    expect(mecard).not.toContain("ADR:");
    const event = buildPreset("event", {
      start: "2026-04-01T10:00",
      title: "Meeting",
    }).payload;
    expect(event).not.toContain("DTEND:");
    expect(event).not.toContain("LOCATION:");
    expect(event).not.toContain("DESCRIPTION:");
  });

  it("takes the default value of each optional field", () => {
    expect(
      buildPreset("wifi", {
        encryption: "",
        hidden: "false",
        password: "",
        ssid: "Cafe",
      }).payload
    ).toBe("WIFI:T:WPA;S:Cafe;P:;;");
    const swiss = buildPreset("swiss", {
      creditorCity: "Zürich",
      creditorCountry: "ch",
      creditorName: "Max",
      creditorPostalCode: "8000",
      currency: "",
      iban: "CH4431999123000889012",
      referenceType: "",
    });
    expect(swiss.payload).toContain("\r\nCHF\r\n");
    expect(swiss.payload).toContain("\r\nNON\r\n");
    expect(
      buildPreset("gs1-digital-link", {
        domain: "",
        gtin: "09501101020917",
      }).payload
    ).toBe("https://ritools.com/01/09501101020917");
    expect(buildPreset("gs1qr", { gtin: "09501101020917" }).payload).toBe(
      "(01)09501101020917"
    );
  });

  it("reports every preset problem", () => {
    expect(buildPreset("vcard", {}).problem).toBe("required");
    expect(buildPreset("mecard", {}).problem).toBe("required");
    expect(buildPreset("email", {}).problem).toBe("required");
    expect(buildPreset("email", { to: "ada" }).problem).toBe("invalid-email");
    expect(buildPreset("sms", {}).problem).toBe("required");
    expect(buildPreset("sms", { number: "x" }).problem).toBe("invalid-number");
    expect(buildPreset("phone", {}).problem).toBe("required");
    expect(buildPreset("phone", { number: "x" }).problem).toBe(
      "invalid-number"
    );
    expect(buildPreset("event", {}).problem).toBe("required");
    expect(
      buildPreset("event", { start: "not-a-date", title: "X" }).problem
    ).toBe("invalid-date");
    expect(buildPreset("swiss", {}).problem).toBe("required");
    expect(
      buildPreset("swiss", {
        amount: "1.234",
        creditorCity: "Zürich",
        creditorCountry: "CH",
        creditorName: "Max",
        creditorPostalCode: "8000",
        iban: "CH4431999123000889012",
      }).problem
    ).toBe("invalid-amount");
    expect(
      buildPreset("swiss", {
        creditorCity: "Zürich",
        creditorCountry: "CH",
        creditorName: "Max",
        creditorPostalCode: "8000",
        iban: "CH4431999123000889012",
        referenceType: "QRR",
      }).problem
    ).toBe("required");
    expect(buildPreset("gs1-digital-link", {}).problem).toBe("required");
    expect(buildPreset("gs1-digital-link", { gtin: "123" }).problem).toBe(
      "invalid-gtin"
    );
    expect(buildPreset("gs1qr", {}).problem).toBe("required");
    expect(buildPreset("gs1qr", { gtin: "123" }).problem).toBe("invalid-gtin");
    expect(buildPreset("location", {}).problem).toBe("required");
    expect(buildPreset("wifi", {}).problem).toBe("required");
  });

  it("accepts and rejects the presets as a whole", () => {
    expect(validatePreset("text", { text: "" }).valid).toBe(false);
    expect(validatePreset("text", { text: "hello" }).valid).toBe(true);
    for (const preset of PRESETS) {
      expect(validatePreset(preset, PRESET_DEFAULTS[preset])).toBeTypeOf(
        "object"
      );
    }
  });
});

describe("every postal standard", () => {
  it("accepts a valid Payload for each and rejects one bad shape", () => {
    const valid: readonly [SymbologyId, string][] = [
      ["postnet", "12345"],
      ["planet", "12345678901"],
      ["rm4scc", "SN34RD1A"],
      ["kix", "1234AB"],
      ["auspost", "12345678"],
      ["jppost", "1234567"],
      ["imb", "01234567094987654321"],
    ];
    for (const [id, payload] of valid) {
      expect(validatePayload(id, payload)).toMatchObject({
        valid: true,
      });
    }
    for (const id of POSTAL_TYPES) {
      expect(validatePayload(id, "!").valid).toBe(false);
    }
  });
});

describe("QR capacity and 2D options", () => {
  it("accepts and rejects Micro QR and rMQR", () => {
    expect(validatePayload("microqr", "12345").valid).toBe(true);
    expect(validatePayload("microqr", "x".repeat(200)).valid).toBe(false);
    expect(validatePayload("rmqr", "Hello").valid).toBe(true);
    expect(validatePayload("rmqr", "x".repeat(2000)).valid).toBe(false);
  });

  it("blocks a matrix Payload past its capacity and a bad DotCode grid", () => {
    expect(validatePayload("datamatrix", "x".repeat(2000)).valid).toBe(false);
    expect(validatePayload("aztec", "x".repeat(2000)).valid).toBe(false);
    expect(validatePayload("hanxin", "x".repeat(2100)).valid).toBe(false);
    expect(validatePayload("maxicode", "x".repeat(100)).valid).toBe(false);
    const even = setStyle(DEFAULT_SETTINGS, {
      dotcodeColumns: 21,
      dotcodeRows: 21,
    });
    expect(validatePayload("dotcode", "Hello", even.style).valid).toBe(false);
  });

  it("accepts the Error Correction variants the QR family maps", () => {
    const logo = { dataUri: "data:image/png;base64,AA==", name: "logo.png" };
    const micro = setStyle(DEFAULT_SETTINGS, {
      ecLevel: "H",
      logo,
      version: 1,
    });
    expect(validatePayload("microqr", "12345", micro.style).valid).toBe(true);
    const rmqr = setStyle(DEFAULT_SETTINGS, { ecLevel: "H", version: 1 });
    expect(validatePayload("rmqr", "Hello", rmqr.style).valid).toBe(true);
  });

  it("accepts an unstructured MaxiCode and blocks structured without a code", () => {
    const mode2 = setStyle(DEFAULT_SETTINGS, { maxicodeMode: 2 });
    expect(validatePayload("maxicode", "Hello", mode2.style).valid).toBe(false);
    const withPostal = setStyle(DEFAULT_SETTINGS, {
      maxicodeMode: 2,
      maxicodePostal: "12345",
    });
    expect(validatePayload("maxicode", "Hello", withPostal.style).valid).toBe(
      true
    );
    const mode4 = setStyle(DEFAULT_SETTINGS, { maxicodeMode: 4 });
    expect(validatePayload("maxicode", "Hello", mode4.style).valid).toBe(true);
  });
});

describe("styling guards", () => {
  it("reads three-digit and invalid colours without a crash", () => {
    expect(scanWarnings(setStyle(DEFAULT_SETTINGS, { bg: "#fff" }))).toEqual(
      []
    );
    expect(
      scanWarnings(
        setStyle(DEFAULT_SETTINGS, { bg: "not-a-colour", fg: "not-a-colour" })
      )
    ).toEqual([]);
  });

  it("does not warn on a dark gradient stop", () => {
    const warnings = scanWarnings(
      setStyle(DEFAULT_SETTINGS, {
        gradient: "linear",
        gradientEnd: "#000000",
      })
    );
    expect(warnings.map((warning) => warning.id)).not.toContain(
      "gradient-stop"
    );
  });

  it("checks the Quiet Zone of a matrix code and a QR code", () => {
    const matrix = scanWarnings({
      ...DEFAULT_SETTINGS,
      style: { ...DEFAULT_STYLE, quietZone: 2 },
      symbology: "datamatrix",
    });
    expect(matrix.map((warning) => warning.id)).toContain("quiet-zone");
    expect(
      scanWarnings({ ...DEFAULT_SETTINGS, symbology: "datamatrix" })
    ).toEqual([]);
  });

  it("reads a low colour channel", () => {
    const warnings = scanWarnings(
      setStyle(DEFAULT_SETTINGS, { bg: "#010101" })
    );
    expect(warnings.map((warning) => warning.id)).toContain("inverted");
  });

  it("warns on a radial gradient stop and a logo at the limit", () => {
    const warnings = scanWarnings(
      setStyle(DEFAULT_SETTINGS, {
        gradient: "radial",
        gradientEnd: "#eeeeee",
        logo: { dataUri: "data:image/png;base64,AA==", name: "logo.png" },
        logoSize: 30,
      })
    );
    expect(warnings.map((warning) => warning.id)).toContain("gradient-stop");
    expect(warnings.map((warning) => warning.id)).not.toContain("logo-size");
  });

  it("reports no quiet-zone warning at four modules", () => {
    const warnings = scanWarnings(setStyle(DEFAULT_SETTINGS, { quietZone: 4 }));
    expect(warnings.map((warning) => warning.id)).not.toContain("quiet-zone");
  });
});

describe("transitions and files", () => {
  it("moves through every family and clamps the Error Correction", () => {
    for (const family of ["qr", "2d", "1d", "postal"] as const) {
      const next = selectFamily(DEFAULT_SETTINGS, family);
      expect(next.symbology).toBeTypeOf("string");
    }
    const low = setStyle(selectSymbology(DEFAULT_SETTINGS, "qr"), {
      ecLevel: "L",
    });
    expect(selectSymbology(low, "rmqr").style.ecLevel).toBe("M");
    expect(setOutput(DEFAULT_SETTINGS, "png").output).toBe("png");
  });

  it("reads a quoted header and a BOM", () => {
    expect(
      parseBatchText('"payload","label"\n"https://a.test","First"')
    ).toEqual([{ label: "First", payload: "https://a.test" }]);
    expect(parseBatchCsv("\uFEFFpayload,label\nhttps://a.test,First")).toEqual([
      { label: "First", payload: "https://a.test" },
    ]);
    expect(parseBatchText("https://a.test\nhttps://b.test")).toHaveLength(2);
    expect(parseBatchCsv("payload\nhttps://a.test")).toEqual([
      { label: "", payload: "https://a.test" },
    ]);
  });

  it("exposes the renderer and validator on the registry", async () => {
    const entry = symbologyOf("datamatrix");
    expect(entry.validate("Hello", DEFAULT_STYLE).valid).toBe(true);
    const svg = await entry.render("Hello", DEFAULT_STYLE, {
      desc: "A Data Matrix code.",
      title: "Data Matrix",
    });
    expect(svg).toContain("<svg");
  });
});

describe("preset ids", () => {
  it("names every preset", () => {
    const ids: readonly PresetId[] = PRESETS;
    expect(new Set(ids).size).toBe(ids.length);
  });
});
