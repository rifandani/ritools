import { FileTrigger } from "@/core/components/ui/file-trigger";

import { Variant, VariantGrid } from "../variant";

const states = ["hover", "pressed", "focus", "disabled"] as const;

const images = ["image/jpeg", "image/png", "image/webp", "image/avif"];

export const FileTriggerShowcase = () => (
  <div className="flex flex-col gap-8">
    <VariantGrid>
      <Variant label="default copy">
        <FileTrigger acceptedFileTypes={images} />
      </Variant>
      <Variant label="allowsMultiple">
        <FileTrigger acceptedFileTypes={images} allowsMultiple>
          Add images
        </FileTrigger>
      </Variant>
      <Variant label="acceptDirectory">
        <FileTrigger acceptDirectory>Add a folder</FileTrigger>
      </Variant>
      <Variant label="defaultCamera">
        <FileTrigger
          acceptedFileTypes={["image/*"]}
          defaultCamera="environment"
        >
          Take a photo
        </FileTrigger>
      </Variant>
      <Variant label='intent="primary", size="lg"'>
        <FileTrigger
          acceptedFileTypes={images}
          allowsMultiple
          intent="primary"
          size="lg"
        >
          Start a Batch
        </FileTrigger>
      </Variant>
      <Variant label="isPending">
        <FileTrigger acceptedFileTypes={images} allowsMultiple isPending>
          Reading 12 images
        </FileTrigger>
      </Variant>
    </VariantGrid>

    <VariantGrid>
      <Variant label="rest">
        <FileTrigger acceptedFileTypes={images} allowsMultiple>
          Add images
        </FileTrigger>
      </Variant>
      {states.map((state) => (
        <Variant demo={state} key={state} label={state}>
          <FileTrigger
            acceptedFileTypes={images}
            allowsMultiple
            isDisabled={state === "disabled"}
          >
            Add images
          </FileTrigger>
        </Variant>
      ))}
    </VariantGrid>
  </div>
);
