import type { ReactNode } from "react";

/** A printed note that names a mark on hover or on keyboard focus. */
export const FolioTip = ({
  children,
  label,
}: {
  readonly children: ReactNode;
  readonly label: string;
}) => (
  <span className="folio-tip" data-tip={label}>
    {children}
  </span>
);
