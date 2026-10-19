import { HiOutlineArrowDownTray, HiOutlineTrash } from "react-icons/hi2";

import { Button } from "@/core/components/ui/button";
import {
  Menu,
  MenuContent,
  MenuHeader,
  MenuItem,
  MenuLabel,
  MenuSection,
  MenuSeparator,
} from "@/core/components/ui/menu";

import { Variant, VariantGrid } from "../variant";

export const MenuShowcase = () => (
  <VariantGrid>
    <Variant label="default">
      <Menu>
        <Button intent="outline">Open</Button>
        <MenuContent aria-label="Actions">
          <MenuItem id="edit">Edit</MenuItem>
          <MenuItem id="duplicate">Duplicate</MenuItem>
          <MenuItem id="archive" isDisabled>
            Archive
          </MenuItem>
        </MenuContent>
      </Menu>
    </Variant>

    <Variant label="single selection">
      <Menu>
        <Button intent="outline">Format</Button>
        <MenuContent
          aria-label="Output format"
          defaultSelectedKeys={new Set(["keep"])}
          selectionMode="single"
        >
          <MenuSection>
            <MenuHeader separator>Output format</MenuHeader>
            <MenuItem className="mt-1" id="keep">
              Keep each format
            </MenuItem>
            <MenuItem id="webp">WebP</MenuItem>
            <MenuItem id="avif">AVIF</MenuItem>
          </MenuSection>
        </MenuContent>
      </Menu>
    </Variant>

    <Variant label="icons, danger">
      <Menu>
        <Button intent="outline">Batch</Button>
        <MenuContent aria-label="Batch actions">
          <MenuItem id="download">
            <HiOutlineArrowDownTray />
            <MenuLabel>Download all</MenuLabel>
          </MenuItem>
          <MenuSeparator />
          <MenuItem id="clear" intent="danger">
            <HiOutlineTrash />
            <MenuLabel>Clear the Batch</MenuLabel>
          </MenuItem>
        </MenuContent>
      </Menu>
    </Variant>
  </VariantGrid>
);
