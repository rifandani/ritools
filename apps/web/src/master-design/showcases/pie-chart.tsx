import { PieChart } from "@/core/components/ui/pie-chart";

import { batchConfig, batchOutcomes } from "../fixtures";
import { Variant, VariantGrid } from "../variant";

const label = "Where 50 squeezed images landed against the 200 KB Target";

export const PieChartShowcase = () => (
  <VariantGrid>
    <Variant className="w-96" label="pie">
      <PieChart
        aria-label={label}
        className="mx-auto w-full max-w-2xl"
        config={batchConfig}
        containerHeight={240}
        data={batchOutcomes}
        dataKey="value"
        nameKey="band"
      />
    </Variant>

    <Variant className="w-96" label="donut">
      <PieChart
        aria-label={`${label}, donut`}
        className="mx-auto w-full max-w-2xl"
        config={batchConfig}
        containerHeight={240}
        data={batchOutcomes}
        dataKey="value"
        nameKey="band"
        showLabel
        variant="donut"
      />
    </Variant>
  </VariantGrid>
);
