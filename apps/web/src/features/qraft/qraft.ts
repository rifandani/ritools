/* oxlint-disable anti-slop/no-shape-in-symbol-names -- "shape" is the QR style term the library, the design, and the labels use. */
/* oxlint-disable anti-slop/require-safety-comment-for-type-assertion -- Every cast narrows a value this module built from a fixed option list or a library union. */
/* oxlint-disable eslint/no-use-before-define -- The registry closures call the render and validation seams after module load. */
/* oxlint-disable eslint/complexity -- Three functions own one switch over the Preset, Symbology, and Family sets; the case lists are the catalog. */
/**
 * Qraft: the domain of writing scannable codes on the device.
 *
 * This module is the one seam of the Tool. It holds the Symbology registry,
 * the settings model, the Payload Preset builders, the option mapping, the
 * validation, the Scan Warnings, the file names, the Batch parser, and the
 * render calls. The React components and the hook only hold state and markup.
 *
 * The QR family is imported up front so the default code renders on the
 * server. Every other family loads with a dynamic `import()` on first use.
 */

import type { BarcodeType, DotType, PostalType } from "etiket";
import {
  encodeMicroQR,
  encodeQR,
  encodeRMQR,
  microqr,
  qrcode,
  qrcodeTerminal,
  rmqr,
} from "etiket/qr";
import { validateBarcode, validateQRInput } from "etiket/validators";
import Papa from "papaparse";

import type enUS from "@/core/libs/i18n/locales/en-US";

/* -------------------------------------------------------------------------- */
/* Vocabulary                                                                  */
/* -------------------------------------------------------------------------- */

/** A Translation Key this module names. The Message Catalog must hold it. */
export type QraftKey = keyof typeof enUS;

/** The four groups the Symbology picker shows. */
export const CODE_FAMILIES = ["qr", "2d", "1d", "postal"] as const;
export type CodeFamily = (typeof CODE_FAMILIES)[number];

/** The 38 width-modulated Symbologies Qraft writes through `barcode()`. */
export const LINEAR_TYPES = [
  "code128",
  "ean13",
  "ean8",
  "code39",
  "code39ext",
  "code93",
  "code93ext",
  "itf",
  "itf14",
  "upca",
  "upce",
  "ean2",
  "ean5",
  "codabar",
  "msi",
  "pharmacode",
  "code11",
  "gs1-128",
  "identcode",
  "leitcode",
  "plessey",
  "gs1-databar",
  "gs1-databar-limited",
  "gs1-databar-expanded",
  "gs1-databar-truncated",
  "ean14",
  "sscc18",
  "isbn",
  "issn",
  "ismn",
  "code32",
  "pzn",
  "pzn8",
  "industrial2of5",
  "iata2of5",
  "matrix2of5",
  "coop2of5",
  "datalogic2of5",
] as const;
export type LinearType = (typeof LINEAR_TYPES)[number];

/** The seven height-modulated Symbologies Qraft writes through `postal()`. */
export const POSTAL_TYPES = [
  "postnet",
  "planet",
  "rm4scc",
  "kix",
  "auspost",
  "jppost",
  "imb",
] as const;
export type PostalSymbology = (typeof POSTAL_TYPES)[number];

/** The QR family, the only family the first load carries. */
const QR_TYPES = ["qr", "microqr", "rmqr"] as const;
export type QrType = (typeof QR_TYPES)[number];

/** The 2D family: every matrix Symbology that is not a QR. */
const MATRIX_TYPES = [
  "datamatrix",
  "gs1-datamatrix",
  "pdf417",
  "micropdf417",
  "aztec",
  "maxicode",
  "dotcode",
  "hanxin",
  "codablock-f",
  "code16k",
] as const;
export type MatrixType = (typeof MATRIX_TYPES)[number];

/** Every Symbology Qraft writes. JAB Code is deliberately absent. */
export const SYMBOLOGY_IDS = [
  ...QR_TYPES,
  ...MATRIX_TYPES,
  ...LINEAR_TYPES,
  ...POSTAL_TYPES,
] as const;
export type SymbologyId = (typeof SYMBOLOGY_IDS)[number];

/** The controls a Symbology shows. The registry decides, not the UI. */
export type Control =
  | "aztecEc"
  | "bearerBars"
  | "code25CheckDigit"
  | "code128Charset"
  | "code39CheckDigit"
  | "codabar"
  | "corner"
  | "datamatrixShape"
  | "dot"
  | "dotcode"
  | "ec"
  | "gradient"
  | "hanxin"
  | "linear"
  | "logo"
  | "mask"
  | "maxicode"
  | "mode"
  | "msiCheckDigit"
  | "pdfColumns"
  | "pdfEc"
  | "quietZone"
  | "rotation"
  | "routingCode"
  | "size"
  | "stackedColumns"
  | "text"
  | "textOverride"
  | "version";

/** A unit an SVG file can carry. */
export const UNITS = ["px", "mm", "cm", "in", "pt"] as const;
export type Unit = (typeof UNITS)[number];

/** The two output files a single code writes. */
const OUTPUT_FORMATS = ["svg", "png"] as const;
export type OutputFormat = (typeof OUTPUT_FORMATS)[number];

/** The Payload Presets. The first nine are the main set; three are advanced. */
export const PRESETS = [
  "text",
  "wifi",
  "vcard",
  "mecard",
  "email",
  "sms",
  "phone",
  "location",
  "event",
  "swiss",
  "gs1-digital-link",
  "gs1qr",
] as const;
export type PresetId = (typeof PRESETS)[number];

/** The presets that need a dedicated form an average user does not want. */
export const ADVANCED_PRESETS: readonly PresetId[] = [
  "swiss",
  "gs1-digital-link",
  "gs1qr",
];

/** The kinds of field a preset form prints. */
export type PresetFieldKind =
  | "checkbox"
  | "date"
  | "number"
  | "select"
  | "text"
  | "textarea";

export interface PresetFieldSpec {
  readonly name: string;
  readonly labelTranslation: QraftKey;
  readonly kind: PresetFieldKind;
  readonly options?: readonly string[];
  readonly placeholder?:
    | "email"
    | "number"
    | "password"
    | "text"
    | "url"
    | "tel";
}

/** A value per preset field. The keys are the fixed field names above. */
export type PresetValues = Readonly<Record<string, string>>;

/** What a preset builder gives back. A problem leaves the preview blocked. */
export interface PresetBuild {
  readonly payload: string;
  readonly problem: PresetProblem | null;
}

/** Why a preset cannot build a Payload yet. The UI maps it to a Message. */
export type PresetProblem =
  | "required"
  | "invalid-amount"
  | "invalid-coordinates"
  | "invalid-date"
  | "invalid-email"
  | "invalid-gtin"
  | "invalid-iban"
  | "invalid-number";

/* -------------------------------------------------------------------------- */
/* Style and settings                                                          */
/* -------------------------------------------------------------------------- */

export interface QraftLogo {
  readonly name: string;
  readonly dataUri: string;
}

export interface QraftStyle {
  readonly fg: string;
  readonly bg: string;
  readonly gradient: "none" | "linear" | "radial";
  readonly gradientEnd: string;
  readonly gradientRotation: number;
  readonly dotType: DotType;
  readonly dotSize: number;
  readonly shape: "circle" | "square";
  readonly cornerOuter:
    | "classy"
    | "dots"
    | "extra-rounded"
    | "rounded"
    | "square";
  readonly cornerInner: "dots" | "rounded" | "square";
  readonly cornerColor: string;
  readonly quietZone: number;
  readonly size: number;
  readonly pngSize: number;
  readonly unit: Unit;
  readonly logo: QraftLogo | null;
  readonly logoSize: number;
  readonly logoMargin: number;
  readonly logoBackground: string;
  readonly logoHideDots: boolean;
  readonly ecLevel: "H" | "L" | "M" | "Q";
  readonly version: number | null;
  readonly mode: "alphanumeric" | "auto" | "byte" | "numeric";
  readonly mask: number | null;
  readonly gs1: boolean;
  readonly height: number;
  readonly moduleSize: number;
  readonly showText: boolean;
  readonly text: string;
  readonly textPosition: "bottom" | "top";
  readonly fontSize: number;
  readonly margin: number;
  readonly rotation: 0 | 90 | 180 | 270;
  readonly bearerBars: boolean;
  readonly msiCheckDigit: "mod10" | "mod1010" | "mod11" | "mod1110" | "none";
  readonly code39CheckDigit: boolean;
  readonly codabarStart: string;
  readonly codabarStop: string;
  readonly code128Charset: "A" | "B" | "C" | "auto";
  readonly routingCode: string;
  readonly aztecEcPercent: number;
  readonly dotcodeColumns: number;
  readonly dotcodeMask: number;
  readonly dotcodeRows: number;
  readonly hanxinEcLevel: 1 | 2 | 3 | 4;
  readonly hanxinVersion: number;
  readonly pdfColumns: number | null;
  readonly pdfEc: number | null;
  readonly datamatrixShape: "auto" | "rectangle" | "square";
  readonly stackedColumns: number | null;
  readonly maxicodeMode: 2 | 3 | 4 | 5;
  readonly maxicodePostal: string;
  readonly maxicodeCountry: string;
  readonly code25CheckDigit: "add" | "none" | "verify";
}

export interface QraftSettings {
  readonly symbology: SymbologyId;
  readonly payload: string;
  readonly preset: PresetId;
  readonly fields: PresetValues;
  readonly style: QraftStyle;
  readonly output: OutputFormat;
}

/** The default style is a plain black QR on white, with a 4-module margin. */
export const DEFAULT_STYLE: QraftStyle = {
  bearerBars: true,
  bg: "#ffffff",
  code128Charset: "auto",
  code39CheckDigit: false,
  codabarStart: "A",
  codabarStop: "A",
  cornerColor: "#111111",
  cornerInner: "square",
  cornerOuter: "square",
  datamatrixShape: "square",
  dotSize: 1,
  dotType: "square",
  ecLevel: "M",
  fg: "#111111",
  fontSize: 14,
  gradient: "none",
  gradientEnd: "#c8102e",
  gradientRotation: 45,
  gs1: false,
  height: 80,
  logo: null,
  logoBackground: "#ffffff",
  logoHideDots: true,
  logoMargin: 4,
  logoSize: 25,
  margin: 10,
  mask: null,
  maxicodeCountry: "840",
  maxicodeMode: 4,
  maxicodePostal: "",
  mode: "auto",
  moduleSize: 2,
  msiCheckDigit: "mod10",
  pdfColumns: null,
  pdfEc: null,
  pngSize: 512,
  quietZone: 4,
  rotation: 0,
  routingCode: "",
  shape: "square",
  showText: false,
  size: 320,
  stackedColumns: null,
  text: "",
  textPosition: "bottom",
  unit: "px",
  aztecEcPercent: 23,
  dotcodeColumns: 0,
  dotcodeMask: -1,
  dotcodeRows: 0,
  hanxinEcLevel: 2,
  hanxinVersion: 0,
  code25CheckDigit: "none",
  version: null,
};

/** The Payload the Tool starts with, so the first screen holds a working code. */
const DEFAULT_PAYLOAD = "https://ritools.com";

/** The settings the server renders and the first screen shows. */
export const DEFAULT_SETTINGS: QraftSettings = {
  fields: { text: DEFAULT_PAYLOAD },
  output: "svg",
  payload: DEFAULT_PAYLOAD,
  preset: "text",
  style: DEFAULT_STYLE,
  symbology: "qr",
};

