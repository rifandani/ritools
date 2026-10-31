import { cn } from "cn";
import type { ReactNode } from "react";
import { HiOutlineSwatch } from "react-icons/hi2";

import { BrandWordmark } from "@/core/components/ui/brand-wordmark";
import type { WordmarkGround } from "@/core/components/ui/brand-wordmark";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuDescription,
  ContextMenuItem,
  ContextMenuLabel,
} from "@/core/components/ui/context-menu";
import { Link } from "@/core/components/ui/link";

export interface WordmarkProps {
  readonly className?: string;
  /** The logo alone, for a collapsed rail. */
  readonly compact?: boolean;
  /** The field the mark sits on; `auto` follows the color mode. */
  readonly ground?: WordmarkGround;
  /** A mark before the name, such as the logo icon. */
  readonly leading?: ReactNode;
  readonly onPress?: () => void;
}

/**
 * The Ritools wordmark link. It prints the logo (when given), then the name at
 * its seam. A right click opens the way into the Component Catalog, which the
 * shell never prints: the catalog is a development tool, so the entry exists
 * only when its route does.
 */
export const Wordmark = ({
  className,
  compact = false,
  ground = "paper",
  leading,
  onPress,
}: WordmarkProps) => {
  const mark = (
    <Link
      className={cn(
        "flex min-w-0 items-center gap-2.5 no-underline data-hovered:shadow-none",
        className
      )}
      href="/"
      onPress={onPress}
    >
      {leading}
      {compact ? (
        <span className="sr-only">Ritools</span>
      ) : (
        <BrandWordmark ground={ground} />
      )}
    </Link>
  );

  if (!import.meta.env.DEV) {
    return mark;
  }

  return (
    <ContextMenu>
      {mark}
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
