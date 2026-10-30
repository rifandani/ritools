/* oxlint-disable complexity -- One dialog owns two optional sections, their confirmations, and the permission grid. */
"use client";

import type { DocumentsCapability } from "@embedpdf/viewer-react";
import { useState } from "react";
import { createPortal } from "react-dom";
import { toast } from "sonner";

import { Button } from "@/core/components/ui/button";
import { Checkbox, CheckboxField } from "@/core/components/ui/checkbox";
import { Label, Legend } from "@/core/components/ui/field";
import { Input } from "@/core/components/ui/input";
import {
  ModalBody,
  ModalClose,
  ModalContent,
  ModalFooter,
  ModalHeader,
} from "@/core/components/ui/modal";
import { Note } from "@/core/components/ui/note";
import { TextField } from "@/core/components/ui/text-field";
import { useTranslation } from "@/features/i18n/use-translation";

import { protectPdf } from "../folio.protect";
import {
  FOLIO_PDF_ALLOW_ALL,
  FOLIO_PDF_PERMISSION,
} from "../folio.protect.types";

interface PermissionRow {
  readonly flag: number;
  readonly labelKey:
    | "folioProtectAccess"
    | "folioProtectAnnotate"
    | "folioProtectAssemble"
    | "folioProtectCopy"
    | "folioProtectFill"
    | "folioProtectModify"
    | "folioProtectPrint"
    | "folioProtectPrintHigh";
}

const permissions: readonly PermissionRow[] = [
  { flag: FOLIO_PDF_PERMISSION.print, labelKey: "folioProtectPrint" },
  {
    flag: FOLIO_PDF_PERMISSION.printHighQuality,
    labelKey: "folioProtectPrintHigh",
  },
  { flag: FOLIO_PDF_PERMISSION.copyContents, labelKey: "folioProtectCopy" },
  {
    flag: FOLIO_PDF_PERMISSION.extractForAccessibility,
    labelKey: "folioProtectAccess",
  },
  { flag: FOLIO_PDF_PERMISSION.modifyContents, labelKey: "folioProtectModify" },
  {
    flag: FOLIO_PDF_PERMISSION.modifyAnnotations,
    labelKey: "folioProtectAnnotate",
  },
  { flag: FOLIO_PDF_PERMISSION.fillForms, labelKey: "folioProtectFill" },
  {
    flag: FOLIO_PDF_PERMISSION.assembleDocument,
    labelKey: "folioProtectAssemble",
  },
];

const allPermissions = new Set(permissions.map(({ flag }) => flag));

const flagsOf = (allowed: ReadonlySet<number>) => {
  let flags = 0;
  for (const flag of allowed) {
    flags += flag;
  }
  return flags;
};

export interface FolioSecurityProps {
  readonly documentId: string;
  readonly documents: DocumentsCapability;
  readonly onClose: () => void;
}

