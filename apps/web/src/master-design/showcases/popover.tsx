import { Button } from "@/core/components/ui/button";
import {
  Popover,
  PopoverBody,
  PopoverContent,
  PopoverDescription,
  PopoverFooter,
  PopoverHeader,
  PopoverTitle,
} from "@/core/components/ui/popover";

import { Variant, VariantGrid } from "../variant";

const states = ["hover", "pressed", "focus", "disabled"] as const;

export const PopoverShowcase = () => (
  <div className="flex flex-col gap-8">
    <VariantGrid>
      <Variant label="rest">
        <Popover>
          <Button intent="outline">What is a Miss?</Button>
          <PopoverContent>
            <PopoverHeader>
              <PopoverTitle>Miss</PopoverTitle>
              <PopoverDescription>
                An image Squeeze cannot bring down to the Target.
              </PopoverDescription>
            </PopoverHeader>
            <PopoverBody>
              A Miss keeps its original file. It is never dropped without a
              word.
            </PopoverBody>
            <PopoverFooter>
              <Button intent="secondary" size="sm">
                Read more
              </Button>
            </PopoverFooter>
          </PopoverContent>
        </Popover>
      </Variant>

      {states.map((state) => (
        <Variant demo={state} key={state} label={state}>
          <Popover>
            <Button intent="outline" isDisabled={state === "disabled"}>
              What is a Miss?
            </Button>
            <PopoverContent>
              <PopoverHeader>
                <PopoverTitle>Miss</PopoverTitle>
              </PopoverHeader>
              <PopoverBody>
                An image Squeeze cannot bring down to the Target.
              </PopoverBody>
            </PopoverContent>
          </Popover>
        </Variant>
      ))}
    </VariantGrid>

    <VariantGrid>
      <Variant label="with arrow">
        <Popover>
          <Button intent="outline">Target</Button>
          <PopoverContent arrow>
            <PopoverBody>The size Squeeze aims for, per image.</PopoverBody>
          </PopoverContent>
        </Popover>
      </Variant>

      <Variant label='placement="top"'>
        <Popover>
          <Button intent="outline">Top</Button>
          <PopoverContent placement="top">
            <PopoverBody>The size Squeeze aims for, per image.</PopoverBody>
          </PopoverContent>
        </Popover>
      </Variant>

      <Variant label='placement="end"'>
        <Popover>
          <Button intent="outline">End</Button>
          <PopoverContent placement="end">
            <PopoverBody>The size Squeeze aims for, per image.</PopoverBody>
          </PopoverContent>
        </Popover>
      </Variant>
    </VariantGrid>
  </div>
);
