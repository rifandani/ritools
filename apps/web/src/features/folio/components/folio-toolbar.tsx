/* oxlint-disable eslint/complexity -- Each toolbar group reflects engine permissions, draft ownership, and history state. */
import {
  HiArrowDownTray,
  HiChevronLeft,
  HiChevronRight,
  HiArrowUturnLeft,
  HiArrowUturnRight,
  HiMagnifyingGlass,
  HiQueueList,
} from "react-icons/hi2";

import { Button } from "@/core/components/ui/button";
import {
  Menu,
  MenuContent,
  MenuItem,
  MenuLabel,
} from "@/core/components/ui/menu";
import { useTranslation } from "@/features/i18n/use-translation";

import type * as F from "../folio";
import type { Panel, Tool } from "../folio.ui";
import type { FolioController } from "../use-folio";
import { annotationKeys } from "./folio-annotations";
import { FolioField, FolioSelect } from "./folio-controls";

const FolioMoreMenu = ({
  c,
  panel,
  openPanel,
  find,
  query,
}: {
  readonly c: FolioController;
  readonly panel: Panel;
  readonly openPanel: (panel: Panel) => void;
  readonly find: (direction: "next" | "previous") => void;
  readonly query: string;
}) => {
  const { t } = useTranslation();
  const { snapshot } = c;
  if (!snapshot) {
    return null;
  }
  const disabled = c.busy;
  const editDisabled = disabled || c.drafting;
  return (
    <Menu>
      <Button id="folio-more" intent="outline">
        {t("folioMoreActions")}
      </Button>
      <MenuContent
        aria-label={t("folioMoreActions")}
        className="[&_[role=menuitem]]:min-h-11"
        onAction={(key) => {
          if (key === "outline" || key === "annotations" || key === "forms") {
            openPanel(key);
          } else if (key === "previous" || key === "next") {
            find(key);
          } else if (key === "undo" || key === "redo") {
            void c.undoRedo(key);
          }
        }}
      >
        <MenuItem id="outline" isDisabled={disabled || c.drafting}>
          <MenuLabel>{t("folioOutline")}</MenuLabel>
        </MenuItem>
        <MenuItem
          id="annotations"
          isDisabled={disabled || (c.drafting && panel !== "annotations")}
        >
          <MenuLabel>{t("folioAnnotationList")}</MenuLabel>
        </MenuItem>
        <MenuItem
          id="forms"
          isDisabled={disabled || (c.drafting && panel !== "forms")}
        >
          <MenuLabel>{t("folioFormFields")}</MenuLabel>
        </MenuItem>
        <MenuItem id="previous" isDisabled={disabled || !query}>
          <MenuLabel>{t("folioFindPrevious")}</MenuLabel>
        </MenuItem>
        <MenuItem id="next" isDisabled={disabled || !query}>
          <MenuLabel>{t("folioFindNext")}</MenuLabel>
        </MenuItem>
        <MenuItem
          id="undo"
          isDisabled={editDisabled || !snapshot.history.canUndo}
        >
          <MenuLabel>{t("folioUndo")}</MenuLabel>
        </MenuItem>
        <MenuItem
          id="redo"
          isDisabled={editDisabled || !snapshot.history.canRedo}
        >
          <MenuLabel>{t("folioRedo")}</MenuLabel>
        </MenuItem>
      </MenuContent>
    </Menu>
  );
};

