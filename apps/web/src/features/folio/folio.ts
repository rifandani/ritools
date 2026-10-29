/* oxlint-disable eslint/max-classes-per-file, anti-slop/no-shape-in-symbol-names, anti-slop/no-conditional-empty-object-spread -- The frozen public contract groups tagged schemas and omits optional protocol keys at encode time. */
import { Schema } from "effect";

/** The frozen public contract is `folio-contract-v1`, protocol version 1. */
const Protocol = Schema.Literal(1);

const Count = Schema.Int.check(
  Schema.isGreaterThanOrEqualTo(0),
  Schema.isLessThanOrEqualTo(Number.MAX_SAFE_INTEGER)
);
const Positive = Count.check(Schema.isGreaterThanOrEqualTo(1));
const Id = Schema.String.check(Schema.isMinLength(1));

export const SessionId = Id.pipe(Schema.brand("FolioSessionId"));
export type SessionId = typeof SessionId.Type;
export const Revision = Count.pipe(Schema.brand("FolioRevision"));
export type Revision = typeof Revision.Type;
export const PageId = Id.pipe(Schema.brand("FolioPageId"));
export type PageId = typeof PageId.Type;
const FieldId = Id.pipe(Schema.brand("FolioFieldId"));
export type FieldId = typeof FieldId.Type;
export const AnnotationId = Id.pipe(Schema.brand("FolioAnnotationId"));
export type AnnotationId = typeof AnnotationId.Type;
export const SourceId = Id.pipe(Schema.brand("FolioSourceId"));
export type SourceId = typeof SourceId.Type;
export const RequestId = Id.pipe(Schema.brand("FolioRequestId"));
export type RequestId = typeof RequestId.Type;
export const PlanId = Id.pipe(Schema.brand("FolioPlanId"));
export type PlanId = typeof PlanId.Type;
export const ChangeId = Id.pipe(Schema.brand("FolioChangeId"));
export type ChangeId = typeof ChangeId.Type;

const Point = Schema.Tuple([Schema.Finite, Schema.Finite]);
export type Point = typeof Point.Type;
const Box = Schema.Struct({
  x: Schema.Finite,
  y: Schema.Finite,
  width: Schema.Finite.check(Schema.isGreaterThan(0)),
  height: Schema.Finite.check(Schema.isGreaterThan(0)),
});
export type Box = typeof Box.Type;
export const Matrix = Schema.Tuple([
  Schema.Finite,
  Schema.Finite,
  Schema.Finite,
  Schema.Finite,
  Schema.Finite,
  Schema.Finite,
]);
export type Matrix = typeof Matrix.Type;
const Angle = Schema.Literals([0, 90, 180, 270]);
export type Angle = typeof Angle.Type;

export const Page = Schema.Struct({
  id: PageId,
  index: Count,
  label: Schema.String,
  mediaBox: Box,
  cropBox: Box,
  rotation: Angle,
  userUnit: Schema.Finite.check(Schema.isGreaterThan(0)),
});
export type Page = typeof Page.Type;

const Reason = Schema.Literals([
  "signed",
  "encrypted",
  "permission-restricted",
  "xfa",
  "scripted-form",
  "active-content",
  "tags",
  "layers",
  "attachments",
  "unsupported-annotation",
  "unknown-structure",
  "unsupported-preservation",
  "no-pages",
  "unsupported-glyph",
]);
export type Reason = typeof Reason.Type;

const Permissions = Schema.Struct({
  copy: Schema.Boolean,
  annotate: Schema.Boolean,
  fillForms: Schema.Boolean,
  changePages: Schema.Boolean,
  extract: Schema.Boolean,
  download: Schema.Boolean,
});
export type Permissions = typeof Permissions.Type;

const Facts = Schema.Struct({
  pageCount: Positive,
  encrypted: Schema.Boolean,
  signed: Schema.Boolean,
  hasText: Schema.Boolean,
  hasForms: Schema.Boolean,
  hasOutline: Schema.Boolean,
  hasPageLabels: Schema.Boolean,
  hasInternalLinks: Schema.Boolean,
  hasMetadata: Schema.Boolean,
  hasAttachments: Schema.Boolean,
  hasTags: Schema.Boolean,
  hasLayers: Schema.Boolean,
  readOnlyReasons: Schema.Array(Reason),
  permissions: Permissions,
});
export type Facts = typeof Facts.Type;

