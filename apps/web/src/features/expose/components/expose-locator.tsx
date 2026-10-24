"use client";

/* oxlint-disable jsx-a11y/prefer-tag-over-role -- the Offline Locator is an inline SVG map with one pin, not an image file */

import { HiClipboard } from "react-icons/hi2";

import { Button } from "@/core/components/ui/button";
import { copyText } from "@/features/expose/components/expose-copy";
import type { GpsPoint } from "@/features/expose/expose";
import {
  altitudeLine,
  coordinateLine,
  formatCoordinate,
} from "@/features/expose/expose.view";
import {
  WORLD_LAND_PATH,
  WORLD_VIEW_HEIGHT,
  WORLD_VIEW_WIDTH,
} from "@/features/expose/expose.world.generated";
import { useTranslation } from "@/features/i18n/use-translation";

/** The pin's place on the plate, in viewBox units. */
const pinOf = (point: GpsPoint) => ({
  x: ((point.longitude + 180) / 360) * WORLD_VIEW_WIDTH,
  y: ((90 - point.latitude) / 180) * WORLD_VIEW_HEIGHT,
});

/**
 * The Offline Locator: an ink plate with a world outline, one pin, the
 * coordinates, and a copy action. It loads no tiles, does no reverse
 * geocoding, and never links out. The coordinates are always text, so the map
 * is evidence beside the words, never the only source.
 */
export const ExposeLocator = ({ gps }: { readonly gps: GpsPoint | null }) => {
  const { t } = useTranslation();
  const point = gps === null ? null : pinOf(gps);
  const line = gps === null ? "" : coordinateLine(gps.latitude, gps.longitude);
  const altitude = gps === null ? null : altitudeLine(gps.altitudeMeters);

  return (
    <section
      aria-labelledby="expose-gps-title"
      className="ground-ink border-rule flex flex-col gap-3 border-2 p-4"
    >
      <h3
        className="text-[0.75rem] font-bold tracking-[0.08em] uppercase [font-stretch:87.5%]"
        id="expose-gps-title"
      >
        {t("exposeGpsTitle")}
      </h3>

      <div className="border-rule relative border">
        <svg
          aria-label={
            gps === null
              ? t("exposeGpsEmpty")
              : t("exposeGpsMapAlt", {
                  latitude: formatCoordinate(gps.latitude),
                  longitude: formatCoordinate(gps.longitude),
                })
          }
          className="block h-auto w-full"
          role="img"
          viewBox={`0 0 ${WORLD_VIEW_WIDTH} ${WORLD_VIEW_HEIGHT}`}
        >
          <path
            d={WORLD_LAND_PATH}
            fill="currentColor"
            fillRule="evenodd"
            opacity="0.28"
          />
          {point === null ? null : (
            <>
              <line
                stroke="var(--paper)"
                strokeOpacity="0.45"
                strokeWidth="0.8"
                x1={point.x}
                x2={point.x}
                y1={Math.max(0, point.y - 18)}
                y2={Math.min(WORLD_VIEW_HEIGHT, point.y + 18)}
              />
              <line
                stroke="var(--paper)"
                strokeOpacity="0.45"
                strokeWidth="0.8"
                x1={Math.max(0, point.x - 18)}
                x2={Math.min(WORLD_VIEW_WIDTH, point.x + 18)}
                y1={point.y}
                y2={point.y}
              />
              <rect
                fill="var(--red)"
                height="7"
                stroke="var(--paper)"
                strokeWidth="1.4"
                width="7"
                x={point.x - 3.5}
                y={point.y - 3.5}
              />
            </>
          )}
        </svg>
      </div>

      {gps === null ? (
        <p className="text-muted-fg text-sm/6">{t("exposeGpsEmpty")}</p>
      ) : (
        <>
          <dl className="grid grid-cols-1 gap-x-6 gap-y-1 text-sm/6 sm:grid-cols-2">
            <div className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1">
              <dt className="text-[0.75rem] font-bold tracking-[0.08em] uppercase [font-stretch:87.5%]">
                {t("exposeGpsLatitude")}
              </dt>
              <dd className="num">{formatCoordinate(gps.latitude)}</dd>
              <dt className="text-[0.75rem] font-bold tracking-[0.08em] uppercase [font-stretch:87.5%]">
                {t("exposeGpsLongitude")}
              </dt>
              <dd className="num">{formatCoordinate(gps.longitude)}</dd>
            </div>
            {altitude === null ? null : (
              <div className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1">
                <dt className="text-[0.75rem] font-bold tracking-[0.08em] uppercase [font-stretch:87.5%]">
                  {t("exposeGpsAltitude")}
                </dt>
                <dd className="num">{altitude}</dd>
              </div>
            )}
          </dl>
          <Button
            className="self-start"
            intent="outline"
            onPress={() => copyText(line, t("exposeCopied"))}
            size="xs"
          >
            <HiClipboard aria-hidden="true" />
            {t("exposeGpsCopy")}
          </Button>
        </>
      )}
    </section>
  );
};
