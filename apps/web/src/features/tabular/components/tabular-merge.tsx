/* oxlint-disable eslint/complexity -- The merge panel renders the fixed source, plan, and blocked states in one modal. */
/* oxlint-disable eslint/no-await-in-loop -- Sources are read and parsed in order, and one session operation holds the lock. */
/* oxlint-disable react-doctor/no-giant-component -- The merge panel owns one fixed merge contract in one modal. */
/* oxlint-disable react/set-state-in-effect -- The plan is external Worker state, cleared when the sources or options change. */
"use client";

import { Effect } from "effect";
import { useEffect, useEffectEvent, useRef, useState } from "react";
import {
  HiArrowDown,
  HiArrowUp,
  HiPlus,
  HiQueueList,
  HiXMark,
} from "react-icons/hi2";

import { Button } from "@/core/components/ui/button";
import { Description } from "@/core/components/ui/field";
import {
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
} from "@/core/components/ui/modal";
import { Note } from "@/core/components/ui/note";
import { Switch, SwitchField } from "@/core/components/ui/switch";
import { download } from "@/core/libs/files";
import { useTranslation } from "@/features/i18n/use-translation";

import type * as T from "../tabular";
import { readMergeFile } from "../tabular.ui";
import type { TabularController } from "../use-tabular";
import { TabularError } from "./tabular-error";
import { TabularSelect } from "./tabular-fields";

interface MergeRow {
  readonly report: T.MergeSourceReport;
  readonly archive: string | null;
}
const delimiters = [
  { id: ",", labelKey: "tabularComma" },
  { id: ";", labelKey: "tabularSemicolon" },
  { id: "|", labelKey: "tabularPipe" },
] as const;
const newlines = [
  { id: "lf", labelKey: "tabularLf" },
  { id: "crlf", labelKey: "tabularCrlf" },
] as const;