const RGBA = Schema.Tuple([
  Count.check(Schema.isLessThanOrEqualTo(255)),
  Count.check(Schema.isLessThanOrEqualTo(255)),
  Count.check(Schema.isLessThanOrEqualTo(255)),
  Count.check(Schema.isLessThanOrEqualTo(255)),
]);
export type RGBA = typeof RGBA.Type;

const Annotation = Schema.TaggedUnion({
  Highlight: {
    id: AnnotationId,
    page: PageId,
    quads: Schema.Array(Schema.Tuple([Point, Point, Point, Point])),
    color: RGBA,
    contents: Schema.String,
  },
  Note: {
    id: AnnotationId,
    page: PageId,
    position: Point,
    contents: Schema.String,
  },
  Ink: {
    id: AnnotationId,
    page: PageId,
    strokes: Schema.Array(Schema.Array(Point)),
    width: Schema.Finite.check(Schema.isGreaterThan(0)),
    color: RGBA,
    contents: Schema.String,
  },
  AddedText: {
    id: AnnotationId,
    page: PageId,
    box: Box,
    text: Schema.String,
    fontSize: Schema.Finite.check(Schema.isGreaterThan(0)),
    color: RGBA,
  },
});
export type Annotation = typeof Annotation.Type;

const FormValue = Schema.TaggedUnion({
  Text: { value: Schema.String },
  Check: { checked: Schema.Boolean },
  Radio: { option: Schema.NullOr(Id) },
  Choice: { selected: Schema.Array(Id) },
});
export type FormValue = typeof FormValue.Type;

const FormWidget = Schema.Struct({
  page: PageId,
  box: Box,
  rotation: Angle,
});
export type FormWidget = typeof FormWidget.Type;

const FormField = Schema.Struct({
  id: FieldId,
  name: Schema.String,
  label: Schema.String,
  kind: Schema.Literals(["text", "checkbox", "radio", "list", "combo"]),
  value: FormValue,
  widgets: Schema.Array(FormWidget),
  readOnly: Schema.Boolean,
  required: Schema.Boolean,
  multiple: Schema.Boolean,
  editableCombo: Schema.Boolean,
  maxLength: Schema.NullOr(Count),
  options: Schema.Array(Schema.Struct({ id: Id, label: Schema.String })),
  unsupportedReasons: Schema.Array(Reason),
});
export type FormField = typeof FormField.Type;

const Selection = Schema.Struct({
  session: SessionId,
  revision: Revision,
  pages: Schema.Array(PageId),
});
export type Selection = typeof Selection.Type;

const SourcePlan = Schema.Struct({
  source: SourceId,
  pages: Schema.Array(PageId),
  fieldNamespace: Id,
});
export type SourcePlan = typeof SourcePlan.Type;

export const Command = Schema.TaggedUnion({
  CreateAnnotation: { annotation: Annotation },
  UpdateAnnotation: { annotation: Annotation },
  DeleteAnnotation: { annotation: AnnotationId },
  SetFormValue: { field: FieldId, value: FormValue },
  ReorderPages: { order: Schema.Array(PageId) },
  RotatePages: {
    pages: Schema.Array(PageId),
    clockwise: Schema.Literals([90, 180, 270]),
  },
  DeletePages: { pages: Schema.Array(PageId) },
  ImportPages: {
    sources: Schema.Array(SourcePlan),
    before: Schema.NullOr(PageId),
  },
});
export type Command = typeof Command.Type;

const History = Schema.Struct({
  canUndo: Schema.Boolean,
  canRedo: Schema.Boolean,
  entries: Count,
  cursor: Count,
  retainedBytes: Count,
  maxBytes: Positive,
  maxEntries: Positive,
  limitReached: Schema.Boolean,
});
export type History = typeof History.Type;

export const Snapshot = Schema.Struct({
  session: SessionId,
  revision: Revision,
  pages: Schema.Array(Page),
  facts: Facts,
  history: History,
  downloadedRevision: Schema.NullOr(Revision),
});
export type Snapshot = typeof Snapshot.Type;

const Envelope = {
  request: RequestId,
  session: SessionId,
  revision: Revision,
};

export const Viewport = Schema.Struct({
  page: PageId,
  clip: Box,
  scale: Schema.Finite.check(Schema.isGreaterThan(0)),
  devicePixelRatio: Schema.Finite.check(Schema.isGreaterThan(0)),
  rotation: Angle,
});
export type Viewport = typeof Viewport.Type;