export const FolioToolbar = ({
  c,
  current,
  pageNumber,
  setPageNumber,
  zoom,
  setZoom,
  query,
  setQuery,
  find,
  navigate,
  openPanel,
  chooseTool,
  review,
  panel,
  tool,
  searchNotice,
  narrow,
}: {
  readonly narrow: boolean;
  readonly c: FolioController;
  readonly current: F.Page | undefined;
  readonly pageNumber: string;
  readonly setPageNumber: (value: string) => void;
  readonly zoom: "width" | "page" | number;
  readonly setZoom: (value: "width" | "page" | number) => void;
  readonly query: string;
  readonly setQuery: (value: string) => void;
  readonly find: (direction: "next" | "previous") => void;
  readonly navigate: (page: number) => void;
  readonly openPanel: (panel: Panel) => void;
  readonly chooseTool: (tool: Tool) => void;
  readonly review: (scope: F.ExportScope) => void;
  readonly panel: Panel;
  readonly tool: Tool;
  readonly searchNotice: string;
}) => {
  const { t } = useTranslation();
  const { snapshot } = c;
  if (!snapshot) {
    return null;
  }
  const { pages } = snapshot;
  const disabled = c.busy;
  const editDisabled = disabled || c.drafting;
  return (
    <div className="border-rule flex min-w-0 flex-col gap-3 border-y-2 py-3">
      <div className="flex min-w-0 flex-wrap items-end gap-2">
        <Button
          id={narrow ? undefined : "folio-open-pages"}
          className={narrow ? "hidden" : undefined}
          isDisabled={c.busy || (c.drafting && panel !== "pages")}
          intent="outline"
          onPress={() => openPanel("pages")}
          aria-expanded={panel === "pages"}
        >
          <HiQueueList data-slot="icon" />
          {t("folioPages")}
        </Button>
        <Button
          intent="plain"
          className={narrow ? "hidden" : undefined}
          onPress={() => openPanel("outline")}
          aria-expanded={panel === "outline"}
        >
          {t("folioOutline")}
        </Button>
        <Button
          intent="outline"
          isDisabled={current?.index === 0 || disabled}
          onPress={() => navigate(current?.index ?? 0)}
          aria-label={t("folioPreviousPage")}
        >
          {narrow ? <HiChevronLeft data-slot="icon" /> : t("folioPreviousPage")}
        </Button>
        <div className={narrow ? "w-18" : "w-28"}>
          <FolioField
            id="folio-page-input"
            label={t("folioGoPage")}
            type="number"
            min={1}
            max={pages.length}
            value={pageNumber}
            onChange={setPageNumber}
            onBlur={() => navigate(Number(pageNumber))}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                navigate(Number(pageNumber));
              }
            }}
          />
        </div>
        <Button
          intent="outline"
          isDisabled={current?.index === pages.length - 1 || disabled}
          onPress={() => navigate((current?.index ?? 0) + 2)}
          aria-label={t("folioNextPage")}
        >
          {narrow ? <HiChevronRight data-slot="icon" /> : t("folioNextPage")}
        </Button>
        <div className={narrow ? "w-32" : "w-40"}>
          <FolioSelect
            label={t("folioZoom")}
            id="folio-zoom"
            value={String(zoom)}
            onChange={(value) =>
              setZoom(
                value === "width" || value === "page" ? value : Number(value)
              )
            }
          >
            <option value="width">{t("folioFitWidth")}</option>
            <option value="page">{t("folioFitPage")}</option>
            {[0.5, 0.75, 1, 1.25, 1.5, 2, 3].map((value) => (
              <option key={value} value={value}>
                {value * 100}%
              </option>
            ))}
          </FolioSelect>
        </div>
        <form
          className="flex min-w-0 flex-1 basis-full flex-wrap items-end gap-2 lg:basis-64"
          onSubmit={(event) => {
            event.preventDefault();
            find("next");
          }}
        >
          <div className="min-w-40 flex-1">
            <FolioField
              id="folio-search"
              label={t("folioSearch")}
              type="search"
              value={query}
              onChange={setQuery}
            />
          </div>
          <Button type="submit" intent="outline" isDisabled={disabled}>
            <HiMagnifyingGlass data-slot="icon" />
            {t("folioSearch")}
          </Button>
        </form>
        <Button
          intent="plain"
          className={narrow ? "hidden" : undefined}
          isDisabled={disabled || !query}
          onPress={() => find("previous")}
        >
          {t("folioFindPrevious")}
        </Button>
        <Button
          intent="plain"
          className={narrow ? "hidden" : undefined}
          isDisabled={disabled || !query}
          onPress={() => find("next")}
        >
          {t("folioFindNext")}
        </Button>
      </div>
      {searchNotice ? (
        <output className="num text-sm">{searchNotice}</output>
      ) : null}
      <div className="flex min-w-0 flex-wrap items-center gap-2">
        {narrow ? (
          <Button
            id="folio-open-pages"
            intent="outline"
            isDisabled={c.busy || (c.drafting && panel !== "pages")}
            onPress={() => openPanel("pages")}
            aria-expanded={panel === "pages"}
          >
            <HiQueueList data-slot="icon" />
            {t("folioPages")}
          </Button>
        ) : null}
        <Menu>
          <Button
            intent="outline"
            isDisabled={editDisabled || !c.permissions.annotate}
          >
            {tool === "select" ? t("folioSelectTool") : t(annotationKeys[tool])}
          </Button>
          <MenuContent
            className="[&_button]:min-h-11"
            aria-label={t("folioAnnotationList")}
            onAction={(key) => {
              if (
                key === "select" ||
                key === "Highlight" ||
                key === "Note" ||
                key === "Ink" ||
                key === "AddedText"
              ) {
                chooseTool(key);
              }
            }}
          >
            <MenuItem id="select">
              <MenuLabel>{t("folioSelectTool")}</MenuLabel>
            </MenuItem>
            {(["Highlight", "Note", "Ink", "AddedText"] as const).map(
              (kind) => (
                <MenuItem key={kind} id={kind}>
                  <MenuLabel>{t(annotationKeys[kind])}</MenuLabel>
                </MenuItem>
              )
            )}
          </MenuContent>
        </Menu>
        <Button
          intent="outline"
          isDisabled={editDisabled || !c.permissions.annotate}
          className={narrow ? "hidden" : undefined}
          onPress={() => chooseTool("Highlight")}
        >
          {t("folioHighlight")}
        </Button>
        <Button
          id="folio-open-annotations"
          className={narrow ? "hidden" : undefined}
          isDisabled={c.busy || (c.drafting && panel !== "annotations")}
          intent="outline"
          onPress={() => openPanel("annotations")}
          aria-expanded={panel === "annotations"}
        >
          {t("folioAnnotationList")}
        </Button>
        <Button
          id="folio-open-forms"
          className={narrow ? "hidden" : undefined}
          isDisabled={c.busy || (c.drafting && panel !== "forms")}
          intent="outline"
          onPress={() => openPanel("forms")}
          aria-expanded={panel === "forms"}
        >
          {t("folioFormFields")}
        </Button>
        {narrow ? (
          <FolioMoreMenu
            c={c}
            panel={panel}
            openPanel={openPanel}
            find={find}
            query={query}
          />
        ) : null}
        <span
          className={`num text-muted-fg px-2 text-xs ${narrow ? "hidden" : ""}`}
        >
          {t("folioSelected", { count: String(c.selected.length) })}
        </span>
        <div className="ml-auto flex flex-wrap gap-2">
          <Button
            id="folio-undo"
            className={narrow ? "hidden" : undefined}
            intent="plain"
            isDisabled={editDisabled || !snapshot.history.canUndo}
            onPress={() => {
              void c.undoRedo("undo");
            }}
          >
            <HiArrowUturnLeft data-slot="icon" />
            {t("folioUndo")}
          </Button>
          <Button
            id="folio-redo"
            className={narrow ? "hidden" : undefined}
            intent="plain"
            isDisabled={editDisabled || !snapshot.history.canRedo}
            onPress={() => {
              void c.undoRedo("redo");
            }}
          >
            <HiArrowUturnRight data-slot="icon" />
            {t("folioRedo")}
          </Button>
          <Button
            id="folio-download"
            isDisabled={editDisabled || !c.permissions.download}
            onPress={() => review({ _tag: "Full" })}
          >
            <HiArrowDownTray data-slot="icon" />
            {t("folioDownload")}
          </Button>
        </div>
      </div>
    </div>
  );
};
