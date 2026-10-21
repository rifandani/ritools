"use client";

import { Option } from "effect";

import { Ransom } from "@/core/components/ui/ransom";
import { useTranslation } from "@/features/i18n/use-translation";
import { SqueezeBatchList } from "@/features/squeeze/components/squeeze-batch-list";
import { SqueezeItemRow } from "@/features/squeeze/components/squeeze-item-row";
import { SqueezeSettingsBar } from "@/features/squeeze/components/squeeze-settings-bar";
import type {
  BatchItem,
  InputFormat,
  ItemResult,
  MultiPart,
  OutputFile,
  RowView,
  SqueezeSettings,
} from "@/features/squeeze/squeeze";
import { DEFAULT_SETTINGS } from "@/features/squeeze/squeeze";

/**
 * Development only: the Squeeze v2 state matrix, printed as a sheet. It exists
 * so every row state, the Multi sub-lines, the Batch budget readout, and the
 * stale and offline cases can be inspected in one place. `?states=1`.
 */

const OUTPUT = (size: number, format: OutputFile["format"]): OutputFile => ({
  bytes: new ArrayBuffer(0),
  format,
  height: 1200,
  levels: null,
  quality: 62,
  size,
  width: 1600,
});

const ITEM = (
  name: string,
  over: Omit<Partial<BatchItem>, "format"> & {
    readonly format?: InputFormat;
  } = {}
): BatchItem => {
  const { format = "jpeg", ...rest } = over;
  return {
    folderPath: null,
    format: Option.some(format),
    id: name,
    lastModified: 0,
    name,
    size: 248_000,
    source: new Blob(),
    targetBytes: null,
    ...rest,
  };
};

const VIEW = (over: Partial<RowView> = {}): RowView => ({
  files: [],
  inputBytes: 248_000,
  notes: [],
  outputBytes: 94_000,
  parts: [],
  problem: null,
  raisedTargetBytes: null,
  saved: 62,
  smallestStep: null,
  state: "done",
  stale: false,
  underTargetCount: 1,
  writtenCount: 1,
  ...over,
});

const PART = (
  format: MultiPart["format"],
  size: number | null,
  state: MultiPart["state"],
  saved = 0
): MultiPart => ({
  file: size === null ? null : OUTPUT(size, format),
  format,
  saved,
  size,
  state,
});

interface Case {
  readonly item: BatchItem;
  readonly label: string;
  readonly override?: boolean;
  readonly running?: boolean;
  readonly view: RowView;
}