export const TextRun = Schema.Struct({
  text: Schema.String,
  transform: Matrix,
  width: Schema.Finite,
  height: Schema.Finite,
  direction: Schema.Literals(["ltr", "rtl", "ttb"]),
  hasEol: Schema.Boolean,
});
export type TextRun = typeof TextRun.Type;

const SearchMatch = Schema.Struct({
  page: PageId,
  start: Count,
  length: Positive,
  boxes: Schema.Array(Box),
});
export type SearchMatch = typeof SearchMatch.Type;

export const ExportScope = Schema.TaggedUnion({
  Full: {},
  Selected: { pages: Schema.Array(PageId) },
});
export type ExportScope = typeof ExportScope.Type;

const ExportWarning = Schema.Literals([
  "required-fields-incomplete",
  "source-reading-order",
  "not-conformance-checked",
  "first-download-required",
]);
export type ExportWarning = typeof ExportWarning.Type;

export const ExportPlan = Schema.Struct({
  ...Envelope,
  id: PlanId,
  scope: ExportScope,
  pages: Schema.Array(PageId),
  filename: Id,
  blockers: Schema.Array(Reason),
  warnings: Schema.Array(ExportWarning),
  expiresAfterRevision: Revision,
});
export type ExportPlan = typeof ExportPlan.Type;

export const FolioErrorCode = Schema.Literals([
  "invalid-request",
  "invalid-pdf",
  "no-pages",
  "password-required",
  "wrong-password",
  "source-rejected",
  "read-only",
  "read-only-field",
  "unsupported-form",
  "unsupported-glyph",
  "unsupported-preservation",
  "invalid-selection",
  "last-page",
  "unknown-page",
  "unknown-field",
  "unknown-annotation",
  "stale-session",
  "stale-revision",
  "stale-plan",
  "cancelled",
  "offline-asset-missing",
  "resource-limit",
  "write-failed",
  "verification-failed",
  "worker-lost",
  "session-lost",
]);
export type FolioErrorCode = typeof FolioErrorCode.Type;

const Retry = Schema.Literals([
  "same-operation",
  "choose-file",
  "connect",
  "reopen",
  "none",
]);
export type Retry = typeof Retry.Type;

const retryFor: Record<FolioErrorCode, Retry> = {
  "invalid-request": "none",
  "invalid-pdf": "choose-file",
  "no-pages": "choose-file",
  "password-required": "same-operation",
  "wrong-password": "same-operation",
  "source-rejected": "choose-file",
  "read-only": "none",
  "read-only-field": "none",
  "unsupported-form": "none",
  "unsupported-glyph": "none",
  "unsupported-preservation": "none",
  "invalid-selection": "none",
  "last-page": "none",
  "unknown-page": "none",
  "unknown-field": "none",
  "unknown-annotation": "none",
  "stale-session": "reopen",
  "stale-revision": "same-operation",
  "stale-plan": "same-operation",
  cancelled: "same-operation",
  "offline-asset-missing": "connect",
  "resource-limit": "none",
  "write-failed": "same-operation",
  "verification-failed": "same-operation",
  "worker-lost": "reopen",
  "session-lost": "reopen",
};

export const defaultRetry = (code: FolioErrorCode): Retry => retryFor[code];

export class FolioFailure extends Schema.TaggedError<FolioFailure>()(
  "FolioFailure",
  {
    requestId: RequestId,
    code: FolioErrorCode,
    reason: Schema.NullOr(Reason),
    preservedRevision: Schema.NullOr(Revision),
    sessionAlive: Schema.Boolean,
    retry: Retry,
    detail: Schema.optionalKey(Schema.String),
  }
) {
  // fallow-ignore-next-line unused-class-member -- The service and unit tests construct public failures from a decoded Worker rejection.
  static make(input: {
    readonly requestId: RequestId;
    readonly code: FolioErrorCode;
    readonly reason?: Reason | null;
    readonly preservedRevision?: Revision | null;
    readonly sessionAlive?: boolean;
    readonly detail?: string;
  }) {
    return new FolioFailure({
      requestId: input.requestId,
      code: input.code,
      reason: input.reason ?? null,
      preservedRevision: input.preservedRevision ?? null,
      sessionAlive: input.sessionAlive ?? true,
      retry: defaultRetry(input.code),
      ...(input.detail === undefined ? {} : { detail: input.detail }),
    });
  }
}

