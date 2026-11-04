import { useRef } from "react";
import { TextField } from "react-aria-components/TextField";

import { DropZone } from "@/core/components/ui/drop-zone";
import { Label } from "@/core/components/ui/field";
import { FileTrigger } from "@/core/components/ui/file-trigger";
import { Textarea } from "@/core/components/ui/textarea";
import { useTranslation } from "@/features/i18n/use-translation";

export const RedlineInput = ({
  side,
  text,
  name,
  disabled,
  onChange,
  onFile,
}: {
  readonly side: "before" | "after";
  readonly text: string;
  readonly name?: string;
  readonly disabled: boolean;
  readonly onChange: (text: string) => void;
  readonly onFile: (file: File) => void;
}) => {
  const { t } = useTranslation();
  const gutter = useRef<HTMLPreElement>(null);
  const label = t(side === "before" ? "redlineBefore" : "redlineAfter");
  return (
    <section aria-label={label} className="redline-input">
      <div className="redline-input-head">
        <strong>{label}</strong>
        <FileTrigger
          isDisabled={disabled}
          onSelect={(files) => {
            const file = files?.item(0);
            if (file) {
              onFile(file);
            }
          }}
          size="sm"
        >
          {t("redlineOpen")}
        </FileTrigger>
      </div>
      <DropZone
        aria-label={`${label}: ${t("redlineDrop")}`}
        isDisabled={disabled}
        getDropOperation={() => "copy"}
        onDrop={async (event) => {
          const item = event.items.find((entry) => entry.kind === "file");
          if (item?.kind === "file") {
            onFile(await item.getFile());
          }
        }}
        className="redline-drop"
      >
        <p className="text-muted-fg truncate text-sm">
          {name ?? t("redlineDrop")}
        </p>
      </DropZone>
      <TextField
        isDisabled={disabled}
        value={text}
        onChange={onChange}
        className="redline-editor-field"
      >
        <Label className="sr-only">{label}</Label>
        <div className="redline-editor">
          <pre
            aria-hidden="true"
            className="redline-input-numbers num"
            ref={gutter}
          >
            {Array.from(
              { length: text.split("\n").length },
              (_, index) => index + 1
            ).join("\n")}
          </pre>
          <Textarea
            aria-label={label}
            spellCheck={false}
            wrap="off"
            onScroll={(event) => {
              if (gutter.current) {
                gutter.current.scrollTop = event.currentTarget.scrollTop;
              }
            }}
          />
        </div>
      </TextField>
    </section>
  );
};
