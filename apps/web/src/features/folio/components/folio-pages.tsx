/* oxlint-disable react/todo -- Every transferred thumbnail bitmap must close in finally. */
/* oxlint-disable react/exhaustive-effect-dependencies -- The revision invalidates the thumbnail read owned by the engine atom. */
/* oxlint-disable eslint/complexity -- The page panel exposes the approved selection, order, rotation, deletion, import, and extraction actions. */
/* oxlint-disable eslint/no-await-in-loop, react-doctor/async-await-in-loop -- Source inspection uses one request atom and must retain the displayed source order. */
/* oxlint-disable promise/prefer-await-to-then -- Effect cleanup cannot return a promise; the route finalizer also releases sources. */
/* oxlint-disable react-doctor/js-combine-iterations -- Page actions project source order and keep the explicit selection separate. */
import { useEffect, useEffectEvent, useRef, useState } from "react";

import { Button } from "@/core/components/ui/button";
import {
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
} from "@/core/components/ui/modal";
import { Note } from "@/core/components/ui/note";
import { useTranslation } from "@/features/i18n/use-translation";

import * as F from "../folio";
import { focusElement, readFile } from "../folio.browser";
import { movePages, parsePages, reasonKeys, runLocal } from "../folio.ui";
import type { Reply } from "../folio.ui";
import type { FolioController } from "../use-folio";
import { FolioField, FolioSelect } from "./folio-controls";

const Thumbnail = ({
  controller: c,
  page,
}: {
  readonly controller: FolioController;
  readonly page: F.Page;
}) => {
  const canvas = useRef<HTMLCanvasElement>(null);
  const revision = c.snapshot?.revision;
  const { thumbnail } = c;
  useEffect(() => {
    let disposed = false;
    const node = canvas.current;
    const load = async () => {
      try {
        const result = await thumbnail({ page: page.id, maxWidth: 100 });
        try {
          if (!disposed && node && result.bitmap) {
            node.width = result.rendered.width;
            node.height = result.rendered.height;
            node.getContext("2d")?.drawImage(result.bitmap, 0, 0);
          }
        } finally {
          result.bitmap?.close();
        }
      } catch {
        /* Full-page rendering exposes any session failure with a recovery. */
      }
    };
    void load();
    return () => {
      disposed = true;
      if (node) {
        node.width = 0;
        node.height = 0;
      }
    };
  }, [thumbnail, page.id, revision]);
  return (
    <canvas ref={canvas} aria-hidden className="max-h-28 max-w-20 bg-white" />
  );
};

