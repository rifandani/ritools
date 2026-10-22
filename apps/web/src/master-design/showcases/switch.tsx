import { Description } from "@/core/components/ui/field";
import { Switch, SwitchField } from "@/core/components/ui/switch";

import { Variant, VariantGrid } from "../variant";

const states = ["hover", "pressed", "focus"] as const;

export const SwitchShowcase = () => (
  <div className="flex flex-col gap-8">
    {/* Off: an outlined track, the block at the start. */}
    <VariantGrid>
      <Variant label="off, rest">
        <SwitchField>
          <Switch>Show Misses only</Switch>
        </SwitchField>
      </Variant>
      {states.map((state) => (
        <Variant demo={state} key={state} label={`off, ${state}`}>
          <SwitchField>
            <Switch>Show Misses only</Switch>
          </SwitchField>
        </Variant>
      ))}
      <Variant label="off, isDisabled">
        <SwitchField isDisabled>
          <Switch>Show Misses only</Switch>
        </SwitchField>
      </Variant>
    </VariantGrid>

    {/* On: a solid ink track, the paper block at the end. */}
    <VariantGrid>
      <Variant label="on, rest">
        <SwitchField defaultSelected>
          <Switch>Lock the Target</Switch>
        </SwitchField>
      </Variant>
      {states.map((state) => (
        <Variant demo={state} key={state} label={`on, ${state}`}>
          <SwitchField defaultSelected>
            <Switch>Lock the Target</Switch>
          </SwitchField>
        </Variant>
      ))}
      <Variant label="on, isDisabled">
        <SwitchField defaultSelected isDisabled>
          <Switch>Lock the Target</Switch>
        </SwitchField>
      </Variant>
    </VariantGrid>

    <VariantGrid>
      <Variant label="on the red field, off and on">
        <div className="ground-red w-full space-y-3 p-4">
          <SwitchField>
            <Switch>Show Misses only</Switch>
          </SwitchField>
          <SwitchField defaultSelected>
            <Switch>Lock the Target</Switch>
          </SwitchField>
        </div>
      </Variant>
      <Variant label="on the ink rail, off and on">
        <div className="ground-ink w-full space-y-3 p-4">
          <SwitchField>
            <Switch>Show Misses only</Switch>
          </SwitchField>
          <SwitchField defaultSelected>
            <Switch>Lock the Target</Switch>
          </SwitchField>
        </div>
      </Variant>
      <Variant className="w-64" label="with Description">
        <SwitchField className="w-full" defaultSelected>
          <Switch>Lock the Target</Switch>
          <Description>
            Every image in the Batch uses <span className="num">200 kB</span>.
          </Description>
        </SwitchField>
      </Variant>
    </VariantGrid>
  </div>
);
