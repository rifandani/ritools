import { Button } from "@/core/components/ui/button";
import {
  Sheet,
  SheetBody,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/core/components/ui/sheet";

import { Variant, VariantGrid } from "../variant";

const states = ["hover", "pressed", "focus", "disabled"] as const;

export const SheetShowcase = () => (
  <div className="flex flex-col gap-8">
    <VariantGrid>
      <Variant label="rest">
        <Sheet>
          <Button intent="outline">The Batch</Button>
          <SheetContent side="right">
            <SheetHeader>
              <SheetTitle>The Batch</SheetTitle>
              <SheetDescription>
                <span className="num">12</span> images, waiting for a Target.
              </SheetDescription>
            </SheetHeader>
            <SheetBody>Each image keeps the format it arrived in.</SheetBody>
            <SheetFooter>
              <SheetClose>Close</SheetClose>
              <SheetClose intent="primary">Start Squeeze</SheetClose>
            </SheetFooter>
          </SheetContent>
        </Sheet>
      </Variant>

      {states.map((state) => (
        <Variant demo={state} key={state} label={state}>
          <Sheet>
            <Button intent="outline" isDisabled={state === "disabled"}>
              The Batch
            </Button>
            <SheetContent side="right">
              <SheetHeader>
                <SheetTitle>The Batch</SheetTitle>
              </SheetHeader>
              <SheetFooter>
                <SheetClose>Close</SheetClose>
              </SheetFooter>
            </SheetContent>
          </Sheet>
        </Variant>
      ))}
    </VariantGrid>

    <VariantGrid>
      {(["top", "bottom", "left", "right"] as const).map((side) => (
        <Variant key={side} label={`side="${side}"`}>
          <Sheet>
            <Button intent="outline">{side}</Button>
            <SheetContent side={side}>
              <SheetHeader>
                <SheetTitle>The Target</SheetTitle>
                <SheetDescription>
                  The size Squeeze aims for, per image.
                </SheetDescription>
              </SheetHeader>
              <SheetBody>One Target, one number.</SheetBody>
              <SheetFooter>
                <SheetClose>Close</SheetClose>
              </SheetFooter>
            </SheetContent>
          </Sheet>
        </Variant>
      ))}

      <Variant label="isFloat={false}">
        <Sheet>
          <Button intent="outline">flush</Button>
          <SheetContent isFloat={false} side="right">
            <SheetHeader>
              <SheetTitle>The Batch</SheetTitle>
            </SheetHeader>
            <SheetBody>12 images.</SheetBody>
          </SheetContent>
        </Sheet>
      </Variant>
    </VariantGrid>

    <VariantGrid>
      <Variant className="w-full flex-none" label="the panel">
        <div className="border-rule bg-overlay text-overlay-fg flex h-72 w-full max-w-sm shrink-0 flex-col border-2">
          <SheetHeader>
            <SheetTitle>The Batch</SheetTitle>
            <SheetDescription>
              <span className="num">12</span> images, waiting for a Target.
            </SheetDescription>
          </SheetHeader>
          <SheetBody className="flex-none overflow-visible">
            Each image keeps the format it arrived in.
          </SheetBody>
          <SheetFooter>
            <Button intent="plain">Close</Button>
            <Button intent="primary">Start Squeeze</Button>
          </SheetFooter>
        </div>
      </Variant>
    </VariantGrid>
  </div>
);
