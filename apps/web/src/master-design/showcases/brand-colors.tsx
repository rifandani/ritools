import { HiCheck, HiSquare2Stack } from "react-icons/hi2";

import { useClipboard } from "@/core/hooks/use-clipboard";

import { GuideLead } from "./brand-art";

interface BrandColor {
  name: string;
  role: string;
  /** Fixed fill: the brand colors do not follow the color mode. */
  swatch: string;
  values: { label: string; value: string }[];
}

const BRAND_COLORS: BrandColor[] = [
  {
    name: "Poster Red",
    role: "The fill red: the navbar field, the pressed primary button, and the red chip.",
    swatch: "bg-red",
    values: [
      { label: "HEX", value: "#D7001A" },
      { label: "RGB", value: "215 0 26" },
    ],
  },
  {
    name: "Ink",
    role: "Body text, the rail field, and the rules in light mode.",
    swatch: "bg-ink",
    values: [
      { label: "HEX", value: "#0B0B0B" },
      { label: "RGB", value: "11 11 11" },
    ],
  },
  {
    name: "Paper",
    role: "The page ground in light mode, and the text on ink.",
    swatch: "bg-paper",
    values: [
      { label: "HEX", value: "#F6F4EF" },
      { label: "RGB", value: "246 244 239" },
    ],
  },
  {
    name: "White Stock",
    role: "Cards, popovers, menus, and the white chip.",
    swatch: "bg-white",
    values: [
      { label: "HEX", value: "#FFFFFF" },
      { label: "RGB", value: "255 255 255" },
    ],
  },
];

const VALUE_LABEL =
  "text-muted-fg text-xs font-bold tracking-[0.08em] uppercase [font-stretch:87.5%]";

const FADE =
  "col-start-1 row-start-1 size-4 transition-[opacity,scale] duration-180 ease-out motion-reduce:transition-none";

/** One value row: a button that copies the value, with a check in its place. */
const CopyValue = ({ label, value }: { label: string; value: string }) => {
  const { copied, copy } = useClipboard();

  return (
    <div className="grid grid-cols-[3.5rem_minmax(0,1fr)] items-center">
      <dt className={VALUE_LABEL}>{label}</dt>
      <dd>
        <button
          aria-label={`Copy ${label} ${value}`}
          className="group/value hover:bg-fg hover:text-bg focus-visible:outline-ring -mx-2 flex min-h-9 w-full items-center justify-between gap-3 px-2 text-start outline-0 transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-1 motion-reduce:transition-none"
          onClick={() => {
            void copy(value);
          }}
          type="button"
        >
          <span className="num truncate text-sm">{value}</span>
          <span aria-hidden className="grid shrink-0">
            <HiSquare2Stack
              className={`${FADE} ${
                copied
                  ? "scale-75 opacity-0"
                  : "opacity-60 group-hover/value:opacity-100 group-focus-visible/value:opacity-100 pointer-coarse:opacity-100"
              }`}
            />
            <HiCheck
              className={`${FADE} ${
                copied ? "scale-100 opacity-100" : "scale-75 opacity-0"
              }`}
            />
          </span>
        </button>
        <output aria-live="polite" className="sr-only">
          {copied ? `${value} copied` : ""}
        </output>
      </dd>
    </div>
  );
};

/**
 * The four brand colors, each as a swatch over the values a file needs. They
 * are brand fills, not role tokens, so the swatches hold their color in both
 * modes, as the logo and the navbar do.
 */
export const BrandColorsShowcase = () => (
  <div className="flex flex-col gap-8">
    <GuideLead>
      Four colors carry the brand: Poster Red fills, Ink writes and rules, Paper
      grounds the page, and White Stock lifts a card. The color mode changes the
      role tokens, never these four fills.
    </GuideLead>

    <div className="grid gap-x-6 gap-y-10 sm:grid-cols-2 xl:grid-cols-4">
      {BRAND_COLORS.map((color) => (
        <section className="flex flex-col gap-4" key={color.name}>
          <div
            aria-hidden
            className={`border-rule aspect-3/1 border-2 ${color.swatch}`}
          />
          <div>
            <h4 className="font-display text-base/6 font-extrabold uppercase [font-stretch:75%]">
              {color.name}
            </h4>
            <p className="text-muted-fg mt-1 text-base/6 text-pretty sm:text-sm/6">
              {color.role}
            </p>
          </div>
          <dl className="border-rule divide-rule divide-y border-y">
            {color.values.map((item) => (
              <CopyValue key={item.label} {...item} />
            ))}
          </dl>
        </section>
      ))}
    </div>

    <p className="text-muted-fg max-w-[62ch] text-sm/6 text-pretty">
      Text Red (<span className="num">#B80016</span>) is a UI token for red
      words on paper, not a brand fill. So is every semantic hue: danger is
      burnt vermilion, never Poster Red.
    </p>
  </div>
);
