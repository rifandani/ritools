/* oxlint-disable eslint/max-classes-per-file, anti-slop/no-unknown-parameters, complexity, eslint/class-methods-use-this, typescript/no-non-null-assertion, anti-slop/require-safety-comment-for-type-assertion, anti-slop/no-known-value-widening, eslint/no-await-in-loop, eslint/no-array-for-each, unicorn/no-array-sort, eslint/prefer-ternary, eslint/require-await, eslint/no-empty-function, react-doctor/js-combine-iterations, react-doctor/js-set-map-lookups, react-doctor/async-await-in-loop, react-doctor/js-index-maps -- The session transaction checks every identity and state invariant before each assertion; loops are serialized on purpose. */
import type { PDFDocument } from "pdf-lib";

import type {
  Annotation,
  Command,
  ExportPlan,
  ExportWarning,
  Facts,
  FormField,
  FormValue,
  Page,
  PageId,
  PlanId,
  Reason,
  Request,
  Response,
  Revision,
  SessionId,
  SearchMatch,
  Snapshot,
  SourceId,
  SourcePlan,
} from "./folio";
import {
  HISTORY_MAX_BYTES,
  HISTORY_MAX_ENTRIES,
  defaultRetry,
  exportFilename,
  historyFits,
} from "./folio";
import { AdapterError, adapterError } from "./folio.errors";
import type { FolioReader, RenderedBitmap, ReaderAssets } from "./folio.reader";
import { openReader } from "./folio.reader";
import {
  WriterError,
  createWriterAnnotation,
  deleteWriterAnnotation,
  deleteWriterPages,
  extractWriterBytes,
  importWriterPages,
  hasInheritedFormResources,
  hasInternalLinks,
  inspectStructure,
  inspectWriter,
  loadWriter,
  orderBlockers,
  readWriterAnnotations,
  readWriterForms,
  readWriterPages,
  reorderWriterPages,
  rotateWriterPages,
  saveWriter,
  setWriterFormValue,
  tagAnnotations,
  updateWriterAnnotation,
} from "./folio.writer";

export type ProgressPhase =
  | "engine-download"
  | "opening"
  | "reading"
  | "searching"
  | "applying"
  | "planning"
  | "writing"
  | "verifying"
  | "closing";

export type ProgressSink = (
  phase: ProgressPhase,
  completed?: number,
  total?: number | null
) => void;

export interface EngineReply {
  readonly payload: Response;
  readonly bitmap?: ImageBitmap;
}

export interface FolioEngineOptions {
  readonly assets?: ReaderAssets;
  readonly open?: typeof openReader;
}

interface SourceState {
  readonly id: SourceId;
  readonly bytes: Uint8Array;
  readonly namespace: string;
  readonly pageIds: PageId[];
  readonly pageIndexes: Map<PageId, number>;
  readonly facts: Facts;
  readonly pages: Page[];
  readonly blockers: Reason[];
}

interface InverseAnnotation {
  readonly kind: "annotation";
  readonly action: "delete" | "restore";
  readonly annotation: Annotation;
}

interface InverseForm {
  readonly kind: "form";
  readonly field: FormField["id"];
  readonly value: FormValue;
}

interface HistoryEntry {
  readonly change: string;
  readonly commandId: string;
  readonly command: Command;
  readonly inverse: InverseAnnotation | InverseForm | null;
  readonly beforeBytes: Uint8Array | null;
  readonly afterBytes: Uint8Array | null;
  readonly beforePageIds: readonly PageId[] | null;
  readonly afterPageIds: readonly PageId[] | null;
  readonly invalidatedPages: readonly PageId[];
  readonly invalidateOutline: boolean;
  readonly invalidateForms: boolean;
  readonly retainedBytes: number;
}

interface PlanState {
  readonly plan: ExportPlan;
  readonly pages: readonly PageId[];
}

const unique = <T>(values: readonly T[]) => [...new Set(values)];

const sameValue = (left: FormValue, right: FormValue): boolean =>
  JSON.stringify(left) === JSON.stringify(right);

const formValueEmpty = (field: FormField): boolean => {
  if (field.value._tag === "Text") {
    return field.value.value.trim().length === 0;
  }
  if (field.value._tag === "Check") {
    return !field.value.checked;
  }
  if (field.value._tag === "Radio") {
    return field.value.option === null;
  }
  return field.value.selected.length === 0;
};

const textKey = (text: string) => text.replaceAll(/\s+/gu, " ").trim();

const annotationKey = (annotation: Annotation) =>
  [
    annotation._tag,
    annotation._tag === "AddedText" ? annotation.text : annotation.contents,
  ].join("\u0000");

