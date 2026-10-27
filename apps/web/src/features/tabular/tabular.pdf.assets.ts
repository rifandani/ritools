import * as T from "./tabular";
import type { FailureContext } from "./tabular.format";
import { readPdfFont } from "./tabular.pdf.metrics";
import type { PdfFontMetrics } from "./tabular.pdf.metrics";

const BODY = "archivo-latin-400-normal.ttf";
const TITLE = "archivo-latin-wdth125-wght900.ttf";
const cache = new Map<string, Uint8Array>();

const load = async (
  name: string,
  ctx: FailureContext,
  signal: AbortSignal | undefined,
  phase: T.Progress["phase"]
): Promise<Uint8Array> => {
  const cached = cache.get(name);
  if (cached) {
    return cached;
  }
  try {
    const response = await fetch(`/fonts/pdf/${name}`, {
      cache: "force-cache",
      signal,
    });
    if (!response.ok) {
      throw new Error("PDF font unavailable");
    }
    const bytes = new Uint8Array(await response.arrayBuffer());
    cache.set(name, bytes);
    return bytes;
  } catch {
    if (signal?.aborted) {
      throw new T.Cancelled({ ...ctx, phase });
    }
    throw new T.EngineOffline({ ...ctx, asset: `pdf-font-${name}` });
  }
};

/** The body font metrics are shared by the PDF plan and the writer. */
export const loadPdfMetrics = async (
  ctx: FailureContext,
  signal: AbortSignal | undefined,
  phase: T.Progress["phase"] = "planning-export"
): Promise<PdfFontMetrics> => readPdfFont(await load(BODY, ctx, signal, phase));

export const loadPdfAssets = async (
  ctx: FailureContext,
  signal: AbortSignal | undefined,
  phase: T.Progress["phase"] = "writing"
) => {
  const [body, title] = await Promise.all([
    load(BODY, ctx, signal, phase),
    load(TITLE, ctx, signal, phase),
  ]);
  return { body, title };
};
