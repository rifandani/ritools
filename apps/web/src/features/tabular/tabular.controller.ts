import { Effect, Schema } from "effect";

import * as T from "./tabular";
import type { FailureContext, ParsedFile, WriteJob } from "./tabular.format";
import type { Written } from "./tabular.format-protocol";
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
/** Worker coordination. Failed candidates and format jobs never own accepted data. */
export class TabularController {
  private model: TabularModel | null = null;
  private readonly candidates = new Map<T.CandidateId, ParsedFile>();
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
      const phase: T.Progress["phase"] = request.operation.startsWith("prepare")
        ? "reading"
        : request.operation === "setView"
          ? "view"
          : request.operation === "exportBytes" ||
              request.operation === "splitBytes"
            ? "writing"
            : request.operation === "planExport"
              ? "planning-export"
              : "editing";
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
