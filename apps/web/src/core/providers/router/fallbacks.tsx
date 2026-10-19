import type { ErrorComponentProps } from "@tanstack/react-router";

import { Button } from "@/core/components/ui/button";
import { Link } from "@/core/components/ui/link";
import { reportError } from "@/core/observability/logger";
import { useTranslation } from "@/features/i18n/use-translation";

export const PendingRoute = () => (
  <div className="flex items-center justify-center">
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      height="5em"
      className="text-primary"
    >
      {/* svg-spinners: 3-dots-fade */}
      <circle cx="4" cy="12" r="3" fill="currentColor">
        <animate
          id="pending-dot-1"
          fill="freeze"
          attributeName="opacity"
          begin="0;pending-dot-3.end-0.25s"
          dur="0.75s"
          values="1;0.2"
        />
      </circle>
      <circle cx="12" cy="12" r="3" fill="currentColor" opacity="0.4">
        <animate
          fill="freeze"
          attributeName="opacity"
          begin="pending-dot-1.begin+0.15s"
          dur="0.75s"
          values="1;0.2"
        />
      </circle>
      <circle cx="20" cy="12" r="3" fill="currentColor" opacity="0.3">
        <animate
          id="pending-dot-3"
          fill="freeze"
          attributeName="opacity"
          begin="pending-dot-1.begin+0.3s"
          dur="0.75s"
          values="1;0.2"
        />
      </circle>
    </svg>
  </div>
);
export const ErrorRoute = ({ reset, error, info }: ErrorComponentProps) => {
  reportError("[ErrorRoute]: Error", { error, errorInfo: info });
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4">
      <div className="max-w-md space-y-8 text-center">
        {/* Hero Section */}
        <div className="space-y-4">
          <h1 className="text-primary text-8xl font-bold">4xx</h1>
          <h2 className="text-2xl font-semibold">Oops!</h2>
          <p className="text-muted-fg">Something went wrong</p>
        </div>

        {/* Quick Actions */}
        <div className="flex flex-col justify-center gap-4 sm:flex-row">
          <Button
            intent="primary"
            className="flex items-center"
            onClick={
              // Attempt to recover by trying to re-render the segment
              () => reset()
            }
          >
            Try again
          </Button>
        </div>
      </div>
    </div>
  );
};
export const NotFoundRoute = () => {
  const { t } = useTranslation();
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4">
      <div className="max-w-md space-y-8 text-center">
        {/* Hero Section */}
        <div className="space-y-4">
          <h1 className="text-primary text-8xl font-bold">404</h1>
          <h2 className="text-2xl font-semibold">{t("notFound")}</h2>
          <p className="text-muted-fg">{t("gone")}</p>
        </div>

        {/* Quick Actions */}
        <div className="flex flex-col justify-center gap-4 sm:flex-row">
          <Link href="/" className="flex items-center">
            {t("backTo", {
              target: "Home",
            })}
          </Link>
        </div>
      </div>
    </div>
  );
};
