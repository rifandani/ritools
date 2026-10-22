import {
  Meter,
  MeterHeader,
  MeterTrack,
  MeterValue,
} from "@/core/components/ui/meter";

import { Variant, VariantGrid } from "../variant";

export const MeterShowcase = () => (
  <div className="flex flex-col gap-8">
    <VariantGrid>
      <Variant className="w-72" label="value 70">
        <Meter aria-label="Device memory used" value={70}>
          <MeterHeader>
            <span>Memory used</span>
            <MeterValue />
          </MeterHeader>
          <MeterTrack />
        </Meter>
      </Variant>
      <Variant className="w-72" label="value 0">
        <Meter aria-label="Device memory used" value={0}>
          <MeterHeader>
            <span>Memory used</span>
            <MeterValue />
          </MeterHeader>
          <MeterTrack />
        </Meter>
      </Variant>
      <Variant className="w-72" label="value 100">
        <Meter aria-label="Device memory used" value={100}>
          <MeterHeader>
            <span>Memory used</span>
            <MeterValue />
          </MeterHeader>
          <MeterTrack />
        </Meter>
      </Variant>
    </VariantGrid>

    {/* A status hue arrives only with a word that names it. The fill is the
        dark hue of that status, so the bar keeps its 3:1 against the track. */}
    <VariantGrid>
      <Variant className="w-72" label="color=success, Safe">
        <Meter
          aria-label="Batch size, Safe"
          color="var(--color-success-subtle-fg)"
          value={42}
        >
          <MeterHeader>
            <span>Safe</span>
            <MeterValue />
          </MeterHeader>
          <MeterTrack />
        </Meter>
      </Variant>
      <Variant className="w-72" label="color=warning, Tight">
        <Meter
          aria-label="Batch size, Tight"
          color="var(--color-warning-subtle-fg)"
          value={78}
        >
          <MeterHeader>
            <span>Tight</span>
            <MeterValue />
          </MeterHeader>
          <MeterTrack />
        </Meter>
      </Variant>
      <Variant className="w-72" label="color=danger, Full">
        <Meter
          aria-label="Batch size, Full"
          color="var(--color-danger-subtle-fg)"
          value={94}
        >
          <MeterHeader>
            <span>Full</span>
            <MeterValue />
          </MeterHeader>
          <MeterTrack />
        </Meter>
      </Variant>
    </VariantGrid>
  </div>
);
