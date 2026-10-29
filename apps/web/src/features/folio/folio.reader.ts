/* oxlint-disable anti-slop/no-unknown-parameters, anti-slop/require-safety-comment-for-type-assertion, anti-slop/no-chained-type-assertions, method-signature-style, eslint/no-await-in-loop, eslint/require-await, anti-slop/no-conditional-empty-object-spread, anti-slop/no-runtime-typeof, react-doctor/async-defer-await, react-doctor/server-sequential-independent-await, react-doctor/async-parallel -- PDF.js items and viewports are narrowed at the private adapter edge, and page reads are ordered by the protocol. */
import { Schema } from "effect";
import type { PDFDocumentProxy, PageViewport } from "pdfjs-dist";
/* oxlint-disable anti-slop/no-unknown-parameters -- PDF.js returns library items whose shapes are narrowed here, at the private adapter boundary. */
import {
  AnnotationMode,
  GlobalWorkerOptions,
  getDocument,
  PermissionFlag,
  VerbosityLevel,
} from "pdfjs-dist/legacy/build/pdf.mjs";

import { TextRun, TEXT_CACHE_MAX_BYTES, findLiteralMatches } from "./folio";
import type {
  Angle,
  Box as BoxType,
  Facts,
  Matrix as MatrixType,
  Page,
  PageId,
  Permissions,
  TextRun as TextRunType,
} from "./folio";
import { BoundedCache } from "./folio.cache";
import { adapterError } from "./folio.errors";

export interface ReaderAssets {
  readonly workerSrc?: string;
  readonly cMapUrl?: string;
  readonly standardFontDataUrl?: string;
  readonly wasmUrl?: string;
}

export interface PageText {
  readonly runs: TextRunType[];
  readonly boxes: BoxType[];
  readonly language: string | null;
}

export interface RenderedBitmap {
  readonly width: number;
  readonly height: number;
  readonly transform: MatrixType;
  readonly bitmap: ImageBitmap | null;
}

export interface OutlineNode {
  readonly id: string;
  readonly parent: string | null;
  readonly title: string;
  readonly page: PageId | null;
  readonly externalUrl: string | null;
}

const textItems = (items: unknown[]): TextRunType[] => {
  const runs: TextRunType[] = [];
  for (const item of items) {
    const decoded = Schema.decodeUnknownExit(TextRun)({
      text: (item as { str?: unknown }).str,
      transform: (item as { transform?: unknown }).transform,
      width: (item as { width?: unknown }).width,
      height: (item as { height?: unknown }).height,
      direction: (item as { dir?: unknown }).dir,
      hasEol: (item as { hasEOL?: unknown }).hasEOL ?? false,
    });
    if (decoded._tag === "Success") {
      runs.push(decoded.value);
    }
  }
  return runs;
};

const boxFromRect = (
  viewport: PageViewport,
  x: number,
  y: number,
  width: number,
  height: number
): BoxType => {
  const [px1, py1] = viewport.convertToPdfPoint(x, y);
  const [px2, py2] = viewport.convertToPdfPoint(x + width, y + height);
  return {
    x: Math.min(px1, px2),
    y: Math.min(py1, py2),
    width: Math.max(Math.abs(px2 - px1), 0.01),
    height: Math.max(Math.abs(py2 - py1), 0.01),
  };
};

const runBox = (viewport: PageViewport, run: TextRunType): BoxType => {
  const [x, y] = [run.transform[4], run.transform[5]];
  return boxFromRect(viewport, x, y - run.height, run.width, run.height);
};

export interface FolioReader {
  readonly numPages: number;
  readonly encrypted: boolean;
  facts(): Promise<Facts>;
  pages(ids: readonly PageId[]): Promise<Page[]>;
  pagesWithoutWriter(ids: readonly PageId[]): Promise<Page[]>;
  text(pageIndex: number): Promise<PageText>;
  search(
    pageIndex: number,
    pageId: PageId,
    query: string
  ): Promise<ReturnType<typeof findLiteralMatches>>;
  outline(pages: readonly PageId[]): Promise<OutlineNode[]>;
  render(
    pageIndex: number,
    clip: BoxType,
    scale: number,
    devicePixelRatio: number,
    rotation: Angle
  ): Promise<RenderedBitmap>;
  thumbnail(pageIndex: number, maxWidth: number): Promise<RenderedBitmap>;
  destroy(): Promise<void>;
}

const permissionSet = (permissions: number[] | null): Permissions => {
  if (!permissions) {
    return {
      copy: true,
      annotate: true,
      fillForms: true,
      changePages: true,
      extract: true,
      download: true,
    };
  }
  const has = (flag: number) => permissions.includes(flag);
  return {
    copy:
      has(PermissionFlag.COPY) || has(PermissionFlag.COPY_FOR_ACCESSIBILITY),
    annotate: has(PermissionFlag.MODIFY_ANNOTATIONS),
    fillForms: has(PermissionFlag.FILL_INTERACTIVE_FORMS),
    changePages: has(PermissionFlag.MODIFY_CONTENTS),
    extract:
      has(PermissionFlag.COPY) ||
      has(PermissionFlag.COPY_FOR_ACCESSIBILITY) ||
      has(PermissionFlag.ASSEMBLE),
    download:
      has(PermissionFlag.COPY) ||
      has(PermissionFlag.COPY_FOR_ACCESSIBILITY) ||
      has(PermissionFlag.PRINT),
  };
};

