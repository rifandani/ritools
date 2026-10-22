import { Separator } from "@/core/components/ui/separator";

import { Variant, VariantGrid } from "../variant";

export const SeparatorShowcase = () => (
  <VariantGrid>
    <Variant className="w-56" label='orientation="horizontal"'>
      <div className="w-full text-sm">
        <p className="flex justify-between">
          <span>Batch</span>
          <span className="num">10 images</span>
        </p>
        <Separator className="my-3" />
        <p className="flex justify-between">
          <span>Saved</span>
          <span className="num">20.5 MB</span>
        </p>
      </div>
    </Variant>

    <Variant className="w-56" label='orientation="vertical"'>
      <div className="flex h-10 items-center gap-3 text-sm">
        <span className="num">22.4 MB</span>
        <Separator orientation="vertical" />
        <span className="num">1.9 MB</span>
        <Separator orientation="vertical" />
        <span>
          <span className="num">1</span> Miss
        </span>
      </div>
    </Variant>

    <Variant label="on the red field">
      <div className="ground-red flex h-12 items-center gap-3 px-4 text-sm font-bold">
        <span>Tools</span>
        <Separator orientation="vertical" className="h-5" />
        <span>Squeeze</span>
      </div>
    </Variant>

    <Variant label="on the ink rail">
      <div className="ground-ink w-full px-4 py-3 text-sm">
        <p>Tool Catalog</p>
        <Separator className="my-3" />
        <p className="text-muted-fg">Squeeze</p>
      </div>
    </Variant>
  </VariantGrid>
);
