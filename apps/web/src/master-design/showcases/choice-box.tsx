import { HiChatBubbleLeft, HiEnvelope, HiGlobeAlt } from "react-icons/hi2";

import {
  ChoiceBox,
  ChoiceBoxDescription,
  ChoiceBoxItem,
  ChoiceBoxLabel,
} from "@/core/components/ui/choice-box";

import { Variant, VariantGrid } from "../variant";

const states = ["hover", "pressed", "focus"] as const;

/** One Target preset: a name and the size each image must reach. */
const Preset = ({
  id,
  name,
  target,
  unit,
  isDisabled,
}: {
  id: string;
  name: string;
  target: string;
  unit: string;
  isDisabled?: boolean;
}) => (
  <ChoiceBoxItem id={id} isDisabled={isDisabled} textValue={name}>
    <ChoiceBoxLabel>{name}</ChoiceBoxLabel>
    <ChoiceBoxDescription>
      At most <span className="num">{target}</span> {unit} an image
    </ChoiceBoxDescription>
  </ChoiceBoxItem>
);

/** One format in the Batch, with its file count and total size. */
const Format = ({
  id,
  name,
  files,
  size,
  unit,
  isDisabled,
}: {
  id: string;
  name: string;
  files: number;
  size: string;
  unit: string;
  isDisabled?: boolean;
}) => (
  <ChoiceBoxItem id={id} isDisabled={isDisabled} textValue={name}>
    <ChoiceBoxLabel>{name}</ChoiceBoxLabel>
    <ChoiceBoxDescription>
      <span className="num">{files}</span> files,{" "}
      <span className="num">{size}</span> {unit}
    </ChoiceBoxDescription>
  </ChoiceBoxItem>
);

export const ChoiceBoxShowcase = () => (
  <div className="flex flex-col gap-8">
    {/* One option per cell: every printed state, side by side. */}
    <VariantGrid>
      <Variant label="rest">
        <ChoiceBox aria-label="Target" className="w-full">
          <Preset id="email" name="Email" target="200" unit="KB" />
        </ChoiceBox>
      </Variant>
      {states.map((state) => (
        <Variant demo={state} key={state} label={state}>
          <ChoiceBox aria-label="Target" className="w-full">
            <Preset id="email" name="Email" target="200" unit="KB" />
          </ChoiceBox>
        </Variant>
      ))}
      <Variant label="isDisabled">
        <ChoiceBox aria-label="Target" className="w-full">
          <Preset id="email" isDisabled name="Email" target="200" unit="KB" />
        </ChoiceBox>
      </Variant>
    </VariantGrid>

    {/* Selected: solid ink with the red foot. */}
    <VariantGrid>
      <Variant label="selected">
        <ChoiceBox
          aria-label="Target"
          className="w-full"
          defaultSelectedKeys={["email"]}
        >
          <Preset id="email" name="Email" target="200" unit="KB" />
        </ChoiceBox>
      </Variant>
      <Variant demo="hover" label="selected, hover">
        <ChoiceBox
          aria-label="Target"
          className="w-full"
          defaultSelectedKeys={["email"]}
        >
          <Preset id="email" name="Email" target="200" unit="KB" />
        </ChoiceBox>
      </Variant>
      <Variant demo="focus" label="selected, focus">
        <ChoiceBox
          aria-label="Target"
          className="w-full"
          defaultSelectedKeys={["email"]}
        >
          <Preset id="email" name="Email" target="200" unit="KB" />
        </ChoiceBox>
      </Variant>
      <Variant label="selected, isDisabled">
        <ChoiceBox
          aria-label="Target"
          className="w-full"
          defaultSelectedKeys={["email"]}
          disabledKeys={["email"]}
        >
          <Preset id="email" name="Email" target="200" unit="KB" />
        </ChoiceBox>
      </Variant>
    </VariantGrid>

    <VariantGrid>
      <Variant className="w-72" label='selectionMode="single", gap={0}'>
        <ChoiceBox
          aria-label="Target"
          className="w-full"
          defaultSelectedKeys={["web"]}
        >
          <Preset id="email" name="Email" target="200" unit="KB" />
          <Preset id="web" name="Web" target="500" unit="KB" />
          <Preset id="chat" name="Chat" target="1" unit="MB" />
          <Preset id="print" isDisabled name="Print" target="8" unit="MB" />
        </ChoiceBox>
      </Variant>
      <Variant className="w-72" label="with icons, isReadOnly">
        <ChoiceBox
          aria-label="Target"
          className="w-full"
          defaultSelectedKeys={["chat"]}
          isReadOnly
        >
          <ChoiceBoxItem id="email" textValue="Email">
            <HiEnvelope />
            <ChoiceBoxLabel>Email</ChoiceBoxLabel>
            <ChoiceBoxDescription>
              At most <span className="num">200</span> KB an image
            </ChoiceBoxDescription>
          </ChoiceBoxItem>
          <ChoiceBoxItem id="web" textValue="Web">
            <HiGlobeAlt />
            <ChoiceBoxLabel>Web</ChoiceBoxLabel>
            <ChoiceBoxDescription>
              At most <span className="num">500</span> KB an image
            </ChoiceBoxDescription>
          </ChoiceBoxItem>
          <ChoiceBoxItem id="chat" textValue="Chat">
            <HiChatBubbleLeft />
            <ChoiceBoxLabel>Chat</ChoiceBoxLabel>
            <ChoiceBoxDescription>
              At most <span className="num">1</span> MB an image
            </ChoiceBoxDescription>
          </ChoiceBoxItem>
        </ChoiceBox>
      </Variant>
      <Variant
        className="w-full"
        label='selectionMode="multiple", columns={2}, gap={0}'
      >
        <ChoiceBox
          aria-label="Formats to squeeze"
          className="w-full"
          columns={2}
          defaultSelectedKeys={["jpeg", "webp"]}
          selectionMode="multiple"
        >
          <Format files={3} id="jpeg" name="JPEG" size="10.5" unit="MB" />
          <Format files={3} id="png" name="PNG" size="8.0" unit="MB" />
          <Format files={2} id="webp" name="WebP" size="2.0" unit="MB" />
          <Format
            files={2}
            id="avif"
            isDisabled
            name="AVIF"
            size="1.1"
            unit="MB"
          />
        </ChoiceBox>
      </Variant>
      <Variant className="w-full" label="columns={3}, gap={4}">
        <ChoiceBox
          aria-label="When an image misses its Target"
          className="w-full"
          columns={3}
          defaultSelectedKeys={["closest"]}
          gap={4}
        >
          <ChoiceBoxItem
            description="The smallest file the search reached."
            id="closest"
            label="Keep the closest result"
          />
          <ChoiceBoxItem
            description="The file leaves the Batch unchanged."
            id="original"
            label="Keep the original"
          />
          <ChoiceBoxItem
            description="Not in this version."
            id="drop"
            isDisabled
            label="Drop the image"
          />
        </ChoiceBox>
      </Variant>
    </VariantGrid>
  </div>
);
