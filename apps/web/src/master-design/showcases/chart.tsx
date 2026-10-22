// eslint-disable-next-line react-doctor/prefer-dynamic-import -- The development-only Catalog base entry composes the shared chart primitives directly.
import { Bar, BarChart as BarChartPrimitive } from "recharts";

import {
  CartesianGrid,
  Chart,
  ChartLegend,
  ChartLegendContent,
  ChartProofDefs,
  chartProofFill,
  ChartTooltip,
  ChartTooltipContent,
  constructCategoryColors,
  DEFAULT_COLORS,
  getColorValue,
  XAxis,
  YAxis,
} from "@/core/components/ui/chart";

import { batchConfig, batchRuns } from "../fixtures";
import { Variant } from "../variant";

const entries = Object.entries(batchConfig);
const categoryColors = constructCategoryColors(
  Object.keys(batchConfig),
  DEFAULT_COLORS
);
const seriesColors = entries.map(([key]) =>
  getColorValue(categoryColors.get(key))
);
const legendPayload = entries.map(([key], index) => ({
  color: seriesColors[index] ?? "var(--chart-1)",
  dataKey: key,
  type: "circle" as const,
  value: key,
}));

/** The shared base: one plot, the axes, the grid, the note, and the legend. */
const BaseChart = ({ grid = true }: { grid?: boolean }) => (
  <Chart
    aria-label="Where five Squeeze Batches land against the 200 KB Target"
    className="w-full"
    config={batchConfig}
    data={batchRuns}
    dataKey="batch"
  >
    {({ chartId, onLegendSelect, reduceMotion, selectedLegend }) => (
      <BarChartPrimitive
        barCategoryGap={5}
        data={batchRuns}
        margin={{ bottom: 0, left: 5, right: 12, top: 5 }}
      >
        <ChartProofDefs colors={seriesColors} id={chartId} />
        {grid && <CartesianGrid />}
        <XAxis interval={0} />
        <YAxis />
        <ChartTooltip content={<ChartTooltipContent accessibilityLayer />} />
        <ChartLegend content={<ChartLegendContent payload={legendPayload} />} />
        {entries.map(([key], index) => {
          const color = seriesColors[index] ?? "var(--chart-1)";
          const dimmed = selectedLegend !== null && selectedLegend !== key;
          return (
            <Bar
              dataKey={key}
              fill={chartProofFill(chartId, index, color)}
              fillOpacity={dimmed ? 0.1 : 1}
              isAnimationActive={!reduceMotion}
              key={key}
              name={key}
              onClick={(_item, _number, event) => {
                event.stopPropagation();
                onLegendSelect(key);
              }}
              radius={0}
              stroke={color}
              strokeOpacity={dimmed ? 0.2 : 1}
              strokeWidth={2}
            />
          );
        })}
      </BarChartPrimitive>
    )}
  </Chart>
);

export const ChartShowcase = () => (
  <div className="flex w-full flex-col gap-12">
    <Variant className="w-full" label="axes, grid, tooltip, legend">
      <BaseChart />
    </Variant>
    <Variant className="w-full" label="without grid lines">
      <BaseChart grid={false} />
    </Variant>
  </div>
);
