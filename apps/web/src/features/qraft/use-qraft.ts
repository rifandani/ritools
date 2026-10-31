"use client";

/* oxlint-disable react/set-state-in-effect, react/todo -- One render effect follows the settings; the browser calls and the dynamic family stay at the event or effect boundary. */
/* oxlint-disable promise/prefer-await-to-then -- The hook exposes void-returning browser actions; each action is one caught promise at its event boundary. */

import { makeZip } from "client-zip";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { download } from "@/core/libs/files";
import { useTranslation } from "@/features/i18n/use-translation";

import type {
  BatchFile,
  CodeFamily,
  OutputFormat,
  PresetId,
  PresetProblem,
  QraftKey,
  QraftProblem,
  QraftSettings,
  QraftStyle,
  ScanWarning,
  SheetOptions,
  SymbologyId,
} from "./qraft";
import {
  DEFAULT_SETTINGS,
  DEFAULT_SHEET_OPTIONS,
  MIME_OF,
  SHEET_NAME_OF,
  ZIP_NAME,
  batchWarns,
  buildPreset,
  clearPayload,
  familyOf,
  fileNameOf,
  hasControl,
  parseBatchCsv,
  parseBatchText,
  renderBatchFiles,
  renderPng,
  renderQrSvg,
  renderSheetPng,
  renderSheetSvg,
  renderSvg,
  renderTerminal,
  scanWarnings,
  selectFamily,
  selectPreset,
  selectSymbology,
  setOutput,
  setPayload,
  setPresetField,
  setStyle,
  symbologyOf,
  validateSettings,
} from "./qraft";

const PROBLEM_KEY = {
  "barcode-input": "qraftProblemBarcode",
  empty: "qraftProblemEmpty",
  "postal-input": "qraftProblemPostal",
  "qr-capacity": "qraftProblemQrCapacity",
  preset: "qraftProblemPreset",
} as const satisfies Readonly<Record<QraftProblem, QraftKey>>;

const PRESET_PROBLEM_KEY = {
  "invalid-amount": "qraftProblemInvalidAmount",
  "invalid-coordinates": "qraftProblemInvalidCoordinates",
  "invalid-date": "qraftProblemInvalidDate",
  "invalid-email": "qraftProblemInvalidEmail",
  "invalid-gtin": "qraftProblemInvalidGtin",
  "invalid-iban": "qraftProblemInvalidIban",
  "invalid-number": "qraftProblemInvalidNumber",
  required: "qraftProblemRequired",
} as const satisfies Readonly<Record<PresetProblem, QraftKey>>;

const WARNING_KEY = {
  "gradient-stop": "qraftWarningGradient",
  inverted: "qraftWarningInverted",
  "logo-size": "qraftWarningLogo",
  "low-contrast": "qraftWarningLowContrast",
  "near-capacity": "qraftWarningCapacity",
  "quiet-zone": "qraftWarningQuietZone",
} as const satisfies Readonly<Record<ScanWarning["id"], QraftKey>>;

interface Preview {
  readonly error: QraftProblem | null;
  readonly loading: boolean;
  readonly revision: number;
  readonly svg: string | null;
}

const MAX_LOGO_BYTES = 2 * 1024 * 1024;

const isLogoMime = (file: File): boolean =>
  ["image/jpeg", "image/png", "image/svg+xml"].includes(file.type) ||
  /\.(?:jpe?g|png|svg)$/iu.test(file.name);

const readDataUri = (file: File): Promise<string> =>
  // oxlint-disable-next-line promise/avoid-new -- FileReader is callback-only
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener("load", () => {
      resolve(String(reader.result));
    });
    reader.addEventListener("error", () => {
      reject(new Error("logo"));
    });
    reader.readAsDataURL(file);
  });

const blobOf = (data: string | Uint8Array, format: OutputFormat): Blob =>
  data instanceof Uint8Array
    ? new Blob([Uint8Array.from(data).buffer], { type: MIME_OF[format] })
    : new Blob([data], { type: MIME_OF[format] });

/** The text one preset problem prints, in the current Locale. */
const presetProblemOf = (settings: QraftSettings): PresetProblem | null =>
  buildPreset(settings.preset, settings.fields).problem;

/**
 * Qraft's state and its browser calls.
 *
 * Everything that decides what a code says, how it looks, or whether it is
 * valid lives in `qraft.ts`. This hook holds the settings, runs the render,
 * and hands the browser the file or clipboard action.
 */
