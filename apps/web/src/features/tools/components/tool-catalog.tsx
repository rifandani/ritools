import { Link as AriaLink } from "react-aria-components/Link";
import { LuArrowUpRight } from "react-icons/lu";

import { buttonStyles } from "@/core/components/ui/button";
import { Ransom } from "@/core/components/ui/ransom";
import { useTranslation } from "@/features/i18n/use-translation";
import { TOOL_GROUPS, TOOLS } from "@/features/tools/tools";

import { EditorPreview } from "./editor-preview";
import { RelayPlate } from "./relay-plate";

import "./tool-catalog.css";

/** One entry keeps its promise, facts, and action together in reading order. */
const CatalogEntry = ({ tool }: { readonly tool: (typeof TOOLS)[number] }) => {
  const { t } = useTranslation();
  const isEditor = tool.group === "editor";

  return (
    <li className="home-catalog-entry" data-group={tool.group}>
      {isEditor ? <EditorPreview name={tool.name} /> : null}
      <div className="home-catalog-content">
        <div
          className={
            isEditor ? "home-catalog-name" : "home-catalog-name ground-ink"
          }
        >
          <Ransom
            as="h3"
            className="home-catalog-ransom"
            fit
            ground={isEditor ? "paper" : "ink"}
          >
            {tool.name}
          </Ransom>
        </div>
        <div className="home-catalog-body">
          <p className="home-catalog-promise">{t(tool.promiseKey)}</p>
          <ul className="home-catalog-facts">
            {tool.factKeys.map((key) => (
              <li key={key}>{t(key)}</li>
            ))}
          </ul>
          <AriaLink
            className={`${buttonStyles({ size: "md" })} home-catalog-open`}
            href={tool.path}
          >
            {t("homeOpenTool", { tool: tool.name })}
            <LuArrowUpRight aria-hidden="true" />
          </AriaLink>
        </div>
      </div>
    </li>
  );
};

/** The home page uses the same Tool groups and order as the shared shell. */
export const ToolCatalog = () => {
  const { t } = useTranslation();

  return (
    <div className="home-catalog">
      {TOOL_GROUPS.map(({ group, labelKey }) => {
        const entries = TOOLS.filter((tool) => tool.group === group);

        return (
          <section
            aria-labelledby={`home-${group}-title`}
            className="home-catalog-group"
            data-group={group}
            key={group}
          >
            <div className="home-catalog-heading">
              <h2 id={`home-${group}-title`}>
                {t(group === "tool" ? "toolsTitle" : labelKey)}
              </h2>
              <span className="num home-catalog-count">
                {String(entries.length).padStart(2, "0")}
              </span>
            </div>
            {group === "relay" ? (
              <ul className="home-relay-list">
                {entries.map((tool) => (
                  <RelayPlate key={tool.path} tool={tool} />
                ))}
              </ul>
            ) : (
              <ul className="home-catalog-grid" data-group={group}>
                {entries.map((tool) => (
                  <CatalogEntry key={tool.path} tool={tool} />
                ))}
              </ul>
            )}
          </section>
        );
      })}
    </div>
  );
};
