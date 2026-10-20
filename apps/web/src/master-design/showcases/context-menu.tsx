import { Pressable } from "react-aria-components/Pressable";

import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuDescription,
  ContextMenuHeader,
  ContextMenuItem,
  ContextMenuLabel,
  ContextMenuSection,
  ContextMenuSeparator,
  ContextMenuShortcut,
} from "@/core/components/ui/context-menu";

import { Variant, VariantGrid } from "../variant";

export const ContextMenuShowcase = () => (
  <VariantGrid>
    <Variant label="default">
      <ContextMenu>
        <Pressable>
          <button
            className="border-rule text-muted-fg border-2 px-8 py-6 text-sm"
            type="button"
          >
            Right click the Batch
          </button>
        </Pressable>
        <ContextMenuContent>
          <ContextMenuItem id="squeeze">
            <ContextMenuLabel>Squeeze the Batch</ContextMenuLabel>
            <ContextMenuShortcut>⌘S</ContextMenuShortcut>
          </ContextMenuItem>
          <ContextMenuItem id="target">
            <ContextMenuLabel>Set the Target</ContextMenuLabel>
          </ContextMenuItem>
          <ContextMenuSeparator />
          <ContextMenuItem id="clear" intent="danger">
            <ContextMenuLabel>Clear the Batch</ContextMenuLabel>
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>
    </Variant>

    <Variant label="sections">
      <ContextMenu>
        <Pressable>
          <button
            className="border-rule text-muted-fg border-2 px-8 py-6 text-sm"
            type="button"
          >
            Right click an image
          </button>
        </Pressable>
        <ContextMenuContent>
          <ContextMenuSection>
            <ContextMenuHeader separator>Output format</ContextMenuHeader>
            <ContextMenuItem id="keep">Keep each format</ContextMenuItem>
            <ContextMenuItem id="webp">WebP</ContextMenuItem>
            <ContextMenuItem id="avif">AVIF</ContextMenuItem>
          </ContextMenuSection>
          <ContextMenuSection>
            <ContextMenuHeader>Actions</ContextMenuHeader>
            <ContextMenuItem id="download">
              <ContextMenuLabel>Download</ContextMenuLabel>
              <ContextMenuDescription>
                One file per image
              </ContextMenuDescription>
            </ContextMenuItem>
            <ContextMenuItem id="remove">
              <ContextMenuLabel>Remove from the Batch</ContextMenuLabel>
            </ContextMenuItem>
          </ContextMenuSection>
        </ContextMenuContent>
      </ContextMenu>
    </Variant>

    <Variant label="submenu">
      <ContextMenu>
        <Pressable>
          <button
            className="border-rule text-muted-fg border-2 px-8 py-6 text-sm"
            type="button"
          >
            Right click
          </button>
        </Pressable>
        <ContextMenuContent>
          <ContextMenuItem id="rename">
            <ContextMenuLabel>Rename the Batch</ContextMenuLabel>
          </ContextMenuItem>
          <ContextMenuItem id="stats">
            <ContextMenuLabel>Show the sizes</ContextMenuLabel>
            <ContextMenuDescription>Before and after</ContextMenuDescription>
          </ContextMenuItem>
          <ContextMenuItem id="clear" intent="danger">
            <ContextMenuLabel>Clear the Batch</ContextMenuLabel>
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>
    </Variant>
  </VariantGrid>
);