const CASES: readonly Case[] = [
  {
    item: ITEM("beach-day.jpg", { size: 248_000 }),
    label: "DONE, resized",
    view: VIEW({
      files: [OUTPUT(94_000, "jpeg")],
      notes: [
        { from: "4032×3024", kind: "resized", to: "1600×1200" },
        { kind: "flattened" },
      ],
      outputBytes: 94_000,
      saved: 62,
    }),
  },
  {
    item: ITEM("menu-board.png", { format: "png" }),
    label: "DONE, bigger than input",
    view: VIEW({
      files: [OUTPUT(262_000, "jpeg")],
      notes: [
        { kind: "colors-reduced" },
        { kind: "bigger-than-input", percent: 6 },
      ],
      outputBytes: 262_000,
      saved: -6,
    }),
  },
  {
    item: ITEM("portrait.webp", { format: "webp" }),
    label: "ALREADY FITS",
    view: VIEW({
      notes: [{ kind: "original-used" }],
      outputBytes: 248_000,
      saved: 0,
      state: "already-fits",
      writtenCount: 0,
    }),
  },
  {
    item: ITEM("scan-1998.jpg", { size: 1_240_000 }),
    label: "MISS with the three ways out",
    view: VIEW({
      files: [OUTPUT(520_000, "jpeg")],
      inputBytes: 1_240_000,
      notes: [],
      outputBytes: 520_000,
      saved: 58,
      smallestStep: "q40",
      state: "miss",
      underTargetCount: 0,
    }),
  },
  {
    item: ITEM("texture.png", { format: "png" }),
    label: "BIGGER, fixed quality",
    override: false,
    view: VIEW({
      files: [OUTPUT(310_000, "jpeg")],
      notes: [{ kind: "bigger-than-input", percent: 25 }],
      outputBytes: 310_000,
      saved: -25,
      state: "bigger",
    }),
  },
  {
    item: ITEM("notes.txt", { format: "jpeg" }),
    label: "REJECTED, unsupported",
    view: VIEW({
      outputBytes: null,
      problem: "unsupported",
      state: "rejected",
    }),
  },
  {
    item: ITEM("broken.jpg"),
    label: "REJECTED, unreadable",
    view: VIEW({ outputBytes: null, problem: "unreadable", state: "rejected" }),
  },
  {
    item: ITEM("billboard.tif", { size: 40_000_000 }),
    label: "REJECTED, too large for the device",
    view: VIEW({ outputBytes: null, problem: "too-large", state: "rejected" }),
  },
  {
    item: ITEM("logo.svg"),
    label: "REJECTED, codec failed",
    view: VIEW({
      outputBytes: null,
      problem: "codec-failed",
      state: "rejected",
    }),
  },
  {
    item: ITEM("trip.heic"),
    label: "REJECTED, codec not cached offline",
    view: VIEW({
      outputBytes: null,
      problem: "codec-offline",
      state: "rejected",
    }),
  },
  {
    item: ITEM("queued.png", { format: "png" }),
    label: "QUEUED",
    view: VIEW({ outputBytes: null, state: "working" }),
  },
  {
    item: ITEM("working.png", { format: "png" }),
    label: "WORKING",
    running: true,
    view: VIEW({ outputBytes: null, state: "working" }),
  },
  {
    item: ITEM("old-run.jpg"),
    label: "STALE",
    view: VIEW({
      files: [OUTPUT(88_000, "jpeg")],
      notes: [{ kind: "out-of-date" }],
      outputBytes: 88_000,
      saved: 64,
      stale: true,
    }),
  },
  {
    item: ITEM("delivery.png", { format: "png" }),
    label: "MULTI, all three under Target",
    view: VIEW({
      files: [
        OUTPUT(94_000, "jpeg"),
        OUTPUT(62_000, "webp"),
        OUTPUT(98_000, "avif"),
      ],
      notes: [{ kind: "flattened" }, { kind: "bigger-than-input", percent: 2 }],
      outputBytes: 254_000,
      parts: [
        PART("jpeg", 94_000, "done", 62),
        PART("webp", 62_000, "done", 75),
        PART("avif", 98_000, "done", 60),
      ],
      saved: -2,
      underTargetCount: 3,
      writtenCount: 3,
    }),
  },
  {
    item: ITEM("hero-shot.jpg", { size: 640_000 }),
    label: "MULTI, 2 of 3 under target",
    view: VIEW({
      files: [
        OUTPUT(120_000, "jpeg"),
        OUTPUT(96_000, "webp"),
        OUTPUT(232_000, "avif"),
      ],
      inputBytes: 640_000,
      outputBytes: 448_000,
      parts: [
        PART("jpeg", 120_000, "done", 81),
        PART("webp", 96_000, "done", 85),
        PART("avif", 232_000, "miss", 64),
      ],
      saved: 30,
      state: "miss",
      underTargetCount: 2,
      writtenCount: 3,
    }),
  },
  {
    item: ITEM("archive.avif", { format: "avif" }),
    label: "MULTI, one codec failed",
    view: VIEW({
      files: [OUTPUT(88_000, "jpeg"), OUTPUT(58_000, "webp")],
      outputBytes: 146_000,
      parts: [
        PART("jpeg", 88_000, "done", 64),
        PART("webp", 58_000, "done", 77),
        PART("avif", null, "failed"),
      ],
      saved: 41,
      underTargetCount: 2,
      writtenCount: 2,
    }),
  },
  {
    item: ITEM("batch-raised.jpg", { size: 900_000 }),
    label: "Batch total, redistributed and raised",
    override: false,
    view: VIEW({
      files: [OUTPUT(240_000, "jpeg")],
      inputBytes: 900_000,
      notes: [{ kind: "raised", bytes: 262_000 }],
      outputBytes: 240_000,
      raisedTargetBytes: 262_000,
      saved: 73,
    }),
  },
];

const BATCH_TOTAL: SqueezeSettings = {
  ...DEFAULT_SETTINGS,
  batchTotalBytes: 2_400_000,
  sizeMode: "batch-total",
};

const FIXED_PNG: SqueezeSettings = {
  ...DEFAULT_SETTINGS,
  outputFormat: "png",
  quality: 80,
  sizeMode: "fixed-quality",
};

const NOOP = () => {
  // The gallery is a still specimen; its controls do not change the Batch.
};

