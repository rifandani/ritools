/* oxlint-disable eslint/complexity -- One modal owns the fixed all-column and chosen-column count states. */
/* oxlint-disable react-doctor/no-giant-component -- The Dedupe modal owns one counts-then-remove contract. */
"use client";

import { useEffect, useEffectEvent, useRef, useState } from "react";

import { Button } from "@/core/components/ui/button";
import {
  Checkbox,
  CheckboxField,
  CheckboxGroup,
} from "@/core/components/ui/checkbox";
import {
  DescriptionDetails,
  DescriptionList,
  DescriptionTerm,
} from "@/core/components/ui/description-list";
import {
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
} from "@/core/components/ui/modal";
import { Note } from "@/core/components/ui/note";
import { Radio, RadioField, RadioGroup } from "@/core/components/ui/radio";
import { useTranslation } from "@/features/i18n/use-translation";

import type * as T from "../tabular";
import { columnName } from "../tabular.ui";
import type { TabularController } from "../use-tabular";
import { TabularError } from "./tabular-error";

type DedupeMode = "all" | "columns";

export const TabularDedupe = ({
  controller: c,
  onClose,
}: {
  readonly controller: TabularController;
  readonly onClose: () => void;
}) => {
  const { t, locale } = useTranslation();
  const { sheet } = c;
  const sheetId = sheet?.sheetId ?? null;
  const [mode, setMode] = useState<DedupeMode>("all");
  const [selected, setSelected] = useState<readonly T.ColumnId[]>(() =>
    c.columns.map((column) => column.columnId)
  );
  const [preview, setPreview] = useState<T.DedupePreview | null>(null);
  const [counting, setCounting] = useState(false);
  const serial = useRef(0);
  const columnIds = mode === "all" ? null : selected;
  const blocked =
    !sheet ||
    sheet.rowCount === 0 ||
    sheet.columnCount === 0 ||
    (mode === "columns" && selected.length === 0);
  const optionsKey = JSON.stringify(columnIds);
  const counts =
    preview &&
    preview.sheetId === sheetId &&
    JSON.stringify(preview.columnIds) === optionsKey
      ? preview
      : null;
  const workbook = c.session?.format === "xls" || c.session?.format === "xlsx";
  const load = useEffectEvent(async (options: T.DedupeOptions) => {
    serial.current += 1;
    const mine = serial.current;
    setCounting(true);
    setPreview(null);
    c.setFailure(null);
    const next = await c.previewDedupe(options);
    if (mine !== serial.current) {
      return;
    }
    setCounting(false);
    if (next) {
      setPreview(next);
    }
  });
  useEffect(() => {
    if (!sheetId || blocked || c.busy) {
      return;
    }
    // oxlint-disable-next-line react/set-state-in-effect, react-doctor/no-pass-live-state-to-parent -- The count starts after the dialog opens; the effect is the Worker boundary.
    void load({ sheetId, columnIds });
  }, [sheetId, blocked, c.busy, columnIds]);
  const changeMode = (value: string) => {
    setMode(value === "columns" ? "columns" : "all");
  };
  const changeColumns = (values: readonly string[]) => {
    const picked = new Set(values);
    const next: T.ColumnId[] = [];
    for (const column of c.columns) {
      if (picked.has(String(column.columnId))) {
        next.push(column.columnId);
      }
    }
    setSelected(next);
  };
  const shown = (value: number | undefined) =>
    value === undefined ? "—" : value.toLocaleString(locale);
  const remove = async () => {
    if (!sheet || !counts || counts.duplicates === 0 || c.busy) {
      return;
    }
    const result = await c.applyChange({
      _tag: "Dedupe",
      sheetId: sheet.sheetId,
      columnIds,
    });
    if (result) {
      onClose();
    }
  };
  return (
    <ModalContent
      isOpen
      aria-label={t("tabularDedupeTitle")}
      size="lg"
      isDismissable={!c.busy}
      onOpenChange={(open) => {
        if (!open) {
          onClose();
        }
      }}
    >
      <ModalHeader title={t("tabularDedupeTitle")} />
      <ModalBody>
        <RadioGroup
          aria-label={t("tabularDedupeScope")}
          className="flex flex-wrap items-center space-y-0 gap-x-6 gap-y-2"
          orientation="horizontal"
          value={mode}
          onChange={changeMode}
        >
          <RadioField value="all">
            <Radio>{t("tabularDedupeAllColumns")}</Radio>
          </RadioField>
          <RadioField value="columns">
            <Radio>{t("tabularDedupeChosenColumns")}</Radio>
          </RadioField>
        </RadioGroup>
        {mode === "columns" ? (
          <div className="mt-4">
            <p className="text-base/6 font-semibold sm:text-sm/6">
              {t("tabularDedupeColumns")}
            </p>
            <CheckboxGroup
              aria-label={t("tabularDedupeColumns")}
              className="mt-2"
              value={selected.map(String)}
              onChange={changeColumns}
            >
              <div className="grid max-h-48 gap-2 overflow-y-auto sm:grid-cols-2">
                {c.columns.map((column, index) => {
                  const name = columnName(index);
                  return (
                    <CheckboxField
                      key={column.columnId}
                      value={String(column.columnId)}
                    >
                      <Checkbox>
                        {`${name} · ${column.label.trim() ? column.label : t("tabularBlankHeader", { column: name })}`}
                      </Checkbox>
                    </CheckboxField>
                  );
                })}
              </div>
            </CheckboxGroup>
            {selected.length === 0 ? (
              <Note className="mt-2" intent="warning">
                {t("tabularDedupeNoColumns")}
              </Note>
            ) : null}
          </div>
        ) : null}
        <DescriptionList
          aria-live="polite"
          className="mt-4"
          aria-label={t("tabularDedupeCounts")}
        >
          <DescriptionTerm>{t("tabularDedupeRows")}</DescriptionTerm>
          <DescriptionDetails className="num">
            {shown(counts?.rows)}
          </DescriptionDetails>
          <DescriptionTerm>{t("tabularDedupeDuplicates")}</DescriptionTerm>
          <DescriptionDetails className="num">
            {shown(counts?.duplicates)}
          </DescriptionDetails>
          <DescriptionTerm>{t("tabularDedupeRemaining")}</DescriptionTerm>
          <DescriptionDetails className="num">
            {shown(counts?.remaining)}
          </DescriptionDetails>
        </DescriptionList>
        <p className="text-muted-fg mt-3 text-sm/6">
          {t("tabularDedupeMatch")} {t("tabularDedupeHeader")}
        </p>
        {counting ? (
          <Note className="mt-4" intent="info">
            {t("tabularDedupeCounting")}
          </Note>
        ) : null}
        {counts?.duplicates === 0 ? (
          <Note className="mt-4" intent="info">
            {t("tabularDedupeNone")}
          </Note>
        ) : null}
        {sheet && sheet.rowCount === 0 ? (
          <Note className="mt-4" intent="warning">
            {t("tabularDedupeEmpty")}
          </Note>
        ) : null}
        {sheet && sheet.columnCount === 0 ? (
          <Note className="mt-4" intent="warning">
            {t("tabularDedupeNoSheetColumns")}
          </Note>
        ) : null}
        {workbook ? (
          <Note className="mt-4" intent="warning">
            <p>{t("tabularValuesOnly")}</p>
            <p className="mt-2">{t("tabularStaleResults")}</p>
          </Note>
        ) : null}
        {c.failure ? <TabularError error={c.failure} /> : null}
        {c.busy ? (
          <Note className="mt-4" intent="info">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p>{t("tabularApplyingEdit")}</p>
              <Button intent="outline" onPress={() => c.cancel()}>
                {t("tabularCancel")}
              </Button>
            </div>
          </Note>
        ) : null}
      </ModalBody>
      <ModalFooter>
        <Button intent="plain" isDisabled={c.busy} onPress={onClose}>
          {t("tabularCancel")}
        </Button>
        <Button
          intent="danger"
          isDisabled={
            blocked || c.busy || counting || !counts || counts.duplicates === 0
          }
          onPress={remove}
        >
          {t("tabularDedupeRemove", { count: counts?.duplicates ?? 0 })}
        </Button>
      </ModalFooter>
    </ModalContent>
  );
};
