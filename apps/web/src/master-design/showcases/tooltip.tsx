import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/core/components/ui/tooltip";

import { Variant, VariantGrid } from "../variant";

const states = ["hover", "pressed", "focus", "disabled"] as const;

export const TooltipShowcase = () => (
  <div className="flex flex-col gap-8">
    <VariantGrid>
      <Variant label="rest">
        <Tooltip>
          <TooltipTrigger intent="outline">Target</TooltipTrigger>
          <TooltipContent>The size Squeeze aims for, per image.</TooltipContent>
        </Tooltip>
      </Variant>

      <Variant label="inverse">
        <Tooltip>
          <TooltipTrigger intent="outline">Batch</TooltipTrigger>
          <TooltipContent inverse>
            The images waiting for a Target.
          </TooltipContent>
        </Tooltip>
      </Variant>

      {states.map((state) => (
        <Variant demo={state} key={state} label={state}>
          <Tooltip>
            <TooltipTrigger intent="outline" isDisabled={state === "disabled"}>
              Target
            </TooltipTrigger>
            <TooltipContent>
              The size Squeeze aims for, per image.
            </TooltipContent>
          </Tooltip>
        </Variant>
      ))}
    </VariantGrid>

    <VariantGrid>
      <Variant label="no arrow">
        <Tooltip>
          <TooltipTrigger intent="outline">Miss</TooltipTrigger>
          <TooltipContent arrow={false}>
            An image Squeeze cannot bring down to the Target.
          </TooltipContent>
        </Tooltip>
      </Variant>

      <Variant label="with a number">
        <Tooltip>
          <TooltipTrigger intent="outline">Miss</TooltipTrigger>
          <TooltipContent>
            <span className="num font-semibold">3</span> of{" "}
            <span className="num">12</span> images could not reach the Target.
          </TooltipContent>
        </Tooltip>
      </Variant>
    </VariantGrid>
  </div>
);
