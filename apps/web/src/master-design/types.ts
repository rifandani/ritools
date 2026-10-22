import type { ComponentType } from "react";

/** One component's place in the Component Catalog. */
export interface ComponentEntry {
  /** Slug used for the section anchor id and the URL hash. */
  id: string;
  name: string;
  Showcase: ComponentType;
}

/** A named grouping of Component Entries that drives nav grouping and page order. */
export interface Category {
  id: string;
  name: string;
  /**
   * Set when the Category holds guidelines rather than kit components: a lead
   * under its heading and no place in the entry count.
   */
  guide?: {
    /** The line under the heading that says what the group is for. */
    description: string;
  };
  entries: ComponentEntry[];
}
