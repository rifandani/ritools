import { Component, lazy, Suspense, useState } from "react";
import type { ComponentType, ReactNode } from "react";

import { Button } from "@/core/components/ui/button";
import { Note } from "@/core/components/ui/note";
import { loadLibrary } from "@/core/libs/library-load";
import { useTranslation } from "@/features/i18n/use-translation";

class LibraryBoundary extends Component<
  { children: ReactNode; fallback: ReactNode },
  { failed: boolean }
> {
  constructor(props: { children: ReactNode; fallback: ReactNode }) {
    super(props);
    this.state = { failed: false };
  }

  static getDerivedStateFromError() {
    return { failed: true };
  }

  override render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

/** A fresh React.lazy instance makes a rejected import retryable; parent data stays mounted. */
export const LazyLibrary = <P extends object>({
  name,
  load,
  componentProps,
}: {
  name: string;
  load: () => Promise<{ default: ComponentType<P> }>;
  componentProps: P;
}) => {
  const { t } = useTranslation();
  const [attempt, setAttempt] = useState(0);
  const [view, setView] = useState(() => lazy(() => loadLibrary(name, load)));
  const View = view;
  return (
    <LibraryBoundary
      key={attempt}
      fallback={
        <Note intent="danger" className="m-3">
          <p>{t("libraryLoadFailed", { library: name })}</p>
          <div className="mt-3 flex gap-2">
            <Button
              intent="outline"
              onPress={() => {
                setView(() => lazy(() => loadLibrary(name, load)));
                setAttempt((value) => value + 1);
              }}
            >
              {t("errorRetry")}
            </Button>
            <Button intent="plain" onPress={() => window.location.reload()}>
              {t("reload")}
            </Button>
          </div>
        </Note>
      }
    >
      <Suspense
        fallback={<output className="p-3 text-sm">{t("loading")}</output>}
      >
        <View {...componentProps} />
      </Suspense>
    </LibraryBoundary>
  );
};
