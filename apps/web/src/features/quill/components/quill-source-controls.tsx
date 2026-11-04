/* oxlint-disable jsx-a11y/prefer-tag-over-role -- The CodeMirror caret keeps focus while aria-activedescendant names a popup option. */
import { Fragment } from "react";
import type { ReactNode } from "react";
import { createPortal } from "react-dom";
import {
  HiBold,
  HiItalic,
  HiStrikethrough,
  HiCodeBracket,
  HiLink,
  HiListBullet,
  HiNumberedList,
  HiChatBubbleBottomCenterText,
  HiTableCells,
  HiPhoto,
  HiMinus,
  HiVariable,
  HiShare,
} from "react-icons/hi2";
import {
  LuHeading1,
  LuHeading2,
  LuHeading3,
  LuHeading4,
  LuHeading5,
  LuHeading6,
  LuPilcrow,
  LuAlignLeft,
  LuAlignCenter,
  LuAlignRight,
  LuPilcrowRight,
} from "react-icons/lu";

import { Button } from "@/core/components/ui/button";
import {
  Menu,
  MenuContent,
  MenuItem,
  MenuLabel,
  MenuSeparator,
} from "@/core/components/ui/menu";
import { Toolbar } from "@/core/components/ui/toolbar";
import { Tooltip, TooltipContent } from "@/core/components/ui/tooltip";
import { useTranslation } from "@/features/i18n/use-translation";

import type { blockCommands, SourceCommand } from "../quill.commands";

const headings = [
  ["paragraph", "quillParagraph", LuPilcrow],
  ["h1", "quillHeading1", LuHeading1],
  ["h2", "quillHeading2", LuHeading2],
  ["h3", "quillHeading3", LuHeading3],
  ["h4", "quillHeading4", LuHeading4],
  ["h5", "quillHeading5", LuHeading5],
  ["h6", "quillHeading6", LuHeading6],
] as const;
const controls = [
  ["bold", "quillBold", HiBold],
  ["italic", "quillItalic", HiItalic],
  ["strike", "quillStrike", HiStrikethrough],
  ["inline-code", "quillInlineCode", HiCodeBracket],
  ["quote", "quillQuote", HiChatBubbleBottomCenterText],
  ["bullet", "quillBullet", HiListBullet],
  ["ordered", "quillOrdered", HiNumberedList],
  ["link", "quillLink", HiLink],
  ["image", "quillImage", HiPhoto],
  ["table", "quillTable", HiTableCells],
  ["rule", "quillRule", HiMinus],
  ["math", "quillMath", HiVariable],
  ["diagram", "quillDiagram", HiShare],
] as const;
const alignments = [
  ["align-left", "quillAlignLeft", LuAlignLeft],
  ["align-center", "quillAlignCenter", LuAlignCenter],
  ["align-right", "quillAlignRight", LuAlignRight],
] as const;
const AlignmentMenu = ({
  onCommand,
}: {
  readonly onCommand: (id: SourceCommand) => void;
}) => {
  const { t } = useTranslation();
  return (
    <Menu>
      <Tooltip delay={300}>
        <Button intent="plain" size="sq-sm" aria-label={t("quillAlignment")}>
          <LuAlignLeft aria-hidden="true" />
        </Button>
        <TooltipContent>{t("quillAlignment")}</TooltipContent>
      </Tooltip>
      <MenuContent aria-label={t("quillAlignment")}>
        {alignments.map(([id, key, Icon]) => (
          <MenuItem key={id} textValue={t(key)} onAction={() => onCommand(id)}>
            <Icon aria-hidden="true" />
            <MenuLabel>{t(key)}</MenuLabel>
          </MenuItem>
        ))}
        <MenuSeparator />
        <MenuItem textValue={t("quillRtl")} onAction={() => onCommand("rtl")}>
          <LuPilcrowRight aria-hidden="true" />
          <MenuLabel>{t("quillRtl")}</MenuLabel>
        </MenuItem>
      </MenuContent>
    </Menu>
  );
};
export const QuillSourceToolbar = ({
  onCommand,
  actions,
}: {
  readonly onCommand: (id: SourceCommand) => void;
  readonly actions: ReactNode;
}) => {
  const { t } = useTranslation();
  return (
    <Toolbar aria-label={t("quillFormat")} className="quill-source-toolbar">
      <Menu>
        <Tooltip delay={300}>
          <Button intent="plain" size="sm" aria-label={t("quillHeading")}>
            H
          </Button>
          <TooltipContent>{t("quillHeading")}</TooltipContent>
        </Tooltip>
        <MenuContent aria-label={t("quillHeading")}>
          {headings.map(([id, key, Icon]) => (
            <MenuItem
              key={id}
              textValue={t(key)}
              onAction={() => onCommand(id)}
            >
              <Icon aria-hidden="true" />
              <MenuLabel>{t(key)}</MenuLabel>
            </MenuItem>
          ))}
        </MenuContent>
      </Menu>
      {controls.map(([id, key, Icon]) => (
        <Fragment key={id}>
          <Tooltip delay={300}>
            <Button
              intent="plain"
              size="sq-sm"
              aria-label={t(key)}
              onPress={() => onCommand(id)}
            >
              <Icon aria-hidden="true" />
            </Button>
            <TooltipContent>{t(key)}</TooltipContent>
          </Tooltip>
          {id === "ordered" ? <AlignmentMenu onCommand={onCommand} /> : null}
        </Fragment>
      ))}
      {actions}
    </Toolbar>
  );
};

export const QuillSlashMenu = ({
  slash,
  matches,
  active,
  onCommand,
}: {
  readonly slash: { readonly left: number; readonly top: number } | null;
  readonly matches: readonly (typeof blockCommands)[number][];
  readonly active: number;
  readonly onCommand: (id: SourceCommand) => void;
}) => {
  const { t } = useTranslation();
  return slash
    ? createPortal(
        <div
          className="quill-slash"
          style={{
            left: slash.left,
            top: Math.min(slash.top, Math.max(8, innerHeight - 330)),
          }}
        >
          <div className="quill-slash-title">{t("quillInsert")}</div>
          <div
            role="listbox"
            aria-label={t("quillInsert")}
            id="quill-slash-commands"
            className="quill-slash-list"
          >
            {matches.length ? (
              matches.map((item, index) => (
                <div
                  key={item.id}
                  id={`quill-command-${item.id}`}
                  role="option"
                  aria-selected={index === active}
                  className="quill-slash-option"
                  onPointerDown={(event) => {
                    event.preventDefault();
                    onCommand(item.id);
                  }}
                >
                  <span className="quill-command-mark" aria-hidden="true">
                    {"prefix" in item ? item.prefix.trim() || "P" : "/"}
                  </span>
                  <span>{t(item.label)}</span>
                </div>
              ))
            ) : (
              <p className="p-3 text-sm">{t("quillNoCommands")}</p>
            )}
          </div>
        </div>,
        document.body
      )
    : null;
};
