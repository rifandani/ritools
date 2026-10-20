import { LineChart } from "@/core/components/ui/line-chart";

import { batchConfig, batchRuns, batchRunsGap } from "../fixtures";
import { Variant } from "../variant";

const label = "Where five Squeeze Batches land against the 200 KB Target";

export const LineChartShowcase = () => (
  <div className="flex w-full flex-col gap-12">
    <Variant className="w-full" label="default">
      <LineChart
        aria-label={label}
        className="w-full"
        config={batchConfig}
        data={batchRuns}
        dataKey="batch"
        xAxisProps={{ interval: 0 }}
      />
    </Variant>

    {/* One Batch did not report the Over 200 band: the gap is the signal. */}
    <Variant className="w-full" label="a missing reading">
      <LineChart
        aria-label={`${label}, with one missing reading`}
        className="w-full"
        config={batchConfig}
        data={batchRunsGap}
        dataKey="batch"
        xAxisProps={{ interval: 0 }}
      />
    </Variant>

    <Variant className="w-full" label="connectNulls">
      <LineChart
        aria-label={`${label}, missing reading joined`}
        className="w-full"
        config={batchConfig}
        connectNulls
        data={batchRunsGap}
        dataKey="batch"
        xAxisProps={{ interval: 0 }}
      />
    </Variant>
  </div>
);
