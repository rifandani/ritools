"use client";

import { useMemo, useState } from "react";
import type { Key } from "react-aria-components";
import { HiClipboard } from "react-icons/hi2";

import { Badge } from "@/core/components/ui/badge";
import { Button } from "@/core/components/ui/button";
import {
  Disclosure,
  DisclosureGroup,
  DisclosurePanel,
  DisclosureTrigger,
} from "@/core/components/ui/disclosure-group";
import { Note } from "@/core/components/ui/note";
import { SearchField, SearchInput } from "@/core/components/ui/search-field";
import { Tab, TabList, TabPanel, Tabs } from "@/core/components/ui/tabs";
import { copyText } from "@/features/expose/components/expose-copy";
import { LongValue } from "@/features/expose/components/expose-long-value";
import type {
  MetadataField,
  MetadataGroup,
  ReadReport,
} from "@/features/expose/expose";
import { METADATA_GROUPS } from "@/features/expose/expose";
import {
  CONTAINER_LABEL,
  containerBadgesOf,
  groupReportOf,
  GROUP_KEY,
  NOTE_KEY,
} from "@/features/expose/expose.view";
import { useTranslation } from "@/features/i18n/use-translation";

type Translate = ReturnType<typeof useTranslation>["t"];

/** The state mark one group row prints: removable, kept, or format limit. */
const groupStateOf = (
  report: ReadReport,
  group: MetadataGroup,
  t: Translate
): string => {
  if (group === "display") {
    return t("exposeDisplayLocked");
  }
  const entry = groupReportOf(report, group);
  if (entry.removability === "format") {
    return t("exposeGroupFormatLimitMark");
  }
  return entry.count === 0 ? t("exposeNoFields") : t("exposeGroupRemovable");
};

const GroupRow = ({
  group,
  report,
}: {
  readonly group: MetadataGroup;
  readonly report: ReadReport;
}) => {
  const { t } = useTranslation();
  const entry = groupReportOf(report, group);
  const fields = report.fields.filter((field) => field.group === group);
  const badges = containerBadgesOf(entry);
  const empty = entry.count === 0;

  return (
    <Disclosure id={group}>
      <DisclosureTrigger>
        <span className="flex w-full flex-wrap items-center gap-x-3 gap-y-1 pe-2">
          <span className={empty ? "text-muted-fg flex-1" : "flex-1 font-bold"}>
            {t(GROUP_KEY[group])}
          </span>
          <span className="num w-[4ch] shrink-0 text-end">{entry.count}</span>
          <span className="hidden shrink-0 items-center gap-1 sm:flex">
            {badges.shown.map((label) => (
              <Badge intent="outline" key={label}>
                {label}
              </Badge>
            ))}
            {badges.more > 0 ? (
              <Badge intent="secondary">{`+${badges.more}`}</Badge>
            ) : null}
          </span>
          <span
            className={
              group === "display"
                ? "border-rule shrink-0 border-2 px-1.5 py-0.5 text-xs/4 font-bold tracking-[0.05em] uppercase [font-stretch:87.5%]"
                : `text-muted-fg shrink-0 text-xs/4 font-bold tracking-[0.05em] uppercase [font-stretch:87.5%] ${empty ? "hidden sm:inline" : ""}`
            }
          >
            {groupStateOf(report, group, t)}
          </span>
        </span>
      </DisclosureTrigger>
      <DisclosurePanel>
        {fields.length === 0 ? (
          <p className="text-muted-fg text-sm/6">{t("exposeNoFields")}</p>
        ) : (
          <dl className="text-fg divide-rule border-rule divide-y-2 border-y-2">
            {fields.map((field) => (
              <div
                className="grid grid-cols-1 gap-x-3 gap-y-1 py-2 sm:grid-cols-[minmax(0,11rem)_minmax(0,1fr)]"
                key={field.id}
              >
                <dt className="text-muted-fg text-xs/5">{field.label}</dt>
                <dd className="text-sm/6">
                  <LongValue value={field.value} />
                </dd>
              </div>
            ))}
          </dl>
        )}
      </DisclosurePanel>
    </Disclosure>
  );
};

