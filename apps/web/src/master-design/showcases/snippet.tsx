import {
  Snippet,
  SnippetTab,
  SnippetTabPanel,
  SnippetTabPanels,
  SnippetTabsList,
} from "@/core/components/ui/snippet";

import { Variant, VariantGrid } from "../variant";

export const SnippetShowcase = () => (
  <div className="flex flex-col gap-8">
    <VariantGrid>
      <Variant className="w-96" label="tabs, with a copy button">
        <Snippet defaultSelectedKey="ts">
          <SnippetTabsList>
            <SnippetTab id="ts">TypeScript</SnippetTab>
            <SnippetTab id="js">JavaScript</SnippetTab>
          </SnippetTabsList>
          <SnippetTabPanels>
            <SnippetTabPanel id="ts">
              await squeeze(file: File, target)
            </SnippetTabPanel>
            <SnippetTabPanel id="js">
              await squeeze(file, target)
            </SnippetTabPanel>
          </SnippetTabPanels>
        </Snippet>
      </Variant>
    </VariantGrid>
  </div>
);
