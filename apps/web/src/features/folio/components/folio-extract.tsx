/* oxlint-disable complexity, react/set-state-in-effect, react/todo, eslint/no-await-in-loop, react-doctor/async-await-in-loop, react-doctor/no-giant-component -- One panel owns four exports; pages run one at a time so progress and Cancel stay exact, and the linear run reports a named failure with an explicit throw. */
"use client";

import type { ViewerPlugins } from "@embedpdf/viewer-react";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  HiArrowDownTray,
  HiDocumentArrowDown,
  HiStop,
  HiXMark,
} from "react-icons/hi2";

import { Button } from "@/core/components/ui/button";
import { Checkbox, CheckboxField } from "@/core/components/ui/checkbox";
import { Legend } from "@/core/components/ui/field";
import { Heading } from "@/core/components/ui/heading";
import {
  NativeSelect,
  NativeSelectContent,
} from "@/core/components/ui/native-select";
import { Note } from "@/core/components/ui/note";
import { Radio, RadioField, RadioGroup } from "@/core/components/ui/radio";
import { Text } from "@/core/components/ui/text";
import { download } from "@/core/libs/files";
import { useTranslation } from "@/features/i18n/use-translation";

import {
  FOLIO_EXTRACT_DOUBLE_ESTIMATE_WIDTH,
  FOLIO_EXTRACT_MAX_PAGES,
  FOLIO_EXTRACT_MAX_PAGE_PIXELS,
  FOLIO_EXTRACT_MAX_PIXELS,
  FOLIO_EXTRACT_STANDARD_WIDTH,
  folioExtractAttachmentManifest,
  folioExtractAttachmentManifestPath,
  folioExtractAttachmentPaths,
  folioExtractEstimateBytes,
  folioExtractFormatSize,
  folioExtractImageRequest,
  folioExtractLinksCsv,
  folioExtractLinksJson,
  folioExtractLinksPath,
  folioExtractLinkTarget,
  folioExtractMegapixels,
  folioExtractPagesPath,
  folioExtractPageStem,
  folioExtractSingleName,
  folioExtractTextFileCount,
  folioExtractTextJsonPath,
  folioExtractTextPagesJson,
  folioExtractTextPath,
  folioExtractWithinPageCap,
  folioExtractZip,
  folioExtractZipName,
} from "../folio.extract";
import type {
  FolioExtractArchiveFile,
  FolioExtractAttachment,
  FolioExtractImageFormat,
  FolioExtractLink,
  FolioExtractLinkFormat,
  FolioExtractOutput,
  FolioExtractPageText,
  FolioExtractScope,
  FolioExtractTextFormat,
  FolioExtractWidth,
} from "../folio.extract";

type RenderCapability = ViewerPlugins["render"];
type SelectionCapability = ViewerPlugins["selection"];
type AttachmentCapability = ViewerPlugins["attachment"];
type AnnotationCapability = ViewerPlugins["annotation"];
type DocumentsCapability = ViewerPlugins["documents"];
type AttachedFile = ReturnType<AttachmentCapability["list"]>[number];
type Annotation = ReturnType<AnnotationCapability["list"]>[number];
type LinkAnnotation = Extract<Annotation, { subtype: "link" }>;
type PageRef = NonNullable<
  ReturnType<SelectionCapability["getRange"]>
>["start"]["page"];

export interface FolioExtractProps {
  readonly annotation: AnnotationCapability;
  readonly attachment: AttachmentCapability;
  readonly documentId: string;
  readonly documents: DocumentsCapability;
  readonly initialPage: number;
  readonly onClose: () => void;
  readonly render: RenderCapability;
  readonly selection: SelectionCapability;
}

/** Everything the viewer hands the panel but its close action. */
export type FolioExtractTarget = Omit<FolioExtractProps, "onClose">;

type Phase = "done" | "failed" | "running" | "setup" | "stopped";
type AttachmentState = "error" | "loading" | "ready";

interface Failure {
  readonly message: string;
  readonly output: FolioExtractOutput;
}

interface Result {
  readonly blob: Blob;
  readonly files: readonly FolioExtractArchiveFile[];
  readonly name: string;
  readonly notes: readonly string[];
  readonly totalBytes: number;
  readonly zip: boolean;
}