const externalUrl = (url: string | null | undefined): string | null => {
  if (!url) {
    return null;
  }
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" || parsed.protocol === "http:"
      ? parsed.toString()
      : null;
  } catch {
    return null;
  }
};

const pageDetails = async (
  pdf: PDFDocumentProxy,
  index: number,
  id: PageId
): Promise<Page> => {
  const page = await pdf.getPage(index + 1);
  const [x1 = 0, y1 = 0, x2 = 0, y2 = 0] = page.view;
  const rotation = ((page.rotate % 360) + 360) % 360;
  return {
    id,
    index,
    label: String(index + 1),
    mediaBox: {
      x: Math.min(x1, x2),
      y: Math.min(y1, y2),
      width: Math.max(Math.abs(x2 - x1), 0.01),
      height: Math.max(Math.abs(y2 - y1), 0.01),
    },
    cropBox: {
      x: Math.min(x1, x2),
      y: Math.min(y1, y2),
      width: Math.max(Math.abs(x2 - x1), 0.01),
      height: Math.max(Math.abs(y2 - y1), 0.01),
    },
    rotation: ([0, 90, 180, 270].includes(rotation) ? rotation : 0) as Angle,
    userUnit:
      Number.isFinite(page.userUnit) && page.userUnit > 0 ? page.userUnit : 1,
  };
};

