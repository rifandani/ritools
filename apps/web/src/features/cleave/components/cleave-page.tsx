import { useAtomSet, useAtomValue } from "@effect/atom-react";
import { useEffect, useRef } from "react";

import { FullscreenFrame, FullscreenScope } from "@/core/components/fullscreen";
import { Button } from "@/core/components/ui/button";
import { Container } from "@/core/components/ui/container";
import { Loader } from "@/core/components/ui/loader";
import { Note } from "@/core/components/ui/note";
import { useTranslation } from "@/features/i18n/use-translation";

import { fileAtoms } from "../cleave.files.atoms";
import { CleaveExplainer } from "./cleave-explainer";
import { CleaveFile } from "./cleave-file";
import { CleaveTabs } from "./cleave-tabs";

import "./cleave.css";

export const CleavePage = () => {
  const { t } = useTranslation();
  const files = useAtomValue(fileAtoms.files);
  const root = useRef<HTMLDivElement>(null);
  const previousSelection = useRef(files.selected);
  const ready = useAtomValue(fileAtoms.ready);
  const failure = useAtomValue(fileAtoms.failure);
  const saving = useAtomValue(fileAtoms.saving);
  const command = useAtomSet(fileAtoms.command);
  useEffect(() => {
    command({ type: "load" });
  }, [command]);
  useEffect(() => {
    if (
      previousSelection.current &&
      previousSelection.current !== files.selected
    ) {
      const navigation = root.current?.querySelector(".cleave-tabs");
      const target =
        navigation?.querySelector<HTMLElement>("[aria-current='page']") ??
        navigation?.querySelector<HTMLElement>(".cleave-tab-add");
      target?.focus({ preventScroll: true });
    }
    previousSelection.current = files.selected;
  }, [files.selected]);
  if (!ready && !failure) {
    return (
      <Container
        ref={root}
        className="flex max-w-none flex-1 items-center justify-center py-6 sm:py-8"
      >
        <Loader aria-label={t("loading")} />
      </Container>
    );
  }
  const selected = files.entries.find((file) => file.id === files.selected);
  const navigation = (
    <CleaveTabs
      files={files}
      disabled={!ready}
      onAdd={() => command({ type: "add" })}
      onSelect={(id) => command({ type: "select", id })}
      onClose={(id) => command({ type: "close", id })}
      onReorder={(id, target) => command({ type: "reorder", id, target })}
    />
  );
  return (
    <FullscreenScope>
      <Container ref={root} className="max-w-none min-w-0 py-6 sm:py-8">
        {failure ? (
          <Note role="alert" intent="danger" className="mb-4">
            <p>
              {t(
                failure === "read"
                  ? "cleaveStorageReadError"
                  : "cleaveStorageWriteError"
              )}
            </p>
            <Button
              intent="outline"
              onPress={() => command({ type: ready ? "retry" : "load" })}
            >
              {t("cleaveRetrySave")}
            </Button>
          </Note>
        ) : null}
        <output className="sr-only">
          {ready && !failure ? t(saving ? "cleaveSaving" : "cleaveSaved") : ""}
        </output>
        {selected ? (
          <FullscreenFrame
            id="cleave-frame"
            className="cleave-workspace"
            as="section"
            aria-label={t("cleaveActiveFile")}
          >
            <CleaveFile
              key={selected.id}
              file={selected}
              navigation={navigation}
            />
          </FullscreenFrame>
        ) : (
          <>
            {navigation}
            {ready ? (
              <p className="text-muted-fg py-8">{t("cleaveNoFiles")}</p>
            ) : (
              <Loader aria-label={t("loading")} />
            )}
          </>
        )}
        <CleaveExplainer />
      </Container>
    </FullscreenScope>
  );
};
