import {
  GridList,
  GridListDescription,
  GridListEmptyState,
  GridListHeader,
  GridListItem,
  GridListLabel,
  GridListSection,
} from "@/core/components/ui/grid-list";

import { Variant, VariantGrid } from "../variant";

const files = [
  { id: "1", name: "IMG_4021.jpg", note: "3.2", unit: "MB", format: "JPEG" },
  { id: "2", name: "receipt-scan.png", note: "1.8", unit: "MB", format: "PNG" },
  {
    id: "3",
    name: "hero-banner.webp",
    note: "940",
    unit: "KB",
    format: "WebP",
  },
  { id: "4", name: "team-photo.avif", note: "412", unit: "KB", format: "AVIF" },
];

const noFiles: typeof files = [];

export const GridListShowcase = () => (
  <div className="flex flex-col gap-8">
    <VariantGrid>
      <Variant className="w-72" label="single selection">
        <GridList
          aria-label="Batch files"
          className="w-full"
          defaultSelectedKeys={["2"]}
          items={files}
          selectionMode="single"
        >
          {(file) => (
            <GridListItem id={file.id} textValue={file.name}>
              <div className="flex min-w-0 flex-col">
                <GridListLabel>{file.name}</GridListLabel>
                <GridListDescription>
                  <span className="num">{file.note}</span> {file.unit},{" "}
                  {file.format}
                </GridListDescription>
              </div>
            </GridListItem>
          )}
        </GridList>
      </Variant>
      <Variant className="w-72" label="multiple selection">
        <GridList
          aria-label="Batch files"
          className="w-full"
          defaultSelectedKeys={["1", "3"]}
          items={files}
          selectionMode="multiple"
        >
          {(file) => (
            <GridListItem id={file.id} textValue={file.name}>
              <div className="flex min-w-0 flex-col">
                <GridListLabel>{file.name}</GridListLabel>
                <GridListDescription>
                  <span className="num">{file.note}</span> {file.unit},{" "}
                  {file.format}
                </GridListDescription>
              </div>
            </GridListItem>
          )}
        </GridList>
      </Variant>
    </VariantGrid>

    <VariantGrid>
      <Variant className="w-72" label="with a header and a section">
        <GridList
          aria-label="Batch files"
          className="w-full"
          selectionMode="single"
        >
          <GridListHeader>Images</GridListHeader>
          <GridListSection>
            <GridListItem id="1" textValue="IMG_4021.jpg">
              <GridListLabel>IMG_4021.jpg</GridListLabel>
            </GridListItem>
            <GridListItem id="2" textValue="hero-banner.webp">
              <GridListLabel>hero-banner.webp</GridListLabel>
            </GridListItem>
          </GridListSection>
        </GridList>
      </Variant>
      <Variant className="w-72" label="empty">
        <GridList
          aria-label="Batch files"
          className="w-full"
          items={noFiles}
          renderEmptyState={() => (
            <GridListEmptyState>
              <span className="num text-[clamp(2.5rem,8vw,4rem)] leading-[0.82] font-extrabold">
                0
              </span>
              <span className="text-muted-fg text-sm">
                No files in this Batch.
              </span>
            </GridListEmptyState>
          )}
        >
          {() => null}
        </GridList>
      </Variant>
    </VariantGrid>

    <VariantGrid>
      <Variant className="w-72" label="rest">
        <GridList aria-label="Batch files" className="w-full" items={files}>
          {(file) => (
            <GridListItem id={file.id} textValue={file.name}>
              <GridListLabel>{file.name}</GridListLabel>
            </GridListItem>
          )}
        </GridList>
      </Variant>
      <Variant className="w-72" demo="hover" label="hover">
        <GridList aria-label="Batch files" className="w-full" items={files}>
          {(file) => (
            <GridListItem id={file.id} textValue={file.name}>
              <GridListLabel>{file.name}</GridListLabel>
            </GridListItem>
          )}
        </GridList>
      </Variant>
      <Variant className="w-72" demo="pressed" label="pressed">
        <GridList aria-label="Batch files" className="w-full" items={files}>
          {(file) => (
            <GridListItem id={file.id} textValue={file.name}>
              <GridListLabel>{file.name}</GridListLabel>
            </GridListItem>
          )}
        </GridList>
      </Variant>
      <Variant className="w-72" demo="focus" label="focus">
        <GridList aria-label="Batch files" className="w-full" items={files}>
          {(file) => (
            <GridListItem id={file.id} textValue={file.name}>
              <GridListLabel>{file.name}</GridListLabel>
            </GridListItem>
          )}
        </GridList>
      </Variant>
      <Variant className="w-72" demo="disabled" label="disabled">
        <GridList aria-label="Batch files" className="w-full" items={files}>
          {(file) => (
            <GridListItem id={file.id} textValue={file.name}>
              <GridListLabel>{file.name}</GridListLabel>
            </GridListItem>
          )}
        </GridList>
      </Variant>
    </VariantGrid>
  </div>
);
