/* oxlint-disable react/jsx-handler-names -- the page passes the controller's named actions straight through, and each prop name already says where the action lands */
"use client";

import { useEffect } from "react";
import { HiArrowDownTray } from "react-icons/hi2";

import { Button } from "@/core/components/ui/button";
import { Container } from "@/core/components/ui/container";
import { Loader } from "@/core/components/ui/loader";
import {
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
} from "@/core/components/ui/modal";
import { Note } from "@/core/components/ui/note";
import { ExposeBatch } from "@/features/expose/components/expose-batch";
import { ExposeEmpty } from "@/features/expose/components/expose-empty";
import { ExposeExhibit } from "@/features/expose/components/expose-exhibit";
import { ExposeExplainer } from "@/features/expose/components/expose-explainer";
import { ExposeHeader } from "@/features/expose/components/expose-header";
import { ExposeOrder } from "@/features/expose/components/expose-order";
import { ExposeReport } from "@/features/expose/components/expose-report";
import { ExposeVerification } from "@/features/expose/components/expose-verification";
import type { ExposeErrorCode } from "@/features/expose/expose";
import { formatBytes } from "@/features/expose/expose.view";
import { useExpose } from "@/features/expose/use-expose";
import type {
  ExposeController,
  ExposeFailure,
} from "@/features/expose/use-expose";
import { useTranslation } from "@/features/i18n/use-translation";

type Translate = ReturnType<typeof useTranslation>["t"];

/** The words of one read failure. */
interface ReadCopy {
  readonly body: string;
  readonly title: string;
}

const readCopyOf = (code: ExposeErrorCode, t: Translate): ReadCopy => {
  if (code === "unsupported-format") {
    return {
      body: t("exposeUnsupportedBody"),
      title: t("exposeUnsupportedTitle"),
    };
  }
  if (code === "too-large") {
    return { body: t("exposeTooLargeBody"), title: t("exposeTooLargeTitle") };
  }
  return { body: t("exposeReadErrorBody"), title: t("exposeReadErrorTitle") };
};

/** A read failure: the case file is not drawn, and the words say why. */
const ExposeReadFailure = ({
  error,
  onReset,
  returnToBatch,
}: {
  readonly error: ExposeFailure;
  readonly onReset: () => void;
  readonly returnToBatch: boolean;
}) => {
  const { t } = useTranslation();
  const copy = readCopyOf(error.code, t);
  useEffect(() => {
    requestAnimationFrame(() => {
      document.querySelector<HTMLElement>("#expose-read-error")?.focus();
    });
  }, []);
  return (
    <section className="flex flex-col gap-4">
      <Note intent="danger">
        <h2
          className="font-display text-xl leading-6 font-black uppercase [font-stretch:75%] outline-hidden"
          id="expose-read-error"
          tabIndex={-1}
        >
          {copy.title}
        </h2>
        <p className="mt-1">{copy.body}</p>
      </Note>
      <Button
        className="self-start"
        intent="primary"
        onPress={onReset}
        size="md"
      >
        {t(returnToBatch ? "exposeBackToBatch" : "exposeTryAnother")}
      </Button>
    </section>
  );
};

/** The reading state: the exhibit and the case file keep their room. */
const ExposeReading = () => {
  const { t } = useTranslation();
  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
      <div className="border-rule bg-card flex min-h-56 flex-col items-center justify-center gap-3 border-2 p-6 text-center lg:col-span-4">
        <Loader aria-label={t("exposeReading")} variant="ring" />
        <p className="font-display text-xl leading-6 font-black uppercase [font-stretch:75%]">
          {t("exposeReading")}
        </p>
        <p className="text-muted-fg text-xs/5">{t("exposeReadingHint")}</p>
      </div>
      <div className="flex flex-col gap-3 lg:col-span-8">
        <div className="border-rule bg-muted h-6 w-40 border-2" />
        {Array.from({ length: 6 }, (_, index) => (
          <div
            className="border-rule bg-muted h-10 border-2"
            key={`reading-row-${index}`}
          />
        ))}
      </div>
    </div>
  );
};

