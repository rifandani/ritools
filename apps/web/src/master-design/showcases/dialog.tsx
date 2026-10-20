import { Button } from "@/core/components/ui/button";
import {
  Dialog,
  DialogBody,
  DialogFooter,
  DialogHeader,
} from "@/core/components/ui/dialog";
import { Description, FieldError, Label } from "@/core/components/ui/field";
import { Input } from "@/core/components/ui/input";
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
import { TextField } from "@/core/components/ui/text-field";

import { Variant, VariantGrid } from "../variant";

const states = ["hover", "pressed", "focus", "disabled"] as const;

export const DialogShowcase = () => (
  <div className="flex flex-col gap-8">
    <VariantGrid>
      <Variant label="rest">
        <Modal>
          <Button intent="outline">Edit Target</Button>
          <ModalContent>
            <ModalHeader>
              <ModalTitle>The Target</ModalTitle>
              <ModalDescription>
                The size Squeeze aims for, per image.
              </ModalDescription>
            </ModalHeader>
            <ModalBody className="space-y-4">
              <TextField>
                <Label>Target size</Label>
                <Input />
                <Description>Per image, not per Batch.</Description>
              </TextField>
            </ModalBody>
            <ModalFooter>
              <ModalClose>Cancel</ModalClose>
              <ModalClose intent="primary">Save Target</ModalClose>
            </ModalFooter>
          </ModalContent>
        </Modal>
      </Variant>

      {states.map((state) => (
        <Variant demo={state} key={state} label={state}>
          <Modal>
            <Button intent="outline" isDisabled={state === "disabled"}>
              Edit Target
            </Button>
            <ModalContent>
              <ModalHeader>
                <ModalTitle>The Target</ModalTitle>
                <ModalDescription>The size Squeeze aims for.</ModalDescription>
              </ModalHeader>
              <ModalFooter>
                <ModalClose>Cancel</ModalClose>
              </ModalFooter>
            </ModalContent>
          </Modal>
        </Variant>
      ))}
    </VariantGrid>

    <VariantGrid>
      <Variant label="alertdialog">
        <Modal>
          <Button intent="danger">Clear the Batch</Button>
          <ModalContent role="alertdialog" size="sm">
            <ModalHeader>
              <ModalTitle>The Batch</ModalTitle>
              <ModalDescription>
                <span className="num">12</span> images leave the Batch. Nothing
                on your device is touched.
              </ModalDescription>
            </ModalHeader>
            <ModalFooter>
              <ModalClose>Keep the Batch</ModalClose>
              <ModalClose intent="danger">Clear it</ModalClose>
            </ModalFooter>
          </ModalContent>
        </Modal>
      </Variant>

      <Variant label="invalid field">
        <Modal>
          <Button intent="outline">Rename</Button>
          <ModalContent>
            <ModalHeader>
              <ModalTitle>The Batch</ModalTitle>
            </ModalHeader>
            <ModalBody className="space-y-4">
              <TextField isInvalid>
                <Label>Batch name</Label>
                <Input />
                <FieldError>The name cannot be empty.</FieldError>
              </TextField>
            </ModalBody>
            <ModalFooter>
              <ModalClose>Cancel</ModalClose>
            </ModalFooter>
          </ModalContent>
        </Modal>
      </Variant>
    </VariantGrid>

    <VariantGrid>
      <Variant className="w-full flex-none" label="the panel">
        <div className="border-rule bg-overlay text-overlay-fg flex h-96 w-full max-w-sm shrink-0 flex-col border-2">
          <Dialog aria-label="The Target">
            <DialogHeader
              description="The size Squeeze aims for, per image."
              title="The Target"
            />
            <DialogBody className="flex-none space-y-4 overflow-visible">
              <TextField defaultValue="1.5 MB">
                <Label>Target size</Label>
                <Input />
                <Description>Per image, not per Batch.</Description>
              </TextField>
            </DialogBody>
            <DialogFooter>
              <Button intent="plain">Cancel</Button>
              <Button intent="primary">Save Target</Button>
            </DialogFooter>
          </Dialog>
        </div>
      </Variant>
    </VariantGrid>
  </div>
);
