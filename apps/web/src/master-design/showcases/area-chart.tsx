import { AreaChart } from "@/core/components/ui/area-chart";

import { batchConfig, batchRuns } from "../fixtures";
import { Variant } from "../variant";

const label = "Where five Squeeze Batches land against the 200 KB Target";

export const AreaChartShowcase = () => (
  <div className="flex w-full flex-col gap-12">
    <Variant className="w-full" label="default, proof screen">
      <AreaChart
        aria-label={label}
        className="w-full"
        config={batchConfig}
        data={batchRuns}
        dataKey="batch"
        xAxisProps={{ interval: 0 }}
      />
    </Variant>

    <Variant className="w-full" label="stacked">
      <AreaChart
        aria-label={`${label}, stacked`}
        className="w-full"
        config={batchConfig}
        data={batchRuns}
        dataKey="batch"
        xAxisProps={{ interval: 0 }}
        type="stacked"
      />
    </Variant>

    <Variant className="w-full" label="solid">
      <AreaChart
        aria-label={`${label}, solid fill`}
        className="w-full"
        config={batchConfig}
        data={batchRuns}
        dataKey="batch"
        fillType="solid"
        xAxisProps={{ interval: 0 }}
      />
    </Variant>

    <Variant className="w-full" label="none">
      <AreaChart
        aria-label={`${label}, strokes only`}
        className="w-full"
        config={batchConfig}
        data={batchRuns}
        dataKey="batch"
        fillType="none"
        xAxisProps={{ interval: 0 }}
      />
    </Variant>

    <Variant className="w-full" label="percent">
      <AreaChart
        aria-label={`${label}, percent of each Batch`}
        className="w-full"
        config={batchConfig}
        data={batchRuns}
        dataKey="batch"
        xAxisProps={{ interval: 0 }}
        type="percent"
      />
    </Variant>
  </div>
);
