import { Button } from "@/core/components/ui/button";
import {
  Modal,
  ModalBody,
  ModalClose,
  ModalContent,
  ModalDescription,
  ModalFooter,
  ModalHeader,
  ModalTitle,
} from "@/core/components/ui/modal";

import { Variant, VariantGrid } from "../variant";

const states = ["hover", "pressed", "focus", "disabled"] as const;

export const ModalShowcase = () => (
  <div className="flex flex-col gap-8">
    <VariantGrid>
      <Variant label="rest">
        <Modal>
          <Button intent="outline">Start Squeeze</Button>
          <ModalContent size="sm">
            <ModalHeader>
              <ModalTitle>Squeeze</ModalTitle>
              <ModalDescription>
                <span className="num">12</span> images, one Target of{" "}
                <span className="num">1.5 MB</span> each.
              </ModalDescription>
            </ModalHeader>
            <ModalBody>
              Everything runs on this device. No image leaves it.
            </ModalBody>
            <ModalFooter>
              <ModalClose>Not yet</ModalClose>
              <ModalClose intent="primary">Start</ModalClose>
            </ModalFooter>
          </ModalContent>
        </Modal>
      </Variant>

      {states.map((state) => (
        <Variant demo={state} key={state} label={state}>
          <Modal>
            <Button intent="outline" isDisabled={state === "disabled"}>
              Start Squeeze
            </Button>
            <ModalContent size="sm">
              <ModalHeader>
                <ModalTitle>Squeeze</ModalTitle>
              </ModalHeader>
              <ModalFooter>
                <ModalClose>Not yet</ModalClose>
              </ModalFooter>
            </ModalContent>
          </Modal>
        </Variant>
      ))}
    </VariantGrid>

    <VariantGrid>
      {(["2xs", "xs", "sm", "md", "lg", "xl", "fullscreen"] as const).map(
        (size) => (
          <Variant key={size} label={`size="${size}"`}>
            <Modal>
              <Button intent="outline">{size}</Button>
              <ModalContent size={size}>
                <ModalHeader>
                  <ModalTitle>The Target</ModalTitle>
                  <ModalDescription>
                    The size Squeeze aims for, per image.
                  </ModalDescription>
                </ModalHeader>
                <ModalBody>One Target, one number.</ModalBody>
                <ModalFooter>
                  <ModalClose>Close</ModalClose>
                </ModalFooter>
              </ModalContent>
            </Modal>
          </Variant>
        )
      )}
    </VariantGrid>
  </div>
);
