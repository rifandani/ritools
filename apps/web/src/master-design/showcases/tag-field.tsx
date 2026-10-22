import { Description, Label } from "@/core/components/ui/field";
import { Input } from "@/core/components/ui/input";
import { TagField } from "@/core/components/ui/tag-field";

import { Variant, VariantGrid } from "../variant";

const states = ["hover", "focus"] as const;

const skipped = ["screenshot", "draft"];

export const TagFieldShowcase = () => (
  <div className="flex flex-col gap-8">
    {/* The input is a well; the tags it makes are printed marks below it. */}
    <VariantGrid>
      <Variant className="w-72" label="rest, empty">
        <TagField className="w-full" name="skip-empty">
          <Label>Skip file names with</Label>
          <Input placeholder="Type a word, then Enter" />
        </TagField>
      </Variant>
      <Variant className="w-72" label="rest, with tags">
        <TagField className="w-full" defaultValue={skipped} name="skip">
          <Label>Skip file names with</Label>
          <Input placeholder="Type a word, then Enter" />
          <Description>Separate words with a comma.</Description>
        </TagField>
      </Variant>
      {states.map((state) => (
        <Variant className="w-72" demo={state} key={state} label={state}>
          {/* No tags here: a forced state would print on every tag too. */}
          <TagField className="w-full" name={state}>
            <Label>Skip file names with</Label>
            <Input placeholder="Type a word, then Enter" />
          </TagField>
        </Variant>
      ))}
      <Variant className="w-72" label="isRequired: remove both tags">
        <TagField
          className="w-full"
          defaultValue={["IMG_", "DSC_"]}
          isRequired
          name="keep"
          requiredMessage="Add at least one word, or the Batch stays empty."
        >
          <Label>Keep file names with</Label>
          <Input placeholder="Type a word, then Enter" />
        </TagField>
      </Variant>
      <Variant className="w-72" label="isDisabled">
        <TagField
          className="w-full"
          defaultValue={skipped}
          isDisabled
          name="skip-disabled"
        >
          <Label>Skip file names with</Label>
          <Input />
        </TagField>
      </Variant>
      <Variant className="w-72" label="isReadOnly">
        <TagField
          className="w-full"
          defaultValue={skipped}
          isReadOnly
          name="skip-read-only"
        >
          <Label>Skip file names with</Label>
          <Input />
        </TagField>
      </Variant>
    </VariantGrid>
  </div>
);
