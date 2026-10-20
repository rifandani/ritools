import { Tracker } from "@/core/components/ui/tracker";

import { Variant, VariantGrid } from "../variant";

// The block takes the dark hue of its status, so it keeps its 3:1 against the
// paper. The legend names every one of them.
const blocks = [
  { color: "bg-success-subtle-fg", tooltip: "Operational" },
  { color: "bg-success-subtle-fg", tooltip: "Operational" },
  { color: "bg-success-subtle-fg", tooltip: "Operational" },
  { color: "bg-warning-subtle-fg", tooltip: "Degraded" },
  { color: "bg-success-subtle-fg", tooltip: "Operational" },
  { color: "bg-danger-subtle-fg", tooltip: "Outage" },
  { color: "bg-success-subtle-fg", tooltip: "Operational" },
  { color: "bg-success-subtle-fg", tooltip: "Operational" },
  { color: "bg-success-subtle-fg", tooltip: "Operational" },
  { color: "bg-success-subtle-fg", tooltip: "Operational" },
];

const legend = [
  { color: "bg-success-subtle-fg", label: "Operational" },
  { color: "bg-warning-subtle-fg", label: "Degraded" },
  { color: "bg-danger-subtle-fg", label: "Outage" },
];

const Legend = () => (
  <ul className="flex flex-col gap-1">
    {legend.map((item) => (
      <li
        className="text-muted-fg flex items-center gap-2 text-xs"
        key={item.label}
      >
        <span className={`size-3 shrink-0 ${item.color}`} />
        {item.label}
      </li>
    ))}
  </ul>
);

export const TrackerShowcase = () => (
  <div className="flex flex-col gap-8">
    <VariantGrid>
      <Variant className="w-72" label="status, with a tooltip">
        <div className="flex flex-col gap-3">
          <Tracker className="w-full" data={blocks} />
          <Legend />
        </div>
      </Variant>
      <Variant className="w-72" demo="hover" label="hover">
        <div className="flex flex-col gap-3">
          <Tracker className="w-full" data={blocks} />
          <Legend />
        </div>
      </Variant>
      <Variant className="w-72" label="disabledTooltip">
        <div className="flex flex-col gap-3">
          <Tracker className="w-full" data={blocks} disabledTooltip />
          <Legend />
        </div>
      </Variant>
    </VariantGrid>
  </div>
);
