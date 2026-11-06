import { useState } from "react";
import type { ReactNode } from "react";

/** Load a pane on first use, then retain its editor or reader across mode changes. */
export const QuillPane = ({
  visible,
  children,
}: {
  readonly visible: boolean;
  readonly children: ReactNode;
}) => {
  const [visited, setVisited] = useState(visible);
  if (visible && !visited) {
    setVisited(true);
  }
  return (
    <div className="quill-pane" hidden={!visible}>
      {visited ? children : null}
    </div>
  );
};
