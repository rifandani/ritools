import { BrandWordmark } from "@/core/components/ui/brand-wordmark";

import { GuideLabel, GuideLead } from "./brand-art";

const ROW = "grid gap-2 py-5 sm:grid-cols-[10rem_minmax(0,1fr)] sm:gap-6";
const LABEL =
  "text-muted-fg text-xs font-bold tracking-[0.08em] uppercase [font-stretch:87.5%] sm:pt-0.5";
const MARK = "text-[clamp(2rem,4vw,3.25rem)]";
const PLATE =
  "flex aspect-4/3 items-center justify-center overflow-hidden border-2 px-6";

/**
 * The wordmark as the shell and the Navbar print it, on the fields it appears
 * on. It is the BrandWordmark component, not a drawing or a type style, so the
 * page shows the live mark rather than an image of one.
 */
export const BrandWordmarkShowcase = () => (
  <div className="flex flex-col gap-8">
    <GuideLead>
      The wordmark is the name Ritools, set at its seam as{" "}
      <span className="font-mono text-[0.9em]">ri/tools</span>: Archivo 900 at
      125% width, lowercase, with one slash in the brand red. It is type, not a
      drawing, so the shell sidebar and the Open Graph card print the same mark.
    </GuideLead>

    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <figure className="flex flex-col gap-2">
        <div className={`${PLATE} border-rule ground-red`}>
          <BrandWordmark className={MARK} ground="red" />
        </div>
        <figcaption className="text-muted-fg font-mono text-xs/5">
          On the red field: the navbar field
        </figcaption>
      </figure>
      <figure className="flex flex-col gap-2">
        <div className={`${PLATE} border-rule bg-paper`}>
          <BrandWordmark className={MARK} ground="paper" />
        </div>
        <figcaption className="text-muted-fg font-mono text-xs/5">
          On paper
        </figcaption>
      </figure>
      <figure className="flex flex-col gap-2">
        <div className={`${PLATE} border-paper/30 bg-ink`}>
          <BrandWordmark className={MARK} ground="ink" />
        </div>
        <figcaption className="text-muted-fg font-mono text-xs/5">
          On ink
        </figcaption>
      </figure>
      <figure className="flex flex-col gap-2">
        <div className={`${PLATE} border-rule bg-bg`}>
          <BrandWordmark className={MARK} ground="auto" />
        </div>
        <figcaption className="text-muted-fg font-mono text-xs/5">
          On the page ground: the shell sidebar
        </figcaption>
      </figure>
    </div>

    <div>
      <GuideLabel>Rules</GuideLabel>
      <dl className="border-rule divide-rule mt-3 divide-y border-y">
        <div className={ROW}>
          <dt className={LABEL}>Face</dt>
          <dd className="max-w-[62ch] text-base/7 text-pretty">
            Archivo 900 at 125% width, lowercase. The face is self-hosted, so
            the mark prints the same offline.
          </dd>
        </div>
        <div className={ROW}>
          <dt className={LABEL}>Seam</dt>
          <dd className="max-w-[62ch] text-base/7 text-pretty">
            The slash is the seam between <span className="font-mono">ri</span>{" "}
            and <span className="font-mono">tools</span>. It is the only red
            part of the mark.
          </dd>
        </div>
        <div className={ROW}>
          <dt className={LABEL}>Grounds</dt>
          <dd className="max-w-[62ch] text-base/7 text-pretty">
            On paper, the letters are ink and the slash is red. On red, the
            letters are paper and the slash is ink, because a red slash would
            vanish. On ink, the letters are paper and the slash is red. On the
            page ground, the letters take the text role and the slash stays red,
            so the sidebar follows the color mode.
          </dd>
        </div>
        <div className={ROW}>
          <dt className={LABEL}>Size</dt>
          <dd className="max-w-[62ch] text-base/7 text-pretty">
            The shell sidebar sets it at{" "}
            <span className="num text-sm">1.4rem</span>, beside the logo. The
            Navbar component sets it at{" "}
            <span className="num text-sm">clamp(1.4rem, 7vw, 2rem)</span>: the{" "}
            <span className="num text-sm">1.4</span>rem floor below{" "}
            <span className="num text-sm">320</span>px and the{" "}
            <span className="num text-sm">2</span>rem cap at about{" "}
            <span className="num text-sm">457</span>px. Nothing else sets the
            name in its own type.
          </dd>
        </div>
        <div className={ROW}>
          <dt className={LABEL}>Never</dt>
          <dd className="max-w-[62ch] text-base/7 text-pretty">
            Never set the name in another face, in capitals, or as{" "}
            <span className="font-mono">ri / tools</span> with spaces around the
            slash, and call it the wordmark.
          </dd>
        </div>
      </dl>
    </div>
  </div>
);
