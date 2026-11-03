import { useState } from "react";

import { Button } from "@/core/components/ui/button";
import { Note } from "@/core/components/ui/note";
import { useTranslation } from "@/features/i18n/use-translation";

import type { Format, Output } from "../quill";

export const QuillExport = ({
  busy,
  onPrepare,
  prepared,
  onDownload,
  onClose,
}: {
  readonly busy: boolean;
  readonly onPrepare: (format: Format, paper: "A4" | "LETTER") => void;
  readonly prepared: Output | null;
  readonly onDownload: (output: Output) => void;
  readonly onClose: () => void;
}) => {
  const { t } = useTranslation();
  const [paper, setPaper] = useState<"A4" | "LETTER">("A4");
  return (
    <section
      aria-label={t("quillExport")}
      className="border-rule flex flex-col gap-4 border-2 p-4"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="font-bold">{t("quillExport")}</h3>
        <Button intent="outline" size="xs" onPress={onClose}>
          {t("quillCancel")}
        </Button>
      </div>
      <label className="flex items-center gap-3 text-sm">
        {t("quillPaper")}
        <select
          className="quill-field"
          value={paper}
          onChange={(event) =>
            setPaper(event.target.value === "LETTER" ? "LETTER" : "A4")
          }
        >
          <option value="A4">A4</option>
          <option value="LETTER">Letter</option>
        </select>
      </label>
      <div className="flex flex-wrap gap-2">
        <Button
          intent="outline"
          isDisabled={busy}
          onPress={() => onPrepare("md", paper)}
        >
          {t("quillDownloadMarkdown")}
        </Button>
        <Button
          intent="outline"
          isDisabled={busy}
          onPress={() => onPrepare("docx", paper)}
        >
          {t("quillPrepareDocx")}
        </Button>
        <Button
          intent="outline"
          isDisabled={busy}
          onPress={() => onPrepare("pdf", paper)}
        >
          {t("quillPreparePdf")}
        </Button>
      </div>
      {prepared ? (
        <div className="flex flex-col gap-3">
          <p className="font-bold break-words">{prepared.name}</p>
          <p className="text-muted-fg text-sm">{t("quillSnapshot")}</p>
          {prepared.warnings.length ? (
            <Note intent="warning">
              <p>{t("quillExportWarnings")}</p>
              <ul>
                {[...new Set(prepared.warnings)].map((warning) => (
                  <li key={warning}>
                    <code className="whitespace-pre-wrap">{warning}</code>
                  </li>
                ))}
              </ul>
            </Note>
          ) : null}
          <Button className="self-start" onPress={() => onDownload(prepared)}>
            {t("quillDownload")}
          </Button>
        </div>
      ) : null}
    </section>
  );
};
