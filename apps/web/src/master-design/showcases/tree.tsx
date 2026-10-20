import { Tree, TreeContent, TreeItem } from "@/core/components/ui/tree";

import { Variant, VariantGrid } from "../variant";

const TreeFiles = () => (
  <Tree
    aria-label="Batch folders"
    className="w-full"
    defaultExpandedKeys={["photos", "receipts"]}
  >
    <TreeItem id="photos" textValue="Photos">
      <TreeContent>Photos</TreeContent>
      <TreeItem id="a" textValue="IMG_4021.jpg">
        <TreeContent>IMG_4021.jpg</TreeContent>
      </TreeItem>
      <TreeItem id="b" textValue="team-photo.avif">
        <TreeContent>team-photo.avif</TreeContent>
      </TreeItem>
    </TreeItem>
    <TreeItem id="receipts" textValue="Receipts">
      <TreeContent>Receipts</TreeContent>
      <TreeItem id="c" textValue="receipt-scan.png">
        <TreeContent>receipt-scan.png</TreeContent>
      </TreeItem>
    </TreeItem>
    <TreeItem id="locked" isDisabled textValue="locked.zip">
      <TreeContent>locked.zip</TreeContent>
    </TreeItem>
  </Tree>
);

export const TreeShowcase = () => (
  <div className="flex flex-col gap-8">
    <VariantGrid>
      <Variant className="w-72" label="nested folders">
        <TreeFiles />
      </Variant>
      <Variant className="w-72" label="selected">
        <Tree
          aria-label="Batch folders"
          className="w-full"
          defaultExpandedKeys={["photos"]}
          selectedKeys={["a"]}
          selectionMode="single"
        >
          <TreeItem id="photos" textValue="Photos">
            <TreeContent>Photos</TreeContent>
            <TreeItem id="a" textValue="IMG_4021.jpg">
              <TreeContent>IMG_4021.jpg</TreeContent>
            </TreeItem>
            <TreeItem id="b" textValue="team-photo.avif">
              <TreeContent>team-photo.avif</TreeContent>
            </TreeItem>
          </TreeItem>
        </Tree>
      </Variant>
    </VariantGrid>

    <VariantGrid>
      <Variant className="w-72" label="rest">
        <TreeFiles />
      </Variant>
      <Variant className="w-72" demo="hover" label="hover">
        <TreeFiles />
      </Variant>
      <Variant className="w-72" demo="pressed" label="pressed">
        <TreeFiles />
      </Variant>
      <Variant className="w-72" demo="focus" label="focus">
        <TreeFiles />
      </Variant>
      <Variant className="w-72" demo="disabled" label="disabled">
        <TreeFiles />
      </Variant>
    </VariantGrid>
  </div>
);
