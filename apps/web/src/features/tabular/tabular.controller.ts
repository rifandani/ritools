/* oxlint-disable anti-slop/no-shape-in-symbol-names -- The fixed WriteJob contract names jsonShape. */
import { Effect, Schema } from "effect";

import * as T from "./tabular";
import {
  buildDiffPlan,
  diffFileName,
  diffPage,
  diffReportRows,
  diffSheetFromFile,
  diffSourceReport,
} from "./tabular.diff";
import type { DiffPlanData } from "./tabular.diff";
import type {
  FailureContext,
  OutputSheet,
  ParsedFile,
  WriteJob,
} from "./tabular.format";
import type { Written } from "./tabular.format-protocol";
import { buildMergePlan } from "./tabular.merge";
import type { MergePlanData, MergeSheet } from "./tabular.merge";
import { TabularModel, candidate } from "./tabular.model";
import type { PdfFontMetrics } from "./tabular.pdf.metrics";
import type { Request, Output, Operation } from "./tabular.protocol";

export interface FormatPort {
  readonly parse: (
    source: T.Source,
    options: T.ParseOptions,
    ctx: FailureContext,
    signal: AbortSignal
  ) => Promise<ParsedFile>;
  readonly write: (
    job: WriteJob,
    ctx: FailureContext,
    signal: AbortSignal
  ) => Promise<Written>;
}
type PdfMetricsLoader = (
  ctx: FailureContext,
  signal: AbortSignal
) => Promise<PdfFontMetrics>;
const phaseOf = (operation: Operation): T.Progress["phase"] => {
  if (
    operation.startsWith("prepare") ||
    operation === "mergeSource" ||
    operation === "planMerge" ||
    operation === "diffSource"
  ) {
    return "reading";
  }
  if (
    operation === "setView" ||
    operation === "previewDedupe" ||
    operation === "planDiff" ||
    operation === "diffPage"
  ) {
    return "view";
  }
  if (
    operation === "exportBytes" ||
    operation === "splitBytes" ||
    operation === "mergeBytes" ||
    operation === "diffBytes"
  ) {
    return "writing";
  }
  return operation === "planExport" ? "planning-export" : "editing";
};
/** Worker coordination. Failed candidates and format jobs never own accepted data. */
export class TabularController {
  private model: TabularModel | null = null;
  private readonly candidates = new Map<T.CandidateId, ParsedFile>();
  private readonly mergeSources = new Map<T.MergeSourceId, MergeSheet>();
  private readonly mergePlans = new Map<T.MergePlanId, MergePlanData>();
  private readonly diffSources = new Map<T.DiffSourceId, ParsedFile>();
  private readonly diffPlans = new Map<T.DiffPlanId, DiffPlanData>();
  private readonly jobs = new Map<T.RequestId, AbortController>();
  private readonly replay = new Map<T.RequestId, Output<Operation>>();
  private readonly inFlight = new Map<
    T.RequestId,
    Promise<Output<Operation>>
  >();
  private readonly viewOwners = new Map<T.SheetId, T.RequestId>();
  private prepareOwner: T.RequestId | null = null;
  private readonly format: FormatPort;
  private readonly yieldTask: () => Promise<void>;
  private readonly report: (p: T.Progress) => void;
  private readonly loadPdfMetrics: PdfMetricsLoader;
  constructor(
    format: FormatPort,
    yieldTask: () => Promise<void>,
    report: (p: T.Progress) => void = () => {
      /* No subscriber. */
    },
    loadPdfMetrics: PdfMetricsLoader = () =>
      Promise.reject(
        new T.EngineFailed({
          requestId: T.RequestId.make("pdf-metrics"),
          operation: "planExport",
          sessionId: null,
          phase: "planning-export",
        })
      )
  ) {
    this.format = format;
    this.yieldTask = yieldTask;
    this.report = report;
    this.loadPdfMetrics = loadPdfMetrics;
  }
  private accepted(ctx: FailureContext): TabularModel {
    if (!this.model) {
      throw new T.StaleSession({ ...ctx, currentSessionId: null });
    }
    return this.model;
  }
  private clearMerge(): void {
    this.mergeSources.clear();
    this.mergePlans.clear();
  }
  private clearDiff(): void {
    this.diffSources.clear();
    this.diffPlans.clear();
  }
  run(request: Request): Effect.Effect<Output<Operation>, T.EngineError> {
    const ctx: FailureContext = {
      requestId: request.requestId,
      operation: request.operation,
      sessionId: this.model?.sessionId ?? null,
    };
    return Effect.tryPromise({
      try: () => {
        const existing = this.inFlight.get(request.requestId);
        if (existing) {
          return existing;
        }
        const running = this.execute(request, ctx);
        this.inFlight.set(request.requestId, running);
        // oxlint-disable-next-line promise/prefer-await-to-then -- Register before awaiting, so retransmissions share the same pending invocation.
        return running.finally(() => this.inFlight.delete(request.requestId));
      },
      catch: (error) => TabularController.failure(error, ctx),
    });
  }
  // oxlint-disable-next-line eslint/complexity -- Exhaustive request dispatch keeps candidate and revision commit checks in one owner.
  private async execute(
    request: Request,
    ctx: FailureContext
  ): Promise<Output<Operation>> {
    try {
      if (this.replay.has(request.requestId)) {
        return this.replay.get(request.requestId);
      }
      const abort = new AbortController();
      this.jobs.set(request.requestId, abort);
      const phase = phaseOf(request.operation);
      let lastReport = 0;
      this.report({
        requestId: request.requestId,
        sessionId: ctx.sessionId,
        phase,
        completed: 0,
        total: null,
        unit: "rows",
        cancellable: true,
      });
      const checkpoint = async () => {
        if (abort.signal.aborted) {
          throw new T.Cancelled({ ...ctx, phase });
        }
        const now = performance.now();
        if (now - lastReport >= 100) {
          this.report({
            requestId: request.requestId,
            sessionId: ctx.sessionId,
            phase,
            completed: 0,
            total: null,
            unit: "rows",
            cancellable: true,
          });
          lastReport = now;
        }
        await this.yieldTask();
        if (abort.signal.aborted) {
          throw new T.Cancelled({ ...ctx, phase });
        }
      };
      try {
        let result: Output<Operation>;
        switch (request.operation) {
          case "prepareOpen": {
            this.prepareOwner = request.requestId;
            if (request.payload.options.sheetHeaders.length) {
              throw new T.InvalidRequest({ ...ctx, field: "sheetHeaders" });
            }
            const parsed = await this.format.parse(
              request.payload.source,
              request.payload.options,
              ctx,
              abort.signal
            );
            await checkpoint();
            if (this.prepareOwner !== request.requestId) {
              throw new T.Cancelled({ ...ctx, phase });
            }
            const id = T.CandidateId.make(`candidate-${request.requestId}`);
            this.candidates.clear();
            this.candidates.set(id, parsed);
            result = candidate(parsed, id);
            break;
          }
          case "prepareReparse": {
            const m = this.accepted(ctx);
            m.guard(request.payload.guard, ctx);
            this.prepareOwner = request.requestId;
            const summaries = m.summary().sheets;
            for (const override of request.payload.options.sheetHeaders) {
              if (!summaries.some((s) => s.sheetId === override.sheetId)) {
                throw new T.MissingIdentity({
                  ...ctx,
                  sheetId: override.sheetId,
                });
              }
            }
            const parsed = await this.format.parse(
              m.file.source,
              request.payload.options,
              ctx,
              abort.signal
            );
            await checkpoint();
            this.accepted(ctx).guard(request.payload.guard, ctx);
            if (this.prepareOwner !== request.requestId) {
              throw new T.Cancelled({ ...ctx, phase });
            }
            const adjusted: ParsedFile = {
              ...parsed,
              sheets: parsed.sheets.map((s, i) => ({
                ...s,
                header:
                  request.payload.options.sheetHeaders.find(
                    (o) => o.sheetId === summaries[i]?.sheetId
                  )?.header ?? s.header,
              })),
            };
            const id = T.CandidateId.make(`candidate-${request.requestId}`);
            this.candidates.clear();
            this.candidates.set(id, adjusted);
            result = candidate(adjusted, id);
            break;
          }
          case "acceptOpen": {
            const p = request.payload;
            const parsed = this.candidates.get(p.candidateId);
            if (!parsed) {
              throw new T.InvalidRequest({ ...ctx, field: "candidateId" });
            }
            const checkReplacement = () => {
              if (this.model) {
                if (!p.replace) {
                  throw new T.StaleSession({
                    ...ctx,
                    currentSessionId: this.model.sessionId,
                  });
                }
                this.model.guard(p.replace, ctx);
                const h = this.model.summary().history;
                if (h.dirty && !p.replace.discardEdits) {
                  throw new T.DiscardRequired({
                    ...ctx,
                    changedCells: h.changedCellCount,
                    structuralEdits: h.structuralEditCount,
                  });
                }
              } else if (p.replace) {
                throw new T.StaleSession({ ...ctx, currentSessionId: null });
              }
            };
            checkReplacement();
            if (
              (parsed.format === "xls" || parsed.format === "xlsx") &&
              !p.acknowledgeValuesOnly
            ) {
              throw new T.InvalidRequest({
                ...ctx,
                field: "acknowledgeValuesOnly",
              });
            }
            const next = new TabularModel(parsed, p.candidateId);
            await checkpoint();
            checkReplacement();
            this.model = next;
            this.candidates.clear();
            this.clearMerge();
            this.clearDiff();
            this.replay.clear();
            result = next.summary();
            break;
          }
          case "discardCandidate": {
            this.candidates.delete(request.payload.candidateId);
            result = undefined;
            break;
          }
          case "summary": {
            const m = this.accepted(ctx);
            if (m.sessionId !== request.payload.sessionId) {
              throw new T.StaleSession({
                ...ctx,
                currentSessionId: m.sessionId,
              });
            }
            result = m.summary();
            break;
          }
          case "setView": {
            const m = this.accepted(ctx);
            this.viewOwners.set(request.payload.sheetId, request.requestId);
            result = await m.setView(request.payload, ctx, async () => {
              await checkpoint();
              if (
                this.viewOwners.get(request.payload.sheetId) !==
                request.requestId
              ) {
                throw new T.Cancelled({ ...ctx, phase });
              }
            });
            this.accepted(ctx).guard(request.payload, ctx);
            break;
          }
          case "readViewport": {
            result = this.accepted(ctx).viewport(request.payload, ctx);
            break;
          }
          case "locate": {
            result = this.accepted(ctx).locate(request.payload, ctx);
            break;
          }
          case "warnings": {
            result = this.accepted(ctx).warnings(request.payload, ctx);
            break;
          }
          case "previewDedupe": {
            await checkpoint();
            result = this.accepted(ctx).dedupePreview(request.payload, ctx);
            break;
          }
          case "edit": {
            await checkpoint();
            result = this.accepted(ctx).edit(request.payload, ctx);
            break;
          }
          case "history": {
            await checkpoint();
            result = this.accepted(ctx).history(request.payload, ctx);
            break;
          }
          case "planExport": {
            await checkpoint();
            const metrics =
              request.payload.options.format === "pdf"
                ? await this.loadPdfMetrics(ctx, abort.signal)
                : null;
            await checkpoint();
            result = this.accepted(ctx).planExport(
              request.payload,
              ctx,
              metrics
            );
            break;
          }
          case "exportBytes": {
            const m = this.accepted(ctx);
            const output = m.exportJob(request.payload, ctx);
            const written = await this.format.write(
              output.job,
              ctx,
              abort.signal
            );
            await checkpoint();
            this.accepted(ctx).guard(request.payload, ctx);
            m.exportJob(request.payload, ctx);
            result = {
              sessionId: m.sessionId,
              revision: m.revision,
              planId: output.plan.planId,
              filename: output.filename,
              mime: output.mime,
              bytes: written.bytes,
              writtenRows: output.plan.sheets.reduce((n, s) => n + s.rows, 0),
              writtenSheets: output.plan.sheets.length,
              writtenPages: written.pages,
              warnings: output.plan.warnings,
            } satisfies T.ExportBytes;
            break;
          }
          case "splitBytes": {
            const m = this.accepted(ctx);
            const prepared = m.splitJob(request.payload, ctx);
            const parts: T.SplitPart[] = [];
            for (const entry of prepared.jobs) {
              // oxlint-disable-next-line eslint/no-await-in-loop, react-doctor/async-await-in-loop -- Parts are written in order, so a cancel leaves no partial download.
              const written = await this.format.write(
                entry.job,
                ctx,
                abort.signal
              );
              parts.push({
                filename: entry.filename,
                mime: "text/csv;charset=utf-8",
                rows: entry.rows,
                bytes: written.bytes,
              });
              // oxlint-disable-next-line eslint/no-await-in-loop, react-doctor/async-await-in-loop -- Each Part gives the cancel signal a check between writes.
              await checkpoint();
            }
            this.accepted(ctx).guard(request.payload, ctx);
            result = {
              sessionId: m.sessionId,
              revision: m.revision,
              parts,
              writtenRows: prepared.dataRows,
              zipName: prepared.zipName,
              warnings: prepared.warnings,
            } satisfies T.SplitBytes;
            break;
          }
          case "mergeSource": {
            const sourceId = T.MergeSourceId.make(
              `merge-source-${request.requestId}`
            );
            const { source } = request.payload;
            let sheet: MergeSheet;
            if (source._tag === "File") {
              const parsed = await this.format.parse(
                source.source,
                {
                  encoding: "auto",
                  delimiter: "auto",
                  header: false,
                  sheetHeaders: [],
                },
                ctx,
                abort.signal
              );
              await checkpoint();
              const parsedSheet =
                parsed.sheets.find((entry) => entry.visibility === "visible") ??
                parsed.sheets[0];
              if (!parsedSheet) {
                throw new T.InvalidRequest({ ...ctx, field: "source" });
              }
              let unresolved = 0;
              for (const row of parsedSheet.rows) {
                for (const cell of row) {
                  if (cell.value._tag === "Unresolved") {
                    unresolved += 1;
                  }
                }
              }
              sheet = {
                sourceId,
                name: source.source.name,
                sheetName: parsedSheet.name,
                origin: "file",
                format: parsed.format,
                size: source.source.size,
                header: null,
                rows: parsedSheet.rows.map((row) =>
                  row.map((cell) => cell.value)
                ),
                columns: parsedSheet.width,
                unresolved,
                delimiter: parsed.delimiter?.value ?? null,
                newline: parsed.newline,
                bom: parsed.bom,
                warnings: parsedSheet.warnings.map((warning) => ({
                  code: warning.code,
                  count: warning.count,
                })),
              };
            } else {
              const m = this.accepted(ctx);
              if (m.sessionId !== source.sessionId) {
                throw new T.StaleSession({
                  ...ctx,
                  currentSessionId: m.sessionId,
                });
              }
              sheet = m.mergeSheet(sourceId, source.sheetId, ctx);
            }
            this.mergeSources.set(sourceId, sheet);
            result = {
              sourceId,
              name: sheet.name,
              sheetName: sheet.sheetName,
              origin: sheet.origin,
              format: sheet.format,
              size: sheet.size,
              rows: sheet.rows.length,
              columns: sheet.columns,
              unresolved: sheet.unresolved,
              workbook: sheet.format === "xls" || sheet.format === "xlsx",
              delimiter: sheet.delimiter,
              newline: sheet.newline,
              bom: sheet.bom,
            } satisfies T.MergeSourceReport;
            break;
          }
          case "planMerge": {
            const sources: MergeSheet[] = [];
            for (const id of request.payload.sourceIds) {
              const sheet = this.mergeSources.get(id);
              if (!sheet) {
                throw new T.InvalidRequest({ ...ctx, field: "sourceIds" });
              }
              sources.push(sheet);
            }
            const data = buildMergePlan(sources, request.payload.options, ctx);
            const requested = new Set(request.payload.sourceIds);
            for (const id of this.mergeSources.keys()) {
              if (!requested.has(id)) {
                this.mergeSources.delete(id);
              }
            }
            this.mergePlans.clear();
            const planId = T.MergePlanId.make(
              `merge-plan-${request.requestId}`
            );
            this.mergePlans.set(planId, data);
            result = { planId, ...data.plan } satisfies T.MergePlan;
            break;
          }
          case "mergeBytes": {
            const plan = this.mergePlans.get(request.payload.planId);
            if (!plan) {
              throw new T.InvalidRequest({ ...ctx, field: "planId" });
            }
            if (plan.plan.unresolved > 0) {
              throw new T.InvalidRequest({ ...ctx, field: "unresolved" });
            }
            if (plan.plan.totalColumns === 0) {
              throw new T.InvalidRequest({ ...ctx, field: "columns" });
            }
            const options: T.ExportOptions = {
              format: "csv",
              scope: {
                _tag: "WholeSheet",
                sheetId: T.SheetId.make("merge-output"),
              },
              delimiter: plan.options.delimiter,
              newline: plan.options.newline,
              bom: plan.options.bom,
              textPolicy: "exact",
              jsonShape: "auto",
              pdf: null,
              locale: plan.options.locale,
            };
            const output: OutputSheet = {
              name: "Merged",
              visibility: "visible",
              width: plan.plan.totalColumns,
              header: plan.options.header,
              rows: plan.headerRow ? [plan.headerRow, ...plan.rows] : plan.rows,
            };
            const written = await this.format.write(
              {
                format: "csv",
                sourceName: plan.plan.filename,
                sheets: [output],
                options,
                jsonShape: null,
                headers: plan.options.header,
                locale: plan.options.locale,
              },
              ctx,
              abort.signal
            );
            await checkpoint();
            this.mergePlans.delete(request.payload.planId);
            result = {
              planId: request.payload.planId,
              filename: plan.plan.filename,
              mime: plan.plan.mime,
              bytes: written.bytes,
              writtenRows: plan.plan.totalRows,
              writtenColumns: plan.plan.totalColumns,
              blankCells: plan.plan.blankCells,
              warnings: plan.plan.warnings,
            } satisfies T.MergeBytes;
            break;
          }
          case "closeMerge": {
            this.clearMerge();
            result = undefined;
            break;
          }
          case "diffSource": {
            this.accepted(ctx);
            const sourceId = T.DiffSourceId.make(
              `diff-source-${request.requestId}`
            );
            const parsed = await this.format.parse(
              request.payload.source,
              {
                encoding: "auto",
                delimiter: "auto",
                header: false,
                sheetHeaders: [],
              },
              ctx,
              abort.signal
            );
            await checkpoint();
            this.clearDiff();
            this.diffSources.set(sourceId, parsed);
            result = diffSourceReport(sourceId, parsed);
            break;
          }
          case "planDiff": {
            const m = this.accepted(ctx);
            m.guard(request.payload, ctx);
            const stored = this.diffSources.get(
              request.payload.options.sourceId
            );
            if (!stored) {
              throw new T.InvalidRequest({ ...ctx, field: "sourceId" });
            }
            await checkpoint();
            const fileSheet = diffSheetFromFile(
              stored,
              request.payload.options.sheetName,
              ctx
            );
            const sessionSheet = m.diffSide(
              request.payload.options.sheetId,
              ctx
            );
            const forward = request.payload.options.direction === "forward";
            const data = buildDiffPlan(
              forward ? sessionSheet : fileSheet,
              forward ? fileSheet : sessionSheet,
              request.payload.options
            );
            await checkpoint();
            this.diffPlans.clear();
            const planId = T.DiffPlanId.make(`diff-plan-${request.requestId}`);
            this.diffPlans.set(planId, data);
            result = {
              planId,
              sessionId: m.sessionId,
              revision: m.revision,
              ...data.plan,
            } satisfies T.DiffPlan;
            break;
          }
          case "diffPage": {
            const data = this.diffPlans.get(request.payload.planId);
            if (!data) {
              throw new T.InvalidRequest({ ...ctx, field: "planId" });
            }
            result = diffPage(
              request.payload.planId,
              data,
              request.payload.filter,
              request.payload.offset,
              request.payload.limit
            );
            break;
          }
          case "diffBytes": {
            const data = this.diffPlans.get(request.payload.planId);
            if (!data || !data.plan.counts) {
              throw new T.InvalidRequest({ ...ctx, field: "planId" });
            }
            const rows = diffReportRows(data);
            const filename = diffFileName(data.plan.after.name);
            const output: OutputSheet = {
              name: "Diff",
              visibility: "visible",
              width: rows[0]?.length ?? 0,
              header: true,
              rows,
            };
            const written = await this.format.write(
              {
                format: "csv",
                sourceName: filename,
                sheets: [output],
                options: {
                  format: "csv",
                  scope: {
                    _tag: "WholeSheet",
                    sheetId: T.SheetId.make("diff-output"),
                  },
                  delimiter: ",",
                  newline: "lf",
                  bom: false,
                  textPolicy: "spreadsheet-safe",
                  jsonShape: "auto",
                  pdf: null,
                  locale: "en-US",
                },
                jsonShape: null,
                headers: true,
                locale: "en-US",
              },
              ctx,
              abort.signal
            );
            await checkpoint();
            result = {
              planId: request.payload.planId,
              filename,
              mime: "text/csv;charset=utf-8",
              bytes: written.bytes,
              writtenRows: Math.max(0, rows.length - 1),
            } satisfies T.DiffBytes;
            break;
          }
          case "closeDiff": {
            this.clearDiff();
            result = undefined;
            break;
          }
          case "cancel": {
            this.jobs.get(request.payload.requestId)?.abort();
            result = undefined;
            break;
          }
          case "close": {
            if (this.model?.sessionId === request.payload.sessionId) {
              for (const [id, job] of this.jobs) {
                if (id !== request.requestId) {
                  job.abort();
                }
              }
              this.model = null;
              this.candidates.clear();
              this.clearMerge();
              this.clearDiff();
              this.replay.clear();
              this.viewOwners.clear();
            }
            result = undefined;
            break;
          }
          default: {
            const unreachable: never = request;
            return unreachable;
          }
        }
        if (["edit", "history", "acceptOpen"].includes(request.operation)) {
          this.replay.set(request.requestId, result);
        }
        return result;
      } finally {
        this.jobs.delete(request.requestId);
      }
    } finally {
      this.inFlight.delete(request.requestId);
    }
  }
  // oxlint-disable-next-line anti-slop/no-unknown-parameters -- This is the exception boundary for parser and allocation failures.
  private static failure(error: unknown, ctx: FailureContext): T.EngineError {
    if (Schema.is(T.EngineError)(error)) {
      return error;
    }
    if (error instanceof RangeError) {
      return new T.MemoryLimit({
        ...ctx,
        phase: "editing",
        estimatedBytes: null,
      });
    }
    return new T.EngineFailed({ ...ctx, phase: "reading" });
  }
}
