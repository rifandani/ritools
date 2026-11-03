/* oxlint-disable eslint/complexity, react-doctor/no-giant-component -- This page coordinates the Library, document modes, recovery, and inline panels. */
/* oxlint-disable react/exhaustive-effect-dependencies -- Source changes reset the debounce even when the dirty flag stays set. */
import { useAtomMount, useAtomSet, useAtomValue } from "@effect/atom-react";
import { useBlocker } from "@tanstack/react-router";
import { Component, lazy, Suspense, useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import {
  HiArrowDownTray,
  HiEllipsisHorizontal,
  HiFolderPlus,
  HiPlus,
  HiArrowUturnLeft,
  HiArrowUturnRight,
} from "react-icons/hi2";

import { Button } from "@/core/components/ui/button";
import { Container } from "@/core/components/ui/container";
import { Menu, MenuContent, MenuItem } from "@/core/components/ui/menu";
import {
  ModalContent,
  ModalFooter,
  ModalHeader,
} from "@/core/components/ui/modal";
import { Note } from "@/core/components/ui/note";
import { download } from "@/core/libs/files";
import { useTranslation } from "@/features/i18n/use-translation";

import type * as T from "../quill";
import { quillAtoms as atoms } from "../quill.atoms";
import type { Command } from "../quill.atoms";
import { QuillExport } from "./quill-export";
import { QuillLibrary } from "./quill-library";

import "./quill.css";

const Visual = lazy(() => import("./quill-visual"));
const Source = lazy(() => import("./quill-source"));
const Reader = lazy(() => import("./quill-reader"));
class CapabilityBoundary extends Component<
  { readonly children: ReactNode; readonly fallback: ReactNode },
  { readonly failed: boolean }
> {
  constructor(props: {
    readonly children: ReactNode;
    readonly fallback: ReactNode;
  }) {
    super(props);
    this.state = { failed: false };
  }
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}
const failureKeys = {
  storage: "quillErrorStorage",
  migration: "quillErrorMigration",
  unreadable: "quillErrorUnreadable",
  invalid: "quillErrorInvalid",
  conflict: "quillConflict",
  conversion: "quillErrorConversion",
  unsupported: "quillErrorUnsupported",
  offline: "quillErrorOffline",
  resource: "quillErrorResource",
  export: "quillErrorExport",
} as const;
const saveKeys = {
  saved: "quillSaved",
  dirty: "quillDirty",
  saving: "quillSaving",
  failed: "quillSaveFailed",
  conflict: "quillSaveFailed",
} as const;
interface Form {
  readonly type: "document" | "folder" | "rename" | "move";
  readonly id: string | null;
}
const modes = [
  ["visual", "quillVisual"],
  ["source", "quillSource"],
  ["read", "quillRead"],
] as const;
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
  const busy = useAtomValue(atoms.busy);
  const imports = useAtomValue(atoms.imports);
  const command = useAtomSet(atoms.command, { mode: "promise" });
  const output = useAtomSet(atoms.output, { mode: "promise" });
  const conversion = useAtomSet(atoms.conversion, { mode: "promise" });
  const files = useRef<HTMLInputElement>(null);
  const folderFiles = useRef<HTMLInputElement>(null);
  const backupFiles = useRef<HTMLInputElement>(null);
  const [picked, setPicked] = useState<string | null>(null);
  const [showLibrary, setShowLibrary] = useState(true);
  const [form, setForm] = useState<Form | null>(null);
  const [name, setName] = useState("");
  const [destination, setDestination] = useState("");
  const [remove, setRemove] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [prepared, setPrepared] = useState<T.Output | null>(null);
  const [plan, setPlan] = useState<
    (T.Compatibility & { readonly id: string; readonly source: string }) | null
  >(null);
  const current = useRef(view);
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
  const startForm = (type: Form["type"]) => {
    setForm({ type, id: item?.id ?? null });
    setName(
      type === "rename"
        ? (item?.name ?? "")
        : type === "document"
          ? "Untitled.md"
          : ""
    );
    setDestination(type === "move" ? (item?.parent ?? "") : (parent ?? ""));
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
  const prepare = async (format: T.Format, paper: "A4" | "LETTER") => {
    const file = await output({ format, paper });
    if (file) {
      if (format === "md") {
        saveOutput(file);
      } else {
        setPrepared(file);
      }
    }
  };

  return (
    <Container className="quill-page flex flex-col gap-5 py-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-muted-fg max-w-prose text-sm">
            {t("quillPromise")}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            id="quill-new-document"
            isDisabled={busy}
            onPress={() => startForm("document")}
          >
            <HiPlus aria-hidden="true" />
            {t("quillNewDocument")}
          </Button>
          <Button
            intent="outline"
            isDisabled={busy}
            onPress={() => startForm("folder")}
          >
            <HiFolderPlus aria-hidden="true" />
            {t("quillNewFolder")}
          </Button>
          <Button
            intent="outline"
            isDisabled={busy}
            onPress={() => files.current?.click()}
          >
            {t("quillImport")}
          </Button>
          <Menu>
            <Button
              id="quill-actions"
              aria-label={t("quillItems")}
              intent="outline"
              size="sq-md"
            >
              <HiEllipsisHorizontal aria-hidden="true" />
            </Button>
            <MenuContent aria-label={t("quillItems")}>
              <MenuItem
                isDisabled={busy}
                onAction={() => folderFiles.current?.click()}
              >
                {t("quillImportFolder")}
              </MenuItem>
              <MenuItem
                isDisabled={busy || !item}
                onAction={() => startForm("rename")}
              >
                {t("quillRename")}
              </MenuItem>
              <MenuItem
                isDisabled={busy || !item}
                onAction={() => startForm("move")}
              >
                {t("quillMove")}
              </MenuItem>
              <MenuItem
                isDisabled={busy || item?.kind !== "document"}
                onAction={() => item && run({ type: "duplicate", id: item.id })}
              >
                {t("quillDuplicate")}
              </MenuItem>
              <MenuItem
                isDisabled={busy || !item}
                onAction={() => item && run({ type: "trash", id: item.id })}
              >
                {t("quillDelete")}
              </MenuItem>
              <MenuItem
                isDisabled={busy || item?.kind !== "folder"}
                onAction={() =>
                  immediate({
                    archive: true,
                    folder: item?.id ?? null,
                    backup: false,
                  })
                }
              >
                {t("quillFolderZip")}
              </MenuItem>
              <MenuItem
                isDisabled={busy}
                onAction={() =>
                  immediate({ archive: true, folder: null, backup: false })
                }
              >
                {t("quillZip")}
              </MenuItem>
              <MenuItem
                isDisabled={busy}
                onAction={() =>
                  immediate({ archive: true, folder: null, backup: true })
                }
              >
                {t("quillBackup")}
              </MenuItem>
              <MenuItem
                isDisabled={busy}
                onAction={() => backupFiles.current?.click()}
              >
                {t("quillRestoreBackup")}
              </MenuItem>
            </MenuContent>
          </Menu>
        </div>
      </div>
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
          receive([...(event.target.files ?? [])]);
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
      {form ? (
        <form
          className="border-rule flex flex-wrap items-end gap-3 border-2 p-4"
          onSubmit={async (event) => {
            event.preventDefault();
            let success = false;
            if (form.type === "move" && form.id) {
              success = await run({
                type: "move",
                id: form.id,
                parent: destination || null,
              });
            } else if (form.type === "rename" && form.id) {
              success = await run({ type: "rename", id: form.id, name });
            } else if (form.type === "document" || form.type === "folder") {
              success = await run({
                type: "create",
                kind: form.type,
                name:
                  form.type === "document" && !/\.(?:md|markdown)$/iu.test(name)
                    ? `${name}.md`
                    : name,
                parent: destination || null,
              });
            }
            if (success) {
              if (form.type === "document") {
                setPicked(null);
              }
              setForm(null);
              focusEditor();
            }
          }}
        >
          {form.type === "move" ? (
            <label className="flex min-w-0 flex-1 flex-col gap-2 text-sm">
              {t("quillFolderDestination")}
              <select
                autoFocus
                className="quill-field"
                value={destination}
                onChange={(event) => setDestination(event.target.value)}
              >
                <option value="">{t("quillRoot")}</option>
                {view.entries.flatMap((entry) =>
                  entry.kind === "folder" && !entry.trash
                    ? [
                        <option key={entry.id} value={entry.id}>
                          {entry.name}
                        </option>,
                      ]
                    : []
                )}
              </select>
            </label>
          ) : (
            <label className="flex min-w-0 flex-1 flex-col gap-2 text-sm">
              {t("quillNameLabel")}
              <input
                autoFocus
                className="quill-field"
                required
                value={name}
                onChange={(event) => setName(event.target.value)}
              />
            </label>
          )}
          {form.type === "document" || form.type === "folder" ? (
            <label className="flex min-w-0 flex-1 flex-col gap-2 text-sm">
              {t("quillFolderDestination")}
              <select
                className="quill-field"
                value={destination}
                onChange={(event) => setDestination(event.target.value)}
              >
                <option value="">{t("quillRoot")}</option>
                {view.entries.flatMap((entry) =>
                  entry.kind === "folder" && !entry.trash
                    ? [
                        <option key={entry.id} value={entry.id}>
                          {entry.name}
                        </option>,
                      ]
                    : []
                )}
              </select>
            </label>
          ) : null}
          <Button isDisabled={busy} type="submit">
            {t("quillApply")}
          </Button>
          <Button
            intent="outline"
            onPress={() => {
              setForm(null);
              focusEditor();
            }}
          >
            {t("quillCancel")}
          </Button>
        </form>
      ) : null}
      <output aria-live="polite" className="text-sm">
        {busy ? t("quillBusy") : view.document ? t(saveKeys[view.save]) : null}
      </output>
      {failure ? (
        <Note intent="danger" role="alert">
          <p>{t(failureKeys[failure])}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button
              size="sm"
              intent="outline"
              onPress={() =>
                run({ type: view.document ? "save" : "initialize" })
              }
            >
              {t("quillRetry")}
            </Button>
            {view.document ? (
              <>
                <Button
                  size="sm"
                  intent="outline"
                  onPress={() => prepare("md", "A4")}
                >
                  {t("quillDownloadMarkdown")}
                </Button>
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
      <Button
        className="self-start md:hidden"
        size="sm"
        intent="outline"
        onPress={() => setShowLibrary(!showLibrary)}
        aria-expanded={showLibrary}
      >
        {t(showLibrary ? "quillHideLibrary" : "quillShowLibrary")}
      </Button>
      <div className="border-rule grid min-w-0 border-2 md:grid-cols-[16rem_minmax(0,1fr)]">
        <aside
          className={`${showLibrary ? "block" : "hidden"} border-rule min-w-0 border-b-2 p-3 md:block md:border-r-2 md:border-b-0`}
        >
          <QuillLibrary
            entries={view.entries}
            selected={picked ?? view.document?.id ?? null}
            busy={busy}
            onSelect={(entry) => {
              setPicked(entry.kind === "document" ? null : entry.id);
              if (entry.kind === "document") {
                setPrepared(null);
                setPlan(null);
                void run({ type: "open", id: entry.id });
              }
            }}
            onRestore={(id) => run({ type: "restore", id })}
            onRemove={setRemove}
          />
        </aside>
        <section className="min-w-0" aria-label={t("quillEditor")}>
          {view.document ? (
            <>
              <div className="border-rule flex flex-wrap items-center justify-between gap-3 border-b-2 p-3">
                <h3 className="min-w-0 font-bold break-words">
                  {view.document.name}
                </h3>
                <div className="flex flex-wrap gap-2">
                  {modes.map(([mode, key]) => (
                    <Button
                      key={mode}
                      size="sm"
                      intent={view.mode === mode ? "secondary" : "outline"}
                      aria-pressed={view.mode === mode}
                      isDisabled={busy}
                      onPress={() => run({ type: "mode", mode })}
                    >
                      {t(key)}
                    </Button>
                  ))}
                  <Button
                    aria-label={t("quillUndo")}
                    size="sq-sm"
                    intent="outline"
                    isDisabled={!view.canUndo || busy}
                    onPress={() => run({ type: "history", direction: "undo" })}
                  >
                    <HiArrowUturnLeft aria-hidden="true" />
                  </Button>
                  <Button
                    aria-label={t("quillRedo")}
                    size="sq-sm"
                    intent="outline"
                    isDisabled={!view.canRedo || busy}
                    onPress={() => run({ type: "history", direction: "redo" })}
                  >
                    <HiArrowUturnRight aria-hidden="true" />
                  </Button>
                  <Button
                    size="sm"
                    intent="outline"
                    onPress={() => setExporting(!exporting)}
                    aria-expanded={exporting}
                  >
                    <HiArrowDownTray aria-hidden="true" />
                    {t("quillExport")}
                  </Button>
                </div>
              </div>
              {view.document.compatibility.safe ? null : (
                <Note className="m-3" intent="warning">
                  <h4 className="font-bold">{t("quillProtected")}</h4>
                  <p className="mt-2 text-sm">{t("quillProtectedBody")}</p>
                  <Button
                    size="sm"
                    className="mt-3"
                    intent="outline"
                    onPress={async () => setPlan(await conversion(null))}
                  >
                    {t("quillPlanConversion")}
                  </Button>
                </Note>
              )}
              <CapabilityBoundary
                key={`${view.document.id}-${view.mode}`}
                fallback={
                  <Note className="m-3" intent="warning">
                    {t("quillLoadFailed")}
                  </Note>
                }
              >
                <Suspense
                  fallback={
                    <output className="block p-6">{t("quillBusy")}</output>
                  }
                >
                  {view.mode === "visual" ? (
                    <Visual
                      source={view.document.source}
                      onChange={(source) =>
                        run({
                          type: "edit",
                          source,
                          id: view.document?.id ?? "",
                        })
                      }
                      onHistory={(direction) =>
                        run({ type: "history", direction })
                      }
                    />
                  ) : view.mode === "source" ? (
                    <Source
                      source={view.document.source}
                      onChange={(source) =>
                        run({
                          type: "edit",
                          source,
                          id: view.document?.id ?? "",
                        })
                      }
                      onHistory={(direction) =>
                        run({ type: "history", direction })
                      }
                    />
                  ) : (
                    <Reader
                      source={view.document.source}
                      onFollow={(href) => run({ type: "follow", href })}
                    />
                  )}
                </Suspense>
              </CapabilityBoundary>
              <p className="border-rule text-muted-fg border-t-2 p-3 text-xs">
                {t("quillSourceHint")}
              </p>
            </>
          ) : (
            <div className="flex min-h-96 flex-col items-start justify-center gap-4 p-6 sm:p-10">
              <h3 className="font-display text-3xl font-black uppercase">
                {t("quillEmptyTitle")}
              </h3>
              <p className="text-muted-fg max-w-prose">{t("quillEmptyBody")}</p>
              <Button isDisabled={busy} onPress={() => startForm("document")}>
                {t("quillNewDocument")}
              </Button>
            </div>
          )}
        </section>
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
      {exporting && view.document ? (
        <QuillExport
          busy={busy}
          onPrepare={(format, paper) => prepare(format, paper)}
          prepared={prepared}
          onDownload={saveOutput}
          onClose={() => {
            setExporting(false);
            focusEditor();
          }}
        />
      ) : null}
      {view.document?.original ? (
        <div>
          <Button
            intent="outline"
            size="sm"
            onPress={() => immediate({ recovery: "original" })}
          >
            {t("quillOriginal")}
          </Button>
        </div>
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
      <div className="border-rule text-muted-fg flex flex-col gap-2 border-t-2 pt-4 text-sm">
        <p>{t("quillStorageNote")}</p>
        {view.persistence === false ? (
          <p>{t("quillPersistenceDenied")}</p>
        ) : null}
      </div>
      {remove ? (
        <ModalContent
          isOpen
          role="alertdialog"
          aria-label={t("quillConfirmRemove")}
          size="sm"
          closeButton={false}
        >
          <ModalHeader title={t("quillConfirmRemove")} />
          <ModalFooter>
            <Button
              autoFocus
              intent="outline"
              onPress={() => {
                setRemove(null);
                focusEditor();
              }}
            >
              {t("quillCancel")}
            </Button>
            <Button
              intent="danger"
              onPress={async () => {
                if (
                  await run({ type: "remove", id: remove, confirmed: true })
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