/** The defaults a preset form starts from. */
export const PRESET_DEFAULTS: Readonly<Record<PresetId, PresetValues>> = {
  email: {
    body: "",
    subject: "",
    to: "",
  },
  event: {
    description: "",
    end: "",
    location: "",
    start: "",
    title: "",
  },
  "gs1-digital-link": {
    batch: "",
    domain: "https://ritools.com",
    expiry: "",
    gtin: "",
    serial: "",
  },
  gs1qr: {
    expiry: "",
    gtin: "",
    lot: "",
    serial: "",
  },
  location: {
    latitude: "",
    longitude: "",
  },
  mecard: {
    address: "",
    email: "",
    name: "",
    phone: "",
    url: "",
  },
  phone: {
    number: "",
  },
  sms: {
    message: "",
    number: "",
  },
  swiss: {
    amount: "",
    creditorCity: "",
    creditorCountry: "CH",
    creditorName: "",
    creditorPostalCode: "",
    creditorStreet: "",
    currency: "CHF",
    iban: "",
    reference: "",
    referenceType: "NON",
  },
  text: {
    text: DEFAULT_PAYLOAD,
  },
  vcard: {
    address: "",
    email: "",
    firstName: "",
    lastName: "",
    org: "",
    phone: "",
    title: "",
    url: "",
  },
  wifi: {
    encryption: "WPA",
    hidden: "false",
    password: "",
    ssid: "",
  },
};

/* -------------------------------------------------------------------------- */
/* Payload Presets                                                             */
/* -------------------------------------------------------------------------- */

const CRLF = "\r\n";

