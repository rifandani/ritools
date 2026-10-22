import type { ErrorComponentProps } from "@tanstack/react-router";
import type { ReactNode } from "react";

import { Button } from "@/core/components/ui/button";
import { Link } from "@/core/components/ui/link";
import { Loader } from "@/core/components/ui/loader";
import { reportError } from "@/core/observability/logger";
import { useTranslation } from "@/features/i18n/use-translation";

export const PendingRoute = () => {
  const { t } = useTranslation();
  return (
    <div className="flex items-center justify-center py-24">
      <Loader
        aria-label={t("loading")}
        className="text-primary-ink size-12"
        variant="ring"
      />
    </div>
  );
};

/**
 * The poster both fallbacks share: the code in the numerals face, a red
 * slash, then the words and one way out.
 */
const FallbackPoster = ({
  code,
  title,
  message,
  action,
}: {
  code: string;
  title: string;
  message: string;
  action: ReactNode;
}) => (
  <div className="flex min-h-[calc(100svh-4rem)] flex-col justify-center px-4 py-16 sm:px-10 lg:px-16">
    <div className="flex max-w-3xl flex-col items-start">
      <p
        aria-hidden
        className="num text-fg text-[clamp(6.5rem,28vw,15rem)] leading-[0.82] font-extrabold"
      >
        {code}
      </p>
      <span
        aria-hidden
        className="bg-primary mt-5 mb-8 block h-3 w-44 -skew-x-16"
      />
      <h1 className="font-display text-[clamp(2rem,6vw,3.25rem)] leading-none font-black tracking-[0.01em] uppercase [font-stretch:75%]">
        {title}
      </h1>
      <p className="text-muted-fg mt-4 max-w-[52ch] text-lg/7">{message}</p>
      <div className="mt-10 flex flex-wrap items-center gap-4">{action}</div>
    </div>
  </div>
);

export const ErrorRoute = ({ reset, error, info }: ErrorComponentProps) => {
  reportError("[ErrorRoute]: Error", { error, errorInfo: info });
  const { t } = useTranslation();
  return (
    <FallbackPoster
      action={
        <Button
          intent="primary"
          onClick={
            // Attempt to recover by trying to re-render the segment
            () => reset()
          }
          size="lg"
        >
          {t("errorRetry")}
        </Button>
      }
      code={t("errorCode")}
      message={t("errorMessage")}
      title={t("errorTitle")}
    />
  );
};

export const NotFoundRoute = () => {
  const { t } = useTranslation();
  return (
    <FallbackPoster
      action={
        <Link className="text-lg" href="/">
          {t("backTo", {
            target: t("title"),
          })}
        </Link>
      }
      code="404"
      message={t("gone")}
      title={t("notFound")}
    />
  );
};
