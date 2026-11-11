"use client";

import { useState } from "react";
import { HiArrowDownTray } from "react-icons/hi2";

import { Button } from "@/core/components/ui/button";
import { Description, Label } from "@/core/components/ui/field";
import { Input } from "@/core/components/ui/input";
import { Note } from "@/core/components/ui/note";
import { TextField } from "@/core/components/ui/text-field";
import type { SnagController } from "@/features/snag/use-snag";

/** The one input of Snag: a Video Link, and the rights notice under it. */
export const SnagLinkForm = ({
  controller,
}: {
  readonly controller: SnagController;
}) => {
  const { problem, reading, submit, t } = controller;
  const [text, setText] = useState("");
  const send = async () => {
    if (text.trim() === "") {
      return;
    }
    const outcome = await submit(text);
    if (outcome.card !== null) {
      setText("");
    }
  };
  const problemText =
    problem === null
      ? null
      : t(
          problem === "playlist" ? "snagProblemPlaylist" : "snagProblemNotALink"
        );

  return (
    <section aria-label={t("snagLinkLabel")} className="flex flex-col gap-4">
      {/* Snag checks the link itself: native URL checks would refuse a link
          without a scheme and block the next submit after a problem. */}
      <form
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          void send();
        }}
      >
        <TextField
          isInvalid={problemText !== null}
          validationBehavior="aria"
          onChange={setText}
          value={text}
        >
          <Label>{t("snagLinkLabel")}</Label>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-stretch">
            <Input
              autoComplete="off"
              inputMode="url"
              placeholder="https://www.youtube.com/watch?v=…"
              spellCheck={false}
              type="url"
            />
            <Button
              className="shrink-0 max-sm:w-full"
              intent="primary"
              isDisabled={text.trim() === "" || reading}
              isPending={reading}
              type="submit"
            >
              <HiArrowDownTray aria-hidden />
              {reading ? t("snagReading") : t("snagSubmit")}
            </Button>
          </div>
          {problemText === null ? (
            <Description>{t("snagLinkHint")}</Description>
          ) : (
            <p className="text-danger-subtle-fg text-sm/6" role="alert">
              {problemText}
            </p>
          )}
        </TextField>
      </form>
      <Note intent="warning">
        <p className="text-sm/6">
          <strong>{t("snagRightsTitle")}</strong> {t("snagRightsBody")}
        </p>
      </Note>
    </section>
  );
};
