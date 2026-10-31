import { HiMiniXMark } from "react-icons/hi2";

import { GuideLead } from "./brand-art";

/** Spellings that are wrong: a split word, a capital inside it, a cut name. */
const WRONG_SPELLINGS = ["RiTools", "Ri Tools", "Ritool"] as const;

const ROW = "grid gap-2 py-5 sm:grid-cols-[10rem_minmax(0,1fr)] sm:gap-6";
const LABEL =
  "text-muted-fg text-xs font-bold tracking-[0.08em] uppercase [font-stretch:87.5%] sm:pt-1";

/** How the name is written: one word, no short form, and the cuts to avoid. */
export const BrandNameShowcase = () => (
  <div className="flex flex-col gap-6">
    <GuideLead>
      The name is Ritools: one word, with a capital R and lowercase letters
      after it. The wordmark sets it at the seam as{" "}
      <span className="font-mono text-[0.9em]">ri/tools</span>; everywhere else,
      write it as plain text.
    </GuideLead>
    <dl className="border-rule divide-rule divide-y border-y">
      <div className={ROW}>
        <dt className={LABEL}>Name</dt>
        <dd>
          <p className="font-display text-2xl/8 font-black tracking-tight">
            Ritools
          </p>
          <p className="text-muted-fg mt-1 text-base/6 text-pretty sm:text-sm/6">
            One word, in the case written here. In running text it is plain
            Archivo, not the wordmark.
          </p>
        </dd>
      </div>
      <div className={ROW}>
        <dt className={LABEL}>Short form</dt>
        <dd>
          <p className="text-base/7 text-pretty">
            There is none. The name is never cut to “Rit”, “RT”, or an initial.
          </p>
        </dd>
      </div>
      <div className={ROW}>
        <dt className={LABEL}>Avoid</dt>
        <dd>
          {/* `role="list"`: Safari drops list semantics from a list without markers. */}
          {/* oxlint-disable-next-line jsx-a11y/no-redundant-roles */}
          <ul className="flex flex-wrap gap-x-8 gap-y-2" role="list">
            {WRONG_SPELLINGS.map((spelling) => (
              <li className="flex items-center gap-2" key={spelling}>
                <HiMiniXMark
                  aria-hidden
                  className="text-danger-subtle-fg size-4 shrink-0"
                />
                <s className="text-muted-fg decoration-danger-subtle-fg/70 font-display text-xl/8 font-black tracking-tight">
                  {spelling}
                </s>
              </li>
            ))}
          </ul>
        </dd>
      </div>
    </dl>
  </div>
);