/** The large-file confirm. Above 200 MB the read waits for a choice. */
const ExposeLargeDialog = ({
  onCancel,
  onConfirm,
  size,
  batchWarning,
  names,
}: {
  readonly onCancel: () => void;
  readonly onConfirm: () => void;
  readonly size: number;
  readonly batchWarning: boolean;
  readonly names: readonly string[];
}) => {
  const { locale, t } = useTranslation();
  return (
    <ModalContent
      aria-label={
        batchWarning ? t("exposeBatchLargeTitle") : t("exposeLargeTitle")
      }
      isOpen
      closeButton={false}
      onOpenChange={(open) => {
        if (!open) {
          onCancel();
        }
      }}
      role="alertdialog"
      size="sm"
    >
      <ModalHeader
        description={
          batchWarning ? t("exposeBatchLargeBody") : t("exposeLargeBody")
        }
        title={
          batchWarning ? t("exposeBatchLargeTitle") : t("exposeLargeTitle")
        }
      />
      <ModalBody>
        <ul className="mb-3 flex flex-col gap-1 text-sm [overflow-wrap:anywhere]">
          {names.map((name) => (
            <li key={name}>{name}</li>
          ))}
        </ul>
        <p className="num text-sm">
          {formatBytes(size, locale)} · {batchWarning ? "1 GB" : "200 MB"}
        </p>
      </ModalBody>
      <ModalFooter>
        <Button intent="primary" onPress={onConfirm} size="md">
          {t("exposeLargeRead")}
        </Button>
        <Button intent="plain" onPress={onCancel} size="md">
          {t("exposeLargeCancel")}
        </Button>
      </ModalFooter>
    </ModalContent>
  );
};

/** The polite summary a receipt prints, also read to assistive technology. */
const receiptSummaryOf = (
  expose: ExposeController,
  t: Translate
): string | null => {
  const { result } = expose;
  if (result === null) {
    return null;
  }
  const remaining = result.verification.selected.reduce(
    (total, entry) => total + entry.after,
    0
  );
  return [
    remaining === 0
      ? t("exposeVerificationSelectedZero")
      : t("exposeVerificationSelectedSome", { count: remaining }),
    result.verification.payload.unchanged
      ? t("exposeVerificationPayloadSame")
      : t("exposeVerificationPayloadChanged"),
    t("exposeDownload"),
  ].join(" · ");
};

/** The desk: the exhibit, the case file, the order, and the receipt. */
const ExposeDesk = ({ expose }: { readonly expose: ExposeController }) => {
  const { locale } = useTranslation();
  const { t } = useTranslation();
  const { actions, report, result, source } = expose;
  if (report === null) {
    return null;
  }
  return (
    <>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="lg:col-span-3">
          <div className="lg:sticky lg:top-4">
            <ExposeOrder
              canStart={expose.canStart}
              cancelled={expose.cancelled}
              cleanError={expose.cleanError}
              cleanProgress={expose.cleanProgress}
              cleaning={expose.cleaning}
              custom={expose.custom}
              onCancelClean={actions.cancelClean}
              onChooseAnother={
                expose.items.length > 1
                  ? actions.backToBatch
                  : actions.cleanAnother
              }
              onClean={actions.clean}
              onDownloadOriginal={actions.downloadOriginal}
              onSetCustom={actions.setCustom}
              onSetPreset={actions.setPreset}
              online={expose.online}
              preset={expose.preset}
              presetReasons={expose.presetReasons}
              report={report}
              summary={expose.summary}
            />
          </div>
        </div>
        <div className="min-w-0 lg:col-span-4">
          <ExposeExhibit locale={locale} report={report} source={source} />
        </div>
        <div className="min-w-0 lg:col-span-5">
          <ExposeReport report={report} />
        </div>
      </div>

      {result === null ? null : (
        <ExposeVerification
          beforeBytes={source?.bytes.size ?? result.file.bytes.size}
          locale={locale}
          onCleanAgain={actions.cleanAgain}
          onCleanAnother={
            expose.items.length > 1 ? actions.backToBatch : actions.cleanAnother
          }
          result={result}
        />
      )}

      <output aria-live="polite" className="sr-only">
        {receiptSummaryOf(expose, t) ?? ""}
      </output>
    </>
  );
};

