"use client";

import { createContext, useContext } from "react";
import type { ComponentProps, ReactNode } from "react";
import { UNSAFE_PortalProvider as PortalProvider } from "react-aria/PortalProvider";
import { HiArrowsPointingIn, HiArrowsPointingOut } from "react-icons/hi2";

import { useFullscreen } from "@/core/hooks/use-fullscreen";
import { useTranslation } from "@/features/i18n/use-translation";

import { Button } from "./ui/button";
import type { ButtonProps } from "./ui/button";
import { Note } from "./ui/note";
import { Tooltip, TooltipContent } from "./ui/tooltip";

import "./fullscreen.css";

const FullscreenContext = createContext<ReturnType<
  typeof useFullscreen
> | null>(null);

const useFullscreenContext = () => {
  const context = useContext(FullscreenContext);
  if (!context) {
    throw new Error("Fullscreen controls need a FullscreenScope.");
  }
  return context;
};

/** Include the page's dialogs in this scope, even when they sit outside its frame. */
export const FullscreenScope = ({
  children,
}: {
  readonly children: ReactNode;
}) => {
  const fullscreen = useFullscreen();
  return (
    <FullscreenContext value={fullscreen}>
      <PortalProvider
        getContainer={fullscreen.active ? () => fullscreen.element : null}
      >
        {children}
      </PortalProvider>
    </FullscreenContext>
  );
};

export const FullscreenFrame = ({
  as: Tag = "div",
  children,
  className = "",
  ...props
}: Omit<ComponentProps<"div">, "ref"> & {
  readonly as?: "div" | "section";
}) => {
  const { ref, failed } = useFullscreenContext();
  const { t } = useTranslation();
  return (
    <Tag {...props} ref={ref} className={`fullscreen-frame ${className}`}>
      {failed ? (
        <Note intent="danger" role="alert">
          {t("fullscreenFailed")}
        </Note>
      ) : null}
      {children}
    </Tag>
  );
};

export const FullscreenButton = ({
  onlyWhenActive = false,
  size = "sq-md",
  ...props
}: Pick<ButtonProps, "id" | "className" | "size"> & {
  readonly onlyWhenActive?: boolean;
}) => {
  const { active, supported, toggle } = useFullscreenContext();
  const { t } = useTranslation();
  if (onlyWhenActive && !active) {
    return null;
  }
  const label = t(active ? "fullscreenExit" : "fullscreenEnter");
  return (
    <Tooltip delay={300}>
      <Button
        {...props}
        intent="outline"
        size={size}
        aria-label={label}
        aria-description={supported ? undefined : t("fullscreenUnavailable")}
        isDisabled={!supported}
        onPress={() => {
          void toggle();
        }}
      >
        {active ? (
          <HiArrowsPointingIn aria-hidden />
        ) : (
          <HiArrowsPointingOut aria-hidden />
        )}
      </Button>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
};