export const Request = Schema.TaggedUnion({
  Open: {
    request: RequestId,
    bytes: Schema.Uint8Array,
    name: Schema.optionalKey(Schema.String),
    password: Schema.optionalKey(Schema.String),
  },
  InspectSource: { ...Envelope, bytes: Schema.Uint8Array },
  ReleaseSource: { ...Envelope, source: SourceId },
  ReadViewport: { ...Envelope, viewport: Viewport },
  ReadThumbnail: { ...Envelope, page: PageId, maxWidth: Positive },
  ReadText: { ...Envelope, page: PageId },
  ReadOutline: { ...Envelope },
  ReadAnnotations: { ...Envelope, page: PageId },
  ReadForms: { ...Envelope },
  Search: {
    ...Envelope,
    query: Schema.String,
    cursor: Schema.NullOr(Schema.Struct({ page: PageId, offset: Count })),
    direction: Schema.Literals(["next", "previous"]),
    maxMatches: Positive,
  },
  Commit: {
    request: RequestId,
    session: SessionId,
    baseRevision: Revision,
    commandId: Id,
    command: Command,
  },
  Undo: {
    request: RequestId,
    session: SessionId,
    baseRevision: Revision,
  },
  Redo: {
    request: RequestId,
    session: SessionId,
    baseRevision: Revision,
  },
  PlanExport: { ...Envelope, scope: ExportScope },
  Write: { ...Envelope, plan: PlanId },
  AcknowledgeDownload: { ...Envelope, plan: PlanId },
  Cancel: { request: RequestId, target: RequestId },
  Close: { request: RequestId, session: SessionId },
});
export type Request = typeof Request.Type;

export const Response = Schema.TaggedUnion({
  Opened: { request: RequestId, snapshot: Snapshot },
  SourceInspected: {
    ...Envelope,
    source: SourceId,
    pages: Schema.Array(Page),
    facts: Facts,
    namespace: Id,
    blockers: Schema.Array(Reason),
  },
  SourceReleased: { ...Envelope, source: SourceId },
  Changed: {
    request: RequestId,
    snapshot: Snapshot,
    change: ChangeId,
    invalidatedPages: Schema.Array(PageId),
    invalidateOutline: Schema.Boolean,
    invalidateForms: Schema.Boolean,
  },
  Rendered: {
    ...Envelope,
    page: PageId,
    width: Positive,
    height: Positive,
    transform: Matrix,
    bitmapToken: Id,
  },
  TextRead: {
    ...Envelope,
    page: PageId,
    runs: Schema.Array(TextRun),
    language: Schema.NullOr(Schema.String),
    tagged: Schema.Boolean,
  },
  OutlineRead: {
    ...Envelope,
    items: Schema.Array(
      Schema.Struct({
        id: Id,
        parent: Schema.NullOr(Id),
        title: Schema.String,
        page: Schema.NullOr(PageId),
        externalUrl: Schema.NullOr(Schema.String),
      })
    ),
  },
  AnnotationsRead: {
    ...Envelope,
    page: PageId,
    annotations: Schema.Array(Annotation),
  },
  FormsRead: { ...Envelope, fields: Schema.Array(FormField) },
  SearchRead: {
    ...Envelope,
    query: Schema.String,
    matches: Schema.Array(SearchMatch),
    totalKnown: Count,
    complete: Schema.Boolean,
    current: Schema.NullOr(SearchMatch),
  },
  ExportPlanned: { request: RequestId, plan: ExportPlan },
  Written: {
    ...Envelope,
    plan: PlanId,
    bytes: Schema.Uint8Array,
    mime: Schema.Literal("application/pdf"),
    sha256: Schema.String,
    writtenPages: Positive,
  },
  Acknowledged: { ...Envelope, plan: PlanId, snapshot: Snapshot },
  Progress: {
    request: RequestId,
    session: Schema.optionalKey(SessionId),
    phase: Schema.Literals([
      "engine-download",
      "opening",
      "reading",
      "searching",
      "applying",
      "planning",
      "writing",
      "verifying",
      "closing",
    ]),
    completed: Count,
    total: Schema.NullOr(Count),
  },
  Rejected: {
    request: RequestId,
    code: FolioErrorCode,
    reason: Schema.NullOr(Reason),
    preservedRevision: Schema.NullOr(Revision),
    sessionAlive: Schema.Boolean,
    retry: Retry,
  },
  Cancelled: { request: RequestId, target: RequestId },
  Closed: { request: RequestId, session: SessionId },
});
export type Response = typeof Response.Type;