export const useQraft = () => {
  const { t } = useTranslation();
  const [settings, setSettings] = useState<QraftSettings>(DEFAULT_SETTINGS);
  const [preview, setPreview] = useState<Preview>(() => {
    const initial = symbologyOf(DEFAULT_SETTINGS.symbology);
    const title = t(initial.labelTranslation);
    return {
      error: null,
      loading: false,
      revision: 1,
      svg: renderQrSvg(DEFAULT_SETTINGS, {
        desc: t("qraftSvgDesc", { symbology: title }),
        title,
      }),
    };
  });
  const [batchText, setBatchText] = useState("");
  const [batchIsCsv, setBatchIsCsv] = useState(false);
  const [sheet, setSheet] = useState<SheetOptions>(DEFAULT_SHEET_OPTIONS);
  const [batchBusy, setBatchBusy] = useState(false);
  const [batchProblem, setBatchProblem] = useState<
    "build" | "empty" | "zip" | null
  >(null);
  const revision = useRef(1);

  const spec = symbologyOf(settings.symbology);
  const label = t(spec.labelTranslation);
  const desc = t("qraftSvgDesc", { symbology: label });
  const labels = useMemo(() => ({ desc, title: label }), [desc, label]);

  const family = familyOf(settings.symbology);
  const presetProblem = presetProblemOf(settings);
  const warnings = scanWarnings(settings);
  const validation = validateSettings(settings);
  const problem = validation.valid
    ? null
    : presetProblem === null
      ? t(PROBLEM_KEY[validation.problem ?? "empty"])
      : t(PRESET_PROBLEM_KEY[presetProblem]);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      const check = validateSettings(settings);
      if (!check.valid) {
        setPreview((current) => ({
          error: check.problem,
          loading: false,
          revision: current.revision,
          svg: null,
        }));
        return;
      }
      if (familyOf(settings.symbology) === "qr") {
        const svg = renderQrSvg(settings, labels);
        if (!cancelled) {
          revision.current += 1;
          setPreview({
            error: null,
            loading: false,
            revision: revision.current,
            svg,
          });
        }
        return;
      }
      setPreview((current) => ({
        ...current,
        error: null,
        loading: true,
        svg: null,
      }));
      try {
        const svg = await renderSvg(settings, labels);
        if (!cancelled) {
          revision.current += 1;
          setPreview({
            error: null,
            loading: false,
            revision: revision.current,
            svg,
          });
        }
      } catch {
        if (!cancelled) {
          setPreview((current) => ({
            error: "barcode-input",
            loading: false,
            revision: current.revision,
            svg: null,
          }));
        }
      }
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [settings, labels]);

  const chooseFamily = useCallback((next: CodeFamily) => {
    setSettings((current) => selectFamily(current, next));
  }, []);

  const chooseSymbology = useCallback((next: SymbologyId) => {
    setSettings((current) => selectSymbology(current, next));
  }, []);

  const choosePreset = useCallback((next: PresetId) => {
    setSettings((current) => selectPreset(current, next));
  }, []);

  const changeField = useCallback((name: string, value: string) => {
    setSettings((current) => setPresetField(current, name, value));
  }, []);

  const changeRaw = useCallback((payload: string) => {
    setSettings((current) => setPayload(current, payload));
  }, []);

  const clear = useCallback(() => {
    setSettings((current) => clearPayload(current));
  }, []);

  const changeStyle = useCallback((patch: Partial<QraftStyle>) => {
    setSettings((current) => setStyle(current, patch));
  }, []);

  const changeOutput = useCallback((next: OutputFormat) => {
    setSettings((current) => setOutput(current, next));
  }, []);

  const removeLogo = useCallback(() => {
    setSettings((current) => setStyle(current, { logo: null }));
  }, []);

  const chooseLogo = useCallback(
    (file: File) => {
      const run = async () => {
        if (!isLogoMime(file)) {
          toast.error(t("qraftLogoFailed"));
          return;
        }
        if (file.size > MAX_LOGO_BYTES) {
          toast.error(t("qraftLogoTooLarge"));
          return;
        }
        try {
          const dataUri = await readDataUri(file);
          setSettings((current) =>
            setStyle(current, { logo: { dataUri, name: file.name } })
          );
        } catch {
          toast.error(t("qraftLogoFailed"));
        }
      };
      run().catch(() => toast.error(t("qraftLogoFailed")));
    },
    [t]
  );

  const freshSvg = useCallback(
    () => renderSvg(settings, labels),
    [labels, settings]
  );

  const freshPng = useCallback(
    () => renderPng(settings, settings.style.pngSize),
    [settings]
  );

  const save = useCallback(
    (format: OutputFormat = settings.output) => {
      const run = async () => {
        if (!validateSettings(settings).valid) {
          toast.error(problem ?? t("qraftRenderFailed"));
          return;
        }
        try {
          const data = format === "svg" ? await freshSvg() : await freshPng();
          download(blobOf(data, format), fileNameOf(settings, format));
        } catch {
          toast.error(t("qraftRenderFailed"));
        }
      };
      run().catch(() => toast.error(t("qraftRenderFailed")));
    },
    [freshPng, freshSvg, problem, settings, t]
  );

  const copy = useCallback(
    (what: "payload" | "png" | "svg") => {
      const run = async () => {
        if (what === "payload") {
          await navigator.clipboard.writeText(settings.payload);
        } else if (what === "svg") {
          await navigator.clipboard.writeText(await freshSvg());
        } else {
          const png = await freshPng();
          await navigator.clipboard.write([
            new ClipboardItem({ "image/png": blobOf(png, "png") }),
          ]);
        }
        toast.success(t("qraftCopied"));
      };
      run().catch(() => toast.error(t("qraftCopyFailed")));
    },
    [freshPng, freshSvg, settings.payload, t]
  );

  const print = useCallback(() => {
    const run = async () => {
      const svg = await freshSvg();
      const win = window.open("", "_blank");
      if (win === null) {
        toast.error(t("qraftRenderFailed"));
        return;
      }
      win.document.write(
        `<!doctype html><html><head><title>${label}</title><style>html,body{margin:0;display:grid;place-items:center;min-height:100vh;background:#fff}svg{max-width:100vw;max-height:100vh}</style></head><body>${svg}</body></html>`
      );
      win.document.close();
      win.focus();
      win.print();
    };
    run().catch(() => toast.error(t("qraftRenderFailed")));
  }, [freshSvg, label, t]);

  const terminal = useMemo(() => {
    if (settings.symbology !== "qr" || settings.payload === "") {
      return "";
    }
    try {
      return renderTerminal(settings.payload);
    } catch {
      return "";
    }
  }, [settings.payload, settings.symbology]);

  const entries = useMemo(
    () => (batchIsCsv ? parseBatchCsv(batchText) : parseBatchText(batchText)),
    [batchIsCsv, batchText]
  );
  const warnBatch = batchWarns(entries.length);

  const loadCsv = useCallback((file: File) => {
    file
      .text()
      .then((text) => {
        setBatchText(text);
        setBatchIsCsv(true);
        setBatchProblem(null);
      })
      .catch(() => setBatchProblem("build"));
  }, []);

  const changeBatchText = useCallback((text: string) => {
    setBatchText(text);
    setBatchIsCsv(false);
    setBatchProblem(null);
  }, []);

  const downloadSheet = useCallback(
    (format: OutputFormat) => {
      const run = async () => {
        if (entries.length === 0) {
          setBatchProblem("empty");
          return;
        }
        setBatchBusy(true);
        setBatchProblem(null);
        try {
          const data =
            format === "svg"
              ? await renderSheetSvg(settings, entries, sheet, labels)
              : await renderSheetPng(settings, entries, sheet);
          download(blobOf(data, format), SHEET_NAME_OF[format]);
        } catch {
          setBatchProblem("build");
        } finally {
          setBatchBusy(false);
        }
      };
      run().catch(() => setBatchProblem("build"));
    },
    [entries, labels, settings, sheet]
  );

  const downloadZip = useCallback(
    (format: OutputFormat) => {
      const run = async () => {
        if (entries.length === 0) {
          setBatchProblem("empty");
          return;
        }
        setBatchBusy(true);
        setBatchProblem(null);
        try {
          const files: BatchFile[] = await renderBatchFiles(
            settings,
            entries,
            format,
            labels
          );
          const stream = makeZip(
            files.map((file) => ({ input: file.data, name: file.name }))
          );
          download(await new Response(stream).blob(), ZIP_NAME);
        } catch {
          setBatchProblem("zip");
        } finally {
          setBatchBusy(false);
        }
      };
      run().catch(() => setBatchProblem("zip"));
    },
    [entries, labels, settings]
  );

  const warningText = useCallback(
    (warning: ScanWarning): string => {
      const value = String(warning.value ?? 0);
      switch (warning.id) {
        case "low-contrast": {
          return t("qraftWarningLowContrast", { ratio: value });
        }
        case "logo-size": {
          return t("qraftWarningLogo", { percent: value });
        }
        case "quiet-zone": {
          return t("qraftWarningQuietZone", { modules: value });
        }
        case "near-capacity": {
          return t("qraftWarningCapacity", { percent: value });
        }
        default: {
          return t(WARNING_KEY[warning.id]);
        }
      }
    },
    [t]
  );

  return {
    batchBusy,
    batchProblem,
    batchText,
    chooseFamily,
    chooseLogo,
    choosePreset,
    chooseSymbology,
    changeBatchText,
    changeField,
    changeOutput,
    changeRaw,
    changeStyle,
    clear,
    copy,
    downloadSheet,
    downloadZip,
    entries,
    family,
    hasControl: (control: Parameters<typeof hasControl>[1]) =>
      hasControl(settings.symbology, control),
    label,
    labels,
    loadCsv,
    presetProblem,
    preview,
    print,
    problem,
    removeLogo,
    save,
    setSheet,
    settings,
    sheet,
    spec,
    terminal,
    t,
    validation,
    warnBatch,
    warningText,
    warnings,
  };
};

/** The entries and the warning a Batch panel prints. */
export type QraftController = ReturnType<typeof useQraft>;
