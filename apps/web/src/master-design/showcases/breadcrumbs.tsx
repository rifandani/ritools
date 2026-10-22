import { Breadcrumbs, BreadcrumbsItem } from "@/core/components/ui/breadcrumbs";

import { Variant, VariantGrid } from "../variant";

export const BreadcrumbsShowcase = () => (
  <VariantGrid>
    <Variant label="default">
      <Breadcrumbs>
        <BreadcrumbsItem href="#">Tools</BreadcrumbsItem>
        <BreadcrumbsItem href="#">Squeeze</BreadcrumbsItem>
        <BreadcrumbsItem>The Batch</BreadcrumbsItem>
      </Breadcrumbs>
    </Variant>

    <Variant label='separator="slash"'>
      <Breadcrumbs separator="slash">
        <BreadcrumbsItem href="#">Tools</BreadcrumbsItem>
        <BreadcrumbsItem href="#">Squeeze</BreadcrumbsItem>
        <BreadcrumbsItem>The Batch</BreadcrumbsItem>
      </Breadcrumbs>
    </Variant>

    <Variant label="no separator">
      <Breadcrumbs>
        <BreadcrumbsItem separator={false} href="#">
          Tools
        </BreadcrumbsItem>
        <BreadcrumbsItem separator={false} href="#">
          Squeeze
        </BreadcrumbsItem>
        <BreadcrumbsItem>The Batch</BreadcrumbsItem>
      </Breadcrumbs>
    </Variant>

    <Variant label="one crumb">
      <Breadcrumbs>
        <BreadcrumbsItem>The Batch</BreadcrumbsItem>
      </Breadcrumbs>
    </Variant>
  </VariantGrid>
);
