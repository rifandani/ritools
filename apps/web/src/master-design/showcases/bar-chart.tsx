import { BarChart } from "@/core/components/ui/bar-chart";

import { batchConfig, batchRuns } from "../fixtures";
import { Variant } from "../variant";

const label = "Where five Squeeze Batches land against the 200 KB Target";

export const BarChartShowcase = () => (
  <div className="flex w-full flex-col gap-12">
    <Variant className="w-full" label="default">
      <BarChart
        aria-label={label}
        className="w-full"
        config={batchConfig}
        data={batchRuns}
        dataKey="batch"
        xAxisProps={{ interval: 0 }}
      />
    </Variant>

    <Variant className="w-full" label="stacked">
      <BarChart
        aria-label={`${label}, stacked`}
        className="w-full"
        config={batchConfig}
        data={batchRuns}
        dataKey="batch"
        xAxisProps={{ interval: 0 }}
        type="stacked"
      />
    </Variant>

    <Variant className="w-full" label="percent">
      <BarChart
        aria-label={`${label}, percent of each Batch`}
        className="w-full"
        config={batchConfig}
        data={batchRuns}
        dataKey="batch"
        type="percent"
        xAxisProps={{ interval: 0 }}
      />
    </Variant>

    <Variant className="w-full" label="vertical">
      <BarChart
        aria-label={`${label}, horizontal bars`}
        className="w-full"
        config={batchConfig}
        data={batchRuns}
        dataKey="batch"
        containerHeight={360}
        layout="vertical"
        xAxisProps={{ interval: 0 }}
        yAxisProps={{ interval: 0 }}
      />
    </Variant>
  </div>
);
