/* oxlint-disable promise/prefer-await-to-then -- Dialog callbacks settle the controller promise before closing protected focus. */
import { Effect } from "effect";
import { useRef, useState } from "react";

import { Button } from "@/core/components/ui/button";
import { Label } from "@/core/components/ui/field";
import {
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
} from "@/core/components/ui/modal";
import { TextField } from "@/core/components/ui/text-field";
import { Textarea } from "@/core/components/ui/textarea";
import { useTranslation } from "@/features/i18n/use-translation";

import { boundsOf, columnName, parsePaste } from "../tabular.ui";
import type { TabularController } from "../use-tabular";
import { TabularError } from "./tabular-error";
import { TabularClipboard } from "./tabular-export";
import { TabularText } from "./tabular-fields";

export type EditorDialog =
  | { readonly kind: "edit"; readonly text: string }
  | { readonly kind: "paste"; readonly text: string }
  | { readonly kind: "range" }
  | { readonly kind: "copy"; readonly text: string };

// oxlint-disable-next-line eslint/complexity -- Four explicit dialog modes share protected focus, composition, and failure recovery.
export const TabularEditorDialog = ({
  controller: c,
  dialog,
  onClose,
}: {
  readonly controller: TabularController;
  readonly dialog: EditorDialog;
  readonly onClose: (committed?: boolean) => void;
}) => {
  const { t, locale } = useTranslation();
  const [text, setText] = useState("text" in dialog ? dialog.text : "");
  const box = boundsOf(c.range);
  const [coords, setCoords] = useState(() =>
    [
      box.rowStart + 1,
      box.columnStart + 1,
      box.rowEnd + 1,
      box.columnEnd + 1,
    ].map(String)
  );
  const [invalid, setInvalid] = useState(false);
  const [pasteSize, setPasteSize] = useState<{
    rows: number;
    columns: number;
  } | null>(null);
  const [fill, setFill] = useState(false);
  const composing = useRef(false);
  const title =
    dialog.kind === "edit"
      ? t("tabularEditAddress", {
          address: `${columnName(c.range.extent.column)}${c.range.extent.row + 1}`,
        })
      : t(
          dialog.kind === "range"
            ? "tabularSelectRange"
            : dialog.kind === "copy"
              ? "tabularCopyRange"
              : "tabularPasteText"
        );
  const apply = () => {
    if (composing.current) {
      return;
    }
    if (dialog.kind === "edit" && c.address) {
      void c
        .applyChange({ _tag: "SetCell", address: c.address, text })
        .then((result) => {
          if (result) {
            onClose(true);
          }
        });
    } else if (dialog.kind === "range") {
      const [r1, c1, r2, c2] = coords.map(Number);
      if (
        r1 === undefined ||
        c1 === undefined ||
        r2 === undefined ||
        c2 === undefined ||
        [r1, c1, r2, c2].some(
          (value) => !Number.isInteger(value) || value < 1
        ) ||
        Math.max(r1, r2) > (c.view?.matchingRows ?? 0) ||
        Math.max(c1, c2) > (c.view?.columnCount ?? 0)
      ) {
        setInvalid(true);
        return;
      }
      c.setRange({
        anchor: { row: r1 - 1, column: c1 - 1 },
        extent: { row: r2 - 1, column: c2 - 1 },
      });
      onClose();
    } else if (dialog.kind === "paste") {
      if (pasteSize) {
        void c.paste(text, fill).then((result) => {
          if (result) {
            onClose(true);
          }
        });
      } else {
        void Effect.runPromise(parsePaste(text))
          .then((values) => {
            setPasteSize({
              rows: values.length,
              columns: values[0]?.length ?? 0,
            });
            setInvalid(false);
          })
          .catch(() => setInvalid(true));
      }
    }
  };
  return (
    <ModalContent
      isOpen
      aria-label={title}
      size="lg"
      onOpenChange={(open) => {
        if (!open) {
          onClose();
        }
      }}
    >
      <ModalHeader title={title} />
      <ModalBody>
        {dialog.kind === "copy" ? (
          <TabularClipboard text={text} rows={box.rowEnd - box.rowStart + 1} />
        ) : dialog.kind === "range" ? (
          <div className="grid grid-cols-2 gap-4">
            {(
              [
                "tabularStartRow",
                "tabularStartColumn",
                "tabularEndRow",
                "tabularEndColumn",
              ] as const
            ).map((key, index) => (
              <TabularText
                label={t(key)}
                key={key}
                value={coords[index] ?? ""}
                type="number"
                min={1}
                onChange={(value) =>
                  setCoords((previous) =>
                    previous.map((item, i) => (i === index ? value : item))
                  )
                }
              />
            ))}
          </div>
        ) : (
          <TextField
            value={text}
            onChange={(value) => {
              setText(value);
              setPasteSize(null);
            }}
          >
            <Label>
              {t(
                dialog.kind === "edit" ? "tabularCellText" : "tabularPasteText"
              )}
            </Label>
            <Textarea
              autoFocus
              onCompositionStart={() => {
                composing.current = true;
              }}
              onCompositionEnd={() => {
                composing.current = false;
              }}
              onKeyDown={(event) => {
                if (composing.current || event.nativeEvent.isComposing) {
                  event.stopPropagation();
                  return;
                }
                if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
                  event.preventDefault();
                  apply();
                }
              }}
            />
          </TextField>
        )}
        {dialog.kind === "edit" ? (
          <p className="text-muted-fg mt-3 text-sm">
            {t("tabularMultilineHint")}
          </p>
        ) : null}
        {pasteSize ? (
          <>
            <p className="mt-3 text-sm">
              {t("tabularPastePreview", {
                rows: pasteSize.rows.toLocaleString(locale),
                columns: pasteSize.columns.toLocaleString(locale),
              })}
            </p>
            {pasteSize.rows === 1 &&
            pasteSize.columns === 1 &&
            (box.rowEnd > box.rowStart || box.columnEnd > box.columnStart) ? (
              <label className="mt-3 flex min-h-11 items-center gap-3 text-sm">
                <input
                  type="checkbox"
                  checked={fill}
                  onChange={(event) => setFill(event.target.checked)}
                />
                {t("tabularFillSelection")}
              </label>
            ) : null}
          </>
        ) : null}
        {dialog.kind === "paste" && c.failure ? (
          <div className="mt-3">
            <TabularError error={c.failure} />
          </div>
        ) : null}
        {invalid ? (
          <p className="text-danger-subtle-fg mt-3 text-sm" role="alert">
            {t(
              dialog.kind === "range"
                ? "tabularSelectionInvalid"
                : "tabularPasteInvalid"
            )}
          </p>
        ) : null}
      </ModalBody>
      <ModalFooter>
        <Button intent="plain" onPress={() => onClose()}>
          {t("tabularCancel")}
        </Button>
        {dialog.kind === "copy" ? null : (
          <Button intent="primary" isDisabled={c.busy} onPress={apply}>
            {t(
              dialog.kind === "paste" && !pasteSize
                ? "tabularPreviewing"
                : "tabularApply"
            )}
          </Button>
        )}
      </ModalFooter>
    </ModalContent>
  );
};

export const TabularConfirm = ({
  title,
  description,
  onCancel,
  onConfirm,
  confirmLabel,
}: {
  readonly title: string;
  readonly description: string;
  readonly onCancel: () => void;
  readonly onConfirm: () => void;
  readonly confirmLabel?: string;
}) => {
  const { t } = useTranslation();
  return (
    <ModalContent
      isOpen
      role="alertdialog"
      aria-label={title}
      size="sm"
      closeButton={false}
      onOpenChange={(open) => {
        if (!open) {
          onCancel();
        }
      }}
    >
      <ModalHeader title={title} description={description} />
      <ModalFooter>
        <Button autoFocus intent="outline" onPress={onCancel}>
          {t("tabularKeepWorking")}
        </Button>
        <Button intent="danger" onPress={onConfirm}>
          {confirmLabel ?? t("tabularApply")}
        </Button>
      </ModalFooter>
    </ModalContent>
  );
};
