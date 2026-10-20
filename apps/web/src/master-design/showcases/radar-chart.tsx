import { RadarChart } from "@/core/components/ui/radar-chart";
import { useIsMobile } from "@/core/hooks/use-mobile";

import { batchConfig, batchRuns } from "../fixtures";
import { Variant, VariantGrid } from "../variant";

const series = [
  { dataKey: "Under 100", name: "Under 100 KB" },
  { dataKey: "100–150", name: "100–150 KB" },
  { dataKey: "150–200", name: "150–200 KB" },
  { dataKey: "Over 200", name: "Over 200 KB" },
  { dataKey: "Miss", name: "Miss" },
];

const wide = series.slice(0, 3);

const label = "The five size bands of five Squeeze Batches";

export const RadarChartShowcase = () => {
  const isMobile = useIsMobile();
  return (
    <VariantGrid>
      <Variant className="w-96" label="five series">
        <RadarChart
          aria-label={label}
          className="mx-auto w-full max-w-2xl"
          config={batchConfig}
          data={batchRuns}
          containerHeight={isMobile ? 360 : 440}
          dataKey="batch"
          series={series}
        />
      </Variant>

      <Variant className="w-96" label="three series">
        <RadarChart
          aria-label={`${label}, first three bands`}
          className="mx-auto w-full max-w-2xl"
          config={batchConfig}
          data={batchRuns}
          containerHeight={isMobile ? 360 : 440}
          dataKey="batch"
          series={wide}
        />
      </Variant>
    </VariantGrid>
  );
};
