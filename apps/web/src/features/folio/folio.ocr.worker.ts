/// <reference lib="webworker" />

/* oxlint-disable unicorn/require-post-message-target-origin -- A dedicated Worker has no target origin; this is not window.postMessage. */

import fontkit from "@pdf-lib/fontkit";
import {
  beginText,
  endText,
  PDFArray,
  PDFDict,
  PDFDocument,
  PDFName,
  PDFString,
  setFontAndSize,
  setTextMatrix,
  setTextRenderingMode,
  showText,
  TextRenderingMode,
} from "pdf-lib";
import type { PDFObject, PDFRef } from "pdf-lib";
import { createWorker, OEM } from "tesseract.js";
import type { Block } from "tesseract.js";

import {
  FOLIO_OCR_ENGINE,
  FOLIO_OCR_MARKER_KEY,
  formatMarker,
  placeWordBox,
  textDirection,
  textMatrix,
} from "./folio.ocr";
import type { FolioOcrLanguage, FolioOcrPage, FolioOcrWord } from "./folio.ocr";
import type { FolioOcrReply, FolioOcrRequest } from "./folio.ocr.types";
import { isFolioOcrRequest } from "./folio.ocr.types";

interface Job {
  readonly bytes: Uint8Array;
  readonly id: string;
  readonly languages: readonly FolioOcrLanguage[];
  readonly pages: FolioOcrPage[];
  cancelled: boolean;
}

let job: Job | null = null;
let engine: Awaited<ReturnType<typeof createWorker>> | null = null;

const engineOptions = {
  // The loader carries the WASM inside itself, and the traineddata files are
  // served from the app's own origin. The service worker caches both, so the
  // engine's own IndexedDB cache would hold a second copy.
  cacheMethod: "none" as const,
  corePath: "/folio/ocr/tesseract-core-simd-lstm.wasm.js",
  langPath: "/folio/ocr",
  workerBlobURL: false,
  workerPath: "/folio/ocr/tesseract-worker.js",
};

const post = (message: FolioOcrReply) => {
  // SAFETY: this module runs only as the dedicated worker that
  // folio.ocr.worker-client.ts creates.
  const scope = self as DedicatedWorkerGlobalScope;
  if (message.type === "done") {
    scope.postMessage(message, [message.bytes]);
    return;
  }
  scope.postMessage(message);
};

const fail = (
  id: string,
  reason: Extract<FolioOcrReply, { type: "failed" }>["reason"],
  message: string
) => {
  post({ id, message, reason, type: "failed" });
};

const loadFont = async () => {
  const response = await fetch("/fonts/pdf/archivo-latin-400-normal.ttf", {
    cache: "force-cache",
  });
  if (!response.ok) {
    throw new Error("the OCR font is missing");
  }
  return new Uint8Array(await response.arrayBuffer());
};

const dictOf = (
  document: PDFDocument,
  value: PDFObject | PDFRef | undefined
) => {
  if (!value) {
    return null;
  }
  try {
    return document.context.lookup(value, PDFDict) ?? null;
  } catch {
    return null;
  }
};

/**
 * Does the form tree hold a signature field? Any `FT` of `/Sig` means a
 * rewrite breaks the signature, so Folio refuses before it renders a page.
 */
const isSigned = (document: PDFDocument) => {
  const acro = dictOf(document, document.catalog.get(PDFName.of("AcroForm")));
  const fields = acro?.lookup(PDFName.of("Fields"), PDFArray);
  if (!fields) {
    return false;
  }
  const seen = new Set<PDFDict>();
  const visit = (value: PDFObject, depth: number): boolean => {
    if (depth > 12) {
      return false;
    }
    const dict = dictOf(document, value);
    if (!dict || seen.has(dict)) {
      return false;
    }
    seen.add(dict);
    const type = dict.get(PDFName.of("FT"));
    if (type instanceof PDFName && type.asString() === "/Sig") {
      return true;
    }
    const kids = dict.lookup(PDFName.of("Kids"), PDFArray);
    if (!kids) {
      return false;
    }
    return kids.asArray().some((kid) => visit(kid, depth + 1));
  };
  return fields.asArray().some((field) => visit(field, 0));
};

