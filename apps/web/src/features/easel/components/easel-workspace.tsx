"use client";

import { useCallback, useRef, useState } from "react";

import { FullscreenFrame, FullscreenScope } from "@/core/components/fullscreen";
import { Button } from "@/core/components/ui/button";
import {
  ModalContent,
  ModalFooter,
  ModalHeader,
} from "@/core/components/ui/modal";
import { useAgentActions } from "@/core/hooks/use-agent-actions";
import { useFileDrop } from "@/core/hooks/use-file-drop";
import { droppedFilesOf } from "@/core/libs/files";
import type { DroppedFile } from "@/core/libs/files";
import { EaselDropZone } from "@/features/easel/components/easel-drop-zone";
import { EaselEditor } from "@/features/easel/components/easel-editor";
import { EaselNotes } from "@/features/easel/components/easel-notes";
import { EaselTabs } from "@/features/easel/components/easel-tabs";
import { ACCEPTED_MIME, MAX_TABS } from "@/features/easel/easel";
import { EASEL_AGENT_ACTIONS } from "@/features/easel/easel.agent";
import type { EaselAgentController } from "@/features/easel/easel.agent";
import { isDirty } from "@/features/easel/use-easel";
import type { EaselController } from "@/features/easel/use-easel";
import { useTranslation } from "@/features/i18n/use-translation";

import "./easel.css";

/** The drop zone, then the File Tab strip and the editor of the active tab. */
export const EaselWorkspace = ({
  controller,
}: {
  readonly controller: EaselController;
}) => {
  const { t } = useTranslation();
  const input = useRef<HTMLInputElement>(null);
  const [closing, setClosing] = useState<string | null>(null);
  const { addFiles } = controller;
  const receive = useCallback(
    (files: readonly DroppedFile[]) => {
      void addFiles(files);
    },
    [addFiles]
  );
  const { dragging, dropProps } = useFileDrop(receive, { paste: true });

  const requestClose = (id: string) => {
    const tab = controller.tabs.find((item) => item.id === id);
    if (tab !== undefined && isDirty(tab)) {
      setClosing(id);
    } else {
      controller.close(id);
    }
  };
  const closingTab = controller.tabs.find((tab) => tab.id === closing) ?? null;

  const { active } = controller;
  const agentController: EaselAgentController = {
    apply: controller.apply,
    exportImage: async (options) => {
      const tab = controller.active;
      const outcome = await controller.exportActive(options);
      if (!outcome.ok || tab === null) {
        return outcome.ok ? { ok: false, reason: "no-image" } : outcome;
      }
      controller.downloadExport(tab.id, outcome.image, tab.stack.present);
      return {
        bytes: outcome.image.bytes.byteLength,
        format: outcome.image.format,
        height: outcome.image.height,
        name: outcome.image.name,
        ok: true,
        width: outcome.image.width,
      };
    },
    image:
      active === null
        ? null
        : {
            format: active.format,
            name: active.name,
            source: active.source,
            state: active.stack.present,
          },
    loadSample: controller.loadSample,
  };
  useAgentActions(EASEL_AGENT_ACTIONS, agentController);

  const hasTabs = controller.tabs.length > 0;

  return (
    <div className="flex min-w-0 flex-col gap-y-4" data-easel-workspace="">
      <input
        accept={ACCEPTED_MIME}
        aria-label={t("easelChoose")}
        className="hidden"
        id="easel-files"
        multiple
        onChange={(event) => {
          receive(droppedFilesOf(event.target.files));
          event.target.value = "";
        }}
        ref={input}
        type="file"
      />
      <EaselNotes
        onOversized={(id, accept) => {
          void controller.resolveOversized(id, accept);
        }}
        oversized={controller.oversized}
        rejected={controller.rejected}
        sampleFailed={controller.sampleFailed}
        tabLimit={MAX_TABS}
        tabLimitHit={controller.tabLimitHit}
        unsupported={controller.unsupported}
      />
      {hasTabs ? (
        <FullscreenScope>
          <FullscreenFrame
            className="easel-frame flex min-w-0 flex-col gap-y-3"
            id="easel-frame"
            {...dropProps}
          >
            <EaselTabs
              activeId={controller.activeId}
              onAdd={() => {
                input.current?.click();
              }}
              onClose={requestClose}
              onSelect={(id) => {
                controller.select(id);
              }}
              tabs={controller.tabs}
            />
            {active === null ? null : (
              <EaselEditor
                controller={controller}
                key={active.id}
                tab={active}
              />
            )}
          </FullscreenFrame>
          {closingTab === null ? null : (
            <ModalContent
              aria-label={t("easelCloseTitle", { name: closingTab.name })}
              closeButton={false}
              isOpen
              onOpenChange={(open) => {
                if (!open) {
                  setClosing(null);
                }
              }}
              role="alertdialog"
              size="sm"
            >
              <ModalHeader
                description={t("easelCloseBody")}
                title={t("easelCloseTitle", { name: closingTab.name })}
              />
              <ModalFooter>
                <Button
                  autoFocus
                  intent="outline"
                  onPress={() => {
                    setClosing(null);
                  }}
                >
                  {t("cancel")}
                </Button>
                <Button
                  id="easel-close-confirm"
                  intent="danger"
                  onPress={() => {
                    controller.close(closingTab.id);
                    setClosing(null);
                  }}
                >
                  {t("easelCloseConfirm")}
                </Button>
              </ModalFooter>
            </ModalContent>
          )}
        </FullscreenScope>
      ) : (
        <EaselDropZone
          dragging={dragging}
          dropProps={dropProps}
          inputRef={input}
          isOpening={controller.opening}
          onSample={() => {
            void controller.loadSample();
          }}
        />
      )}
      {controller.leaving ? (
        <ModalContent
          aria-label={t("easelLeaveTitle")}
          closeButton={false}
          isOpen
          onOpenChange={(open) => {
            if (!open) {
              controller.cancelLeave();
            }
          }}
          role="alertdialog"
          size="sm"
        >
          <ModalHeader
            description={t("easelLeaveBody")}
            title={t("easelLeaveTitle")}
          />
          <ModalFooter>
            <Button
              autoFocus
              intent="outline"
              onPress={() => {
                controller.cancelLeave();
              }}
            >
              {t("cancel")}
            </Button>
            <Button
              id="easel-leave-confirm"
              intent="danger"
              onPress={() => {
                controller.confirmLeave();
              }}
            >
              {t("easelLeaveConfirm")}
            </Button>
          </ModalFooter>
        </ModalContent>
      ) : null}
    </div>
  );
};
