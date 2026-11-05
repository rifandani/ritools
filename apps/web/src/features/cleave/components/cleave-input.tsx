import { useRef } from "react";
import { TextField } from "react-aria-components/TextField";

import { Label } from "@/core/components/ui/field";
import { FileTrigger } from "@/core/components/ui/file-trigger";
import { Textarea } from "@/core/components/ui/textarea";
import { useTranslation } from "@/features/i18n/use-translation";

export const CleaveInput = ({
  side,
  text,
  disabled,
  onChange,
  onFile,
}: {
  readonly side: "before" | "after";
  readonly text: string;
  readonly disabled: boolean;
  readonly onChange: (text: string) => void;
  readonly onFile: (file: File) => void;
}) => {
  const { t } = useTranslation();
  const gutter = useRef<HTMLPreElement>(null);
  const label = t(side === "before" ? "cleaveBefore" : "cleaveAfter");
  return (
    <section aria-label={label} className={`cleave-input cleave-input-${side}`}>
      <div className="cleave-input-head">
        <strong>{label}</strong>
        <FileTrigger
          isDisabled={disabled}
          onSelect={(files) => {
            const file = files?.item(0);
            if (file) {
              onFile(file);
            }
          }}
          size="md"
        >
          {t("cleaveOpen")}
        </FileTrigger>
      </div>
      <TextField
        isDisabled={disabled}
        value={text}
        onChange={onChange}
        className="cleave-editor-field"
      >
        <Label className="sr-only">{label}</Label>
        <div className="cleave-editor">
          <pre
            aria-hidden="true"
            className="cleave-input-numbers num"
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
