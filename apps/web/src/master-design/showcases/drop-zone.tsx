import { useId, useState } from "react";
import type { DropZoneProps } from "react-aria-components/DropZone";
import { Text } from "react-aria-components/Text";
import { HiArrowDownTray, HiExclamationTriangle } from "react-icons/hi2";

import { DropZone } from "@/core/components/ui/drop-zone";
import { fieldErrorStyles } from "@/core/components/ui/field";
import { FileTrigger } from "@/core/components/ui/file-trigger";
import { Loader } from "@/core/components/ui/loader";

import { Variant, VariantGrid } from "../variant";

type DropEvent = Parameters<NonNullable<DropZoneProps["onDrop"]>>[0];

/** The formats Squeeze reads. */
const images = ["image/jpeg", "image/png", "image/webp", "image/avif"];

const states = ["hover", "focus"] as const;

/** The words inside the zone: what to drop, what Squeeze reads, how to pick instead. */
const DropCopy = ({
  dropping = false,
  isDisabled = false,
  withPicker = true,
}: {
  dropping?: boolean;
  isDisabled?: boolean;
  /** Forced zone states leave the picker out, so only the zone prints the state. */
  withPicker?: boolean;
}) => (
  <>
    <HiArrowDownTray aria-hidden className="size-7" />
    <Text className="text-base/6 font-bold" slot="label">
      {dropping ? "Release to add them to the Batch" : "Drop images here"}
    </Text>
    <p className="text-muted-fg max-w-[34ch] text-sm/6">
      JPEG, PNG, WebP, or AVIF. Folders too. Nothing leaves this device.
    </p>
    {!dropping && withPicker && (
      <FileTrigger
        acceptedFileTypes={images}
        allowsMultiple
        intent="secondary"
        isDisabled={isDisabled}
        size="sm"
      >
        Choose files
      </FileTrigger>
    )}
  </>
);

/** The error line a zone prints when a drop holds a file Squeeze cannot read. */
const DropError = ({ id, children }: { id: string; children: string }) => (
  <p className={fieldErrorStyles({ className: "text-start" })} id={id}>
    <HiExclamationTriangle aria-hidden data-slot="icon" />
    <span>{children}</span>
  </p>
);

/** A working zone: drop real files on it. A file of another format is refused by name. */
const LiveZone = () => {
  const errorId = useId();
  const [added, setAdded] = useState(0);
  const [refused, setRefused] = useState<string[]>([]);

  const onDrop = (event: DropEvent) => {
    let taken = 0;
    const names: string[] = [];
    for (const item of event.items) {
      if (item.kind !== "file") {
        continue;
      }
      if (images.includes(item.type)) {
        taken += 1;
      } else {
        names.push(item.name);
      }
    }
    setAdded((count) => count + taken);
    setRefused(names);
  };

  return (
    <div className="flex w-full flex-col gap-2">
      <DropZone
        aria-describedby={refused.length > 0 ? errorId : undefined}
        className="w-full"
        data-invalid={refused.length > 0 || undefined}
        onDrop={onDrop}
      >
        {({ isDropTarget }) => (
          <>
            <DropCopy dropping={isDropTarget} />
            <p aria-live="polite" className="text-sm/6">
              <span className="num">{added}</span> images in the Batch
            </p>
          </>
        )}
      </DropZone>
      {refused.length > 0 && (
        <DropError id={errorId}>
          {`${refused.join(", ")}: not JPEG, PNG, WebP, or AVIF. Squeeze left ${refused.length === 1 ? "it" : "them"} out.`}
        </DropError>
      )}
    </div>
  );
};

export const DropZoneShowcase = () => (
  <VariantGrid>
    <Variant className="w-72" label="rest, empty Batch: drop files on it">
      <LiveZone />
    </Variant>
    {states.map((state) => (
      <Variant className="w-72" demo={state} key={state} label={state}>
        <DropZone className="w-full">
          <DropCopy withPicker={false} />
        </DropZone>
      </Variant>
    ))}
    <Variant
      className="w-72"
      demo="pressed"
      label="drag-over (isDropTarget): the pressed print"
    >
      <DropZone className="w-full">
        <DropCopy dropping />
      </DropZone>
    </Variant>
    <Variant className="w-72" label="invalid file (data-invalid)">
      <div className="flex w-full flex-col gap-2">
        <DropZone
          aria-describedby="drop-zone-refused"
          className="w-full"
          data-invalid
        >
          <DropCopy />
        </DropZone>
        <DropError id="drop-zone-refused">
          notes.heic: not JPEG, PNG, WebP, or AVIF. Squeeze left it out.
        </DropError>
      </div>
    </Variant>
    <Variant className="w-72" label="loading: reading a dropped folder">
      <DropZone className="w-full">
        <Loader aria-label="Reading the folder" className="size-7" />
        <output className="text-base/6 font-bold">
          Reading <span className="num">48</span> files from{" "}
          <span className="whitespace-nowrap">holiday-2026</span>
        </output>
      </DropZone>
    </Variant>
    <Variant className="w-72" label="isDisabled">
      <DropZone className="w-full" isDisabled>
        <DropCopy isDisabled />
        <p className="text-sm/6">Wait for this Batch to finish.</p>
      </DropZone>
    </Variant>
  </VariantGrid>
);
