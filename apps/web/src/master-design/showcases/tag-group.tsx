import { useState } from "react";

import { Description, Label } from "@/core/components/ui/field";
import { Tag, TagGroup, TagList } from "@/core/components/ui/tag-group";

import { Variant, VariantGrid } from "../variant";

const formats = [
  { count: 3, id: "jpeg", name: "JPEG" },
  { count: 3, id: "png", name: "PNG" },
  { count: 2, id: "webp", name: "WebP" },
  { count: 2, id: "avif", name: "AVIF" },
];

const states = ["hover", "pressed", "focus"] as const;

const noKeys: string[] = [];

/** One tag: a forced catalog state prints on every mark in its cell. */
const OneTag = ({ selected = false }: { selected?: boolean }) => (
  <TagGroup
    defaultSelectedKeys={selected ? ["jpeg"] : noKeys}
    selectionMode="multiple"
  >
    <Label>Show formats</Label>
    <TagList>
      <Tag id="jpeg" textValue="JPEG">
        JPEG <span className="num">3</span>
      </Tag>
    </TagList>
  </TagGroup>
);

/** A format filter: each tag counts the files of its format in the Batch. */
const FormatTags = ({
  selected = noKeys,
  disabled = noKeys,
}: {
  selected?: string[];
  disabled?: string[];
}) => (
  <TagGroup
    defaultSelectedKeys={selected}
    disabledKeys={disabled}
    selectionMode="multiple"
  >
    <Label>Show formats</Label>
    <TagList items={formats}>
      {(item) => (
        <Tag textValue={item.name}>
          {item.name}
          <span className="num">{item.count}</span>
        </Tag>
      )}
    </TagList>
  </TagGroup>
);

const batch = [
  { id: "IMG_4021.jpg", size: "3.2", unit: "MB" },
  { id: "receipt-scan.png", size: "1.8", unit: "MB" },
  { id: "hero-banner.webp", size: "940", unit: "KB" },
];

/** Files in a Batch: each tag removes its file. */
const BatchTags = () => {
  const [files, setFiles] = useState(batch);
  return (
    <TagGroup
      onRemove={(keys) => {
        setFiles((current) => current.filter((file) => !keys.has(file.id)));
      }}
    >
      <Label>Batch</Label>
      <TagList
        items={files}
        renderEmptyState={() => (
          <span className="text-muted-fg text-sm/6">
            No images yet. Drop some on the zone.
          </span>
        )}
      >
        {(file) => (
          <Tag textValue={file.id}>
            {file.id}{" "}
            <span className="text-muted-fg">
              <span className="num">{file.size}</span> {file.unit}
            </span>
          </Tag>
        )}
      </TagList>
      <Description>Remove a file with its × or the Delete key.</Description>
    </TagGroup>
  );
};

export const TagGroupShowcase = () => (
  <div className="flex flex-col gap-8">
    {/* Off: every printed state, side by side. */}
    <VariantGrid>
      <Variant label="rest">
        <FormatTags />
      </Variant>
      {states.map((state) => (
        <Variant demo={state} key={state} label={state}>
          <OneTag />
        </Variant>
      ))}
      <Variant label="disabledKeys">
        <FormatTags disabled={["avif"]} />
      </Variant>
    </VariantGrid>

    {/* On: solid ink with the red foot. */}
    <VariantGrid>
      <Variant label="selected">
        <FormatTags selected={["jpeg", "png"]} />
      </Variant>
      <Variant demo="hover" label="selected, hover">
        <OneTag selected />
      </Variant>
      <Variant demo="focus" label="selected, focus">
        <OneTag selected />
      </Variant>
      <Variant label="selected, disabledKeys">
        <FormatTags disabled={["png"]} selected={["jpeg", "png"]} />
      </Variant>
    </VariantGrid>

    <VariantGrid>
      <Variant className="w-72" label="onRemove: files in the Batch">
        <BatchTags />
      </Variant>
      <Variant label="empty">
        <TagGroup>
          <Label>Batch</Label>
          <TagList
            renderEmptyState={() => (
              <span className="text-muted-fg text-sm/6">
                No images yet. Drop some on the zone.
              </span>
            )}
          >
            {[]}
          </TagList>
        </TagGroup>
      </Variant>
      <Variant label="href">
        <TagGroup>
          <Label>Tools</Label>
          <TagList>
            <Tag href="/squeeze" id="squeeze">
              Squeeze
            </Tag>
          </TagList>
        </TagGroup>
      </Variant>
      <Variant label="on the ink rail">
        <div className="ground-ink w-full p-4">
          <FormatTags selected={["webp"]} />
        </div>
      </Variant>
    </VariantGrid>
  </div>
);
