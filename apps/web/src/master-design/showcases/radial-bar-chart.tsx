import { RadialBarChart } from "@/core/components/ui/radial-bar-chart";
import { useIsMobile } from "@/core/hooks/use-mobile";

import { batchConfig, batchOutcomes } from "../fixtures";
import { Variant, VariantGrid } from "../variant";

/** One row per band, so each ring carries one size band of the Batch. */
const rings = batchOutcomes.map((outcome) => ({
  band: outcome.band,
  files: outcome.value,
  name: outcome.band,
}));

const label = "Where 50 squeezed images landed against the 200 KB Target";

export const RadialBarChartShowcase = () => {
  const isMobile = useIsMobile();
  return (
    <VariantGrid>
      <Variant className="w-full" label="five rings">
        <RadialBarChart
          aria-label={label}
          className="mx-auto w-full max-w-2xl"
          config={batchConfig}
          containerHeight={isMobile ? 360 : 440}
          data={rings}
          dataKey="band"
          legend
          nameKey="band"
          series={[{ dataKey: "files", name: "File count" }]}
        />
      </Variant>
    </VariantGrid>
  );
};
