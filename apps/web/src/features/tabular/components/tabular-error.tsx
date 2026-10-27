import { Note } from "@/core/components/ui/note";
import { useTranslation } from "@/features/i18n/use-translation";

import type * as T from "../tabular";

const useTabularError = () => {
  const { t, locale } = useTranslation();
  return (error: T.EngineError) => {
    switch (error._tag) {
      case "InvalidEncoding": {
        return t("tabularInvalidEncoding", { encoding: error.encoding });
      }
      case "InvalidDelimitedText": {
        return t("tabularInvalidDelimitedText", {
          record: error.record.toLocaleString(locale),
          column: error.column.toLocaleString(locale),
        });
      }
      case "UnresolvedValues": {
        return t("tabularUnresolvedExport", {
          count: error.count.toLocaleString(locale),
        });
      }
      case "FormatLimit": {
        return t("tabularFormatLimit", {
          sheet: error.sheetId,
          format: "XLS/XLSX",
          dimension: t(
            error.dimension === "rows"
              ? "tabularDimensionRows"
              : error.dimension === "columns"
                ? "tabularDimensionColumns"
                : error.dimension === "cell-text"
                  ? "tabularDimensionText"
                  : "tabularDimensionName"
          ),
          actual: error.actual.toLocaleString(locale),
          limit: error.limit.toLocaleString(locale),
        });
      }
      case "InvalidPaste": {
        return t(
          error.reason === "bounds"
            ? "tabularPasteBounds"
            : error.reason === "stale-range"
              ? "tabularStaleView"
              : error.reason === "ragged"
                ? "tabularPasteMismatch"
                : "tabularPasteInvalid"
        );
      }
      case "HistoryEmpty": {
        return t(
          error.direction === "undo"
            ? "tabularNothingUndo"
            : "tabularNothingRedo"
        );
      }
      case "DiscardRequired": {
        return t("tabularDiscardTitle");
      }
      default: {
        return t(`tabular${error._tag}`);
      }
    }
  };
};
export const TabularError = ({ error }: { readonly error: T.EngineError }) => {
  const message = useTabularError();
  return (
    <div role="alert">
      <Note intent={error._tag === "Cancelled" ? "info" : "danger"}>
        {message(error)}
      </Note>
    </div>
  );
};