export const FolioPages = ({
  controller: c,
  onImport,
  onExtract,
}: {
  readonly controller: FolioController;
  readonly onImport: () => void;
  readonly onExtract: () => void;
}) => {
  const { t } = useTranslation();
  const [start, setStart] = useState(0);
  const [target, setTarget] = useState("");
  const [deleting, setDeleting] = useState(false);
  const pages = c.snapshot?.pages ?? [];
  const selected = new Set(c.selected);
  const locked = c.busy || c.drafting;
  const permitted = Boolean(c.permissions.changePages);
  const move = (direction: "up" | "down") => {
    const order = movePages(
      pages.map((p) => p.id),
      c.selected,
      direction
    );
    if (order.some((id, i) => id !== pages[i]?.id)) {
      void c.apply({ _tag: "ReorderPages", order });
    }
  };
  const moveTo = (after: boolean) => {
    const remaining = pages.map((p) => p.id).filter((id) => !selected.has(id));
    const at = remaining.indexOf(F.PageId.make(target));
    if (at === -1) {
      return;
    }
    remaining.splice(
      at + (after ? 1 : 0),
      0,
      ...pages.filter((p) => selected.has(p.id)).map((p) => p.id)
    );
    void c.apply({ _tag: "ReorderPages", order: remaining });
  };
  return (
    <div className="flex min-w-0 flex-col gap-4">
      <h3 className="font-bold">{t("folioPages")}</h3>
      <p className="num text-sm">
        {t("folioSelected", { count: String(c.selected.length) })}
      </p>
      <div className="flex flex-wrap gap-2">
        <Button
          intent="outline"
          isDisabled={locked}
          onPress={() => c.setSelected(pages.map((p) => p.id))}
        >
          {t("folioSelectAll")}
        </Button>
        <Button
          intent="plain"
          isDisabled={locked}
          onPress={() => c.setSelected([])}
        >
          {t("folioClearSelection")}
        </Button>
      </div>
      <ol className="flex flex-col gap-3">
        {pages.slice(start, start + 12).map((page) => (
          <li
            key={page.id}
            className={`border-input flex items-center gap-3 border-b-2 py-3 ${selected.has(page.id) ? "border-b-primary" : ""}`}
          >
            <label className="flex min-h-11 min-w-11 items-center justify-center">
              <input
                type="checkbox"
                className="accent-primary size-6"
                checked={selected.has(page.id)}
                aria-label={t("folioSelectPage", {
                  page: String(page.index + 1),
                })}
                disabled={locked}
                onChange={(event) =>
                  c.setSelected(
                    event.target.checked
                      ? [...c.selected, page.id]
                      : c.selected.filter((id) => id !== page.id)
                  )
                }
              />
            </label>
            <Button
              intent="plain"
              className="h-auto min-h-11 flex-1 flex-col gap-2 p-2"
              aria-current={c.currentPage === page.id ? "page" : undefined}
              onPress={() => c.setCurrentPage(page.id)}
            >
              <Thumbnail controller={c} page={page} />
              <span className="num">{page.label || page.index + 1}</span>
            </Button>
          </li>
        ))}
      </ol>
      {pages.length > 12 ? (
        <div className="flex flex-wrap gap-2">
          <Button
            intent="outline"
            isDisabled={start === 0}
            onPress={() => setStart((n) => Math.max(0, n - 12))}
          >
            {t("folioPreviousPage")}
          </Button>
          <Button
            intent="outline"
            isDisabled={start + 12 >= pages.length}
            onPress={() => setStart((n) => n + 12)}
          >
            {t("folioNextPage")}
          </Button>
        </div>
      ) : null}
      <fieldset className="border-rule flex flex-col gap-3 border-t-2 pt-4">
        <legend className="pt-4 font-bold">{t("folioPageActions")}</legend>
        <p className="text-muted-fg text-xs/5">
          {t("folioSelectedScope", { count: String(c.selected.length) })}
        </p>
        <div className="flex flex-wrap gap-2">
          <Button
            intent="outline"
            isDisabled={locked || !permitted || !selected.size}
            onPress={() => move("up")}
          >
            {t("folioMoveUp")}
          </Button>
          <Button
            intent="outline"
            isDisabled={locked || !permitted || !selected.size}
            onPress={() => move("down")}
          >
            {t("folioMoveDown")}
          </Button>
          <Button
            intent="outline"
            isDisabled={locked || !permitted || !selected.size}
            onPress={() => {
              void c.apply({
                _tag: "RotatePages",
                pages: c.selected,
                clockwise: 90,
              });
            }}
          >
            {t("folioRotate")}
          </Button>
        </div>
        <FolioSelect
          label={t("folioTargetPage")}
          id="folio-move-target"
          value={target}
          onChange={setTarget}
          disabled={locked}
        >
          <option value="">{t("folioChooseOption")}</option>
          {pages
            .filter((p) => !selected.has(p.id))
            .map((page) => (
              <option key={page.id} value={page.id}>
                {page.index + 1}
              </option>
            ))}
        </FolioSelect>
        <div className="flex flex-wrap gap-2">
          <Button
            intent="outline"
            isDisabled={locked || !permitted || !selected.size || !target}
            onPress={() => moveTo(false)}
          >
            {t("folioMoveBefore")}
          </Button>
          <Button
            intent="outline"
            isDisabled={locked || !permitted || !selected.size || !target}
            onPress={() => moveTo(true)}
          >
            {t("folioMoveAfter")}
          </Button>
        </div>
        <Button
          intent="danger"
          isDisabled={
            locked ||
            !permitted ||
            !selected.size ||
            selected.size === pages.length
          }
          onPress={() => setDeleting(true)}
        >
          {t("folioDeletePages")}
        </Button>
        {selected.size === pages.length ? (
          <p className="text-muted-fg text-xs">{t("folioLastPage")}</p>
        ) : null}
        <Button
          intent="outline"
          isDisabled={locked || !permitted}
          onPress={onImport}
        >
          {t("folioImport")}
        </Button>
        <Button
          intent="outline"
          isDisabled={locked || !c.permissions.extract || !selected.size}
          onPress={onExtract}
        >
          {t("folioExtract")}
        </Button>
      </fieldset>
      {deleting ? (
        <ModalContent
          className="[&_button]:min-h-11"
          isOpen
          role="alertdialog"
          aria-label={t("folioDeleteConfirm", { count: String(selected.size) })}
          onOpenChange={(open) => {
            if (!open) {
              setDeleting(false);
            }
          }}
        >
          <ModalHeader
            title={t("folioDeleteConfirm", { count: String(selected.size) })}
          />
          <ModalBody>
            <p>
              {t("folioDeletePreview", {
                pages: pages
                  .filter((p) => selected.has(p.id))
                  .map((p) => p.index + 1)
                  .join(", "),
              })}
            </p>
          </ModalBody>
          <ModalFooter>
            <Button
              autoFocus
              intent="outline"
              onPress={() => setDeleting(false)}
            >
              {t("folioCancel")}
            </Button>
            <Button
              intent="danger"
              isDisabled={locked || selected.size === pages.length}
              onPress={() => {
                void (async () => {
                  const result = await c.apply({
                    _tag: "DeletePages",
                    pages: c.selected,
                  });
                  if (result) {
                    setDeleting(false);
                    const next =
                      result.snapshot.pages.find(
                        (p) => p.id === c.currentPage
                      ) ?? result.snapshot.pages[0];
                    if (next) {
                      focusElement(`folio-page-${next.id}`);
                    }
                  }
                })();
              }}
            >
              {t("folioDeletePages")}
            </Button>
          </ModalFooter>
        </ModalContent>
      ) : null}
    </div>
  );
};

