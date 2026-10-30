/* oxlint-disable react-doctor/html-no-nested-interactive -- A tab's close button is part of the tab, as the viewer's own strip has it; both stay operable. */
"use client";

import { useCommand, usePDFViewer } from "@embedpdf/viewer-react";
import type { DocumentInfo } from "@embedpdf/viewer-react";
import { useEffect, useState } from "react";
import type { KeyboardEvent } from "react";
import { createPortal } from "react-dom";
import {
  HiExclamationTriangle,
  HiLockClosed,
  HiPlus,
  HiXMark,
} from "react-icons/hi2";

import { Button } from "@/core/components/ui/button";
import {
  ModalClose,
  ModalContent,
  ModalFooter,
  ModalHeader,
} from "@/core/components/ui/modal";
import { useTranslation } from "@/features/i18n/use-translation";

const TabStatus = ({ document }: { readonly document: DocumentInfo }) => {
  const { t } = useTranslation();

  if (document.status === "loading") {
    return (
      <span
        aria-label={t("folioTabLoading")}
        className="border-border border-t-fg size-3 shrink-0 animate-spin rounded-full border"
      />
    );
  }
  if (document.status === "locked" || document.shareRequest) {
    return (
      <HiLockClosed
        aria-label={t("folioTabLocked")}
        className="text-muted-fg size-3.5 shrink-0"
      />
    );
  }
  if (document.status === "error") {
    return (
      <HiExclamationTriangle
        aria-label={t("folioTabError")}
        className="text-danger size-3.5 shrink-0"
      />
    );
  }
  return null;
};

/**
 * The document tabs, with an open button beside them. The viewer's own strip
 * has no open button, so Folio draws the strip and keeps the same tab actions:
 * pick a tab, close one tab, or open more files.
 */
export const FolioTabs = () => {
  const { t } = useTranslation();
  const viewer = usePDFViewer();
  const open = useCommand("document:open");
  const [documents, setDocuments] = useState<readonly DocumentInfo[]>(() =>
    viewer.documents.list()
  );
  const [activeId, setActiveId] = useState<string | null>(() =>
    viewer.documents.getActiveId()
  );
  const [pendingClose, setPendingClose] = useState<DocumentInfo | null>(null);

  useEffect(() => {
    const read = () => {
      setDocuments(viewer.documents.list());
      setActiveId(viewer.documents.getActiveId());
    };
    read();
    const stops = [
      viewer.documents.onOpened(read),
      viewer.documents.onOpenFailed(read),
      viewer.documents.onLocked(read),
      viewer.documents.onClosed(read),
      viewer.documents.onActiveChanged(read),
      viewer.documents.onUnsavedChangesChanged(read),
    ];
    return () => {
      for (const stop of stops) {
        stop();
      }
    };
  }, [viewer]);

  const select = (document: DocumentInfo) => {
    viewer.documents.setActive(document.id);
  };

  const close = (document: DocumentInfo) => {
    if (document.hasUnsavedChanges) {
      setPendingClose(document);
      return;
    }
    void viewer.documents.close(document.id);
  };

  const closeWithoutSaving = () => {
    if (!pendingClose) {
      return;
    }
    void viewer.documents.close(pendingClose.id);
    setPendingClose(null);
  };

  const openFile = async () => {
    try {
      await open.run();
    } catch {
      // The file picker was closed without a choice.
    }
  };

  const choose = (
    event: KeyboardEvent<HTMLDivElement>,
    document: DocumentInfo
  ) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      select(document);
    }
  };

  return (
    <div className="folio-tabs">
      <div
        aria-label={t("folioDocuments")}
        className="folio-tab-list"
        role="tablist"
      >
        {documents.map((document) => {
          const active = document.id === activeId;
          const name = document.name ?? t("folioUntitledDocument");
          return (
            <div
              aria-label={name}
              aria-selected={active}
              className="folio-tab"
              key={document.id}
              onClick={() => select(document)}
              onKeyDown={(event) => choose(event, document)}
              role="tab"
              tabIndex={0}
              title={name}
            >
              <TabStatus document={document} />
              <span className="min-w-0 flex-1 truncate">{name}</span>
              {active ? (
                <button
                  aria-label={t("folioCloseTab", { name })}
                  className="folio-tab-close"
                  onClick={(event) => {
                    event.stopPropagation();
                    close(document);
                  }}
                  type="button"
                >
                  <HiXMark aria-hidden="true" className="size-3.5" />
                </button>
              ) : null}
            </div>
          );
        })}
        <button
          aria-label={t("folioNewTab")}
          className="folio-tab-open"
          onClick={() => {
            void openFile();
          }}
          title={t("folioNewTab")}
          type="button"
        >
          <HiPlus aria-hidden="true" className="size-4" />
        </button>
      </div>
      {pendingClose && globalThis.document !== undefined
        ? createPortal(
            <ModalContent
              aria-label={t("folioCloseUnsavedTitle")}
              isDismissable
              isOpen
              onOpenChange={(isOpen) => {
                if (!isOpen) {
                  setPendingClose(null);
                }
              }}
              size="sm"
            >
              <ModalHeader
                description={t("folioCloseUnsavedBody", {
                  name: pendingClose.name ?? t("folioUntitledDocument"),
                })}
                title={t("folioCloseUnsavedTitle")}
              />
              <ModalFooter>
                <ModalClose>{t("cancel")}</ModalClose>
                <Button intent="danger" onPress={closeWithoutSaving}>
                  {t("folioCloseWithoutSaving")}
                </Button>
              </ModalFooter>
            </ModalContent>,
            globalThis.document.body
          )
        : null}
    </div>
  );
};
