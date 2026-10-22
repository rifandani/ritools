import { Ransom } from "@/core/components/ui/ransom";

import { Variant, VariantGrid } from "../variant";

export const RansomShowcase = () => (
  <VariantGrid>
    <Variant className="w-full" label="Component Entry title, fit">
      <Ransom as="span" className="w-full text-5xl" fit>
        Color Swatch Picker
      </Ransom>
    </Variant>
    <Variant className="w-full" label="long name, fit in 358px (a 390px phone)">
      <div className="border-input w-[358px] max-w-full border-2 border-dashed p-0">
        <Ransom as="span" className="text-5xl" fit>
          DateRangePicker
        </Ransom>
      </div>
    </Variant>
    <Variant className="w-full" label="Category heading, poster, cropped">
      <div className="w-full overflow-x-clip">
        <Ransom as="span" className="text-8xl">
          Buttons & Actions
        </Ransom>
      </div>
    </Variant>
    <Variant label='ground="red", wordmark'>
      <div className="ground-red px-4 py-3">
        <Ransom className="text-[1.75rem]" ground="red">
          Ritools
        </Ransom>
      </div>
    </Variant>
    <Variant className="w-64" label='ground="ink", Tool name'>
      <div className="ground-ink px-4 py-3">
        <Ransom className="text-3xl" ground="ink">
          Squeeze
        </Ransom>
      </div>
    </Variant>
    <Variant label="state words">
      <div className="flex flex-col items-start gap-3">
        <Ransom className="text-3xl">Done</Ransom>
        <Ransom className="text-3xl">Miss</Ransom>
      </div>
    </Variant>
  </VariantGrid>
);