/** Move the keyboard to the one red action mark, not the top of the page. */
const focusCleanMark = (): void => {
  const mark = document.querySelector<HTMLElement>("#expose-clean");
  mark?.scrollIntoView({ block: "center" });
  mark?.focus();
};

/** The phone bar names the Clean action without starting it. */
const ExposeMobileBar = ({ expose }: { readonly expose: ExposeController }) => {
  const { t } = useTranslation();
  return (
    <div className="border-rule bg-bg fixed inset-x-0 bottom-0 z-30 border-t-2 p-3 lg:hidden">
      <Button
        className="w-full"
        intent="primary"
        onPress={focusCleanMark}
        size="md"
      >
        <HiArrowDownTray aria-hidden="true" />
        {t("exposeCleanDirty", { fields: expose.summary.fields })}
      </Button>
    </div>
  );
};

/** A row opens the same desk used by a single-file Batch. */
const ExposeFileView = ({ expose }: { readonly expose: ExposeController }) => {
  const { actions, readError, report } = expose;
  const { t } = useTranslation();
  if (expose.batch) {
    return <ExposeBatch expose={expose} />;
  }
  if (readError !== null) {
    return (
      <>
        <ExposeReadFailure
          error={readError}
          onReset={
            expose.items.length > 1 ? actions.backToBatch : actions.cleanAnother
          }
          returnToBatch={expose.items.length > 1}
        />
        <div aria-live="assertive" className="sr-only" role="alert">
          {readCopyOf(readError.code, t).title}
        </div>
      </>
    );
  }
  if (report !== null) {
    return <ExposeDesk expose={expose} />;
  }
  return expose.items.length === 0 ? null : <ExposeReading />;
};

/**
 * Expose: the whole Tool.
 *
 * One Batch per session. The viewer renders from a report; the cleaner starts
 * only from **Clean**, and the receipt comes from a second read. The file and
 * its metadata never leave this tab.
 */
export const ExposePage = () => {
  const { t } = useTranslation();
  const expose = useExpose();
  const { actions, pendingLarge, reading, report, result } = expose;

  const empty = expose.items.length === 0;
  const showDesk = report !== null;
  const showBar =
    !expose.batch && showDesk && result === null && !expose.cleaning;

  return (
    <Container
      className={`flex flex-col gap-y-10 py-8 [--container-breakpoint:90rem] sm:py-10 ${
        showBar ? "pb-24 lg:pb-10" : ""
      }`}
    >
      <ExposeHeader />

      {pendingLarge === null ? null : (
        <ExposeLargeDialog
          onCancel={actions.dismissLarge}
          onConfirm={actions.confirmLarge}
          size={
            expose.pendingTotal ? expose.pendingBytes : pendingLarge.bytes.size
          }
          batchWarning={expose.pendingTotal}
          names={expose.pendingNames}
        />
      )}

      <ExposeEmpty
        watch={expose.watch}
        compact={!empty}
        onFiles={actions.openFiles}
        onSample={actions.openSample}
      />
      <p className="text-muted-fg text-xs/5">
        {t("exposeBatchMemory")} {t("exposeBatchLifetime")}
      </p>
      {expose.skipped + expose.duplicates > 0 ? (
        <output aria-live="polite" className="text-sm">
          {t("exposeBatchSkipped", {
            skipped: expose.skipped,
            duplicates: expose.duplicates,
          })}
        </output>
      ) : null}
      {expose.items.length > 1 && !expose.batch && expose.readError === null ? (
        <Button
          className="self-start"
          intent="outline"
          onPress={actions.backToBatch}
          size="md"
        >
          {t("exposeBackToBatch")}
        </Button>
      ) : null}

      <ExposeFileView expose={expose} />

      <output aria-live="polite" className="sr-only">
        {reading ? t("exposeReading") : ""}
      </output>

      <ExposeExplainer />

      {showBar ? <ExposeMobileBar expose={expose} /> : null}
    </Container>
  );
};
