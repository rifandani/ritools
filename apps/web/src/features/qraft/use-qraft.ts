"use client";

/* oxlint-disable react/set-state-in-effect, react/todo -- One render effect follows the settings; the browser calls and the dynamic family stay at the event or effect boundary. */
/* oxlint-disable promise/prefer-await-to-then -- The hook exposes void-returning browser actions; each action is one caught promise at its event boundary. */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { download } from "@/core/libs/files";
import { makeZip } from "@/core/libs/lazy-zip";
import { LibraryLoadError, loadLibrary } from "@/core/libs/library-load";
import { useTranslation } from "@/features/i18n/use-translation";

import type {
  BatchFile,
  CodeFamily,
  OutputFormat,
  PresetId,
  PresetProblem,
  QraftProblem,
  QraftSettings,
  QraftStyle,
  ScanWarning,
  SheetOptions,
  SymbologyId,
} from "./qraft";
import {
  BATCH_SAMPLE,
  DEFAULT_SETTINGS,
  PRESET_PROBLEM_KEY,
  PROBLEM_KEY,
  WARNING_KEY,
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
  svgDataUri,
  symbologyOf,
  validateSettings,
} from "./qraft";
import type * as BatchParser from "./qraft.batch";

interface Preview {
  readonly error: QraftProblem | null;
  readonly loading: boolean;
  readonly revision: number;
  readonly svg: string | null;
}

const runQraftAction = async (run: () => Promise<void>, message: string) => {
  try {
    await run();
  } catch (error) {
    if (!(error instanceof LibraryLoadError)) {
      toast.error(message);
    }
  }
};

const loadBatchParser = () =>
  loadLibrary("Papa Parse", () => import("./qraft.batch"));

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
  const [batchInput, setBatchInput] = useState({ text: "", isCsv: false });
  const { text: batchText, isCsv: batchIsCsv } = batchInput;
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
    async (format: OutputFormat = settings.output): Promise<boolean> => {
      const run = async () => {
        if (!validateSettings(settings).valid) {
          toast.error(problem ?? t("qraftRenderFailed"));
          return false;
        }
        try {
          const data = format === "svg" ? await freshSvg() : await freshPng();
          download(blobOf(data, format), fileNameOf(settings, format));
          return true;
        } catch (error) {
          if (!(error instanceof LibraryLoadError)) {
            toast.error(t("qraftRenderFailed"));
          }
          return false;
        }
      };
      // An Agent Action waits for the result; the page's control does not.
      try {
        return await run();
      } catch (error) {
        if (!(error instanceof LibraryLoadError)) {
          toast.error(t("qraftRenderFailed"));
        }
        return false;
      }
    },
    [freshPng, freshSvg, problem, settings, t]
  );

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

  const copy = useCallback(
    (what: "payload" | "png" | "svg" | "terminal") => {
      const run = async () => {
        if (what === "payload") {
          await navigator.clipboard.writeText(settings.payload);
        } else if (what === "svg") {
          await navigator.clipboard.writeText(await freshSvg());
        } else if (what === "terminal") {
          await navigator.clipboard.writeText(terminal);
        } else {
          const png = await freshPng();
          await navigator.clipboard.write([
            new ClipboardItem({ "image/png": blobOf(png, "png") }),
          ]);
        }
        toast.success(t("qraftCopied"));
      };
      void runQraftAction(run, t("qraftCopyFailed"));
    },
    [freshPng, freshSvg, settings.payload, t, terminal]
  );

  const print = useCallback(() => {
    const run = async () => {
      const svg = await freshSvg();
      const win = window.open("", "_blank");
      if (win === null) {
        toast.error(t("qraftRenderFailed"));
        return;
      }
      // The code is an image, not inline SVG: one resource the browser can
      // finish decoding before the print preview takes its snapshot.
      win.document.write(
        `<!doctype html><html><head><title></title><style>html,body{margin:0;display:grid;place-items:center;min-height:100vh;background:#fff}img{display:block;max-width:100vw;max-height:100vh}</style></head><body><img alt="" src="${svgDataUri(svg)}"></body></html>`
      );
      win.document.close();
      win.document.title = label;
      win.focus();
      const image = win.document.querySelector("img");
      if (image) {
        // A logo is a nested image. Printing before it decodes leaves the
        // hole the hidden dots make, so wait for the code itself.
        await image.decode().catch(() => null);
      }
      if (!win.closed) {
        win.print();
      }
    };
    void runQraftAction(run, t("qraftRenderFailed"));
  }, [freshSvg, label, t]);

  const [batchParser, setBatchParser] = useState<typeof BatchParser | null>(
    null
  );
  useEffect(() => {
    if (!batchInput.text || batchParser) {
      return;
    }
    let cancelled = false;
    const prepare = async () => {
      try {
        const parser = await loadBatchParser();
        if (!cancelled) {
          setBatchParser(parser);
        }
      } catch {
        if (!cancelled) {
          setBatchProblem("build");
        }
      }
    };
    void prepare();
    return () => {
      cancelled = true;
    };
  }, [batchInput, batchParser]);
  const entries = useMemo(
    () =>
      batchParser
        ? batchIsCsv
          ? batchParser.parseBatchCsv(batchText)
          : batchParser.parseBatchText(batchText)
        : [],
    [batchParser, batchIsCsv, batchText]
  );
  const warnBatch = batchWarns(entries.length);

  const loadCsv = useCallback((file: File) => {
    file
      .text()
      .then((text) => {
        setBatchInput({ text, isCsv: true });
        setBatchProblem(null);
      })
      .catch(() => setBatchProblem("build"));
  }, []);

  const changeBatchText = useCallback(async (text: string) => {
    setBatchInput({ text, isCsv: false });
    setBatchProblem(null);
    if (!text) {
      return;
    }
    try {
      setBatchParser(await loadBatchParser());
    } catch {
      setBatchProblem("build");
    }
  }, []);

  const loadSample = useCallback(() => {
    setBatchInput({ text: BATCH_SAMPLE, isCsv: true });
    setBatchProblem(null);
  }, []);

  const downloadSheet = useCallback(
    (format: OutputFormat): Promise<void> => {
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
      return run().catch(() => setBatchProblem("build"));
    },
    [entries, labels, settings, sheet]
  );

  const downloadZip = useCallback(
    (format: OutputFormat): Promise<void> => {
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
          const stream = await makeZip(
            files.map((file) => ({ input: file.data, name: file.name }))
          );
          download(await new Response(stream).blob(), ZIP_NAME);
        } catch {
          setBatchProblem("zip");
        } finally {
          setBatchBusy(false);
        }
      };
      return run().catch(() => setBatchProblem("zip"));
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
    batchBusy:
      batchBusy ||
      (batchInput.text !== "" && batchParser === null && batchProblem === null),
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
    freshSvg,
    hasControl: (control: Parameters<typeof hasControl>[1]) =>
      hasControl(settings.symbology, control),
    label,
    labels,
    loadCsv,
    loadSample,
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
