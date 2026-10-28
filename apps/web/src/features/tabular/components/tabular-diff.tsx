/* oxlint-disable eslint/complexity -- The Diff panel renders key, count, header, and result states in one modal. */
/* oxlint-disable react-doctor/no-giant-component -- The Diff panel owns one fixed compare contract in one modal. */
/* oxlint-disable react-doctor/prefer-useReducer -- The Diff panel keeps one modal's fixed compare state together. */
/* oxlint-disable react/set-state-in-effect -- The plan and page are external Worker state, cleared when their key changes. */
/* oxlint-disable react/exhaustive-effect-dependencies -- The page effect re-runs on filter and offset while loadPage reads the latest plan. */
/* oxlint-disable promise/prefer-await-to-then -- Installed file handles settle at the panel boundary. */
"use client";

import { Effect } from "effect";
import { Fragment, useEffect, useEffectEvent, useRef, useState } from "react";
import { HiArrowsRightLeft, HiPlus } from "react-icons/hi2";

import { Badge } from "@/core/components/ui/badge";
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
import { Label } from "@/core/components/ui/field";
import {
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
} from "@/core/components/ui/modal";
import { Note } from "@/core/components/ui/note";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/core/components/ui/select";
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@/core/components/ui/toggle-group";
import { download } from "@/core/libs/files";
import { useTranslation } from "@/features/i18n/use-translation";

import type * as T from "../tabular";
import { readLocalFile } from "../tabular.ui";
import type { TabularController } from "../use-tabular";
import { TabularError } from "./tabular-error";

const pageSize = 50;
const filters = ["all", "added", "removed", "changed"] as const;
const statusKey = {
  added: "tabularDiffAdded",
  removed: "tabularDiffRemoved",
  changed: "tabularDiffChanged",
} as const;
const statusIntent = {
  added: "success",
  removed: "danger",
  changed: "warning",
} as const;

const visibleSheets = (report: T.DiffSourceReport) => {
  const visible = report.sheets.filter(
    (sheet) => sheet.visibility === "visible"
  );
  return visible.length ? visible : report.sheets;
};
const firstSheet = (report: T.DiffSourceReport): string | null =>
  visibleSheets(report)[0]?.name ?? null;
const list = (values: readonly string[]): string =>
  values.length > 8
    ? `${values.slice(0, 8).join(", ")} +${values.length - 8}`
    : values.join(", ");
const sideKey = (side: "before" | "after") =>
  side === "before" ? "tabularDiffBefore" : "tabularDiffAfter";
const roleOf = (
  direction: T.DiffDirection
): {
  open: "before" | "after";
  file: "before" | "after";
} =>
  direction === "forward"
    ? { open: "before", file: "after" }
    : { open: "after", file: "before" };
const keyLabel = (row: T.DiffRowItem, plan: T.DiffPlan): string =>
  row.key
    .map((value, index) => {
      const name = plan.keys[index];
      return name ? `${name}: ${value}` : value;
    })
    .join(" · ");

const DiffSourceCard = ({
  role,
  title,
  children,
}: {
  readonly role: "before" | "after";
  readonly title: string;
  readonly children: React.ReactNode;
}) => {
  const { t } = useTranslation();
  return (
    <div className="border-rule flex min-w-0 flex-col gap-2 border-2 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-xs font-bold tracking-[0.08em] uppercase [font-stretch:87.5%]">
          {title}
        </h3>
        <Badge intent={role === "before" ? "secondary" : "primary"}>
          {t(sideKey(role))}
        </Badge>
      </div>
      {children}
    </div>
  );
};

