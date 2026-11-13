import { OUTPUT_FORMATS } from "@/features/easel/easel.plan";
import type { OutputFormat } from "@/features/easel/easel.plan";

/**
 * The messages between the page and the Easel Worker. The Worker checks each
 * message with `isEncodeRequest` and ignores every other form.
 */

export interface EncodeRequest {
  readonly format: OutputFormat;
  readonly height: number;
  readonly id: number;
  /** From 1 to 100. PNG does not use it. */
  readonly quality: number;
  readonly rgba: ArrayBuffer;
  readonly type: "easel:encode";
  readonly width: number;
}

export type EncodeReply =
  | { readonly bytes: ArrayBuffer; readonly id: number; readonly ok: true }
  | { readonly id: number; readonly message: string; readonly ok: false };

export const MIN_QUALITY = 1;
export const MAX_QUALITY = 100;
export const DEFAULT_QUALITY = 85;

/** The quality the codec receives: a whole number from 1 to 100. */
export const qualityOf = (quality: number): number =>
  Math.min(
    MAX_QUALITY,
    Math.max(
      MIN_QUALITY,
      Number.isFinite(quality) ? Math.round(quality) : DEFAULT_QUALITY
    )
  );

const isSide = (value: unknown): value is number =>
  Number.isSafeInteger(value) && Number(value) > 0;

/** Whether a Worker message is a complete encode request. */
// oxlint-disable-next-line anti-slop/no-unknown-parameters -- a Worker message is unknown until this guard reads it.
export const isEncodeRequest = (value: unknown): value is EncodeRequest => {
  if (value === null || typeof value !== "object") {
    return false;
  }
  const fields = new Map<string, unknown>(Object.entries(value));
  const width = fields.get("width");
  const height = fields.get("height");
  const rgba = fields.get("rgba");
  const quality = fields.get("quality");
  return (
    fields.get("type") === "easel:encode" &&
    Number.isSafeInteger(fields.get("id")) &&
    // SAFETY: `includes` only compares; a wrong value gives `false`.
    OUTPUT_FORMATS.includes(fields.get("format") as OutputFormat) &&
    isSide(width) &&
    isSide(height) &&
    rgba instanceof ArrayBuffer &&
    rgba.byteLength === width * height * 4 &&
    typeof quality === "number" &&
    quality >= MIN_QUALITY &&
    quality <= MAX_QUALITY
  );
};
