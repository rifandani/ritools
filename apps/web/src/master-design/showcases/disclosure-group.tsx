import {
  Disclosure,
  DisclosureGroup,
  DisclosurePanel,
  DisclosureTrigger,
} from "@/core/components/ui/disclosure-group";

import { Variant, VariantGrid } from "../variant";

const states = ["hover", "pressed", "focus", "disabled"] as const;

export const DisclosureGroupShowcase = () => (
  <div className="flex flex-col gap-8">
    <VariantGrid>
      <Variant className="w-72" label="collapsed">
        <DisclosureGroup>
          <Disclosure id="target">
            <DisclosureTrigger>What is the Target?</DisclosureTrigger>
            <DisclosurePanel>
              The size Squeeze aims for, per image. One Target, one number.
            </DisclosurePanel>
          </Disclosure>
          <Disclosure id="batch">
            <DisclosureTrigger>What is the Batch?</DisclosureTrigger>
            <DisclosurePanel>
              The images waiting in the tool. They never leave your device.
            </DisclosurePanel>
          </Disclosure>
        </DisclosureGroup>
      </Variant>

      <Variant className="w-72" label="open">
        <DisclosureGroup defaultExpandedKeys={new Set(["target"])}>
          <Disclosure id="target">
            <DisclosureTrigger>What is the Target?</DisclosureTrigger>
            <DisclosurePanel>
              The size Squeeze aims for, per image. One Target, one number.
            </DisclosurePanel>
          </Disclosure>
          <Disclosure id="batch">
            <DisclosureTrigger>What is the Batch?</DisclosureTrigger>
            <DisclosurePanel>
              The images waiting in the tool. They never leave your device.
            </DisclosurePanel>
          </Disclosure>
        </DisclosureGroup>
      </Variant>
    </VariantGrid>

    <VariantGrid>
      {states.map((state) => (
        <Variant className="w-72" demo={state} key={state} label={state}>
          <DisclosureGroup>
            <Disclosure id="target">
              <DisclosureTrigger isDisabled={state === "disabled"}>
                What is the Target?
              </DisclosureTrigger>
              <DisclosurePanel>
                The size Squeeze aims for, per image.
              </DisclosurePanel>
            </Disclosure>
          </DisclosureGroup>
        </Variant>
      ))}
    </VariantGrid>
  </div>
);
