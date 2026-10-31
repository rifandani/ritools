/* oxlint-disable complexity, react/set-state-in-effect, eslint/no-await-in-loop, react-doctor/async-await-in-loop, react-doctor/no-giant-component -- One dialog starts a run and one card reports it; pages render and OCR one at a time so progress and Stop stay exact. */
"use client";

import type { Viewer } from "@embedpdf/viewer-react";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { toast } from "sonner";

import { Button } from "@/core/components/ui/button";
import { Checkbox, CheckboxField } from "@/core/components/ui/checkbox";
import { Legend } from "@/core/components/ui/field";
import {
  ModalBody,
  ModalClose,
  ModalContent,
  ModalFooter,
  ModalHeader,
} from "@/core/components/ui/modal";
import { Note } from "@/core/components/ui/note";
import { useTranslation } from "@/features/i18n/use-translation";

import {
  FOLIO_OCR_MAX_PIXELS,
  FOLIO_OCR_SCALE,
  ocrName,
  selectPagesWithoutText,
} from "../folio.ocr";
import type { FolioOcrLanguage, FolioOcrPage } from "../folio.ocr";
import { FolioOcrError, startOcrJob } from "../folio.ocr.worker-client";
import type { FolioOcrJob } from "../folio.ocr.worker-client";

type Stage = "setup" | "running" | "stopped" | "failed";

type PageStatus = "todo" | "doing" | "done" | "failed";

interface PageRow {
  readonly confidence: number | null;
  readonly hasText: boolean;
  readonly index: number;
  readonly status: PageStatus;
}

export interface FolioOcrProps {
  readonly documentId: string;
  readonly onClose: () => void;
  readonly viewer: Viewer;
}

const languageLabel = (
  language: FolioOcrLanguage
): "folioOcrLanguageEng" | "folioOcrLanguageInd" =>
  language === "ind" ? "folioOcrLanguageInd" : "folioOcrLanguageEng";

