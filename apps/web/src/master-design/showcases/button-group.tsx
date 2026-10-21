import {
  HiOutlineArrowDownTray,
  HiOutlineClipboard,
  HiOutlineTrash,
} from "react-icons/hi2";

import { Button } from "@/core/components/ui/button";
import {
  ButtonGroup,
  ButtonGroupText,
} from "@/core/components/ui/button-group";

import { Variant, VariantGrid } from "../variant";

const states = ["hover", "pressed", "focus", "disabled"] as const;

/** The three-mark strip is wider than one 13.5rem cell, so it takes two. */
const wideCell = "w-72";

/**
 * Puts one mark in a forced state. The wrapper is the group's flex item, so it
 * takes the overlap, and it prints over its neighbors like a touched mark.
 */
const Demo = ({
  state,
  children,
}: {
  state?: (typeof states)[number];
  children: React.ReactNode;
}) =>
  state ? (
    <span className="relative z-20 inline-flex" data-demo={state}>
      {children}
    </span>
  ) : (
    children
  );

const ImageActions = ({
  isDisabled,
  state,
}: {
  isDisabled?: boolean;
  state?: (typeof states)[number];
}) => (
  <ButtonGroup aria-label="Actions for IMG_4021.jpg">
    <Button intent="outline" isDisabled={isDisabled} size="sm">
      Download
    </Button>
    <Demo state={state}>
      <Button intent="outline" isDisabled={isDisabled} size="sm">
        Copy
      </Button>
    </Demo>
    <Button intent="outline" isDisabled={isDisabled} size="sm">
      Remove
    </Button>
  </ButtonGroup>
);

export const ButtonGroupShowcase = () => (
  <div className="flex flex-col gap-8">
    <VariantGrid>
      <Variant className={wideCell} label='orientation="horizontal"'>
        <ImageActions />
      </Variant>

      <Variant label='orientation="vertical"'>
        <ButtonGroup
          aria-label="Miss: screenshot-0912.png"
          orientation="vertical"
        >
          <Button intent="outline">Squeeze again</Button>
          <Button intent="outline">Raise the Target</Button>
          <Button intent="danger">Remove</Button>
        </ButtonGroup>
      </Variant>

      <Variant label="with ButtonGroupText">
        <ButtonGroup aria-label="Target">
          <ButtonGroupText>
            Target <span className="num text-fg font-semibold">200 KB</span>
          </ButtonGroupText>
          <Button aria-label="Lower the Target by 50 KB" intent="outline">
            −
          </Button>
          <Button aria-label="Raise the Target by 50 KB" intent="outline">
            +
          </Button>
        </ButtonGroup>
      </Variant>

      <Variant label="icons, size sq-md">
        <ButtonGroup aria-label="Actions for IMG_4021.jpg">
          <Button aria-label="Download" intent="outline" size="sq-md">
            <HiOutlineArrowDownTray />
          </Button>
          <Button aria-label="Copy" intent="outline" size="sq-md">
            <HiOutlineClipboard />
          </Button>
          <Button aria-label="Remove" intent="outline" size="sq-md">
            <HiOutlineTrash />
          </Button>
        </ButtonGroup>
      </Variant>

      <Variant label="primary, then outline">
        <ButtonGroup aria-label="Download the Batch">
          <Button size="sm">Download all</Button>
          <Button intent="outline" size="sm">
            As ZIP
          </Button>
        </ButtonGroup>
      </Variant>
    </VariantGrid>

    {/*
     * One mark takes each state; disabled takes the whole group. The states
     * pair up in two columns, so the three-mark strip never outgrows its cell.
     */}
    <VariantGrid className="lg:grid-cols-2">
      {states
        .filter((state) => state !== "disabled")
        .map((state) => (
          <Variant key={state} label={`"Copy" ${state}`}>
            <ImageActions state={state} />
          </Variant>
        ))}
      <Variant demo="disabled" label="isDisabled, every mark">
        <ImageActions isDisabled />
      </Variant>
    </VariantGrid>
  </div>
);
