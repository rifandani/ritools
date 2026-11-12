"use client";

import { EaselNotes } from "@/features/easel/components/easel-notes";
import { MAX_TABS } from "@/features/easel/easel";

const ignore = () => {
  // The gallery prints states. Its controls do nothing.
};

/**
 * The printed states of Easel, for a design check in development
 * (`/easel?states=1`): each message a user can get before the editor opens.
 */
export const EaselStateGallery = () => (
  <div className="flex flex-col gap-y-8" data-easel-states="">
    <EaselNotes
      onOversized={ignore}
      oversized={[]}
      rejected={["broken.jpg"]}
      sampleFailed={false}
      tabLimit={MAX_TABS}
      tabLimitHit={false}
      unsupported={false}
    />
    <EaselNotes
      onOversized={ignore}
      oversized={[
        {
          fitted: { height: 5461, width: 8192 },
          id: "large",
          name: "panorama.jpg",
          size: { height: 12_000, width: 18_000 },
        },
      ]}
      rejected={[]}
      sampleFailed={false}
      tabLimit={MAX_TABS}
      tabLimitHit
      unsupported={false}
    />
    <EaselNotes
      onOversized={ignore}
      oversized={[]}
      rejected={[]}
      sampleFailed
      tabLimit={MAX_TABS}
      tabLimitHit={false}
      unsupported
    />
  </div>
);
