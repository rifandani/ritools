import {
  Tab,
  TabList,
  TabPanel,
  TabPanels,
  Tabs,
} from "@/core/components/ui/tabs";

import { Variant, VariantGrid } from "../variant";

const states = ["hover", "pressed", "focus", "disabled"] as const;

export const TabsShowcase = () => (
  <div className="flex flex-col gap-8">
    {/* Three tabs and their gaps make a 278px row, wider than one 13.5rem
        track, so this entry raises its track until both specimens take one
        track inside the cell's right rule. */}
    <VariantGrid className="grid-cols-[repeat(auto-fill,minmax(min(100%,21rem),1fr))]">
      <Variant label="horizontal">
        <Tabs>
          <TabList>
            <Tab id="batch">The Batch</Tab>
            <Tab id="sizes">The sizes</Tab>
            <Tab id="settings">Settings</Tab>
          </TabList>
          <TabPanels>
            <TabPanel id="batch">
              <span className="num">12</span> images, waiting for a Target.
            </TabPanel>
            <TabPanel id="sizes">Before and after, per image.</TabPanel>
            <TabPanel id="settings">The Target, and the codecs.</TabPanel>
          </TabPanels>
        </Tabs>
      </Variant>

      <Variant label="vertical">
        <Tabs orientation="vertical">
          <TabList>
            <Tab id="batch">The Batch</Tab>
            <Tab id="sizes">The sizes</Tab>
            <Tab id="settings">Settings</Tab>
          </TabList>
          <TabPanels>
            <TabPanel id="batch">
              <span className="num">12</span> images.
            </TabPanel>
            <TabPanel id="sizes">Before and after.</TabPanel>
            <TabPanel id="settings">The Target.</TabPanel>
          </TabPanels>
        </Tabs>
      </Variant>
    </VariantGrid>

    <VariantGrid>
      {states.map((state) => (
        <Variant demo={state} key={state} label={state}>
          <Tabs>
            <TabList>
              <Tab id="batch">The Batch</Tab>
              {state === "focus" ? null : <Tab id="sizes">The sizes</Tab>}
            </TabList>
            <TabPanels>
              <TabPanel id="batch">
                <span className="num">12</span> images, waiting for a Target.
              </TabPanel>
              <TabPanel id="sizes">Before and after, per image.</TabPanel>
            </TabPanels>
          </Tabs>
        </Variant>
      ))}
    </VariantGrid>
  </div>
);