const OUTPUT_ORDER = [
  "text",
  "links",
  "pages",
  "attachments",
] as const satisfies readonly FolioExtractOutput[];

const OUTPUT_LABEL = {
  attachments: "folioExtractAttachments",
  links: "folioExtractLinks",
  pages: "folioExtractPages",
  text: "folioExtractText",
} as const;

const OUTPUT_HINT = {
  attachments: "folioExtractAttachmentsHint",
  links: "folioExtractLinksHint",
  pages: "folioExtractPagesHint",
  text: "folioExtractTextHint",
} as const;

const OUTPUT_DENIED = {
  attachments: "folioExtractDeniedAttachments",
  links: "folioExtractDeniedLinks",
  pages: "folioExtractDeniedPages",
  text: "folioExtractDeniedText",
} as const;

const TEXT_FORMAT_KEY = {
  json: "folioExtractTextJson",
  txt: "folioExtractTextTxt",
} as const;

const LINK_FORMAT_KEY = {
  csv: "folioExtractLinkCsv",
  json: "folioExtractLinkJson",
} as const;

const WIDTH_KEY = {
  double: "folioExtractWidthDouble",
  standard: "folioExtractWidthStandard",
} as const;

const IMAGE_FORMAT_KEY = {
  png: "folioExtractImagePng",
  webp: "folioExtractImageWebp",
} as const;

const encode = (value: string) => new TextEncoder().encode(value);

const isLinkAnnotation = (item: Annotation): item is LinkAnnotation =>
  item.subtype === "link";

const mimeOf = (
  path: string,
  attachmentMime: ReadonlyMap<string, string | null>
): string => {
  const declared = attachmentMime.get(path);
  if (declared !== undefined) {
    return declared ?? "application/octet-stream";
  }
  if (path.endsWith(".csv")) {
    return "text/csv";
  }
  if (path.endsWith(".json")) {
    return "application/json";
  }
  if (path.endsWith(".png")) {
    return "image/png";
  }
  if (path.endsWith(".webp")) {
    return "image/webp";
  }
  return "text/plain";
};

/** Whether the browser can encode a WebP image. */
const webpSupported = (): boolean => {
  try {
    const canvas = document.createElement("canvas");
    return canvas.toDataURL("image/webp").startsWith("data:image/webp");
  } catch {
    return false;
  }
};

/**
 * The Extract panel: text, links, page images, and attachments, alone or
 * together. Every read stays in this tab; the result is one file or one ZIP.
 */
