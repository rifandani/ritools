import { Schema } from "effect";

import { OUTPUT_FORMATS } from "@/features/easel/easel.plan";
import type { OutputFormat } from "@/features/easel/easel.plan";
import { CROP_PRESET_IDS } from "@/features/easel/easel.presets";
import type { Size } from "@/features/easel/easel.presets";
import { MAX_QUALITY, MIN_QUALITY } from "@/features/easel/easel.protocol";
import {
  FILTER_NAMES,
  ORIGINAL,
  WATERMARK_ANCHORS,
} from "@/features/easel/easel.stack";
import type { EditStack, EditState } from "@/features/easel/easel.stack";

/**
 * What Easel keeps in the browser so a reload does not lose the open images.
 * This module has no DOM code. The IndexedDB adapter is in
 * `easel.persist.browser.ts`.
 *
 * One File Tab is a small `TabRecord` (name, output settings, Edit Stack) and
 * some files (the original image and each added picture). The files are
 * written once; the record is written again after each edit.
 *
 * A stored record can be from an older build or damaged. The schemas below
 * check every field that the renderer and the panels read, so a wrong shape
 * never reaches the stage. A record that does not match is not opened, and
 * its data stays in storage.
 */

const RECORD_VERSION = 1;

const Rgba = Schema.Struct({
  a: Schema.Finite,
  b: Schema.Finite,
  g: Schema.Finite,
  r: Schema.Finite,
});

const Rect = Schema.Struct({
  height: Schema.Finite,
  width: Schema.Finite,
  x: Schema.Finite,
  y: Schema.Finite,
});

const LayerBase = {
  hidden: Schema.Boolean,
  id: Schema.NonEmptyString,
  locked: Schema.Boolean,
  opacity: Schema.Finite,
  rotation: Schema.Finite,
  x: Schema.Finite,
  y: Schema.Finite,
};

const TextLayer = Schema.Struct({
  ...LayerBase,
  align: Schema.Literals(["center", "left", "right"]),
  bold: Schema.Boolean,
  box: Schema.NullOr(Rgba),
  color: Rgba,
  font: Schema.String,
  italic: Schema.Boolean,
  kind: Schema.Literal("text"),
  outline: Schema.NullOr(Schema.Struct({ color: Rgba, width: Schema.Finite })),
  size: Schema.Finite,
  strike: Schema.Boolean,
  text: Schema.String,
  underline: Schema.Boolean,
  width: Schema.Finite,
});

const FigureLayer = Schema.Struct({
  ...LayerBase,
  fill: Schema.NullOr(Rgba),
  height: Schema.Finite,
  kind: Schema.Literals(["arrow", "ellipse", "line", "rect"]),
  radius: Schema.Finite,
  stroke: Schema.NullOr(Rgba),
  strokeWidth: Schema.Finite,
  width: Schema.Finite,
});

const ImageLayer = Schema.Struct({
  ...LayerBase,
  assetId: Schema.String,
  height: Schema.Finite,
  kind: Schema.Literal("image"),
  width: Schema.Finite,
});

const Redaction = Schema.Struct({
  color: Rgba,
  form: Schema.Literals(["brush", "ellipse", "rect"]),
  height: Schema.Finite,
  id: Schema.NonEmptyString,
  kind: Schema.Literals(["cover", "mosaic"]),
  points: Schema.Array(Schema.Finite),
  rotation: Schema.Finite,
  size: Schema.Finite,
  width: Schema.Finite,
  x: Schema.Finite,
  y: Schema.Finite,
});

const BucketFill = Schema.Struct({
  color: Rgba,
  id: Schema.NonEmptyString,
  point: Schema.Struct({ x: Schema.Finite, y: Schema.Finite }),
  tolerance: Schema.Finite,
});

const Watermark = Schema.Struct({
  anchor: Schema.Literals(WATERMARK_ANCHORS),
  assetId: Schema.NullOr(Schema.String),
  color: Rgba,
  font: Schema.String,
  kind: Schema.Literals(["image", "text"]),
  opacity: Schema.Finite,
  scale: Schema.Finite,
  text: Schema.String,
  tiled: Schema.Boolean,
});

const Finetune = Schema.Struct({
  blur: Schema.Finite,
  brightness: Schema.Finite,
  contrast: Schema.Finite,
  exposure: Schema.Finite,
  hue: Schema.Finite,
  saturation: Schema.Finite,
  vignette: Schema.Finite,
  warmth: Schema.Finite,
});

const Backdrop = Schema.Union([
  Schema.Struct({ _tag: Schema.Literal("Transparent") }),
  Schema.Struct({ _tag: Schema.Literal("Solid"), color: Rgba }),
]);