const Sheet = ({
  children,
  title,
}: {
  readonly children: React.ReactNode;
  readonly title: string;
}) => (
  <section className="flex flex-col gap-y-2">
    <h2 className="border-rule border-b-2 pb-1 text-sm font-bold tracking-[0.05em] uppercase [font-stretch:87.5%]">
      {title}
    </h2>
    {children}
  </section>
);

/** The state matrix, as a printed sheet. Development only. */
export const SqueezeStateGallery = () => {
  const { t, locale } = useTranslation();
  const items = CASES.map((entry) => entry.item);
  const emptyMap = new Map<string, BatchItem>();
  const noResults = new Map<string, ItemResult>();

  return (
    <div className="mx-auto flex w-full max-w-[78rem] flex-col gap-y-10 px-4 py-8 sm:px-6">
      <header className="flex flex-col gap-y-2">
        <Ransom as="h1" className="text-[clamp(2.5rem,6vw,4rem)]">
          State matrix
        </Ransom>
        <p className="text-muted-fg max-w-[64ch] text-sm">
          Development only. Every row state of Squeeze v2, the Multi sub-lines,
          the Batch budget readout, the stale and offline cases, and the empty
          proof.
        </p>
      </header>

      <Sheet title="Rows">
        <div className="border-rule border-2 px-3">
          <div className="border-rule text-muted-fg hidden gap-x-3 border-b-[3px] px-3 pb-2 text-xs font-bold tracking-[0.08em] uppercase [font-stretch:87.5%] md:grid md:grid-cols-[9rem_minmax(0,1fr)_10rem] xl:grid-cols-[9rem_minmax(0,1.5fr)_4.25rem_4.25rem_3.5rem_minmax(0,1fr)_12rem]">
            <span>{t("squeezeColState")}</span>
            <span>{t("squeezeColFile")}</span>
            <span className="hidden xl:col-start-3 xl:block xl:text-end">
              {t("squeezeColIn")}
            </span>
            <span className="hidden xl:col-start-4 xl:block xl:text-end">
              {t("squeezeColOut")}
            </span>
            <span className="hidden xl:col-start-5 xl:block xl:text-end">
              {t("squeezeColDelta")}
            </span>
            <span className="hidden xl:col-start-6 xl:block">
              {t("squeezeColNotes")}
            </span>
            <span className="md:col-start-3 xl:col-start-7">
              {t("squeezeActions")}
            </span>
          </div>
          <ul className="px-3">
            {CASES.map((entry) => (
              <SqueezeItemRow
                batchTarget={200_000}
                id={entry.item.id}
                item={entry.item}
                key={entry.item.name}
                locale={locale}
                onDownload={NOOP}
                onDownloadPart={NOOP}
                onRaiseTarget={NOOP}
                onRecompress={NOOP}
                onRemove={NOOP}
                onResize={NOOP}
                onTarget={NOOP}
                onTryFormat={NOOP}
                online
                overrideEnabled={entry.override ?? true}
                problemFormat={t("squeezeOutputAvif")}
                result={undefined}
                running={entry.running ?? false}
                stale={entry.view.stale}
                view={entry.view}
                working={entry.label === "WORKING"}
              />
            ))}
          </ul>
        </div>
      </Sheet>

      <Sheet title="Empty Batch">
        <SqueezeBatchList
          batch={emptyMap}
          batchTarget={null}
          onDownload={NOOP}
          onDownloadPart={NOOP}
          onRaiseTarget={NOOP}
          onRecompress={NOOP}
          onRemove={NOOP}
          onResize={NOOP}
          onTarget={NOOP}
          onTryFormat={NOOP}
          online
          overrideEnabled
          results={noResults}
          running={false}
          settings={DEFAULT_SETTINGS}
          staleIds={new Set()}
          workingIds={new Set()}
        />
      </Sheet>

      <Sheet title="Job ticket: Batch total readout">
        <div className="max-w-[20rem]">
          <SqueezeSettingsBar
            items={items}
            issues={[]}
            onChange={NOOP}
            settings={BATCH_TOTAL}
          />
        </div>
      </Sheet>

      <Sheet title="Job ticket: PNG at Fixed quality">
        <div className="max-w-[20rem]">
          <SqueezeSettingsBar
            items={[ITEM("still.png", { format: "png" })]}
            issues={[]}
            onChange={NOOP}
            settings={FIXED_PNG}
          />
        </div>
      </Sheet>
    </div>
  );
};
