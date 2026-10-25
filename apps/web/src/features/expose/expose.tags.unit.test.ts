import { expect, it } from "vitest";

import { METADATA_GROUPS } from "@/features/expose/expose";
import {
  TAG_MAP,
  containerFor,
  groupOf,
} from "@/features/expose/expose.groups";

for (const family of ["image", "audio", "video", "office"] as const) {
  it(`classifies every fixed ${family} deletion tag into its single group`, () => {
    for (const group of METADATA_GROUPS) {
      for (const tag of TAG_MAP[family][group]) {
        const colon = tag.indexOf(":");
        const prefix = colon === -1 ? "EXIF" : tag.slice(0, colon);
        const label = colon === -1 ? tag : tag.slice(colon + 1);
        const container =
          prefix === "ooxml-core" ||
          prefix === "ooxml-app" ||
          prefix === "ooxml-custom"
            ? prefix
            : containerFor(prefix, family);
        expect(
          groupOf(
            family,
            tag === "docProps/thumbnail.jpeg" ? "ooxml-app" : container,
            tag === "docProps/thumbnail.jpeg" ? "Thumbnail" : label
          ),
          tag
        ).toBe(group);
      }
    }
  });
}
