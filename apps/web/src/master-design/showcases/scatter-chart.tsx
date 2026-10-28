import type { ChartConfig } from "@/core/components/ui/chart";
import { ScatterChart } from "@/core/components/ui/scatter-chart";

import { Variant } from "../variant";

const label = "Where each Squeeze Batch lands between 20 KB and 240 KB";

const scatterConfig = {
  "Under 100": { label: "Under 100 KB" },
  "100–150": { label: "100–150 KB" },
  "150–200": { label: "150–200 KB" },
  "Over 200": { label: "Over 200 KB" },
} satisfies ChartConfig;

const points = [
  { group: "Under 100", x: 24, y: 18 },
  { group: "Under 100", x: 48, y: 31 },
  { group: "Under 100", x: 72, y: 44 },
  { group: "100–150", x: 108, y: 52 },
  { group: "100–150", x: 132, y: 61 },
  { group: "100–150", x: 148, y: 57 },
  { group: "150–200", x: 166, y: 70 },
  { group: "150–200", x: 184, y: 76 },
  { group: "150–200", x: 198, y: 68 },
  { group: "Over 200", x: 212, y: 84 },
  { group: "Over 200", x: 228, y: 79 },
  { group: "Over 200", x: 198, y: 90 },
];

export const ScatterChartShowcase = () => (
  <div className="flex w-full flex-col gap-12">
    <Variant className="w-full" label="default">
      <ScatterChart
        aria-label={label}
        className="w-full"
        config={scatterConfig}
        data={points}
      />
    </Variant>

    <Variant className="w-full" label="one group">
      <ScatterChart
        aria-label={`${label}, under 100 only`}
        className="w-full"
        config={scatterConfig}
        data={points.filter((point) => point.group === "Under 100")}
        groups={["Under 100"]}
      />
    </Variant>
  </div>
);