export const openReader = async (
  bytes: Uint8Array,
  assets: ReaderAssets = {},
  password?: string
): Promise<FolioReader> => {
  if (assets.workerSrc) {
    GlobalWorkerOptions.workerSrc = assets.workerSrc;
  }
  let pdf: PDFDocumentProxy;
  try {
    pdf = await getDocument({
      data: [...bytes],
      ...(password === undefined ? {} : { password }),
      isEvalSupported: false,
      enableXfa: false,
      useSystemFonts: false,
      useWorkerFetch: true,
      cMapPacked: true,
      verbosity: VerbosityLevel.ERRORS,
      ...(assets.cMapUrl === undefined ? {} : { cMapUrl: assets.cMapUrl }),
      ...(assets.standardFontDataUrl === undefined
        ? {}
        : { standardFontDataUrl: assets.standardFontDataUrl }),
      ...(assets.wasmUrl === undefined ? {} : { wasmUrl: assets.wasmUrl }),
    }).promise;
  } catch (error) {
    const named = error as {
      name?: unknown;
      code?: unknown;
      message?: unknown;
    };
    if (named.name === "PasswordException") {
      throw adapterError(
        named.code === 1 ? "password-required" : "wrong-password"
      );
    }
    if (
      named.name === "PasswordException" ||
      (typeof named.message === "string" &&
        /incorrect password/iu.test(named.message))
    ) {
      throw adapterError("wrong-password");
    }
    throw adapterError("invalid-pdf");
  }
  const permissions = await pdf.getPermissions();
  const text = new BoundedCache<number, PageText>(
    { maxCount: 32, maxBytes: TEXT_CACHE_MAX_BYTES },
    (pageText) =>
      pageText.runs.reduce((total, run) => total + run.text.length * 2 + 64, 0)
  );
  const textOf = async (index: number): Promise<PageText> => {
    const cached = text.get(index);
    if (cached) {
      return cached;
    }
    const page = await pdf.getPage(index + 1);
    const content = await page.getTextContent({ includeMarkedContent: false });
    const runs = textItems(content.items);
    const viewport = page.getViewport({ scale: 1 });
    const boxes = runs.map((run) => runBox(viewport, run));
    const result = {
      runs,
      boxes,
      language: typeof content.lang === "string" ? content.lang : null,
    };
    text.set(index, result);
    return result;
  };
  const renderPage = async (
    index: number,
    clip: BoxType,
    scale: number,
    devicePixelRatio: number,
    rotation: Angle
  ): Promise<RenderedBitmap> => {
    const page = await pdf.getPage(index + 1);
    const base = page.getViewport({
      scale: scale * devicePixelRatio,
      rotation,
    });
    const corners = [
      base.convertToViewportPoint(clip.x, clip.y),
      base.convertToViewportPoint(clip.x + clip.width, clip.y),
      base.convertToViewportPoint(clip.x, clip.y + clip.height),
      base.convertToViewportPoint(clip.x + clip.width, clip.y + clip.height),
    ];
    const minX = Math.min(...corners.map(([x]) => x));
    const minY = Math.min(...corners.map(([, y]) => y));
    const maxX = Math.max(...corners.map(([x]) => x));
    const maxY = Math.max(...corners.map(([, y]) => y));
    const width = Math.max(Math.ceil(maxX - minX), 1);
    const height = Math.max(Math.ceil(maxY - minY), 1);
    const viewport = base.clone({
      offsetX: -minX,
      offsetY: -minY,
    });
    if (typeof OffscreenCanvas === "undefined") {
      throw adapterError("offline-asset-missing");
    }
    const canvas = new OffscreenCanvas(width, height);
    const context = canvas.getContext("2d");
    if (!context) {
      throw adapterError("write-failed");
    }
    await page.render({
      canvas: canvas as unknown as HTMLCanvasElement,
      canvasContext: context as unknown as CanvasRenderingContext2D,
      viewport,
      annotationMode: AnnotationMode.ENABLE_FORMS,
      intent: "display",
    }).promise;
    return {
      width,
      height,
      transform: viewport.transform as unknown as MatrixType,
      bitmap: canvas.transferToImageBitmap(),
    };
  };
  const outlineNodes = async (pages: readonly PageId[]) => {
    const raw = await pdf.getOutline();
    if (!raw) {
      return [];
    }
    const result: OutlineNode[] = [];
    let serial = 0;
    const resolve = async (dest: unknown): Promise<PageId | null> => {
      let destination = dest;
      if (typeof destination === "string") {
        destination = await pdf.getDestination(destination);
      }
      if (!Array.isArray(destination) || destination.length === 0) {
        return null;
      }
      try {
        const index = await pdf.getPageIndex(destination[0] as never);
        return pages[index] ?? null;
      } catch {
        return null;
      }
    };
    const walk = async (
      items: typeof raw,
      parent: string | null
    ): Promise<void> => {
      for (const item of items) {
        const id = `outline:${(serial += 1)}`;
        result.push({
          id,
          parent,
          title: item.title,
          page: await resolve(item.dest),
          externalUrl: externalUrl(item.url),
        });
        if (item.items.length > 0) {
          await walk(item.items, id);
        }
      }
    };
    await walk(raw, null);
    return result;
  };
  const reader: FolioReader = {
    numPages: pdf.numPages,
    encrypted: permissions !== null,
    facts: async () => {
      const first = await textOf(0).catch(() => ({
        runs: [],
        boxes: [],
        language: null,
      }));
      const fieldObjects = await pdf.getFieldObjects().catch(() => null);
      const labels = await pdf.getPageLabels().catch(() => null);
      const attachments = await pdf.getAttachments().catch(() => null);
      const markInfo = await pdf.getMarkInfo().catch(() => null);
      const outline = await pdf.getOutline().catch(() => null);
      let internalLinks = false;
      for (let index = 1; index <= Math.min(pdf.numPages, 10); index += 1) {
        const page = await pdf.getPage(index);
        const annotations = await page.getAnnotations();
        if (
          annotations.some(
            (annotation) =>
              annotation.subtype === "Link" &&
              (annotation.dest !== undefined || annotation.url === undefined)
          )
        ) {
          internalLinks = true;
          break;
        }
      }
      const metadata = await pdf.getMetadata().catch(() => null);
      const normalized = permissionSet(permissions);
      return {
        pageCount: Math.max(pdf.numPages, 1),
        encrypted: permissions !== null,
        signed: false,
        hasText: first.runs.some((run) => run.text.trim().length > 0),
        hasForms: fieldObjects !== null && Object.keys(fieldObjects).length > 0,
        hasOutline: outline !== null && outline.length > 0,
        hasPageLabels: labels !== null && labels.length > 0,
        hasInternalLinks: internalLinks,
        hasMetadata:
          metadata !== null &&
          (Object.keys(metadata.info ?? {}).length > 0 ||
            metadata.metadata !== null),
        hasAttachments:
          attachments !== null && Object.keys(attachments).length > 0,
        hasTags: markInfo?.Marked === true,
        hasLayers: false,
        readOnlyReasons: [],
        permissions: normalized,
      };
    },
    pages: async (ids) =>
      Promise.all(ids.map((id, index) => pageDetails(pdf, index, id))),
    pagesWithoutWriter: async (ids) =>
      Promise.all(ids.map((id, index) => pageDetails(pdf, index, id))),
    text: textOf,
    search: async (pageIndex, pageId, query) => {
      const pageText = await textOf(pageIndex);
      return findLiteralMatches(pageId, pageText.runs, pageText.boxes, query);
    },
    outline: outlineNodes,
    render: renderPage,
    thumbnail: async (index, maxWidth) => {
      const info = await pageDetails(pdf, index, `page:${index}` as PageId);
      const scale = Math.max(maxWidth / info.cropBox.width, 0.01);
      return renderPage(index, info.cropBox, scale, 1, info.rotation);
    },
    destroy: async () => {
      text.clear();
      await pdf.destroy();
    },
  };
  return reader;
};
