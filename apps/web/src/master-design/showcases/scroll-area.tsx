import { ScrollArea } from "@/core/components/ui/scroll-area";

import { batchFiles } from "../fixtures";
import { Variant, VariantGrid } from "../variant";

const BatchRows = () => (
  <ul className="divide-border divide-y-2 text-sm">
    {batchFiles.map((file) => (
      <li className="flex items-baseline gap-3 px-3 py-2" key={file.name}>
        <span className="min-w-0 flex-1 truncate">{file.name}</span>
        <span className="num text-muted-fg w-[7ch] text-right">
          {file.before}
        </span>
        <span
          className={
            file.after
              ? "num w-[7ch] text-right font-semibold"
              : "text-danger-subtle-fg w-[7ch] text-right font-bold uppercase"
          }
        >
          {file.after ?? "Miss"}
        </span>
      </li>
    ))}
  </ul>
);

/** Wider than the cell on purpose, so the horizontal axis scrolls. */
const FormatColumns = () => (
  <div className="flex w-max gap-0.5 p-3">
    {batchFiles.map((file) => (
      <div
        className="bg-card border-rule flex w-32 shrink-0 flex-col gap-1 border-2 p-3 text-xs"
        key={file.name}
      >
        <span className="truncate font-semibold">{file.name}</span>
        <span className="num text-muted-fg">{file.format}</span>
      </div>
    ))}
  </div>
);

export const ScrollAreaShowcase = () => (
  <VariantGrid>
    <Variant className="w-72" label='orientation="vertical", scrollFade'>
      <ScrollArea
        className="border-rule h-48 w-full border-2"
        orientation="vertical"
        scrollFade
      >
        <BatchRows />
      </ScrollArea>
    </Variant>

    <Variant className="w-72" label='orientation="vertical", no edge rules'>
      <ScrollArea
        className="border-rule h-48 w-full border-2"
        orientation="vertical"
      >
        <BatchRows />
      </ScrollArea>
    </Variant>

    <Variant className="w-72" label='orientation="horizontal", scrollFade'>
      <ScrollArea
        className="border-rule h-auto w-full border-2"
        orientation="horizontal"
        scrollFade
        scrollbarGutter
      >
        <FormatColumns />
      </ScrollArea>
    </Variant>

    <Variant className="w-72" label='orientation="both", scrollFade'>
      <ScrollArea className="border-rule h-40 w-full border-2" scrollFade>
        <div className="w-[36rem]">
          <BatchRows />
        </div>
      </ScrollArea>
    </Variant>

    <Variant className="w-72" label="empty Batch">
      <ScrollArea className="border-rule h-48 w-full border-2" scrollFade>
        <div className="flex h-full flex-col items-start justify-center gap-1 p-4">
          <p className="num text-4xl leading-none font-extrabold">0</p>
          <p className="text-muted-fg text-sm">
            images in the Batch. Add some to start.
          </p>
        </div>
      </ScrollArea>
    </Variant>

    <Variant
      className="w-72"
      label="focus (keyboard in the viewport)"
      demo="focus"
    >
      <ScrollArea
        className="border-rule h-32 w-full border-2"
        orientation="vertical"
      >
        <BatchRows />
      </ScrollArea>
    </Variant>
  </VariantGrid>
);