/** Every field, ungrouped, with a filter and a copy action on each row. */
const RawView = ({ report }: { readonly report: ReadReport }) => {
  const { t } = useTranslation();
  const [filter, setFilter] = useState("");

  const rows = useMemo(() => {
    const needle = filter.trim().toLocaleLowerCase();
    if (needle === "") {
      return report.fields;
    }
    return report.fields.filter((field) =>
      [
        field.label,
        field.value,
        field.container,
        CONTAINER_LABEL[field.container],
        t(GROUP_KEY[field.group]),
      ]
        .join(" ")
        .toLocaleLowerCase()
        .includes(needle)
    );
  }, [filter, report.fields, t]);

  const copy = (field: MetadataField) => {
    copyText(field.value, t("exposeCopied"));
  };

  return (
    <div className="flex flex-col gap-3">
      <SearchField
        aria-label={t("exposeFilter")}
        onChange={setFilter}
        value={filter}
      >
        <SearchInput placeholder={t("exposeFilter")} />
      </SearchField>
      <p aria-live="polite" className="num text-xs">
        {t("exposeFieldCount", { count: rows.length })}
      </p>

      {rows.length === 0 ? (
        <p className="text-muted-fg text-sm/6">{t("exposeFilterEmpty")}</p>
      ) : (
        <>
          <table className="border-rule hidden w-full border-2 text-sm/6 sm:table">
            <thead>
              <tr className="text-[0.75rem] font-bold tracking-[0.08em] uppercase [font-stretch:87.5%]">
                <th
                  className="border-rule border-b-2 p-2 text-start"
                  scope="col"
                >
                  {t("exposeField")}
                </th>
                <th
                  className="border-rule border-b-2 p-2 text-start"
                  scope="col"
                >
                  {t("exposeValue")}
                </th>
                <th
                  className="border-rule border-b-2 p-2 text-start"
                  scope="col"
                >
                  {t("exposeGroup")}
                </th>
                <th
                  className="border-rule border-b-2 p-2 text-start"
                  scope="col"
                >
                  {t("exposeContainer")}
                </th>
                <th className="border-rule border-b-2 p-2" scope="col">
                  <span className="sr-only">{t("exposeCopy")}</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((field) => (
                <tr key={field.id}>
                  <th
                    className="border-rule border-b-2 p-2 text-start align-top font-normal"
                    scope="row"
                  >
                    {field.label}
                  </th>
                  <td className="border-rule border-b-2 p-2 align-top">
                    <LongValue value={field.value} />
                  </td>
                  <td className="border-rule border-b-2 p-2 align-top">
                    {t(GROUP_KEY[field.group])}
                  </td>
                  <td className="border-rule border-b-2 p-2 align-top">
                    {CONTAINER_LABEL[field.container]}
                  </td>
                  <td className="border-rule border-b-2 p-2 align-top">
                    <Button
                      intent="plain"
                      onPress={() => {
                        copy(field);
                      }}
                      size="xs"
                    >
                      <HiClipboard aria-hidden="true" />
                      {t("exposeCopy")}
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <dl className="divide-rule sm:hidden">
            {rows.map((field) => (
              <div className="border-rule border-b-2 py-3" key={field.id}>
                <dt className="font-semibold">{field.label}</dt>
                <dd className="mt-1 text-sm/6">
                  <LongValue value={field.value} />
                </dd>
                <dd className="text-muted-fg mt-1 text-xs/5">
                  {t(GROUP_KEY[field.group])} ·{" "}
                  {CONTAINER_LABEL[field.container]}
                </dd>
                <dd className="mt-1">
                  <Button
                    intent="plain"
                    onPress={() => {
                      copy(field);
                    }}
                    size="xs"
                  >
                    <HiClipboard aria-hidden="true" />
                    {t("exposeCopy")}
                  </Button>
                </dd>
              </div>
            ))}
          </dl>
        </>
      )}
    </div>
  );
};

/**
 * The case file: the Metadata Report, ruled into the ten Metadata Groups, and
 * the Raw view of every field. Report is the default because a group count
 * says more than a wall of tag names.
 */
export const ExposeReport = ({ report }: { readonly report: ReadReport }) => {
  const { t } = useTranslation();
  const [view, setView] = useState<"raw" | "report">("report");

  return (
    <section
      aria-labelledby="expose-report-title"
      className="border-rule flex flex-col gap-4 border-t-[3px] pt-4"
    >
      <div className="flex flex-col gap-1">
        <h2
          className="font-display text-[clamp(1.75rem,4vw,2.5rem)] leading-none font-black tracking-[0.01em] uppercase [font-stretch:75%] outline-hidden"
          id="expose-report-title"
          tabIndex={-1}
        >
          {t("exposeReportTitle")}
        </h2>
        <p className="text-muted-fg text-xs/5">
          {t("exposeReportCounts", {
            fields: String(report.counts.fields),
            groups: String(report.counts.groups),
            removable: String(report.counts.removable),
          })}
        </p>
      </div>

      {report.notes.length === 0 ? null : (
        <div className="flex flex-col gap-2">
          <h3 className="text-[0.75rem] font-bold tracking-[0.08em] uppercase [font-stretch:87.5%]">
            {t("exposeNotesTitle")}
          </h3>
          {report.notes.map((note) => (
            <Note intent="info" key={note.code}>
              {t(NOTE_KEY[note.code])}
            </Note>
          ))}
        </div>
      )}

      <Tabs
        onSelectionChange={(key: Key) => {
          setView(key === "raw" ? "raw" : "report");
        }}
        selectedKey={view}
      >
        <TabList aria-label={t("exposeReportTitle")}>
          <Tab id="report">{t("exposeReport")}</Tab>
          <Tab id="raw">{t("exposeRaw")}</Tab>
        </TabList>
        <TabPanel className="pt-3" id="report">
          <p className="text-muted-fg mb-3 text-xs/5">
            {t("exposeReportHint")}
          </p>
          <DisclosureGroup defaultExpandedKeys={[]}>
            {METADATA_GROUPS.map((group) => (
              <GroupRow group={group} key={group} report={report} />
            ))}
          </DisclosureGroup>
        </TabPanel>
        <TabPanel className="pt-3" id="raw">
          <p className="text-muted-fg mb-3 text-xs/5">{t("exposeRawHint")}</p>
          <RawView report={report} />
        </TabPanel>
      </Tabs>
    </section>
  );
};
