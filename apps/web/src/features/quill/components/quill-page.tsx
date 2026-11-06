/* oxlint-disable eslint/complexity, react-doctor/no-giant-component -- This page coordinates the Library, document modes, recovery, and inline panels. */
/* oxlint-disable react/exhaustive-effect-dependencies -- Source changes reset the debounce even when the dirty flag stays set. */
import { useAtomMount, useAtomSet, useAtomValue } from "@effect/atom-react";
import { useBlocker } from "@tanstack/react-router";
import { Schema } from "effect";
import { useEffect, useRef, useState } from "react";
import type { IconType } from "react-icons";
import {
  HiBookOpen,
  HiCodeBracket,
  HiArrowUturnLeft,
  HiArrowUturnRight,
  HiViewColumns,
} from "react-icons/hi2";

import { LazyLibrary } from "@/core/components/lazy-library";
import { Button } from "@/core/components/ui/button";
import { Container } from "@/core/components/ui/container";
import {
  ModalContent,
  ModalFooter,
  ModalHeader,
} from "@/core/components/ui/modal";
import { Note } from "@/core/components/ui/note";
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@/core/components/ui/toggle-group";
import { Toolbar } from "@/core/components/ui/toolbar";
import { Tooltip, TooltipContent } from "@/core/components/ui/tooltip";
import { download } from "@/core/libs/files";
import { useTranslation } from "@/features/i18n/use-translation";

import type * as T from "../quill";
import { quillAtoms as atoms } from "../quill.atoms";
import type { Command } from "../quill.atoms";
import { reorderTabs } from "../quill.tabs";
import { QuillExplainer } from "./quill-explainer";
import { QuillLibrary } from "./quill-library";
import type { LibraryAction, LibraryNaming } from "./quill-library";
import { QuillPane } from "./quill-pane";
import { QuillTabs } from "./quill-tabs";

import "./quill.css";

const loadSource = () => import("./quill-source");
const loadReader = () => import("./quill-reader");
const failureKeys = {
  storage: "quillErrorStorage",
  migration: "quillErrorMigration",
  unreadable: "quillErrorUnreadable",
  invalid: "quillErrorInvalid",
  conflict: "quillConflict",
  conversion: "quillErrorConversion",
  offline: "quillErrorOffline",
  resource: "quillErrorResource",
  export: "quillErrorExport",
} as const;
const saveKeys = {
  dirty: "quillDirty",
  saving: "quillSaving",
  failed: "quillSaveFailed",
  conflict: "quillSaveFailed",
} as const;
const linkFailureKeys = {
  invalid: "quillInvalidLink",
  "outside-root": "quillLinkOutsideRoot",
  missing: "quillMissingLink",
  folder: "quillLinkFolder",
  open: "quillLinkOpenFailed",
} as const;
const modes: readonly (readonly [
  T.Mode,
  "quillSplit" | "quillSource" | "quillRead",
  IconType,
])[] = [
  ["split", "quillSplit", HiViewColumns],
  ["source", "quillSource", HiCodeBracket],
  ["read", "quillRead", HiBookOpen],
];
const isMode = (key: unknown): key is T.Mode =>
  modes.some(([mode]) => mode === key);
const saveOutput = (file: T.Output) =>
  download(
    new Blob([Uint8Array.from(file.bytes)], { type: file.mime }),
    file.name
  );
const focusEditor = () =>
  requestAnimationFrame(() =>
    document
      .querySelector<HTMLElement>(
        '[aria-label="Markdown editor"],.quill-source [contenteditable=true],#quill-actions'
      )
      ?.focus()
  );
