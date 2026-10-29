/* oxlint-disable eslint/custom-error-definition -- The adapter needs a typed code and reason on one Error subclass. */
import type { FolioErrorCode, Reason } from "./folio";

/** Private adapter failure. It becomes a public `FolioFailure` at the engine edge. */
export class AdapterError extends Error {
  readonly code: FolioErrorCode;
  readonly reason: Reason | null;
  readonly detail: string | null;

  constructor(
    code: FolioErrorCode,
    reason: Reason | null = null,
    detail: string | null = null
  ) {
    super(code);
    this.name = "FolioAdapterError";
    this.code = code;
    this.reason = reason;
    this.detail = detail;
  }
}

export const adapterError = (
  code: FolioErrorCode,
  reason: Reason | null = null,
  detail: string | null = null
) => new AdapterError(code, reason, detail);
