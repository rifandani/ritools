import { Link as AriaLink } from "react-aria-components/Link";
import { LuArrowUpRight } from "react-icons/lu";

import { buttonStyles } from "@/core/components/ui/button";
import { Ransom } from "@/core/components/ui/ransom";
import { useTranslation } from "@/features/i18n/use-translation";
import type { TOOLS } from "@/features/tools/tools";

/**
 * The path of one link. It leaves this tab, the Relay keeps nothing, the
 * video site has the file, and this tab builds the download.
 */
const STOPS = [
  { id: "out", where: "homeRelayStopTab", what: "homeRelayStopLink" },
  { id: "relay", where: "homeRelayStopRelay", what: "homeRelayStopKeeps" },
  { id: "site", where: "homeRelayStopSite", what: "homeRelayStopVideo" },
  { id: "back", where: "homeRelayStopTab", what: "homeRelayStopFile" },
] as const;

/**
 * One Relay on an ink field. The field is the part of the catalog whose
 * request leaves the device. The four stops are that request, in order.
 */
export const RelayPlate = ({
  tool,
}: {
  readonly tool: (typeof TOOLS)[number];
}) => {
  const { t } = useTranslation();

  return (
    <li className="home-relay-plate ground-ink">
      <div className="home-relay-name">
        <Ransom as="h3" className="home-relay-ransom" fit ground="ink">
          {tool.name}
        </Ransom>
      </div>
      <ol aria-label={t("homeRelayRouteLabel")} className="home-relay-route">
        {STOPS.map((stop) => (
          <li key={stop.id}>
            <span aria-hidden="true" className="home-relay-stop" />
            <span className="home-relay-where">{t(stop.where)}</span>
            <span className="home-relay-what">{t(stop.what)}</span>
          </li>
        ))}
      </ol>
      <div className="home-relay-foot">
        <p className="home-catalog-promise">{t(tool.promiseKey)}</p>
        <ul className="home-catalog-facts">
          {tool.factKeys.map((key) => (
            <li key={key}>{t(key)}</li>
          ))}
        </ul>
        <AriaLink
          className={`${buttonStyles({ size: "md" })} home-catalog-open home-relay-open`}
          href={tool.path}
        >
          {t("homeOpenTool", { tool: tool.name })}
          <LuArrowUpRight aria-hidden="true" />
        </AriaLink>
      </div>
    </li>
  );
};