const EditStateSchema = Schema.Struct({
  backdrop: Backdrop,
  crop: Rect,
  cropPreset: Schema.Literals(CROP_PRESET_IDS),
  fills: Schema.Array(BucketFill),
  filter: Schema.NullOr(Schema.Literals(FILTER_NAMES)),
  filterStrength: Schema.Finite,
  finetune: Finetune,
  flipH: Schema.Boolean,
  flipV: Schema.Boolean,
  keepWhole: Schema.Boolean,
  layers: Schema.Array(Schema.Union([ImageLayer, FigureLayer, TextLayer])),
  redactions: Schema.Array(Redaction),
  resize: Schema.NullOr(
    Schema.Struct({
      height: Schema.Finite,
      locked: Schema.Boolean,
      width: Schema.Finite,
    })
  ),
  rotate: Schema.Literals([0, 1, 2, 3]),
  straighten: Schema.Finite,
  watermark: Schema.NullOr(Watermark),
});

const Side = Schema.Int.check(Schema.isGreaterThan(0));

/** The saved data of one File Tab, without its files. */
const TabRecordSchema = Schema.Struct({
  /** The ids of the added pictures. Each one has a file. */
  assetIds: Schema.Array(Schema.String),
  byteSize: Schema.Finite,
  /** Whether the File Tab has edits that no downloaded export holds. */
  dirty: Schema.Boolean,
  format: Schema.Literals(OUTPUT_FORMATS),
  id: Schema.NonEmptyString,
  name: Schema.String,
  quality: Schema.Int.check(
    Schema.isGreaterThanOrEqualTo(MIN_QUALITY),
    Schema.isLessThanOrEqualTo(MAX_QUALITY)
  ),
  source: Schema.Struct({ height: Side, width: Side }),
  stack: Schema.Struct({
    future: Schema.Array(EditStateSchema),
    gesture: Schema.NullOr(Schema.String),
    past: Schema.Array(EditStateSchema),
    present: EditStateSchema,
  }),
  version: Schema.Literal(RECORD_VERSION),
});
export type TabRecord = Schema.Schema.Type<typeof TabRecordSchema>;

/** The File Tab order and the active File Tab. */
const SessionRecordSchema = Schema.Struct({
  active: Schema.NullOr(Schema.String),
  order: Schema.Array(Schema.String),
});
export type SessionRecord = Schema.Schema.Type<typeof SessionRecordSchema>;

export const EMPTY_SESSION: SessionRecord = { active: null, order: [] };

/** Whether `value` is a `TabRecord` that this build can open. */
export const isTabRecord = Schema.is(TabRecordSchema);

/** Whether `value` is a `SessionRecord`. */
export const isSessionRecord = Schema.is(SessionRecordSchema);

/** The fields of a File Tab that a record needs. */
export interface PersistableTab {
  readonly byteSize: number;
  readonly exported: EditState;
  readonly format: OutputFormat;
  readonly id: string;
  readonly name: string;
  readonly quality: number;
  readonly source: Size;
  readonly stack: EditStack;
}

export const recordOf = (
  tab: PersistableTab,
  assetIds: readonly string[]
): TabRecord => ({
  assetIds,
  byteSize: tab.byteSize,
  dirty: tab.stack.present !== tab.exported,
  format: tab.format,
  id: tab.id,
  name: tab.name,
  quality: tab.quality,
  source: tab.source,
  stack: tab.stack,
  version: RECORD_VERSION,
});

/**
 * The state that counts as exported after a restore. A restored state is a
 * new object, so Easel cannot compare it with the old one. A File Tab that was
 * clean stays clean; a dirty one keeps an edit that is not exported.
 */
export const exportedOf = (record: TabRecord): EditState =>
  record.dirty ? ORIGINAL : record.stack.present;

/** The name of a file of one File Tab in the file store. */
export const SOURCE_FILE = "source";
export const assetFileName = (assetId: string): string => `asset:${assetId}`;

/**
 * The File Tab order after a load: the saved order first, then any record
 * that the order does not name (for example after a failed write).
 */
export const orderOf = (
  ids: readonly string[],
  session: SessionRecord
): readonly string[] => {
  const known = new Set(ids);
  const named = [...new Set(session.order)].filter((id) => known.has(id));
  const seen = new Set(named);
  return [...named, ...ids.filter((id) => !seen.has(id))];
};

/**
 * The font families that any state of an Edit Stack draws. Easel loads them
 * after a restore, so an undo does not show a fallback face.
 */
export const fontsOfStack = (stack: EditStack): readonly string[] => {
  const families = new Set<string>();
  for (const state of [...stack.past, stack.present, ...stack.future]) {
    for (const layer of state.layers) {
      if (layer.kind === "text") {
        families.add(layer.font);
      }
    }
    if (state.watermark?.kind === "text") {
      families.add(state.watermark.font);
    }
  }
  return [...families];
};