const DiffRowDetails = ({
  row,
  plan,
}: {
  readonly row: T.DiffRowItem;
  readonly plan: T.DiffPlan;
}) => {
  const { t } = useTranslation();
  if (row.status === "changed") {
    return (
      <div className="border-rule border-t px-4 py-3">
        <table className="w-full text-left text-sm/6">
          <thead>
            <tr className="text-muted-fg text-xs font-bold tracking-[0.08em] uppercase [font-stretch:87.5%]">
              <th className="py-1 pe-3" scope="col">
                {t("tabularDiffColumn")}
              </th>
              <th className="py-1 pe-3" scope="col">
                {t("tabularDiffBefore")}
              </th>
              <th className="py-1" scope="col">
                {t("tabularDiffAfter")}
              </th>
            </tr>
          </thead>
          <tbody>
            {row.changes.map((change) => (
              <tr className="border-rule border-t" key={change.column}>
                <th className="py-1.5 pe-3 font-semibold" scope="row">
                  {change.column}
                </th>
                <td className="py-1.5 pe-3 [overflow-wrap:anywhere]">
                  {change.beforeBlank ? t("tabularDiffBlank") : change.before}
                </td>
                <td className="py-1.5 [overflow-wrap:anywhere]">
                  {change.afterBlank ? t("tabularDiffBlank") : change.after}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="text-muted-fg mt-2 text-xs/5">
          {t("tabularDiffOtherMatch")}
        </p>
      </div>
    );
  }
  const labels =
    row.status === "added" ? plan.after.columns : plan.before.columns;
  const values = row.status === "added" ? row.after : row.before;
  if (!values) {
    return null;
  }
  return (
    <div className="border-rule border-t px-4 py-3">
      <dl className="grid gap-x-4 gap-y-1 text-sm/6 sm:grid-cols-[minmax(0,12rem)_minmax(0,1fr)]">
        {labels.map((label, index) => (
          <Fragment key={label}>
            <dt className="text-muted-fg text-xs font-bold tracking-[0.06em] uppercase [font-stretch:87.5%]">
              {label}
            </dt>
            <dd className="[overflow-wrap:anywhere]">
              {values[index] === ""
                ? t("tabularDiffBlank")
                : (values[index] ?? "")}
            </dd>
          </Fragment>
        ))}
      </dl>
    </div>
  );
};

export const TabularDiff = ({
  controller: c,
  onClose,
}: {
  readonly controller: TabularController;
  readonly onClose: () => void;
}) => {
  const { t, locale } = useTranslation();
  const [beforeSheetId, setBeforeSheetId] = useState<T.SheetId | null>(null);
  useEffect(() => {
    setBeforeSheetId((current) => current ?? c.sheet?.sheetId ?? null);
  }, [c.sheet?.sheetId]);
  const openSheet =
    c.session?.sheets.find((sheet) => sheet.sheetId === beforeSheetId) ??
    c.sheet;
  const [source, setSource] = useState<T.DiffSourceReport | null>(null);
  const [sheetName, setSheetName] = useState<string | null>(null);
  const [direction, setDirection] = useState<T.DiffDirection>("forward");
  const [keys, setKeys] = useState<readonly string[]>([]);
  const [plan, setPlan] = useState<T.DiffPlan | null>(null);
  const [counting, setCounting] = useState(false);
  const [filter, setFilter] = useState<T.DiffFilter>("all");
  const [page, setPage] = useState<T.DiffPage | null>(null);
  const [offset, setOffset] = useState(0);
  const [paging, setPaging] = useState(false);
  const [reading, setReading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [expanded, setExpanded] = useState<number | null>(null);
  const input = useRef<HTMLInputElement>(null);
  const addButton = useRef<HTMLButtonElement>(null);
  const planSerial = useRef(0);
  const pageSerial = useRef(0);
  const lastPlanKey = useRef<string | null>(null);
  const roles = roleOf(direction);
  const choices = source ? visibleSheets(source) : [];
  const fileSheet =
    source?.sheets.find((sheet) => sheet.name === sheetName) ?? null;
  const counts = counting || reading ? null : (plan?.counts ?? null);
  const ready = Boolean(counts);
  const planId = counts ? plan?.planId : null;
  const differences = counts
    ? counts.added + counts.removed + counts.changed
    : 0;
  const workbook =
    c.session?.format === "xls" ||
    c.session?.format === "xlsx" ||
    Boolean(source?.workbook);
  const shown = (value: number | null | undefined) =>
    value === null || value === undefined ? "—" : value.toLocaleString(locale);
  const planKey = JSON.stringify([
    source?.sourceId ?? "",
    sheetName,
    direction,
    keys,
    c.session?.revision ?? -1,
  ]);
  const countNow = useEffectEvent(async (serial: number) => {
    if (!source || !sheetName || !beforeSheetId) {
      return;
    }
    const next = await c.makeDiffPlan({
      sheetId: beforeSheetId,
      sourceId: source.sourceId,
      sheetName,
      direction,
      keys,
    });
    if (serial !== planSerial.current) {
      return;
    }
    if (
      next &&
      (next.sessionId !== c.session?.sessionId ||
        next.revision !== c.session?.revision)
    ) {
      return;
    }
    setCounting(false);
    if (next) {
      setPlan(next);
      setFilter("all");
      setOffset(0);
      setPage(null);
      setExpanded(null);
    }
  });
  const loadPage = useEffectEvent(async (serial: number) => {
    if (!plan) {
      return;
    }
    const next = await c.readDiffPage({
      planId: plan.planId,
      filter,
      offset,
      limit: pageSize,
    });
    if (serial !== pageSerial.current) {
      return;
    }
    if (next && next.planId !== plan?.planId) {
      return;
    }
    setPaging(false);
    if (next) {
      setPage(next);
      setExpanded(null);
    }
  });
  useEffect(() => {
    if (!source || !sheetName || !beforeSheetId) {
      return;
    }
    if (lastPlanKey.current === planKey) {
      return;
    }
    lastPlanKey.current = planKey;
    planSerial.current += 1;
    const serial = planSerial.current;
    setCounting(true);
    setPage(null);
    setExpanded(null);
    setOffset(0);
    const timer = setTimeout(() => {
      void countNow(serial);
    }, 150);
    return () => {
      clearTimeout(timer);
      planSerial.current += 1;
    };
  }, [planKey, source, sheetName, beforeSheetId]);
  useEffect(() => {
    if (!planId) {
      setPage(null);
      return;
    }
    pageSerial.current += 1;
    const serial = pageSerial.current;
    setPaging(true);
    void loadPage(serial);
    return () => {
      pageSerial.current += 1;
    };
  }, [planId, filter, offset]);
  const discard = useEffectEvent(() => c.discardDiff());
  useEffect(
    () => () => {
      void discard();
    },
    []
  );
  useEffect(() => {
    addButton.current?.focus();
  }, []);
  const chooseFilter = (selected: Set<string | number>) => {
    const [next] = [...selected];
    if (
      next === "all" ||
      next === "added" ||
      next === "removed" ||
      next === "changed"
    ) {
      setFilter(next);
      setOffset(0);
      setPage(null);
      setExpanded(null);
    }
  };
  const chooseSheet = (name: string) => {
    setSheetName(name);
    setKeys([]);
    setPlan(null);
    setPage(null);
    setOffset(0);
    setFilter("all");
    setExpanded(null);
  };
  const changeKeys = (values: readonly string[]) => {
    const picked = new Set(values);
    const shared = plan?.shared ?? [];
    setKeys(shared.filter((label) => picked.has(label)));
  };
  const addFile = async (files: readonly File[]) => {
    const [file] = files;
    if (!file || c.busy || reading) {
      return;
    }
    setReading(true);
    try {
      const local = await Effect.runPromise(readLocalFile(file));
      const report = await c.addDiffFile(local);
      if (report) {
        setSource(report);
        setKeys([]);
        setSheetName(firstSheet(report));
        setPlan(null);
        setPage(null);
        setFilter("all");
        setOffset(0);
        setExpanded(null);
      }
    } catch (error) {
      c.reportFailure(error);
    }
    setReading(false);
  };
  const swap = () => {
    setDirection((current) => (current === "forward" ? "reverse" : "forward"));
    setKeys([]);
    setPlan(null);
    setPage(null);
    setFilter("all");
    setOffset(0);
    setExpanded(null);
  };
  const exportReport = async () => {
    if (!plan || !ready || exporting) {
      return;
    }
    setExporting(true);
    const result = await c.createDiff(plan.planId);
    setExporting(false);
    if (result) {
      download(
        new Blob([Uint8Array.from(result.bytes)], { type: result.mime }),
        result.filename
      );
    }
  };
  const openSide = direction === "forward" ? plan?.before : plan?.after;
  const fileSide = direction === "forward" ? plan?.after : plan?.before;
  const openHeaderOff =
    openSheet?.header === false || openSide?.header.present === false;
  const fileHeaderOff =
    fileSheet?.header === false || fileSide?.header.present === false;
  const headerIssues = plan
    ? [
        ...(plan.before.header.blank > 0
          ? [
              t("tabularDiffHeaderBlank", {
                side: t("tabularDiffBefore"),
                count: plan.before.header.blank,
              }),
            ]
          : []),
        ...(plan.after.header.blank > 0
          ? [
              t("tabularDiffHeaderBlank", {
                side: t("tabularDiffAfter"),
                count: plan.after.header.blank,
              }),
            ]
          : []),
        ...(plan.before.header.duplicates.length
          ? [
              t("tabularDiffHeaderDuplicate", {
                side: t("tabularDiffBefore"),
                columns: list(plan.before.header.duplicates),
              }),
            ]
          : []),
        ...(plan.after.header.duplicates.length
          ? [
              t("tabularDiffHeaderDuplicate", {
                side: t("tabularDiffAfter"),
                columns: list(plan.after.header.duplicates),
              }),
            ]
          : []),
      ]
    : [];
  const keyIssues =
    plan &&
    plan.before.header.valid &&
    plan.after.header.valid &&
    plan.shared.length > 0
      ? [
          ...(keys.length === 0 ? [t("tabularDiffNoKey")] : []),
          ...(plan.key.missing.length
            ? [
                t("tabularDiffMissingKey", {
                  columns: list(plan.key.missing),
                }),
              ]
            : []),
          ...(plan.key.blankBefore
            ? [
                t("tabularDiffBlankKey", {
                  side: t("tabularDiffBefore"),
                  count: plan.key.blankBefore,
                }),
              ]
            : []),
          ...(plan.key.blankAfter
            ? [
                t("tabularDiffBlankKey", {
                  side: t("tabularDiffAfter"),
                  count: plan.key.blankAfter,
                }),
              ]
            : []),
          ...(plan.key.duplicateBefore
            ? [
                t("tabularDiffRepeatedKey", {
                  side: t("tabularDiffBefore"),
                  count: plan.key.duplicateBefore,
                }),
              ]
            : []),
          ...(plan.key.duplicateAfter
            ? [
                t("tabularDiffRepeatedKey", {
                  side: t("tabularDiffAfter"),
                  count: plan.key.duplicateAfter,
                }),
              ]
            : []),
        ]
      : [];
  const unresolved =
    (plan?.before.unresolved ?? 0) + (plan?.after.unresolved ?? 0);
  return (
    <ModalContent
      isOpen
      aria-label={t("tabularDiffTitle")}
      size="2xl"
      isDismissable={!c.busy && !reading && !exporting}
      onOpenChange={(open) => {
        if (!open) {
          onClose();
        }
      }}
    >
      <ModalHeader title={t("tabularDiffTitle")} />
      <ModalBody>
        <div className="grid gap-3 sm:grid-cols-2">
          <DiffSourceCard role={roles.open} title={t("tabularDiffOpenFile")}>
            <p className="text-sm/6 font-semibold [overflow-wrap:anywhere]">
              {c.session?.sourceName}
            </p>
            <p className="text-muted-fg text-xs/5">
              {t("tabularSheet")}: {openSheet?.name ?? "—"}
            </p>
            <p className="num text-muted-fg text-xs/5">
              {t("tabularDiffFacts", {
                rows: openSheet?.rowCount ?? 0,
                columns: openSheet?.columnCount ?? 0,
              })}
            </p>
          </DiffSourceCard>
          <DiffSourceCard
            role={roles.file}
            title={t("tabularDiffComparedFile")}
          >
            {source ? (
              <>
                <p className="text-sm/6 font-semibold [overflow-wrap:anywhere]">
                  {source.name}
                </p>
                {choices.length > 1 ? (
                  <div className="w-full min-w-0">
                    <Select
                      className="w-full"
                      selectedKey={sheetName}
                      isDisabled={c.busy || reading}
                      onSelectionChange={(key) => {
                        if (key !== null) {
                          chooseSheet(String(key));
                        }
                      }}
                    >
                      <Label>{t("tabularSheet")}</Label>
                      <div className="mt-1">
                        <SelectTrigger />
                      </div>
                      <SelectContent>
                        {choices.map((sheet) => (
                          <SelectItem
                            id={sheet.name}
                            key={sheet.name}
                            textValue={sheet.name}
                          >
                            {sheet.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ) : (
                  <p className="text-muted-fg text-xs/5">
                    {t("tabularSheet")}: {sheetName ?? "—"}
                  </p>
                )}
                {fileSheet ? (
                  <p className="num text-muted-fg text-xs/5">
                    {t("tabularDiffFacts", {
                      rows: fileSheet.rows,
                      columns: fileSheet.columns,
                    })}
                  </p>
                ) : null}
                {fileHeaderOff ? (
                  <p className="text-danger-subtle-fg text-xs/5">
                    {t("tabularDiffNoHeader")}
                  </p>
                ) : null}
              </>
            ) : (
              <p className="text-muted-fg text-sm/6">
                {t("tabularDiffNoFile")}
              </p>
            )}
            <Button
              ref={addButton}
              className="mt-auto"
              intent="outline"
              isDisabled={c.busy || reading}
              onPress={() => input.current?.click()}
            >
              <HiPlus aria-hidden />
              {source ? t("tabularDiffReplace") : t("tabularDiffAdd")}
            </Button>
          </DiffSourceCard>
        </div>
        <input
          ref={input}
          type="file"
          accept=".csv,.tsv,.tab,.txt,.xls,.xlsx"
          className="sr-only"
          tabIndex={-1}
          aria-hidden
          onChange={(event) => {
            void addFile([...(event.target.files ?? [])]);
            event.target.value = "";
          }}
        />
        <div className="mt-3 flex flex-wrap gap-2">
          <Button
            intent="outline"
            isDisabled={c.busy || reading}
            onPress={swap}
          >
            <HiArrowsRightLeft aria-hidden />
            {t("tabularDiffSwap")}
          </Button>
        </div>
        {openHeaderOff ? (
          <Note className="mt-4" intent="warning">
            {t("tabularDiffOpenHeaderOff")}
          </Note>
        ) : null}
        {headerIssues.length ? (
          <Note className="mt-4" intent="warning">
            <div className="flex flex-col gap-1">
              {headerIssues.map((issue) => (
                <p key={issue}>{issue}</p>
              ))}
            </div>
          </Note>
        ) : null}
        {plan &&
        plan.before.header.valid &&
        plan.after.header.valid &&
        plan.shared.length === 0 ? (
          <Note className="mt-4" intent="warning">
            {t("tabularDiffNoShared")}
          </Note>
        ) : null}
        {plan &&
        plan.before.header.valid &&
        plan.after.header.valid &&
        plan.shared.length > 0 ? (
          <fieldset className="mt-4 min-w-0">
            <legend className="text-base/6 font-semibold sm:text-sm/6">
              {t("tabularDiffKey")}
            </legend>
            <p className="text-muted-fg mt-1 text-sm/6">
              {t("tabularDiffKeyHint")}
            </p>
            <CheckboxGroup
              aria-label={t("tabularDiffKey")}
              className="mt-2"
              value={[...keys]}
              onChange={changeKeys}
              isDisabled={c.busy || reading}
            >
              <div className="grid max-h-48 gap-2 overflow-y-auto sm:grid-cols-2">
                {plan.shared.map((label) => (
                  <CheckboxField key={label} value={label}>
                    <Checkbox>{label}</Checkbox>
                  </CheckboxField>
                ))}
              </div>
            </CheckboxGroup>
          </fieldset>
        ) : null}
        {keyIssues.length ? (
          <Note className="mt-4" intent="warning">
            <div className="flex flex-col gap-1">
              {keyIssues.map((issue) => (
                <p key={issue}>{issue}</p>
              ))}
            </div>
            {plan?.key.repeated.length ? (
              <p className="mt-1 text-xs/5">
                {t("tabularDiffRepeatedKeys", {
                  keys: list(plan.key.repeated),
                })}
              </p>
            ) : null}
          </Note>
        ) : null}
        {plan?.key.valid && keys.length > 0 && unresolved === 0 ? (
          <p className="text-muted-fg mt-2 text-xs/5">
            {t("tabularDiffKeyValid")}
          </p>
        ) : null}
        {plan?.oneSidedBefore.length ? (
          <Note className="mt-4" intent="info">
            {t("tabularDiffOneSided", {
              side: t("tabularDiffBefore"),
              columns: list(plan.oneSidedBefore),
            })}
          </Note>
        ) : null}
        {plan?.oneSidedAfter.length ? (
          <Note className="mt-4" intent="info">
            {t("tabularDiffOneSided", {
              side: t("tabularDiffAfter"),
              columns: list(plan.oneSidedAfter),
            })}
          </Note>
        ) : null}
        {plan && plan.before.unresolved > 0 ? (
          <Note className="mt-4" intent="danger">
            {t("tabularDiffUnresolved", {
              side: t("tabularDiffBefore"),
              count: plan.before.unresolved,
            })}
          </Note>
        ) : null}
        {plan && plan.after.unresolved > 0 ? (
          <Note className="mt-4" intent="danger">
            {t("tabularDiffUnresolved", {
              side: t("tabularDiffAfter"),
              count: plan.after.unresolved,
            })}
          </Note>
        ) : null}
        {workbook ? (
          <Note className="mt-4" intent="warning">
            <p>{t("tabularValuesOnly")}</p>
            <p className="mt-2">{t("tabularStaleResults")}</p>
          </Note>
        ) : null}
        {counting ? (
          <Note className="mt-4" intent="info">
            {t("tabularDiffPlanning")}
          </Note>
        ) : null}
        {reading ? (
          <Note className="mt-4" intent="info">
            {t("tabularDiffReading")}
          </Note>
        ) : null}
        <DescriptionList
          aria-live="polite"
          aria-label={t("tabularDiffCounts")}
          className="mt-4"
        >
          <DescriptionTerm>{t("tabularDiffAdded")}</DescriptionTerm>
          <DescriptionDetails className="num">
            {shown(counts?.added)}
          </DescriptionDetails>
          <DescriptionTerm>{t("tabularDiffRemoved")}</DescriptionTerm>
          <DescriptionDetails className="num">
            {shown(counts?.removed)}
          </DescriptionDetails>
          <DescriptionTerm>{t("tabularDiffChanged")}</DescriptionTerm>
          <DescriptionDetails className="num">
            {shown(counts?.changed)}
          </DescriptionDetails>
          <DescriptionTerm>{t("tabularDiffUnchanged")}</DescriptionTerm>
          <DescriptionDetails className="num">
            {shown(counts?.unchanged)}
          </DescriptionDetails>
        </DescriptionList>
        {ready && plan?.columns.length === 0 ? (
          <Note className="mt-4" intent="info">
            {t("tabularDiffOnlyKeys")}
          </Note>
        ) : null}
        {ready && differences === 0 ? (
          <Note className="mt-4" intent="info">
            {t("tabularDiffNoChanges")}
          </Note>
        ) : null}
        {ready && plan && differences > 0 ? (
          <>
            <div className="mt-4">
              <ToggleGroup
                aria-label={t("tabularDiffResults")}
                selectedKeys={[filter]}
                onSelectionChange={chooseFilter}
              >
                {filters.map((item) => (
                  <ToggleGroupItem id={item} key={item}>
                    {t(
                      item === "all"
                        ? "tabularDiffAll"
                        : item === "added"
                          ? "tabularDiffAdded"
                          : item === "removed"
                            ? "tabularDiffRemoved"
                            : "tabularDiffChanged"
                    )}
                  </ToggleGroupItem>
                ))}
              </ToggleGroup>
            </div>
            {page ? (
              page.items.length ? (
                <>
                  <ol className="border-rule divide-rule mt-3 divide-y border-2">
                    {page.items.map((row, index) => {
                      const open = expanded === index;
                      return (
                        <li
                          key={`${row.status}:${row.key.join("\u0000")}:${offset + index}`}
                        >
                          <button
                            type="button"
                            aria-expanded={open}
                            className="hover:bg-muted flex w-full min-w-0 flex-wrap items-center gap-x-3 gap-y-1 px-4 py-2 text-left"
                            onClick={() => {
                              setExpanded(open ? null : index);
                            }}
                          >
                            <Badge intent={statusIntent[row.status]}>
                              {t(statusKey[row.status])}
                            </Badge>
                            <span className="min-w-0 text-sm/6 font-semibold [overflow-wrap:anywhere]">
                              {keyLabel(row, plan)}
                            </span>
                            {row.status === "changed" ? (
                              <span className="num text-muted-fg ms-auto text-xs/5">
                                {t("tabularDiffChangedFields", {
                                  count: row.changes.length,
                                })}
                              </span>
                            ) : null}
                          </button>
                          {open ? (
                            <DiffRowDetails plan={plan} row={row} />
                          ) : null}
                        </li>
                      );
                    })}
                  </ol>
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                    <p className="num text-muted-fg text-xs/5">
                      {t("tabularDiffPage", {
                        from: (offset + 1).toLocaleString(locale),
                        to: (offset + page.items.length).toLocaleString(locale),
                        total: page.total.toLocaleString(locale),
                      })}
                    </p>
                    <div className="flex gap-2">
                      <Button
                        intent="outline"
                        isDisabled={offset === 0 || paging}
                        onPress={() => {
                          setOffset(Math.max(0, offset - pageSize));
                        }}
                      >
                        {t("tabularDiffPrevious")}
                      </Button>
                      <Button
                        intent="outline"
                        isDisabled={page.nextOffset === null || paging}
                        onPress={() => {
                          setOffset(page.nextOffset ?? offset);
                        }}
                      >
                        {t("tabularDiffNext")}
                      </Button>
                    </div>
                  </div>
                </>
              ) : (
                <Note className="mt-3" intent="info">
                  {t("tabularDiffEmpty")}
                </Note>
              )
            ) : (
              <Note className="mt-3" intent="info">
                {t("loading")}
              </Note>
            )}
          </>
        ) : null}
        {c.failure ? <TabularError error={c.failure} /> : null}
      </ModalBody>
      <ModalFooter>
        <Button
          intent="plain"
          isDisabled={c.busy || reading || exporting}
          onPress={onClose}
        >
          {t("tabularCancel")}
        </Button>
        <Button
          intent="primary"
          isDisabled={
            !ready || differences === 0 || c.busy || counting || exporting
          }
          onPress={() => {
            void exportReport();
          }}
        >
          {exporting ? t("tabularDiffExporting") : t("tabularDiffExport")}
        </Button>
      </ModalFooter>
    </ModalContent>
  );
};