export const FolioExtract = ({
  annotation,
  attachment,
  documentId,
  documents,
  initialPage,
  onClose,
  render,
  selection,
}: FolioExtractProps) => {
  const { locale, t } = useTranslation();
  const info = documents.get(documentId);
  const pageCount = info?.pageCount ?? 0;
  // Start the narrow scope on the page the reader is looking at.
  const firstPage = Math.min(
    Math.max(0, initialPage),
    Math.max(pageCount - 1, 0)
  );
  const [scope, setScope] = useState<FolioExtractScope>("all");
  const [selectedPages, setSelectedPages] = useState<ReadonlySet<number>>(
    () => new Set([firstPage])
  );
  const initialAllowed = useMemo(
    () => ({
      attachments: attachment.canDownload(),
      links: annotation.canRead(),
      pages: render.canRender(),
      text: selection.canCopy(),
    }),
    [annotation, attachment, render, selection]
  );
  const [checked, setChecked] = useState<ReadonlySet<FolioExtractOutput>>(
    () => {
      const first = OUTPUT_ORDER.find((output) => initialAllowed[output]);
      return new Set(first ? [first] : []);
    }
  );
  const [textFormat, setTextFormat] = useState<FolioExtractTextFormat>("txt");
  const [linkFormat, setLinkFormat] = useState<FolioExtractLinkFormat>("csv");
  const [imageFormat, setImageFormat] =
    useState<FolioExtractImageFormat>("png");
  const [imageWidth, setImageWidth] = useState<FolioExtractWidth>("standard");
  const [attachmentState, setAttachmentState] =
    useState<AttachmentState>("loading");
  const [attached, setAttached] = useState<readonly AttachedFile[]>([]);
  const [phase, setPhase] = useState<Phase>("setup");
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [failure, setFailure] = useState<Failure | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const runningRef = useRef(false);
  const stopRef = useRef(false);
  const canWebp = useMemo(() => webpSupported(), []);

  useEffect(() => {
    let cancelled = false;
    setAttachmentState("loading");
    const read = async () => {
      try {
        await attachment.ensureLoaded();
      } catch {
        if (!cancelled) {
          setAttachmentState("error");
        }
        return;
      }
      if (cancelled) {
        return;
      }
      setAttached(
        attachment.list().filter((file) => file.home.kind === "document")
      );
      setAttachmentState("ready");
    };
    void read();
    return () => {
      cancelled = true;
    };
  }, [attachment]);

  useEffect(
    () =>
      documents.onClosed(({ documentId: closed }) => {
        if (closed === documentId) {
          onClose();
        }
      }),
    [documentId, documents, onClose]
  );

  useEffect(
    () => () => {
      abortRef.current?.abort();
    },
    []
  );

  const allowed = useMemo<Record<FolioExtractOutput, boolean>>(
    () => initialAllowed,
    [initialAllowed]
  );

  const imageWidthPx =
    imageWidth === "standard"
      ? FOLIO_EXTRACT_STANDARD_WIDTH
      : FOLIO_EXTRACT_DOUBLE_ESTIMATE_WIDTH;

  const selectedIndexes = useMemo(
    () =>
      scope === "all"
        ? Array.from({ length: pageCount }, (_, index) => index)
        : [...selectedPages]
            .filter((index) => index < pageCount)
            .toSorted((left, right) => left - right),
    [pageCount, scope, selectedPages]
  );

  const needsPages =
    checked.has("text") || checked.has("links") || checked.has("pages");
  const pageWork = [
    checked.has("text"),
    checked.has("links"),
    checked.has("pages"),
  ].filter(Boolean).length;
  const totalWork =
    pageWork * selectedIndexes.length +
    (checked.has("attachments") ? attached.length : 0);
  const imageCapApplies = checked.has("pages");
  const pagesReady =
    !needsPages ||
    (selectedIndexes.length > 0 &&
      (!imageCapApplies || folioExtractWithinPageCap(selectedIndexes.length)));
  const attachmentsReady =
    !checked.has("attachments") ||
    (attachmentState === "ready" && attached.length > 0);
  const canStart =
    phase !== "running" &&
    checked.size > 0 &&
    totalWork > 0 &&
    pagesReady &&
    attachmentsReady;
  const overPageCap =
    imageCapApplies && selectedIndexes.length > FOLIO_EXTRACT_MAX_PAGES;
  const noPages = needsPages && selectedIndexes.length === 0;
  const attachmentsEmpty =
    checked.has("attachments") &&
    attachmentState === "ready" &&
    attached.length === 0;
  const denied = OUTPUT_ORDER.filter((output) => !allowed[output]);
  const allPagesSelected =
    pageCount > 0 && selectedIndexes.length === pageCount;

  const toggleOutput = (output: FolioExtractOutput, isSelected: boolean) => {
    setChecked((current) => {
      const next = new Set(current);
      if (isSelected) {
        next.add(output);
      } else {
        next.delete(output);
      }
      return next;
    });
  };

  const estimateOf = (output: FolioExtractOutput): string => {
    if (output === "attachments") {
      if (attachmentState === "loading") {
        return t("loading");
      }
      if (attachmentState === "error") {
        return t("folioExtractAttachmentsUnreadable");
      }
      if (attached.some((file) => file.size === null)) {
        return t("folioExtractEstimateUnknown");
      }
      const bytes = attached.reduce((sum, file) => sum + (file.size ?? 0), 0);
      return t("folioExtractEstimate", {
        size: folioExtractFormatSize(bytes, locale),
      });
    }
    return t("folioExtractEstimate", {
      size: folioExtractFormatSize(
        folioExtractEstimateBytes(
          output,
          selectedIndexes.length,
          imageWidthPx,
          imageFormat
        ),
        locale
      ),
    });
  };

  const refsFor = (
    indexes: readonly number[],
    signal?: AbortSignal
  ): readonly PageRef[] => {
    const saved = selection.getRange();
    const refs: PageRef[] = [];
    try {
      for (const index of indexes) {
        if (signal?.aborted) {
          throw new DOMException("Extract cancelled", "AbortError");
        }
        selection.selectPage(index);
        const range = selection.getRange();
        if (!range) {
          throw new Error(t("folioExtractPageUnreadable", { page: index + 1 }));
        }
        refs.push(range.start.page);
      }
    } finally {
      if (saved) {
        selection.select(saved);
      } else {
        selection.clear();
      }
    }
    return refs;
  };

  const readText = async (
    indexes: readonly number[],
    signal: AbortSignal,
    tick: () => void
  ): Promise<readonly FolioExtractPageText[]> => {
    const refs = refsFor(indexes, signal);
    const pages: FolioExtractPageText[] = [];
    for (let position = 0; position < indexes.length; position += 1) {
      if (signal.aborted) {
        throw new DOMException("Extract cancelled", "AbortError");
      }
      const page = refs[position];
      const index = indexes[position] ?? 0;
      if (!page) {
        throw new Error(t("folioExtractPageUnreadable", { page: index + 1 }));
      }
      const text = await selection.readTextInRange(
        {
          end: { index: Number.MAX_SAFE_INTEGER, page },
          start: { index: 0, page },
        },
        { signal }
      );
      pages.push({
        page: index + 1,
        text: text.trim().length === 0 ? null : text,
      });
      tick();
    }
    return pages;
  };

  const readLinks = (
    indexes: readonly number[],
    signal: AbortSignal,
    tick: () => void
  ): readonly FolioExtractLink[] => {
    const pageNumbers = new Map<number, number>();
    if (pageCount > 0) {
      const refs = refsFor(
        Array.from({ length: pageCount }, (_, index) => index),
        signal
      );
      for (const [index, ref] of refs.entries()) {
        pageNumbers.set(ref.objectNumber, index + 1);
      }
    }
    const byPage = new Map<number, LinkAnnotation[]>();
    for (const item of annotation.list({ subtype: "link" })) {
      if (!isLinkAnnotation(item)) {
        continue;
      }
      const pageNumber = pageNumbers.get(item.page.objectNumber);
      if (pageNumber === undefined) {
        continue;
      }
      const bucket = byPage.get(pageNumber);
      if (bucket) {
        bucket.push(item);
      } else {
        byPage.set(pageNumber, [item]);
      }
    }
    const links: FolioExtractLink[] = [];
    for (const index of indexes) {
      if (signal.aborted) {
        throw new DOMException("Extract cancelled", "AbortError");
      }
      for (const item of byPage.get(index + 1) ?? []) {
        const { rect } = item;
        links.push({
          page: index + 1,
          rect: [rect.x, rect.y, rect.x + rect.width, rect.y + rect.height],
          subtype: "link",
          target:
            item.target === null
              ? { detail: "", kind: "unsupported" }
              : folioExtractLinkTarget(item.target, pageNumbers),
        });
      }
      tick();
    }
    return links;
  };

  const run = async () => {
    if (!canStart || runningRef.current) {
      return;
    }
    runningRef.current = true;
    setFailure(null);
    setResult(null);
    setPhase("running");
    setProgress({ done: 0, total: totalWork });
    stopRef.current = false;
    const controller = new AbortController();
    abortRef.current = controller;
    const files: FolioExtractArchiveFile[] = [];
    const notes: string[] = [];
    const attachmentBytes: FolioExtractAttachment[] = [];
    const attachmentMime = new Map<string, string | null>();
    const tick = () =>
      setProgress((current) => ({ done: current.done + 1, total: totalWork }));
    let active: FolioExtractOutput = "text";
    try {
      if (checked.has("text")) {
        active = "text";
        const pages = await readText(selectedIndexes, controller.signal, tick);
        if (textFormat === "json") {
          files.push({
            bytes: encode(folioExtractTextPagesJson(pages)),
            path: folioExtractTextJsonPath,
            stored: false,
          });
        } else {
          for (let position = 0; position < pages.length; position += 1) {
            const page = pages[position];
            if (page?.text !== null && page?.text !== undefined) {
              files.push({
                bytes: encode(page.text),
                path: folioExtractTextPath(
                  selectedIndexes[position] ?? 0,
                  pageCount
                ),
                stored: false,
              });
            }
          }
          if (folioExtractTextFileCount(pages, "txt") === 0) {
            throw new Error(t("folioExtractNoTextAll"));
          }
        }
        const missing = pages.filter((page) => page.text === null).length;
        if (missing > 0) {
          notes.push(t("folioExtractNoTextPages", { count: missing }));
        }
      }

      if (checked.has("links")) {
        active = "links";
        if (annotation.getStatus() !== "ready") {
          await annotation.refresh({ signal: controller.signal });
        }
        const links = readLinks(selectedIndexes, controller.signal, tick);
        files.push({
          bytes: encode(
            linkFormat === "csv"
              ? folioExtractLinksCsv(links)
              : folioExtractLinksJson(links)
          ),
          path: folioExtractLinksPath(linkFormat),
          stored: false,
        });
      }

      if (checked.has("pages")) {
        active = "pages";
        let pixels = 0;
        for (const index of selectedIndexes) {
          if (controller.signal.aborted) {
            throw new DOMException("Extract cancelled", "AbortError");
          }
          const image = await render.renderPage(index, {
            ...folioExtractImageRequest(imageWidth),
            format: imageFormat,
            signal: controller.signal,
          });
          const pagePixels = image.width * image.height;
          if (pagePixels > FOLIO_EXTRACT_MAX_PAGE_PIXELS) {
            throw new Error(t("folioExtractPageTooLarge", { page: index + 1 }));
          }
          pixels += pagePixels;
          if (pixels > FOLIO_EXTRACT_MAX_PIXELS) {
            throw new Error(
              t("folioExtractPixelCapFailed", {
                megapixels: folioExtractMegapixels(FOLIO_EXTRACT_MAX_PIXELS),
              })
            );
          }
          const blob = await image.blob();
          files.push({
            bytes: new Uint8Array(await blob.arrayBuffer()),
            path: folioExtractPagesPath(index, pageCount, imageFormat),
            stored: true,
          });
          tick();
        }
      }

      if (checked.has("attachments")) {
        active = "attachments";
        if (attached.length === 0) {
          throw new Error(t("folioExtractNoAttachments"));
        }
        for (const file of attached) {
          if (controller.signal.aborted) {
            throw new DOMException("Extract cancelled", "AbortError");
          }
          const content = await attachment.download(file, {
            signal: controller.signal,
          });
          attachmentBytes.push({
            bytes: content.bytes,
            mimeType: content.mimeType,
            name: content.name || file.name,
          });
          tick();
        }
      }

      if (attachmentBytes.length > 0) {
        const paths = folioExtractAttachmentPaths(
          attachmentBytes.map((item) => item.name)
        );
        for (const [index, item] of attachmentBytes.entries()) {
          const path = paths[index];
          if (!path) {
            throw new Error(t("folioExtractNothing"));
          }
          attachmentMime.set(path, item.mimeType);
          files.push({ bytes: item.bytes, path, stored: true });
        }
        if (files.length > 1) {
          files.push({
            bytes: encode(
              folioExtractAttachmentManifest(attachmentBytes, paths)
            ),
            path: folioExtractAttachmentManifestPath(paths),
            stored: false,
          });
        }
      }

      if (controller.signal.aborted || stopRef.current) {
        throw new DOMException("Extract cancelled", "AbortError");
      }
      const [first] = files;
      if (!first) {
        throw new Error(t("folioExtractNothing"));
      }
      const zip = files.length > 1;
      const totalBytes = files.reduce(
        (sum, file) => sum + file.bytes.byteLength,
        0
      );
      const name = info?.name ?? "document.pdf";
      setResult({
        blob: zip
          ? // SAFETY: fflate returns a Uint8Array over an ArrayBuffer.
            new Blob([folioExtractZip(files) as BlobPart], {
              type: "application/zip",
            })
          : // SAFETY: the engine returns a Uint8Array over an ArrayBuffer.
            new Blob([first.bytes as BlobPart], {
              type: mimeOf(first.path, attachmentMime),
            }),
        files,
        name: zip
          ? folioExtractZipName(name)
          : folioExtractSingleName(name, first.path),
        notes,
        totalBytes,
        zip,
      });
      setPhase("done");
    } catch (error) {
      if (controller.signal.aborted || stopRef.current) {
        setResult(null);
        setPhase("stopped");
        return;
      }
      setFailure({
        message:
          error instanceof Error ? error.message : t("folioExtractNothing"),
        output: active,
      });
      setResult(null);
      setPhase("failed");
    } finally {
      runningRef.current = false;
    }
  };

  const cancel = () => {
    stopRef.current = true;
    abortRef.current?.abort();
  };

  const close = () => {
    cancel();
    setResult(null);
    onClose();
  };

  const save = () => {
    if (result) {
      download(result.blob, result.name);
    }
  };

  const reset = () => {
    setFailure(null);
    setResult(null);
    setPhase("setup");
  };

  return (
    <aside
      aria-label={t("folioExtractTitle")}
      className="border-rule bg-overlay text-overlay-fg flex flex-col border-t-2 max-lg:fixed max-lg:inset-x-0 max-lg:bottom-0 max-lg:z-40 max-lg:max-h-[72svh] lg:w-[28rem] lg:shrink-0 lg:border-s-2 lg:border-t-0"
    >
      <header className="border-rule flex items-start justify-between gap-2 border-b-2 px-5 py-4">
        <Heading className="min-w-0 flex-1" level={2}>
          {t("folioExtractTitle")}
        </Heading>
        <Button
          aria-label={t("close")}
          intent="plain"
          onPress={close}
          size="sq-sm"
        >
          <HiXMark aria-hidden="true" className="size-4.5" />
        </Button>
      </header>

      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-5 py-4">
        <p className="text-muted-fg text-sm/6">{t("folioExtractIntro")}</p>

        <fieldset>
          <Legend>{t("folioExtractScope")}</Legend>
          <RadioGroup
            aria-label={t("folioExtractScope")}
            className="mt-2 space-y-2"
            isDisabled={phase === "running"}
            onChange={(value) => {
              if (value === "all" || value === "selected") {
                setScope(value);
              }
            }}
            value={scope}
          >
            <RadioField value="all">
              <Radio>{t("folioExtractScopeAll", { count: pageCount })}</Radio>
            </RadioField>
            <RadioField value="selected">
              <Radio>
                {t("folioExtractScopeSelected", {
                  count: selectedPages.size,
                })}
              </Radio>
            </RadioField>
          </RadioGroup>
          {scope === "selected" ? (
            <section className="mt-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-muted-fg text-xs/5">
                  {t("folioExtractSelectedHint")}
                </p>
                <Button
                  intent="plain"
                  isDisabled={phase === "running" || pageCount === 0}
                  onPress={() => {
                    setSelectedPages(
                      allPagesSelected
                        ? new Set()
                        : new Set(
                            Array.from(
                              { length: pageCount },
                              (_, index) => index
                            )
                          )
                    );
                  }}
                  size="sm"
                >
                  {allPagesSelected
                    ? t("folioExtractSelectNone")
                    : t("folioExtractSelectAll")}
                </Button>
              </div>
              <div className="border-rule mt-2 max-h-48 overflow-auto border-2">
                <ul className="divide-rule divide-y">
                  {Array.from({ length: pageCount }, (_, index) => (
                    <li
                      className="px-3 py-2"
                      key={folioExtractPageStem(index, pageCount)}
                    >
                      <CheckboxField
                        isDisabled={phase === "running"}
                        isSelected={selectedPages.has(index)}
                        onChange={(isSelected) => {
                          setSelectedPages((current) => {
                            const next = new Set(current);
                            if (isSelected) {
                              next.add(index);
                            } else {
                              next.delete(index);
                            }
                            return next;
                          });
                        }}
                      >
                        <Checkbox>
                          {t("folioExtractPage", { page: index + 1 })}
                        </Checkbox>
                      </CheckboxField>
                    </li>
                  ))}
                </ul>
              </div>
            </section>
          ) : null}
        </fieldset>

        <section>
          <h3 className="text-fg text-sm font-bold">
            {t("folioExtractOutputs")}
          </h3>
          <ul className="border-rule mt-2 border-2">
            {OUTPUT_ORDER.map((output) => {
              const selected = checked.has(output);
              return (
                <li
                  className="border-rule border-b-2 px-3 py-3 last:border-b-0"
                  key={output}
                >
                  <CheckboxField
                    isDisabled={!allowed[output] || phase === "running"}
                    isSelected={selected}
                    onChange={(isSelected) => {
                      toggleOutput(output, isSelected);
                    }}
                  >
                    <Checkbox>
                      <span className="font-bold">
                        {t(OUTPUT_LABEL[output])}
                      </span>
                      <span className="text-muted-fg">
                        {" · "}
                        {t(OUTPUT_HINT[output])}
                      </span>
                    </Checkbox>
                    <Text
                      className="text-muted-fg text-xs/5"
                      slot="description"
                    >
                      {estimateOf(output)}
                    </Text>
                  </CheckboxField>

                  {selected && output === "text" ? (
                    <label className="mt-3 grid gap-1 ps-8">
                      <span className="text-muted-fg text-xs font-bold tracking-[0.08em] uppercase [font-stretch:87.5%]">
                        {t("folioExtractTextFormat")}
                      </span>
                      <NativeSelect>
                        <NativeSelectContent
                          value={textFormat}
                          onChange={(event) => {
                            if (
                              event.target.value === "txt" ||
                              event.target.value === "json"
                            ) {
                              setTextFormat(event.target.value);
                            }
                          }}
                        >
                          {(["txt", "json"] as const).map((format) => (
                            <option key={format} value={format}>
                              {t(TEXT_FORMAT_KEY[format])}
                            </option>
                          ))}
                        </NativeSelectContent>
                      </NativeSelect>
                    </label>
                  ) : null}

                  {selected && output === "links" ? (
                    <label className="mt-3 grid gap-1 ps-8">
                      <span className="text-muted-fg text-xs font-bold tracking-[0.08em] uppercase [font-stretch:87.5%]">
                        {t("folioExtractLinkFormat")}
                      </span>
                      <NativeSelect>
                        <NativeSelectContent
                          value={linkFormat}
                          onChange={(event) => {
                            if (
                              event.target.value === "csv" ||
                              event.target.value === "json"
                            ) {
                              setLinkFormat(event.target.value);
                            }
                          }}
                        >
                          {(["csv", "json"] as const).map((format) => (
                            <option key={format} value={format}>
                              {t(LINK_FORMAT_KEY[format])}
                            </option>
                          ))}
                        </NativeSelectContent>
                      </NativeSelect>
                    </label>
                  ) : null}

                  {selected && output === "pages" ? (
                    <div className="mt-3 grid gap-3 ps-8 sm:grid-cols-2">
                      <label className="grid gap-1">
                        <span className="text-muted-fg text-xs font-bold tracking-[0.08em] uppercase [font-stretch:87.5%]">
                          {t("folioExtractImageFormat")}
                        </span>
                        <NativeSelect>
                          <NativeSelectContent
                            value={imageFormat}
                            onChange={(event) => {
                              if (
                                event.target.value === "png" ||
                                event.target.value === "webp"
                              ) {
                                setImageFormat(event.target.value);
                              }
                            }}
                          >
                            {(["png", "webp"] as const).map((format) => (
                              <option
                                disabled={format === "webp" && !canWebp}
                                key={format}
                                value={format}
                              >
                                {t(IMAGE_FORMAT_KEY[format])}
                              </option>
                            ))}
                          </NativeSelectContent>
                        </NativeSelect>
                      </label>
                      <label className="grid gap-1">
                        <span className="text-muted-fg text-xs font-bold tracking-[0.08em] uppercase [font-stretch:87.5%]">
                          {t("folioExtractImageWidth")}
                        </span>
                        <NativeSelect>
                          <NativeSelectContent
                            value={imageWidth}
                            onChange={(event) => {
                              if (
                                event.target.value === "standard" ||
                                event.target.value === "double"
                              ) {
                                setImageWidth(event.target.value);
                              }
                            }}
                          >
                            {(["standard", "double"] as const).map((width) => (
                              <option key={width} value={width}>
                                {t(WIDTH_KEY[width])}
                              </option>
                            ))}
                          </NativeSelectContent>
                        </NativeSelect>
                      </label>
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ul>
        </section>

        {denied.length > 0 ? (
          <Note intent="warning">
            <p>{t("folioExtractDenied")}</p>
            <ul className="mt-1 list-disc ps-4">
              {denied.map((output) => (
                <li key={output}>{t(OUTPUT_DENIED[output])}</li>
              ))}
            </ul>
          </Note>
        ) : null}
        {checked.size === 0 ? (
          <Note intent="warning">{t("folioExtractNoOutput")}</Note>
        ) : null}

        {checked.has("text") ? (
          <Note intent="warning">{t("folioExtractTextWarning")}</Note>
        ) : null}
        {checked.has("links") ? (
          <Note>{t("folioExtractLinkLimit")}</Note>
        ) : null}
        {checked.has("pages") ? (
          <>
            <Note intent="warning">{t("folioExtractPagesWarning")}</Note>
            <Note>
              {t("folioExtractPixelCap", {
                megapixels: folioExtractMegapixels(FOLIO_EXTRACT_MAX_PIXELS),
              })}
            </Note>
          </>
        ) : null}
        {checked.has("attachments") ? (
          <Note>{t("folioExtractAttachmentLimit")}</Note>
        ) : null}

        {overPageCap ? (
          <Note intent="danger">
            {t("folioExtractPageCap", {
              count: FOLIO_EXTRACT_MAX_PAGES,
            })}
          </Note>
        ) : null}
        {noPages ? (
          <Note intent="warning">{t("folioExtractNoPages")}</Note>
        ) : null}
        {attachmentsEmpty ? (
          <Note intent="warning">{t("folioExtractNoAttachments")}</Note>
        ) : null}
        {attachmentState === "error" && checked.has("attachments") ? (
          <Note intent="danger">{t("folioExtractAttachmentsUnreadable")}</Note>
        ) : null}
        {failure ? (
          <Note intent="danger">
            {t("folioExtractOutputFailed", {
              message: failure.message,
              output: t(OUTPUT_LABEL[failure.output]),
            })}
          </Note>
        ) : null}
        {phase === "stopped" ? (
          <Note intent="warning">{t("folioExtractStopped")}</Note>
        ) : null}

        {result ? (
          <output aria-live="polite" className="block">
            <section className="border-rule border-2 p-3">
              <p className="text-fg text-sm leading-5 font-bold">
                {t("folioExtractDone")}
              </p>
              <p className="text-muted-fg mt-1 text-sm/6">
                {t("folioExtractReceipt", {
                  count: result.files.length,
                  size: folioExtractFormatSize(result.totalBytes, locale),
                })}
              </p>
              <ul className="text-muted-fg mt-2 max-h-32 overflow-auto text-xs/5">
                {result.files.map((file) => (
                  <li className="truncate" key={file.path}>
                    {file.path}
                  </li>
                ))}
              </ul>
              {result.notes.map((note) => (
                <p className="text-muted-fg mt-2 text-xs/5" key={note}>
                  {note}
                </p>
              ))}
            </section>
          </output>
        ) : null}

        <output aria-live="polite" className="sr-only">
          {phase === "running"
            ? t("folioExtractLive")
            : phase === "done"
              ? t("folioExtractLiveDone")
              : phase === "stopped"
                ? t("folioExtractLiveStopped")
                : ""}
        </output>
      </div>

      <footer className="border-rule bg-overlay border-t-2">
        {phase === "running" ? (
          <progress
            aria-label={t("folioExtractProgress")}
            className="bg-border [&::-moz-progress-bar]:bg-accent [&::-webkit-progress-bar]:bg-border [&::-webkit-progress-value]:bg-accent block h-1 w-full appearance-none border-0"
            max={Math.max(progress.total, 1)}
            value={progress.total === 0 ? undefined : progress.done}
          />
        ) : null}
        <div className="flex flex-col gap-2 px-5 py-4">
          {phase === "running" ? (
            <Button intent="danger" onPress={cancel}>
              <HiStop aria-hidden="true" />
              {progress.total > 0
                ? t("folioExtractStop", {
                    done: progress.done,
                    total: progress.total,
                  })
                : t("folioExtractStopIdle")}
            </Button>
          ) : result ? (
            <Button intent="primary" onPress={save}>
              <HiArrowDownTray aria-hidden="true" />
              {result.zip
                ? t("folioExtractDownloadZip")
                : t("folioExtractDownloadFile", { name: result.name })}
            </Button>
          ) : (
            <Button
              intent="primary"
              isDisabled={!canStart}
              onPress={() => {
                void run();
              }}
            >
              <HiDocumentArrowDown aria-hidden="true" />
              {t("folioExtractStart")}
            </Button>
          )}
          {phase === "done" || phase === "failed" || phase === "stopped" ? (
            <Button intent="plain" onPress={reset}>
              {t("folioExtractReset")}
            </Button>
          ) : null}
        </div>
      </footer>
    </aside>
  );
};
