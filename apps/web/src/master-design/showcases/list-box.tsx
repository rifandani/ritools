import {
  ListBox,
  ListBoxDescription,
  ListBoxItem,
  ListBoxLabel,
  ListBoxSection,
} from "@/core/components/ui/list-box";

import { Variant, VariantGrid } from "../variant";

const files = [
  { id: "jpg", name: "IMG_4021.jpg", note: "3.2", unit: "MB" },
  { id: "png", name: "receipt-scan.png", note: "1.8", unit: "MB" },
  { id: "webp", name: "hero-banner.webp", note: "940", unit: "KB" },
  { id: "avif", name: "team-photo.avif", note: "412", unit: "KB" },
];

export const ListBoxShowcase = () => (
  <div className="flex flex-col gap-8">
    <VariantGrid>
      <Variant className="w-72" label="single selection">
        <ListBox
          aria-label="Batch files"
          className="w-full"
          defaultSelectedKeys={["jpg"]}
          items={files}
          selectionMode="single"
        >
          {(file) => (
            <ListBoxItem id={file.id} textValue={file.name}>
              <ListBoxLabel>{file.name}</ListBoxLabel>
              <ListBoxDescription>
                <span className="num">{file.note}</span> {file.unit}
              </ListBoxDescription>
            </ListBoxItem>
          )}
        </ListBox>
      </Variant>
      <Variant className="w-72" label="multiple selection">
        <ListBox
          aria-label="Batch files"
          className="w-full"
          defaultSelectedKeys={["jpg", "webp"]}
          items={files}
          selectionMode="multiple"
        >
          {(file) => (
            <ListBoxItem id={file.id} textValue={file.name}>
              <ListBoxLabel>{file.name}</ListBoxLabel>
              <ListBoxDescription>
                <span className="num">{file.note}</span> {file.unit}
              </ListBoxDescription>
            </ListBoxItem>
          )}
        </ListBox>
      </Variant>
    </VariantGrid>

    <VariantGrid>
      <Variant className="w-72" label="sections">
        <ListBox
          aria-label="Batch files"
          className="w-full"
          selectionMode="single"
        >
          <ListBoxSection title="Images">
            <ListBoxItem id="a" textValue="IMG_4021.jpg">
              <ListBoxLabel>IMG_4021.jpg</ListBoxLabel>
            </ListBoxItem>
            <ListBoxItem id="b" textValue="hero-banner.webp">
              <ListBoxLabel>hero-banner.webp</ListBoxLabel>
            </ListBoxItem>
          </ListBoxSection>
          <ListBoxSection title="Archives">
            <ListBoxItem id="c" textValue="receipts.zip">
              <ListBoxLabel>receipts.zip</ListBoxLabel>
            </ListBoxItem>
            <ListBoxItem id="d" isDisabled textValue="locked.zip">
              <ListBoxLabel>locked.zip</ListBoxLabel>
            </ListBoxItem>
          </ListBoxSection>
        </ListBox>
      </Variant>
    </VariantGrid>

    <VariantGrid>
      <Variant className="w-72" label="rest">
        <ListBox
          aria-label="Batch files"
          className="w-full"
          items={files}
          selectionMode="single"
        >
          {(file) => (
            <ListBoxItem id={file.id} textValue={file.name}>
              <ListBoxLabel>{file.name}</ListBoxLabel>
            </ListBoxItem>
          )}
        </ListBox>
      </Variant>
      <Variant className="w-72" demo="hover" label="hover">
        <ListBox
          aria-label="Batch files"
          className="w-full"
          items={files}
          selectionMode="single"
        >
          {(file) => (
            <ListBoxItem id={file.id} textValue={file.name}>
              <ListBoxLabel>{file.name}</ListBoxLabel>
            </ListBoxItem>
          )}
        </ListBox>
      </Variant>
      <Variant className="w-72" demo="pressed" label="pressed">
        <ListBox
          aria-label="Batch files"
          className="w-full"
          items={files}
          selectionMode="single"
        >
          {(file) => (
            <ListBoxItem id={file.id} textValue={file.name}>
              <ListBoxLabel>{file.name}</ListBoxLabel>
            </ListBoxItem>
          )}
        </ListBox>
      </Variant>
      <Variant className="w-72" demo="focus" label="focus">
        <ListBox
          aria-label="Batch files"
          className="w-full"
          items={files}
          selectionMode="single"
        >
          {(file) => (
            <ListBoxItem id={file.id} textValue={file.name}>
              <ListBoxLabel>{file.name}</ListBoxLabel>
            </ListBoxItem>
          )}
        </ListBox>
      </Variant>
      <Variant className="w-72" demo="disabled" label="disabled">
        <ListBox
          aria-label="Batch files"
          className="w-full"
          items={files}
          selectionMode="single"
        >
          {(file) => (
            <ListBoxItem id={file.id} textValue={file.name}>
              <ListBoxLabel>{file.name}</ListBoxLabel>
            </ListBoxItem>
          )}
        </ListBox>
      </Variant>
    </VariantGrid>
  </div>
);
