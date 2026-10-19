import { MasterDesignCatalog } from "./catalog";

/** Catalog-only: drop Chart's `flex justify-center` so demos stretch full width. */
export const MasterDesignPage = () => (
  <div className="contents **:data-chart:block **:data-chart:justify-normal">
    <MasterDesignCatalog />
  </div>
);
