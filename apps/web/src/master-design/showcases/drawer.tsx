import { Button } from "@/core/components/ui/button";
import {
  Drawer,
  DrawerBody,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/core/components/ui/drawer";

import { Variant, VariantGrid } from "../variant";

const states = ["hover", "pressed", "focus", "disabled"] as const;

export const DrawerShowcase = () => (
  <div className="flex flex-col gap-8">
    <VariantGrid>
      <Variant label="rest">
        <Drawer>
          <DrawerTrigger>The Batch</DrawerTrigger>
          <DrawerContent side="bottom">
            <DrawerHeader>
              <DrawerTitle>The Batch</DrawerTitle>
              <DrawerDescription>
                <span className="num">12</span> images, waiting for a Target.
              </DrawerDescription>
            </DrawerHeader>
            <DrawerBody>Each image keeps the format it arrived in.</DrawerBody>
            <DrawerFooter>
              <DrawerClose>Close</DrawerClose>
              <DrawerClose intent="primary">Start Squeeze</DrawerClose>
            </DrawerFooter>
          </DrawerContent>
        </Drawer>
      </Variant>

      {states.map((state) => (
        <Variant demo={state} key={state} label={state}>
          <Drawer>
            <DrawerTrigger isDisabled={state === "disabled"}>
              The Batch
            </DrawerTrigger>
            <DrawerContent side="bottom">
              <DrawerHeader>
                <DrawerTitle>The Batch</DrawerTitle>
              </DrawerHeader>
              <DrawerFooter>
                <DrawerClose>Close</DrawerClose>
              </DrawerFooter>
            </DrawerContent>
          </Drawer>
        </Variant>
      ))}
    </VariantGrid>

    <VariantGrid>
      {(["top", "bottom", "left", "right"] as const).map((side) => (
        <Variant key={side} label={`side="${side}"`}>
          <Drawer>
            <DrawerTrigger>{side}</DrawerTrigger>
            <DrawerContent side={side}>
              <DrawerHeader>
                <DrawerTitle>The Target</DrawerTitle>
                <DrawerDescription>
                  The size Squeeze aims for, per image.
                </DrawerDescription>
              </DrawerHeader>
              <DrawerBody>One Target, one number.</DrawerBody>
              <DrawerFooter>
                <DrawerClose>Close</DrawerClose>
              </DrawerFooter>
            </DrawerContent>
          </Drawer>
        </Variant>
      ))}

      <Variant label="notch={false}">
        <Drawer>
          <DrawerTrigger>no notch</DrawerTrigger>
          <DrawerContent notch={false} side="bottom">
            <DrawerHeader>
              <DrawerTitle>The Target</DrawerTitle>
            </DrawerHeader>
            <DrawerBody>One Target, one number.</DrawerBody>
          </DrawerContent>
        </Drawer>
      </Variant>
    </VariantGrid>

    <VariantGrid>
      <Variant className="w-full flex-none" label="the panel">
        <div className="border-rule bg-overlay text-overlay-fg flex h-72 w-full max-w-sm shrink-0 flex-col border-2">
          <DrawerHeader>
            <DrawerTitle>The Batch</DrawerTitle>
            <DrawerDescription>
              <span className="num">12</span> images, waiting for a Target.
            </DrawerDescription>
          </DrawerHeader>
          <DrawerBody className="flex-none overflow-visible">
            Each image keeps the format it arrived in.
          </DrawerBody>
          <DrawerFooter>
            <Button intent="outline">Close</Button>
            <Button intent="primary">Start Squeeze</Button>
          </DrawerFooter>
        </div>
      </Variant>
    </VariantGrid>
  </div>
);