/** Escapes a Wi-Fi or MeCard field. The scanner splits on these characters. */
const escapeWifi = (value: string): string =>
  value.replaceAll(/(?<char>[\\;,:"])/gu, "\\$<char>");

/** Escapes a vCard or iCalendar text value. */
const escapeText = (value: string): string =>
  value
    .replaceAll("\\", "\\\\")
    .replaceAll(/\r?\n/gu, "\\n")
    .replaceAll(";", "\\;")
    .replaceAll(",", "\\,");

const valueOf = (values: PresetValues, key: string): string =>
  (values[key] ?? "").trim();

const required = (fields: readonly string[], values: PresetValues) =>
  fields.every((field) => valueOf(values, field) !== "");

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/u;

const numberPattern = /^\+?[\d\s().-]{3,}$/u;

/** `2026-04-01T10:00` as an iCalendar local time, or null for bad input. */
const icsDate = (value: string): string | null => {
  if (value === "") {
    return null;
  }
  const match = value.match(
    /^(?<year>\d{4})-(?<month>\d{2})-(?<day>\d{2})(?:[T ](?<hour>\d{2}):(?<minute>\d{2}))?$/u
  );
  if (!match?.groups) {
    return null;
  }
  const { year, month, day, hour = "00", minute = "00" } = match.groups;
  return `${year}${month}${day}T${hour}${minute}00`;
};

/** Builds the Payload of one preset. It never touches the DOM. */
export const buildPreset = (
  preset: PresetId,
  values: PresetValues
): PresetBuild => {
  switch (preset) {
    case "text": {
      return { payload: valueOf(values, "text"), problem: null };
    }
    case "wifi": {
      if (!required(["ssid"], values)) {
        return { payload: "", problem: "required" };
      }
      const encryption = valueOf(values, "encryption") || "WPA";
      const hidden = valueOf(values, "hidden") === "true";
      const password =
        encryption === "nopass" ? "" : valueOf(values, "password");
      return {
        payload: `WIFI:T:${encryption};S:${escapeWifi(valueOf(values, "ssid"))};P:${escapeWifi(password)};${hidden ? "H:true;" : ""};`,
        problem: null,
      };
    }
    case "vcard": {
      if (!required(["firstName"], values)) {
        return { payload: "", problem: "required" };
      }
      const first = valueOf(values, "firstName");
      const last = valueOf(values, "lastName");
      const lines = [
        "BEGIN:VCARD",
        "VERSION:3.0",
        `N:${escapeText(last)};${escapeText(first)};;;`,
        `FN:${escapeText(`${first} ${last}`.trim())}`,
      ];
      const org = valueOf(values, "org");
      const title = valueOf(values, "title");
      const phone = valueOf(values, "phone");
      const email = valueOf(values, "email");
      const url = valueOf(values, "url");
      const address = valueOf(values, "address");
      if (org !== "") {
        lines.push(`ORG:${escapeText(org)}`);
      }
      if (title !== "") {
        lines.push(`TITLE:${escapeText(title)}`);
      }
      if (phone !== "") {
        lines.push(`TEL;TYPE=CELL:${escapeText(phone)}`);
      }
      if (email !== "") {
        lines.push(`EMAIL:${escapeText(email)}`);
      }
      if (url !== "") {
        lines.push(`URL:${escapeText(url)}`);
      }
      if (address !== "") {
        lines.push(`ADR;TYPE=WORK:;;${escapeText(address)};;;;`);
      }
      lines.push("END:VCARD");
      return { payload: lines.join(CRLF), problem: null };
    }
    case "mecard": {
      if (!required(["name"], values)) {
        return { payload: "", problem: "required" };
      }
      const parts = [`N:${escapeWifi(valueOf(values, "name"))}`];
      const phone = valueOf(values, "phone");
      const email = valueOf(values, "email");
      const url = valueOf(values, "url");
      const address = valueOf(values, "address");
      if (phone !== "") {
        parts.push(`TEL:${escapeWifi(phone)}`);
      }
      if (email !== "") {
        parts.push(`EMAIL:${escapeWifi(email)}`);
      }
      if (url !== "") {
        parts.push(`URL:${escapeWifi(url)}`);
      }
      if (address !== "") {
        parts.push(`ADR:${escapeWifi(address)}`);
      }
      return { payload: `MECARD:${parts.join(";")};;`, problem: null };
    }
    case "email": {
      if (!required(["to"], values)) {
        return { payload: "", problem: "required" };
      }
      const to = valueOf(values, "to");
      if (!emailPattern.test(to)) {
        return { payload: "", problem: "invalid-email" };
      }
      const query = new URLSearchParams();
      const subject = valueOf(values, "subject");
      const body = valueOf(values, "body");
      if (subject !== "") {
        query.set("subject", subject);
      }
      if (body !== "") {
        query.set("body", body);
      }
      const suffix = query.size > 0 ? `?${query.toString()}` : "";
      return { payload: `mailto:${to}${suffix}`, problem: null };
    }
    case "sms": {
      if (!required(["number"], values)) {
        return { payload: "", problem: "required" };
      }
      const number = valueOf(values, "number");
      if (!numberPattern.test(number)) {
        return { payload: "", problem: "invalid-number" };
      }
      const message = valueOf(values, "message");
      return {
        payload: `SMSTO:${number.replaceAll(/\s/gu, "")}:${message}`,
        problem: null,
      };
    }
    case "phone": {
      if (!required(["number"], values)) {
        return { payload: "", problem: "required" };
      }
      const number = valueOf(values, "number");
      if (!numberPattern.test(number)) {
        return { payload: "", problem: "invalid-number" };
      }
      return {
        payload: `tel:${number.replaceAll(/[^\d+]/gu, "")}`,
        problem: null,
      };
    }
    case "location": {
      if (!required(["latitude", "longitude"], values)) {
        return { payload: "", problem: "required" };
      }
      const latitude = Number(valueOf(values, "latitude"));
      const longitude = Number(valueOf(values, "longitude"));
      if (
        !Number.isFinite(latitude) ||
        !Number.isFinite(longitude) ||
        Math.abs(latitude) > 90 ||
        Math.abs(longitude) > 180
      ) {
        return { payload: "", problem: "invalid-coordinates" };
      }
      return {
        payload: `geo:${latitude.toFixed(6)},${longitude.toFixed(6)}`,
        problem: null,
      };
    }
    case "event": {
      if (!required(["title", "start"], values)) {
        return { payload: "", problem: "required" };
      }
      const start = icsDate(valueOf(values, "start"));
      const end = icsDate(valueOf(values, "end"));
      if (start === null || (valueOf(values, "end") !== "" && end === null)) {
        return { payload: "", problem: "invalid-date" };
      }
      const lines = [
        "BEGIN:VCALENDAR",
        "VERSION:2.0",
        "BEGIN:VEVENT",
        `SUMMARY:${escapeText(valueOf(values, "title"))}`,
        `DTSTART:${start}`,
      ];
      if (end !== null) {
        lines.push(`DTEND:${end}`);
      }
      const location = valueOf(values, "location");
      const description = valueOf(values, "description");
      if (location !== "") {
        lines.push(`LOCATION:${escapeText(location)}`);
      }
      if (description !== "") {
        lines.push(`DESCRIPTION:${escapeText(description)}`);
      }
      lines.push("END:VEVENT", "END:VCALENDAR");
      return { payload: lines.join(CRLF), problem: null };
    }
    case "swiss": {
      if (
        !required(
          [
            "iban",
            "creditorName",
            "creditorPostalCode",
            "creditorCity",
            "creditorCountry",
          ],
          values
        )
      ) {
        return { payload: "", problem: "required" };
      }
      const iban = valueOf(values, "iban").replaceAll(/\s/gu, "").toUpperCase();
      if (!/^[A-Z]{2}\d{2}[A-Z0-9]{4,30}$/u.test(iban)) {
        return { payload: "", problem: "invalid-iban" };
      }
      const amount = valueOf(values, "amount");
      if (amount !== "" && !/^\d+(?:[.,]\d{1,2})?$/u.test(amount)) {
        return { payload: "", problem: "invalid-amount" };
      }
      const street = valueOf(values, "creditorStreet");
      const referenceType = valueOf(values, "referenceType") || "NON";
      const reference = valueOf(values, "reference");
      if (referenceType !== "NON" && reference === "") {
        return { payload: "", problem: "required" };
      }
      const lines = [
        "SPC",
        "0200",
        "1",
        iban,
        "S",
        valueOf(values, "creditorName"),
        street,
        "",
        valueOf(values, "creditorPostalCode"),
        valueOf(values, "creditorCity"),
        valueOf(values, "creditorCountry").toUpperCase(),
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        amount.replace(",", "."),
        valueOf(values, "currency") || "CHF",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        referenceType,
        reference,
        "",
        "EPD",
      ];
      return { payload: lines.join(CRLF), problem: null };
    }
    case "gs1-digital-link": {
      if (!required(["gtin"], values)) {
        return { payload: "", problem: "required" };
      }
      const gtin = valueOf(values, "gtin");
      if (!/^\d{8,14}$/u.test(gtin)) {
        return { payload: "", problem: "invalid-gtin" };
      }
      const domain = (
        valueOf(values, "domain") || "https://ritools.com"
      ).replace(/\/+$/u, "");
      const path = `/01/${gtin}`;
      const query = new URLSearchParams();
      const expiry = valueOf(values, "expiry");
      const batch = valueOf(values, "batch");
      const serial = valueOf(values, "serial");
      if (expiry !== "") {
        query.set("17", expiry.replaceAll("-", "").slice(2));
      }
      if (batch !== "") {
        query.set("10", batch);
      }
      if (serial !== "") {
        query.set("21", serial);
      }
      const suffix = query.size > 0 ? `?${query.toString()}` : "";
      return { payload: `${domain}${path}${suffix}`, problem: null };
    }
    case "gs1qr": {
      if (!required(["gtin"], values)) {
        return { payload: "", problem: "required" };
      }
      const gtin = valueOf(values, "gtin");
      if (!/^\d{8,14}$/u.test(gtin)) {
        return { payload: "", problem: "invalid-gtin" };
      }
      const parts = [`(01)${gtin}`];
      const expiry = valueOf(values, "expiry");
      const lot = valueOf(values, "lot");
      const serial = valueOf(values, "serial");
      if (expiry !== "") {
        parts.push(`(17)${expiry.replaceAll("-", "").slice(2)}`);
      }
      if (lot !== "") {
        parts.push(`(10)${lot}`);
      }
      if (serial !== "") {
        parts.push(`(21)${serial}`);
      }
      return { payload: parts.join(""), problem: null };
    }
    default: {
      return { payload: "", problem: "required" };
    }
  }
};

/* -------------------------------------------------------------------------- */
/* Registry                                                                    */
/* -------------------------------------------------------------------------- */

interface SymbologyMeta {
  readonly family: CodeFamily;
  readonly labelTranslation: QraftKey;
  readonly hintTranslation: QraftKey;
  readonly controls: readonly Control[];
  /** The one validator the registry hands the UI and the tests. */
  readonly validate: (payload: string, style: QraftStyle) => Validation;
  /** The one renderer the registry hands the UI and the tests. */
  readonly render: (
    payload: string,
    style: QraftStyle,
    labels: RenderLabels
  ) => Promise<string>;
}

const QR_CONTROLS: readonly Control[] = [
  "dot",
  "corner",
  "gradient",
  "logo",
  "quietZone",
  "size",
  "ec",
  "version",
  "mode",
  "mask",
];

const MATRIX_CONTROLS: readonly Control[] = ["quietZone", "size"];

const LINEAR_CONTROLS: readonly Control[] = [
  "linear",
  "text",
  "textOverride",
  "rotation",
  "size",
];

const POSTAL_CONTROLS: readonly Control[] = [
  "linear",
  "text",
  "textOverride",
  "size",
];

const RAW_META = {
  auspost: {
    controls: POSTAL_CONTROLS,
    family: "postal",
    hintTranslation: "qraftHintAuspost",
    labelTranslation: "qraftNameAuspost",
  },
  aztec: {
    controls: [...MATRIX_CONTROLS, "aztecEc"],
    family: "2d",
    hintTranslation: "qraftHintAztec",
    labelTranslation: "qraftNameAztec",
  },
  code11: {
    controls: LINEAR_CONTROLS,
    family: "1d",
    hintTranslation: "qraftHintCode11",
    labelTranslation: "qraftNameCode11",
  },
  code128: {
    controls: [...LINEAR_CONTROLS, "code128Charset"],
    family: "1d",
    hintTranslation: "qraftHintCode128",
    labelTranslation: "qraftNameCode128",
  },
  code16k: {
    controls: MATRIX_CONTROLS,
    family: "2d",
    hintTranslation: "qraftHintCode16k",
    labelTranslation: "qraftNameCode16k",
  },
  code32: {
    controls: LINEAR_CONTROLS,
    family: "1d",
    hintTranslation: "qraftHintCode32",
    labelTranslation: "qraftNameCode32",
  },
  code39: {
    controls: [...LINEAR_CONTROLS, "code39CheckDigit"],
    family: "1d",
    hintTranslation: "qraftHintCode39",
    labelTranslation: "qraftNameCode39",
  },
  code39ext: {
    controls: [...LINEAR_CONTROLS, "code39CheckDigit"],
    family: "1d",
    hintTranslation: "qraftHintCode39ext",
    labelTranslation: "qraftNameCode39ext",
  },
  code93: {
    controls: LINEAR_CONTROLS,
    family: "1d",
    hintTranslation: "qraftHintCode93",
    labelTranslation: "qraftNameCode93",
  },
  code93ext: {
    controls: LINEAR_CONTROLS,
    family: "1d",
    hintTranslation: "qraftHintCode93ext",
    labelTranslation: "qraftNameCode93ext",
  },
  codabar: {
    controls: [...LINEAR_CONTROLS, "codabar"],
    family: "1d",
    hintTranslation: "qraftHintCodabar",
    labelTranslation: "qraftNameCodabar",
  },
  "codablock-f": {
    controls: [...MATRIX_CONTROLS, "stackedColumns"],
    family: "2d",
    hintTranslation: "qraftHintCodablockF",
    labelTranslation: "qraftNameCodablockF",
  },
  coop2of5: {
    controls: [...LINEAR_CONTROLS, "code25CheckDigit"],
    family: "1d",
    hintTranslation: "qraftHintCoop2of5",
    labelTranslation: "qraftNameCoop2of5",
  },
  datalogic2of5: {
    controls: [...LINEAR_CONTROLS, "code25CheckDigit"],
    family: "1d",
    hintTranslation: "qraftHintDatalogic2of5",
    labelTranslation: "qraftNameDatalogic2of5",
  },
  datamatrix: {
    controls: [...MATRIX_CONTROLS, "datamatrixShape"],
    family: "2d",
    hintTranslation: "qraftHintDatamatrix",
    labelTranslation: "qraftNameDatamatrix",
  },
  dotcode: {
    controls: [...MATRIX_CONTROLS, "dotcode"],
    family: "2d",
    hintTranslation: "qraftHintDotcode",
    labelTranslation: "qraftNameDotcode",
  },
  ean13: {
    controls: LINEAR_CONTROLS,
    family: "1d",
    hintTranslation: "qraftHintEan13",
    labelTranslation: "qraftNameEan13",
  },
  ean14: {
    controls: LINEAR_CONTROLS,
    family: "1d",
    hintTranslation: "qraftHintEan14",
    labelTranslation: "qraftNameEan14",
  },
  ean2: {
    controls: LINEAR_CONTROLS,
    family: "1d",
    hintTranslation: "qraftHintEan2",
    labelTranslation: "qraftNameEan2",
  },
  ean5: {
    controls: LINEAR_CONTROLS,
    family: "1d",
    hintTranslation: "qraftHintEan5",
    labelTranslation: "qraftNameEan5",
  },
  ean8: {
    controls: LINEAR_CONTROLS,
    family: "1d",
    hintTranslation: "qraftHintEan8",
    labelTranslation: "qraftNameEan8",
  },
  "gs1-128": {
    controls: LINEAR_CONTROLS,
    family: "1d",
    hintTranslation: "qraftHintGs1128",
    labelTranslation: "qraftNameGs1128",
  },
  "gs1-databar": {
    controls: LINEAR_CONTROLS,
    family: "1d",
    hintTranslation: "qraftHintGs1Databar",
    labelTranslation: "qraftNameGs1Databar",
  },
  "gs1-databar-expanded": {
    controls: LINEAR_CONTROLS,
    family: "1d",
    hintTranslation: "qraftHintGs1DatabarExpanded",
    labelTranslation: "qraftNameGs1DatabarExpanded",
  },
  "gs1-databar-limited": {
    controls: LINEAR_CONTROLS,
    family: "1d",
    hintTranslation: "qraftHintGs1DatabarLimited",
    labelTranslation: "qraftNameGs1DatabarLimited",
  },
  "gs1-databar-truncated": {
    controls: LINEAR_CONTROLS,
    family: "1d",
    hintTranslation: "qraftHintGs1DatabarTruncated",
    labelTranslation: "qraftNameGs1DatabarTruncated",
  },
  "gs1-datamatrix": {
    controls: [...MATRIX_CONTROLS, "datamatrixShape"],
    family: "2d",
    hintTranslation: "qraftHintGs1Datamatrix",
    labelTranslation: "qraftNameGs1Datamatrix",
  },
  hanxin: {
    controls: [...MATRIX_CONTROLS, "hanxin"],
    family: "2d",
    hintTranslation: "qraftHintHanxin",
    labelTranslation: "qraftNameHanxin",
  },
  iata2of5: {
    controls: [...LINEAR_CONTROLS, "code25CheckDigit"],
    family: "1d",
    hintTranslation: "qraftHintIata2of5",
    labelTranslation: "qraftNameIata2of5",
  },
  identcode: {
    controls: LINEAR_CONTROLS,
    family: "1d",
    hintTranslation: "qraftHintIdentcode",
    labelTranslation: "qraftNameIdentcode",
  },
  imb: {
    controls: [...POSTAL_CONTROLS, "routingCode"],
    family: "postal",
    hintTranslation: "qraftHintImb",
    labelTranslation: "qraftNameImb",
  },
  industrial2of5: {
    controls: [...LINEAR_CONTROLS, "code25CheckDigit"],
    family: "1d",
    hintTranslation: "qraftHintIndustrial2of5",
    labelTranslation: "qraftNameIndustrial2of5",
  },
  isbn: {
    controls: LINEAR_CONTROLS,
    family: "1d",
    hintTranslation: "qraftHintIsbn",
    labelTranslation: "qraftNameIsbn",
  },
  ismn: {
    controls: LINEAR_CONTROLS,
    family: "1d",
    hintTranslation: "qraftHintIsmn",
    labelTranslation: "qraftNameIsmn",
  },
  issn: {
    controls: LINEAR_CONTROLS,
    family: "1d",
    hintTranslation: "qraftHintIssn",
    labelTranslation: "qraftNameIssn",
  },
  itf: {
    controls: LINEAR_CONTROLS,
    family: "1d",
    hintTranslation: "qraftHintItf",
    labelTranslation: "qraftNameItf",
  },
  itf14: {
    controls: [...LINEAR_CONTROLS, "bearerBars"],
    family: "1d",
    hintTranslation: "qraftHintItf14",
    labelTranslation: "qraftNameItf14",
  },
  jppost: {
    controls: [...POSTAL_CONTROLS, "routingCode"],
    family: "postal",
    hintTranslation: "qraftHintJppost",
    labelTranslation: "qraftNameJppost",
  },
  kix: {
    controls: POSTAL_CONTROLS,
    family: "postal",
    hintTranslation: "qraftHintKix",
    labelTranslation: "qraftNameKix",
  },
  leitcode: {
    controls: LINEAR_CONTROLS,
    family: "1d",
    hintTranslation: "qraftHintLeitcode",
    labelTranslation: "qraftNameLeitcode",
  },
  matrix2of5: {
    controls: [...LINEAR_CONTROLS, "code25CheckDigit"],
    family: "1d",
    hintTranslation: "qraftHintMatrix2of5",
    labelTranslation: "qraftNameMatrix2of5",
  },
  maxicode: {
    controls: [...MATRIX_CONTROLS, "maxicode"],
    family: "2d",
    hintTranslation: "qraftHintMaxicode",
    labelTranslation: "qraftNameMaxicode",
  },
  micropdf417: {
    controls: [...MATRIX_CONTROLS, "pdfColumns"],
    family: "2d",
    hintTranslation: "qraftHintMicropdf417",
    labelTranslation: "qraftNameMicropdf417",
  },
  microqr: {
    controls: ["quietZone", "size", "ec", "version", "mask"],
    family: "qr",
    hintTranslation: "qraftHintMicroqr",
    labelTranslation: "qraftNameMicroqr",
  },
  msi: {
    controls: [...LINEAR_CONTROLS, "msiCheckDigit"],
    family: "1d",
    hintTranslation: "qraftHintMsi",
    labelTranslation: "qraftNameMsi",
  },
  pdf417: {
    controls: [...MATRIX_CONTROLS, "pdfColumns", "pdfEc"],
    family: "2d",
    hintTranslation: "qraftHintPdf417",
    labelTranslation: "qraftNamePdf417",
  },
  pharmacode: {
    controls: LINEAR_CONTROLS,
    family: "1d",
    hintTranslation: "qraftHintPharmacode",
    labelTranslation: "qraftNamePharmacode",
  },
  planet: {
    controls: POSTAL_CONTROLS,
    family: "postal",
    hintTranslation: "qraftHintPlanet",
    labelTranslation: "qraftNamePlanet",
  },
  plessey: {
    controls: LINEAR_CONTROLS,
    family: "1d",
    hintTranslation: "qraftHintPlessey",
    labelTranslation: "qraftNamePlessey",
  },
  postnet: {
    controls: POSTAL_CONTROLS,
    family: "postal",
    hintTranslation: "qraftHintPostnet",
    labelTranslation: "qraftNamePostnet",
  },
  pzn: {
    controls: LINEAR_CONTROLS,
    family: "1d",
    hintTranslation: "qraftHintPzn",
    labelTranslation: "qraftNamePzn",
  },
  pzn8: {
    controls: LINEAR_CONTROLS,
    family: "1d",
    hintTranslation: "qraftHintPzn8",
    labelTranslation: "qraftNamePzn8",
  },
  qr: {
    controls: QR_CONTROLS,
    family: "qr",
    hintTranslation: "qraftHintQr",
    labelTranslation: "qraftNameQr",
  },
  rmqr: {
    controls: ["quietZone", "size", "ec", "version"],
    family: "qr",
    hintTranslation: "qraftHintRmqr",
    labelTranslation: "qraftNameRmqr",
  },
  rm4scc: {
    controls: POSTAL_CONTROLS,
    family: "postal",
    hintTranslation: "qraftHintRm4scc",
    labelTranslation: "qraftNameRm4scc",
  },
  sscc18: {
    controls: LINEAR_CONTROLS,
    family: "1d",
    hintTranslation: "qraftHintSscc18",
    labelTranslation: "qraftNameSscc18",
  },
  upca: {
    controls: LINEAR_CONTROLS,
    family: "1d",
    hintTranslation: "qraftHintUpca",
    labelTranslation: "qraftNameUpca",
  },
  upce: {
    controls: LINEAR_CONTROLS,
    family: "1d",
    hintTranslation: "qraftHintUpce",
    labelTranslation: "qraftNameUpce",
  },
} as const satisfies Readonly<
  Record<SymbologyId, Omit<SymbologyMeta, "render" | "validate">>
>;

/**
 * The registry with the two functions every entry must carry. The closures
 * call the render and validation seams, so the UI never switches on an id.
 */
const SYMBOLOGY_META = Object.fromEntries(
  Object.entries(RAW_META).map(([id, entry]) => [
    id,
    {
      ...entry,
      render: (payload: string, style: QraftStyle, labels: RenderLabels) =>
        renderSvg(
          {
            fields: {},
            output: "svg",
            payload,
            preset: "text",
            style,
            symbology: id as SymbologyId,
          },
          labels
        ),
      validate: (payload: string, style: QraftStyle) =>
        validatePayload(id as SymbologyId, payload, style),
    },
  ])
) as {
  [K in keyof typeof RAW_META]: (typeof RAW_META)[K] &
    Pick<SymbologyMeta, "render" | "validate">;
};

/** The name of a family in the picker. */
export const FAMILY_LABEL_KEY = {
  "1d": "qraftFamily1d",
  "2d": "qraftFamily2d",
  postal: "qraftFamilyPostal",
  qr: "qraftFamilyQr",
} as const satisfies Readonly<Record<CodeFamily, QraftKey>>;

/** The presets a form shows, main set first. */
export const PRESET_FIELD_SPECS = {
  email: [
    {
      kind: "text",
      labelTranslation: "qraftFieldTo",
      name: "to",
      placeholder: "email",
    },
    { kind: "text", labelTranslation: "qraftFieldSubject", name: "subject" },
    { kind: "textarea", labelTranslation: "qraftFieldBody", name: "body" },
  ],
  event: [
    { kind: "text", labelTranslation: "qraftFieldTitle", name: "title" },
    { kind: "date", labelTranslation: "qraftFieldStart", name: "start" },
    { kind: "date", labelTranslation: "qraftFieldEnd", name: "end" },
    { kind: "text", labelTranslation: "qraftFieldLocation", name: "location" },
    {
      kind: "textarea",
      labelTranslation: "qraftFieldDescription",
      name: "description",
    },
  ],
  "gs1-digital-link": [
    {
      kind: "text",
      labelTranslation: "qraftFieldDomain",
      name: "domain",
      placeholder: "url",
    },
    { kind: "text", labelTranslation: "qraftFieldGtin", name: "gtin" },
    { kind: "text", labelTranslation: "qraftFieldBatch", name: "batch" },
    { kind: "text", labelTranslation: "qraftFieldSerial", name: "serial" },
    { kind: "date", labelTranslation: "qraftFieldExpiry", name: "expiry" },
  ],
  gs1qr: [
    { kind: "text", labelTranslation: "qraftFieldGtin", name: "gtin" },
    { kind: "text", labelTranslation: "qraftFieldLot", name: "lot" },
    { kind: "text", labelTranslation: "qraftFieldSerial", name: "serial" },
    { kind: "date", labelTranslation: "qraftFieldExpiry", name: "expiry" },
  ],
  location: [
    {
      kind: "number",
      labelTranslation: "qraftFieldLatitude",
      name: "latitude",
      placeholder: "number",
    },
    {
      kind: "number",
      labelTranslation: "qraftFieldLongitude",
      name: "longitude",
      placeholder: "number",
    },
  ],
  mecard: [
    { kind: "text", labelTranslation: "qraftFieldName", name: "name" },
    {
      kind: "text",
      labelTranslation: "qraftFieldPhone",
      name: "phone",
      placeholder: "tel",
    },
    {
      kind: "text",
      labelTranslation: "qraftFieldEmail",
      name: "email",
      placeholder: "email",
    },
    {
      kind: "text",
      labelTranslation: "qraftFieldUrl",
      name: "url",
      placeholder: "url",
    },
    { kind: "text", labelTranslation: "qraftFieldAddress", name: "address" },
  ],
  phone: [
    {
      kind: "text",
      labelTranslation: "qraftFieldNumber",
      name: "number",
      placeholder: "tel",
    },
  ],
  sms: [
    {
      kind: "text",
      labelTranslation: "qraftFieldNumber",
      name: "number",
      placeholder: "tel",
    },
    {
      kind: "textarea",
      labelTranslation: "qraftFieldMessage",
      name: "message",
    },
  ],
  swiss: [
    { kind: "text", labelTranslation: "qraftFieldIban", name: "iban" },
    {
      kind: "text",
      labelTranslation: "qraftFieldCreditorName",
      name: "creditorName",
    },
    {
      kind: "text",
      labelTranslation: "qraftFieldCreditorStreet",
      name: "creditorStreet",
    },
    {
      kind: "text",
      labelTranslation: "qraftFieldCreditorPostal",
      name: "creditorPostalCode",
    },
    {
      kind: "text",
      labelTranslation: "qraftFieldCreditorCity",
      name: "creditorCity",
    },
    {
      kind: "text",
      labelTranslation: "qraftFieldCreditorCountry",
      name: "creditorCountry",
    },
    {
      kind: "number",
      labelTranslation: "qraftFieldAmount",
      name: "amount",
      placeholder: "number",
    },
    {
      kind: "select",
      labelTranslation: "qraftFieldCurrency",
      name: "currency",
      options: ["CHF", "EUR"],
    },
    {
      kind: "select",
      labelTranslation: "qraftFieldReferenceType",
      name: "referenceType",
      options: ["NON", "QRR", "SCOR"],
    },
    {
      kind: "text",
      labelTranslation: "qraftFieldReference",
      name: "reference",
    },
  ],
  text: [
    { kind: "textarea", labelTranslation: "qraftFieldText", name: "text" },
  ],
  vcard: [
    {
      kind: "text",
      labelTranslation: "qraftFieldFirstName",
      name: "firstName",
    },
    { kind: "text", labelTranslation: "qraftFieldLastName", name: "lastName" },
    { kind: "text", labelTranslation: "qraftFieldOrg", name: "org" },
    { kind: "text", labelTranslation: "qraftFieldJobTitle", name: "title" },
    {
      kind: "text",
      labelTranslation: "qraftFieldPhone",
      name: "phone",
      placeholder: "tel",
    },
    {
      kind: "text",
      labelTranslation: "qraftFieldEmail",
      name: "email",
      placeholder: "email",
    },
    {
      kind: "text",
      labelTranslation: "qraftFieldUrl",
      name: "url",
      placeholder: "url",
    },
    { kind: "text", labelTranslation: "qraftFieldAddress", name: "address" },
  ],
  wifi: [
    { kind: "text", labelTranslation: "qraftFieldSsid", name: "ssid" },
    {
      kind: "text",
      labelTranslation: "qraftFieldPassword",
      name: "password",
      placeholder: "password",
    },
    {
      kind: "select",
      labelTranslation: "qraftFieldEncryption",
      name: "encryption",
      options: ["WPA", "WEP", "nopass"],
    },
    { kind: "checkbox", labelTranslation: "qraftFieldHidden", name: "hidden" },
  ],
} as const satisfies Readonly<Record<PresetId, readonly PresetFieldSpec[]>>;

/* -------------------------------------------------------------------------- */
/* Validation                                                                  */
/* -------------------------------------------------------------------------- */

export type QraftProblem =
  | "barcode-input"
  | "empty"
  | "postal-input"
  | "qr-capacity"
  | "preset";

export interface Validation {
  readonly valid: boolean;
  readonly problem: QraftProblem | null;
}

const VALID: Validation = { problem: null, valid: true };
const invalid = (problem: QraftProblem): Validation => ({
  problem,
  valid: false,
});

const isLinear = (id: SymbologyId): id is LinearType =>
  (LINEAR_TYPES as readonly string[]).includes(id);

const isPostal = (id: SymbologyId): id is PostalSymbology =>
  (POSTAL_TYPES as readonly string[]).includes(id);

/** The digits in a postal Payload, with the hyphens and spaces a user types. */
const postalDigits = (payload: string): string =>
  payload.replaceAll(/[\s-]/gu, "");

const validatePostal = (id: PostalSymbology, payload: string): Validation => {
  const digits = postalDigits(payload);
  switch (id) {
    case "postnet": {
      return [5, 9, 11].includes(digits.length) && /^\d+$/u.test(digits)
        ? VALID
        : invalid("postal-input");
    }
    case "planet": {
      return [11, 13].includes(digits.length) && /^\d+$/u.test(digits)
        ? VALID
        : invalid("postal-input");
    }
    case "rm4scc": {
      return /^[A-Z0-9]{1,9}$/u.test(payload.toUpperCase())
        ? VALID
        : invalid("postal-input");
    }
    case "kix": {
      return /^[A-Z0-9]{1,6}$/u.test(payload.toUpperCase())
        ? VALID
        : invalid("postal-input");
    }
    case "auspost": {
      return /^\d{8}$/u.test(digits) ? VALID : invalid("postal-input");
    }
    case "jppost": {
      return /^\d{1,13}$/u.test(digits) ? VALID : invalid("postal-input");
    }
    case "imb": {
      return /^\d{20}$/u.test(digits) ? VALID : invalid("postal-input");
    }
    default: {
      return invalid("postal-input");
    }
  }
};

const clampMicroVersion = (version: number): 1 | 2 | 3 | 4 =>
  Math.min(4, Math.max(1, Math.round(version))) as 1 | 2 | 3 | 4;

/** Validates a Payload against the chosen Symbology. */
export const validatePayload = (
  id: SymbologyId,
  payload: string,
  style: QraftStyle = DEFAULT_STYLE
): Validation => {
  if (payload.trim() === "") {
    return invalid("empty");
  }
  if (id === "qr") {
    const result = validateQRInput(payload, style.logo ? "H" : style.ecLevel);
    return result.valid ? VALID : invalid("qr-capacity");
  }
  if (id === "microqr") {
    try {
      encodeMicroQR(payload, {
        ecLevel: style.ecLevel === "H" ? "Q" : style.ecLevel,
        version:
          style.version === null ? undefined : clampMicroVersion(style.version),
      });
      return VALID;
    } catch {
      return invalid("qr-capacity");
    }
  }
  if (id === "rmqr") {
    try {
      encodeRMQR(payload, {
        ecLevel: style.ecLevel === "H" ? "H" : "M",
        version: style.version ?? undefined,
      });
      return VALID;
    } catch {
      return invalid("qr-capacity");
    }
  }
  if (isLinear(id)) {
    const result = validateBarcode(payload, id);
    return result.valid ? VALID : invalid("barcode-input");
  }
  if (isPostal(id)) {
    return validatePostal(id, payload);
  }
  const capacity = MATRIX_CAPACITY[id as MatrixType];
  if (capacity !== undefined && payload.length > capacity) {
    return invalid("barcode-input");
  }
  if (
    id === "dotcode" &&
    style.dotcodeRows > 0 &&
    style.dotcodeColumns > 0 &&
    (style.dotcodeRows + style.dotcodeColumns) % 2 === 0
  ) {
    return invalid("barcode-input");
  }
  if (
    id === "maxicode" &&
    (style.maxicodeMode === 2 || style.maxicodeMode === 3) &&
    style.maxicodePostal.trim() === ""
  ) {
    return invalid("barcode-input");
  }
  return VALID;
};

/** The highest Payload length each matrix Symbology can hold, in characters. */
const MATRIX_CAPACITY: Readonly<Partial<Record<MatrixType, number>>> = {
  aztec: 1914,
  "codablock-f": 2725,
  code16k: 3000,
  datamatrix: 1558,
  dotcode: 1000,
  "gs1-datamatrix": 1558,
  hanxin: 2000,
  maxicode: 93,
  micropdf417: 150,
  pdf417: 925,
};

/** The Error Correction levels a Symbology accepts. */
export const ecLevelsOf = (
  id: SymbologyId
): readonly ("H" | "L" | "M" | "Q")[] => {
  if (id === "microqr") {
    return ["L", "M", "Q"];
  }
  if (id === "rmqr") {
    return ["M", "H"];
  }
  return ["L", "M", "Q", "H"];
};

/** Validates a preset form before its Payload is built. */
export const validatePreset = (
  preset: PresetId,
  values: PresetValues
): Validation => {
  const built = buildPreset(preset, values);
  if (built.problem !== null) {
    return invalid("preset");
  }
  return built.payload === "" ? invalid("empty") : VALID;
};

/**
 * The Preview and the download need a valid Payload. A preset form is a
 * helper: once the Raw Payload is valid, an unfinished form does not block it.
 */
export const validateSettings = (settings: QraftSettings): Validation => {
  const payload = validatePayload(
    settings.symbology,
    settings.payload,
    settings.style
  );
  if (payload.valid) {
    return payload;
  }
  const preset = validatePreset(settings.preset, settings.fields);
  return preset.valid ? payload : preset;
};

/* -------------------------------------------------------------------------- */
/* Scan Warnings                                                               */
/* -------------------------------------------------------------------------- */

export type ScanWarningId =
  | "gradient-stop"
  | "inverted"
  | "logo-size"
  | "low-contrast"
  | "near-capacity"
  | "quiet-zone";

export interface ScanWarning {
  readonly id: ScanWarningId;
  /** The measured value a Message prints, when the warning has one. */
  readonly value?: number;
}

const hexRgb = (color: string): [number, number, number] | null => {
  const value = color.trim().replace(/^#/u, "");
  if (/^[\dA-Fa-f]{3}$/u.test(value)) {
    const [r, g, b] = value;
    return [
      Number.parseInt(`${r}${r}`, 16),
      Number.parseInt(`${g}${g}`, 16),
      Number.parseInt(`${b}${b}`, 16),
    ];
  }
  if (/^[\dA-Fa-f]{6}$/u.test(value)) {
    return [
      Number.parseInt(value.slice(0, 2), 16),
      Number.parseInt(value.slice(2, 4), 16),
      Number.parseInt(value.slice(4, 6), 16),
    ];
  }
  return null;
};

/** WCAG relative luminance of an sRGB colour. */
const luminance = (color: string): number | null => {
  const rgb = hexRgb(color);
  if (rgb === null) {
    return null;
  }
  const [r, g, b] = rgb.map((value) => {
    const channel = value / 255;
    return channel <= 0.03928
      ? channel / 12.92
      : ((channel + 0.055) / 1.055) ** 2.4;
  }) as [number, number, number];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

const contrast = (a: string, b: string): number | null => {
  const first = luminance(a);
  const second = luminance(b);
  if (first === null || second === null) {
    return null;
  }
  const light = Math.max(first, second);
  const dark = Math.min(first, second);
  return (light + 0.05) / (dark + 0.05);
};

const showsQuietZone = (id: SymbologyId): boolean =>
  id === "qr" ||
  id === "microqr" ||
  id === "rmqr" ||
  (MATRIX_TYPES as readonly string[]).includes(id);

/**
 * The styling conditions that can make a code hard to scan.
 *
 * A Scan Warning is a note, never a blocker: the user can choose to download
 * the code as it is. Invalid input is a separate result, and it does block.
 */
export const scanWarnings = (
  settings: QraftSettings
): readonly ScanWarning[] => {
  const { style } = settings;
  const warnings: ScanWarning[] = [];
  const ratio = contrast(style.fg, style.bg);
  if (ratio !== null && ratio < 3) {
    warnings.push({ id: "low-contrast", value: Math.round(ratio * 10) / 10 });
  }
  const fg = luminance(style.fg);
  const bg = luminance(style.bg);
  if (fg !== null && bg !== null && fg > bg) {
    warnings.push({ id: "inverted" });
  }
  if (style.logo !== null && style.logoSize > 30) {
    warnings.push({ id: "logo-size", value: style.logoSize });
  }
  if (showsQuietZone(settings.symbology) && style.quietZone < 4) {
    warnings.push({ id: "quiet-zone", value: style.quietZone });
  }
  if (style.gradient !== "none") {
    const stop = contrast(style.gradientEnd, style.bg);
    if (stop !== null && stop < 3) {
      warnings.push({ id: "gradient-stop" });
    }
  }
  if (settings.symbology === "qr") {
    const result = validateQRInput(
      settings.payload,
      style.logo ? "H" : style.ecLevel
    );
    if (
      result.valid &&
      result.dataLength !== undefined &&
      result.maxCapacity !== undefined &&
      result.maxCapacity > 0 &&
      result.dataLength / result.maxCapacity >= 0.8
    ) {
      warnings.push({
        id: "near-capacity",
        value: Math.round((result.dataLength / result.maxCapacity) * 100),
      });
    }
  }
  return warnings;
};

/* -------------------------------------------------------------------------- */
/* Settings transitions                                                        */
/* -------------------------------------------------------------------------- */

/** Every Symbology of one family, in registry order. */
export const symbologiesOf = (family: CodeFamily): readonly SymbologyId[] =>
  SYMBOLOGY_IDS.filter((id) => SYMBOLOGY_META[id].family === family);

/** The Symbology a family opens on. */
export const defaultSymbologyOf = (family: CodeFamily): SymbologyId => {
  const [first] = symbologiesOf(family);
  /* v8 ignore start -- @preserve Every Code Family has at least one Symbology in the registry. */
  if (first === undefined) {
    throw new Error(`Qraft has no Symbology for the ${family} family.`);
  }
  /* v8 ignore stop -- @preserve */
  return first;
};

/** The family a Symbology belongs to. */
export const familyOf = (id: SymbologyId): CodeFamily =>
  SYMBOLOGY_META[id].family;

/** The registry entry of one Symbology. */
export const symbologyOf = (id: SymbologyId) => SYMBOLOGY_META[id];

/** Whether a Symbology shows a control. */
export const hasControl = (id: SymbologyId, control: Control): boolean =>
  (SYMBOLOGY_META[id].controls as readonly Control[]).includes(control);

/** The settings that a Symbology choice makes, with an Error Correction it accepts. */
export const selectSymbology = (
  settings: QraftSettings,
  symbology: SymbologyId
): QraftSettings => {
  const levels = ecLevelsOf(symbology);
  const ecLevel = levels.includes(settings.style.ecLevel)
    ? settings.style.ecLevel
    : "M";
  return {
    ...settings,
    symbology,
    style: { ...settings.style, ecLevel },
  };
};

/** The settings that a family choice makes. */
export const selectFamily = (
  settings: QraftSettings,
  family: CodeFamily
): QraftSettings => selectSymbology(settings, defaultSymbologyOf(family));

/** The settings that a preset choice makes, with its defaults filled in. */
export const selectPreset = (
  settings: QraftSettings,
  preset: PresetId
): QraftSettings => {
  const fields = PRESET_DEFAULTS[preset];
  const built = buildPreset(preset, fields);
  return {
    ...settings,
    fields,
    payload: built.payload,
    preset,
    style: {
      ...settings.style,
      ecLevel: preset === "swiss" ? "M" : settings.style.ecLevel,
      gs1: preset === "gs1qr",
    },
    symbology: "qr",
  };
};

/** The settings that a preset field change makes. */
export const setPresetField = (
  settings: QraftSettings,
  name: string,
  value: string
): QraftSettings => {
  // A field name is untrusted input: build the record from pairs, never by
  // bracket assignment, so a name such as `__proto__` cannot reach the shape.
  const fields = Object.fromEntries(
    new Map([...Object.entries(settings.fields), [name, value]])
  );
  const built = buildPreset(settings.preset, fields);
  return { ...settings, fields, payload: built.payload };
};

/** The settings that a Raw Payload change makes. */
export const setPayload = (
  settings: QraftSettings,
  payload: string
): QraftSettings => ({
  ...settings,
  fields:
    settings.preset === "text"
      ? { ...settings.fields, text: payload }
      : settings.fields,
  payload,
  style: {
    ...settings.style,
    gs1: settings.preset === "gs1qr" && payload.trimStart().startsWith("("),
  },
});

/** The settings that Clear makes: an empty Payload, ready for a new code. */
export const clearPayload = (settings: QraftSettings): QraftSettings => ({
  ...settings,
  fields: PRESET_DEFAULTS.text,
  payload: "",
  preset: "text",
  style: { ...settings.style, gs1: false },
});

/** The style change a control makes. */
export const setStyle = (
  settings: QraftSettings,
  style: Partial<QraftStyle>
): QraftSettings => ({ ...settings, style: { ...settings.style, ...style } });

/** The output format a control makes. */
export const setOutput = (
  settings: QraftSettings,
  output: OutputFormat
): QraftSettings => ({ ...settings, output });

/* -------------------------------------------------------------------------- */
/* File names                                                                  */
/* -------------------------------------------------------------------------- */

const MAX_SLUG = 48;

/** A file-safe slug. An empty result falls back to the Symbology id. */
export const slugOf = (value: string, fallback = "code"): string => {
  const slug = value
    .normalize("NFKD")
    .replaceAll(/[\u0300-\u036F]/gu, "")
    .toLowerCase()
    .replaceAll(/[^a-z0-9]+/gu, "-")
    .replaceAll(/^-+|-+$/gu, "")
    .slice(0, MAX_SLUG)
    .replace(/-+$/u, "");
  return slug === "" ? fallback : slug;
};

/**
 * The slug a download uses.
 *
 * A secret Payload never lands in a file name: a Wi-Fi, contact, or payment
 * preset names itself instead.
 */
const fileSlugOf = (settings: QraftSettings): string =>
  settings.preset === "text"
    ? slugOf(settings.payload, settings.symbology)
    : slugOf(settings.preset, settings.symbology);

/** The MIME type of an output file. */
export const MIME_OF: Readonly<Record<OutputFormat, string>> = {
  png: "image/png",
  svg: "image/svg+xml",
};

/** The name of a single download. */
export const fileNameOf = (
  settings: QraftSettings,
  format: OutputFormat = settings.output
): string => `qraft-${fileSlugOf(settings)}.${format}`;

/** The name of a Batch member inside the ZIP. */
export const batchFileNameOf = (
  index: number,
  label: string,
  format: OutputFormat
): string => {
  const ordinal = String(index + 1).padStart(3, "0");
  return label === ""
    ? `qraft-${ordinal}.${format}`
    : `qraft-${ordinal}-${slugOf(label)}.${format}`;
};

/** The name of a Label Sheet. */
export const SHEET_NAME_OF: Readonly<Record<OutputFormat, string>> = {
  png: "qraft-sheet.png",
  svg: "qraft-sheet.svg",
};

/** The name of a Batch ZIP. */
export const ZIP_NAME = "qraft-codes.zip";

/* -------------------------------------------------------------------------- */
/* Batch                                                                       */
/* -------------------------------------------------------------------------- */

/** The count above which the Tool warns that the device may be slow. */
export const BATCH_WARN_AT = 500;

export interface BatchEntry {
  readonly payload: string;
  /** The caption the user gave. Empty when the input had no label. */
  readonly label: string;
}

/** One Payload per line. Empty lines and surrounding spaces are dropped. */
export const parseBatchLines = (text: string): BatchEntry[] =>
  text
    .split(/\r?\n/gu)
    .map((line) => line.trim())
    .filter((line) => line !== "")
    .map((line) => ({ label: "", payload: line }));

const isHeader = (row: readonly string[]): boolean => {
  const first = (row[0] ?? "").trim().toLowerCase();
  const second = (row[1] ?? "").trim().toLowerCase();
  return (
    (first === "payload" && (second === "label" || second === "")) ||
    (first === "label" && second === "payload")
  );
};

/**
 * A CSV of Payloads, with an optional `label` column.
 *
 * The header is optional. With one, the columns are read by name. Without
 * one, the first column is the Payload and the second is the label.
 */
export const parseBatchCsv = (text: string): BatchEntry[] => {
  const rows = Papa.parse<string[]>(text.replace(/^\uFEFF/u, ""), {
    skipEmptyLines: "greedy",
  }).data;
  const [first, ...rest] = rows;
  if (first === undefined) {
    return [];
  }
  const header = isHeader(first);
  const columns = header
    ? {
        label: first.findIndex((cell) => cell.trim().toLowerCase() === "label"),
        payload: first.findIndex(
          (cell) => cell.trim().toLowerCase() === "payload"
        ),
      }
    : { label: 1, payload: 0 };
  const body = header ? rest : rows;
  const entries: BatchEntry[] = [];
  for (const row of body) {
    const payload = (row[columns.payload] ?? "").trim();
    if (payload !== "") {
      entries.push({
        label: columns.label < 0 ? "" : (row[columns.label] ?? "").trim(),
        payload,
      });
    }
  }
  return entries;
};

/**
 * Reads pasted Batch text.
 *
 * A header row means a CSV; anything else is one Payload per line. A pasted
 * CSV without a header is read as lines on purpose, because a Payload may
 * itself hold a comma.
 */
export const parseBatchText = (text: string): BatchEntry[] => {
  const [first] = Papa.parse<string[]>(text, { preview: 1 }).data;
  return first !== undefined && isHeader(first)
    ? parseBatchCsv(text)
    : parseBatchLines(text);
};

/** The cap warning: a Batch above 500 codes may make the device slow. */
export const batchWarns = (count: number): boolean => count > BATCH_WARN_AT;

/* -------------------------------------------------------------------------- */
/* Rendering                                                                   */
/* -------------------------------------------------------------------------- */

/** The accessible names a render call prints. The Payload is never one. */
export interface RenderLabels {
  readonly title: string;
  readonly desc: string;
}

const UNIT_SUFFIX: Readonly<Record<Unit, string>> = {
  cm: "cm",
  in: "in",
  mm: "mm",
  pt: "pt",
  px: "",
};

/**
 * Writes the file's width and height in the chosen unit.
 *
 * The height follows the drawing's viewBox, so a rectangular code keeps its
 * aspect ratio instead of being stretched to a square.
 */
const withUnit = (svg: string, width: number, unit: Unit): string => {
  if (unit === "px") {
    return svg;
  }
  const opening = svg.match(/^<svg\b[^>]*>/u)?.[0];
  if (!opening) {
    return svg;
  }
  const box = opening
    .match(/viewBox="(?<box>[^"]+)"/u)
    ?.groups?.box?.split(/\s+/u)
    .map(Number);
  const boxWidth = box?.[2];
  const boxHeight = box?.[3];
  const height =
    boxWidth !== undefined && boxHeight !== undefined && boxWidth > 0
      ? Math.round(width * (boxHeight / boxWidth) * 100) / 100
      : width;
  const suffix = UNIT_SUFFIX[unit];
  const next = opening
    .replace(/\swidth="[^"]*"/u, ` width="${width}${suffix}"`)
    .replace(/\sheight="[^"]*"/u, ` height="${height}${suffix}"`);
  return svg.replace(opening, next);
};

/** The accessibility attributes every renderer receives. */
const a11y = (labels: RenderLabels) => ({
  ariaLabel: labels.title,
  desc: labels.desc,
  title: labels.title,
});

/** The gradient the QR renderer draws, or the solid foreground. */
const qrColor = (style: QraftStyle) => {
  if (style.gradient === "none") {
    return style.fg;
  }
  const gradient = {
    stops: [
      { color: style.fg, offset: 0 },
      { color: style.gradientEnd, offset: 1 },
    ],
    type: style.gradient,
  };
  if (style.gradient === "linear") {
    return { ...gradient, rotation: style.gradientRotation };
  }
  return gradient;
};

const qrOptions = (style: QraftStyle, labels: RenderLabels) => ({
  ...a11y(labels),
  background: style.bg,
  color: qrColor(style),
  corners: {
    bottomLeft: {
      innerColor: style.cornerColor,
      innerShape: style.cornerInner,
      outerColor: style.cornerColor,
      outerShape: style.cornerOuter,
    },
    topLeft: {
      innerColor: style.cornerColor,
      innerShape: style.cornerInner,
      outerColor: style.cornerColor,
      outerShape: style.cornerOuter,
    },
    topRight: {
      innerColor: style.cornerColor,
      innerShape: style.cornerInner,
      outerColor: style.cornerColor,
      outerShape: style.cornerOuter,
    },
  },
  dotSize: style.dotSize,
  dotType: style.dotType,
  ecLevel: style.logo ? ("H" as const) : style.ecLevel,
  gs1: style.gs1 || undefined,
  logo:
    style.logo === null
      ? undefined
      : {
          backgroundColor: style.logoBackground,
          hideBackgroundDots: style.logoHideDots,
          imageUrl: style.logo.dataUri,
          margin: style.logoMargin,
          size: Math.min(0.5, Math.max(0.1, style.logoSize / 100)),
        },
  margin: style.quietZone,
  mask:
    style.mask === null
      ? undefined
      : (Math.min(7, Math.max(0, style.mask)) as 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7),
  mode: style.mode,
  shape: style.shape,
  size: style.size,
  unit: style.unit,
  version: style.version ?? undefined,
});

const matrixOptions = (style: QraftStyle, labels: RenderLabels) => ({
  ...a11y(labels),
  background: style.bg,
  color: style.fg,
  margin: style.quietZone,
  size: style.size,
});

/** The QR family SVG. It is synchronous, so the default renders on the server. */
export const renderQrSvg = (
  settings: QraftSettings,
  labels: RenderLabels
): string => {
  const { style, payload } = settings;
  if (settings.symbology === "microqr") {
    return withUnit(
      microqr(payload, {
        ...matrixOptions(style, labels),
        ecLevel: style.ecLevel === "H" ? "Q" : style.ecLevel,
        mask:
          style.mask === null
            ? undefined
            : (Math.min(3, Math.max(0, style.mask)) as 0 | 1 | 2 | 3),
        version:
          style.version === null ? undefined : clampMicroVersion(style.version),
      }),
      style.size,
      style.unit
    );
  }
  if (settings.symbology === "rmqr") {
    return withUnit(
      rmqr(payload, {
        ...matrixOptions(style, labels),
        ecLevel: style.ecLevel === "H" ? "H" : "M",
        version: style.version ?? undefined,
      }),
      style.size,
      style.unit
    );
  }
  return withUnit(
    qrcode(payload, qrOptions(style, labels)),
    style.size,
    style.unit
  );
};

const clampMicroPdfColumns = (columns: number): 1 | 2 | 3 | 4 =>
  Math.min(4, Math.max(1, Math.round(columns))) as 1 | 2 | 3 | 4;

/** The 2D SVG that is not a QR. The family loads on first use. */
const renderMatrixSvg = async (
  id: MatrixType,
  payload: string,
  style: QraftStyle,
  labels: RenderLabels
): Promise<string> => {
  const options = matrixOptions(style, labels);
  if (id === "datamatrix" || id === "gs1-datamatrix") {
    const { datamatrix, gs1datamatrix } = await import("etiket/datamatrix");
    const svg =
      id === "datamatrix"
        ? datamatrix(payload, { ...options, shape: style.datamatrixShape })
        : gs1datamatrix(payload, { ...options, shape: style.datamatrixShape });
    return withUnit(svg, style.size, style.unit);
  }
  if (id === "pdf417" || id === "micropdf417") {
    const { micropdf417, pdf417 } = await import("etiket/pdf417");
    const width = style.size;
    const height = Math.round(style.size * 0.4);
    const svg =
      id === "pdf417"
        ? pdf417(payload, {
            ...options,
            columns: style.pdfColumns ?? undefined,
            ecLevel: style.pdfEc ?? undefined,
            height,
            width,
          })
        : micropdf417(payload, {
            ...options,
            columns: clampMicroPdfColumns(style.pdfColumns ?? 2),
          });
    return withUnit(svg, width, style.unit);
  }
  if (id === "aztec") {
    const { aztec } = await import("etiket/aztec");
    const svg = aztec(payload, { ...options, ecPercent: style.aztecEcPercent });
    return withUnit(svg, style.size, style.unit);
  }
  const { maxicode, dotcode, hanxin, codablockf, code16k } =
    await import("etiket/2d");
  if (id === "maxicode") {
    const svg = maxicode(payload, {
      ...options,
      countryCode: Number(style.maxicodeCountry) || 840,
      mode: style.maxicodeMode,
      postalCode: style.maxicodePostal,
    });
    return withUnit(svg, style.size, style.unit);
  }
  if (id === "dotcode") {
    const svg = dotcode(payload, {
      ...options,
      columns: style.dotcodeColumns === 0 ? undefined : style.dotcodeColumns,
      mask: style.dotcodeMask < 0 ? undefined : style.dotcodeMask,
      rows: style.dotcodeRows === 0 ? undefined : style.dotcodeRows,
    });
    return withUnit(svg, style.size, style.unit);
  }
  if (id === "hanxin") {
    const svg = hanxin(payload, {
      ...options,
      ecLevel: style.hanxinEcLevel,
      version: style.hanxinVersion === 0 ? undefined : style.hanxinVersion,
    });
    return withUnit(svg, style.size, style.unit);
  }
  if (id === "codablock-f") {
    const svg = codablockf(payload, {
      ...options,
      columns: style.stackedColumns ?? undefined,
    });
    return withUnit(svg, style.size, style.unit);
  }
  const svg = code16k(payload, options);
  return withUnit(svg, style.size, style.unit);
};

/** The 1D SVG. It loads on first use. */
const renderLinearSvg = async (
  id: LinearType,
  payload: string,
  style: QraftStyle,
  labels: RenderLabels
): Promise<string> => {
  const { barcode } = await import("etiket/barcode");
  return barcode(payload, {
    ...a11y(labels),
    background: style.bg,
    bearerBars: id === "itf14" ? style.bearerBars : undefined,
    codabarStart: id === "codabar" ? style.codabarStart : undefined,
    codabarStop: id === "codabar" ? style.codabarStop : undefined,
    code128Charset: id === "code128" ? style.code128Charset : undefined,
    code39CheckDigit:
      id === "code39" || id === "code39ext"
        ? style.code39CheckDigit
        : undefined,
    color: style.fg,
    fontSize: style.fontSize,
    height: style.height,
    margin: style.margin,
    moduleSize: style.moduleSize,
    code2of5CheckDigit:
      id === "industrial2of5" ||
      id === "iata2of5" ||
      id === "matrix2of5" ||
      id === "coop2of5" ||
      id === "datalogic2of5"
        ? style.code25CheckDigit === "none"
          ? undefined
          : style.code25CheckDigit === "add"
            ? true
            : "verify"
        : undefined,
    msiCheckDigit: id === "msi" ? style.msiCheckDigit : undefined,
    rotation: style.rotation,
    showText: style.showText,
    text: style.text === "" ? undefined : style.text,
    textPosition: style.textPosition,
    type: id as BarcodeType,
    unit: style.unit,
  });
};

/** The postal SVG. It loads on first use. */
const renderPostalSvg = async (
  id: PostalSymbology,
  payload: string,
  style: QraftStyle,
  labels: RenderLabels
): Promise<string> => {
  const { postal } = await import("etiket/postal");
  return postal(payload, {
    ...a11y(labels),
    background: style.bg,
    color: style.fg,
    fontSize: style.fontSize,
    height: style.height,
    margin: style.margin,
    moduleSize: style.moduleSize,
    routingCode:
      id === "imb" || id === "jppost"
        ? style.routingCode || undefined
        : undefined,
    showText: style.showText,
    text: style.text === "" ? undefined : style.text,
    type: id as PostalType,
    unit: style.unit,
  });
};

/** Renders any Symbology to SVG. A non-QR family loads on first use. */
export const renderSvg = (
  settings: QraftSettings,
  labels: RenderLabels
): Promise<string> => {
  const { symbology } = settings;
  if (symbology === "qr" || symbology === "microqr" || symbology === "rmqr") {
    try {
      return Promise.resolve(renderQrSvg(settings, labels));
    } catch (error) {
      return Promise.reject(error);
    }
  }
  if (isLinear(symbology)) {
    return renderLinearSvg(symbology, settings.payload, settings.style, labels);
  }
  if (isPostal(symbology)) {
    return renderPostalSvg(symbology, settings.payload, settings.style, labels);
  }
  return renderMatrixSvg(symbology, settings.payload, settings.style, labels);
};

/** The terminal form of a QR code, for a developer who wants a quick check. */
export const renderTerminal = (payload: string): string =>
  qrcodeTerminal(payload);

/* -------------------------------------------------------------------------- */
/* PNG output                                                                  */
/* -------------------------------------------------------------------------- */

interface Raster {
  readonly height: number;
  readonly rows: readonly Uint8Array[];
  readonly width: number;
}

const loadPng = () => import("etiket/png");

const rasterOfMatrix = async (
  matrix: boolean[][],
  style: QraftStyle,
  target: number,
  rowHeights?: readonly number[]
): Promise<Raster> => {
  const { renderMatrixRaster } = await loadPng();
  const columns = matrix[0]?.length ?? 1;
  const modules = columns + style.quietZone * 2;
  const moduleSize = Math.max(1, Math.floor(target / modules));
  return renderMatrixRaster(matrix, {
    margin: style.quietZone,
    moduleSize,
    rowHeights: rowHeights as number[] | undefined,
  });
};

/** Scales a raster to an exact size. It pads when it can, and resamples when it must. */
const fitRaster = (raster: Raster, width: number, height: number): Raster => {
  if (raster.width === width && raster.height === height) {
    return raster;
  }
  if (raster.width <= width && raster.height <= height) {
    const left = Math.floor((width - raster.width) / 2);
    const top = Math.floor((height - raster.height) / 2);
    const rows = Array.from({ length: height }, () => new Uint8Array(width));
    for (const [y, row] of raster.rows.entries()) {
      rows[top + y]?.set(row.subarray(0, raster.width), left);
    }
    return { height, rows, width };
  }
  const rows = Array.from({ length: height }, (_, y) => {
    const from = Math.min(
      raster.height - 1,
      Math.floor((y * raster.height) / height)
    );
    const source = raster.rows[from] ?? new Uint8Array(raster.width);
    const row = new Uint8Array(width);
    for (let x = 0; x < width; x += 1) {
      row[x] =
        source[
          Math.min(raster.width - 1, Math.floor((x * raster.width) / width))
        ] ?? 0;
    }
    return row;
  });
  return { height, rows, width };
};

const encodeRaster = async (
  raster: Raster,
  style: QraftStyle
): Promise<Uint8Array> => {
  const { encodePNG } = await loadPng();
  const fg = hexRgb(style.fg) ?? [0, 0, 0];
  const bg = hexRgb(style.bg) ?? [255, 255, 255];
  return encodePNG(raster.width, raster.height, [...raster.rows], fg, bg);
};

const effectiveEc = (style: QraftStyle) => (style.logo ? "H" : style.ecLevel);

const matrixOf2d = async (
  id: MatrixType,
  payload: string,
  style: QraftStyle
): Promise<{ matrix: boolean[][]; rowHeights?: number[] }> => {
  if (id === "datamatrix" || id === "gs1-datamatrix") {
    const { encodeDataMatrix, encodeGS1DataMatrix } =
      await import("etiket/datamatrix");
    return {
      matrix:
        id === "datamatrix"
          ? encodeDataMatrix(payload, { shape: style.datamatrixShape })
          : encodeGS1DataMatrix(payload, { shape: style.datamatrixShape }),
    };
  }
  if (id === "pdf417" || id === "micropdf417") {
    const { encodeMicroPDF417, encodePDF417 } = await import("etiket/pdf417");
    if (id === "pdf417") {
      return {
        matrix: encodePDF417(payload, {
          columns: style.pdfColumns ?? undefined,
          ecLevel: style.pdfEc ?? undefined,
        }).matrix,
        rowHeights: undefined,
      };
    }
    return {
      matrix: encodeMicroPDF417(payload, {
        columns: clampMicroPdfColumns(style.pdfColumns ?? 2),
      }).matrix,
    };
  }
  if (id === "aztec") {
    const { encodeAztec } = await import("etiket/aztec");
    return {
      matrix: encodeAztec(payload, { ecPercent: style.aztecEcPercent }),
    };
  }
  if (id === "maxicode") {
    const { encodeMaxiCode } = await import("etiket/2d");
    return {
      matrix: encodeMaxiCode(payload, {
        countryCode: Number(style.maxicodeCountry) || 840,
        mode: style.maxicodeMode,
        postalCode: style.maxicodePostal,
      }),
    };
  }
  if (id === "dotcode") {
    const { encodeDotCode } = await import("etiket/2d");
    return {
      matrix: encodeDotCode(payload, {
        columns: style.dotcodeColumns === 0 ? undefined : style.dotcodeColumns,
        mask: style.dotcodeMask < 0 ? undefined : style.dotcodeMask,
        rows: style.dotcodeRows === 0 ? undefined : style.dotcodeRows,
      }),
    };
  }
  if (id === "hanxin") {
    const { encodeHanXin } = await import("etiket/2d");
    return {
      matrix: encodeHanXin(payload, {
        ecLevel: style.hanxinEcLevel,
        version: style.hanxinVersion === 0 ? undefined : style.hanxinVersion,
      }),
    };
  }
  if (id === "codablock-f") {
    const { encodeCodablockF } = await import("etiket/2d");
    const result = encodeCodablockF(payload, {
      columns: style.stackedColumns ?? undefined,
    });
    const separators = new Set(result.separatorRows);
    return {
      matrix: result.matrix,
      rowHeights: result.matrix.map((_, index) =>
        separators.has(index) ? 1 : 2
      ),
    };
  }
  const { encodeCode16K } = await import("etiket/2d");
  const result = encodeCode16K(payload);
  const separators = new Set(result.separatorRows);
  return {
    matrix: result.matrix,
    rowHeights: result.matrix.map((_, index) =>
      separators.has(index) ? 1 : 2
    ),
  };
};

/** The raster of one code before it is encoded as a PNG. */
const rasterOfSettings = async (
  settings: QraftSettings,
  target: number
): Promise<Raster> => {
  const { style, payload } = settings;
  if (settings.symbology === "qr") {
    const matrix = encodeQR(payload, {
      ecLevel: effectiveEc(style),
      gs1: style.gs1 || undefined,
      mask:
        style.mask === null
          ? undefined
          : (Math.min(7, Math.max(0, style.mask)) as
              | 0
              | 1
              | 2
              | 3
              | 4
              | 5
              | 6
              | 7),
      mode: style.mode,
      version: style.version ?? undefined,
    });
    return rasterOfMatrix(matrix, style, target);
  }
  if (settings.symbology === "microqr") {
    const matrix = encodeMicroQR(payload, {
      ecLevel: style.ecLevel === "H" ? "Q" : style.ecLevel,
      version:
        style.version === null ? undefined : clampMicroVersion(style.version),
    });
    return rasterOfMatrix(matrix, style, target);
  }
  if (settings.symbology === "rmqr") {
    const matrix = encodeRMQR(payload, {
      ecLevel: style.ecLevel === "H" ? "H" : "M",
      version: style.version ?? undefined,
    });
    return rasterOfMatrix(matrix, style, target);
  }
  if (isLinear(settings.symbology)) {
    const { encodeBars } = await import("etiket/barcode");
    const { renderBarcodeRaster } = await loadPng();
    const bars = encodeBars(payload, {
      codabarStart:
        settings.symbology === "codabar" ? style.codabarStart : undefined,
      codabarStop:
        settings.symbology === "codabar" ? style.codabarStop : undefined,
      code128Charset:
        settings.symbology === "code128" ? style.code128Charset : undefined,
      code39CheckDigit:
        settings.symbology === "code39" || settings.symbology === "code39ext"
          ? style.code39CheckDigit
          : undefined,
      msiCheckDigit:
        settings.symbology === "msi" ? style.msiCheckDigit : undefined,
      code2of5CheckDigit:
        settings.symbology === "industrial2of5" ||
        settings.symbology === "iata2of5" ||
        settings.symbology === "matrix2of5" ||
        settings.symbology === "coop2of5" ||
        settings.symbology === "datalogic2of5"
          ? style.code25CheckDigit === "none"
            ? undefined
            : style.code25CheckDigit === "add"
              ? true
              : "verify"
          : undefined,
      type: settings.symbology as BarcodeType,
    });
    return renderBarcodeRaster(bars, {
      height: style.height,
      margin: style.margin,
      moduleSize: style.moduleSize,
    });
  }
  if (isPostal(settings.symbology)) {
    const { encodePostal } = await import("etiket/postal");
    const { renderPostalRaster } = await loadPng();
    const bars = encodePostal(payload, {
      routingCode:
        settings.symbology === "imb" || settings.symbology === "jppost"
          ? style.routingCode || undefined
          : undefined,
      type: settings.symbology as PostalType,
    });
    return renderPostalRaster(bars, {
      height: style.height,
      margin: style.margin,
      moduleSize: style.moduleSize,
    });
  }
  const { matrix, rowHeights } = await matrixOf2d(
    settings.symbology,
    payload,
    style
  );
  if (settings.symbology === "maxicode") {
    const { renderMaxiCodeRaster } = await loadPng();
    return renderMaxiCodeRaster(matrix, {
      margin: style.quietZone,
      moduleSize: Math.max(1, Math.floor(target / (matrix[0]?.length ?? 1))),
    });
  }
  return rasterOfMatrix(matrix, style, target, rowHeights);
};

/** Renders a single code as a PNG at the exact pixel size the user asked for. */
export const renderPng = async (
  settings: QraftSettings,
  size: number = settings.style.pngSize
): Promise<Uint8Array> => {
  const target = Math.max(32, Math.round(size));
  const raster = await rasterOfSettings(settings, target);
  return encodeRaster(fitRaster(raster, target, target), settings.style);
};

/** A data URI for the preview. SVG is inlined, never set as HTML. */
export const svgDataUri = (svg: string): string =>
  `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;

/* -------------------------------------------------------------------------- */
/* Label sheets                                                                */
/* -------------------------------------------------------------------------- */

export interface SheetOptions {
  readonly columns: number;
  readonly gap: number;
  readonly padding: number;
  readonly captions: boolean;
}

export const DEFAULT_SHEET_OPTIONS: SheetOptions = {
  captions: true,
  columns: 4,
  gap: 12,
  padding: 16,
};

const xmlEscape = (value: string): string =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");

/** A caption is a label the user typed. The Payload is never a caption. */
const captionOf = (entry: BatchEntry): string => entry.label;

const svgInner = (svg: string) => {
  const opening = svg.match(/^<svg\b(?<attributes>[^>]*)>/u);
  const body = svg.replace(/^<svg\b[^>]*>/u, "").replace(/<\/svg>\s*$/u, "");
  const attributes = opening?.groups?.attributes ?? "";
  const viewBox =
    attributes.match(/viewBox="(?<box>[^"]+)"/u)?.groups?.box ??
    `0 0 ${attributes.match(/width="(?<width>\d+)/u)?.groups?.width ?? 1} ${attributes.match(/height="(?<height>\d+)/u)?.groups?.height ?? 1}`;
  return { body, viewBox };
};

/** The generic grid composer for the families without a library sheet. */
const genericSheet = (
  items: readonly { readonly svg: string; readonly label: string }[],
  options: SheetOptions,
  style: QraftStyle,
  ariaLabel: string
): string => {
  const columns = Math.max(1, Math.round(options.columns));
  const rows = Math.ceil(items.length / columns);
  const cell = style.size;
  const captionHeight = options.captions ? Math.max(16, style.fontSize + 6) : 0;
  const width =
    options.padding * 2 +
    columns * cell +
    Math.max(0, columns - 1) * options.gap;
  const height =
    options.padding * 2 +
    rows * (cell + captionHeight) +
    Math.max(0, rows - 1) * options.gap;
  const cells = items
    .map((item, index) => {
      const column = index % columns;
      const row = Math.floor(index / columns);
      const x = options.padding + column * (cell + options.gap);
      const y = options.padding + row * (cell + captionHeight + options.gap);
      const { body, viewBox } = svgInner(item.svg);
      const caption =
        options.captions && item.label !== ""
          ? `<text x="${x + cell / 2}" y="${y + cell + captionHeight - 4}" text-anchor="middle" font-family="monospace" font-size="${style.fontSize}">${xmlEscape(item.label)}</text>`
          : "";
      return `<svg x="${x}" y="${y}" width="${cell}" height="${cell}" viewBox="${viewBox}">${body}</svg>${caption}`;
    })
    .join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-label="${xmlEscape(ariaLabel)}"><rect width="${width}" height="${height}" fill="${style.bg}"/>${cells}</svg>`;
};

/** Builds a Label Sheet SVG for a Batch. */
export const renderSheetSvg = async (
  settings: QraftSettings,
  entries: readonly BatchEntry[],
  options: SheetOptions,
  labels: RenderLabels
): Promise<string> => {
  const captions =
    options.captions && entries.some((entry) => entry.label !== "")
      ? entries.map((entry) => captionOf(entry))
      : false;
  if (settings.symbology === "qr") {
    const { qrcodeSheet } = await import("etiket/qr");
    return qrcodeSheet(
      entries.map((entry) => entry.payload),
      {
        ...qrOptions(settings.style, labels),
        ariaLabel: labels.title,
        columns: options.columns,
        gap: options.gap,
        labels: captions,
        padding: options.padding,
      }
    );
  }
  if (isLinear(settings.symbology)) {
    const { barcodeSheet } = await import("etiket/barcode");
    return barcodeSheet(
      entries.map((entry) => entry.payload),
      {
        ...a11y(labels),
        background: settings.style.bg,
        color: settings.style.fg,
        columns: options.columns,
        gap: options.gap,
        height: settings.style.height,
        labels: captions,
        margin: settings.style.margin,
        moduleSize: settings.style.moduleSize,
        padding: options.padding,
        showText: settings.style.showText,
        type: settings.symbology as BarcodeType,
        unit: settings.style.unit,
      }
    );
  }
  const items = await Promise.all(
    entries.map(async (entry) => ({
      label: captionOf(entry),
      svg: await renderSvg({ ...settings, payload: entry.payload }, labels),
    }))
  );
  return genericSheet(items, options, settings.style, labels.title);
};

export interface BatchFile {
  readonly data: string | Uint8Array;
  readonly name: string;
}

/** Renders one file per Batch member, ready for the ZIP. */
export const renderBatchFiles = (
  settings: QraftSettings,
  entries: readonly BatchEntry[],
  format: OutputFormat,
  labels: RenderLabels
): Promise<BatchFile[]> =>
  Promise.all(
    entries.map(async (entry, index) => ({
      data:
        format === "svg"
          ? await renderSvg({ ...settings, payload: entry.payload }, labels)
          : await renderPng({ ...settings, payload: entry.payload }),
      name: batchFileNameOf(index, entry.label, format),
    }))
  );

/** A 3x5 block face for the captions a PNG Label Sheet prints. */
const CAPTION_FONT = {
  " ": ["000", "000", "000", "000", "000"],
  "+": ["000", "010", "111", "010", "000"],
  "-": ["000", "000", "111", "000", "000"],
  ".": ["000", "000", "000", "000", "010"],
  "/": ["001", "001", "010", "100", "100"],
  ":": ["000", "010", "000", "010", "000"],
  "?": ["111", "001", "010", "000", "010"],
  "0": ["111", "101", "101", "101", "111"],
  "1": ["010", "110", "010", "010", "111"],
  "2": ["111", "001", "111", "100", "111"],
  "3": ["111", "001", "111", "001", "111"],
  "4": ["101", "101", "111", "001", "001"],
  "5": ["111", "100", "111", "001", "111"],
  "6": ["111", "100", "111", "101", "111"],
  "7": ["111", "001", "001", "001", "001"],
  "8": ["111", "101", "111", "101", "111"],
  "9": ["111", "101", "111", "001", "111"],
  A: ["010", "101", "111", "101", "101"],
  B: ["110", "101", "110", "101", "110"],
  C: ["011", "100", "100", "100", "011"],
  D: ["110", "101", "101", "101", "110"],
  E: ["111", "100", "110", "100", "111"],
  F: ["111", "100", "110", "100", "100"],
  G: ["011", "100", "101", "101", "011"],
  H: ["101", "101", "111", "101", "101"],
  I: ["111", "010", "010", "010", "111"],
  J: ["001", "001", "001", "101", "010"],
  K: ["101", "101", "110", "101", "101"],
  L: ["100", "100", "100", "100", "111"],
  M: ["101", "111", "111", "101", "101"],
  N: ["101", "111", "111", "111", "101"],
  O: ["010", "101", "101", "101", "010"],
  P: ["110", "101", "110", "100", "100"],
  Q: ["010", "101", "101", "110", "011"],
  R: ["110", "101", "110", "101", "101"],
  S: ["011", "100", "010", "001", "110"],
  T: ["111", "010", "010", "010", "010"],
  U: ["101", "101", "101", "101", "111"],
  V: ["101", "101", "101", "101", "010"],
  W: ["101", "101", "111", "111", "101"],
  X: ["101", "101", "010", "101", "101"],
  Y: ["101", "101", "010", "010", "010"],
  Z: ["111", "001", "010", "100", "111"],
} satisfies Readonly<Record<string, readonly string[]>>;

/** Writes one glyph into the page at a pixel origin. */
const drawGlyph = (
  page: Uint8Array[],
  glyph: string,
  x: number,
  y: number,
  scale: number
): void => {
  const rows =
    CAPTION_FONT[glyph as keyof typeof CAPTION_FONT] ?? CAPTION_FONT["?"];
  for (const [row, bits] of rows.entries()) {
    for (const [column, bit] of [...bits].entries()) {
      if (bit !== "1") {
        continue;
      }
      for (let sy = 0; sy < scale; sy += 1) {
        const line = page[y + row * scale + sy];
        if (line) {
          for (let sx = 0; sx < scale; sx += 1) {
            line[x + column * scale + sx] = 1;
          }
        }
      }
    }
  }
};

/** Writes one caption into the page, centred in its cell. */
const drawCaption = (
  page: Uint8Array[],
  label: string,
  x: number,
  y: number,
  width: number
): void => {
  const text = label
    .toUpperCase()
    .normalize("NFKD")
    .replaceAll(/[\u0300-\u036F]/gu, "")
    .replaceAll(/[^ -~]/gu, "?");
  const scale = 2;
  const cell = 3 * scale + 1;
  const max = Math.max(1, Math.floor((width - 8) / cell));
  const glyphs = [...text].slice(0, max);
  const start = x + Math.floor((width - glyphs.length * cell) / 2);
  for (const [index, glyph] of glyphs.entries()) {
    drawGlyph(page, glyph, start + index * cell, y, scale);
  }
};

/** Builds a Label Sheet PNG for a Batch, with optional block captions. */
export const renderSheetPng = async (
  settings: QraftSettings,
  entries: readonly BatchEntry[],
  options: SheetOptions = DEFAULT_SHEET_OPTIONS,
  cellSize = 160
): Promise<Uint8Array> => {
  const columns = Math.max(1, Math.round(options.columns));
  const rows = Math.ceil(entries.length / columns);
  const hasCaptions =
    options.captions && entries.some((entry) => entry.label !== "");
  const captionHeight = hasCaptions ? 18 : 0;
  const cellHeight = cellSize + captionHeight;
  const width =
    options.padding * 2 +
    columns * cellSize +
    Math.max(0, columns - 1) * options.gap;
  const height =
    options.padding * 2 +
    rows * cellHeight +
    Math.max(0, rows - 1) * options.gap;
  const page = Array.from({ length: height }, () => new Uint8Array(width));
  const rasters = await Promise.all(
    entries.map((entry) =>
      rasterOfSettings({ ...settings, payload: entry.payload }, cellSize)
    )
  );
  for (const [index, raster] of rasters.entries()) {
    const fitted = fitRaster(raster, cellSize, cellSize);
    const column = index % columns;
    const row = Math.floor(index / columns);
    const x = options.padding + column * (cellSize + options.gap);
    const y = options.padding + row * (cellHeight + options.gap);
    for (const [sourceY, source] of fitted.rows.entries()) {
      page[y + sourceY]?.set(source, x);
    }
    const label = entries[index]?.label ?? "";
    if (hasCaptions && label !== "") {
      drawCaption(page, label, x, y + cellSize + 2, cellSize);
    }
  }
  const { encodePNG } = await loadPng();
  const fg = hexRgb(settings.style.fg) ?? [0, 0, 0];
  const bg = hexRgb(settings.style.bg) ?? [255, 255, 255];
  return encodePNG(width, height, page, fg, bg);
};