const start = async (request: Extract<FolioOcrRequest, { type: "start" }>) => {
  if (job) {
    fail(request.id, "engine", "Another OCR run is active.");
    return;
  }
  const bytes = new Uint8Array(request.bytes);
  let document: PDFDocument;
  try {
    document = await PDFDocument.load(bytes, { updateMetadata: false });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (/encrypt/iu.test(message)) {
      fail(request.id, "encrypted", "The PDF is encrypted.");
      return;
    }
    fail(request.id, "protocol", `The PDF could not be read: ${message}`);
    return;
  }
  if (isSigned(document)) {
    fail(request.id, "signed", "The PDF has a signature field.");
    return;
  }

  job = {
    bytes,
    cancelled: false,
    id: request.id,
    languages: request.languages,
    pages: [],
  };
  try {
    engine = await createWorker(
      [...request.languages],
      OEM.LSTM_ONLY,
      engineOptions
    );
  } catch {
    job = null;
    fail(request.id, "engine", "The OCR engine could not start.");
    return;
  }
  post({
    id: request.id,
    pageCount: document.getPageCount(),
    type: "ready",
  });
};

const wordsOf = (blocks: readonly Block[] | null): FolioOcrWord[] => {
  const words: FolioOcrWord[] = [];
  for (const block of blocks ?? []) {
    for (const paragraph of block.paragraphs) {
      for (const line of paragraph.lines) {
        for (const word of line.words) {
          const { bbox, confidence, text } = word;
          if (!text) {
            continue;
          }
          words.push({
            box: { x0: bbox.x0, x1: bbox.x1, y0: bbox.y0, y1: bbox.y1 },
            confidence,
            text,
          });
        }
      }
    }
  }
  return words;
};

const recognize = async (
  request: Extract<FolioOcrRequest, { type: "page" }>
) => {
  if (!job || job.id !== request.id || job.cancelled) {
    return;
  }
  if (!engine) {
    post({
      id: request.id,
      message: "The OCR engine is not running.",
      pageIndex: request.pageIndex,
      type: "page-failed",
    });
    return;
  }
  try {
    const blob = new Blob([request.image], { type: "image/png" });
    const result = await engine.recognize(
      blob,
      {},
      { blocks: true, text: false }
    );
    const { blocks, confidence } = result.data;
    const page: FolioOcrPage = {
      confidence,
      height: request.height,
      pageIndex: request.pageIndex,
      skipped: 0,
      width: request.width,
      words: wordsOf(blocks),
    };
    job.pages.push(page);
    post({
      confidence: page.confidence,
      id: request.id,
      pageIndex: request.pageIndex,
      skipped: 0,
      type: "page",
      words: page.words,
    });
  } catch (error) {
    post({
      id: request.id,
      message: error instanceof Error ? error.message : "OCR failed",
      pageIndex: request.pageIndex,
      type: "page-failed",
    });
  }
};

