"use client";

import { Ransom } from "@/core/components/ui/ransom";
import { useTranslation } from "@/features/i18n/use-translation";
import { UnmaskBatchList } from "@/features/unmask/components/unmask-batch-list";
import { UnmaskResult } from "@/features/unmask/components/unmask-result";
import type { RowState } from "@/features/unmask/unmask";
import type {
  OperationId,
  SourceId,
  UnmaskError,
} from "@/features/unmask/unmask.engine";
import type { UnmaskItem } from "@/features/unmask/use-unmask";

const noop = () => {
  // The gallery prints every state; it does not run one.
};

const RESULT = {
  bytes: new Uint8Array(8),
  bytesLength: 284_000,
  format: "webp" as const,
  height: 1521,
  mime: "image/webp",
  name: "portrait-hair-cutout.webp",
  width: 2400,
};

const ITEM = (
  name: string,
  state: RowState,
  error: UnmaskError | null = null
): UnmaskItem => ({
  byteSize: 388_410,
  claimedFormat: "jpeg",
  edited: state === "edited",
  error,
  facts: {
    bytes: 388_410,
    format: "jpeg",
    frameCount: 1,
    hasAlpha: false,
    height: 1521,
    name,
    // SAFETY: The gallery owns its fixture ids; they are display-only and
    // never reach a file path or a Worker key.
    sourceId: `source-${name}` as SourceId,
    width: 2400,
  },
  file: new File([], name, { type: "image/jpeg" }),
  folderPath: null,
  full: null,
  id: `state-${state}-${name}`,
  model: {
    backend: "wasm",
    bytes: 44_229_662,
    id: "isnet-int8",
    licence: "MIT",
    licenceUrl: "https://github.com/xrds/isnet-general-onnx-int8",
    name: "ISNet int8",
    sha256: "state",
    version: "state",
  },
  name,
  notes: [],
  operations:
    state === "edited"
      ? [
          {
            _tag: "Brush",
            mode: "restore",
            // SAFETY: The gallery's operation is a fixture; the id is opaque
            // and never leaves the printed state sheet.
            operationId: "op-1" as OperationId,
            points: [{ x: 1200, y: 700 }],
            size: 40,
          },
        ]
      : [],
  preview: null,
  previewBase: null,
  progress: null,
  redo: [],
  result:
    state === "ready" ||
    state === "edited" ||
    state === "stale" ||
    state === "downloaded"
      ? RESULT
      : null,
  settingsKey: "webp|85|0|Transparent|",
  source: null,
  state,
});

const CASES: readonly {
  readonly error?: UnmaskError;
  readonly label: string;
  readonly state: RowState;
}[] = [
  { label: "Reading", state: "reading" },
  { label: "Removing", state: "removing" },
  { label: "Ready", state: "ready" },
  { label: "Edited", state: "edited" },
  { label: "Stale", state: "stale" },
  { label: "Queued", state: "queued" },
  {
    error: { _tag: "Cancelled" },
    label: "Cancelled",
    state: "cancelled",
  },
  {
    error: { _tag: "UnsupportedFormat", format: "application/pdf" },
    label: "Unsupported format",
    state: "failed",
  },
  {
    error: { _tag: "UnreadableFile", reason: "decode" },
    label: "Unreadable file",
    state: "failed",
  },
  {
    error: {
      _tag: "TooLarge",
      height: 9000,
      neededBytes: 1_200_000_000,
      pixels: 81_000_000,
      width: 9000,
    },
    label: "Too large",
    state: "failed",
  },
  {
    error: { _tag: "ModelUnavailable", reason: "offline" },
    label: "Model unavailable",
    state: "failed",
  },
  {
    error: { _tag: "ModelFailed", reason: "inference" },
    label: "Model failed",
    state: "failed",
  },
  {
    error: { _tag: "EncodeFailed", reason: "codec" },
    label: "Encode failed",
    state: "failed",
  },
  { label: "Downloaded", state: "downloaded" },
];

/** Development only: the Unmask state matrix, printed as one sheet. */
export const UnmaskStateGallery = () => {
  const { t } = useTranslation();
  return (
    <section className="flex flex-col gap-y-8" id="unmask-states">
      <header>
        <h1 className="font-display text-[clamp(2rem,7vw,4rem)] leading-none font-black uppercase [font-stretch:75%]">
          <Ransom as="span">{t("unmaskName")}</Ransom> {t("unmaskStatesTitle")}
        </h1>
        <p className="text-muted-fg mt-2 text-sm">{t("unmaskStatesNote")}</p>
      </header>

      <section className="border-rule border-2 p-4">
        <h2 className="font-display text-xl font-black uppercase [font-stretch:75%]">
          {t("unmaskEmptyTitle")}
        </h2>
        <p className="text-muted-fg mt-1 text-sm">{t("unmaskEmptyBody")}</p>
      </section>

      <section className="border-rule border-2 p-4">
        <h2 className="font-display text-xl font-black uppercase [font-stretch:75%]">
          {t("unmaskModelLoadingTitle")}
        </h2>
        <p className="text-muted-fg mt-1 text-sm">
          {t("unmaskModelLoadingBody")}
        </p>
        <p className="num mt-2 text-sm">
          {t("unmaskModelLoadingPercent", { percent: "42" })}
        </p>
      </section>

      <div className="flex flex-col gap-4">
        {CASES.map((testCase) => {
          const item = ITEM(
            `${testCase.state}-${testCase.label.toLowerCase().replaceAll(" ", "-")}.jpg`,
            testCase.state,
            testCase.error ?? null
          );
          return (
            <section className="border-rule border-2 p-4" key={testCase.label}>
              <h2 className="text-xs font-bold tracking-[0.08em] uppercase [font-stretch:87.5%]">
                {t("unmaskStatePreviewLabel")}: {testCase.label}
              </h2>
              <UnmaskBatchList
                batch={[item]}
                folderPath={null}
                onDownload={noop}
                onOpen={noop}
                onRemove={noop}
                onRetry={noop}
                skipped={0}
              />
              <UnmaskResult
                item={item}
                onBackToBatch={null}
                onCutAnother={noop}
                onDownload={noop}
                onRetry={noop}
                running={false}
              />
            </section>
          );
        })}
      </div>
    </section>
  );
};
