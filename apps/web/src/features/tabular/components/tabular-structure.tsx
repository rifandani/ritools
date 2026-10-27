/* oxlint-disable eslint/complexity -- Each structural action maps explicitly to one atomic engine command. */
import { useState } from "react";

import { Button } from "@/core/components/ui/button";
import { useTranslation } from "@/features/i18n/use-translation";

import type * as T from "../tabular";
import { boundsOf } from "../tabular.ui";
import type { TabularController } from "../use-tabular";
import { TabularConfirm } from "./tabular-dialogs";
import { TabularSelect, TabularText } from "./tabular-fields";

const choices = [
  ["add-row", "tabularAddRow"],
  ["add-column", "tabularAddColumn"],
  ["row-before", "tabularInsertRowBefore"],
  ["row-after", "tabularInsertRowAfter"],
  ["column-before", "tabularInsertColumnBefore"],
  ["column-after", "tabularInsertColumnAfter"],
  ["delete-rows", "tabularDeleteRows"],
  ["delete-columns", "tabularDeleteColumns"],
  ["rename", "tabularRenameHeader"],
  ["width", "tabularColumnWidth"],
] as const;
export const TabularStructure = ({
  controller: c,
}: {
  readonly controller: TabularController;
}) => {
  const { t, locale } = useTranslation();
  const [rename, setRename] = useState("");
  const [width, setWidth] = useState("144");
  const [confirmation, setConfirmation] = useState<{
    edit?: T.Edit;
    rowPosition?: "end" | "before" | "after";
    text: string;
  } | null>(null);
  const [action, setAction] = useState("add-row");
  const act = async () => {
    const { sheetId } = c;
    if (!sheetId) {
      return;
    }
    const box = boundsOf(c.range);
    let edit: T.Edit;
    switch (action) {
      case "add-row": {
        if (c.query.search || c.query.sort) {
          setConfirmation({
            rowPosition: "end",
            text: t("tabularInsertViewWarning"),
          });
        } else {
          await c.insertRows("end");
        }
        return;
      }
      case "add-column": {
        edit = { _tag: "InsertColumns", sheetId, before: null, count: 1 };
        break;
      }
      case "row-before":
      case "row-after": {
        const rowPosition = action === "row-before" ? "before" : "after";
        if (c.query.search || c.query.sort) {
          setConfirmation({ rowPosition, text: t("tabularInsertViewWarning") });
        } else {
          await c.insertRows(rowPosition);
        }
        return;
      }
      case "column-before":
      case "column-after": {
        if (!c.address) {
          return;
        }
        edit = {
          _tag: "InsertColumns",
          sheetId,
          before:
            action === "column-before"
              ? c.address.columnId
              : (c.columns[c.range.extent.column + 1]?.columnId ?? null),
          count: 1,
        };
        break;
      }
      case "delete-rows":
      case "delete-columns": {
        const selected = await c.selectionIds();
        if (!selected) {
          return;
        }
        edit =
          action === "delete-rows"
            ? { _tag: "DeleteRows", sheetId, rowIds: selected.rowIds }
            : { _tag: "DeleteColumns", sheetId, columnIds: selected.columnIds };
        setConfirmation({
          edit,
          text: t("tabularDeleteConfirm", {
            rows: (action === "delete-rows"
              ? box.rowEnd - box.rowStart + 1
              : 0
            ).toLocaleString(locale),
            columns: (action === "delete-columns"
              ? box.columnEnd - box.columnStart + 1
              : 0
            ).toLocaleString(locale),
          }),
        });
        return;
      }
      case "rename": {
        if (!c.address) {
          return;
        }
        edit = {
          _tag: "RenameHeader",
          sheetId,
          columnId: c.address.columnId,
          text: rename,
        };
        break;
      }
      case "width": {
        if (c.address) {
          const next = new Map(c.columnWidths);
          next.set(c.address.columnId, {
            width: Math.max(80, Math.min(640, Number(width))),
            type: "resized",
          });
          c.setColumnWidths(next);
        }
        return;
      }
      default: {
        return;
      }
    }
    await c.applyChange(edit);
  };
  return (
    <details className="border-rule min-w-0 border-y-2 py-3">
      <summary className="cursor-pointer py-2 text-sm font-bold">
        {t("tabularRowColumn")}
      </summary>
      <div className="mt-3 grid items-end gap-3 sm:grid-cols-3">
        <TabularSelect
          label={t("tabularRowColumn")}
          value={action}
          onChange={setAction}
        >
          {choices.map(([value, key]) => (
            <option
              key={value}
              value={value}
              disabled={
                (value === "rename" && !c.sheet?.header) ||
                (value !== "add-row" && value !== "add-column" && !c.address)
              }
            >
              {t(key)}
            </option>
          ))}
        </TabularSelect>
        {action === "rename" ? (
          <TabularText
            label={t("tabularHeaderText")}
            value={rename}
            onChange={setRename}
          />
        ) : action === "width" ? (
          <TabularText
            label={t("tabularColumnWidth")}
            type="number"
            min={80}
            max={640}
            value={width}
            onChange={setWidth}
          />
        ) : null}
        <Button
          intent="outline"
          isDisabled={c.busy || !c.sheetId}
          onPress={() => {
            void act();
          }}
        >
          {t("tabularApply")}
        </Button>
      </div>
      {c.sheet?.header ? null : (
        <p className="text-muted-fg mt-3 text-sm">{t("tabularHeadersOff")}</p>
      )}
      {confirmation ? (
        <TabularConfirm
          title={t("tabularRowColumn")}
          description={confirmation.text}
          onCancel={() => setConfirmation(null)}
          onConfirm={() => {
            if (confirmation.edit) {
              void c.applyChange(confirmation.edit);
            } else if (confirmation.rowPosition) {
              void c.insertRows(confirmation.rowPosition);
            }
            setConfirmation(null);
          }}
        />
      ) : null}
    </details>
  );
};
