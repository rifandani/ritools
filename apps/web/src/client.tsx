import { StartClient } from "@tanstack/react-start/client";
import { StrictMode } from "react";
import { hydrateRoot } from "react-dom/client";

import { reportError } from "@/core/observability/logger";

// The server renders the whole document, so React hydrates `document` itself.
hydrateRoot(
  document,
  <StrictMode>
    <StartClient />
  </StrictMode>,
  {
    onCaughtError(error, errorInfo) {
      reportError("[reactEntry.onCaughtError]", { error, errorInfo });
    },
    onRecoverableError(error, errorInfo) {
      reportError("[reactEntry.onRecoverableError]", { error, errorInfo });
    },
    onUncaughtError(error, errorInfo) {
      reportError("[reactEntry.onUncaughtError]", { error, errorInfo });
    },
  }
);
