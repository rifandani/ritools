import {
  HiCheck,
  HiExclamationTriangle,
  HiInformationCircle,
} from "react-icons/hi2";

import { Badge } from "@/core/components/ui/badge";

import { Variant, VariantGrid } from "../variant";

const intents = [
  "primary",
  "secondary",
  "success",
  "info",
  "warning",
  "danger",
  "outline",
] as const;

const copy: Record<(typeof intents)[number], string> = {
  primary: "Squeeze",
  secondary: "JPEG",
  success: "Hit",
  info: "Queued",
  warning: "Slow",
  danger: "Miss",
  outline: "Local",
};

export const BadgeShowcase = () => (
  <div className="flex flex-col gap-8">
    <VariantGrid>
      {intents.map((intent) => (
        <Variant key={intent} label={intent}>
          <Badge intent={intent}>{copy[intent]}</Badge>
        </Variant>
      ))}
    </VariantGrid>

    {/* The word names the state, so the hue never carries it alone. */}
    <VariantGrid>
      <Variant label="with a glyph">
        <Badge intent="success">
          <HiCheck data-slot="icon" />
          Hit
        </Badge>
      </Variant>
      <Variant label="with a glyph">
        <Badge intent="warning">
          <HiExclamationTriangle data-slot="icon" />
          Slow
        </Badge>
      </Variant>
      <Variant label="with a glyph">
        <Badge intent="info">
          <HiInformationCircle data-slot="icon" />
          Queued
        </Badge>
      </Variant>
      <Variant label="with a figure">
        <Badge intent="primary">
          <span className="num">10</span> files
        </Badge>
      </Variant>
    </VariantGrid>

    <VariantGrid>
      <Variant label="isCircle, the seal">
        <Badge isCircle intent="danger">
          9
        </Badge>
      </Variant>
      <Variant label="square">
        <Badge isCircle={false} intent="danger">
          Miss
        </Badge>
      </Variant>
    </VariantGrid>
  </div>
);