export const TabularMerge = ({
  controller: c,
  onClose,
}: {
  readonly controller: TabularController;
  readonly onClose: () => void;
}) => {
  const { t, locale } = useTranslation();
  const [sources, setSources] = useState<readonly MergeRow[]>([]);
  const sourcesRef = useRef<readonly MergeRow[]>([]);
  const [header, setHeader] = useState(true);
  const [delimiter, setDelimiter] = useState<T.Delimiter>(",");
  const [newline, setNewline] = useState<"lf" | "crlf">("lf");
  const [bom, setBom] = useState(false);
  const dialectTouched = useRef({
    delimiter: false,
    newline: false,
    bom: false,
  });
  const [plan, setPlan] = useState<T.MergePlan | null>(null);
  const [planning, setPlanning] = useState(false);
  const [reading, setReading] = useState(false);
  const [localNote, setLocalNote] = useState<
    | "tabularMergeZipFailed"
    | "tabularMergeZipEmpty"
    | "tabularMergeDuplicate"
    | null
  >(null);
  const input = useRef<HTMLInputElement>(null);
  const addButton = useRef<HTMLButtonElement>(null);
  const planSerial = useRef(0);
  const { session } = c;
  const sourceKey = sources.map((row) => row.report.sourceId).join("|");
  const optionKey = `${header ? "h" : "n"}|${delimiter}|${newline}|${bom ? "b" : "n"}|${locale}`;
  const mergeOptions = (): T.MergeOptions => ({
    header,
    delimiter,
    newline,
    bom,
    locale: locale === "id-id" ? "id-ID" : "en-US",
  });
  const setRows = (next: readonly MergeRow[]) => {
    sourcesRef.current = next;
    setSources(next);
  };
  const applyDialect = (report: T.MergeSourceReport) => {
    if (!dialectTouched.current.delimiter) {
      setDelimiter(
        report.delimiter === ";" || report.delimiter === "|"
          ? report.delimiter
          : ","
      );
    }
    if (!dialectTouched.current.newline) {
      setNewline(report.newline === "crlf" ? "crlf" : "lf");
    }
    if (!dialectTouched.current.bom) {
      setBom(report.bom);
    }
  };
  const addSources = async (files: readonly File[]) => {
    if (c.busy || reading) {
      return;
    }
    setReading(true);
    setLocalNote(null);
    try {
      for (const file of files) {
        const result = await Effect.runPromise(readMergeFile(file));
        if (result._tag === "ZipFailed") {
          setLocalNote("tabularMergeZipFailed");
          continue;
        }
        if (result._tag === "ZipEmpty") {
          setLocalNote("tabularMergeZipEmpty");
          continue;
        }
        for (const source of result.sources) {
          const duplicate = sourcesRef.current.some(
            (row) =>
              row.report.name === source.name && row.report.size === source.size
          );
          if (duplicate) {
            setLocalNote("tabularMergeDuplicate");
            continue;
          }
          const report = await c.addMergeFile(source);
          if (!report) {
            setReading(false);
            return;
          }
          const wasEmpty = sourcesRef.current.length === 0;
          setRows([...sourcesRef.current, { report, archive: result.archive }]);
          if (wasEmpty) {
            applyDialect(report);
          }
        }
      }
    } catch (error) {
      c.reportFailure(error);
    }
    setReading(false);
  };
  const addOpenFile = async () => {
    if (!session || c.busy || reading) {
      return;
    }
    const duplicate = sourcesRef.current.some(
      (row) =>
        row.report.name === session.sourceName &&
        row.report.size === session.sourceBytes
    );
    if (duplicate) {
      setLocalNote("tabularMergeDuplicate");
      return;
    }
    setReading(true);
    setLocalNote(null);
    const report = await c.addMergeSession();
    setReading(false);
    if (!report) {
      return;
    }
    const wasEmpty = sourcesRef.current.length === 0;
    setRows([...sourcesRef.current, { report, archive: null }]);
    if (wasEmpty) {
      applyDialect(report);
    }
  };
  const move = (index: number, delta: number) => {
    const target = index + delta;
    if (target < 0 || target >= sourcesRef.current.length) {
      return;
    }
    const next = [...sourcesRef.current];
    const [row] = next.splice(index, 1);
    if (!row) {
      return;
    }
    next.splice(target, 0, row);
    setRows(next);
  };
  const remove = (index: number) => {
    setRows(sourcesRef.current.filter((_row, at) => at !== index));
  };
  const planNow = useEffectEvent(async () => {
    planSerial.current += 1;
    const serial = planSerial.current;
    const next = await c.makeMergePlan(
      sourcesRef.current.map((row) => row.report.sourceId),
      mergeOptions()
    );
    if (serial !== planSerial.current) {
      return;
    }
    setPlanning(false);
    if (next) {
      setPlan(next);
    }
  });
  const lastPlanKey = useRef<string | null>(null);
  useEffect(() => {
    const key = `${sourceKey}|${optionKey}`;
    if (lastPlanKey.current === key) {
      return;
    }
    lastPlanKey.current = key;
    if (sourceKey === "") {
      planSerial.current += 1;
      setPlan(null);
      setPlanning(false);
      return;
    }
    planSerial.current += 1;
    setPlan(null);
    setPlanning(true);
    const timer = setTimeout(() => {
      void planNow();
    }, 150);
    return () => {
      clearTimeout(timer);
    };
  }, [sourceKey, optionKey]);
  const discardMerge = useEffectEvent(() => c.discardMerge());
  useEffect(
    () => () => {
      void discardMerge();
    },
    []
  );
  useEffect(() => {
    addButton.current?.focus();
  }, []);
  const openFileAdded =
    Boolean(session) &&
    sources.some(
      (row) =>
        row.report.name === session?.sourceName &&
        row.report.size === session?.sourceBytes
    );
  const canCreate =
    sources.length > 0 &&
    !c.busy &&
    !reading &&
    !planning &&
    (!plan || (plan.unresolved === 0 && plan.totalColumns > 0));
  const create = async () => {
    if (sourcesRef.current.length === 0 || c.busy || reading || planning) {
      return;
    }
    setLocalNote(null);
    const next = await c.makeMergePlan(
      sourcesRef.current.map((row) => row.report.sourceId),
      mergeOptions()
    );
    if (!next) {
      return;
    }
    setPlan(next);
    if (next.unresolved > 0 || next.totalColumns === 0) {
      return;
    }
    const result = await c.createMerge(next.planId);
    if (!result) {
      return;
    }
    download(
      new Blob([Uint8Array.from(result.bytes)], { type: result.mime }),
      result.filename
    );
  };
  const dialectLabel = `${t(
    delimiter === ","
      ? "tabularComma"
      : delimiter === ";"
        ? "tabularSemicolon"
        : "tabularPipe"
  )}`;
  return (
    <ModalContent
      isOpen
      aria-label={t("tabularMergeTitle")}
      size="2xl"
      isDismissable={!c.busy && !reading}
      onOpenChange={(open) => {
        if (!open) {
          onClose();
        }
      }}
    >
      <ModalHeader title={t("tabularMergeTitle")} />
      <ModalBody>
        <div className="flex flex-wrap gap-2">
          <Button
            ref={addButton}
            intent="outline"
            isDisabled={c.busy || reading}
            onPress={() => input.current?.click()}
          >
            <HiPlus aria-hidden />
            {t("tabularMergeAdd")}
          </Button>
          <Button
            intent="outline"
            isDisabled={!session || openFileAdded || c.busy || reading}
            onPress={() => {
              void addOpenFile();
            }}
          >
            <HiQueueList aria-hidden />
            {t("tabularMergeAddOpen")}
          </Button>
          <input
            ref={input}
            id="tabular-merge-files"
            type="file"
            multiple
            accept=".csv,.tsv,.tab,.txt,.xls,.xlsx,.zip"
            className="sr-only"
            tabIndex={-1}
            aria-hidden
            onChange={(event) => {
              void addSources([...(event.target.files ?? [])]);
              event.target.value = "";
            }}
          />
        </div>
        {sources.length === 0 ? (
          <p className="mt-4 text-sm">{t("tabularMergeEmpty")}</p>
        ) : (
          <ol className="mt-4 space-y-2">
            {sources.map((row, index) => {
              const planned = plan?.sources[index];
              const facts = {
                rows: planned?.rows ?? row.report.rows,
                columns: planned?.columns ?? row.report.columns,
              };
              return (
                <li
                  key={row.report.sourceId}
                  className="bracket border-rule flex min-w-0 items-start gap-2 border-2 p-2"
                >
                  <span
                    aria-hidden
                    className="num text-muted-fg min-w-6 pt-2 text-sm"
                  >
                    {index + 1}
                  </span>
                  <div className="min-w-0 flex-1 pt-1">
                    <p className="text-sm font-bold [overflow-wrap:anywhere]">
                      {row.report.name}
                    </p>
                    <p className="text-muted-fg num text-xs [overflow-wrap:anywhere]">
                      {row.archive ? `${row.archive} · ` : ""}
                      {row.report.workbook ? `${row.report.sheetName} · ` : ""}
                      {t("tabularMergeSourceFacts", facts)}
                      {plan && !plan.positional && planned
                        ? ` · ${t("tabularMergeMatched", {
                            matched:
                              planned.matchedColumns.toLocaleString(locale),
                            added: planned.newColumns.toLocaleString(locale),
                          })}`
                        : ""}
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <Button
                      size="sq-sm"
                      intent="plain"
                      isDisabled={index === 0 || c.busy}
                      aria-label={t("tabularMergeMoveUp", {
                        name: row.report.name,
                      })}
                      onPress={() => move(index, -1)}
                    >
                      <HiArrowUp aria-hidden />
                    </Button>
                    <Button
                      size="sq-sm"
                      intent="plain"
                      isDisabled={index === sources.length - 1 || c.busy}
                      aria-label={t("tabularMergeMoveDown", {
                        name: row.report.name,
                      })}
                      onPress={() => move(index, 1)}
                    >
                      <HiArrowDown aria-hidden />
                    </Button>
                    <Button
                      size="sq-sm"
                      intent="plain"
                      isDisabled={c.busy}
                      aria-label={t("tabularMergeRemove", {
                        name: row.report.name,
                      })}
                      onPress={() => remove(index)}
                    >
                      <HiXMark aria-hidden />
                    </Button>
                  </div>
                </li>
              );
            })}
          </ol>
        )}
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <SwitchField
              isSelected={header}
              onChange={(selected) => {
                setHeader(selected);
              }}
            >
              <Switch className="w-fit">{t("tabularMergeHeader")}</Switch>
              <Description>{t("tabularMergeHeaderHint")}</Description>
            </SwitchField>
          </div>
          <div className="sm:col-span-2">
            <SwitchField
              isSelected={bom}
              onChange={(selected) => {
                dialectTouched.current.bom = true;
                setBom(selected);
              }}
            >
              <Switch className="w-fit">{t("tabularBom")}</Switch>
            </SwitchField>
          </div>
          <TabularSelect
            label={t("tabularDelimiter")}
            id="tabular-merge-delimiter"
            value={delimiter}
            disabled={c.busy}
            options={delimiters.map((entry) => ({
              id: entry.id,
              label: t(entry.labelKey),
            }))}
            onChange={(value) => {
              const next = delimiters.find((entry) => entry.id === value);
              if (next) {
                dialectTouched.current.delimiter = true;
                setDelimiter(next.id);
              }
            }}
          />
          <TabularSelect
            label={t("tabularNewline")}
            id="tabular-merge-newline"
            value={newline}
            disabled={c.busy}
            options={newlines.map((entry) => ({
              id: entry.id,
              label: t(entry.labelKey),
            }))}
            onChange={(value) => {
              if (value === "lf" || value === "crlf") {
                dialectTouched.current.newline = true;
                setNewline(value);
              }
            }}
          />
        </div>
        {plan ? (
          <div className="mt-5 space-y-2">
            {plan.columns.length ? (
              <div>
                <p className="text-sm font-semibold">
                  {t("tabularMergeColumns")}
                </p>
                <p className="text-muted-fg text-sm [overflow-wrap:anywhere]">
                  {plan.columns.slice(0, 12).join(" · ")}
                  {plan.columns.length > 12
                    ? ` · ${t("tabularMergeMore", {
                        count: (plan.columns.length - 12).toLocaleString(
                          locale
                        ),
                      })}`
                    : ""}
                </p>
              </div>
            ) : null}
            {plan.blankCells > 0 ? (
              <p className="text-muted-fg num text-sm">
                {t("tabularMergeBlank", {
                  count: plan.blankCells.toLocaleString(locale),
                })}
              </p>
            ) : null}
            <p className="text-muted-fg num text-sm [overflow-wrap:anywhere]">
              {t("tabularMergeName", { name: plan.filename })}
            </p>
            <p className="text-muted-fg text-sm">
              {t("tabularMergeDialect", {
                delimiter: dialectLabel,
                newline: t(newline === "crlf" ? "tabularCrlf" : "tabularLf"),
                bom: t(bom ? "tabularBom" : "tabularNoBom"),
              })}
            </p>
          </div>
        ) : null}
        {plan?.positional && header ? (
          <Note className="mt-4" intent="info">
            {t("tabularMergePositional")}
          </Note>
        ) : null}
        {header ? null : (
          <Note className="mt-4" intent="info">
            {t("tabularMergeNoHeader")}
          </Note>
        )}
        {plan?.valuesOnly ? (
          <Note className="mt-4" intent="warning">
            <p>{t("tabularValuesOnly")}</p>
            <p className="mt-2">{t("tabularStaleResults")}</p>
          </Note>
        ) : null}
        {plan && plan.unresolved > 0 ? (
          <Note className="mt-4" intent="warning">
            <p>
              {t("tabularMergeUnresolved", {
                count: plan.unresolved.toLocaleString(locale),
              })}
            </p>
            <ul className="mt-2 space-y-1">
              {plan.sources.flatMap((source) =>
                source.unresolved > 0
                  ? [
                      <li key={source.sourceId}>
                        {t("tabularMergeUnresolvedSource", {
                          name: source.name,
                          count: source.unresolved.toLocaleString(locale),
                        })}
                      </li>,
                    ]
                  : []
              )}
            </ul>
            {plan.sources.some(
              (source) => source.origin === "session" && source.unresolved > 0
            ) ? (
              <div className="mt-3">
                <Button
                  intent="outline"
                  onPress={() => {
                    onClose();
                    c.nextUnresolved();
                  }}
                >
                  {t("tabularNextUnresolved")}
                </Button>
              </div>
            ) : null}
          </Note>
        ) : null}
        {plan && plan.totalColumns === 0 ? (
          <Note className="mt-4" intent="warning">
            {t("tabularMergeNoColumns")}
          </Note>
        ) : null}
        {plan &&
        plan.header &&
        plan.totalRows === 0 &&
        plan.totalColumns > 0 ? (
          <Note className="mt-4" intent="info">
            {t("tabularMergeZeroRows")}
          </Note>
        ) : null}
        {localNote ? (
          <Note className="mt-4" intent="danger">
            {t(localNote)}
          </Note>
        ) : null}
        {c.failure ? <TabularError error={c.failure} /> : null}
        {reading ? (
          <Note className="mt-4" intent="info">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p>{t("tabularMergeReading")}</p>
              <Button intent="outline" onPress={() => c.cancel()}>
                {t("tabularCancel")}
              </Button>
            </div>
          </Note>
        ) : null}
        {planning ? (
          <Note className="mt-4" intent="info">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p>{t("tabularMergePlanning")}</p>
              <Button intent="outline" onPress={() => c.cancel()}>
                {t("tabularCancel")}
              </Button>
            </div>
          </Note>
        ) : null}
        {c.busy && !reading && !planning ? (
          <Note className="mt-4" intent="info">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p>{t("tabularMergeMerging")}</p>
              <Button intent="outline" onPress={() => c.cancel()}>
                {t("tabularCancel")}
              </Button>
            </div>
          </Note>
        ) : null}
      </ModalBody>
      <ModalFooter>
        <Button intent="plain" isDisabled={c.busy || reading} onPress={onClose}>
          {t("tabularCancel")}
        </Button>
        <Button
          intent="primary"
          isDisabled={!canCreate}
          onPress={() => {
            void create();
          }}
        >
          {t("tabularCreateDownload")}
        </Button>
      </ModalFooter>
    </ModalContent>
  );
};