const write = async (current: Job) => {
  const [fontBytes, document] = await Promise.all([
    loadFont(),
    PDFDocument.load(new Uint8Array(current.bytes), { updateMetadata: false }),
  ]);
  document.registerFontkit(fontkit);
  const font = await document.embedFont(fontBytes, { subset: true });
  const supported = new Set(font.getCharacterSet());
  let skipped = 0;

  for (const result of current.pages) {
    const page = document.getPage(result.pageIndex);
    const crop = page.getCropBox();
    const box = {
      height: crop.height,
      width: crop.width,
      x: crop.x,
      y: crop.y,
    };
    const rotation = page.getRotation().angle;
    // The resource key is not `font.name`: pdf-lib gives it a random suffix,
    // and a missing key makes viewers copy the raw glyph codes.
    const fontKey = page.node.newFontDictionary(font.name, font.ref);
    for (const word of result.words) {
      const placement = placeWordBox(
        word.box,
        { height: result.height, width: result.width },
        box,
        rotation
      );
      const size = placement.height;
      let natural = 0;
      try {
        natural = font.widthOfTextAtSize(word.text, size);
      } catch {
        skipped += 1;
        continue;
      }
      if (!Number.isFinite(natural) || natural <= 0) {
        skipped += 1;
        continue;
      }
      let encodable = true;
      for (const character of word.text) {
        if (!supported.has(character.codePointAt(0) ?? 0)) {
          encodable = false;
          break;
        }
      }
      if (!encodable) {
        skipped += 1;
        continue;
      }
      const scale = Math.min(10, Math.max(0.1, placement.width / natural));
      const matrix = textMatrix(placement.rotation);
      const direction = textDirection(placement.rotation);
      const offset = size * 0.2;
      const x = placement.x + direction.x * offset;
      const y = placement.y + direction.y * offset;
      try {
        page.pushOperators(
          setTextRenderingMode(TextRenderingMode.Invisible),
          beginText(),
          setFontAndSize(fontKey, size),
          setTextMatrix(
            matrix.a * scale,
            matrix.b * scale,
            matrix.c,
            matrix.d,
            x,
            y
          ),
          showText(font.encodeText(word.text)),
          endText()
        );
      } catch {
        skipped += 1;
      }
    }
  }

  const pages = current.pages
    .map((page) => page.pageIndex + 1)
    .toSorted((left, right) => left - right);
  const marker = formatMarker({
    engine: FOLIO_OCR_ENGINE,
    languages: current.languages,
    pages,
  });
  const infoRef = document.context.trailerInfo.Info;
  const info = infoRef ? dictOf(document, infoRef) : null;
  const dict = info ?? document.context.obj({});
  dict.set(PDFName.of(FOLIO_OCR_MARKER_KEY), PDFString.of(marker));
  if (!infoRef) {
    document.context.trailerInfo.Info = document.context.register(dict);
  }
  const producer = document.getProducer();
  document.setProducer(producer ? `${producer}; Folio OCR` : "Folio OCR");
  const bytes = await document.save({ useObjectStreams: true });
  const output = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(output).set(bytes);
  return { output, skipped };
};

const finish = async (
  request: Extract<FolioOcrRequest, { type: "finish" }>
) => {
  if (!job || job.id !== request.id) {
    return;
  }
  const current = job;
  job = null;
  try {
    const { output, skipped } = await write(current);
    post({ bytes: output, id: request.id, skipped, type: "done" });
  } catch (error) {
    fail(
      request.id,
      "write",
      error instanceof Error ? error.message : "The OCR copy was not written."
    );
  } finally {
    const running = engine;
    engine = null;
    if (running) {
      try {
        await running.terminate();
      } catch {
        // The engine is already gone; the copy is written either way.
      }
    }
  }
};

const cancel = async (
  request: Extract<FolioOcrRequest, { type: "cancel" }>
) => {
  if (!job || job.id !== request.id) {
    return;
  }
  job.cancelled = true;
  const running = engine;
  engine = null;
  if (running) {
    try {
      await running.terminate();
    } catch {
      // The engine is already gone; the job stops either way.
    }
  }
};

// SAFETY: this module runs only as the dedicated worker created in
// folio.ocr.worker-client.ts.
const worker = self as DedicatedWorkerGlobalScope;

worker.addEventListener("message", (event: MessageEvent<unknown>) => {
  const request = event.data;
  if (!isFolioOcrRequest(request)) {
    return;
  }
  if (request.type === "start") {
    void start(request);
    return;
  }
  if (request.type === "page") {
    void recognize(request);
    return;
  }
  if (request.type === "finish") {
    void finish(request);
    return;
  }
  void cancel(request);
});
