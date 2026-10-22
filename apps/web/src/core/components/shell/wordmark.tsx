import { HiOutlineSwatch } from "react-icons/hi2";

import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuDescription,
  ContextMenuItem,
  ContextMenuLabel,
} from "@/core/components/ui/context-menu";
import { Link } from "@/core/components/ui/link";
import { Ransom } from "@/core/components/ui/ransom";

const wordmark = (
  <Link
    className="text-[clamp(1.25rem,6.5vw,1.75rem)] no-underline data-hovered:shadow-none"
    href="/"
  >
    <Ransom ground="red">Ritools</Ransom>
  </Link>
);

/**
 * The Ritools wordmark. A right click opens the way into the Component
 * Catalog, which the shell never prints: the catalog is a development tool,
 * so the entry exists only when its route does.
 */
export const Wordmark = () => {
  if (!import.meta.env.DEV) {
    return wordmark;
  }

  return (
    <ContextMenu>
      {wordmark}
      <ContextMenuContent aria-label="Ritools">
        <ContextMenuItem href="/master-design" textValue="Master Design">
          <HiOutlineSwatch />
          <ContextMenuLabel>Master Design</ContextMenuLabel>
          <ContextMenuDescription>
            Brand guidelines and kit components
          </ContextMenuDescription>
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
};
