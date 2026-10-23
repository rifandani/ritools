"use client";

import { useMemo } from "react";
import { HiCheck, HiExclamationCircle, HiMinus } from "react-icons/hi2";

import { Button, buttonStyles } from "@/core/components/ui/button";
import { Note } from "@/core/components/ui/note";
import { useObjectUrl } from "@/features/expose/components/use-object-url";
import type {
  CleanResult,
  CleanWarningCode,
  Verification,
} from "@/features/expose/expose";
import {
  formatBytes,
  GROUP_KEY,
  verificationPassed,
} from "@/features/expose/expose.view";
import { useTranslation } from "@/features/i18n/use-translation";

type Translate = ReturnType<typeof useTranslation>["t"];

const WARNING_KEY = {
  "c2pa-not-validated": "exposeAiNotValidated",
  "format-limit": "exposeVerificationFormatLimit",
  "maker-note-removed": "exposeVerificationMakerNote",
} as const satisfies Record<CleanWarningCode, string>;

/** One receipt line: a square mark, a word for the state, and the detail. */
const ReceiptRow = ({
  state,
  text,
}: {
  readonly state: "done" | "fail" | "none";
  readonly text: string;
}) => {
  const Icon =
    state === "done"
      ? HiCheck
      : state === "fail"
        ? HiExclamationCircle
        : HiMinus;
  return (
    <div className="flex gap-3 py-2">
      <span
        aria-hidden="true"
        className="border-rule mt-0.5 grid size-5 shrink-0 place-content-center border-2"
      >
        <Icon className="size-3.5" />
      </span>
      <p className="text-sm/6">{text}</p>
    </div>
  );
};

interface ReceiptLine {
  readonly state: "done" | "fail" | "none";
  readonly text: string;
}

const c2paLineOf = (verification: Verification, t: Translate): ReceiptLine => {
  if (verification.c2pa.beforeBytes === 0) {
    return { state: "none", text: t("exposeVerificationC2paNone") };
  }
  return verification.c2pa.afterBytes === 0
    ? { state: "done", text: t("exposeVerificationC2paGone") }
    : { state: "fail", text: t("exposeVerificationC2paRemains") };
};

/**
 * The Verification: a receipt from a second read of the Cleaned File.
 *
 * It is part of the page, not a toast. The Download is offered only when every
 * selected group reads 0 and the payload hash is unchanged.
 */
export const ExposeVerification = ({
  locale,
  onCleanAgain,
  onCleanAnother,
  result,
}: {
  readonly locale: string;
  readonly onCleanAgain: () => void;
  readonly onCleanAnother: () => void;
  readonly result: CleanResult;
}) => {
  const { t } = useTranslation();
  const { verification } = result;
  const blob = useMemo(() => {
    // A copy on a plain ArrayBuffer, so the Blob part is never a view on a
    // SharedArrayBuffer the browser could refuse.
    const copy = new Uint8Array(result.file.bytes.length);
    copy.set(result.file.bytes);
    return new Blob([copy.buffer], { type: result.file.type });
  }, [result.file.bytes, result.file.type]);
  const url = useObjectUrl(blob);
  const passed = verificationPassed(verification);

  const remaining = verification.selected.reduce(
    (total, entry) => total + entry.after,
    0
  );
  const before =
    verification.selected.reduce((total, entry) => total + entry.before, 0) +
    verification.kept.reduce((total, entry) => total + entry.before, 0) +
    verification.display.before;
  const kept: { count: number; name: string }[] = [];
  for (const entry of verification.kept) {
    if (entry.after > 0) {
      kept.push({ count: entry.after, name: t(GROUP_KEY[entry.group]) });
    }
  }
  const keptLine =
    kept.length === 0
      ? t("exposeVerificationKeptNone")
      : t("exposeVerificationKept", {
          groups: kept
            .map((entry) => `${entry.name} (${entry.count})`)
            .join(", "),
        });
  const c2pa = c2paLineOf(verification, t);

  return (
    <section
      aria-labelledby="expose-verification-title"
      className="border-rule bg-card border-t-fg flex flex-col gap-4 border-2 border-t-[3px] p-4 sm:p-5"
    >
      <div className="flex flex-col gap-1">
        <h2
          className="font-display text-[clamp(1.75rem,4vw,2.5rem)] leading-none font-black tracking-[0.01em] uppercase [font-stretch:75%] outline-hidden"
          id="expose-verification-title"
          tabIndex={-1}
        >
          {t("exposeVerificationTitle")}
        </h2>
        <p className="text-muted-fg text-xs/5">{t("exposeVerificationDeck")}</p>
      </div>

      <div className="border-rule divide-rule divide-y-2 border-y-2">
        <ReceiptRow
          state={remaining === 0 ? "done" : "fail"}
          text={
            remaining === 0
              ? t("exposeVerificationSelectedZero")
              : t("exposeVerificationSelectedSome", { count: remaining })
          }
        />
        <ReceiptRow
          state={kept.length === 0 ? "none" : "done"}
          text={keptLine}
        />
        <ReceiptRow state="done" text={t("exposeVerificationDisplay")} />
        <ReceiptRow
          state={verification.payload.unchanged ? "done" : "fail"}
          text={
            verification.payload.unchanged
              ? t("exposeVerificationPayloadSame")
              : t("exposeVerificationPayloadChanged")
          }
        />
        <ReceiptRow state={c2pa.state} text={c2pa.text} />
        <ReceiptRow
          state="none"
          text={`${t("exposeVerificationRemoved", {
            fields: result.removed.reduce(
              (total, entry) => total + (entry.before - entry.after),
              0
            ),
            groups: result.removed.length,
          })} · ${t("exposeVerificationCounts", {
            after: verification.read.counts.fields,
            before,
          })}`}
        />
      </div>

      {result.warnings.length === 0 ? null : (
        <div className="flex flex-col gap-2">
          {result.warnings.map((warning) => (
            <Note intent="warning" key={warning.code}>
              {t(WARNING_KEY[warning.code])}
            </Note>
          ))}
        </div>
      )}

      <div className="flex flex-col gap-2">
        <a
          aria-disabled={passed ? undefined : true}
          className={buttonStyles({
            className: passed
              ? "w-full"
              : "pointer-events-none w-full opacity-60",
            intent: "primary",
            size: "md",
          })}
          download={result.file.name}
          href={passed ? (url ?? undefined) : undefined}
        >
          {t("exposeDownload")}
        </a>
        <p className="text-muted-fg text-xs/5">
          {t("exposeDownloadLine", { name: result.file.name })}{" "}
          <span className="num">
            {formatBytes(result.file.bytes.byteLength, locale)}
          </span>
        </p>
        {passed ? null : (
          <Note intent="danger">{t("exposeVerificationPayloadChanged")}</Note>
        )}
      </div>

      <div className="border-rule flex flex-wrap items-center gap-2 border-t-2 pt-3">
        <Button intent="outline" onPress={onCleanAgain} size="sm">
          {t("exposeCleanAgain")}
        </Button>
        <Button intent="plain" onPress={onCleanAnother} size="sm">
          {t("exposeCleanAnother")}
        </Button>
      </div>

      <p className="text-muted-fg num text-xs/5">
        {result.engine.name} {result.engine.version}
      </p>
    </section>
  );
};