/** The Security panel: a password and permission dialog for the open PDF. */
export const FolioSecurity = ({
  documentId,
  documents,
  onClose,
}: FolioSecurityProps) => {
  const { t } = useTranslation();
  const [lockOpen, setLockOpen] = useState(false);
  const [userPassword, setUserPassword] = useState("");
  const [userConfirm, setUserConfirm] = useState("");
  const [restrict, setRestrict] = useState(false);
  const [ownerPassword, setOwnerPassword] = useState("");
  const [ownerConfirm, setOwnerConfirm] = useState("");
  const [allowed, setAllowed] = useState<ReadonlySet<number>>(allPermissions);
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);

  const documentInfo = documents.get(documentId);
  const name = documentInfo?.name ?? t("folioUntitledDocument");

  const userMismatch =
    lockOpen && userConfirm.length > 0 && userPassword !== userConfirm;
  const ownerMismatch =
    restrict && ownerConfirm.length > 0 && ownerPassword !== ownerConfirm;
  const hasOption = lockOpen || restrict;
  const userReady =
    !lockOpen || (userPassword.length > 0 && userPassword === userConfirm);
  const ownerReady =
    !restrict || (ownerPassword.length > 0 && ownerPassword === ownerConfirm);
  const canApply =
    hasOption && userReady && ownerReady && !busy && documentInfo !== null;

  const togglePermission = (flag: number) => {
    setAllowed((current) => {
      const next = new Set(current);
      if (next.has(flag)) {
        next.delete(flag);
        if (flag === FOLIO_PDF_PERMISSION.print) {
          next.delete(FOLIO_PDF_PERMISSION.printHighQuality);
        }
      } else {
        next.add(flag);
        if (flag === FOLIO_PDF_PERMISSION.printHighQuality) {
          next.add(FOLIO_PDF_PERMISSION.print);
        }
      }
      return next;
    });
  };

  const apply = async () => {
    if (!canApply) {
      return;
    }
    setBusy(true);
    setFailure(null);
    try {
      const bytes = await documents.download(documentId);
      const protectedBytes = await protectPdf(bytes, {
        flags: restrict ? flagsOf(allowed) : FOLIO_PDF_ALLOW_ALL,
        ownerPassword: restrict ? ownerPassword : userPassword,
        userPassword: lockOpen ? userPassword : "",
      });
      const opened = await documents.open(
        { bytes: protectedBytes, kind: "bytes" },
        {
          activate: true,
          name,
          password: lockOpen ? userPassword : null,
        }
      );
      if (opened.document.id !== documentId) {
        await documents.close(documentId);
      }
      toast.success(t("folioProtectDone"));
      setBusy(false);
      onClose();
    } catch {
      setFailure(t("folioProtectFailed"));
      setBusy(false);
    }
  };

  const modal = (
    <ModalContent
      aria-label={t("folioProtectTitle")}
      isDismissable
      isOpen
      onOpenChange={(isOpen) => {
        if (!isOpen && !busy) {
          onClose();
        }
      }}
      size="lg"
    >
      <ModalHeader
        description={t("folioProtectIntro")}
        title={t("folioProtectTitle")}
      />
      <ModalBody className="space-y-4">
        <section className="border-rule border-2 p-4">
          <CheckboxField isSelected={lockOpen} onChange={setLockOpen}>
            <Checkbox>{t("folioProtectOpen")}</Checkbox>
          </CheckboxField>
          <p className="text-muted-fg mt-1 text-sm/6">
            {t("folioProtectOpenHint")}
          </p>
          {lockOpen ? (
            <div className="mt-4 space-y-3 pl-8">
              <TextField
                isRequired
                value={userPassword}
                onChange={setUserPassword}
              >
                <Label>{t("folioProtectPassword")}</Label>
                <Input
                  autoComplete="new-password"
                  placeholder={t("folioProtectPassword")}
                  type="password"
                />
              </TextField>
              <TextField
                isInvalid={userMismatch}
                value={userConfirm}
                onChange={setUserConfirm}
              >
                <Label>{t("folioProtectConfirm")}</Label>
                <Input
                  autoComplete="new-password"
                  placeholder={t("folioProtectConfirm")}
                  type="password"
                />
              </TextField>
              {userMismatch ? (
                <p className="text-danger-subtle-fg text-sm/6" role="alert">
                  {t("folioProtectMismatch")}
                </p>
              ) : null}
            </div>
          ) : null}
        </section>

        <section className="border-rule border-2 p-4">
          <CheckboxField isSelected={restrict} onChange={setRestrict}>
            <Checkbox>{t("folioProtectRestrict")}</Checkbox>
          </CheckboxField>
          <p className="text-muted-fg mt-1 text-sm/6">
            {t("folioProtectRestrictHint")}
          </p>
          {restrict ? (
            <div className="mt-4 space-y-4 pl-8">
              <div className="space-y-3">
                <TextField
                  isRequired
                  value={ownerPassword}
                  onChange={setOwnerPassword}
                >
                  <Label>{t("folioProtectOwner")}</Label>
                  <Input
                    autoComplete="new-password"
                    placeholder={t("folioProtectOwner")}
                    type="password"
                  />
                </TextField>
                <TextField
                  isInvalid={ownerMismatch}
                  value={ownerConfirm}
                  onChange={setOwnerConfirm}
                >
                  <Label>{t("folioProtectConfirmOwner")}</Label>
                  <Input
                    autoComplete="new-password"
                    placeholder={t("folioProtectConfirmOwner")}
                    type="password"
                  />
                </TextField>
                {ownerMismatch ? (
                  <p className="text-danger-subtle-fg text-sm/6" role="alert">
                    {t("folioProtectMismatch")}
                  </p>
                ) : null}
              </div>
              <fieldset>
                <Legend>{t("folioProtectAllowed")}</Legend>
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  {permissions.map(({ flag, labelKey }) => (
                    <CheckboxField
                      isSelected={allowed.has(flag)}
                      key={flag}
                      onChange={() => togglePermission(flag)}
                    >
                      <Checkbox>{t(labelKey)}</Checkbox>
                    </CheckboxField>
                  ))}
                </div>
              </fieldset>
            </div>
          ) : null}
        </section>

        {hasOption ? null : (
          <Note intent="warning">{t("folioProtectNone")}</Note>
        )}
        {failure ? <Note intent="danger">{failure}</Note> : null}
      </ModalBody>
      <ModalFooter>
        <ModalClose isDisabled={busy}>{t("folioProtectCancel")}</ModalClose>
        <Button
          isDisabled={!canApply}
          onPress={() => {
            void apply();
          }}
        >
          {busy ? t("folioProtectApplying") : t("folioProtectApply")}
        </Button>
      </ModalFooter>
    </ModalContent>
  );

  if (globalThis.document === undefined) {
    return null;
  }
  return createPortal(modal, globalThis.document.body);
};
