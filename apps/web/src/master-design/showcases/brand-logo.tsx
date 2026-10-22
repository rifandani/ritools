import {
  HiOutlineArrowDownTray,
  HiOutlineCheck,
  HiOutlineSquare2Stack,
} from "react-icons/hi2";

import { Button, buttonStyles } from "@/core/components/ui/button";
import { useClipboard } from "@/core/hooks/use-clipboard";

import {
  BrandPlate,
  GuideLead,
  LOGO_SIZE,
  LOGO_SRC,
  LogoFile,
} from "./brand-art";

const DOWNLOAD_NAME = "ritools-logo.png";

/** Copies the file path, so a developer can point an `<img>` at the one file. */
const CopyPath = () => {
  const { copied, copy } = useClipboard();

  return (
    <>
      <Button
        intent="outline"
        onPress={() => {
          void copy(LOGO_SRC);
        }}
        size="sm"
      >
        {copied ? (
          <HiOutlineCheck aria-hidden data-slot="icon" />
        ) : (
          <HiOutlineSquare2Stack aria-hidden data-slot="icon" />
        )}
        {copied ? "Path copied" : "Copy path"}
      </Button>
      <output aria-live="polite" className="sr-only">
        {copied ? `${LOGO_SRC} copied` : ""}
      </output>
    </>
  );
};

/**
 * The logo on the two grounds a copy goes onto, then the ways to take it. The
 * file is supplied and never redrawn, so the page links to it rather than
 * minting a second copy.
 */
export const BrandLogoShowcase = () => (
  <div className="flex flex-col gap-8">
    <GuideLead>
      The logo is a red disc with a crossed wrench and screwdriver in paper. It
      is a supplied file, not a drawing:{" "}
      <span className="num">{LOGO_SIZE}</span> ×{" "}
      <span className="num">{LOGO_SIZE}</span> px, with the space outside the
      disc cut to transparency, so the mark sits on any ground and never brings
      a white plate with it.
    </GuideLead>

    <div className="grid gap-4 sm:grid-cols-2">
      <figure className="flex flex-col gap-2">
        <BrandPlate className="aspect-4/3" ground="paper">
          <LogoFile className="size-32 sm:size-48" />
        </BrandPlate>
        <figcaption className="text-muted-fg font-mono text-xs/5">
          On paper
        </figcaption>
      </figure>
      <figure className="flex flex-col gap-2">
        <BrandPlate className="aspect-4/3" ground="ink">
          <LogoFile className="size-32 sm:size-48" />
        </BrandPlate>
        <figcaption className="text-muted-fg font-mono text-xs/5">
          On ink, where the disc sits on the field
        </figcaption>
      </figure>
    </div>

    <div className="flex flex-wrap items-center gap-x-2 gap-y-3">
      <CopyPath />
      <a
        className={buttonStyles({ intent: "outline", size: "sm" })}
        download={DOWNLOAD_NAME}
        href={LOGO_SRC}
      >
        <HiOutlineArrowDownTray aria-hidden data-slot="icon" />
        Download PNG
      </a>
      <span className="text-muted-fg num ms-1 text-xs">
        PNG · {LOGO_SIZE} × {LOGO_SIZE} px
      </span>
    </div>
  </div>
);