const hex = (buffer: ArrayBuffer): string =>
  [...new Uint8Array(buffer)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");

const digest = async (bytes: Uint8Array): Promise<string> => {
  const copy = new Uint8Array(bytes);
  return hex(await crypto.subtle.digest("SHA-256", copy.buffer));
};

export class FolioEngine {
  private readonly assets: ReaderAssets;
  private readonly open: typeof openReader;
  private session: SessionId | null = null;
  private revision = 0;
  private sourceName = "document.pdf";
  private reader: FolioReader | null = null;
  private writer: PDFDocument | null = null;
  private currentBytes: Uint8Array | null = null;
  private readerNeedsAssets = false;
  private pageIds: PageId[] = [];
  private facts: Facts | null = null;
  private readOnlyReasons: Reason[] = [];
  private serial = 0;
  private pageSerial = 0;
  private changeSerial = 0;
  private planSerial = 0;
  private sourceSerial = 0;
  private readonly commands = new Map<
    string,
    { readonly change: string; readonly revision: number }
  >();
  private history: HistoryEntry[] = [];
  private cursor = 0;
  private sources = new Map<SourceId, SourceState>();
  private plans = new Map<PlanId, PlanState>();
  private downloaded: Revision | null = null;
  private closed = false;

  constructor(options: FolioEngineOptions = {}) {
    this.assets = options.assets ?? {};
    this.open = options.open ?? openReader;
  }

  private nextId(prefix: string): string {
    this.serial += 1;
    return `${prefix}:${this.serial}`;
  }

  private nextPageId(): PageId {
    this.pageSerial += 1;
    return `page:${this.pageSerial}` as PageId;
  }

  private retainedBytes(): number {
    const historyBytes = this.history.reduce(
      (total, item) => total + item.retainedBytes,
      0
    );
    const sourceBytes = [...this.sources.values()].reduce(
      (total, source) => total + source.bytes.length,
      0
    );
    return historyBytes + sourceBytes;
  }

  private historyState() {
    const retainedBytes = this.retainedBytes();
    return {
      canUndo: this.cursor > 0,
      canRedo: this.cursor < this.history.length,
      entries: this.history.length,
      cursor: this.cursor,
      retainedBytes,
      maxBytes: HISTORY_MAX_BYTES,
      maxEntries: HISTORY_MAX_ENTRIES,
      limitReached:
        this.history.length >= HISTORY_MAX_ENTRIES ||
        retainedBytes >= HISTORY_MAX_BYTES,
    };
  }

  private async snapshot(): Promise<Snapshot> {
    if (!this.session || !this.facts || !this.currentBytes) {
      throw adapterError("session-lost");
    }
    const pages = this.writer
      ? readWriterPages(this.writer, this.pageIds)
      : await this.reader!.pagesWithoutWriter(this.pageIds);
    return {
      session: this.session,
      revision: this.revision as Revision,
      pages,
      facts: this.facts,
      history: this.historyState(),
      downloadedRevision: this.downloaded,
    };
  }

  private assertSession(session: SessionId): void {
    if (!this.session || session !== this.session) {
      throw adapterError("stale-session");
    }
  }

  private assertRevision(session: SessionId, revision: Revision): void {
    this.assertSession(session);
    if (revision !== this.revision) {
      throw adapterError("stale-revision");
    }
  }

  private assertWritable(reason: Reason | null = null): PDFDocument {
    if (!this.writer) {
      throw adapterError(
        "read-only",
        this.readOnlyReasons[0] ?? "unknown-structure"
      );
    }
    if (this.readOnlyReasons.length > 0) {
      throw adapterError("read-only", this.readOnlyReasons[0] ?? reason);
    }
    return this.writer;
  }

  private assertOrderWritable(): void {
    const doc = this.assertWritable();
    const blockers = [...orderBlockers(doc), ...inspectStructure(doc)];
    if (blockers.length > 0) {
      throw adapterError("unsupported-preservation", blockers[0]!);
    }
  }

  private freshness(
    request: Request & {
      readonly session: SessionId;
      readonly revision: Revision;
    }
  ): void {
    this.assertRevision(request.session, request.revision);
  }

  private findPage(id: PageId): number {
    const index = this.pageIds.indexOf(id);
    if (index === -1) {
      throw adapterError("unknown-page");
    }
    return index;
  }

  private pageIndexMap(): Map<PageId, number> {
    return new Map(this.pageIds.map((id, index) => [id, index]));
  }

  private ensureTagged(doc: PDFDocument): void {
    tagAnnotations(doc);
  }

  private pageAnnotations(pageId: PageId): Annotation[] {
    if (!this.writer) {
      return [];
    }
    const index = this.findPage(pageId);
    return readWriterAnnotations(this.writer, index, pageId);
  }

  private findAnnotation(id: string): Annotation | null {
    for (const pageId of this.pageIds) {
      const found = this.pageAnnotations(pageId).find(
        (annotation) => annotation.id === id
      );
      if (found) {
        return found;
      }
    }
    return null;
  }

  private formFields(): FormField[] {
    return this.writer ? readWriterForms(this.writer, this.pageIds) : [];
  }

  private findField(id: FormField["id"]): FormField | null {
    return this.formFields().find((field) => field.id === id) ?? null;
  }

  private async computeFacts(
    reader: FolioReader,
    writer: PDFDocument | null,
    fallbackPageCount: number,
    pageIds: readonly PageId[]
  ): Promise<{ facts: Facts; reasons: Reason[] }> {
    const base = await reader.facts();
    const reasons = new Set<Reason>();
    if (reader.encrypted) {
      reasons.add("encrypted");
      const { permissions } = base;
      if (
        !permissions.copy ||
        !permissions.annotate ||
        !permissions.fillForms ||
        !permissions.changePages ||
        !permissions.extract
      ) {
        reasons.add("permission-restricted");
      }
    }
    if (writer) {
      try {
        for (const reason of [
          ...inspectWriter(writer),
          ...inspectStructure(writer),
        ]) {
          reasons.add(reason);
        }
      } catch {
        reasons.add("unknown-structure");
      }
    } else {
      reasons.add("unknown-structure");
    }
    if (base.hasTags) {
      reasons.add("tags");
    }
    const forms = writer ? readWriterForms(writer, pageIds) : [];
    if (new Set(forms.map((field) => field.name)).size !== forms.length) {
      reasons.add("unknown-structure");
    }
    if (
      writer?.getPages().some((page) => {
        const rotation = ((page.getRotation().angle % 360) + 360) % 360;
        const media = page.getMediaBox();
        const crop = page.getCropBox();
        return (
          ![0, 90, 180, 270].includes(rotation) ||
          !Number.isFinite(media.width) ||
          !Number.isFinite(media.height) ||
          media.width <= 0 ||
          media.height <= 0 ||
          !Number.isFinite(crop.width) ||
          !Number.isFinite(crop.height) ||
          crop.width <= 0 ||
          crop.height <= 0
        );
      })
    ) {
      reasons.add("unknown-structure");
    }
    const facts: Facts = {
      ...base,
      pageCount: Math.max(fallbackPageCount, 1),
      signed: reasons.has("signed"),
      hasForms: forms.length > 0,
      hasTags: reasons.has("tags"),
      hasLayers: reasons.has("layers"),
      hasAttachments: base.hasAttachments || reasons.has("attachments"),
      hasInternalLinks:
        base.hasInternalLinks || (writer ? hasInternalLinks(writer) : false),
      readOnlyReasons: [...reasons],
    };
    return { facts, reasons: [...reasons] };
  }

  private async openSession(
    request: Extract<Request, { _tag: "Open" }>,
    progress: ProgressSink
  ): Promise<Response> {
    progress("opening");
    if (request.bytes.length === 0) {
      throw adapterError("invalid-pdf");
    }
    const reader = await this.open(
      request.bytes,
      this.assets,
      request.password
    );
    if (reader.numPages === 0) {
      await reader.destroy();
      throw adapterError("no-pages", "no-pages");
    }
    let writer: PDFDocument | null = null;
    try {
      writer = await loadWriter(request.bytes);
    } catch (error) {
      if (
        error instanceof WriterError &&
        error.code === "read-only" &&
        error.reason !== "encrypted"
      ) {
        await reader.destroy();
        throw adapterError("invalid-pdf");
      }
      writer = null;
    }
    const ids: PageId[] = [];
    for (let index = 0; index < reader.numPages; index += 1) {
      ids.push(this.nextPageId());
    }
    let computed: Awaited<ReturnType<FolioEngine["computeFacts"]>>;
    try {
      computed = await this.computeFacts(reader, writer, reader.numPages, ids);
      if (writer) {
        const pages = readWriterPages(writer, ids);
        if (pages.length !== ids.length) {
          throw adapterError("invalid-pdf");
        }
      }
    } catch {
      await reader.destroy();
      throw adapterError("invalid-pdf");
    }
    const { facts, reasons } = computed;
    await this.reader?.destroy();
    this.session = `session:${(this.serial += 1)}` as SessionId;
    this.revision = 0;
    this.sourceName = request.name?.trim() || "document.pdf";
    this.pageIds = ids;
    this.reader = reader;
    this.readerNeedsAssets = false;
    this.writer = writer;
    this.currentBytes = new Uint8Array(request.bytes);
    this.facts = facts;
    this.readOnlyReasons = reasons;
    this.commands.clear();
    this.history = [];
    this.cursor = 0;
    this.sources.clear();
    this.plans.clear();
    this.downloaded = null;
    this.closed = false;
    return {
      _tag: "Opened",
      request: request.request,
      snapshot: await this.snapshot(),
    };
  }

  private validateSource(
    session: SessionId,
    revision: Revision,
    bytes: Uint8Array,
    namespace: string
  ): Promise<SourceState> {
    this.assertRevision(session, revision);
    return this.inspectSource(bytes, namespace);
  }

  private async inspectSource(
    bytes: Uint8Array,
    namespace: string
  ): Promise<SourceState> {
    const reader = await this.open(bytes, this.assets);
    try {
      if (reader.numPages === 0) {
        throw adapterError("source-rejected", "no-pages");
      }
      let writer: PDFDocument | null = null;
      try {
        writer = await loadWriter(bytes);
      } catch {
        throw adapterError("source-rejected", "encrypted");
      }
      const url = await reader.facts();
      const reasons = new Set<Reason>([
        ...inspectWriter(writer),
        ...inspectStructure(writer),
        ...orderBlockers(writer),
      ]);
      if (url.hasTags) {
        reasons.add("tags");
      }
      const sourceId = `source:${(this.sourceSerial += 1)}` as SourceId;
      const pageIds: PageId[] = [];
      for (let index = 0; index < reader.numPages; index += 1) {
        pageIds.push(`${sourceId}:page:${index}` as PageId);
      }
      const pages = readWriterPages(writer, pageIds);
      const fields = readWriterForms(writer, pageIds);
      if (new Set(fields.map((field) => field.name)).size !== fields.length) {
        reasons.add("unknown-structure");
      }
      if (
        writer.getPages().some((page) => {
          const rotation = ((page.getRotation().angle % 360) + 360) % 360;
          const media = page.getMediaBox();
          const crop = page.getCropBox();
          return (
            ![0, 90, 180, 270].includes(rotation) ||
            !Number.isFinite(media.width) ||
            !Number.isFinite(media.height) ||
            media.width <= 0 ||
            media.height <= 0 ||
            !Number.isFinite(crop.width) ||
            !Number.isFinite(crop.height) ||
            crop.width <= 0 ||
            crop.height <= 0
          );
        })
      ) {
        reasons.add("unknown-structure");
      }
      const existingNames = this.writer
        ? this.formFields().map((field) => field.name)
        : [];
      let suggested = namespace;
      let suffix = 1;
      while (
        existingNames.some(
          (name) =>
            name === suggested ||
            name.startsWith(`${suggested}.`) ||
            suggested.startsWith(`${name}.`)
        )
      ) {
        suffix += 1;
        suggested = `${namespace}-${suffix}`;
      }
      if (hasInheritedFormResources(writer)) {
        reasons.add("unsupported-preservation");
      }
      const facts: Facts = {
        ...url,
        pageCount: Math.max(reader.numPages, 1),
        hasForms: fields.length > 0,
        hasTags: reasons.has("tags"),
        hasLayers: reasons.has("layers"),
        readOnlyReasons: [...reasons],
      };
      return {
        id: sourceId,
        bytes: new Uint8Array(bytes),
        namespace: suggested,
        pageIds,
        pageIndexes: new Map(pageIds.map((id, index) => [id, index])),
        facts,
        pages,
        blockers: [...reasons],
      };
    } finally {
      await reader.destroy();
    }
  }

  private async inspectSourceRequest(
    request: Extract<Request, { _tag: "InspectSource" }>,
    progress: ProgressSink
  ): Promise<Response> {
    progress("reading");
    const namespace = `source-${this.sourceSerial + 1}`;
    const source = await this.validateSource(
      request.session,
      request.revision,
      request.bytes,
      namespace
    );
    this.sources.set(source.id, source);
    return {
      _tag: "SourceInspected",
      request: request.request,
      session: request.session,
      revision: request.revision,
      source: source.id,
      pages: source.pages,
      facts: {
        ...source.facts,
        readOnlyReasons: source.blockers,
      },
      namespace: source.namespace,
      blockers: source.blockers,
    };
  }

  private async commit(
    request: Extract<Request, { _tag: "Commit" }>,
    progress: ProgressSink,
    signal?: AbortSignal
  ): Promise<Response> {
    this.assertSession(request.session);
    const previous = this.commands.get(request.commandId);
    if (previous) {
      return {
        _tag: "Changed",
        request: request.request,
        change: previous.change as never,
        snapshot: await this.snapshot(),
        invalidatedPages: [],
        invalidateOutline: false,
        invalidateForms: false,
      };
    }
    this.assertRevision(request.session, request.baseRevision);
    const doc = this.assertWritable();
    progress("applying");
    const beforeBytes = await saveWriter(doc);
    const beforePageIds = [...this.pageIds];
    const beforeForms = this.formFields();
    const beforeAnnotations = this.allAnnotations();
    const candidate = await loadWriter(beforeBytes);
    this.ensureTagged(candidate);
    const nextIds = [...this.pageIds];
    const inverse = await this.applyCommand(
      candidate,
      nextIds,
      request.command,
      beforeForms,
      beforeAnnotations
    );
    if (signal?.aborted) {
      throw adapterError("cancelled");
    }
    const afterBytes = await saveWriter(candidate);
    const checks = await loadWriter(afterBytes);
    if (checks.getPageCount() !== nextIds.length) {
      throw adapterError("verification-failed");
    }
    readWriterForms(checks, nextIds);
    const page = this.commandPageScope(request.command);
    const isPageChange =
      request.command._tag === "RotatePages" ||
      request.command._tag === "ReorderPages" ||
      request.command._tag === "DeletePages" ||
      request.command._tag === "ImportPages";
    const entryBytes = isPageChange
      ? beforeBytes.length + afterBytes.length
      : JSON.stringify(inverse ?? {}).length;
    const nextHistory = this.history.slice(0, this.cursor);
    for (const dropped of this.history.slice(this.cursor)) {
      this.commands.delete(dropped.commandId);
    }
    const nextRetained =
      nextHistory.reduce((total, item) => total + item.retainedBytes, 0) +
      entryBytes +
      [...this.sources.values()].reduce(
        (total, source) => total + source.bytes.length,
        0
      );
    if (!historyFits(nextHistory.length, nextRetained)) {
      throw adapterError("resource-limit");
    }
    if (signal?.aborted) {
      throw adapterError("cancelled");
    }
    this.assertRevision(request.session, request.baseRevision);
    await this.publish(candidate, afterBytes, nextIds, signal);
    this.changeSerial += 1;
    const change = `change:${this.changeSerial}`;
    const entry: HistoryEntry = {
      change,
      commandId: request.commandId,
      command: request.command,
      inverse,
      beforeBytes: isPageChange ? beforeBytes : null,
      afterBytes: isPageChange ? afterBytes : null,
      beforePageIds: isPageChange ? beforePageIds : null,
      afterPageIds: isPageChange ? [...nextIds] : null,
      invalidatedPages: page.pages,
      invalidateOutline: page.outline,
      invalidateForms: page.forms,
      retainedBytes: entryBytes,
    };
    this.history = [...nextHistory, entry];
    this.cursor = this.history.length;
    this.revision += 1;
    this.commands.set(request.commandId, {
      change,
      revision: this.revision,
    });
    this.plans.clear();
    this.updateFormFacts();
    return {
      _tag: "Changed",
      request: request.request,
      change: change as never,
      snapshot: await this.snapshot(),
      invalidatedPages: page.pages,
      invalidateOutline: page.outline,
      invalidateForms: page.forms,
    };
  }

  private assertAnnotationDraft(annotation: Annotation): void {
    if (
      (annotation._tag === "Highlight" && annotation.quads.length === 0) ||
      (annotation._tag === "Ink" &&
        (annotation.strokes.length === 0 ||
          annotation.strokes.some((stroke) => stroke.length < 2)))
    ) {
      throw adapterError("invalid-request");
    }
  }

  private allAnnotations(): Annotation[] {
    return this.pageIds.flatMap((pageId) => this.pageAnnotations(pageId));
  }

  private commandPageScope(command: Command): {
    pages: PageId[];
    outline: boolean;
    forms: boolean;
  } {
    if (
      command._tag === "CreateAnnotation" ||
      command._tag === "UpdateAnnotation"
    ) {
      return {
        pages: [command.annotation.page],
        outline: false,
        forms: false,
      };
    }
    if (command._tag === "DeleteAnnotation") {
      const found = this.findAnnotation(command.annotation);
      return {
        pages: found ? [found.page] : [],
        outline: false,
        forms: false,
      };
    }
    if (command._tag === "SetFormValue") {
      const field = this.findField(command.field);
      return {
        pages: field ? unique(field.widgets.map((widget) => widget.page)) : [],
        outline: false,
        forms: true,
      };
    }
    if (command._tag === "RotatePages") {
      return { pages: [...command.pages], outline: false, forms: false };
    }
    if (command._tag === "ReorderPages") {
      return { pages: [...this.pageIds], outline: true, forms: false };
    }
    if (command._tag === "DeletePages") {
      return {
        pages: this.pageIds.filter((id) => !command.pages.includes(id)),
        outline: true,
        forms: true,
      };
    }
    return { pages: [...this.pageIds], outline: false, forms: true };
  }

  private async applyCommand(
    doc: PDFDocument,
    ids: PageId[],
    command: Command,
    beforeForms: readonly FormField[],
    beforeAnnotations: readonly Annotation[]
  ): Promise<InverseAnnotation | InverseForm | null> {
    if (command._tag === "CreateAnnotation") {
      const { page } = command.annotation;
      const index = ids.indexOf(page);
      if (index === -1) {
        throw adapterError("unknown-page");
      }
      if (this.findAnnotation(command.annotation.id)) {
        throw adapterError("invalid-request");
      }
      await createWriterAnnotation(doc, doc.getPage(index), command.annotation);
      return {
        kind: "annotation",
        action: "delete",
        annotation: command.annotation,
      };
    }
    if (command._tag === "UpdateAnnotation") {
      this.assertAnnotationDraft(command.annotation);
      const existing = beforeAnnotations.find(
        (annotation) => annotation.id === command.annotation.id
      );
      if (
        !existing ||
        existing.page !== command.annotation.page ||
        existing._tag !== command.annotation._tag
      ) {
        throw adapterError("unknown-annotation");
      }
      const index = ids.indexOf(command.annotation.page);
      if (index === -1) {
        throw adapterError("unknown-page");
      }
      await updateWriterAnnotation(doc, doc.getPage(index), command.annotation);
      return { kind: "annotation", action: "restore", annotation: existing };
    }
    if (command._tag === "DeleteAnnotation") {
      const existing = beforeAnnotations.find(
        (annotation) => annotation.id === command.annotation
      );
      if (!existing) {
        throw adapterError("unknown-annotation");
      }
      const index = ids.indexOf(existing.page);
      if (index === -1) {
        throw adapterError("unknown-page");
      }
      deleteWriterAnnotation(doc, doc.getPage(index), command.annotation);
      return { kind: "annotation", action: "restore", annotation: existing };
    }
    if (command._tag === "SetFormValue") {
      const field = beforeForms.find((item) => item.id === command.field);
      if (!field) {
        throw adapterError("unknown-field");
      }
      await setWriterFormValue(doc, field.name, command.value);
      return { kind: "form", field: field.id, value: field.value };
    }
    if (command._tag === "RotatePages") {
      if (
        command.pages.length === 0 ||
        new Set(command.pages).size !== command.pages.length
      ) {
        throw adapterError("invalid-selection");
      }
      for (const page of command.pages) {
        if (!ids.includes(page)) {
          throw adapterError("unknown-page");
        }
      }
      rotateWriterPages(doc, ids, command.pages, command.clockwise);
      return null;
    }
    if (command._tag === "ReorderPages") {
      if (
        command.order.length !== ids.length ||
        new Set(command.order).size !== ids.length ||
        command.order.some((id) => !ids.includes(id))
      ) {
        throw adapterError("invalid-selection");
      }
      this.assertOrderWritable();
      reorderWriterPages(doc, command.order, ids);
      ids.splice(0, ids.length, ...command.order);
      return null;
    }
    if (command._tag === "DeletePages") {
      if (
        command.pages.length === 0 ||
        new Set(command.pages).size !== command.pages.length
      ) {
        throw adapterError("invalid-selection");
      }
      if (command.pages.length >= ids.length) {
        throw adapterError("last-page");
      }
      for (const page of command.pages) {
        if (!ids.includes(page)) {
          throw adapterError("unknown-page");
        }
      }
      this.assertOrderWritable();
      deleteWriterPages(doc, command.pages, ids);
      const surviving = ids.filter((id) => !command.pages.includes(id));
      ids.splice(0, ids.length, ...surviving);
      return null;
    }
    this.assertOrderWritable();
    await this.applyImport(doc, ids, command.sources, command.before);
    return null;
  }

  private async applyImport(
    doc: PDFDocument,
    ids: PageId[],
    sources: readonly SourcePlan[],
    before: PageId | null
  ): Promise<void> {
    if (sources.length === 0) {
      throw adapterError("invalid-selection");
    }
    if (sources.some((plan) => plan.pages.length === 0)) {
      throw adapterError("invalid-selection");
    }
    const sourceIds = sources.map((plan) => plan.source);
    if (new Set(sourceIds).size !== sourceIds.length) {
      throw adapterError("invalid-selection");
    }
    const selected = new Set<string>();
    let insertion = before === null ? ids.length : ids.indexOf(before);
    if (insertion < 0) {
      throw adapterError("unknown-page");
    }
    for (const plan of sources) {
      const source = this.sources.get(plan.source);
      if (!source) {
        throw adapterError("source-rejected");
      }
      if (source.blockers.length > 0) {
        throw adapterError("source-rejected", source.blockers[0]);
      }
      const indexes = plan.pages.map(
        (page) => source.pageIndexes.get(page) ?? -1
      );
      if (
        indexes.some((index) => index < 0) ||
        plan.pages.some((page) => selected.has(page))
      ) {
        throw adapterError("invalid-selection");
      }
      plan.pages.forEach((page) => selected.add(page));
      const orderedPages = [...plan.pages].sort(
        (left, right) =>
          (source.pageIndexes.get(left) ?? 0) -
          (source.pageIndexes.get(right) ?? 0)
      );
      const added = await importWriterPages(
        doc,
        source.bytes,
        source.pageIds,
        orderedPages,
        plan.fieldNamespace,
        insertion
      );
      const newIds = Array.from({ length: added }, () => this.nextPageId());
      ids.splice(insertion, 0, ...newIds);
      insertion += added;
    }
  }

  private async publish(
    doc: PDFDocument,
    bytes: Uint8Array,
    ids: PageId[],
    signal?: AbortSignal
  ): Promise<void> {
    const reader = await this.open(bytes, this.assets);
    if (reader.numPages !== ids.length) {
      await reader.destroy();
      throw adapterError("verification-failed");
    }
    const pages = readWriterPages(doc, ids);
    if (pages.length !== ids.length) {
      await reader.destroy();
      throw adapterError("verification-failed");
    }
    if (signal?.aborted) {
      await reader.destroy();
      throw adapterError("cancelled");
    }
    await this.reader?.destroy();
    this.reader = reader;
    this.readerNeedsAssets = false;
    this.writer = doc;
    this.currentBytes = bytes;
    this.pageIds = ids;
    this.facts = this.facts
      ? {
          ...this.facts,
          pageCount: ids.length,
          hasForms: this.formFields().length > 0,
        }
      : this.facts;
  }

  private updateFormFacts(): void {
    if (!this.facts) {
      return;
    }
    this.facts = {
      ...this.facts,
      pageCount: this.pageIds.length,
      hasForms: this.formFields().length > 0,
    };
  }

  private async undoRedo(
    request: Extract<Request, { _tag: "Undo" | "Redo" }>,
    direction: -1 | 1,
    progress: ProgressSink,
    signal?: AbortSignal
  ): Promise<Response> {
    this.assertRevision(request.session, request.baseRevision);
    this.assertWritable();
    const target = this.cursor + (direction === -1 ? -1 : 0);
    const entry = this.history[target];
    if (!entry) {
      throw adapterError("invalid-request", null, "history-boundary");
    }
    let nextIds = [...this.pageIds];
    let bytes: Uint8Array;
    if (
      entry.beforeBytes &&
      entry.afterBytes &&
      entry.beforePageIds &&
      entry.afterPageIds
    ) {
      if (direction === -1) {
        bytes = new Uint8Array(entry.beforeBytes);
        nextIds = [...entry.beforePageIds];
      } else {
        bytes = new Uint8Array(entry.afterBytes);
        nextIds = [...entry.afterPageIds];
      }
      const restored = await loadWriter(bytes);
      await this.publish(restored, bytes, nextIds, signal);
    } else {
      const doc = await loadWriter(await saveWriter(this.writer!));
      this.ensureTagged(doc);
      progress("applying");
      if (direction === -1 && entry.inverse) {
        await this.applyInverse(doc, nextIds, entry.inverse);
      } else if (direction === 1) {
        await this.applyCommand(
          doc,
          nextIds,
          entry.command,
          this.formFields(),
          this.allAnnotations()
        );
      }
      bytes = await saveWriter(doc);
      this.assertRevision(request.session, request.baseRevision);
      await this.publish(doc, bytes, nextIds, signal);
    }
    this.cursor += direction;
    this.revision += 1;
    this.changeSerial += 1;
    const change = `change:${this.changeSerial}`;
    this.commands.set(`history:${change}`, { change, revision: this.revision });
    this.updateFormFacts();
    this.plans.clear();
    return {
      _tag: "Changed",
      request: request.request,
      change: change as never,
      snapshot: await this.snapshot(),
      invalidatedPages: entry.invalidatedPages,
      invalidateOutline: entry.invalidateOutline,
      invalidateForms: entry.invalidateForms,
    };
  }

  private async applyInverse(
    doc: PDFDocument,
    ids: PageId[],
    inverse: InverseAnnotation | InverseForm
  ): Promise<void> {
    if (inverse.kind === "form") {
      const field = this.formFields().find((item) => item.id === inverse.field);
      if (!field) {
        throw adapterError("unknown-field");
      }
      await setWriterFormValue(doc, field.name, inverse.value);
      return;
    }
    const { annotation } = inverse;
    const index = ids.indexOf(annotation.page);
    if (index === -1) {
      throw adapterError("unknown-page");
    }
    if (inverse.action === "delete") {
      deleteWriterAnnotation(doc, doc.getPage(index), annotation.id);
      return;
    }
    const existing = this.pageAnnotations(annotation.page).find(
      (item) => item.id === annotation.id
    );
    if (existing) {
      await updateWriterAnnotation(doc, doc.getPage(index), annotation);
    } else {
      await createWriterAnnotation(doc, doc.getPage(index), annotation);
    }
  }

  private async read(
    request: Request & { session: SessionId; revision: Revision },
    signal?: AbortSignal
  ): Promise<Response> {
    this.assertRevision(request.session, request.revision);
    return this.routeRead(request, signal);
  }

  private async routeRead(
    request: Request & { session: SessionId; revision: Revision },
    signal?: AbortSignal
  ): Promise<Response> {
    if (request._tag === "ReadViewport") {
      throw adapterError("invalid-request");
    }
    if (request._tag === "ReadThumbnail") {
      throw adapterError("invalid-request");
    }
    if (request._tag === "ReadText") {
      const index = this.findPage(request.page);
      const text = await this.reader!.text(index);
      return {
        _tag: "TextRead",
        request: request.request,
        session: request.session,
        revision: request.revision,
        page: request.page,
        runs: text.runs,
        language: text.language,
        tagged: this.facts?.hasTags ?? false,
      };
    }
    if (request._tag === "ReadOutline") {
      const items = await this.reader!.outline(this.pageIds);
      return {
        _tag: "OutlineRead",
        request: request.request,
        session: request.session,
        revision: request.revision,
        items,
      };
    }
    if (request._tag === "ReadAnnotations") {
      this.findPage(request.page);
      return {
        _tag: "AnnotationsRead",
        request: request.request,
        session: request.session,
        revision: request.revision,
        page: request.page,
        annotations: this.pageAnnotations(request.page),
      };
    }
    if (request._tag === "ReadForms") {
      return {
        _tag: "FormsRead",
        request: request.request,
        session: request.session,
        revision: request.revision,
        fields: this.formFields(),
      };
    }
    if (request._tag === "Search") {
      return this.search(request, signal);
    }
    if (request._tag === "PlanExport") {
      return this.planExport(request);
    }
    throw adapterError("invalid-request");
  }

  private async search(
    request: Extract<Request, { _tag: "Search" }>,
    signal?: AbortSignal
  ): Promise<Response> {
    const { query } = request;
    const matches: SearchMatch[] = [];
    if (query.length > 0) {
      for (const [index, pageId] of this.pageIds.entries()) {
        if (signal?.aborted) {
          throw adapterError("cancelled");
        }
        const found = await this.reader!.search(index, pageId, query);
        matches.push(...found);
        if (matches.length >= request.maxMatches) {
          break;
        }
      }
    }
    const complete = matches.length < request.maxMatches;
    let current = null;
    if (matches.length > 0) {
      let index = 0;
      if (request.cursor) {
        index = matches.findIndex(
          (match) =>
            match.page === request.cursor!.page &&
            match.start === request.cursor!.offset
        );
        if (index < 0) {
          index = request.direction === "next" ? 0 : matches.length - 1;
        } else {
          index =
            request.direction === "next"
              ? (index + 1) % matches.length
              : (index - 1 + matches.length) % matches.length;
        }
      } else {
        index = request.direction === "next" ? 0 : matches.length - 1;
      }
      current = matches[index] ?? null;
    }
    return {
      _tag: "SearchRead",
      request: request.request,
      session: request.session,
      revision: request.revision,
      query,
      matches,
      totalKnown: matches.length,
      complete,
      current,
    };
  }

  private planExport(
    request: Extract<Request, { _tag: "PlanExport" }>
  ): Response {
    const { scope } = request;
    const pages =
      scope._tag === "Full"
        ? [...this.pageIds]
        : this.pageIds.filter((page) => scope.pages.includes(page));
    if (
      pages.length === 0 ||
      (scope._tag === "Selected" &&
        new Set(scope.pages).size !== scope.pages.length)
    ) {
      throw adapterError("invalid-selection");
    }
    const blockers = new Set<Reason>(this.readOnlyReasons);
    if (scope._tag === "Selected" && this.writer) {
      for (const reason of orderBlockers(this.writer)) {
        blockers.add(reason);
      }
    }
    const fields = this.formFields();
    const warnings: ExportWarning[] = [];
    if (fields.some((field) => field.required && formValueEmpty(field))) {
      warnings.push("required-fields-incomplete");
    }
    if (this.facts?.hasText && !this.facts.hasTags) {
      warnings.push("source-reading-order");
    }
    warnings.push("not-conformance-checked");
    if (this.downloaded !== this.revision) {
      warnings.push("first-download-required");
    }
    this.planSerial += 1;
    const plan: ExportPlan = {
      request: request.request,
      session: request.session,
      revision: request.revision,
      id: `plan:${this.planSerial}` as PlanId,
      scope,
      pages,
      filename: exportFilename(this.sourceName, scope),
      blockers: [...blockers],
      warnings,
      expiresAfterRevision: request.revision,
    };
    this.plans.set(plan.id, { plan, pages });
    return { _tag: "ExportPlanned", request: request.request, plan };
  }

  private async write(
    request: Extract<Request, { _tag: "Write" }>,
    progress: ProgressSink
  ): Promise<Response> {
    this.assertRevision(request.session, request.revision);
    const planned = this.plans.get(request.plan);
    if (!planned || planned.plan.expiresAfterRevision !== request.revision) {
      throw adapterError("stale-plan");
    }
    if (planned.plan.blockers.length > 0) {
      throw adapterError("read-only", planned.plan.blockers[0]!);
    }
    progress("writing");
    const bytes =
      planned.plan.scope._tag === "Full"
        ? new Uint8Array(this.currentBytes!)
        : await extractWriterBytes(
            this.currentBytes!,
            this.pageIds,
            planned.pages
          );
    progress("verifying");
    await this.verify(bytes, planned);
    return {
      _tag: "Written",
      request: request.request,
      session: request.session,
      revision: request.revision,
      plan: planned.plan.id,
      bytes,
      mime: "application/pdf",
      sha256: await digest(bytes),
      writtenPages: planned.pages.length,
    };
  }

  private async verify(bytes: Uint8Array, planned: PlanState): Promise<void> {
    try {
      const check = await loadWriter(bytes);
      if (check.getPageCount() !== planned.pages.length) {
        throw adapterError("verification-failed");
      }
      const expectedPages = readWriterPages(this.writer!, this.pageIds);
      const expected = planned.pages.map((id) => {
        const page = expectedPages.find((item) => item.id === id);
        if (!page) {
          throw adapterError("verification-failed");
        }
        return page;
      });
      const outputPages = readWriterPages(check, planned.pages as PageId[]);
      for (const [index, page] of outputPages.entries()) {
        const source = expected[index]!;
        if (
          page.rotation !== source.rotation ||
          Math.abs(page.mediaBox.width - source.mediaBox.width) > 0.01 ||
          Math.abs(page.mediaBox.height - source.mediaBox.height) > 0.01
        ) {
          throw adapterError("verification-failed");
        }
      }
      const reader = await this.open(bytes, this.assets);
      try {
        if (reader.numPages !== planned.pages.length) {
          throw adapterError("verification-failed");
        }
        for (const [index, pageId] of planned.pages.entries()) {
          const sourceIndex = this.pageIds.indexOf(pageId);
          const expectedText = await this.reader!.text(sourceIndex);
          const actualText = await reader.text(index);
          if (
            textKey(expectedText.runs.map((run) => run.text).join("")) !==
            textKey(actualText.runs.map((run) => run.text).join(""))
          ) {
            throw adapterError("verification-failed");
          }
        }
      } finally {
        await reader.destroy();
      }
      const fields = readWriterForms(check, planned.pages as PageId[]);
      const expectedFields = this.formFields().filter((field) =>
        field.widgets.some((widget) => planned.pages.includes(widget.page))
      );
      for (const field of expectedFields) {
        const actual = fields.find((item) => item.name === field.name);
        if (!actual || !sameValue(actual.value, field.value)) {
          throw adapterError("verification-failed");
        }
      }
      for (const pageId of planned.pages) {
        const sourceIndex = this.pageIds.indexOf(pageId);
        const expectedAnnotations = readWriterAnnotations(
          this.writer!,
          sourceIndex,
          pageId
        );
        const outputIndex = planned.pages.indexOf(pageId);
        const actual = readWriterAnnotations(check, outputIndex, pageId);
        if (
          actual.length !== expectedAnnotations.length ||
          actual.map(annotationKey).sort().join("\u0001") !==
            expectedAnnotations.map(annotationKey).sort().join("\u0001")
        ) {
          throw adapterError("verification-failed");
        }
      }
    } catch (error) {
      if (error instanceof AdapterError) {
        throw error;
      }
      throw adapterError("verification-failed");
    }
  }

  async handle(
    request: Request,
    progress: ProgressSink = () => {},
    signal?: AbortSignal
  ): Promise<EngineReply> {
    if (signal?.aborted) {
      return {
        payload: this.rejected(request.request, adapterError("cancelled")),
      };
    }
    try {
      if (request._tag === "Open") {
        return { payload: await this.openSession(request, progress) };
      }
      if (request._tag === "Cancel") {
        return {
          payload: {
            _tag: "Cancelled",
            request: request.request,
            target: request.target,
          },
        };
      }
      if (request._tag === "Close") {
        return { payload: await this.close(request) };
      }
      if (!this.session || !this.facts) {
        throw adapterError("session-lost");
      }
      if (request._tag === "InspectSource") {
        return { payload: await this.inspectSourceRequest(request, progress) };
      }
      if (request._tag === "ReleaseSource") {
        this.freshness(request);
        this.sources.delete(request.source);
        return {
          payload: {
            _tag: "SourceReleased",
            request: request.request,
            session: request.session,
            revision: request.revision,
            source: request.source,
          },
        };
      }
      if (request._tag === "Commit") {
        return { payload: await this.commit(request, progress, signal) };
      }
      if (request._tag === "Undo") {
        return { payload: await this.undoRedo(request, -1, progress, signal) };
      }
      if (request._tag === "Redo") {
        return { payload: await this.undoRedo(request, 1, progress, signal) };
      }
      if (request._tag === "Write") {
        return { payload: await this.write(request, progress) };
      }
      if (request._tag === "AcknowledgeDownload") {
        this.freshness(request);
        const planned = this.plans.get(request.plan);
        if (!planned || planned.plan.expiresAfterRevision !== this.revision) {
          throw adapterError("stale-plan");
        }
        if (planned.plan.scope._tag !== "Full") {
          throw adapterError("invalid-request");
        }
        this.downloaded = this.revision as Revision;
        return {
          payload: {
            _tag: "Acknowledged",
            request: request.request,
            session: request.session,
            revision: request.revision,
            plan: request.plan,
            snapshot: await this.snapshot(),
          },
        };
      }
      if (
        this.readerNeedsAssets &&
        this.currentBytes &&
        (request._tag === "ReadViewport" ||
          request._tag === "ReadThumbnail" ||
          request._tag === "ReadText" ||
          request._tag === "Search")
      ) {
        this.freshness(request);
        const reader = await openReader(this.currentBytes, this.assets);
        await this.reader?.destroy();
        this.reader = reader;
        this.readerNeedsAssets = false;
      }
      if (request._tag === "ReadViewport") {
        this.freshness(request);
        const index = this.findPage(request.viewport.page);
        const rendered = await this.reader!.render(
          index,
          request.viewport.clip,
          request.viewport.scale,
          request.viewport.devicePixelRatio,
          request.viewport.rotation
        );
        return {
          payload: this.rendered(request, rendered, request.viewport.page),
          bitmap: rendered.bitmap ?? undefined,
        };
      }
      if (request._tag === "ReadThumbnail") {
        this.freshness(request);
        const index = this.findPage(request.page);
        const rendered = await this.reader!.thumbnail(index, request.maxWidth);
        return {
          payload: this.rendered(request, rendered, request.page),
          bitmap: rendered.bitmap ?? undefined,
        };
      }
      return { payload: await this.read(request, signal) };
    } catch (error) {
      if (
        error instanceof AdapterError &&
        error.code === "offline-asset-missing" &&
        !this.facts?.encrypted &&
        (request._tag === "ReadViewport" ||
          request._tag === "ReadThumbnail" ||
          request._tag === "ReadText" ||
          request._tag === "Search")
      ) {
        this.readerNeedsAssets = true;
      }
      if (error instanceof AdapterError && error.code === "session-lost") {
        this.session = null;
      }
      return { payload: this.rejected(request.request, error) };
    }
  }

  private rendered(
    request: {
      request: Request["request"];
      session: SessionId;
      revision: Revision;
    },
    rendered: RenderedBitmap,
    page: PageId
  ): Response {
    return {
      _tag: "Rendered",
      request: request.request,
      session: request.session,
      revision: request.revision,
      page,
      width: rendered.width,
      height: rendered.height,
      transform: rendered.transform,
      bitmapToken: this.nextId("bitmap") as never,
    };
  }

  private rejected(request: Request["request"], error: unknown): Response {
    const adapter =
      error instanceof AdapterError
        ? error
        : error instanceof WriterError
          ? new AdapterError(error.code, error.reason)
          : adapterError("write-failed");
    return {
      _tag: "Rejected",
      request,
      code: adapter.code,
      reason: adapter.reason,
      preservedRevision: this.session ? (this.revision as Revision) : null,
      sessionAlive: this.session !== null,
      retry: defaultRetry(adapter.code),
    };
  }

  private async close(
    request: Extract<Request, { _tag: "Close" }>
  ): Promise<Response> {
    if (this.session && request.session !== this.session) {
      throw adapterError("stale-session");
    }
    const session = this.session ?? request.session;
    await this.reader?.destroy();
    this.reader = null;
    this.writer = null;
    this.currentBytes = null;
    this.session = null;
    this.facts = null;
    this.pageIds = [];
    this.readOnlyReasons = [];
    this.history = [];
    this.cursor = 0;
    this.commands.clear();
    this.sources.clear();
    this.plans.clear();
    this.downloaded = null;
    this.closed = true;
    return {
      _tag: "Closed",
      request: request.request,
      session,
    };
  }

  async destroy(): Promise<void> {
    await this.reader?.destroy();
    this.reader = null;
    this.writer = null;
    this.currentBytes = null;
    this.session = null;
    this.facts = null;
    this.pageIds = [];
    this.history = [];
    this.cursor = 0;
    this.sources.clear();
    this.plans.clear();
    this.closed = true;
  }
}
