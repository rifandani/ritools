/* oxlint-disable eslint/complexity -- The review exposes exact scope, revision, blockers, warnings, progress, and receipt states. */
import { useState } from "react";

import { Button } from "@/core/components/ui/button";
import {
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
} from "@/core/components/ui/modal";
import { Note } from "@/core/components/ui/note";
import { useTranslation } from "@/features/i18n/use-translation";

import type * as F from "../folio";
import { reasonKeys } from "../folio.ui";
import type { FolioController } from "../use-folio";
import { FolioField } from "./folio-controls";

const warnings = {
  "required-fields-incomplete": "folioIncomplete",
  "source-reading-order": "folioWarningSourceReadingOrder",
  "not-conformance-checked": "folioWarningNotConformance",
  "first-download-required": "folioWarningFirstDownload",
} as const;
export const FolioExport = ({
  controller: c,
  plan,
  onClose,
}: {
  readonly controller: FolioController;
  readonly plan: F.ExportPlan;
  readonly onClose: () => void;
}) => {
  const { t } = useTranslation();
  const [filename, setFilename] = useState(plan.filename);
  const stale =
    plan.session !== c.snapshot?.session ||
    plan.revision !== c.snapshot.revision ||
    c.plan?.id !== plan.id;
  return (
    <ModalContent
      className="[&_button]:min-h-11"
      isOpen
      size="md"
      aria-label={t("folioDownloadScope")}
      onOpenChange={(open) => {
        if (!open && !c.busy) {
          onClose();
        }
      }}
    >
      <ModalHeader
        title={t(plan.scope._tag === "Full" ? "folioDownload" : "folioExtract")}
      />
      <ModalBody>
        <div className="flex min-w-0 flex-col gap-4">
          {c.busy ? (
            <output aria-live="polite">
              {t(
                c.progress?.phase === "verifying"
                  ? "folioVerifying"
                  : "folioWriting"
              )}
            </output>
          ) : null}
          <p className="font-bold">
            {t(
              plan.scope._tag === "Full"
                ? "folioFullScope"
                : "folioSelectedScope",
              { count: String(plan.pages.length) }
            )}
          </p>
          <p className="num text-sm">
            {t("folioRevision", { revision: String(plan.revision) })}
          </p>
          <p className="text-sm [overflow-wrap:anywhere]">
            {t("folioPageOrder", {
              pages: plan.pages
                .map(
                  (id) =>
                    (c.snapshot?.pages.find((p) => p.id === id)?.index ?? 0) + 1
                )
                .join(", "),
            })}
          </p>
          <FolioField
            id="folio-export-name"
            label={t("folioFileName")}
            value={filename}
            onChange={setFilename}
            disabled={c.busy}
          />
          {plan.warnings.map((warning) => (
            <Note key={warning} intent="warning">
              <p>{t(warnings[warning])}</p>
            </Note>
          ))}
          {plan.blockers.map((reason) => (
            <Note key={reason} intent="danger">
              <p>{t(reasonKeys[reason])}</p>
            </Note>
          ))}
          {stale ? (
            <Note intent="warning">
              <p role="alert">{t("folioStalePlan")}</p>
            </Note>
          ) : null}
          {c.receipt?.revision === plan.revision &&
          c.receipt.scope._tag === plan.scope._tag ? (
            <Note intent="success">
              <output>
                {t("folioDownloadStarted", {
                  revision: String(c.receipt.revision),
                })}
              </output>
              {plan.scope._tag === "Selected" ? (
                <p>{t("folioExtracted")}</p>
              ) : null}
              {c.receipt.url ? (
                <a
                  className="bracket mt-2 inline-flex min-h-11 items-center underline underline-offset-4"
                  href={c.receipt.url}
                  download={c.receipt.filename}
                >
                  {t("folioSavedFile")}
                </a>
              ) : null}
            </Note>
          ) : null}
          <p className="text-muted-fg text-xs/5">{t("folioLifetimeHelp")}</p>
        </div>
      </ModalBody>
      <ModalFooter>
        <Button
          intent="plain"
          onPress={() => {
            if (c.busy) {
              void c.cancel();
            } else {
              onClose();
            }
          }}
        >
          {t(c.busy ? "folioCancel" : "folioClose")}
        </Button>
        <Button
          isDisabled={
            c.busy || stale || Boolean(plan.blockers.length) || !filename.trim()
          }
          onPress={() => {
            void c.download(filename);
          }}
        >
          {t(plan.scope._tag === "Full" ? "folioDownload" : "folioExtract")}
        </Button>
      </ModalFooter>
    </ModalContent>
  );
};
