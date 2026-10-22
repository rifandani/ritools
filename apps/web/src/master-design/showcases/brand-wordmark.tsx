import { Ransom } from "@/core/components/ui/ransom";

import { GuideLabel, GuideLead } from "./brand-art";

const ROW = "grid gap-2 py-5 sm:grid-cols-[10rem_minmax(0,1fr)] sm:gap-6";
const LABEL =
  "text-muted-fg text-xs font-bold tracking-[0.08em] uppercase [font-stretch:87.5%] sm:pt-0.5";

/**
 * The wordmark as the navbar prints it, on the two fields it appears on. It is
 * the Ransom component, not a drawing or a type style, so the page shows the
 * live note rather than an image of one.
 */
export const BrandWordmarkShowcase = () => (
  <div className="flex flex-col gap-8">
    <GuideLead>
      The wordmark is the name Ritools, cut by the ransom rules and set in the
      four display faces: Anton, Abril Fatface, Alfa Slab One, and Archivo 900
      at 125% width. It is the same note the navbar prints, not a drawing of it.
      The letterforms come from the self-hosted faces, and from nowhere else.
    </GuideLead>

    <div className="grid gap-4 sm:grid-cols-2">
      <figure className="flex flex-col gap-2">
        <div className="ground-red border-rule flex aspect-4/3 items-center justify-center overflow-hidden border-2 px-6">
          <Ransom className="text-[clamp(2rem,4vw,3.25rem)]" ground="red">
            Ritools
          </Ransom>
        </div>
        <figcaption className="text-muted-fg font-mono text-xs/5">
          On the red field: the navbar field
        </figcaption>
      </figure>
      <figure className="flex flex-col gap-2">
        <div className="bg-paper border-rule flex aspect-4/3 items-center justify-center overflow-hidden border-2 px-6">
          <Ransom className="text-[clamp(2rem,4vw,3.25rem)]">Ritools</Ransom>
        </div>
        <figcaption className="text-muted-fg font-mono text-xs/5">
          On paper: the same cut
        </figcaption>
      </figure>
    </div>

    <div>
      <GuideLabel>Rules</GuideLabel>
      <dl className="border-rule divide-rule mt-3 divide-y border-y">
        <div className={ROW}>
          <dt className={LABEL}>Faces</dt>
          <dd className="max-w-[62ch] text-base/7 text-pretty">
            Anton, Abril Fatface, Alfa Slab One, and Archivo 900 at 125% width.
            The faces are self-hosted, so the note prints the same offline.
          </dd>
        </div>
        <div className={ROW}>
          <dt className={LABEL}>Size</dt>
          <dd className="max-w-[62ch] text-base/7 text-pretty">
            The navbar prints it at{" "}
            <span className="num text-sm">clamp(1.25rem, 6.5vw, 1.75rem)</span>:
            it holds the <span className="num text-sm">1.25</span>rem floor
            below about <span className="num text-sm">308</span>px and reaches
            the <span className="num text-sm">1.75</span>rem cap at about{" "}
            <span className="num text-sm">431</span>px. Nothing else sets the
            name in its own type.
          </dd>
        </div>
        <div className={ROW}>
          <dt className={LABEL}>Grounds</dt>
          <dd className="max-w-[62ch] text-base/7 text-pretty">
            Paper, red, and ink. A chip never matches its ground: on red, the
            red chip becomes ink; on ink, the ink chip lifts a step.
          </dd>
        </div>
        <div className={ROW}>
          <dt className={LABEL}>Never</dt>
          <dd className="max-w-[62ch] text-base/7 text-pretty">
            Never type the name in another face and call it the wordmark. The
            name is the note, and the note is the Ransom component.
          </dd>
        </div>
      </dl>
    </div>
  </div>
);