export const QuillPage = () => {
  const { t } = useTranslation();
  useAtomMount(atoms.runtime);
  const view = useAtomValue(atoms.view);
  const failure = useAtomValue(atoms.failure);
  const linkFailure = useAtomValue(atoms.linkFailure);
  const busy = useAtomValue(atoms.busy);
  const imports = useAtomValue(atoms.imports);
  const command = useAtomSet(atoms.command, { mode: "promise" });
  const output = useAtomSet(atoms.output, { mode: "promise" });
  const conversion = useAtomSet(atoms.conversion, { mode: "promise" });
  const files = useRef<HTMLInputElement>(null);
  const folderFiles = useRef<HTMLInputElement>(null);
  const backupFiles = useRef<HTMLInputElement>(null);
  const [openIds, setOpenIds] = useState<readonly string[]>([]);
  const [picked, setPicked] = useState<string | null>(null);
  const [showLibrary, setShowLibrary] = useState(true);
  const [naming, setNaming] = useState<LibraryNaming | null>(null);
  const [remove, setRemove] = useState<
    { readonly id: string } | { readonly all: true } | null
  >(null);
  const [plan, setPlan] = useState<
    (T.Compatibility & { readonly id: string; readonly source: string }) | null
  >(null);
  const current = useRef(view);
  useEffect(() => {
    const id = view.document?.id;
    // The service can open files through imports, links, and recovery as well as tab presses.
    if (id) {
      // oxlint-disable-next-line react/set-state-in-effect -- Synchronize tabs with the external document session.
      setOpenIds((ids) => (ids.includes(id) ? ids : [...ids, id]));
    }
  }, [view.document?.id]);
  useEffect(() => {
    current.current = view;
  }, [view]);
  const run = async (input: Command) => {
    try {
      return await command(input);
    } catch {
      return false;
    }
  };
  const blocker = useBlocker({
    shouldBlockFn: async () => {
      if (current.current.save === "saved") {
        return false;
      }
      return !(await run({ type: "save" }));
    },
    enableBeforeUnload: view.save !== "saved",
    withResolver: true,
  });
  useEffect(() => {
    void command({ type: "initialize" });
  }, [command]);
  useEffect(() => {
    if (view.save !== "dirty") {
      return;
    }
    const timer = setTimeout(() => {
      void command({ type: "save" });
    }, 650);
    return () => clearTimeout(timer);
  }, [view.document?.source, view.save, command]);
  useEffect(() => {
    const hidden = () => {
      if (
        document.visibilityState === "hidden" &&
        current.current.save !== "saved"
      ) {
        void command({ type: "save" });
      }
    };
    document.addEventListener("visibilitychange", hidden);
    return () => document.removeEventListener("visibilitychange", hidden);
  }, [command]);
  const item = view.entries.find(
    (entry) => entry.id === (picked ?? view.document?.id) && !entry.trash
  );
  const parent = item?.kind === "folder" ? item.id : (item?.parent ?? null);
  const startRename = (target: T.Entry | null | undefined = item) => {
    if (!target) {
      return;
    }
    setShowLibrary(true);
    setPicked(target.id);
    setNaming({ id: target.id });
  };
  const createEntry = async (
    kind: "document" | "folder",
    entry: T.Entry | null
  ) => {
    const folder =
      entry?.kind === "folder" ? entry.id : (entry?.parent ?? null);
    const created = Schema.decodeUnknownExit(Schema.String)(
      await run({
        type: "create",
        kind,
        name: kind === "document" ? "Untitled.md" : "Untitled",
        parent: folder,
      })
    );
    if (created._tag === "Failure") {
      return;
    }
    const id = created.value;
    setPicked(kind === "folder" ? id : null);
    setNaming({
      id,
      placement: { id, anchor: entry?.id ?? null, parent: folder },
    });
  };
  const commitName = async (id: string, draft: string) => {
    const entry = view.entries.find((candidate) => candidate.id === id);
    if (!entry) {
      setNaming(null);
      return true;
    }
    const trimmed = draft.trim();
    const next =
      trimmed.length === 0
        ? entry.name
        : entry.kind === "document" && !/\.(?:md|markdown)$/iu.test(trimmed)
          ? `${trimmed}.md`
          : trimmed;
    if (next === entry.name) {
      setNaming(null);
      return true;
    }
    const ok = await run({ type: "rename", id, name: next });
    if (ok) {
      setNaming(null);
    }
    return !!ok;
  };
  const receive = (incoming: readonly File[]) => {
    void run({ type: "import", files: incoming, parent });
  };
  const immediate = async (request: Parameters<typeof output>[0]) => {
    const file = await output(request);
    if (file) {
      saveOutput(file);
    }
  };
  const openDocument = (id: string) => {
    setPicked(null);
    setPlan(null);
    void run({ type: "open", id });
  };
  const followLink = (href: string) => {
    setPicked(null);
    setPlan(null);
    return run({ type: "follow", href });
  };
  const closeDocuments = async (ids: readonly string[]) => {
    const closing = new Set(ids);
    const remaining = openIds.filter(
      (id) =>
        !closing.has(id) &&
        view.entries.some((entry) => entry.id === id && !entry.trash)
    );
    if (
      view.document &&
      closing.has(view.document.id) &&
      !(await run(
        remaining.length
          ? { type: "open", id: remaining.at(-1) ?? "" }
          : { type: "close" }
      ))
    ) {
      return;
    }
    setOpenIds(remaining);
    if (view.document && closing.has(view.document.id)) {
      setPicked(null);
      focusEditor();
    }
  };
  const libraryAction = async (
    action: LibraryAction,
    entry: T.Entry | null
  ) => {
    if (action === "document" || action === "folder") {
      await createEntry(action, entry);
      return;
    }
    if (action === "rename") {
      startRename(entry);
      return;
    }
    if (!entry) {
      return;
    }
    if (action === "download") {
      if (entry.kind === "folder") {
        await immediate({ archive: true, folder: entry.id, backup: false });
      } else if (await run({ type: "open", id: entry.id })) {
        setPicked(null);
        await immediate({ markdown: true });
      }
    } else {
      setPicked(null);
      await run({ type: action, id: entry.id });
    }
  };
  const openEntries = openIds.flatMap((id) => {
    const entry = view.entries.find(
      (candidate) => candidate.id === id && !candidate.trash
    );
    return entry ? [entry] : [];
  });
  const lines = view.document?.source.split(/\r\n|\r|\n/u).length ?? 0;
  const documentActions = (
    <div className="quill-document-actions">
      <Tooltip delay={300}>
        <Button
          aria-label={t("quillUndo")}
          size="sq-sm"
          intent="outline"
          isDisabled={!view.canUndo || busy}
          onPress={() => run({ type: "history", direction: "undo" })}
        >
          <HiArrowUturnLeft aria-hidden="true" />
        </Button>
        <TooltipContent>{t("quillUndo")}</TooltipContent>
      </Tooltip>
      <Tooltip delay={300}>
        <Button
          aria-label={t("quillRedo")}
          size="sq-sm"
          intent="outline"
          isDisabled={!view.canRedo || busy}
          onPress={() => run({ type: "history", direction: "redo" })}
        >
          <HiArrowUturnRight aria-hidden="true" />
        </Button>
        <TooltipContent>{t("quillRedo")}</TooltipContent>
      </Tooltip>
      <ToggleGroup
        aria-label={t("quillModes")}
        size="sq-sm"
        disallowEmptySelection
        isDisabled={busy}
        selectedKeys={[view.mode]}
        onSelectionChange={(keys) => {
          const [mode] = keys;
          if (isMode(mode) && mode !== view.mode) {
            void run({ type: "mode", mode });
          }
        }}
      >
        {modes.map(([mode, key, Icon]) => (
          <Tooltip delay={300} key={mode}>
            <ToggleGroupItem id={mode} aria-label={t(key)}>
              <Icon aria-hidden="true" />
            </ToggleGroupItem>
            <TooltipContent>{t(key)}</TooltipContent>
          </Tooltip>
        ))}
      </ToggleGroup>
    </div>
  );
  return (
    <Container className="quill-page max-w-none min-w-0 py-10">
      <input
        ref={files}
        type="file"
        accept=".md,.markdown"
        multiple
        hidden
        aria-label={t("quillImport")}
        onChange={(event) => {
          receive([...(event.target.files ?? [])]);
          event.target.value = "";
        }}
      />
      <input
        ref={folderFiles}
        type="file"
        multiple
        hidden
        {...{ webkitdirectory: "" }}
        aria-label={t("quillImportFolder")}
        onChange={(event) => {
          receive(
            [...(event.target.files ?? [])].filter((file) =>
              /\.(?:md|markdown)$/iu.test(file.name)
            )
          );
          event.target.value = "";
        }}
      />
      <input
        ref={backupFiles}
        type="file"
        accept=".zip"
        hidden
        aria-label={t("quillRestoreBackup")}
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) {
            void run({ type: "restore-backup", file });
          }
          event.target.value = "";
        }}
      />
      {failure ? (
        <Note intent="danger" role="alert">
          <p>
            {t(
              linkFailure
                ? linkFailureKeys[linkFailure.reason]
                : failureKeys[failure]
            )}
          </p>
          {linkFailure ? (
            <p>
              <code>{linkFailure.href}</code>
            </p>
          ) : null}
          {linkFailure?.reason === "open" ? (
            <p>{t(failureKeys[failure])}</p>
          ) : null}
          <div className="mt-3 flex flex-wrap gap-2">
            <Button
              size="sm"
              intent="outline"
              onPress={() =>
                run(
                  linkFailure
                    ? { type: "follow", href: linkFailure.href }
                    : { type: view.document ? "save" : "initialize" }
                )
              }
            >
              {t("quillRetry")}
            </Button>
            {view.document ? (
              <>
                <Button
                  size="sm"
                  intent="outline"
                  onPress={() => immediate({ markdown: true })}
                >
                  {t("quillDownloadMarkdown")}
                </Button>
                {failure === "conversion" ? (
                  <Button
                    size="sm"
                    intent="outline"
                    onPress={async () => setPlan(await conversion(null))}
                  >
                    {t("quillPlanConversion")}
                  </Button>
                ) : null}
                {view.save === "conflict" ? (
                  <Button size="sm" onPress={() => run({ type: "save-copy" })}>
                    {t("quillSaveCopy")}
                  </Button>
                ) : null}
              </>
            ) : null}
            <Button
              size="sm"
              intent="outline"
              onPress={() => immediate({ raw: true })}
            >
              {t("quillRawRecovery")}
            </Button>
          </div>
        </Note>
      ) : null}
      {imports.length ? (
        <Note intent="warning">
          <h3 className="font-bold">{t("quillImportFailures")}</h3>
          <ul>
            {imports.map((file) => (
              <li key={`${file.path}:${file.reason}`}>
                {file.path}: {t(failureKeys[file.reason])}
              </li>
            ))}
          </ul>
        </Note>
      ) : null}
      {view.unreadable ? (
        <Note intent="warning">
          <p>{t("quillUnreadable")}</p>
          <Button
            className="mt-3"
            intent="outline"
            size="sm"
            onPress={() => immediate({ raw: true })}
          >
            {t("quillRawRecovery")}
          </Button>
        </Note>
      ) : null}
      <div className="quill-editor-shell">
        <div
          className={`quill-workbench${
            showLibrary ? "" : " quill-workbench-library-collapsed"
          }`}
        >
          <aside id="quill-explorer" className="quill-explorer">
            <QuillLibrary
              entries={view.entries}
              selected={picked ?? view.document?.id ?? null}
              busy={busy}
              onAction={libraryAction}
              onImport={() => files.current?.click()}
              onImportFolder={() => folderFiles.current?.click()}
              onExportLibrary={() =>
                immediate({ archive: true, folder: null, backup: false })
              }
              onDownloadBackup={() =>
                immediate({ archive: true, folder: null, backup: true })
              }
              onRestoreBackup={() => backupFiles.current?.click()}
              onSelect={(entry) => {
                setPicked(entry.kind === "document" ? null : entry.id);
                if (entry.kind === "document") {
                  setPlan(null);
                  void run({ type: "open", id: entry.id });
                }
              }}
              onMove={(id, folder) => run({ type: "move", id, parent: folder })}
              onRestore={(id) => run({ type: "restore", id })}
              onRemove={(id) => setRemove({ id })}
              onRestoreAll={() => run({ type: "restore-all" })}
              onRemoveAll={() => setRemove({ all: true })}
              naming={naming}
              onName={commitName}
              onNameCancel={() => setNaming(null)}
            />
          </aside>
          <section className="quill-document" aria-label={t("quillEditor")}>
            <QuillTabs
              entries={openEntries}
              selected={view.document?.id ?? null}
              busy={busy}
              showLibrary={showLibrary}
              onToggleLibrary={() => setShowLibrary((shown) => !shown)}
              onOpen={openDocument}
              onClose={closeDocuments}
              onReorder={(id, target) =>
                setOpenIds((ids) => reorderTabs(ids, id, target))
              }
            />
            {view.document ? (
              <>
                <h3 className="sr-only">{view.document.name}</h3>
                <div
                  className={`quill-panes${view.mode === "split" ? " quill-panes-split" : ""}`}
                >
                  {view.mode === "read" ? (
                    <Toolbar
                      aria-label={t("quillModes")}
                      className="quill-source-toolbar"
                    >
                      {documentActions}
                    </Toolbar>
                  ) : null}
                  <QuillPane visible={view.mode !== "read"}>
                    <LazyLibrary
                      name="CodeMirror"
                      load={loadSource}
                      componentProps={{
                        toolbarActions: documentActions,
                        source: view.document.source,
                        onChange: (source: string) =>
                          run({
                            type: "edit",
                            source,
                            id: view.document?.id ?? "",
                          }),
                        onHistory: (direction: "undo" | "redo") =>
                          run({ type: "history", direction }),
                      }}
                    />
                  </QuillPane>
                  <QuillPane visible={view.mode !== "source"}>
                    <LazyLibrary
                      name="Markdown reader"
                      load={loadReader}
                      componentProps={{
                        documentId: view.document.id,
                        source: view.document.source,
                        onFollow: followLink,
                      }}
                    />
                  </QuillPane>
                </div>
              </>
            ) : (
              <div className="flex min-h-96 flex-1 flex-col items-center justify-center gap-4 p-6 text-center sm:p-10">
                <h3 className="font-display text-3xl font-black uppercase">
                  {t("quillEmptyTitle")}
                </h3>
                <p className="text-muted-fg w-full">{t("quillEmptyBody")}</p>
              </div>
            )}
          </section>
        </div>
        <footer className="quill-statusbar">
          <div className="quill-status-metrics">
            <span>
              <span className="num">{lines}</span>{" "}
              {t("quillLines", { count: lines })}{" "}
              <span aria-hidden="true">·</span>{" "}
              <span className="num">{view.document?.source.length ?? 0}</span>{" "}
              {t("quillCharacters")}
            </span>
            <output aria-live="polite">
              {view.document && view.save !== "saved"
                ? t(saveKeys[view.save])
                : null}
            </output>
          </div>
        </footer>
      </div>
      {plan ? (
        <section
          aria-label={t("quillConversionTitle")}
          className="border-rule flex flex-col gap-4 border-2 p-4"
        >
          <h3 className="font-bold">{t("quillConversionTitle")}</h3>
          <p className="text-sm">{t("quillConversionBody")}</p>
          <pre className="max-h-72 overflow-auto font-mono text-sm break-words whitespace-pre-wrap">
            {plan.affected.join("\n\n")}
          </pre>
          <div className="flex flex-wrap gap-2">
            <Button
              isDisabled={!plan.converted || busy}
              onPress={async () => {
                if (await run({ type: "convert", plan })) {
                  setPlan(null);
                  focusEditor();
                }
              }}
            >
              {t("quillConvert")}
            </Button>
            <Button
              intent="outline"
              onPress={() => {
                setPlan(null);
                focusEditor();
              }}
            >
              {t("quillCancel")}
            </Button>
          </div>
        </section>
      ) : null}
      {view.document?.copies.length ? (
        <details className="border-rule border-2 p-3">
          <summary className="cursor-pointer font-bold">
            {t("quillRecovery")}
          </summary>
          <ul className="mt-3 flex flex-col gap-2">
            {view.document.copies.map((copy, index) => (
              <li key={`${copy.at}:${copy.source}`}>
                <Button
                  size="sm"
                  intent="outline"
                  onPress={() => immediate({ recovery: index })}
                >
                  {t("quillRecoveryDownload")}{" "}
                  <span className="num">{index + 1}</span>
                </Button>
              </li>
            ))}
          </ul>
        </details>
      ) : null}
      <div className="pt-6">
        <QuillExplainer />
      </div>
      {remove ? (
        <ModalContent
          isOpen
          role="alertdialog"
          aria-label={t(
            "all" in remove ? "quillConfirmRemoveAll" : "quillConfirmRemove"
          )}
          size="sm"
          closeButton={false}
        >
          <ModalHeader
            title={t(
              "all" in remove ? "quillConfirmRemoveAll" : "quillConfirmRemove"
            )}
          />
          <ModalFooter>
            <Button
              autoFocus
              intent="outline"
              isDisabled={busy}
              onPress={() => {
                setRemove(null);
                focusEditor();
              }}
            >
              {t("quillCancel")}
            </Button>
            <Button
              intent="danger"
              isDisabled={busy}
              onPress={async () => {
                if (
                  await run(
                    "all" in remove
                      ? { type: "remove-all", confirmed: true }
                      : { type: "remove", id: remove.id, confirmed: true }
                  )
                ) {
                  setRemove(null);
                  focusEditor();
                }
              }}
            >
              {t("quillConfirm")}
            </Button>
          </ModalFooter>
        </ModalContent>
      ) : null}
      {blocker.status === "blocked" ? (
        <ModalContent
          isOpen
          role="alertdialog"
          aria-label={t("quillLeaveTitle")}
          size="sm"
          closeButton={false}
        >
          <ModalHeader title={t("quillLeaveTitle")} />
          <ModalFooter>
            <Button autoFocus intent="outline" onPress={() => blocker.reset()}>
              {t("quillStay")}
            </Button>
            <Button intent="danger" onPress={() => blocker.proceed()}>
              {t("quillLeave")}
            </Button>
          </ModalFooter>
        </ModalContent>
      ) : null}
    </Container>
  );
};