export const WireRequest = Schema.Struct({
  protocol: Protocol,
  payload: Request,
});
export type WireRequest = typeof WireRequest.Type;
export const WireResponse = Schema.Struct({
  protocol: Protocol,
  payload: Response,
});
export type WireResponse = typeof WireResponse.Type;

/** The engine history budget. These are session limits, not input-size limits. */
export const HISTORY_MAX_ENTRIES = 128;
export const HISTORY_MAX_BYTES = 64 * 1024 * 1024;
export const TEXT_CACHE_MAX_BYTES = 8 * 1024 * 1024;

export const emptyHistory = (): History => ({
  canUndo: false,
  canRedo: false,
  entries: 0,
  cursor: 0,
  retainedBytes: 0,
  maxBytes: HISTORY_MAX_BYTES,
  maxEntries: HISTORY_MAX_ENTRIES,
  limitReached: false,
});

export const historyFits = (entries: number, retainedBytes: number): boolean =>
  entries + 1 <= HISTORY_MAX_ENTRIES && retainedBytes <= HISTORY_MAX_BYTES;

/** Default download names; a stem that has no usable characters becomes `document`. */
export const exportFilename = (
  sourceName: string,
  scope: ExportScope
): string => {
  const stem = sourceName
    .replace(/\.pdf$/iu, "")
    // eslint-disable-next-line no-control-regex -- Control characters are not safe in a download name.
    .replaceAll(/[\u0000-\u001F\u007F/\\:*?"<>|]/gu, "-")
    .replaceAll(/\s+/gu, " ")
    .trim()
    .replaceAll(/^\.+/gu, "")
    .slice(0, 120)
    .trim();
  return `${stem.length > 0 ? stem : "document"}-${
    scope._tag === "Full" ? "edited" : "pages"
  }.pdf`;
};

const fold = (text: string) => {
  const lower = text.toLowerCase();
  // A case mapping that changes length would break offset mapping. Keep the
  // original code units for that rare string; the search is still literal.
  return lower.length === text.length ? lower : text;
};

/**
 * Literal, case-insensitive search across the runs of one page. It never
 * matches across a page boundary and never uses a regular expression.
 */
export const findLiteralMatches = (
  page: PageId,
  runs: readonly TextRun[],
  boxes: readonly Box[],
  query: string
): SearchMatch[] => {
  if (query.length === 0) {
    return [];
  }
  const starts: number[] = [];
  let text = "";
  for (const run of runs) {
    starts.push(text.length);
    text += run.text;
  }
  const haystack = fold(text);
  const needle = fold(query);
  const matches: SearchMatch[] = [];
  let from = 0;
  while (from <= haystack.length - needle.length) {
    const start = haystack.indexOf(needle, from);
    if (start === -1) {
      break;
    }
    const end = start + needle.length;
    const found: Box[] = [];
    for (const [index, run] of runs.entries()) {
      const runStart = starts[index] ?? 0;
      const runEnd = runStart + run.text.length;
      if (runEnd > start && runStart < end) {
        const box = boxes[index];
        if (box) {
          found.push(box);
        }
      }
    }
    matches.push({
      page,
      start,
      length: needle.length,
      boxes: found,
    });
    from = start + Math.max(1, needle.length);
  }
  return matches;
};

export const fitWidthScale = (width: number, availableWidth: number): number =>
  width > 0 ? availableWidth / width : 1;

export const fitPageScale = (
  width: number,
  height: number,
  availableWidth: number,
  availableHeight: number
): number =>
  Math.min(
    fitWidthScale(width, availableWidth),
    height > 0 ? availableHeight / height : 1
  );

export const viewportToPage = (
  [a, b, c, d, e, f]: Matrix,
  [x, y]: Point
): Point => {
  const determinant = a * d - b * c;
  if (determinant === 0) {
    return [x, y];
  }
  return [
    (d * (x - e) - c * (y - f)) / determinant,
    (a * (y - f) - b * (x - e)) / determinant,
  ];
};