interface Source {
  readonly key: string;
  readonly file: File;
  readonly inspected: Reply<"SourceInspected"> | null;
  readonly range: string;
  readonly failed: boolean;
}
export const FolioImport = ({
  controller: c,
  initialFiles,
  onClose,
}: {
  readonly controller: FolioController;
  readonly initialFiles: readonly File[];
  readonly onClose: () => void;
}) => {
  const { t } = useTranslation();
  const [sources, setSources] = useState<readonly Source[]>([]);
  const [before, setBefore] = useState("");
  const input = useRef<HTMLInputElement>(null);
  const loaded = useRef(false);
  const live = useRef(true);
  const held = useRef(new Set<F.SourceId>());
  const add = async (files: readonly File[]) => {
    await c.run("folioChecking", async () => {
      // Inspection retains sources in the same order as the review list.
      for (const file of files) {
        const key = crypto.randomUUID();
        try {
          const inspected = await c.inspectSource(
            await runLocal(readFile(file))
          );
          if (!live.current) {
            await c.releaseSource({ source: inspected.source });
            return;
          }
          held.current.add(inspected.source);
          if (live.current) {
            setSources((previous) => [
              ...previous,
              {
                key,
                file,
                inspected,
                range: `1-${inspected.pages.length}`,
                failed: false,
              },
            ]);
          }
        } catch {
          if (live.current) {
            setSources((previous) => [
              ...previous,
              { key, file, inspected: null, range: "", failed: true },
            ]);
          }
        }
      }
    });
  };
  const addInitial = useEffectEvent(() => add(initialFiles));
  const { releaseSource } = c;
  useEffect(() => {
    const retained = held.current;
    live.current = true;
    if (!loaded.current) {
      loaded.current = true;
      void addInitial();
    }
    return () => {
      live.current = false;
      for (const source of retained) {
        void releaseSource({ source }).catch(() => {
          /* Session disposal releases all sources. */
        });
      }
      retained.clear();
    };
  }, [releaseSource]);
  const plans = sources.map((source) =>
    source.inspected ? parsePages(source.range, source.inspected.pages) : null
  );
  const count = plans.reduce((total, pages) => total + (pages?.length ?? 0), 0);
  const blocked =
    !sources.length ||
    sources.some(
      (source, i) =>
        source.failed || source.inspected?.blockers.length || !plans[i]?.length
    );
  const reorder = (index: number, delta: number) =>
    setSources((previous) => {
      const next = [...previous];
      const [item] = next.splice(index, 1);
      if (item) {
        next.splice(index + delta, 0, item);
      }
      return next;
    });
  return (
    <ModalContent
      className="[&_button]:min-h-11"
      isOpen
      size="lg"
      aria-label={t("folioImport")}
      onOpenChange={(open) => {
        if (!open && !c.busy) {
          onClose();
        }
      }}
    >
      <ModalHeader title={t("folioImport")} />
      <ModalBody>
        <div className="flex min-w-0 flex-col gap-4">
          <p className="text-sm/6">{t("folioSourceMetadata")}</p>
          <Button
            intent="outline"
            isDisabled={c.busy}
            onPress={() => input.current?.click()}
          >
            {t("folioAddSources")}
          </Button>
          <input
            ref={input}
            aria-label={t("folioAddSources")}
            type="file"
            accept="application/pdf,.pdf"
            multiple
            className="sr-only"
            tabIndex={-1}
            onChange={(event) => {
              void add([...(event.target.files ?? [])]);
              event.target.value = "";
            }}
          />
          <ol className="flex flex-col gap-5">
            {sources.map((source, i) => (
              <li
                key={source.key}
                className="border-input flex min-w-0 flex-col gap-3 border-b-2 pb-4"
              >
                <h3 className="font-bold [overflow-wrap:anywhere]">
                  {t("folioSource", {
                    index: String(i + 1),
                    name: source.file.name,
                  })}
                </h3>
                {source.failed ? (
                  <Note intent="danger">
                    <p>{t("folioSourceFailed")}</p>
                  </Note>
                ) : source.inspected ? (
                  <>
                    <p className="text-xs/5 [overflow-wrap:anywhere]">
                      {t("folioNamespace", {
                        prefix: source.inspected.namespace,
                      })}
                    </p>
                    {source.inspected.blockers.map((reason) => (
                      <Note key={reason} intent="warning">
                        <p>{t(reasonKeys[reason])}</p>
                      </Note>
                    ))}
                    <FolioField
                      label={t("folioSelectRange")}
                      value={source.range}
                      onChange={(range) =>
                        setSources((previous) =>
                          previous.map((item) =>
                            item.key === source.key ? { ...item, range } : item
                          )
                        )
                      }
                    />
                    {plans[i]?.length ? null : (
                      <p className="text-danger-subtle-fg text-sm" role="alert">
                        {t("folioInvalidRange")}
                      </p>
                    )}
                  </>
                ) : null}
                <div className="flex flex-wrap gap-2">
                  <Button
                    intent="outline"
                    isDisabled={c.busy || i === 0}
                    onPress={() => reorder(i, -1)}
                  >
                    {t("folioMoveUp")}
                  </Button>
                  <Button
                    intent="outline"
                    isDisabled={c.busy || i === sources.length - 1}
                    onPress={() => reorder(i, 1)}
                  >
                    {t("folioMoveDown")}
                  </Button>
                  <Button
                    intent="danger"
                    isDisabled={c.busy}
                    onPress={() => {
                      if (source.inspected) {
                        held.current.delete(source.inspected.source);
                        void c.releaseSource({
                          source: source.inspected.source,
                        });
                      }
                      setSources((previous) =>
                        previous.filter((item) => item.key !== source.key)
                      );
                    }}
                  >
                    {t("folioRemoveSource")}
                  </Button>
                </div>
              </li>
            ))}
          </ol>
          <FolioSelect
            label={t("folioInsertion")}
            id="folio-insert-before"
            value={before}
            onChange={setBefore}
          >
            <option value="">{t("folioAppend")}</option>
            {c.snapshot?.pages.map((page) => (
              <option key={page.id} value={page.id}>
                {page.index + 1}
              </option>
            ))}
          </FolioSelect>
          <p className="num text-sm">
            {t("folioImportResult", {
              count: String(count),
              total: String((c.snapshot?.pages.length ?? 0) + count),
            })}
          </p>
        </div>
      </ModalBody>
      <ModalFooter>
        <Button intent="plain" isDisabled={c.busy} onPress={onClose}>
          {t("folioCancel")}
        </Button>
        <Button
          isDisabled={c.busy || blocked}
          onPress={() => {
            void (async () => {
              const commandSources = sources.flatMap((source, i) =>
                source.inspected && plans[i]
                  ? [
                      {
                        source: source.inspected.source,
                        pages: plans[i],
                        fieldNamespace: source.inspected.namespace,
                      },
                    ]
                  : []
              );
              const result = await c.apply({
                _tag: "ImportPages",
                sources: commandSources,
                before: before ? F.PageId.make(before) : null,
              });
              if (result) {
                onClose();
                const [inserted] = result.invalidatedPages;
                if (inserted) {
                  focusElement(`folio-page-${inserted}`);
                }
              }
            })();
          }}
        >
          {t("folioImport")}
        </Button>
      </ModalFooter>
    </ModalContent>
  );
};
