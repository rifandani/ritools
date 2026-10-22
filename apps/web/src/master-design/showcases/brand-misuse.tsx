import { HiMiniCheck, HiMiniXMark } from "react-icons/hi2";

import { BrandPlate, GuideLead, LogoFile } from "./brand-art";

interface Specimen {
  id: string;
  caption: string;
  isCorrect: boolean;
  /** What the specimen does to the file. */
  className?: string;
}

/**
 * One correct use, then the changes that make it a different mark. Each
 * specimen is the supplied file with one thing done wrong, so the page shows
 * the mistake rather than describing it.
 */
const SPECIMENS: Specimen[] = [
  { id: "as-supplied", caption: "As supplied", isCorrect: true },
  {
    id: "stretch",
    caption: "Stretched out of its square",
    isCorrect: false,
    className: "scale-x-150",
  },
  {
    id: "rotate",
    caption: "Rotated off its axis",
    isCorrect: false,
    className: "rotate-12",
  },
  {
    id: "recolor",
    caption: "Recolored to a hue it does not own",
    isCorrect: false,
    className: "[filter:hue-rotate(150deg)]",
  },
  {
    id: "effects",
    caption: "Given a shadow the flat print never has",
    isCorrect: false,
    className: "[filter:drop-shadow(0_6px_8px_rgb(0_0_0/0.5))]",
  },
  {
    id: "crop",
    caption: "Cropped, so the disc loses its edge",
    isCorrect: false,
    className: "size-full object-cover scale-125",
  },
];

export const BrandMisuseShowcase = () => (
  <div className="flex flex-col gap-8">
    <GuideLead>
      The logo is used as the file is. Do not stretch it, turn it, recolor it,
      crop it, or add depth to it. Do not fill the transparent space around the
      disc: the transparency is part of the mark, not a missing ground.
    </GuideLead>

    {/* `role="list"`: Safari drops list semantics from a list without markers. */}
    {/* oxlint-disable-next-line jsx-a11y/no-redundant-roles */}
    <ul className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3" role="list">
      {SPECIMENS.map(({ id, caption, isCorrect, className }) => {
        const Mark = isCorrect ? HiMiniCheck : HiMiniXMark;
        return (
          <li key={id}>
            <figure className="flex flex-col gap-3">
              <BrandPlate className="aspect-4/3" ground="paper">
                <LogoFile className={`size-14 sm:size-20 ${className ?? ""}`} />
              </BrandPlate>
              <figcaption className="flex items-start gap-2 text-base/6 text-pretty sm:text-sm/6">
                <Mark
                  aria-hidden
                  className={`mt-1 size-4 shrink-0 sm:mt-0.5 ${
                    isCorrect
                      ? "text-success-subtle-fg"
                      : "text-danger-subtle-fg"
                  }`}
                />
                <span>
                  <span className="sr-only">
                    {isCorrect ? "Correct use: " : "Incorrect use: "}
                  </span>
                  {caption}
                </span>
              </figcaption>
            </figure>
          </li>
        );
      })}
    </ul>
  </div>
);
