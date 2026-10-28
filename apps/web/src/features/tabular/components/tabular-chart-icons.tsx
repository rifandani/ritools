import type { ChartType } from "../tabular.chart";

const iconProps = {
  "aria-hidden": true,
  focusable: "false",
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "square",
  strokeLinejoin: "miter",
} as const;

/**
 * One proof-style mark per Chart Type. The menu prints these at control size;
 * every mark uses the same square caps and 2px rules as the charts.
 */
export const ChartTypeIcon = ({
  type,
  className,
}: {
  readonly type: ChartType;
  readonly className?: string;
}) => {
  switch (type) {
    case "line": {
      return (
        <svg {...iconProps} className={className}>
          <path d="M3 17 8 10 13 14 21 5" />
        </svg>
      );
    }
    case "bar": {
      return (
        <svg {...iconProps} className={className}>
          <path
            d="M4 20v-7h4v7M10 20V7h4v13M16 20V10h4v10"
            fill="currentColor"
            stroke="none"
          />
        </svg>
      );
    }
    case "area": {
      return (
        <svg {...iconProps} className={className}>
          <path
            d="M3 19 8 10 13 13 21 5v14Z"
            fill="currentColor"
            fillOpacity={0.18}
            stroke="none"
          />
          <path d="M3 19 8 10 13 13 21 5" />
        </svg>
      );
    }
    case "donut": {
      return (
        <svg {...iconProps} className={className}>
          <circle cx={12} cy={12} r={8} />
          <circle cx={12} cy={12} r={3.5} />
          <path d="M12 4v4" />
        </svg>
      );
    }
    case "scatter": {
      return (
        <svg {...iconProps} className={className}>
          <path
            d="M4 15h3v3H4zM9 7h3v3H9zM15 16h3v3h-3zM18 4h3v3h-3z"
            fill="currentColor"
            stroke="none"
          />
        </svg>
      );
    }
    default: {
      const unreachable: never = type;
      return unreachable;
    }
  }
};