/** The OCR desk: choose pages and languages, then watch one run to the end. */
export const FolioOcr = ({ documentId, onClose, viewer }: FolioOcrProps) => {
  const { locale, t } = useTranslation();
  const documents = viewer.get("documents");
  const render = viewer.get("render");
  const jobRef = useRef<FolioOcrJob | null>(null);
  const stopRef = useRef(false);
  const [stage, setStage] = useState<Stage>("setup");
  const [rows, setRows] = useState<readonly PageRow[] | null>(null);
  const [selected, setSelected] = useState<ReadonlySet<number>>(new Set());
  const [languages, setLanguages] = useState<ReadonlySet<FolioOcrLanguage>>(
    () =>
      new Set<FolioOcrLanguage>(locale === "id-id" ? ["ind", "eng"] : ["eng"])
  );
  const [checked, setChecked] = useState(false);
  const [restricted, setRestricted] = useState(false);
  const [checkFailure, setCheckFailure] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [finished, setFinished] = useState(0);

  const info = documents.get(documentId);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const pageCount = documents.get(documentId)?.pageCount ?? 0;
      try {
        setRestricted(!viewer.get("selection").canCopy());
      } catch {
        setRestricted(false);
      }
      let textPages = new Set<number>();
      try {
        const hits = await viewer.get("search").findAll({
          regex: true,
          text: "\\S",
        });
        textPages = new Set(hits.map((hit) => hit.pageIndex));
      } catch {
        if (!cancelled) {
          setCheckFailure(true);
        }
      }
      if (cancelled) {
        return;
      }
      const next = Array.from({ length: pageCount }, (_, index) => ({
        confidence: null,
        hasText: textPages.has(index),
        index,
        status: "todo" as const,
      }));
      setRows(next);
      setSelected(selectPagesWithoutText(next));
      setChecked(true);
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [documentId, documents, viewer]);

  useEffect(
    () => () => {
      jobRef.current?.discard();
      jobRef.current = null;
    },
    []
  );

  const patch = (index: number, next: Partial<PageRow>) => {
    setRows((current) =>
      current
        ? current.map((row) =>
            row.index === index ? { ...row, ...next } : row
          )
        : current
    );
  };

  const describe = (error: Error) => {
    if (error instanceof FolioOcrError) {
      if (error.reason === "encrypted") {
        return t("folioOcrEncrypted");
      }
      if (error.reason === "signed") {
        return t("folioOcrSigned");
      }
    }
    return t("folioOcrFailed", { message: error.message });
  };

  const apply = async (job: FolioOcrJob) => {
    const { bytes, skipped: lost } = await job.finish();
    const original = documents.get(documentId);
    if (!original) {
      throw new FolioOcrError("write", "The document was closed.");
    }
    const opened = await documents.open(
      { bytes, kind: "bytes" },
      { activate: true, name: ocrName(original.name) }
    );
    if (opened.document.id !== documentId) {
      if (opened.document.pageCount !== original.pageCount) {
        await documents.close(opened.document.id);
        throw new FolioOcrError("write", "The page count changed.");
      }
      await documents.close(documentId);
    }
    toast.success(t("folioOcrDone"), {
      description:
        lost > 0 ? t("folioOcrSkipped", { count: String(lost) }) : undefined,
    });
    onClose();
  };

  const start = async () => {
    if (selected.size === 0 || !info) {
      return;
    }
    setFailure(null);
    setStage("running");
    setProgress({ done: 0, total: selected.size });
    setFinished(0);
    stopRef.current = false;
    try {
      const bytes = await documents.download(documentId);
      const job = await startOcrJob({
        bytes,
        languages: [...languages],
      });
      jobRef.current = job;
      const queue = [...selected].toSorted((left, right) => left - right);
      let done = 0;
      for (const index of queue) {
        if (stopRef.current || !documents.has(documentId)) {
          break;
        }
        setRows(
          (current) =>
            current?.map((row) =>
              row.index === index ? { ...row, status: "doing" } : row
            ) ?? current
        );
        const page: FolioOcrPage | null = await (async () => {
          try {
            let handle = await render.renderPage(index, {
              scale: FOLIO_OCR_SCALE,
            });
            if (handle.width * handle.height > FOLIO_OCR_MAX_PIXELS) {
              const width = Math.floor(
                Math.sqrt((FOLIO_OCR_MAX_PIXELS * handle.width) / handle.height)
              );
              handle = await render.renderPage(index, { width });
            }
            const blob = await handle.blob();
            return await job.page(
              index,
              await blob.arrayBuffer(),
              handle.width,
              handle.height
            );
          } catch (error) {
            if (error instanceof FolioOcrError) {
              patch(index, { status: "failed" });
              return null;
            }
            patch(index, { status: "failed" });
            return null;
          }
        })();
        if (page) {
          done += 1;
          setFinished(done);
          patch(index, {
            confidence: page.confidence,
            status: "done",
          });
        }
        setProgress({ done: done + 1, total: queue.length });
      }
      if (stopRef.current) {
        setStage("stopped");
        return;
      }
      await apply(job);
    } catch (error) {
      setFailure(describe(error instanceof Error ? error : new Error("OCR")));
      setStage("failed");
      jobRef.current?.discard();
      jobRef.current = null;
    }
  };

  const close = () => {
    jobRef.current?.discard();
    jobRef.current = null;
    onClose();
  };

  const keep = async () => {
    const job = jobRef.current;
    if (!job) {
      close();
      return;
    }
    try {
      await apply(job);
    } catch (error) {
      setFailure(describe(error instanceof Error ? error : new Error("OCR")));
      setStage("failed");
    }
  };

  if (globalThis.document === undefined) {
    return null;
  }

  if (stage === "setup") {
    const list = rows ?? [];
    const all = list.length > 0 && selected.size === list.length;
    return createPortal(
      <ModalContent
        aria-label={t("folioOcrTitle")}
        isDismissable
        isOpen
        onOpenChange={(isOpen) => {
          if (!isOpen) {
            onClose();
          }
        }}
        size="lg"
      >
        <ModalHeader
          description={t("folioOcrIntro")}
          title={t("folioOcrTitle")}
        />
        <ModalBody className="space-y-4">
          <fieldset>
            <Legend>{t("folioOcrLanguages")}</Legend>
            <div className="mt-2 flex flex-wrap gap-4">
              {(["eng", "ind"] as const).map((language) => (
                <CheckboxField
                  isSelected={languages.has(language)}
                  key={language}
                  onChange={(isSelected) => {
                    setLanguages((current) => {
                      const next = new Set(current);
                      if (isSelected) {
                        next.add(language);
                      } else {
                        next.delete(language);
                      }
                      return next;
                    });
                  }}
                >
                  <Checkbox>{t(languageLabel(language))}</Checkbox>
                </CheckboxField>
              ))}
            </div>
          </fieldset>

          <section>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-fg text-sm leading-5 font-medium">
                {t("folioOcrPages")}
                {rows ? ` (${rows.length})` : ""}
              </p>
              <Button
                intent="plain"
                isDisabled={!rows}
                onPress={() => {
                  if (!rows) {
                    return;
                  }
                  setSelected(
                    all ? new Set() : new Set(rows.map((row) => row.index))
                  );
                }}
              >
                {all ? t("folioOcrSelectNone") : t("folioOcrSelectAll")}
              </Button>
            </div>
            {rows ? (
              <div className="border-rule mt-2 max-h-64 overflow-auto border-2">
                <ul className="divide-rule divide-y">
                  {rows.map((row) => (
                    <li
                      className="flex items-center justify-between gap-3 px-3 py-2"
                      key={row.index}
                    >
                      <CheckboxField
                        isSelected={selected.has(row.index)}
                        onChange={(isSelected) => {
                          setSelected((current) => {
                            const next = new Set(current);
                            if (isSelected) {
                              next.add(row.index);
                            } else {
                              next.delete(row.index);
                            }
                            return next;
                          });
                        }}
                      >
                        <Checkbox>
                          {t("folioOcrPage", { page: String(row.index + 1) })}
                        </Checkbox>
                      </CheckboxField>
                      <span className="text-muted-fg text-xs/5">
                        {row.hasText
                          ? t("folioOcrHasText")
                          : t("folioOcrNoText")}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <output
                aria-live="polite"
                className="text-muted-fg mt-2 block text-sm/6"
              >
                {t("folioOcrChecking")}
              </output>
            )}
          </section>

          <Note intent="warning">{t("folioOcrHonesty")}</Note>
          {restricted ? (
            <Note intent="danger">{t("folioOcrRestricted")}</Note>
          ) : null}
          {checkFailure ? <Note>{t("folioOcrCheckFailed")}</Note> : null}
          {failure ? <Note intent="danger">{failure}</Note> : null}
        </ModalBody>
        <ModalFooter>
          <ModalClose>{t("cancel")}</ModalClose>
          <Button
            isDisabled={
              !checked ||
              restricted ||
              selected.size === 0 ||
              languages.size === 0
            }
            onPress={() => {
              void start();
            }}
          >
            {t("folioOcrStart")}
          </Button>
        </ModalFooter>
      </ModalContent>,
      globalThis.document.body
    );
  }

  const percent =
    progress.total > 0 ? Math.round((progress.done / progress.total) * 100) : 0;

  return createPortal(
    <output
      aria-live="polite"
      className="border-rule bg-bg fixed right-4 bottom-4 z-50 block w-[min(24rem,calc(100vw-2rem))] border-2 p-4 shadow-lg"
    >
      <p className="font-display text-sm leading-5 font-black uppercase">
        {stage === "running"
          ? t("folioOcrRunning", {
              done: String(
                Math.min(progress.done + 1, Math.max(progress.total, 1))
              ),
              total: String(progress.total),
            })
          : stage === "stopped"
            ? t("folioOcrStopped", { done: String(finished) })
            : t("folioOcrTitle")}
      </p>
      {stage === "running" ? (
        <div
          aria-hidden="true"
          className="border-rule mt-3 h-2 border-2"
          role="presentation"
        >
          <div className="bg-accent h-full" style={{ width: `${percent}%` }} />
        </div>
      ) : null}
      {failure ? (
        <p className="text-danger-subtle-fg mt-3 text-sm/6">{failure}</p>
      ) : null}
      {stage === "stopped" ? (
        <p className="text-muted-fg mt-2 text-sm/6">{t("folioOcrKeepHint")}</p>
      ) : null}
      <div className="mt-4 flex flex-wrap justify-end gap-2">
        {stage === "running" ? (
          <Button
            intent="outline"
            onPress={() => {
              stopRef.current = true;
              jobRef.current?.cancel();
            }}
          >
            {t("folioOcrStop")}
          </Button>
        ) : null}
        {stage === "stopped" ? (
          <>
            <Button intent="plain" onPress={close}>
              {t("folioOcrDiscard")}
            </Button>
            <Button
              isDisabled={finished === 0}
              onPress={() => {
                void keep();
              }}
            >
              {t("folioOcrKeep", { count: String(finished) })}
            </Button>
          </>
        ) : null}
        {stage === "failed" ? (
          <Button onPress={close}>{t("folioOcrClose")}</Button>
        ) : null}
      </div>
    </output>,
    globalThis.document.body
  );
};
